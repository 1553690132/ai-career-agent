import { LLM, type BaseLLMCallOptions } from '@langchain/core/language_models/llms'
import { callLLM } from './aiClient'

interface SparkLLMCallOptions extends BaseLLMCallOptions {
  temperature?: number
  maxTokens?: number
}

class SparkLLM extends LLM<SparkLLMCallOptions> {
  _llmType(): string {
    return 'spark-http'
  }

  async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
    console.log('[LangChain] calling spark model')

    try {
      const content = await callLLM(prompt, {
        temperature: options.temperature,
        maxTokens: options.maxTokens,
      })
      console.log('[LangChain] success')

      return content
    } catch (error: unknown) {
      console.error('[LangChain] error', error)
      throw error
    }
  }
}

export async function callWithLangChain(
  prompt: string,
  options: SparkLLMCallOptions = {},
): Promise<string> {
  const model = new SparkLLM({})

  return model.invoke(prompt, options)
}
