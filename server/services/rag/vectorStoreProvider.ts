import { Document } from '@langchain/core/documents'
import type { EmbeddingsInterface } from '@langchain/core/embeddings'
import { Chroma } from '@langchain/community/vectorstores/chroma'
import { MemoryVectorStore } from '@langchain/classic/vectorstores/memory'

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

const isDimensionMismatchError = (error: unknown) => {
  const message = getErrorMessage(error).toLowerCase()

  return message.includes('dimension mismatch')
    || message.includes('dimensionality')
    || (message.includes('expect') && message.includes('got'))
}

const logDimensionMismatch = (error: unknown) => {
  if (isDimensionMismatchError(error)) {
    console.warn(
      '[rag] chroma collection dimension mismatch, please use a new CHROMA_COLLECTION or clear existing collection',
    )
  }
}

const createMemoryVectorStore = async (
  docs: Document[],
  embeddings: EmbeddingsInterface,
  options: CreateVectorStoreOptions,
): Promise<RagVectorStore> => {
  const store = await MemoryVectorStore.fromDocuments(docs, embeddings)

  return {
    similaritySearch(query: string, topK: number) {
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

const getUniqueDocumentIds = (docs: Document[]) =>
  Array.from(
    new Set(
      docs
        .map((doc) => doc.metadata.documentId)
        .filter((documentId): documentId is string => typeof documentId === 'string' && Boolean(documentId)),
    ),
  )

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

  for (const documentId of documentIds) {
    try {
      const existingDocs = await store.similaritySearch('', 1, {
        documentId,
      })

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

  const docsToAdd = docs.filter((doc) => !existingDocumentIds.has(doc.metadata.documentId))

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
