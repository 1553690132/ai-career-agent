import type { ResumeSections } from './resumeSectionExtractor'
// 清理区块,合并最终文本归一化.
// 按简历区块的重要性分配 token 预算。
const sectionLengthLimits: Record<keyof ResumeSections, number> = {
  basicInfo: 150,
  education: 150,
  skills: 200,
  workExperience: 800,
  projects: 1200,
  academic: 200,
  campusExperience: 200,
  selfEvaluation: 200,
  others: 100,
}

const sectionLabels: Array<{
  key: Exclude<keyof ResumeSections, 'others'>
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

// 清理简历中常见装饰符号、表格线和多余空白。
const cleanText = (text: string) =>
  text
    .replace(/[|｜◆●■★☆▪•·]+/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

// 按区块预算截断
const truncateSection = (text: string, key: keyof ResumeSections) =>
  text.slice(0, sectionLengthLimits[key]).trim()

// 去重、技能列表归一化
const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

// 技能区通常是分隔符密集文本，这里拆分、去重后再拼回紧凑列表。
const normalizeSkills = (text: string) => {
  const cleanedText = cleanText(text)

  if (!cleanedText) {
    return ''
  }
  // 先清洗、按特殊字符拆分、trim且过滤空项以及过长项，最后去重、用顿号拼接方便AI抽取。
  const skills = unique(
    cleanedText
      .split(/[、，,\/\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 1 && item.length <= 30),
  )

  return truncateSection(skills.join('、'), 'skills')
}

// 对每个简历区块分别清洗和截断。
export const normalizeResumeSections = (sections: ResumeSections): ResumeSections => ({
  basicInfo: truncateSection(cleanText(sections.basicInfo), 'basicInfo'),
  education: truncateSection(cleanText(sections.education), 'education'),
  skills: normalizeSkills(sections.skills),
  workExperience: truncateSection(cleanText(sections.workExperience), 'workExperience'),
  projects: truncateSection(cleanText(sections.projects), 'projects'),
  academic: truncateSection(cleanText(sections.academic), 'academic'),
  campusExperience: truncateSection(cleanText(sections.campusExperience), 'campusExperience'),
  selfEvaluation: truncateSection(cleanText(sections.selfEvaluation), 'selfEvaluation'),
  others: truncateSection(cleanText(sections.others), 'others'),
})

// 将归一化后的区块拼成最终给 LLM 的简历文本。
export const buildCompactResumeText = (sections: ResumeSections): string => {
  const compactSections = sectionLabels
    .map(({ key, label }) => {
      const content = sections[key].trim()

      if (!content) {
        return ''
      }

      return `【${label}】\n${content}`
    })
    .filter(Boolean)
  // other兜底，处理没有标题的情况
  if (compactSections.length === 0 && sections.others.trim()) {
    return sections.others.trim()
  }

  return compactSections.join('\n\n')
}
