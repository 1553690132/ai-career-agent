import {
  normalizeCommonInput,
  type CommonInput,
  type CommonInputSource,
} from './inputCommonAdapter'
import {
  buildCompactResumeText,
  normalizeResumeSections,
} from './resumeNormalizer'
import { extractResumeSections } from './resumeSectionExtractor'
// 简历输入的处理逻辑
export type ResumeInput = CommonInput

// 最终进入简历抽取 chain 的文本长度上限。
const maxResumeTextLength = 2000

// 压缩结果过短时说明分段可能失败，回退到原始文本更稳。
const minCompactResumeRatio = 0.3

export interface NormalizedResumeInput {
  resumeText: string
  source: CommonInputSource
}

// 简历输入适配器：解析文件/文本、识别简历区块、清洗压缩成 LLM 输入。
export const normalizeResumeInput = async (
  input: ResumeInput,
): Promise<NormalizedResumeInput> => {
  const { rawText: rawResumeText, source } = await normalizeCommonInput(input)

  console.log('[input] resume section extract start')
  // 先按标题把简历拆成教育、技能、项目等区块。
  const sections = extractResumeSections(rawResumeText)
  console.log('[input] resume section extract success')

  console.log('[input] normalize start')
  // 再按区块做清洗和长度截断，减少 token 压力。
  const normalizedSections = normalizeResumeSections(sections)
  const compactResumeText = buildCompactResumeText(normalizedSections).trim()
  console.log('[input] normalize success')
  console.log(`[input] compact length: ${compactResumeText.length}`)

  let finalResumeText = compactResumeText
  // 如果压缩文本太短，说明标题识别可能不准，回退到原始文本前 2000 字。
  if (!compactResumeText || compactResumeText.length < rawResumeText.length * minCompactResumeRatio) {
    console.log('[input] compact ratio too low or empty, falling back to raw text')
    finalResumeText = rawResumeText.slice(0, maxResumeTextLength).trim()
  }

  return {
    resumeText: finalResumeText,
    source,
  }
}
