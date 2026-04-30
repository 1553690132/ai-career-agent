import { AiWorkflowStepError, extractResumeProfile } from '../services/aiWorkflow'
import { AiJsonParseError, createAiJsonErrorData, getErrorMessage } from '../utils/json'
import type { ResumeProfile } from '../../types/analysis'

interface ResumeExtractRequestBody {
  resumeText?: string
  roleType?: string
}

const minTextLength = 50
const maxTextLength = 2000

export default defineEventHandler(async (event): Promise<ResumeProfile> => {
  const body = await readBody<ResumeExtractRequestBody>(event)
  const errors: string[] = []

  const resumeText = body.resumeText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

  if (!resumeText) {
    errors.push('resumeText is required')
  } else if (resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
  }

  if (!roleType) {
    errors.push('roleType is required')
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid resume extract request',
      data: { errors },
    })
  }

  try {
    return await extractResumeProfile(resumeText, roleType)
  } catch (error: unknown) {
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Resume extract returned invalid JSON',
        data: {
          step: error.step,
          ...createAiJsonErrorData(error.sourceError),
        },
      })
    }

    throw createError({
      statusCode: 500,
      statusMessage: getErrorMessage(error, 'Resume extract failed'),
      data: error instanceof AiWorkflowStepError ? { step: error.step } : undefined,
    })
  }
})
