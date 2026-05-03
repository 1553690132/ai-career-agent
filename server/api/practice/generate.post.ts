import {
  createFallbackPracticeSet,
  extractWeakSkills,
  practiceQuestionChain,
} from '../../chains/practiceQuestionChain'
import {
  createMarkdownDocumentId,
  parseMarkdownFile,
  retrieveRelevantChunks,
  splitMarkdownToChunks,
} from '../../services/rag/mdDocumentService'
import { retrieveFromBuiltinKnowledge } from '../../services/rag/builtinKnowledgeService'
import { createFallbackMetrics, logChainMetrics } from '../../utils/chainMetrics'
import { getErrorMessage } from '../../utils/json'
import type { AnalysisResult, PracticeSet } from '../../../types/analysis'

interface UploadedMdFile {
  name?: string
  mimeType?: string
  bytes?: number[]
}

interface PracticeGenerateRequestBody {
  analysisResult?: AnalysisResult
  roleType?: string
  mdFile?: UploadedMdFile
}

const isAnalysisResultLike = (value: unknown): value is AnalysisResult => {
  if (!value || typeof value !== 'object') {
    return false
  }

  const data = value as Partial<AnalysisResult>

  return Array.isArray(data.gaps)
    && Array.isArray(data.skillMatches)
    && Array.isArray(data.resumeSuggestions)
    && Array.isArray(data.interviewQuestions)
}

const hasUploadedMdFile = (file?: UploadedMdFile) =>
  Array.isArray(file?.bytes) && file.bytes.length > 0

const createFileBuffer = (fileBytes: number[]) => Buffer.from(Uint8Array.from(fileBytes))

const validateMdFile = (file?: UploadedMdFile) => {
  if (!hasUploadedMdFile(file)) {
    return
  }

  const fileName = file?.name?.trim().toLowerCase() ?? ''

  if (!fileName.endsWith('.md')) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid markdown file',
      data: {
        errors: ['mdFile must be a .md file'],
      },
    })
  }
}

const createPracticeQuery = (analysisResult: AnalysisResult) => {
  const weakSkills = extractWeakSkills(analysisResult)
  const gapTitles = analysisResult.gaps.map((gap) => gap.title).filter(Boolean)

  return `${weakSkills.join(' ')}\n${gapTitles.join(' ')}`
}

export default defineEventHandler(async (event): Promise<PracticeSet> => {
  const body = await readBody<PracticeGenerateRequestBody>(event)
  const analysisResult = body.analysisResult
  const roleType = body.roleType?.trim() || analysisResult?.job?.title || 'unknown'

  if (!isAnalysisResultLike(analysisResult)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid practice generate request',
      data: {
        errors: ['analysisResult is required'],
      },
    })
  }

  validateMdFile(body.mdFile)

  const retrievedContext = await (async () => {
    const query = createPracticeQuery(analysisResult)

    if (!hasUploadedMdFile(body.mdFile)) {
      const builtinChunks = await retrieveFromBuiltinKnowledge(query, 4)

      console.log('[rag] query:', query)
      console.log('[rag] retrieve source: builtin')
      console.log('[rag] retrieved count:', builtinChunks.length)
      builtinChunks.slice(0, 2).forEach((chunk, index) => {
        console.log(`[rag] retrieved preview ${index + 1}:`, chunk.slice(0, 100))
      })

      return builtinChunks
    }

    const markdownText = parseMarkdownFile(createFileBuffer(body.mdFile?.bytes ?? []))
    const chunks = await splitMarkdownToChunks(markdownText)
    const retrievedChunks = await retrieveRelevantChunks(chunks, query, 4, {
      documentId: createMarkdownDocumentId(markdownText),
      fileName: body.mdFile?.name ?? '',
      source: 'user',
    })
    const builtinChunks = retrievedChunks.length < 4
      ? await retrieveFromBuiltinKnowledge(query, 4 - retrievedChunks.length)
      : []
    const mergedChunks = [...retrievedChunks, ...builtinChunks]

    console.log('[rag] query:', query)
    console.log('[rag] chunks count:', chunks.length)
    console.log('[rag] retrieve source:', builtinChunks.length > 0 ? 'mixed' : 'user')
    console.log('[rag] retrieved count:', mergedChunks.length)
    mergedChunks.slice(0, 2).forEach((chunk, index) => {
      console.log(`[rag] retrieved preview ${index + 1}:`, chunk.slice(0, 100))
    })

    return mergedChunks
  })()

  try {
    return await practiceQuestionChain.invoke({
      analysisResult,
      roleType,
      retrievedContext,
    })
  } catch (error: unknown) {
    console.warn(
      `[practice_question] fallback used after generation failure: ${getErrorMessage(error)}`,
    )
    logChainMetrics(createFallbackMetrics('practice_question', undefined))

    return createFallbackPracticeSet(analysisResult, roleType)
  }
})
