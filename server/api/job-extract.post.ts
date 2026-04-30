import { AiWorkflowStepError, extractJobProfile } from '../services/aiWorkflow'
import { AiJsonParseError, createAiJsonErrorData, getErrorMessage } from '../utils/json'
import type { JobProfile } from '../../types/analysis'

interface JobExtractRequestBody {
  jobText?: string
  roleType?: string
}

const minTextLength = 50
const maxTextLength = 2000

export default defineEventHandler(async (event): Promise<JobProfile> => {
  const body = await readBody<JobExtractRequestBody>(event)
  const errors: string[] = []

  const jobText = body.jobText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

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
      statusMessage: 'Invalid job extract request',
      data: { errors },
    })
  }

  try {
    return await extractJobProfile(jobText, roleType)
  } catch (error: unknown) {
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Job extract returned invalid JSON',
        data: {
          step: error.step,
          ...createAiJsonErrorData(error.sourceError),
        },
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: getErrorMessage(error, 'Job extract failed'),
      data: error instanceof AiWorkflowStepError ? { step: error.step } : undefined,
    })
  }
})
