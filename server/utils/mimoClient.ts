import { createError } from 'h3'

interface MimoRuntimeConfig {
  mimoApiKey?: string
  mimoBaseURL?: string
  mimoModel?: string
}

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
  const normalizedBaseURL = baseURL.replace(/\/+$/, '')
  return `${normalizedBaseURL}/chat/completions`
}

export const callMimoModel = async (
  prompt: string,
  options: CallMimoModelOptions = {},
): Promise<string> => {
  const config = useRuntimeConfig() as unknown as MimoRuntimeConfig
  const apiKey = config.mimoApiKey?.trim()
  const baseURL = config.mimoBaseURL?.trim()
  const model = config.mimoModel?.trim()

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
