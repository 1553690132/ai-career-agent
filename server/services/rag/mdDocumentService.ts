import { createHash } from 'node:crypto'
import { Document } from '@langchain/core/documents'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { createEmbeddingProvider } from './embeddingProvider'
import { createVectorStore } from './vectorStoreProvider'

const maxMarkdownLength = 50000

interface RetrieveRelevantChunksOptions {
  fileName?: string
  documentId?: string
  source?: 'user' | 'builtin'
}

const splitQueryPart = (value: string) =>
  value
    .split(/[\s,，、;；|]+/)
    .map((keyword) => keyword.trim().toLowerCase())
    .filter(Boolean)

const retrieveByKeywords = (
  chunks: string[],
  query: string,
  topK = 4,
): string[] => {
  const [weakSkillQuery = '', gapTitleQuery = ''] = query.split('\n')
  const weakSkillKeywords = splitQueryPart(weakSkillQuery)
  const gapTitleKeywords = splitQueryPart(gapTitleQuery)

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

export const createMarkdownDocumentId = (markdownText: string) =>
  createHash('sha256').update(markdownText).digest('hex')

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

export const splitMarkdownToChunks = async (markdownText: string): Promise<string[]> => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 100,
  })

  return (await splitter.splitText(markdownText))
    .map((chunk) => chunk.trim())
    .filter(Boolean)
}

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

  return retrieveByKeywords(chunks, query, topK)
}
