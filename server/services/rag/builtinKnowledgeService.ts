import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Document } from '@langchain/core/documents'
import { createEmbeddingProvider } from './embeddingProvider'
import { createMarkdownDocumentId, splitMarkdownToChunks } from './mdDocumentService'
import { createVectorStore } from './vectorStoreProvider'

interface BuiltinKnowledgeDoc {
  fileName: string
  content: string
}

interface BuiltinChunkState {
  docs: Document[]
  chunks: string[]
}

const knowledgeDir = join(process.cwd(), 'server', 'knowledge')
const indexedDocumentIds = new Set<string>()

let builtinChunkState: BuiltinChunkState | null = null
let indexingPromise: Promise<void> | null = null

const loadBuiltinChunks = async (): Promise<BuiltinChunkState> => {
  if (builtinChunkState) {
    return builtinChunkState
  }

  const knowledgeDocs = await loadBuiltinKnowledgeDocs()
  const docs: Document[] = []
  const chunks: string[] = []

  for (const knowledgeDoc of knowledgeDocs) {
    const documentId = createMarkdownDocumentId(knowledgeDoc.content)
    const documentChunks = await splitMarkdownToChunks(knowledgeDoc.content)

    documentChunks.forEach((chunk, index) => {
      chunks.push(chunk)
      docs.push(new Document({
        pageContent: chunk,
        metadata: {
          source: 'builtin',
          fileName: knowledgeDoc.fileName,
          chunkIndex: index,
          documentId,
        },
      }))
    })
  }

  builtinChunkState = {
    docs,
    chunks,
  }

  return builtinChunkState
}

export const loadBuiltinKnowledgeDocs = async (): Promise<BuiltinKnowledgeDoc[]> => {
  const fileNames = (await readdir(knowledgeDir))
    .filter((fileName) => fileName.toLowerCase().endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))

  const docs = await Promise.all(
    fileNames.map(async (fileName) => {
      const content = (await readFile(join(knowledgeDir, fileName), 'utf-8')).trim()

      return {
        fileName,
        content,
      }
    }),
  )

  return docs.filter((doc) => doc.content)
}

export const indexBuiltinKnowledgeIfNeeded = async (): Promise<void> => {
  if (indexingPromise) {
    return indexingPromise
  }

  indexingPromise = (async () => {
    console.log('[rag] builtin knowledge indexing start')

    const { docs } = await loadBuiltinChunks()
    const nextDocs = docs.filter((doc) => {
      const documentId = String(doc.metadata.documentId ?? '')

      if (indexedDocumentIds.has(documentId)) {
        console.log('[rag] builtin document exists:', doc.metadata.fileName)
        return false
      }

      return true
    })

    if (!nextDocs.length) {
      return
    }

    const embeddings = createEmbeddingProvider()
    await createVectorStore(nextDocs, embeddings, { source: 'builtin' })

    nextDocs.forEach((doc) => {
      indexedDocumentIds.add(String(doc.metadata.documentId ?? ''))
    })

    console.log('[rag] builtin indexed chunks:', nextDocs.length)
  })().finally(() => {
    indexingPromise = null
  })

  return indexingPromise
}

export const retrieveFromBuiltinKnowledge = async (
  query: string,
  topK = 4,
): Promise<string[]> => {
  const { docs, chunks } = await loadBuiltinChunks()

  if (!docs.length) {
    return []
  }

  try {
    await indexBuiltinKnowledgeIfNeeded()

    const embeddings = createEmbeddingProvider()
    const vectorStore = await createVectorStore(docs, embeddings, { source: 'builtin' })
    const matches = await vectorStore.similaritySearch(query, topK)

    if (matches.length > 0) {
      return matches.map((doc) => doc.pageContent)
    }
  } catch (error: unknown) {
    console.warn('[rag] builtin retrieve failed, fallback to first builtin chunks', error)
  }

  return chunks.slice(0, Math.min(topK, chunks.length))
}
