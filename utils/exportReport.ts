import type { AnalysisResult } from '../types/analysis'

const safeText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value)
}

const safeArray = <T>(value: T[] | undefined): T[] => {
  return Array.isArray(value) ? value : []
}

const toBulletList = (items: string[] | undefined): string => {
  const values = safeArray(items).map((item) => safeText(item)).filter(Boolean)

  if (values.length === 0) {
    return '- '
  }

  return values.map((item) => `- ${item}`).join('\n')
}

const section = (title: string, content: string): string => {
  return `\n## ${title}\n\n${content || ''}\n`
}

export function buildReportMarkdown(result: AnalysisResult): string {
  const scoreCards = safeArray(result.scoreCards)
    .map((card, index) => {
      return [
        `### ${index + 1}. ${safeText(card.label)}`,
        `- 分数：${safeText(card.score)}`,
        `- 总结：${safeText(card.summary)}`,
      ].join('\n')
    })
    .join('\n\n')

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

export async function downloadResultPdf(elementId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  const element = document.getElementById(elementId)

  if (!element) {
    throw new Error(`Report element not found: ${elementId}`)
  }

  const [{ default: html2canvas }, { default: JsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ])

  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    logging: false,
    scale: Math.min(window.devicePixelRatio || 2, 2),
    useCORS: true,
  })

  const pdf = new JsPDF('p', 'mm', 'a4')
  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 10
  const imageWidth = pageWidth - margin * 2
  const imageHeight = (canvas.height * imageWidth) / canvas.width
  const pageContentHeight = pageHeight - margin * 2
  const imageData = canvas.toDataURL('image/png', 1)

  let heightLeft = imageHeight
  let y = margin

  pdf.addImage(imageData, 'PNG', margin, y, imageWidth, imageHeight)
  heightLeft -= pageContentHeight

  while (heightLeft > 0) {
    y -= pageContentHeight
    pdf.addPage()
    pdf.addImage(imageData, 'PNG', margin, y, imageWidth, imageHeight)
    heightLeft -= pageContentHeight
  }

  pdf.save('resume-analysis-report.pdf')
}
