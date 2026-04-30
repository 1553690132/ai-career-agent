import { createWorker } from 'tesseract.js'

const supportedImageMimeTypes = ['image/jpeg', 'image/png', 'image/webp']
const maxImageSize = 3 * 1024 * 1024
const maxOcrTextLength = 2000
const minOcrTextLength = 20

type Buffer = {
  byteLength: number
  toUint8Array: () => Uint8Array
}

let workerPromise: ReturnType<typeof createWorker> | null = null
let isOcrBusy = false

const getWorker = () => {
  if (!workerPromise) {
    workerPromise = createWorker('chi_sim+eng').catch((error) => {
      workerPromise = null
      throw error
    })
  }

  return workerPromise
}

export const cleanText = (text: string) =>
  text
    .replace(/[^\p{Script=Han}A-Za-z0-9\s]/gu, ' ')
    .replace(/[ \t\u00a0]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()
    .slice(0, maxOcrTextLength)

export const extractTextFromImage = async (
  fileBuffer: Buffer,
  mimeType: string,
): Promise<string> => {
  console.log('[input] OCR start')

  try {
    if (isOcrBusy) {
      throw new Error('OCR busy')
    }

    isOcrBusy = true

    if (!supportedImageMimeTypes.includes(mimeType)) {
      throw new Error('Unsupported image mime type')
    }

    if (fileBuffer.byteLength > maxImageSize) {
      throw new Error('Image resume input must be at most 3MB')
    }

    const worker = await getWorker()
    const result = await worker.recognize(fileBuffer.toUint8Array())
    const text = cleanText(result.data.text)

    if (text.length < minOcrTextLength) {
      throw new Error('OCR result is too short')
    }

    console.log(`[input] OCR success length: ${text.length}`)

    return text
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'Unknown OCR error'
    console.warn(`[input] OCR fail reason: ${reason}`)
    throw error
  } finally {
    isOcrBusy = false
  }
}
