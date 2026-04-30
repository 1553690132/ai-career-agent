import { createAnalysisPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validateAnalysisResult } from '../utils/schemaValidation'
import type { AnalysisResult } from '../../types/analysis'

export interface AnalyzeMatchChainInput {
  analysisInput: string
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

export const runAnalyzeMatchChain = async (
  input: AnalyzeMatchChainInput,
): Promise<AnalyzeMatchChainOutput> => {
  console.log('[Chain] analyze_match start')
  const prompt = createAnalysisPrompt(input.analysisInput, input.roleType)

  for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
    try {
      const content = await callWithLangChain(prompt, {
        temperature: 0,
        maxTokens: 1500,
      })
      const analysisJson = parseAiJsonResponse<AnalyzeMatchChainOutput>(content)
      validateAnalysisResult(analysisJson)

      console.log('[Chain] analyze_match success')
      return analysisJson
    } catch (error: unknown) {
      if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
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
}
