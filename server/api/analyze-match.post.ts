import { mockAnalysisResult } from '../../mocks/analysis.mock'
import { AiWorkflowStepError, analyzeMatch } from '../services/aiWorkflow'
import {
  createFallbackMetrics,
  logChainMetrics,
  type ChainErrorStage,
} from '../utils/chainMetrics'
import {
  AiJsonParseError,
  createAiJsonErrorData,
  getErrorMessage,
  parseJsonInput,
} from '../utils/json'
import { SchemaValidationError } from '../utils/schemaValidation'
import type { AnalysisResult, JobProfile, ResumeProfile } from '../../types/analysis'

// 单独的匹配分析接口：接收已经结构化的 resumeJson/jobJson，直接调用 analysis_match。
interface AnalyzeMatchRequestBody {
  resumeJson?: unknown
  jobJson?: unknown
  roleType?: string
}

// 将分析失败映射到 metrics 错误阶段，便于观察是 LLM、解析还是 schema 问题。
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

// 分段工作流的第三步：根据简历画像和岗位画像生成匹配报告。
export default defineEventHandler(async (event): Promise<AnalysisResult> => {
  const body = await readBody<AnalyzeMatchRequestBody>(event)
  const errors: string[] = []

  const roleType = body.roleType?.trim() ?? ''

  // resumeJson/jobJson 可以是对象，也可以是 JSON 字符串，由 parseJsonInput 统一处理。
  if (body.resumeJson === undefined || body.resumeJson === null) {
    errors.push('resumeJson is required')
  }

  if (body.jobJson === undefined || body.jobJson === null) {
    errors.push('jobJson is required')
  }

  if (!roleType) {
    errors.push('roleType is required')
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid analyze match request',
      data: { errors },
    })
  }

  try {
    // 将未知输入转换为强类型画像，再调用匹配分析 chain。
    const resume = parseJsonInput<ResumeProfile>(body.resumeJson)
    const job = parseJsonInput<JobProfile>(body.jobJson)

    return await analyzeMatch(resume, job, roleType)
  } catch (error: unknown) {
    // 匹配分析失败时保持与主分析接口一致：记录 metrics 并返回 mock 报告兜底。
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      console.warn('[ai_workflow] fallback used after analysis_match JSON failure', {
        step: error.step,
        ...createAiJsonErrorData(error.sourceError),
      })
      logChainMetrics(createFallbackMetrics('analysis_match', 'parse'))

      return {
        ...mockAnalysisResult,
        generatedAt: new Date().toISOString(),
      }
    }

    console.warn(
      `[ai_workflow] fallback used after analyze_match failure: ${getErrorMessage(error, 'Analyze match failed')}`,
    )
    logChainMetrics(createFallbackMetrics('analysis_match', getFallbackErrorStage(error)))

    return {
      ...mockAnalysisResult,
      generatedAt: new Date().toISOString(),
    }
  }
})
