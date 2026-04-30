import { mockAnalysisResult } from '../../mocks/analysis.mock'
import { AiWorkflowStepError, analyzeMatch } from '../services/aiWorkflow'
import {
  AiJsonParseError,
  createAiJsonErrorData,
  getErrorMessage,
  parseJsonInput,
} from '../utils/json'
import type { AnalysisResult, JobProfile, ResumeProfile } from '../../types/analysis'

interface AnalyzeMatchRequestBody {
  resumeJson?: unknown
  jobJson?: unknown
  roleType?: string
}

export default defineEventHandler(async (event): Promise<AnalysisResult> => {
  const body = await readBody<AnalyzeMatchRequestBody>(event)
  const errors: string[] = []

  const roleType = body.roleType?.trim() ?? ''

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
    const resume = parseJsonInput<ResumeProfile>(body.resumeJson)
    const job = parseJsonInput<JobProfile>(body.jobJson)

    return await analyzeMatch(resume, job, roleType)
  } catch (error: unknown) {
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      console.warn('[ai_workflow] fallback used after analysis_match JSON failure', {
        step: error.step,
        ...createAiJsonErrorData(error.sourceError),
      })

      return {
        ...mockAnalysisResult,
        generatedAt: new Date().toISOString(),
      }
    }

    console.warn(
      `[ai_workflow] fallback used after analyze_match failure: ${getErrorMessage(error, 'Analyze match failed')}`,
    )

    return {
      ...mockAnalysisResult,
      generatedAt: new Date().toISOString(),
    }
  }
})
