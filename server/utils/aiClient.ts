import { createError } from 'h3'

interface AiRuntimeConfig {
  aiApiKey?: string
  aiBaseURL?: string
  aiModel?: string
}

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
  const normalizedBaseURL = baseURL.replace(/\/+$/, '')
  return `${normalizedBaseURL}/chat/completions`
}

export const callSparkModel = async (
  prompt: string,
  options: CallSparkModelOptions = {},
): Promise<string> => {
  const config = useRuntimeConfig() as unknown as AiRuntimeConfig
  const apiKey = config.aiApiKey?.trim()
  const baseURL = config.aiBaseURL?.trim()
  const model = config.aiModel?.trim()

  if (!apiKey) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI API key is not configured',
    })
  }

  if (!baseURL) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI baseURL is not configured',
    })
  }

  if (!model) {
    throw createError({
      statusCode: 500,
      statusMessage: 'AI model is not configured',
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

  if (!response.ok) {
    throw createError({
      statusCode: response.status,
      statusMessage: data.error?.message || 'AI service request failed',
    })
  }

  const content = data.choices?.[0]?.message?.content?.trim()
  console.log('SPARK MESSAGE CONTENT:', content)

  if (!content) {
    throw createError({
      statusCode: 502,
      statusMessage: 'AI service returned empty content',
    })
  }

  return content
}

export const callLLM = callSparkModel
