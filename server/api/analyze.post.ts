import { mockAnalysisResult } from '../../mocks/analysis.mock'
import { normalizeResumeInput } from '../services/inputAdapter'
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

interface AnalyzeRequestBody {
  resumeText?: string
  resumeFile?: {
    name?: string
    type?: 'txt' | 'pdf' | 'docx' | 'image'
    mimeType?: string
    bytes?: number[]
  }
  jobText?: string
  roleType?: string
}

const minTextLength = 50
const maxTextLength = 2000
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']

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

export default defineEventHandler(async (event): Promise<AnalysisResult> => {
  const body = await readBody<AnalyzeRequestBody>(event)
  const errors: string[] = []

  const resumeText = body.resumeText?.trim() ?? ''
  const resumeFileBytes = body.resumeFile?.bytes
  const hasResumeFile = Array.isArray(resumeFileBytes) && resumeFileBytes.length > 0
  const resumeFileType = body.resumeFile?.type
  const resumeFileMimeType = body.resumeFile?.mimeType?.trim() ?? ''
  const jobText = body.jobText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

  if (!resumeText && !hasResumeFile) {
    errors.push('resumeText is required')
  } else if (resumeText && resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText && resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
  }

  if (
    hasResumeFile
    && resumeFileType !== 'txt'
    && resumeFileType !== 'pdf'
    && resumeFileType !== 'docx'
    && resumeFileType !== 'image'
  ) {
    errors.push('resumeFile type must be txt, pdf, docx or image')
  }

  if (hasResumeFile && resumeFileType === 'image' && !imageMimeTypes.includes(resumeFileMimeType)) {
    errors.push('resumeFile mimeType must be image/jpeg, image/png or image/webp')
  }

  if (!jobText) {
    errors.push('jobText is required')
  } else if (jobText.length < minTextLength) {
    errors.push(`jobText must be at least ${minTextLength} characters`)
  } else if (jobText.length > maxTextLength) {
    errors.push(`jobText must be at most ${maxTextLength} characters`)
  }

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
        const fileBytes = resumeFileBytes ?? []

        return await normalizeResumeInput({
          type:
            resumeFileType === 'pdf'
              ? 'pdf'
              : resumeFileType === 'docx'
                ? 'docx'
                : resumeFileType === 'image'
                  ? 'image'
                  : 'txt',
          fileBuffer: {
            byteLength: fileBytes.length,
            toString: () => new TextDecoder().decode(Uint8Array.from(fileBytes)),
            toUint8Array: () => Uint8Array.from(fileBytes),
            toArrayBuffer: () => Uint8Array.from(fileBytes).buffer,
          },
          mimeType: resumeFileMimeType,
        })
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

  try {
    return await runFullAnalysis(normalizedResume.resumeText, jobText, roleType)
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
