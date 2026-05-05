export class AiJsonParseError extends Error {
  // 保留原始模型输出，API 层可以把截断内容带回前端或日志用于排查。
  constructor(
    public readonly rawContent: string,
    public readonly parseMessage: string,
  ) {
    super(`AI returned invalid JSON: ${parseMessage}`)
  }
}

// 从模型输出中提取 JSON：兼容 ```json 代码块，也兼容前后带少量杂文本的响应。
export const extractJson = <T>(content: string): T => {
  const cleanedContent = content
    .replace(/```\s*json/gi, '')
    .replace(/```/g, '')
    .trim()

  const objectStartIndex = cleanedContent.indexOf('{')
  const objectEndIndex = cleanedContent.lastIndexOf('}')
  // 优先截取最外层对象，减少模型额外说明对 JSON.parse 的影响。
  const jsonText =
    objectStartIndex >= 0 && objectEndIndex > objectStartIndex
      ? cleanedContent.slice(objectStartIndex, objectEndIndex + 1)
      : cleanedContent

  return JSON.parse(jsonText) as T
}

// 统一解析 AI JSON 响应，失败时抛出带 rawContent 的专用错误类型。
export const parseAiJsonResponse = <T>(content: string): T => {
  try {
    return extractJson<T>(content)
  } catch (error: unknown) {
    const parseMessage = error instanceof Error ? error.message : 'Unknown JSON parse error'
    console.log('RAW AI CONTENT:', content)
    throw new AiJsonParseError(content, parseMessage)
  }
}

// API 入参有时已经是对象，有时是 JSON 字符串；这里统一转成目标类型。
export const parseJsonInput = <T>(value: unknown): T => {
  if (typeof value === 'string') {
    return JSON.parse(value) as T
  }

  return value as T
}

// 从未知错误对象中提取可读消息，给 API 错误响应复用。
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

// 给前端/日志返回精简后的 JSON 解析错误信息，避免输出过长模型原文。
export const createAiJsonErrorData = (error: AiJsonParseError) => ({
  message: error.message,
  rawContent: error.rawContent.slice(0, 300),
})
