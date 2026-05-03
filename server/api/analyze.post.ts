import { mockAnalysisResult } from '../../mocks/analysis.mock'
import { normalizeResumeInput } from '../services/inputAdapter'
import { normalizeJobInput } from '../services/jobInputAdapter'
import { AiWorkflowStepError, runFullAnalysis } from '../services/aiWorkflow'
import {
  createFallbackMetrics,
  logChainMetrics,
  type ChainErrorStage,
  type ChainName,
} from '../utils/chainMetrics'
import { AiJsonParseError, getErrorMessage } from '../utils/json'
import { SchemaValidationError } from '../utils/schemaValidation'
import type { AnalysisResult } from '../../types/analysis'
import type { CommonInput } from '../services/inputCommonAdapter'

type UploadedInputType = 'txt' | 'pdf' | 'docx' | 'image'

interface UploadedInputFile {
  name?: string
  type?: UploadedInputType
  mimeType?: string
  bytes?: number[]
}

interface AnalyzeRequestBody {
  resumeText?: string
  resumeFile?: UploadedInputFile
  jobText?: string
  jobFile?: UploadedInputFile
  roleType?: string
}

const minTextLength = 50
const maxTextLength = 2000
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const pdfMimeTypes = ['application/pdf']
const docxMimeTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const txtMimeTypes = ['text/plain']

const getFallbackErrorStage = (error: unknown): ChainErrorStage | undefined => {
  if (!(error instanceof AiWorkflowStepError)) {
    return undefined
  }

  if (error.sourceError instanceof AiJsonParseError) {
    return 'parse'
  }

  if (error.sourceError instanceof SchemaValidationError) {
    return 'validate'
  }

  return 'llm'
}

const hasUploadedFile = (file?: UploadedInputFile) =>
  Array.isArray(file?.bytes) && file.bytes.length > 0

const resolveUploadedInputType = (file?: UploadedInputFile): UploadedInputType | undefined => {
  const mimeType = file?.mimeType?.trim().toLowerCase() ?? ''
  const fileName = file?.name?.trim().toLowerCase() ?? ''

  if (imageMimeTypes.includes(mimeType)) {
    return 'image'
  }

  if (pdfMimeTypes.includes(mimeType) || fileName.endsWith('.pdf')) {
    return 'pdf'
  }

  if (docxMimeTypes.includes(mimeType) || fileName.endsWith('.docx')) {
    return 'docx'
  }

  if (txtMimeTypes.includes(mimeType) || fileName.endsWith('.txt') || file?.type === 'txt') {
    return 'txt'
  }

  return file?.type
}

const createFileBuffer = (fileBytes: number[]) => ({
  byteLength: fileBytes.length,
  toString: () => new TextDecoder().decode(Uint8Array.from(fileBytes)),
  toUint8Array: () => Uint8Array.from(fileBytes),
  toArrayBuffer: () => Uint8Array.from(fileBytes).buffer,
})

const createCommonInputFromFile = (
  file: UploadedInputFile,
  inputType: UploadedInputType,
): CommonInput => {
  const fileBytes = file.bytes ?? []
  const fileBuffer = createFileBuffer(fileBytes)

  if (inputType === 'image') {
    return {
      type: 'image',
      fileBuffer,
      mimeType: file.mimeType?.trim() ?? '',
    }
  }

  return {
    type: inputType,
    fileBuffer,
  }
}

const validateUploadedFile = (
  fileLabel: string,
  file: UploadedInputFile | undefined,
  inputType: UploadedInputType | undefined,
  errors: string[],
) => {
  if (!hasUploadedFile(file)) {
    return
  }

  if (!inputType) {
    errors.push(`${fileLabel} type must be txt, pdf, docx or image`)
    return
  }

  if (inputType === 'image' && !imageMimeTypes.includes(file?.mimeType?.trim() ?? '')) {
    errors.push(`${fileLabel} mimeType must be image/jpeg, image/png or image/webp`)
  }
}

export default defineEventHandler(async (event): Promise<AnalysisResult> => {
  const body = await readBody<AnalyzeRequestBody>(event)
  const errors: string[] = []

  const resumeText = body.resumeText?.trim() ?? ''
  const hasResumeFile = hasUploadedFile(body.resumeFile)
  const resumeFileType = resolveUploadedInputType(body.resumeFile)
  const jobText = body.jobText?.trim() ?? ''
  const hasJobFile = hasUploadedFile(body.jobFile)
  const jobFileType = resolveUploadedInputType(body.jobFile)
  const roleType = body.roleType?.trim() ?? ''

  if (!resumeText && !hasResumeFile) {
    errors.push('resumeText is required')
  } else if (resumeText && resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText && resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
  }

  validateUploadedFile('resumeFile', body.resumeFile, resumeFileType, errors)

  if (jobText && jobText.length < minTextLength) {
    errors.push(`jobText must be at least ${minTextLength} characters`)
  } else if (jobText && jobText.length > maxTextLength) {
    errors.push(`jobText must be at most ${maxTextLength} characters`)
  }

  validateUploadedFile('jobFile', body.jobFile, jobFileType, errors)

  if (!roleType) {
    errors.push('roleType is required')
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid analyze request',
      data: { errors },
    })
  }

  const normalizedResume = await (async () => {
    try {
      if (hasResumeFile) {
        return await normalizeResumeInput(
          createCommonInputFromFile(body.resumeFile ?? {}, resumeFileType ?? 'txt'),
        )
      }

      return await normalizeResumeInput({
        type: 'text',
        text: resumeText,
      })
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid resume input',
        data: { errors: [getErrorMessage(error, 'Invalid resume input')] },
      })
    }
  })()

  const normalizedJob = await (async () => {
    if (!jobText && !hasJobFile) {
      return undefined
    }

    try {
      if (hasJobFile) {
        return await normalizeJobInput(
          createCommonInputFromFile(body.jobFile ?? {}, jobFileType ?? 'txt'),
        )
      }

      return await normalizeJobInput({
        type: 'text',
        text: jobText,
      })
    } catch (error: unknown) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid job input',
        data: { errors: [getErrorMessage(error, 'Invalid job input')] },
      })
    }
  })()

  try {
    return await runFullAnalysis(normalizedResume.resumeText, normalizedJob?.jobText, roleType)
  } catch (error: unknown) {
    const failedStep = error instanceof AiWorkflowStepError ? error.step : 'unknown'
    console.warn(
      `[ai_workflow] fallback used after ${failedStep} failure: ${getErrorMessage(error, 'Analyze failed')}`,
    )
    logChainMetrics(
      createFallbackMetrics(
        failedStep === 'unknown' ? 'analysis_match' : (failedStep as ChainName),
        getFallbackErrorStage(error),
      ),
    )

    return {
      ...mockAnalysisResult,
      generatedAt: new Date().toISOString(),
    }
  }
})
