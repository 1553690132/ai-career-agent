import { Document } from '@langchain/core/documents'
import { createEmbeddingProvider } from '../server/services/rag/embeddingProvider'
import {
  createMarkdownDocumentId,
  splitMarkdownToChunks,
} from '../server/services/rag/mdDocumentService'
import { createVectorStore } from '../server/services/rag/vectorStoreProvider'

type VectorStoreProvider = 'memory' | 'chroma'

interface ScriptRuntimeConfig {
  embeddingProvider: string
  embeddingApiKey: string
  embeddingBaseURL: string
  embeddingModel: string
  vectorStoreProvider: VectorStoreProvider
  chromaUrl: string
  chromaCollection: string
}

const sampleMarkdown = `
# Vue 前端工程化练习资料

## TypeScript 类型设计
在 Vue3 项目中，组件 props、接口响应和业务模型都应该使用明确的 TypeScript 类型。
对于 AI 分析结果这类结构化 JSON，需要先定义稳定的 Result、ScoreCard、Suggestion 等类型，再让页面组件按类型渲染。

## Vue3 组件拆分
复杂页面应拆分为容器组件和展示组件。容器组件负责请求、状态和路由跳转，展示组件通过 props 接收数据。
这样可以降低组件耦合，也便于后续测试和复用。

## 性能优化
前端性能优化可以从首屏资源、组件懒加载、列表渲染、图片压缩、缓存策略和打包体积分析入手。
对于结果页这类报告页面，应避免无意义的重复计算，并尽量减少大体积依赖对首屏的影响。

## RAG 检索
Markdown 文档可以先切分为 chunk，再通过 embedding 写入向量库。检索时根据薄弱技能和差距标题生成 query，
返回最相关的片段给大模型，帮助生成更贴合资料的练习题。
`

const query = 'TypeScript Vue3 组件拆分 性能优化 RAG 检索'

const runtimeConfig: ScriptRuntimeConfig = {
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'local-hash',
  embeddingApiKey: process.env.EMBEDDING_API_KEY || '',
  embeddingBaseURL: process.env.EMBEDDING_BASE_URL || '',
  embeddingModel: process.env.EMBEDDING_MODEL || '',
  vectorStoreProvider: 'memory',
  chromaUrl: process.env.CHROMA_URL || 'http://localhost:8000',
  chromaCollection: process.env.CHROMA_COLLECTION || 'resume_practice_docs',
}

;(globalThis as typeof globalThis & {
  useRuntimeConfig?: () => ScriptRuntimeConfig
}).useRuntimeConfig = () => runtimeConfig

const buildDocs = (chunks: string[], documentId: string) =>
  chunks.map((chunk, index) => new Document({
    pageContent: chunk,
    metadata: {
      documentId,
      fileName: 'sample-rag.md',
      chunkIndex: index,
    },
  }))

const withFallbackDetection = async <T>(task: () => Promise<T>) => {
  const originalWarn = console.warn
  let usedMemoryFallback = false

  console.warn = (...args: unknown[]) => {
    const message = args.map((item) => String(item)).join(' ')

    if (message.includes('chroma vector store failed')) {
      usedMemoryFallback = true
    }

    originalWarn(...args)
  }

  try {
    const result = await task()
    return { result, usedMemoryFallback }
  } finally {
    console.warn = originalWarn
  }
}

const testVectorStore = async (provider: VectorStoreProvider) => {
  console.log(`\n===== RAG vector store test: ${provider} =====`)

  runtimeConfig.vectorStoreProvider = provider

  const chunks = await splitMarkdownToChunks(sampleMarkdown)
  const documentId = createMarkdownDocumentId(sampleMarkdown)
  const docs = buildDocs(chunks, documentId)
  const embeddings = createEmbeddingProvider()

  const { result: vectorStore, usedMemoryFallback } = await withFallbackDetection(() =>
    createVectorStore(docs, embeddings, { documentId }),
  )
  const retrievedDocs = await vectorStore.similaritySearch(query, 4)
  const effectiveProvider = provider === 'chroma' && usedMemoryFallback
    ? 'memory (fallback from chroma)'
    : provider

  console.log('chunks count:', chunks.length)
  console.log('provider:', effectiveProvider)
  console.log('retrieved count:', retrievedDocs.length)

  retrievedDocs.forEach((doc, index) => {
    const preview = doc.pageContent.replace(/\s+/g, ' ').trim().slice(0, 100)
    console.log(`retrieved preview ${index + 1}:`, preview)
  })
}

const main = async () => {
  await testVectorStore('memory')
  await testVectorStore('chroma')
}

main().catch((error: unknown) => {
  console.error('[rag] vector store test failed:', error)
  process.exitCode = 1
})
