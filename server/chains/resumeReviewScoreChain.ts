import { createResumeReviewScorePrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisScoreResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type {
  AnalysisResult,
  GapItem,
  ResumeProfile,
  ScoreCard,
  SkillMatch,
} from '../../types/analysis'

export interface ResumeReviewScoreChainInput {
  resumeJson: ResumeProfile
  roleType: string
}

export type ResumeReviewScoreChainOutput = Pick<
  AnalysisResult,
  | 'overallScore'
  | 'overallSummary'
  | 'recommendation'
  | 'scoreCards'
  | 'skillMatches'
  | 'strengths'
  | 'gaps'
>

export interface ResumeReviewScoreSummary {
  overallScore: number
  overallSummary: string
  recommendation: AnalysisResult['recommendation']
  scoreCards: ScoreCard[]
  skillMatches: SkillMatch[]
  strengths: string[]
  gaps: GapItem[]
}

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

const createResumeReviewInput = (resume: ResumeProfile) => ({
  summary: resume.summary ?? '',
  yearsOfExperience: resume.yearsOfExperience ?? 0,
  seniorityLevel: resume.seniorityLevel ?? 'unknown',
  targetRoles: resume.targetRoles?.slice(0, 3) ?? [],
  skills: resume.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
  projects: resume.projects.slice(0, 2).map((project) => ({
    name: project.name,
    summary: project.summary,
    skills: project.skills.slice(0, 5),
  })),
  education: resume.education.slice(0, 2).map((item) => ({
    school: item.school,
    degree: item.degree ?? '',
    major: item.major ?? '',
  })),
})

export const resumeReviewScoreChain = {
  async invoke(input: ResumeReviewScoreChainInput): Promise<ResumeReviewScoreChainOutput> {
    console.log('[Chain] resume_review_score start')
    const reviewInput = createResumeReviewInput(input.resumeJson)
    const reviewInputText = JSON.stringify(reviewInput)
    const prompt = createResumeReviewScorePrompt(reviewInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = reviewInputText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1200,
        })
        outputLength = content.length
        errorStage = 'parse'
        const scoreJson = parseAiJsonResponse<ResumeReviewScoreChainOutput>(content)
        errorStage = 'validate'
        validateAnalysisScoreResult(scoreJson)

        logChainMetrics({
          chainName: 'resume_review_score',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] resume_review_score success')
        return scoreJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'resume_review_score',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] resume_review_score error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] resume_review_score structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Resume review score chain failed')
  },
}

export const runResumeReviewScoreChain = (input: ResumeReviewScoreChainInput) =>
  resumeReviewScoreChain.invoke(input)
