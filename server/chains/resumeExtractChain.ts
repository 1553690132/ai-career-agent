import { createResumeExtractPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateResumeJson } from '../utils/schemaValidation'

export type MinimalSeniorityLevel = 'intern' | 'junior' | 'mid' | 'senior' | 'unknown'

export interface MinimalResumeProject {
  name: string
  summary: string
  skills: string[]
}

export interface MinimalResumeExtract {
  name?: string
  headline?: string
  summary?: string
  yearsOfExperience?: number
  seniorityLevel?: MinimalSeniorityLevel
  targetRoles?: string[]
  skills?: string[]
  projects?: MinimalResumeProject[]
  education?: string[]
}

export interface ResumeExtractChainInput {
  resumeText: string
  roleType: string
}

export type ResumeExtractChainOutput = MinimalResumeExtract

const maxStructuredRetries = 1
const structuredRetryDelay = 500

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

export const runResumeExtractChain = async (
  input: ResumeExtractChainInput,
): Promise<ResumeExtractChainOutput> => {
  console.log('[Chain] resume_extract start')
  const prompt = createResumeExtractPrompt(input.resumeText, input.roleType)

  for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
    try {
      const content = await callWithLangChain(prompt, {
        temperature: 0,
        maxTokens: 1000,
      })
      const resumeJson = parseAiJsonResponse<ResumeExtractChainOutput>(content)
      validateResumeJson(resumeJson)

      console.log('[Chain] resume_extract success')
      return resumeJson
    } catch (error: unknown) {
      if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
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
}
