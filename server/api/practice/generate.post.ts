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

// 用户上传的 Markdown 学习资料
interface UploadedMdFile {
  name?: string
  mimeType?: string
  bytes?: number[]
}

// 练习题生成请求：analysisResult 必填，mdFile 可选；有 mdFile 时启用用户资料 RAG。
interface PracticeGenerateRequestBody {
  analysisResult?: AnalysisResult
  roleType?: string
  mdFile?: UploadedMdFile
}

// 运行时校验。
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

// Markdown 解析需要 Buffer，这里从 JSON bytes 恢复。
const createFileBuffer = (fileBytes: number[]) => Buffer.from(Uint8Array.from(fileBytes))

// 当前只允许 .md 文件作为用户资料，避免把未知格式交给 Markdown 切分逻辑。
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

// 用分析结果里的弱项和 gap 标题生成检索 query。
const createPracticeQuery = (analysisResult: AnalysisResult) => {
  const weakSkills = extractWeakSkills(analysisResult)
  const gapTitles = analysisResult.gaps.map((gap) => gap.title).filter(Boolean)

  return `${weakSkills.join(' ')}\n${gapTitles.join(' ')}`
}

// 练习题生成入口：基于分析结果抽取弱项，并结合 RAG 上下文生成 PracticeSet。
export default defineEventHandler(async (event): Promise<PracticeSet> => {
  const body = await readBody<PracticeGenerateRequestBody>(event)
  const analysisResult = body.analysisResult
  const roleType = body.roleType?.trim() || analysisResult?.job?.title || 'unknown'

  // 没有分析结果就无法知道弱项，也就无法生成有针对性的练习题。
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

  // 检索练习题生成所需上下文：默认用内置知识库，有 mdFile 时优先检索用户资料。
  const retrievedContext = await (async () => {
    const query = createPracticeQuery(analysisResult)

    if (!hasUploadedMdFile(body.mdFile)) {
      // 本地知识库模式,此时用户未上传md.
      const builtinChunks = await retrieveFromBuiltinKnowledge(query, 4)

      console.log('[rag] query:', query)
      console.log('[rag] retrieve source: builtin')
      console.log('[rag] retrieved count:', builtinChunks.length)
      builtinChunks.slice(0, 2).forEach((chunk, index) => {
        console.log(`[rag] retrieved preview ${index + 1}:`, chunk.slice(0, 100))
      })

      return builtinChunks
    }

    // RAG 增强模式：解析用户 Markdown，切块后进行向量/关键词检索。
    const markdownText = parseMarkdownFile(createFileBuffer(body.mdFile?.bytes ?? []))
    const chunks = await splitMarkdownToChunks(markdownText)
    const retrievedChunks = await retrieveRelevantChunks(chunks, query, 4, {
      documentId: createMarkdownDocumentId(markdownText),
      fileName: body.mdFile?.name ?? '',
      source: 'user',
    })
    // 用户资料召回不足时，用内置知识库补齐上下文数量。
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
    // 把分析结果、岗位类型和检索上下文交给出题 chain。
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

    // 出题失败时用本地规则基于弱项生成 fallback 题集。
    return createFallbackPracticeSet(analysisResult, roleType)
  }
})
