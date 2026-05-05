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
// 无JD的评分chain。
// 无 JD 简历体检评分输入：只依赖简历画像和用户选择的岗位方向。
export interface ResumeReviewScoreChainInput {
  resumeJson: ResumeProfile
  roleType: string
}

// 体检评分输出结构与 analysis_score 保持一致，方便 workflow 统一合并。
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

// 给 resume_review_advice chain 复用的评分摘要类型。
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

// 将 ResumeProfile 压缩成体检 prompt 所需的关键上下文。
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

// 简历体检评分 chain：没有 JD 时评估简历完整度、表达和岗位方向匹配度。
export const resumeReviewScoreChain = {
  async invoke(input: ResumeReviewScoreChainInput): Promise<ResumeReviewScoreChainOutput> {
    console.log('[Chain] resume_review_score start')
    // 体检模式没有 jobJson，因此只压缩简历画像。
    const reviewInput = createResumeReviewInput(input.resumeJson)
    const reviewInputText = JSON.stringify(reviewInput)
    const prompt = createResumeReviewScorePrompt(reviewInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = reviewInputText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        // 使用低温度提升结构化评分结果稳定性。
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1200,
        })
        outputLength = content.length
        errorStage = 'parse'
        // 复用分析评分 schema，保证结果页能用同一套组件展示。
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
