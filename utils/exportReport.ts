import type { AnalysisResult } from '../types/analysis'

// 将任意值安全转成字符串，避免导出报告时出现 null/undefined。
const safeText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

// 将可选数组统一收敛为数组，减少后续导出逻辑里的空值判断。
const safeArray = <T>(value: T[] | undefined): T[] => {
  return Array.isArray(value) ? value : []
}

// 把字符串数组转换成 Markdown 列表。
const toBulletList = (items: string[] | undefined): string => {
  const values = safeArray(items).map((item) => safeText(item)).filter(Boolean)

  if (values.length === 0) {
    return '- '
  }

  return values.map((item) => `- ${item}`).join('\n')
}

// 生成 Markdown 二级标题区块。
const section = (title: string, content: string): string => {
  return `\n## ${title}\n\n${content || ''}\n`
}

// 将 AnalysisResult 拼装成完整 Markdown 报告文本。
export function buildReportMarkdown(result: AnalysisResult): string {
  // 评分卡区块：展示每个维度的分数和摘要。
  const scoreCards = safeArray(result.scoreCards)
    .map((card, index) => {
      return [
        `### ${index + 1}. ${safeText(card.label)}`,
        `- 分数：${safeText(card.score)}`,
        `- 总结：${safeText(card.summary)}`,
      ].join('\n')
    })
    .join('\n\n')

  // 技能匹配区块：展示技能分类、匹配等级、分数和证据。
  const skillMatches = safeArray(result.skillMatches)
    .map((skill, index) => {
      return [
        `### ${index + 1}. ${safeText(skill.skillName)}`,
        `- 分类：${safeText(skill.category)}`,
        `- 匹配程度：${safeText(skill.matchLevel)}`,
        `- 分数：${safeText(skill.score)}`,
        `- 简历依据：${safeText(skill.resumeEvidence)}`,
        `- 岗位要求：${safeText(skill.jobRequirement)}`,
      ].join('\n')
    })
    .join('\n\n')

  // 差距分析区块：展示优先级、问题描述、建议和相关技能。
  const gaps = safeArray(result.gaps)
    .map((gap, index) => {
      return [
        `### ${index + 1}. ${safeText(gap.title)}`,
        `- 优先级：${safeText(gap.priority)}`,
        `- 问题描述：${safeText(gap.description)}`,
        `- 改进建议：${safeText(gap.improvementAdvice)}`,
        `- 相关技能：${safeArray(gap.relatedSkills).map(safeText).filter(Boolean).join('、')}`,
      ].join('\n')
    })
    .join('\n\n')

  // 简历建议区块：展示问题、优化建议、示例改写和关键词。
  const resumeSuggestions = safeArray(result.resumeSuggestions)
    .map((suggestion, index) => {
      return [
        `### ${index + 1}. ${safeText(suggestion.title)}`,
        `- 类型：${safeText(suggestion.type)}`,
        `- 优先级：${safeText(suggestion.priority)}`,
        `- 当前问题：${safeText(suggestion.problem)}`,
        `- 优化建议：${safeText(suggestion.suggestion)}`,
        `- 改写示例：${safeText(suggestion.exampleRewrite)}`,
        `- 相关关键词：${safeArray(suggestion.relatedKeywords).map(safeText).filter(Boolean).join('、')}`,
      ].join('\n')
    })
    .join('\n\n')

  // 面试题区块：展示预测题、考察意图和建议答题点。
  const interviewQuestions = safeArray(result.interviewQuestions)
    .map((question, index) => {
      return [
        `### ${index + 1}. ${safeText(question.question)}`,
        `- 类型：${safeText(question.type)}`,
        `- 难度：${safeText(question.difficulty)}`,
        `- 考察意图：${safeText(question.intent)}`,
        `- 相关技能：${safeArray(question.relatedSkills).map(safeText).filter(Boolean).join('、')}`,
        `- 回答要点：${safeArray(question.suggestedAnswerPoints).map(safeText).filter(Boolean).join('、')}`,
      ].join('\n')
    })
    .join('\n\n')

  const generatedAt = safeText(result.generatedAt || new Date().toISOString())

  // 合并所有章节，并压缩多余空行，保证导出的 Markdown 更干净。
  return [
    '# AI 求职匹配分析报告',
    '',
    `- 总分：${safeText(result.overallScore)}%`,
    `- 推荐结论：${safeText(result.recommendation)}`,
    `- 生成时间：${generatedAt}`,
    section('整体总结', safeText(result.overallSummary)),
    section('评分卡', scoreCards),
    section('技能匹配', skillMatches),
    section('核心优势', toBulletList(result.strengths)),
    section('差距分析', gaps),
    section('简历优化建议', resumeSuggestions),
    section('面试题预测', interviewQuestions),
  ]
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .concat('\n')
}

