import { createResumeExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateResumeJson } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { ProjectExperience, ResumeProfile } from '../../types/analysis'
// 简历分析chain
// 目标输出：只保留后续匹配分析需要的简历核心字段。
export type ResumeJson = Required<
  Pick<
    ResumeProfile,
    'name' | 'headline' | 'summary' | 'yearsOfExperience' | 'seniorityLevel' | 'targetRoles'
  >
> & {
  skills: string[]
  projects: Array<Pick<ProjectExperience, 'name' | 'summary' | 'skills'>>
  education: string[]
}

export interface ResumeExtractChainInput {
  resumeText: string
  roleType: string
}

export type ResumeExtractChainOutput = ResumeJson

// 结构化输出失败时最多重试一次，主要应对 LLM 返回非 JSON 或字段缺失。
const maxStructuredRetries = 1
const structuredRetryDelay = 500

// 结构化输出重试前等待延时
const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

// 只有 JSON 解析和 schema 校验错误值得重试；网络/鉴权等错误直接抛出。
const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

// 把清洗后的简历文本转成结构化 ResumeJson
export const resumeExtractChain = {
  async invoke(input: ResumeExtractChainInput): Promise<ResumeExtractChainOutput> {
    console.log('[Chain] resume_extract start')
    // Prompt 约束模型只输出可解析的简历 JSON。
    const prompt = createResumeExtractPrompt(input.resumeText, input.roleType)
    const startTime = Date.now()
    const inputLength = input.resumeText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        // 通过 LangChain 封装调用当前配置的 LLM provider。
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1000,
        })
        outputLength = content.length
        errorStage = 'parse'
        // 先解析 JSON，再做 schema 校验，保证 workflow 下一步拿到稳定结构。
        const resumeJson = parseAiJsonResponse<ResumeExtractChainOutput>(content)
        errorStage = 'validate'
        validateResumeJson(resumeJson)

        logChainMetrics({
          chainName: 'resume_extract',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] resume_extract success')
        return resumeJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          // 非结构化错误或重试后仍失败时记录 metrics 并交给 workflow fallback。
          logChainMetrics({
            chainName: 'resume_extract',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] resume_extract error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] resume_extract structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Resume extract chain failed')
  },
}

export const runResumeExtractChain = (input: ResumeExtractChainInput) =>
  resumeExtractChain.invoke(input)
