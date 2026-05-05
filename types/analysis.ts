// 候选人或岗位的资历等级，unknown 用于 AI 无法可靠判断时兜底。
export type SeniorityLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'unknown'

// 技能熟练度，用于描述简历中某项技能的掌握程度。
export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

// 技能分类：用于结果页分组展示，也帮助 AI 输出更结构化的技能项。
export type SkillCategory =
  | 'programming'
  | 'framework'
  | 'tool'
  | 'cloud'
  | 'database'
  | 'ai'
  | 'domain'
  | 'soft_skill'
  | 'language'
  | 'other'

// 简历技能与岗位要求之间的匹配等级。
export type MatchLevel = 'strong' | 'partial' | 'weak' | 'missing'

// 建议或差距的处理优先级。
export type Priority = 'high' | 'medium' | 'low'

// 简历优化建议的类型，用于区分摘要、经历、项目、关键词、格式等问题。
export type SuggestionType =
  | 'summary'
  | 'experience'
  | 'project'
  | 'skill'
  | 'keyword'
  | 'format'
  | 'other'

// 面试题类型，用于区分技术、项目、行为、系统设计、案例等问题。
export type InterviewQuestionType =
  | 'technical'
  | 'project'
  | 'behavioral'
  | 'system_design'
  | 'case_study'
  | 'other'

// 标准化技能项：简历技能、岗位技能、语言能力都会复用这个结构。
export interface SkillItem {
  name: string
  category: SkillCategory
  level?: SkillLevel
  yearsOfExperience?: number
  evidence?: string
}

// 工作经历条目：目前主要承载公司、职位、时间、亮点和相关技能。
export interface WorkExperience {
  company: string
  title: string
  startDate?: string
  endDate?: string
  isCurrent?: boolean
  summary?: string
  highlights: string[]
  skills: string[]
}

// 项目经历条目：用于表达候选人在项目中的职责、摘要、亮点和技术栈。
export interface ProjectExperience {
  name: string
  role?: string
  summary: string
  highlights: string[]
  skills: string[]
  url?: string
}

// 教育经历条目：用于简历画像中的学历背景。
export interface EducationItem {
  school: string
  degree?: string
  major?: string
  startDate?: string
  endDate?: string
}

// AI 从简历中抽取并归一化后的候选人画像。
export interface ResumeProfile {
  // 候选人姓名、标题和概述可能在原始简历中缺失，所以都是可选字段。
  name?: string
  headline?: string
  summary?: string
  location?: string
  yearsOfExperience?: number
  seniorityLevel?: SeniorityLevel
  targetRoles?: string[]
  // 技能、工作经历、项目和教育是结果页和匹配分析的核心输入。
  skills: SkillItem[]
  workExperiences: WorkExperience[]
  projects: ProjectExperience[]
  education: EducationItem[]
  certifications?: string[]
  languages?: SkillItem[]
}

// AI 从 JD 中抽取出的岗位画像；没有 JD 时服务端会创建一个默认岗位画像。
export interface JobProfile {
  title: string
  company?: string
  location?: string
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'unknown'
  workMode?: 'onsite' | 'hybrid' | 'remote' | 'unknown'
  seniorityLevel?: SeniorityLevel
  summary?: string
  // responsibilities/requiredSkills/keywords 是岗位匹配评分的核心依据。
  responsibilities: string[]
  requiredSkills: SkillItem[]
  preferredSkills?: SkillItem[]
  requiredYearsOfExperience?: number
  educationRequirements?: string[]
  keywords: string[]
}

// 单项技能匹配结果：说明某个技能在简历和岗位之间的匹配程度与证据。
export interface SkillMatch {
  skillName: string
  category: SkillCategory
  matchLevel: MatchLevel
  resumeEvidence?: string
  jobRequirement?: string
  score: number
}

// 能力差距项：描述候选人与目标岗位之间最需要补齐的问题。
export interface GapItem {
  title: string
  description: string
  priority: Priority
  relatedSkills?: string[]
  improvementAdvice?: string
}

// 评分卡：将 overallScore 拆成多个维度，便于结果页解释总分来源。
export interface ScoreCard {
  label: string
  score: number
  summary: string
}

// 简历优化建议：指出问题、给出修改建议，并可附带改写示例。
export interface ResumeSuggestion {
  id: string
  type: SuggestionType
  title: string
  priority: Priority
  problem: string
  suggestion: string
  exampleRewrite?: string
  relatedKeywords?: string[]
}

// 结果页里的面试题预测：用于提示可能被追问的方向。
export interface InterviewQuestion {
  id: string
  type: InterviewQuestionType
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  intent: string
  relatedSkills?: string[]
  suggestedAnswerPoints?: string[]
}

// 完整分析结果：/api/analyze 的主要返回结构，也是结果页的核心数据源。
export interface AnalysisResult {
  resume: ResumeProfile
  job: JobProfile
  // 总分和推荐结论用于结果页首屏展示。
  overallScore: number
  overallSummary: string
  recommendation: 'highly_recommended' | 'recommended' | 'borderline' | 'not_recommended'
  // 下面这些数组分别驱动评分、技能、优势差距、建议和面试题组件。
  scoreCards: ScoreCard[]
  skillMatches: SkillMatch[]
  strengths: string[]
  gaps: GapItem[]
  resumeSuggestions: ResumeSuggestion[]
  interviewQuestions: InterviewQuestion[]
  generatedAt?: string
}

// 练习页单题：基于分析差距生成，支持展开考察意图和答题提示。
export interface PracticeQuestion {
  id: string
  skill: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  intent: string
  answerTips: string[]
  relatedGap?: string
}

// 一套专项练习题：/api/practice/generate 的返回结构。
export interface PracticeSet {
  roleType: string
  weakSkills: string[]
  questions: PracticeQuestion[]
}
