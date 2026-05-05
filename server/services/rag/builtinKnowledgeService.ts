import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Document } from '@langchain/core/documents'
import { createEmbeddingProvider } from './embeddingProvider'
import { createMarkdownDocumentId, splitMarkdownToChunks } from './mdDocumentService'
import { createVectorStore } from './vectorStoreProvider'
// 内置知识库切块,存向量数据库处理.
interface BuiltinKnowledgeDoc {
  fileName: string
  content: string
}

interface BuiltinChunkState {
  docs: Document[]
  chunks: string[]
}

// 内置知识库目录：练习题默认从这些 Markdown 中检索上下文。
const knowledgeDir = join(process.cwd(), 'server', 'knowledge')

// 记录已经写入向量库的文档，避免重复索引。
const indexedDocumentIds = new Set<string>()

// 内置知识库切块结果缓存，避免每次出题都重新读文件和切块。
let builtinChunkState: BuiltinChunkState | null = null

// 索引中的 promise 复用，避免并发请求重复索引同一批文档。
let indexingPromise: Promise<void> | null = null

// 读取内置 Markdown 并切块成 LangChain Document。
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

// 从 server/knowledge 读取所有非空 Markdown 文档。
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

// 将内置知识库索引到当前向量库；memory/chroma 由 createVectorStore 决定。
export const indexBuiltinKnowledgeIfNeeded = async (): Promise<void> => {
  if (indexingPromise) {
    return indexingPromise
  }

  indexingPromise = (async () => {
    console.log('[rag] builtin knowledge indexing start')

    const { docs } = await loadBuiltinChunks()
    // 只索引本进程尚未处理过的文档。
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

// 从内置知识库检索相关片段；向量检索失败时返回前几个 chunk 兜底。
export const retrieveFromBuiltinKnowledge = async (
  query: string,
  topK = 4,
): Promise<string[]> => {
  // 文档切块.
  const { docs, chunks } = await loadBuiltinChunks()

  if (!docs.length) {
    return []
  }

  try {
    await indexBuiltinKnowledgeIfNeeded()

    const embeddings = createEmbeddingProvider()
    const vectorStore = await createVectorStore(docs, embeddings, { source: 'builtin' }) // builtin只搜索内置知识库
    const matches = await vectorStore.similaritySearch(query, topK)

    if (matches.length > 0) {
      return matches.map((doc) => doc.pageContent)
    }
  } catch (error: unknown) {
    console.warn('[rag] builtin retrieve failed, fallback to first builtin chunks', error)
  }

  return chunks.slice(0, Math.min(topK, chunks.length))
}
