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
      throw createError({
        statusCode: 500,
        statusMessage: 'Analysis match returned invalid JSON',
        data: {
          step: error.step,
          ...createAiJsonErrorData(error.sourceError),
        },
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: getErrorMessage(error, 'Analyze match failed'),
      data: error instanceof AiWorkflowStepError ? { step: error.step } : undefined,
    })
  }
})
