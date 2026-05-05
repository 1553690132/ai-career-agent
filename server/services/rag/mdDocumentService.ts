import { createHash } from 'node:crypto'
import { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { createEmbeddingProvider } from './embeddingProvider'
import { createVectorStore } from './vectorStoreProvider'
// 用户上传md文件处理策略.
// 用户上传 Markdown 的最大长度，避免一次 RAG 请求占用过多内存和 token。
const maxMarkdownLength = 50000

interface RetrieveRelevantChunksOptions {
  fileName?: string
  documentId?: string
  source?: 'user' | 'builtin'
}

// 将 query 拆成关键词，作为向量检索失败时的本地兜底策略。
const splitQueryPart = (value: string) =>
  value
    .split(/[\s,，、;；|]+/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)

// 关键词检索兜底：弱项关键词权重更高，gap 标题关键词作为补充。
const retrieveByKeywords = (
  chunks: string[],
  query: string,
  topK = 4,
): string[] => {
  const [weakSkillQuery = '', gapTitleQuery = ''] = query.split('\n')
  const weakSkillKeywords = splitQueryPart(weakSkillQuery)
  const gapTitleKeywords = splitQueryPart(gapTitleQuery)

  // 给每个 chunk 计算简单命中分，分数相同则保留原文顺序。
  const scoredChunks = chunks.map((chunk, index) => {
    const normalizedChunk = chunk.toLowerCase()
    const weakSkillScore = weakSkillKeywords.reduce(
      (total, keyword) => total + (normalizedChunk.includes(keyword) ? 2 : 0),
      0,
    )
    const gapTitleScore = gapTitleKeywords.reduce(
      (total, keyword) => total + (normalizedChunk.includes(keyword) ? 1 : 0),
      0,
    )

    return {
      chunk,
      index,
      score: weakSkillScore + gapTitleScore,
    }
  })

  const matchedChunks = scoredChunks
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, topK)
    .map((item) => item.chunk)

  if (matchedChunks.length > 0) {
    return matchedChunks
  }

  return chunks.slice(0, Math.min(2, chunks.length))
}

// 用内容 hash 作为文档 ID，避免同一份资料重复入库。
export const createMarkdownDocumentId = (markdownText: string) =>
  createHash('sha256').update(markdownText).digest('hex')

// 解析 Markdown 文件内容，并做空文件和长度限制校验。
export const parseMarkdownFile = (fileBuffer: Buffer): string => {
  const markdownText = fileBuffer.toString('utf-8').trim()

  if (!markdownText) {
    throw new Error('Markdown document is empty')
  }

  if (markdownText.length > maxMarkdownLength) {
    throw new Error(`Markdown document must be at most ${maxMarkdownLength} characters`)
  }

  return markdownText
}

// 使用 LangChain 文本切分器把 Markdown 切成带 overlap 的片段。
export const splitMarkdownToChunks = async (markdownText: string): Promise<string[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  })

  return (await splitter.splitText(markdownText))
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

// 从用户或内置 Markdown chunks 中检索与弱项 query 最相关的片段。
export const retrieveRelevantChunks = async (
  chunks: string[],
  query: string,
  topK = 4,
  options: RetrieveRelevantChunksOptions = {},
): Promise<string[]> => {
  if (!chunks.length) {
    return []
  }

  if (!query.trim()) {
    return retrieveByKeywords(chunks, query, topK)
  }

  // 每个 chunk 都带上 documentId/source/fileName，方便向量库按来源过滤。
  const documentId = options.documentId ?? createMarkdownDocumentId(chunks.join('\n'))
  const docs = chunks.map((chunk, index) => new Document({
    pageContent: chunk,
    metadata: {
      documentId,
      fileName: options.fileName ?? '',
      source: options.source ?? 'user',
      chunkIndex: index,
    },
  }))

  try {
    // 优先走 embedding + vector store 检索。
    const embeddings = createEmbeddingProvider()
    const vectorStore = await createVectorStore(docs, embeddings, {
      documentId,
      source: options.source ?? 'user',
    })
    const vectorMatches = await vectorStore.similaritySearch(query, topK)

    if (vectorMatches.length > 0) {
      return vectorMatches.map((doc) => doc.pageContent)
    }
  } catch (error: unknown) {
    console.warn('[rag] vector retrieve failed, fallback to keyword retrieve', error)
  }

  // 向量检索失败时退回关键词检索，保证练习题生成仍有上下文。
  return retrieveByKeywords(chunks, query, topK)
}
