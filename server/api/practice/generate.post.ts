import {
  createFallbackPracticeSet,
  practiceQuestionChain,
} from '../../chains/practiceQuestionChain'
import { createFallbackMetrics, logChainMetrics } from '../../utils/chainMetrics'
import { getErrorMessage } from '../../utils/json'
import type { AnalysisResult, PracticeSet } from '../../../types/analysis'

interface PracticeGenerateRequestBody {
  analysisResult?: AnalysisResult
  roleType?: string
}

const isAnalysisResultLike = (value: unknown): value is AnalysisResult => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<AnalysisResult>

  return Array.isArray(data.gaps)
    && Array.isArray(data.skillMatches)
    && Array.isArray(data.resumeSuggestions)
    && Array.isArray(data.interviewQuestions)
}

export default defineEventHandler(async (event): Promise<PracticeSet> => {
  const body = await readBody<PracticeGenerateRequestBody>(event)
  const analysisResult = body.analysisResult
  const roleType = body.roleType?.trim() || analysisResult?.job?.title || 'unknown'

  if (!isAnalysisResultLike(analysisResult)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid practice generate request',
      data: {
        errors: ['analysisResult is required'],
      },
    })
  }

  try {
    return await practiceQuestionChain.invoke({
      analysisResult,
      roleType,
    })
  } catch (error: unknown) {
    console.warn(
      `[practice_question] fallback used after generation failure: ${getErrorMessage(error)}`,
    )
    logChainMetrics(createFallbackMetrics('practice_question', undefined))

    return createFallbackPracticeSet(analysisResult, roleType)
  }
})
