import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { extractTextFromImage } from './ocrService'

const maxCommonTextLength = 3000

type Buffer = {
  byteLength: number
  toString(encoding: 'utf-8'): string
  toUint8Array: () => Uint8Array
  toArrayBuffer: () => ArrayBuffer
}

export type CommonInputSource = 'text' | 'txt' | 'pdf' | 'docx' | 'image'

export type CommonInput =
  | { type: 'text'; text: string }
  | { type: 'txt'; fileBuffer: Buffer }
  | { type: 'pdf'; fileBuffer: Buffer }
  | { type: 'docx'; fileBuffer: Buffer }
  | { type: 'image'; fileBuffer: Buffer; mimeType: string }

export interface NormalizedCommonInput {
  rawText: string
  source: CommonInputSource
}

const cleanText = (text: string) =>
  text
    .replace(/[^\S\r\n]+/g, ' ') // 替换连续空格（保留换行）
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxCommonTextLength)

const parsePdf = async (fileBuffer: Buffer) => {
  let parser: PDFParse | undefined

  try {
    parser = new PDFParse({ data: fileBuffer.toUint8Array() })
    const data = await parser.getText()

    return data.text
  } finally {
    await parser?.destroy()
  }
}

const parseDocx = async (fileBuffer: Buffer) => {
  const data = await mammoth.extractRawText({
    arrayBuffer: fileBuffer.toArrayBuffer(),
  })

  return data.value
}

export const normalizeCommonInput = async (
  input: CommonInput,
): Promise<NormalizedCommonInput> => {
  console.log('[input-common] parse start')

  try {
    const rawInputText = await (async () => {
      if (input.type === 'text') {
        return input.text
      }

      if (input.type === 'txt') {
        return input.fileBuffer.toString('utf-8')
      }

      if (input.type === 'pdf') {
        return await parsePdf(input.fileBuffer)
      }

      if (input.type === 'docx') {
        return await parseDocx(input.fileBuffer)
      }

      return await extractTextFromImage(input.fileBuffer, input.mimeType)
    })()

    const rawText = cleanText(rawInputText)

    if (!rawText) {
      throw new Error('Input text cannot be empty')
    }

    console.log(`[input-common] parse success length: ${rawText.length}`)

    return {
      rawText,
      source: input.type,
    }
  } catch (error) {
    console.warn('[input-common] parse fail', error)
    throw error
  }
}