// 在浏览器端触发 Markdown 文件下载。
export function downloadMarkdown(result: AnalysisResult): void {
  if (typeof window === 'undefined') {
    return
  }

  const markdown = buildReportMarkdown(result)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'resume-analysis-report.md'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// 分析推荐枚举到 PDF 展示文案的映射。
const recommendationTextMap: Record<AnalysisResult['recommendation'], string> = {
  highly_recommended: '强匹配候选人',
  recommended: '良好匹配候选人',
  borderline: '具备潜力候选人',
  not_recommended: '匹配度较低',
}

// jsPDF 类型需要动态 import 推导，避免把 PDF 依赖提前打进首屏逻辑。
type PdfDocument = InstanceType<typeof import('jspdf').jsPDF>

// PDF 统一色板，后续绘制文字、边框、卡片背景时复用。
const pdfColors = {
  primary: [79, 70, 229],
  text: [17, 24, 39],
  secondary: [55, 65, 81],
  muted: [107, 114, 128],
  border: [229, 231, 235],
  background: [255, 255, 255],
  purpleSoft: [237, 233, 254],
  cardBg: [248, 250, 252],
} as const

type PdfColor = readonly [number, number, number]

// jsPDF 注册字体需要 base64 字符串，这里把字体 ArrayBuffer 转换过去。
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = ''
  const bytes = new Uint8Array(buffer)

  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i] ?? 0)
  }

  return btoa(binary)
}

// 加载 public/fonts 下的中文字体，保证 PDF 中文内容可以正常显示。
async function loadChineseFont(doc: PdfDocument): Promise<void> {
  const response = await fetch('/fonts/NotoSansSC-Regular.ttf')

  if (!response.ok) {
    throw new Error('Failed to load Chinese font')
  }

  const fontBuffer = await response.arrayBuffer()
  const fontBase64 = arrayBufferToBase64(fontBuffer)

  doc.addFileToVFS('NotoSansSC-Regular.ttf', fontBase64)
  doc.addFont('NotoSansSC-Regular.ttf', 'NotoSansSC', 'normal')
  doc.setFont('NotoSansSC', 'normal')
}

// 设置 PDF 文字颜色。
const setPdfTextColor = (pdf: PdfDocument, color: PdfColor) => {
  pdf.setTextColor(color[0], color[1], color[2])
}

// 设置 PDF 填充颜色。
const setPdfFillColor = (pdf: PdfDocument, color: PdfColor) => {
  pdf.setFillColor(color[0], color[1], color[2])
}

// 设置 PDF 线条颜色。
const setPdfDrawColor = (pdf: PdfDocument, color: PdfColor) => {
  pdf.setDrawColor(color[0], color[1], color[2])
}

// 写入自动换行文本，并返回下一段内容应该开始的 y 坐标。
const addWrappedText = (
  pdf: PdfDocument,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 6,
): number => {
  const lines = pdf.splitTextToSize(safeText(text), maxWidth) as string[]
  pdf.text(lines, x, y)
  return y + lines.length * lineHeight
}

// 绘制 PDF 中的章节标题和短下划线。
const addSectionTitle = (pdf: PdfDocument, title: string, x: number, y: number): number => {
  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(17)
  setPdfTextColor(pdf, pdfColors.text)
  pdf.text(title, x, y)
  setPdfDrawColor(pdf, pdfColors.primary)
  pdf.setLineWidth(0.6)
  pdf.line(x, y + 3, x + 22, y + 3)
  return y + 13
}

