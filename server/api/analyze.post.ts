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

// 限制 prompt 输入规模，避免浪费 token。
const minTextLength = 50
const maxTextLength = 2000

// 辅助判断文件类型。
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const pdfMimeTypes = ['application/pdf']
const docxMimeTypes = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]
const txtMimeTypes = ['text/plain']

// 将工作流异常映射成 metrics 中使用的错误阶段。
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

// 判断请求中是否真的包含上传文件字节。
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

// 将 JSON 中的 number[] 封装成输入适配器需要的类 Buffer 对象。
const createFileBuffer = (fileBytes: number[]) => ({
  byteLength: fileBytes.length,
  toString: () => new TextDecoder().decode(Uint8Array.from(fileBytes)),
  toUint8Array: () => Uint8Array.from(fileBytes),
  toArrayBuffer: () => Uint8Array.from(fileBytes).buffer,
})

// 把上传文件转换成通用输入类型。
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

// 校验上传文件类型和图片MIME。
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

// 主分析入口：解析输入 -> 规范化简历/JD -> 跑完整 AI 分析工作流。
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

  // 简历必须提供；可以是文本，也可以是上传文件。
  if (!resumeText && !hasResumeFile) {
    errors.push('resumeText is required')
  } else if (resumeText && resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText && resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
  }

  validateUploadedFile('resumeFile', body.resumeFile, resumeFileType, errors)

  // JD 可选，但一旦提供文本就需要满足长度限制。
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

  // 简历输入规范化
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

  // JD 输入规范化
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
    // 完整工作流会依次执行 resume extract、job extract、评分和建议生成。
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

    // AI 链路失败时返回 mock 报告，避免前端完全无结果。
    return {
      ...mockAnalysisResult,
      generatedAt: new Date().toISOString(),
    }
  }
})
