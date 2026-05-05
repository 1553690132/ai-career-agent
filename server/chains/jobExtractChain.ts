import { createJobExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateJobJson } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { JobProfile } from '../../types/analysis'
// jd分析chain
// job_extract 的目标输出：把 JD 压成匹配分析需要的岗位核心字段。
export type JobJson = Required<
  Pick<
    JobProfile,
    | 'title'
    | 'company'
    | 'summary'
    | 'seniorityLevel'
    | 'responsibilities'
    | 'requiredYearsOfExperience'
    | 'educationRequirements'
    | 'keywords'
  >
> & {
  requiredSkills: string[]
  preferredSkills: string[]
}

export interface JobExtractChainInput {
  jobText: string
  roleType: string
}

export type JobExtractChainOutput = JobJson

// 结构化输出失败时最多重试一次
const maxStructuredRetries = 1
const structuredRetryDelay = 500

// 简单延时工具，用于结构化输出重试前等待片刻
const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

// 只有 JSON 解析和 schema 校验错误值得重试；网络/鉴权等错误直接抛出。
const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

// 岗位抽取 chain：把 JD 文本转成结构化 JobJson。
export const jobExtractChain = {
  async invoke(input: JobExtractChainInput): Promise<JobExtractChainOutput> {
    console.log('[Chain] job_extract start')
    // Prompt 约束模型提取岗位职责、技能、关键词等字段。
    const prompt = createJobExtractPrompt(input.jobText, input.roleType)
    const startTime = Date.now()
    const inputLength = input.jobText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        // 通过 LangChain 封装调用当前配置的 LLM provider。
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 800,
        })
        outputLength = content.length
        errorStage = 'parse'
        // 先解析 JSON，再做 schema 校验
        const jobJson = parseAiJsonResponse<JobExtractChainOutput>(content)
        errorStage = 'validate'
        validateJobJson(jobJson)

        logChainMetrics({
          chainName: 'job_extract',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] job_extract success')
        return jobJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'job_extract',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] job_extract error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] job_extract structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Job extract chain failed')
  },
}

export const runJobExtractChain = (input: JobExtractChainInput) => jobExtractChain.invoke(input)