// 绘制一张小卡片，主要用于首页评分维度摘要。
const addSmallCard = (
  pdf: PdfDocument,
  title: string,
  body: string,
  x: number,
  y: number,
  width: number,
  height: number,
  score?: number,
) => {
  setPdfFillColor(pdf, pdfColors.cardBg)
  setPdfDrawColor(pdf, pdfColors.border)
  pdf.roundedRect(x, y, width, height, 4, 4, 'FD')

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(11)
  setPdfTextColor(pdf, pdfColors.text)
  pdf.text(safeText(title), x + 5, y + 9)

  if (typeof score === 'number') {
    pdf.setFontSize(13)
    setPdfTextColor(pdf, pdfColors.primary)
    pdf.text(`${score}%`, x + width - 23, y + 9)
  }

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(9)
  setPdfTextColor(pdf, pdfColors.secondary)
  addWrappedText(pdf, body, x + 5, y + 18, width - 10, 4.5)
}

// 绘制带圆点的文本列表，返回列表结束后的 y 坐标。
const addBulletList = (
  pdf: PdfDocument,
  items: string[],
  x: number,
  y: number,
  maxWidth: number,
  maxItems = 6,
): number => {
  let cursorY = y

  safeArray(items).slice(0, maxItems).forEach((item) => {
    setPdfFillColor(pdf, pdfColors.primary)
    pdf.circle(x, cursorY - 1.5, 1.2, 'F')
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(10)
    setPdfTextColor(pdf, pdfColors.secondary)
    cursorY = addWrappedText(pdf, item, x + 5, cursorY, maxWidth - 5, 5) + 2
  })

  return cursorY
}

// PDF 页脚，展示产品名和页码。
const addFooter = (pdf: PdfDocument, pageNumber: number) => {
  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(8)
  setPdfTextColor(pdf, pdfColors.muted)
  pdf.text(`ResumeFlow AI · 第 ${pageNumber} 页`, 20, 286)
}

