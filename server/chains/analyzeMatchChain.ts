import { createAnalysisPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { AnalysisResult, JobProfile, ResumeProfile } from '../../types/analysis'

// 旧版/单体匹配分析 chain：一次性生成完整分析结果，但当前主 workflow 已拆成 score + advice。
export interface AnalyzeMatchChainInput {
  resumeJson: ResumeProfile
  jobJson: JobProfile
  roleType: string
}

// 输出不包含 resume/job 本体，workflow 会在外层把画像和分析结果合并。
export type AnalyzeMatchChainOutput = Omit<AnalysisResult, 'resume' | 'job'>

// 结构化输出失败时最多重试一次，主要应对 LLM 返回非 JSON 或字段缺失。
const maxStructuredRetries = 1
const structuredRetryDelay = 500

// 简单延时工具，用于结构化输出重试前等待片刻。
const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

// 只有 JSON 解析和 schema 校验错误值得重试；网络/鉴权等错误直接抛出。
const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

// 将完整简历/JD 压缩成单体分析 prompt 所需的输入。
const createAnalysisInput = (resume: ResumeProfile, job: JobProfile) => ({
  resume: {
    summary: resume.summary ?? '',
    yearsOfExperience: resume.yearsOfExperience ?? 0,
    skills: resume.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    projects: resume.projects.slice(0, 2).map((project) => ({
      name: project.name,
      summary: project.summary,
      skills: project.skills.slice(0, 5),
    })),
  },
  job: {
    title: job.title,
    summary: job.summary ?? '',
    requiredSkills: job.requiredSkills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    preferredSkills: job.preferredSkills?.map((skill) => skill.name).filter(Boolean).slice(0, 5) ?? [],
    keywords: job.keywords.slice(0, 10),
  },
})

// 单体匹配 chain：保留给分段接口或历史调用，主线更推荐 analysisScore + analysisAdvice。
export const analysisMatchChain = {
  async invoke(input: AnalyzeMatchChainInput): Promise<AnalyzeMatchChainOutput> {
    console.log('[Chain] analyze_match start')
    // 先压缩输入，降低 token 消耗。
    const analysisInput = createAnalysisInput(input.resumeJson, input.jobJson)
    const analysisInputText = JSON.stringify(analysisInput)
    const prompt = createAnalysisPrompt(analysisInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = analysisInputText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        // 单体输出字段更多，因此 maxTokens 比拆分 chain 稍高。
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1500,
        })
        outputLength = content.length
        errorStage = 'parse'
        // 解析并校验完整 AnalysisResult 形状。
        const analysisJson = parseAiJsonResponse<AnalyzeMatchChainOutput>(content)
        errorStage = 'validate'
        validateAnalysisResult(analysisJson)

        logChainMetrics({
          chainName: 'analysis_match',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] analyze_match success')
        return analysisJson
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'analysis_match',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] analyze_match error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] analyze_match structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Analyze match chain failed')
  },
}

export const runAnalyzeMatchChain = (input: AnalyzeMatchChainInput) =>
  analysisMatchChain.invoke(input)
