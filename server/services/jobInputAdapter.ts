import {
  normalizeCommonInput,
  type CommonInput,
  type CommonInputSource,
} from './inputCommonAdapter'

// 最终进入岗位抽取 chain 的 JD 文本长度上限。
const maxJobTextLength = 2000

export interface NormalizedJobInput {
  jobText: string
  source: CommonInputSource
}

// 清理 JD 中多余空白并截断，保留列表换行结构。
export const cleanJobText = (text: string) =>
  text
    .replace(/[^\S\r\n]+/g, ' ') // 替换多余连续空格，保留列表结构
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxJobTextLength)

// JD 输入适配器：复用公共解析器，再做岗位文本专用清洗。
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
