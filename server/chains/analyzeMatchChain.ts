import { createAnalysisPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisResult } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { AnalysisResult, JobProfile, ResumeProfile } from '../../types/analysis'

export interface AnalyzeMatchChainInput {
  resumeJson: ResumeProfile
  jobJson: JobProfile
  roleType: string
}

export type AnalyzeMatchChainOutput = Omit<AnalysisResult, 'resume' | 'job'>

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

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

export const analysisMatchChain = {
  async invoke(input: AnalyzeMatchChainInput): Promise<AnalyzeMatchChainOutput> {
    console.log('[Chain] analyze_match start')
    const analysisInput = createAnalysisInput(input.resumeJson, input.jobJson)
    const analysisInputText = JSON.stringify(analysisInput)
    const prompt = createAnalysisPrompt(analysisInputText, input.roleType)
    const startTime = Date.now()
    const inputLength = analysisInputText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1500,
        })
        outputLength = content.length
        errorStage = 'parse'
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
