import { Embeddings } from '@langchain/core/embeddings'

// embedding provider 支持本地 hash 兜底和外部 API 两种模式。
export type EmbeddingProvider = 'local-hash' | 'api'

interface EmbeddingRuntimeConfig {
  embeddingProvider?: string
  embeddingApiKey?: string
  embeddingBaseURL?: string
  embeddingModel?: string
}

interface EmbeddingApiResponse {
  data?: Array<{
    embedding?: number[]
  }>
  error?: {
    message?: string
  }
}

const embeddingDimension = 384

// 默认使用 local-hash。
const normalizeProvider = (provider?: string): EmbeddingProvider => {
  if (provider === 'api' || provider === 'local-hash') {
    return provider
  }

  return 'local-hash'
}

const getEmbeddingsUrl = (baseURL: string) => {
  const normalizedBaseURL = baseURL.replace(/\/+$/, '')

  if (normalizedBaseURL.toLowerCase().endsWith('/embeddings')) {
    return normalizedBaseURL
  }

  return `${normalizedBaseURL}/embeddings`
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

// 简易 tokenizer：同时支持英文技术词和中文短词。
const tokenize = (text: string) => {
  const normalizedText = text.toLowerCase()
  const tokens = normalizedText.match(/[a-z0-9+#.]+|[\u4e00-\u9fa5]{1,2}/g)

  return tokens ?? []
}

// 把 token 映射到固定维度向量槽位。同一个 token 永远得到同一个数字,不同 token 大概率得到不同数字
const hashToken = (token: string) => {
  let hash = 2166136261

  for (let index = 0; index < token.length; index += 1) {
    hash ^= token.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

// 向量归一化，便于相似度检索时比较方向而不是长度,防止长文本因为词多而被理解为相似度高。
const normalizeVector = (vector: number[]) => {
  const norm = Math.sqrt(vector.reduce((total, value) => total + value * value, 0))

  if (norm === 0) {
    return vector
  }

  return vector.map((value) => value / norm)
}

// 本地 hash embedding。
export class LocalHashEmbeddings extends Embeddings {
  constructor() {
    super({})
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((text) => this.embedText(text))
  }

  async embedQuery(text: string): Promise<number[]> {
    return this.embedText(text)
  }

  // 将 token hash 到固定维度向量，并用正负号降低碰撞偏差。
  private embedText(text: string) {
    const vector = Array.from({ length: embeddingDimension }, () => 0)
    const tokens = tokenize(text)

    tokens.forEach((token) => {
      const hash = hashToken(token)
      const index = hash % embeddingDimension
      const sign = hash % 2 === 0 ? 1 : -1
      vector[index] = (vector[index] ?? 0) + sign
    })

    return normalizeVector(vector)
  }
}

// 外部 embedding API provider；失败时自动回退到 LocalHashEmbeddings。
class ApiEmbeddings extends Embeddings {
  private readonly fallback = new LocalHashEmbeddings()

  constructor(
    private readonly apiKey: string,
    private readonly baseURL: string,
    private readonly model: string,
  ) {
    super({})
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    try {
      return await this.callEmbeddingApi(texts)
    } catch (error: unknown) {
      console.warn('[rag] embedding api failed, fallback to local-hash:', getErrorMessage(error))
      return this.fallback.embedDocuments(texts)
    }
  }

  async embedQuery(text: string): Promise<number[]> {
    try {
      const [embedding] = await this.callEmbeddingApi([text])

      if (!embedding) {
        throw new Error('Embedding API returned empty query embedding')
      }

      return embedding
    } catch (error: unknown) {
      console.warn('[rag] embedding api failed, fallback to local-hash:', getErrorMessage(error))
      return this.fallback.embedQuery(text)
    }
  }

  // 调用兼容 OpenAI embeddings 格式的 API。
  private async callEmbeddingApi(input: string[]): Promise<number[][]> {
    if (!this.apiKey || !this.baseURL || !this.model) {
      throw new Error('Embedding API config is incomplete')
    }

    const endpoint = getEmbeddingsUrl(this.baseURL)

    console.log('[rag] embedding endpoint:', endpoint)
    console.log('[rag] embedding provider: api')
    console.log('[rag] embedding model:', this.model)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        input,
      }),
    })

    const rawResponse = await response.text()
    let data: EmbeddingApiResponse

    try {
      data = JSON.parse(rawResponse) as EmbeddingApiResponse
    } catch {
      throw new Error(`Embedding API returned invalid JSON: ${rawResponse.slice(0, 200)}`)
    }

    if (!response.ok) {
      throw new Error(data.error?.message || 'Embedding API request failed')
    }

    const embeddings = data.data
      ?.map((item) => item.embedding)
      .filter((embedding): embedding is number[] =>
        Array.isArray(embedding) && embedding.every((value) => typeof value === 'number'),
      ) ?? []

    if (embeddings.length !== input.length) {
      throw new Error('Embedding API returned unexpected embedding count')
    }

    const [firstEmbedding] = embeddings

    console.log('[rag] embedding dimension:', firstEmbedding?.length ?? 0)

    return embeddings.map((embedding) => normalizeVector(embedding))
  }
}

// 根据 runtimeConfig 创建 embedding provider。
export const createEmbeddingProvider = (): Embeddings => {
  const config = useRuntimeConfig() as unknown as EmbeddingRuntimeConfig
  const provider = normalizeProvider(config.embeddingProvider?.trim())

  if (provider === 'api') {
    return new ApiEmbeddings(
      config.embeddingApiKey?.trim() ?? '',
      config.embeddingBaseURL?.trim() ?? '',
      config.embeddingModel?.trim() ?? '',
    )
  }

  return new LocalHashEmbeddings()
}
