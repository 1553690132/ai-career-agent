import { createCompactAnalysisInput } from './analysisInput'
import { createAnalysisAdvicePrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisAdviceResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type {
  AnalysisResult,
  InterviewQuestion,
  JobProfile,
  ResumeProfile,
  ResumeSuggestion,
} from '../../types/analysis'
import type { AnalysisScoreSummary } from './analysisScoreChain'
// 有JD下的评分链。
// analysis_advice 的输入：评分结果会作为上下文，帮助建议更贴合差距。
export interface AnalysisAdviceChainInput {
  resumeJson: ResumeProfile
  jobJson: JobProfile
  roleType: string
  scoreSummary: AnalysisScoreSummary
}

// analysis_advice 只负责产出简历建议和面试题，不重复生成评分。
export type AnalysisAdviceChainOutput = Pick<
  AnalysisResult,
  'resumeSuggestions' | 'interviewQuestions'
>

// 给 workflow 合并结果时使用的建议摘要类型。
export interface AnalysisAdviceSummary {
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

// 组合简历/JD 压缩上下文和评分摘要，作为建议生成的 prompt 输入。
const createAdviceInput = (input: AnalysisAdviceChainInput) => ({
  ...createCompactAnalysisInput(input.resumeJson, input.jobJson),
  scoreSummary: {
    overallScore: input.scoreSummary.overallScore,
    overallSummary: input.scoreSummary.overallSummary,
    recommendation: input.scoreSummary.recommendation,
    strengths: input.scoreSummary.strengths.slice(0, 3),
    gaps: input.scoreSummary.gaps.slice(0, 2).map((gap) => ({
      title: gap.title,
      priority: gap.priority,
      improvementAdvice: gap.improvementAdvice,
      relatedSkills: gap.relatedSkills?.slice(0, 2) ?? [],
    })),
    skillMatches: input.scoreSummary.skillMatches.slice(0, 5).map((skill) => ({
      skillName: skill.skillName,
      matchLevel: skill.matchLevel,
      score: skill.score,
    })),
  },
})

// 匹配建议 chain：在评分基础上生成简历优化建议和面试题预测。
export const analysisAdviceChain = {
  async invoke(input: AnalysisAdviceChainInput): Promise<AnalysisAdviceChainOutput> {
    console.log('[Chain] analysis_advice start')
    // advice 输入包含压缩画像和关键评分结论，减少模型重复推理。
    const adviceInput = createAdviceInput(input)
    const adviceInputText = JSON.stringify(adviceInput)
    const prompt = createAnalysisAdvicePrompt(adviceInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = adviceInputText.length
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
        // 解析并校验输出，保证结果页可以直接渲染建议和面试题。
        const adviceJson = parseAiJsonResponse<AnalysisAdviceChainOutput>(content)
        errorStage = 'validate'
        validateAnalysisAdviceResult(adviceJson)

        logChainMetrics({
          chainName: 'analysis_advice',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] analysis_advice success')
        return adviceJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'analysis_advice',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] analysis_advice error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] analysis_advice structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Analysis advice chain failed')
  },
}

export const runAnalysisAdviceChain = (input: AnalysisAdviceChainInput) =>
  analysisAdviceChain.invoke(input)
