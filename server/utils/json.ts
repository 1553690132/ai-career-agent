export class AiJsonParseError extends Error {
  constructor(
    public readonly rawContent: string,
    public readonly parseMessage: string,
  ) {
    super(`AI returned invalid JSON: ${parseMessage}`)
  }
}

export const extractJson = <T>(content: string): T => {
  const cleanedContent = content
    .replace(/```\s*json/gi, '')
    .replace(/```/g, '')
    .trim()

  const objectStartIndex = cleanedContent.indexOf('{')
  const objectEndIndex = cleanedContent.lastIndexOf('}')
  const jsonText =
    objectStartIndex >= 0 && objectEndIndex > objectStartIndex
      ? cleanedContent.slice(objectStartIndex, objectEndIndex + 1)
      : cleanedContent

  return JSON.parse(jsonText) as T
}

export const parseAiJsonResponse = <T>(content: string): T => {
  try {
    return extractJson<T>(content)
  } catch (error: unknown) {
    const parseMessage = error instanceof Error ? error.message : 'Unknown JSON parse error'
    console.log('RAW AI CONTENT:', content)
    throw new AiJsonParseError(content, parseMessage)
  }
}

export const parseJsonInput = <T>(value: unknown): T => {
  if (typeof value === 'string') {
    return JSON.parse(value) as T
  }

  return value as T
}

export const getErrorMessage = (error: unknown, fallback = 'AI request failed') => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (
    error &&
    typeof error === 'object' &&
    'statusMessage' in error &&
    typeof error.statusMessage === 'string'
  ) {
    return error.statusMessage
  }

  return fallback
}

export const createAiJsonErrorData = (error: AiJsonParseError) => ({
  message: error.message,
  rawContent: error.rawContent.slice(0, 300),
})
