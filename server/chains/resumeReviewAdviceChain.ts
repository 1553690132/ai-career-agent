import { createResumeReviewAdvicePrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisAdviceResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type {
  AnalysisResult,
  InterviewQuestion,
  ResumeProfile,
  ResumeSuggestion,
} from '../../types/analysis'
import type { ResumeReviewScoreSummary } from './resumeReviewScoreChain'

export interface ResumeReviewAdviceChainInput {
  resumeJson: ResumeProfile
  roleType: string
  scoreSummary: ResumeReviewScoreSummary
}

export type ResumeReviewAdviceChainOutput = Pick<
  AnalysisResult,
  'resumeSuggestions' | 'interviewQuestions'
>

export interface ResumeReviewAdviceSummary {
  resumeSuggestions: ResumeSuggestion[]
  interviewQuestions: InterviewQuestion[]
}

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

const createResumeReviewInput = (input: ResumeReviewAdviceChainInput) => ({
  resume: {
    summary: input.resumeJson.summary ?? '',
    yearsOfExperience: input.resumeJson.yearsOfExperience ?? 0,
    seniorityLevel: input.resumeJson.seniorityLevel ?? 'unknown',
    targetRoles: input.resumeJson.targetRoles?.slice(0, 3) ?? [],
    skills: input.resumeJson.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    projects: input.resumeJson.projects.slice(0, 2).map((project) => ({
      name: project.name,
      summary: project.summary,
      skills: project.skills.slice(0, 5),
    })),
  },
})

const createScoreSummary = (scoreSummary: ResumeReviewScoreSummary) => ({
  overallScore: scoreSummary.overallScore,
  overallSummary: scoreSummary.overallSummary,
  recommendation: scoreSummary.recommendation,
  strengths: scoreSummary.strengths.slice(0, 3),
  gaps: scoreSummary.gaps.slice(0, 3).map((gap) => ({
    title: gap.title,
    priority: gap.priority,
    improvementAdvice: gap.improvementAdvice,
    relatedSkills: gap.relatedSkills?.slice(0, 2) ?? [],
  })),
  skillMatches: scoreSummary.skillMatches.slice(0, 6).map((skill) => ({
    skillName: skill.skillName,
    matchLevel: skill.matchLevel,
    score: skill.score,
  })),
})

export const resumeReviewAdviceChain = {
  async invoke(input: ResumeReviewAdviceChainInput): Promise<ResumeReviewAdviceChainOutput> {
    console.log('[Chain] resume_review_advice start')
    const reviewInputText = JSON.stringify(createResumeReviewInput(input))
    const scoreSummaryText = JSON.stringify(createScoreSummary(input.scoreSummary))
    const prompt = createResumeReviewAdvicePrompt(
      reviewInputText,
      input.roleType,
      scoreSummaryText,
    )
    const startTime = Date.now()
    const inputLength = reviewInputText.length + scoreSummaryText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1000,
        })
        outputLength = content.length
        errorStage = 'parse'
        const adviceJson = parseAiJsonResponse<ResumeReviewAdviceChainOutput>(content)
        errorStage = 'validate'
        validateAnalysisAdviceResult(adviceJson)

        logChainMetrics({
          chainName: 'resume_review_advice',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] resume_review_advice success')
        return adviceJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'resume_review_advice',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] resume_review_advice error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] resume_review_advice structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Resume review advice chain failed')
  },
}

export const runResumeReviewAdviceChain = (input: ResumeReviewAdviceChainInput) =>
  resumeReviewAdviceChain.invoke(input)