// 在浏览器端生成并下载 PDF 报告。
export async function downloadResultPdf(result: AnalysisResult): Promise<void> {
  const runtimeProcess = typeof process === 'undefined'
    ? undefined
    : (process as NodeJS.Process & { client?: boolean })

  // 服务端渲染阶段不能访问 window/document，也不能触发下载。
  if (runtimeProcess?.client === false) {
    return
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return
  }

  // 动态加载 jsPDF，让普通页面渲染时不必提前加载 PDF 依赖。
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF('p', 'mm', 'a4')
  await loadChineseFont(pdf)

  const pageWidth = pdf.internal.pageSize.getWidth()
  const marginX = 20
  const contentWidth = pageWidth - marginX * 2

  pdf.setProperties({
    title: 'ResumeFlow AI 求职匹配分析报告',
    subject: 'AI 求职匹配分析报告',
    creator: 'ResumeFlow AI',
  })

  // Page 1: Overview
  setPdfFillColor(pdf, pdfColors.background)
  pdf.rect(0, 0, 210, 297, 'F')
  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(23)
  setPdfTextColor(pdf, pdfColors.text)
  pdf.text('ResumeFlow AI 求职匹配分析报告', marginX, 28)

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(9)
  setPdfTextColor(pdf, pdfColors.muted)
  pdf.text(`生成时间：${safeText(result.generatedAt || new Date().toISOString())}`, marginX, 36)

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(48)
  setPdfTextColor(pdf, pdfColors.primary)
  pdf.text(`${safeText(result.overallScore)}%`, marginX, 62)

  setPdfFillColor(pdf, pdfColors.purpleSoft)
  setPdfDrawColor(pdf, pdfColors.border)
  pdf.roundedRect(marginX, 70, 78, 12, 6, 6, 'FD')
  pdf.setFontSize(10)
  setPdfTextColor(pdf, pdfColors.primary)
  pdf.text(recommendationTextMap[result.recommendation] || safeText(result.recommendation), marginX + 5, 78)

  pdf.setFont('NotoSansSC', 'normal')
  pdf.setFontSize(11)
  setPdfTextColor(pdf, pdfColors.secondary)
  addWrappedText(pdf, result.overallSummary, marginX, 96, contentWidth, 6)

  let cardY = 132
  const cardWidth = 80
  const cardHeight = 38
  // 首页最多展示 4 个评分卡，使用两列布局。
  safeArray(result.scoreCards).slice(0, 4).forEach((card, index) => {
    const x = marginX + (index % 2) * (cardWidth + 10)
    const y = cardY + Math.floor(index / 2) * (cardHeight + 10)
    addSmallCard(
      pdf,
      card.label,
      card.summary,
      x,
      y,
      cardWidth,
      cardHeight,
      card.score,
    )
  })
  addFooter(pdf, 1)

  // Page 2: Strengths, gaps, and skills
  pdf.addPage()
  let cursorY = 28
  cursorY = addSectionTitle(pdf, '核心优势', marginX, cursorY)
  cursorY = addBulletList(pdf, result.strengths, marginX, cursorY, contentWidth, 5) + 6

  cursorY = addSectionTitle(pdf, '需要提升', marginX, cursorY)
  safeArray(result.gaps).slice(0, 5).forEach((gap, index) => {
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(10)
    setPdfTextColor(pdf, pdfColors.text)
    pdf.text(`${index + 1}. ${safeText(gap.title)}`, marginX, cursorY)
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(9)
    setPdfTextColor(pdf, pdfColors.secondary)
    cursorY = addWrappedText(
      pdf,
      `优先级：${safeText(gap.priority)}。${safeText(gap.improvementAdvice || gap.description)}`,
      marginX,
      cursorY + 6,
      contentWidth,
      5,
    ) + 4
  })

  cursorY = addSectionTitle(pdf, '技能匹配', marginX, cursorY + 4)
  safeArray(result.skillMatches).slice(0, 8).forEach((skill, index) => {
    setPdfDrawColor(pdf, pdfColors.border)
    pdf.line(marginX, cursorY - 3, pageWidth - marginX, cursorY - 3)
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(10)
    setPdfTextColor(pdf, pdfColors.text)
    pdf.text(`${index + 1}. ${safeText(skill.skillName)}`, marginX, cursorY + 2)
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(9)
    setPdfTextColor(pdf, pdfColors.primary)
    pdf.text(`${safeText(skill.matchLevel)} · ${safeText(skill.score)}%`, pageWidth - marginX - 42, cursorY + 2)
    setPdfTextColor(pdf, pdfColors.secondary)
    cursorY = addWrappedText(pdf, safeText(skill.resumeEvidence || skill.jobRequirement || skill.category), marginX, cursorY + 9, contentWidth, 5) + 3
  })
  addFooter(pdf, 2)

  // Page 3: Suggestions and interview questions
  pdf.addPage()
  cursorY = 28
  cursorY = addSectionTitle(pdf, '简历优化建议', marginX, cursorY)
  safeArray(result.resumeSuggestions).slice(0, 5).forEach((suggestion, index) => {
    setPdfFillColor(pdf, pdfColors.cardBg)
    setPdfDrawColor(pdf, pdfColors.border)
    pdf.roundedRect(marginX, cursorY - 5, contentWidth, 34, 4, 4, 'FD')
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(10)
    setPdfTextColor(pdf, pdfColors.text)
    pdf.text(`${index + 1}. ${safeText(suggestion.title)}`, marginX + 5, cursorY + 2)
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(9)
    setPdfTextColor(pdf, pdfColors.secondary)
    addWrappedText(
      pdf,
      `优先级：${safeText(suggestion.priority)}。${safeText(suggestion.suggestion || suggestion.problem)}`,
      marginX + 5,
      cursorY + 9,
      contentWidth - 10,
      4.5,
    )
    cursorY += 40
  })

  cursorY = addSectionTitle(pdf, '面试题预测', marginX, cursorY + 5)
  safeArray(result.interviewQuestions).slice(0, 5).forEach((question, index) => {
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(10)
    setPdfTextColor(pdf, pdfColors.text)
    cursorY = addWrappedText(pdf, `${index + 1}. ${safeText(question.question)}`, marginX, cursorY, contentWidth, 5)
    pdf.setFont('NotoSansSC', 'normal')
    pdf.setFontSize(9)
    setPdfTextColor(pdf, pdfColors.secondary)
    cursorY = addWrappedText(
      pdf,
      `难度：${safeText(question.difficulty)}。考察意图：${safeText(question.intent)}`,
      marginX,
      cursorY + 2,
      contentWidth,
      5,
    ) + 5
  })
  addFooter(pdf, 3)

  // 触发浏览器下载。
  pdf.save('resume-analysis-report.pdf')
}
