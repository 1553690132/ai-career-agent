// 切割各个区块的文本.

// 简历按常见内容拆成几个区块，便于后续按区块压缩。
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

// 各区块标题的别名表：支持中文标题和英文标题。
const sectionAliasMap: Record<SectionAliasKey, string[]> = {
  education: ['教育经历', '教育背景', '学历背景', '学习经历', '教育信息', 'education'],
  skills: ['相关技能', '专业技能', '技能', '技能清单', '技能特长', '技术栈', '个人技能', 'skills'],
  workExperience: ['工作经历', '实习经历', '工作经验', '实习经验', '任职经历', '职业经历', 'experience', 'workexperience'],
  projects: ['项目经历', '项目经验', '项目实践', '项目介绍', '代表项目', 'projects', 'projectexperience'],
  academic: ['学术成果', '科研成果', '论文成果', '研究成果', '科研经历', 'academic', 'publications'],
  campusExperience: ['在校经历', '校园经历', '校内经历', '社团经历', '学生工作', 'campus', 'studentwork'],
  selfEvaluation: ['自我评价', '个人评价', '自我介绍', '个人总结', '个人优势', 'summary', 'about', 'profile'],
}

// 基本信息之后可能出现的key
const basicInfoBoundaryKeys: HeadingMatch['key'][] = [
  'education',
  'skills',
  'workExperience',
  'projects',
]

// 清理标题前后的编号、括号、标点等装饰。
const cleanHeadingText = (line: string) =>
  line
    .trim()
    .replace(/^[【\[\(（\s\d一二三四五六七八九十]+[\.、\s]*/, '')
    .replace(/[】\]\)）:\：\s]+$/, '')
    .trim()

// 标题归一化后再比较，降低空格和大小写对匹配的影响。
const normalizeHeadingText = (line: string) =>
  cleanHeadingText(line).replace(/\s+/g, '').toLowerCase()

// 判断单行文本是否是简历区块标题。
export const matchSection = (line: string): keyof ResumeSections | null => {
  const trimmedLine = line.trim()
  // 太长行不是标题
  if (!trimmedLine || trimmedLine.length > 24) {
    return null
  }

  const headingText = normalizeHeadingText(trimmedLine)
  // 匹配别名表
  for (const [sectionKey, aliases] of Object.entries(sectionAliasMap)) {
    if (aliases.some((alias) => headingText === normalizeHeadingText(alias))) {
      return sectionKey as SectionAliasKey
    }
  }

  return null
}

// 只返回可作为边界的正文区块标题。
const detectHeadingKey = (line: string): HeadingMatch['key'] | undefined => {
  const sectionKey = matchSection(line)

  if (!sectionKey || sectionKey === 'basicInfo' || sectionKey === 'others') {
    return undefined
  }

  return sectionKey
}

// 清理行数组，去空后用换行拼回区块正文。
const compactText = (lines: string[]) =>
  lines
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n')
    .trim()

// 根据标题位置把原始简历文本切成结构化区块。
export const extractResumeSections = (rawText: string): ResumeSections => {
  const text = rawText.trim()
  const sections = createEmptySections()

  if (!text) {
    return sections
  }

  const lines = text.split(/\r?\n/)
  const headings: HeadingMatch[] = []

  // 第一遍扫描所有可识别标题，记录标题所在行。
  lines.forEach((line, lineIndex) => {
    const key = detectHeadingKey(line)

    if (key) {
      headings.push({ key, lineIndex })
    }
  })

  // 没有识别到标题时，把全文放进 others，防止没有标题的简历异常。
  if (headings.length === 0) {
    return {
      ...sections,
      others: text,
    }
  }

  // 基本信息通常出现在第一个主要区块之前，基本信息通常没有标题不能简单判断
  const basicInfoBoundary = headings.find((heading) =>
    basicInfoBoundaryKeys.includes(heading.key),
  )

  if (basicInfoBoundary) {
    sections.basicInfo = compactText(lines.slice(0, basicInfoBoundary.lineIndex))
  }

  // 每个标题到下一个标题之间的内容就是该区块正文。
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

// 将区块重新拼成带标题的紧凑文本，供简历抽取 prompt 使用。
// export const buildCompactResumeText = (sections: ResumeSections): string => {
//   const compactSections = compactSectionLabels
//     .map(({ key, label }) => {
//       const content = sections[key].trim()

//       if (!content) {
//         return ''
//       }

//       return `【${label}】\n${content}`
//     })
//     .filter(Boolean)

//   if (compactSections.length === 0 && sections.others.trim()) {
//     return sections.others.trim()
//   }

//   return compactSections.join('\n\n')
// }
