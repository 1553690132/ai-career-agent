import { Document } from '@langchain/core/documents'
import type { EmbeddingsInterface } from '@langchain/core/embeddings'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'
// 向量库处理.
// 向量库 provider：memory 适合本地开发，chroma 适合持久化和多次复用。
type VectorStoreProvider = 'memory' | 'chroma'

interface VectorStoreRuntimeConfig {
  vectorStoreProvider?: string
  chromaUrl?: string
  chromaCollection?: string
}

interface CreateVectorStoreOptions {
  documentId?: string
  source?: 'user' | 'builtin'
  collectionName?: string
  chromaUrl?: string
}

interface RagVectorStore {
  similaritySearch(query: string, topK: number): Promise<Document[]>
}

// 默认走内存向量库。
const normalizeProvider = (provider?: string): VectorStoreProvider => {
  if (provider === 'chroma' || provider === 'memory') {
    return provider
  }

  return 'memory'
}

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error)
}

// Chroma collection 维度和当前 embedding 维度不一致时的错误。
const isDimensionMismatchError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase()

  return message.includes('dimension mismatch')
    || message.includes('dimensionality')
    || (message.includes('expect') && message.includes('got'))
}

// 对维度不匹配给出更明确的处理提示。
const logDimensionMismatch = (error: unknown) => {
  if (isDimensionMismatchError(error)) {
    console.warn(
      '[rag] chroma collection dimension mismatch, please use a new CHROMA_COLLECTION or clear existing collection',
    )
  }
}

// 创建内存向量库，并在查询时按 documentId/source 做元数据过滤。
const createMemoryVectorStore = async (
  docs: Document[],
  embeddings: EmbeddingsInterface,
  options: CreateVectorStoreOptions,
): Promise<RagVectorStore> => {
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings)

  return {
    similaritySearch(query: string, topK: number) {
      // similaritySearch 可以限制搜索范围
      return store.similaritySearch(
        query,
        topK,
        (doc) => {
          if (options.documentId) {
            return doc.metadata.documentId === options.documentId
          }

          if (options.source) {
            return doc.metadata.source === options.source
          }

          return true
        },
      )
    },
  }
}

// Chroma similaritySearch 使用的 metadata filter。
const createMetadataFilter = (options: CreateVectorStoreOptions): Record<string, string> | undefined => {
  if (options.documentId) {
    return {
      documentId: options.documentId,
    }
  }

  if (options.source) {
    return {
      source: options.source,
    }
  }

  return undefined
}

// 从文档集合中提取唯一 documentId，避免重复写入同一个文档。
const getUniqueDocumentIds = (docs: Document[]) =>
  Array.from(
    new Set(
      docs
        .map((doc) => doc.metadata.documentId)
        .filter((documentId): documentId is string => typeof documentId === 'string' && Boolean(documentId)),
    ),
  )

// 创建或复用 Chroma collection；已有文档不会重复 add。
const createChromaVectorStore = async (
  docs: Document[],
  embeddings: EmbeddingsInterface,
  options: CreateVectorStoreOptions,
): Promise<RagVectorStore> => {
  const store = await Chroma.fromExistingCollection(embeddings, {
    url: options.chromaUrl,
    collectionName: options.collectionName,
  })

  const existingDocumentIds = new Set<string>()
  const documentIds = getUniqueDocumentIds(docs)

  // 先探测文档是否已经入库，避免内置知识库反复索引。
  for (const documentId of documentIds) {
    try {
      const existingDocs = await store.similaritySearch('', 1, {
        documentId,
      })
      // 记录入库id
      if (existingDocs.length > 0) {
        existingDocumentIds.add(documentId)
        const existingInputDoc = docs.find((doc) => doc.metadata.documentId === documentId)

        if (existingInputDoc?.metadata.source === 'builtin') {
          console.log('[rag] builtin document exists:', existingInputDoc.metadata.fileName)
        }
      }
    } catch (error: unknown) {
      logDimensionMismatch(error)
    }
  }
  // 只添加没入库的docs
  const docsToAdd = docs.filter((doc) => !existingDocumentIds.has(doc.metadata.documentId))

  // 用 documentId-chunkIndex 作为稳定 id，便于同一文档多 chunk 存储。
  if (docsToAdd.length > 0) {
    const ids = docsToAdd.map((doc) => `${doc.metadata.documentId}-${doc.metadata.chunkIndex}`)
    await store.addDocuments(docsToAdd, { ids })
  }

  return {
    similaritySearch(query: string, topK: number) {
      return store.similaritySearch(query, topK, createMetadataFilter(options))
    },
  }
}

// 根据 runtimeConfig 创建向量库；Chroma 失败时自动回退到 memory。
export const createVectorStore = async (
  docs: Document[],
  embeddings: EmbeddingsInterface,
  options: CreateVectorStoreOptions,
): Promise<RagVectorStore> => {
  const config = useRuntimeConfig() as unknown as VectorStoreRuntimeConfig
  const provider = normalizeProvider(config.vectorStoreProvider?.trim())

  if (provider === 'chroma') {
    try {
      const vectorStore = await createChromaVectorStore(docs, embeddings, {
        ...options,
        chromaUrl: options.chromaUrl || config.chromaUrl || 'http://localhost:8000',
        collectionName: options.collectionName || config.chromaCollection || 'resume_practice_docs',
      })

      console.log('[rag] vector store provider: chroma')
      console.log('[rag] chroma connected')

      return vectorStore
    } catch (error: unknown) {
      logDimensionMismatch(error)
      console.warn('[rag] chroma vector store failed, fallback to memory', error)
      console.log('[rag] vector store provider: memory fallback')
    }
  } else {
    console.log('[rag] vector store provider: memory')
  }

  return createMemoryVectorStore(docs, embeddings, options)
}
