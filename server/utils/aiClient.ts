import { createError } from 'h3'
import { callMimoModel } from './mimoClient'

interface AiRuntimeConfig {
  // 从 Nuxt runtimeConfig 读取后端 LLM 配置，支持在环境变量里切换 provider。
  llmProvider?: string
  sparkApiKey?: string
  sparkBaseURL?: string
  sparkModel?: string
}

// Spark 兼容 OpenAI chat/completions 的请求体结构。
interface ChatCompletionRequest {
  model: string
  messages: Array<{
    role: 'user'
    content: string
  }>
  temperature: number
  thinking: {
    type: 'disabled'
  }
  max_tokens?: number
}

interface CallSparkModelOptions {
  temperature?: number
  maxTokens?: number
}

interface ChatCompletionResponse {
  // 这里只声明当前业务会读取的字段，避免把外部响应结构绑得过死。
  choices?: Array<{
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

const getChatCompletionsUrl = (baseURL: string) => {
  // 去掉末尾多余斜杠，统一拼出 chat/completions 地址。
  const normalizedBaseURL = baseURL.replace(/\/+$/, '')
  return `${normalizedBaseURL}/chat/completions`
}

// 调用 Spark 模型并返回纯文本内容，后续链路会再负责 JSON 解析和校验。
export const callSparkModel = async (
  prompt: string,
  options: CallSparkModelOptions = {},
): Promise<string> => {
  const config = useRuntimeConfig() as unknown as AiRuntimeConfig
  const apiKey = config.sparkApiKey?.trim()
  const baseURL = config.sparkBaseURL?.trim()
  const model = config.sparkModel?.trim()

  // 配置缺失属于服务端部署问题，直接抛 500 方便定位。
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Spark API key is not configured',
    })
  }

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Spark baseURL is not configured',
    })
  }

  if (!model) {
    throw createError({
      statusCode: 500,
      statusMessage: 'Spark model is not configured',
    })
  }

  const requestBody: ChatCompletionRequest = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: options.temperature ?? 0.2,
    thinking: {
      type: 'disabled',
    },
  }

  if (typeof options.maxTokens === 'number') {
    requestBody.max_tokens = options.maxTokens
  }

  // 网络层失败统一转成 502，表示上游 AI 服务不可达。
  let response: Response

  try {
    response = await fetch(getChatCompletionsUrl(baseURL), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to connect to AI service',
    })
  }

  let rawResponseText = ''

  // 先读取原始文本，既方便调试，也能兼容上游返回非 JSON 的异常场景。
  try {
    rawResponseText = await response.text()
    console.log('SPARK RAW RESPONSE:', rawResponseText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to read AI service response',
    })
  }

  let data: ChatCompletionResponse

  // Spark 正常情况下返回 JSON；如果解析失败，把前 300 字带回错误信息辅助排查。
  try {
    data = JSON.parse(rawResponseText) as ChatCompletionResponse
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI service returned invalid JSON',
      data: {
        rawResponse: rawResponseText.slice(0, 300),
      },
    })
  }

  console.log('SPARK PARSED RESPONSE:', data)

  // HTTP 状态非 2xx 时优先透传上游错误文案。
  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || 'AI service request failed',
    })
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  console.log('SPARK MESSAGE CONTENT:', content)

  // 空内容无法进入后续 JSON 解析，所以在客户端层提前拦截。
  if (!content) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI service returned empty content',
    })
  }

  return content
}

// 统一的 LLM 调用入口：业务链只依赖它，由配置决定实际走 Spark 还是 MiMo。
export const callLLM = async (
  prompt: string,
  options: CallSparkModelOptions = {},
): Promise<string> => {
  const config = useRuntimeConfig() as unknown as AiRuntimeConfig
  const provider = config.llmProvider?.trim().toLowerCase() || 'spark'

  if (provider === 'mimo') {
    return callMimoModel(prompt, options)
  }

  return callSparkModel(prompt, options)
}
