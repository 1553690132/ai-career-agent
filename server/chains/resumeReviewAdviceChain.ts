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
// 无JD下的评分链。
// 无 JD 简历体检建议输入：基于简历画像和体检评分摘要生成建议。
export interface ResumeReviewAdviceChainInput {
  resumeJson: ResumeProfile
  roleType: string
  scoreSummary: ResumeReviewScoreSummary
}

// 体检建议输出结构与 analysis_advice 保持一致，方便结果页复用组件。
export type ResumeReviewAdviceChainOutput = Pick<
  AnalysisResult,
  'resumeSuggestions' | 'interviewQuestions'
>

// 给 workflow 合并结果时使用的体检建议摘要类型。
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

// 压缩简历画像，保留生成建议需要的摘要、技能和项目。
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

// 压缩评分摘要，让建议 chain 聚焦最重要的优势、gap 和技能匹配。
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

// 简历体检建议 chain：没有 JD 时给出通用优化建议和面试准备题。
export const resumeReviewAdviceChain = {
  async invoke(input: ResumeReviewAdviceChainInput): Promise<ResumeReviewAdviceChainOutput> {
    console.log('[Chain] resume_review_advice start')
    // 将简历上下文和评分摘要分开序列化，便于 prompt 清楚区分输入来源。
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
        // 复用分析建议 schema，保证结果页能用同一套组件展示。
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
