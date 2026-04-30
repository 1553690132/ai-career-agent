import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import {
  buildCompactResumeText,
  normalizeResumeSections,
} from './resumeNormalizer'
import {
  extractResumeSections,
} from './resumeSectionExtractor'
import { extractTextFromImage } from './ocrService'

const maxResumeTextLength = 2000
const minCompactResumeRatio = 0.3

type ResumeSectionBlock = {
  label: string
  content: string
}

type Buffer = {
  byteLength: number
  toString(encoding: 'utf-8'): string
  toUint8Array: () => Uint8Array
  toArrayBuffer: () => ArrayBuffer
}

export type ResumeInput =
  | { type: 'text'; text: string }
  | { type: 'txt'; fileBuffer: Buffer }
  | { type: 'pdf'; fileBuffer: Buffer }
  | { type: 'docx'; fileBuffer: Buffer }
  | { type: 'image'; fileBuffer: Buffer; mimeType: string }

export interface NormalizedResumeInput {
  resumeText: string
  source: 'text' | 'txt' | 'pdf' | 'docx' | 'image'
}

const formatResumeSection = ({ label, content }: ResumeSectionBlock) =>
  `【${label}】\n${content.trim()}`

const appendBlockWithinLimit = (
  blocks: string[],
  block: string,
  maxLength: number,
) => {
  const separator = blocks.length > 0 ? '\n\n' : ''
  const remainingLength = maxLength - blocks.join('\n\n').length - separator.length

  if (remainingLength <= 0) {
    return
  }

  if (block.length <= remainingLength) {
    blocks.push(block)
    return
  }

  const truncatedBlock = block.slice(0, remainingLength).trim()

  if (truncatedBlock) {
    blocks.push(truncatedBlock)
  }
}

const truncateCompactResumeText = (
  sections: ReturnType<typeof extractResumeSections>,
  rawResumeText: string,
) => {
  const priorityBlocks: ResumeSectionBlock[] = [
    { label: '基础信息', content: sections.basicInfo },
    { label: '相关技能', content: sections.skills },
    { label: '项目经历', content: sections.projects },
    { label: '教育经历', content: sections.education },
    { label: '工作经历', content: sections.workExperience },
    { label: '学术成果', content: sections.academic },
    { label: '在校经历', content: sections.campusExperience },
    { label: '自我评价', content: sections.selfEvaluation },
  ].filter((block) => block.content.trim())

  const blocks: string[] = []

  priorityBlocks.forEach((block) => {
    appendBlockWithinLimit(blocks, formatResumeSection(block), maxResumeTextLength)
  })

  const truncatedText = blocks.join('\n\n').trim()

  if (truncatedText) {
    return truncatedText
  }

  return rawResumeText.slice(0, maxResumeTextLength).trim()
}

const normalizeResumeText = (text: string, source: NormalizedResumeInput['source']) => {
  const rawResumeText = text.trim()

  if (!rawResumeText) {
    throw new Error('Resume input cannot be empty')
  }

  console.log('[input] resume section extract start')
  const sections = extractResumeSections(rawResumeText)
  console.log('[input] resume section extract success')
  console.log('[input] normalize start')
  const normalizedSections = normalizeResumeSections(sections)
  const compactResumeText = buildCompactResumeText(normalizedSections).trim()
  console.log('[input] normalize success')

  let resumeText =
    !compactResumeText
    || compactResumeText.length < rawResumeText.length * minCompactResumeRatio
      ? rawResumeText
      : compactResumeText

  if (resumeText.length > maxResumeTextLength) {
    resumeText = truncateCompactResumeText(normalizedSections, rawResumeText)
  }

  console.log(`[input] compact length: ${resumeText.length}`)

  if (!resumeText) {
    throw new Error('Resume input cannot be empty after section extraction')
  }

  return {
    resumeText,
    source,
  }
}

export const normalizeResumeInput = async (
  input: ResumeInput,
): Promise<NormalizedResumeInput> => {
  if (input.type === 'text') {
    return normalizeResumeText(input.text, 'text')
  }

  if (input.type === 'txt') {
    console.log('[input] txt parse start')
    const text = input.fileBuffer.toString('utf-8')
    const normalizedInput = normalizeResumeText(text, 'txt')
    console.log('[input] txt parse success')

    return normalizedInput
  }

  if (input.type === 'pdf') {
    console.log('[input] pdf parse start')

    let parser: PDFParse | undefined

    try {
      parser = new PDFParse({ data: input.fileBuffer.toUint8Array() })
      const data = await parser.getText()
      const normalizedInput = normalizeResumeText(data.text, 'pdf')
      console.log('[input] pdf parse success')

      return normalizedInput
    } catch (error) {
      console.warn('[input] pdf parse fail', error)
      throw new Error('PDF resume input could not be parsed')
    } finally {
      await parser?.destroy()
    }
  }

  if (input.type === 'docx') {
    console.log('[input] docx parse start')

    try {
      const data = await mammoth.extractRawText({
        arrayBuffer: input.fileBuffer.toArrayBuffer(),
      })
      const normalizedInput = normalizeResumeText(data.value, 'docx')
      console.log('[input] docx parse success')

      return normalizedInput
    } catch (error) {
      console.warn('[input] docx parse fail', error)
      throw new Error('DOCX resume input could not be parsed')
    }
  }

  if (input.type === 'image') {
    try {
      const text = await extractTextFromImage(input.fileBuffer, input.mimeType)
      const normalizedInput = normalizeResumeText(text, 'image')

      return normalizedInput
    } catch (error) {
      throw new Error('Image resume input could not be recognized')
    }
  }

  throw new Error('Unsupported resume input type')
}
