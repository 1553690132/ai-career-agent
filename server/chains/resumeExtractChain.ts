import { createResumeExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateResumeJson } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { ProjectExperience, ResumeProfile } from '../../types/analysis'

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

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

export const resumeExtractChain = {
  async invoke(input: ResumeExtractChainInput): Promise<ResumeExtractChainOutput> {
    console.log('[Chain] resume_extract start')
    const prompt = createResumeExtractPrompt(input.resumeText, input.roleType)
    const startTime = Date.now()
    const inputLength = input.resumeText.length
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
