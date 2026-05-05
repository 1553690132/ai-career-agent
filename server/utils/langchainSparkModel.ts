import { LLM, type BaseLLMCallOptions } from '@langchain/core/language_models/llms'
import { callLLM } from './aiClient'

interface SparkLLMCallOptions extends BaseLLMCallOptions {
  // 暴露给 LangChain invoke 的模型参数，最终会透传到统一 LLM 客户端。
  temperature?: number
  maxTokens?: number
}

// 包装成 LangChain 的 LLM 类。
class SparkLLM extends LLM<SparkLLMCallOptions> {
  _llmType(): string {
    // 标识当前模型类型。
    return 'configured-http-llm'
  }

  async _call(prompt: string, options: this['ParsedCallOptions']): Promise<string> {
    console.log('[LangChain] calling configured model')

    try {
      // aiClient 根据 runtimeConfig 选择 Spark 或 MiMo。
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

// 让 chains 可以用 LangChain invoke 的方式调用模型。
export async function callWithLangChain(
  prompt: string,
  options: SparkLLMCallOptions = {},
): Promise<string> {
  const model = new SparkLLM({})

  return model.invoke(prompt, options)
}
