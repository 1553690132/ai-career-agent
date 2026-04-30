import { mockAnalysisResult } from '../../mocks/analysis.mock'
import { runFullAnalysis } from '../services/aiWorkflow'
import { getErrorMessage } from '../utils/json'
import type { AnalysisResult } from '../../types/analysis'

interface AnalyzeRequestBody {
  resumeText?: string
  jobText?: string
  roleType?: string
}

const minTextLength = 50
const maxTextLength = 2000

export default defineEventHandler(async (event): Promise<AnalysisResult> => {
  const body = await readBody<AnalyzeRequestBody>(event)
  const errors: string[] = []

  const resumeText = body.resumeText?.trim() ?? ''
  const jobText = body.jobText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

  if (!resumeText) {
    errors.push('resumeText is required')
  } else if (resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
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

  try {
    return await runFullAnalysis(resumeText, jobText, roleType)
  } catch (error: unknown) {
    console.warn(`[ai_workflow] fallback used: ${getErrorMessage(error, 'Analyze failed')}`)

    return {
      ...mockAnalysisResult,
      generatedAt: new Date().toISOString(),
    }
  }
})
