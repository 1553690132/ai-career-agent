import { createJobExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateJobJson } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type { JobProfile } from '../../types/analysis'

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

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

export const jobExtractChain = {
  async invoke(input: JobExtractChainInput): Promise<JobExtractChainOutput> {
    console.log('[Chain] job_extract start')
    const prompt = createJobExtractPrompt(input.jobText, input.roleType)
    const startTime = Date.now()
    const inputLength = input.jobText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 800,
        })
        outputLength = content.length
        errorStage = 'parse'
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
