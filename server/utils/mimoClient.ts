import { createError } from 'h3'

interface MimoRuntimeConfig {
  // MiMo 独立配置，只有 llmProvider=mimo 时才会被 aiClient 调用。
  mimoApiKey?: string
  mimoBaseURL?: string
  mimoModel?: string
}

// MiMo 的 chat/completions 请求体，保留 enable_thinking 开关以避免输出被思考过程占满。
interface MimoChatCompletionRequest {
  model: string
  messages: Array<{
    role: 'user'
    content: string
  }>
  temperature: number
  chat_template_kwargs: {
    enable_thinking: false
  }
  max_tokens?: number
}

interface CallMimoModelOptions {
  temperature?: number
  maxTokens?: number
}

interface MimoChatCompletionResponse {
  // 只声明业务关心的字段：首个 choice 的文本、结束原因和错误信息。
  choices?: Array<{
    finish_reason?: string | null
    message?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
}

const getChatCompletionsUrl = (baseURL: string) => {
  // 兼容用户在环境变量中配置带斜杠或不带斜杠的 baseURL。
  const normalizedBaseURL = baseURL.replace(/\/+$/, '')
  return `${normalizedBaseURL}/chat/completions`
}

// 调用 MiMo 模型并返回第一条回复文本。
export const callMimoModel = async (
  prompt: string,
  options: CallMimoModelOptions = {},
): Promise<string> => {
  const config = useRuntimeConfig() as unknown as MimoRuntimeConfig
  const apiKey = config.mimoApiKey?.trim()
  const baseURL = config.mimoBaseURL?.trim()
  const model = config.mimoModel?.trim()

  // 配置错误在服务端直接暴露为 500，便于部署阶段发现问题。
  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MiMo API key is not configured',
    })
  }

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MiMo baseURL is not configured',
    })
  }

  if (!model) {
    throw createError({
      statusCode: 500,
      statusMessage: 'MiMo model is not configured',
    })
  }

  const requestBody: MimoChatCompletionRequest = {
    model,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: options.temperature ?? 0.2,
    chat_template_kwargs: {
      enable_thinking: false,
    },
  }

  if (typeof options.maxTokens === 'number') {
    requestBody.max_tokens = options.maxTokens
  }

  // 请求失败说明上游服务不可达，统一转成 502。
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
      statusMessage: 'Failed to connect to MiMo service',
    })
  }

  let rawResponseText = ''

  // 先拿原始响应文本，后面解析失败时可以截断后带入错误 data。
  try {
    rawResponseText = await response.text()
    console.log('MIMO RAW RESPONSE:', rawResponseText)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Failed to read MiMo service response',
    })
  }

  let data: MimoChatCompletionResponse

  // MiMo 正常响应应为 JSON；非 JSON 响应用专门错误提示区分。
  try {
    data = JSON.parse(rawResponseText) as MimoChatCompletionResponse
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'MiMo service returned invalid JSON',
      data: {
        rawResponse: rawResponseText.slice(0, 300),
      },
    })
  }

  console.log('MIMO PARSED RESPONSE:', data)

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || 'MiMo service request failed',
    })
  }

  const firstChoice = data.choices?.[0]
  const content = firstChoice?.message?.content?.trim()
  console.log('MIMO MESSAGE CONTENT:', content)

  // 如果因为长度截断导致没有最终内容，给出更具体的排查建议。
  if (!content) {
    if (firstChoice?.finish_reason === 'length') {
      throw createError({
        statusCode: 502,
        statusMessage: 'MiMo output truncated before final content. Try disabling thinking or increasing max_tokens.',
      })
    }

    throw createError({
      statusCode: 502,
      statusMessage: 'MiMo returned empty content.',
    })
  }

  return content
}
