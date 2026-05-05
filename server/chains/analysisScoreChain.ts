import { createCompactAnalysisInput } from './analysisInput'
import { createAnalysisScorePrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisScoreResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type {
  AnalysisResult,
  GapItem,
  JobProfile,
  ResumeProfile,
  ScoreCard,
  SkillMatch,
} from '../../types/analysis'
// 评分chain，有JD下的情况。
// analysis_score 的输入：已经归一化的简历画像、岗位画像和岗位类型。
export interface AnalysisScoreChainInput {
  resumeJson: ResumeProfile
  jobJson: JobProfile
  roleType: string
}

// analysis_score 只负责分数、推荐结论、技能匹配、优势和差距。
export type AnalysisScoreChainOutput = Pick<
  AnalysisResult,
  | 'overallScore'
  | 'overallSummary'
  | 'recommendation'
  | 'scoreCards'
  | 'skillMatches'
  | 'strengths'
  | 'gaps'
>

// 给 advice chain 复用的评分摘要类型。
export interface AnalysisScoreSummary {
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

// 匹配评分 chain：基于简历和 JD 输出可解释的评分结构。
export const analysisScoreChain = {
  async invoke(input: AnalysisScoreChainInput): Promise<AnalysisScoreChainOutput> {
    console.log('[Chain] analysis_score start')
    // 先压缩输入，避免把完整 profile 全量塞进 prompt。
    const analysisInput = createCompactAnalysisInput(input.resumeJson, input.jobJson)
    const analysisInputText = JSON.stringify(analysisInput)
    const prompt = createAnalysisScorePrompt(analysisInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = analysisInputText.length
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
        // 解析并校验输出，确保下游 advice chain 可以可靠消费 scoreSummary。
        const scoreJson = parseAiJsonResponse<AnalysisScoreChainOutput>(content)
        errorStage = 'validate'
        validateAnalysisScoreResult(scoreJson)

        logChainMetrics({
          chainName: 'analysis_score',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] analysis_score success')
        return scoreJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'analysis_score',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] analysis_score error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] analysis_score structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Analysis score chain failed')
  },
}

export const runAnalysisScoreChain = (input: AnalysisScoreChainInput) =>
  analysisScoreChain.invoke(input)
