export type ResumeSections = {
  basicInfo: string
  education: string
  skills: string
  workExperience: string
  projects: string
  academic: string
  campusExperience: string
  selfEvaluation: string
  others: string
}

type ResumeSectionKey = keyof ResumeSections

type HeadingMatch = {
  key: Exclude<ResumeSectionKey, 'basicInfo' | 'others'>
  lineIndex: number
}

type SectionAliasKey = HeadingMatch['key']

const createEmptySections = (): ResumeSections => ({
  basicInfo: '',
  education: '',
  skills: '',
  workExperience: '',
  projects: '',
  academic: '',
  campusExperience: '',
  selfEvaluation: '',
  others: '',
})

const sectionAliasMap: Record<SectionAliasKey, string[]> = {
  education: ['教育经历', '教育背景', '学历背景', '学习经历', '教育信息'],
  skills: ['相关技能', '专业技能', '技能', '技能清单', '技能特长', '技术栈', '个人技能'],
  workExperience: ['工作经历', '实习经历', '工作经验', '实习经验', '任职经历', '职业经历'],
  projects: ['项目经历', '项目经验', '项目实践', '项目介绍', '代表项目'],
  academic: ['学术成果', '科研成果', '论文成果', '研究成果', '科研经历'],
  campusExperience: ['在校经历', '校园经历', '校内经历', '社团经历', '学生工作'],
  selfEvaluation: ['自我评价', '个人评价', '自我介绍', '个人总结', '个人优势'],
}

const basicInfoBoundaryKeys: HeadingMatch['key'][] = [
  'education',
  'skills',
  'workExperience',
  'projects',
]

const cleanHeadingText = (line: string) =>
  line
    .trim()
    .replace(/^[【\[\(（\s]+/, '')
    .replace(/[】\]\)）:\：\s]+$/, '')
    .trim()

const normalizeHeadingText = (line: string) =>
  cleanHeadingText(line).replace(/\s+/g, '').toLowerCase()

export const matchSection = (line: string): keyof ResumeSections | null => {
  const trimmedLine = line.trim()

  if (!trimmedLine || trimmedLine.length > 24) {
    return null
  }

  const headingText = normalizeHeadingText(trimmedLine)

  for (const [sectionKey, aliases] of Object.entries(sectionAliasMap)) {
    if (aliases.some((alias) => headingText === normalizeHeadingText(alias))) {
      return sectionKey as SectionAliasKey
    }
  }

  return null
}

const detectHeadingKey = (line: string): HeadingMatch['key'] | undefined => {
  const sectionKey = matchSection(line)

  if (!sectionKey || sectionKey === 'basicInfo' || sectionKey === 'others') {
    return undefined
  }

  return sectionKey
}

const compactText = (lines: string[]) =>
  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()

export const extractResumeSections = (rawText: string): ResumeSections => {
  const text = rawText.trim()
  const sections = createEmptySections()

  if (!text) {
    return sections
  }

  const lines = text.split(/\r?\n/)
  const headings: HeadingMatch[] = []

  lines.forEach((line, lineIndex) => {
    const key = detectHeadingKey(line)

    if (key) {
      headings.push({ key, lineIndex })
    }
  })

  if (headings.length === 0) {
    return {
      ...sections,
      others: text,
    }
  }

  const basicInfoBoundary = headings.find((heading) =>
    basicInfoBoundaryKeys.includes(heading.key),
  )

  if (basicInfoBoundary) {
    sections.basicInfo = compactText(lines.slice(0, basicInfoBoundary.lineIndex))
  }

  headings.forEach((heading, headingIndex) => {
    const nextHeading = headings[headingIndex + 1]
    const contentLines = lines.slice(
      heading.lineIndex + 1,
      nextHeading?.lineIndex ?? lines.length,
    )
    const content = compactText(contentLines)

    if (!content) {
      return
    }

    sections[heading.key] = sections[heading.key]
      ? `${sections[heading.key]}\n${content}`
      : content
  })

  return sections
}

const compactSectionLabels: Array<{
  key: Exclude<ResumeSectionKey, 'others'>
  label: string
}> = [
  { key: 'basicInfo', label: '基础信息' },
  { key: 'education', label: '教育经历' },
  { key: 'skills', label: '相关技能' },
  { key: 'workExperience', label: '工作经历' },
  { key: 'projects', label: '项目经历' },
  { key: 'academic', label: '学术成果' },
  { key: 'campusExperience', label: '在校经历' },
  { key: 'selfEvaluation', label: '自我评价' },
]

export const buildCompactResumeText = (sections: ResumeSections): string => {
  const compactSections = compactSectionLabels
    .map(({ key, label }) => {
      const content = sections[key].trim()

      if (!content) {
        return ''
      }

      return `【${label}】\n${content}`
    })
    .filter(Boolean)

  if (compactSections.length === 0 && sections.others.trim()) {
    return sections.others.trim()
  }

  return compactSections.join('\n\n')
}
