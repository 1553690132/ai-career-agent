import { createJobExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateJobJson } from '../utils/schemaValidation'
import type { MinimalSeniorityLevel } from './resumeExtractChain'

export interface MinimalJobExtract {
  title?: string
  company?: string
  summary?: string
  seniorityLevel?: MinimalSeniorityLevel
  responsibilities?: string[]
  requiredSkills?: string[]
  preferredSkills?: string[]
  requiredYearsOfExperience?: number
  educationRequirements?: string[]
  keywords?: string[]
}

export interface JobExtractChainInput {
  jobText: string
  roleType: string
}

export type JobExtractChainOutput = MinimalJobExtract

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

export const runJobExtractChain = async (
  input: JobExtractChainInput,
): Promise<JobExtractChainOutput> => {
  console.log('[Chain] job_extract start')
  const prompt = createJobExtractPrompt(input.jobText, input.roleType)

  for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
    try {
      const content = await callWithLangChain(prompt, {
        temperature: 0,
        maxTokens: 800,
      })
      const jobJson = parseAiJsonResponse<JobExtractChainOutput>(content)
      validateJobJson(jobJson)

      console.log('[Chain] job_extract success')
      return jobJson
    } catch (error: unknown) {
      if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
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
}
