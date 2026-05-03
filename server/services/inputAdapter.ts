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

export type ResumeInput = CommonInput

const maxResumeTextLength = 2000
const minCompactResumeRatio = 0.3

export interface NormalizedResumeInput {
  resumeText: string
  source: CommonInputSource
}

export const normalizeResumeInput = async (
  input: ResumeInput,
): Promise<NormalizedResumeInput> => {
  const { rawText: rawResumeText, source } = await normalizeCommonInput(input)

  console.log('[input] resume section extract start')
  const sections = extractResumeSections(rawResumeText)
  console.log('[input] resume section extract success')

  console.log('[input] normalize start')
  const normalizedSections = normalizeResumeSections(sections)
  const compactResumeText = buildCompactResumeText(normalizedSections).trim()
  console.log('[input] normalize success')
  console.log(`[input] compact length: ${compactResumeText.length}`)

  let finalResumeText = compactResumeText
  if (!compactResumeText || compactResumeText.length < rawResumeText.length * minCompactResumeRatio) {
    console.log('[input] compact ratio too low or empty, falling back to raw text')
    finalResumeText = rawResumeText.slice(0, maxResumeTextLength).trim()
  }

  return {
    resumeText: finalResumeText,
    source,
  }
}
