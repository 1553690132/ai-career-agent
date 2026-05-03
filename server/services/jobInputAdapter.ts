import {
  normalizeCommonInput,
  type CommonInput,
  type CommonInputSource,
} from './inputCommonAdapter'

const maxJobTextLength = 2000

export interface NormalizedJobInput {
  jobText: string
  source: CommonInputSource
}

export const cleanJobText = (text: string) =>
  text
    .replace(/[^\S\r\n]+/g, ' ') // 替换多余连续空格，保留列表结构
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxJobTextLength)

export const normalizeJobInput = async (
  input: CommonInput,
): Promise<NormalizedJobInput> => {
  console.log('[input-job] normalize start')
  const { rawText: rawJobText, source } = await normalizeCommonInput(input)
  const jobText = cleanJobText(rawJobText)

  if (!jobText) {
    throw new Error('Job input cannot be empty')
  }

  console.log(`[input-job] normalize success length: ${jobText.length}`)

  return {
    jobText,
    source,
  }
}
