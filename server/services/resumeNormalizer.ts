import type { ResumeSections } from './resumeSectionExtractor'

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

const cleanText = (text: string) =>
  text
    .replace(/[|｜◆●■★☆▪•·]+/g, ' ')
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

const truncateSection = (text: string, key: keyof ResumeSections) =>
  text.slice(0, sectionLengthLimits[key]).trim()

const unique = (items: string[]) => Array.from(new Set(items.filter(Boolean)))

const normalizeSkills = (text: string) => {
  const cleanedText = cleanText(text)

  if (!cleanedText) {
    return ''
  }

  const skills = unique(
    cleanedText
      .split(/[、，,\/\n]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 1 && item.length <= 30),
  )

  return truncateSection(skills.join('、'), 'skills')
}

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

  if (compactSections.length === 0 && sections.others.trim()) {
    return sections.others.trim()
  }

  return compactSections.join('\n\n')
}
