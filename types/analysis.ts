export type SeniorityLevel =
  | 'intern'
  | 'junior'
  | 'mid'
  | 'senior'
  | 'lead'
  | 'manager'
  | 'unknown'

export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert'

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

export type MatchLevel = 'strong' | 'partial' | 'weak' | 'missing'

export type Priority = 'high' | 'medium' | 'low'

export type SuggestionType =
  | 'summary'
  | 'experience'
  | 'project'
  | 'skill'
  | 'keyword'
  | 'format'
  | 'other'

export type InterviewQuestionType =
  | 'technical'
  | 'project'
  | 'behavioral'
  | 'system_design'
  | 'case_study'
  | 'other'

export interface SkillItem {
  name: string
  category: SkillCategory
  level?: SkillLevel
  yearsOfExperience?: number
  evidence?: string
}

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

export interface ProjectExperience {
  name: string
  role?: string
  summary: string
  highlights: string[]
  skills: string[]
  url?: string
}

export interface EducationItem {
  school: string
  degree?: string
  major?: string
  startDate?: string
  endDate?: string
}

export interface ResumeProfile {
  name?: string
  headline?: string
  summary?: string
  location?: string
  yearsOfExperience?: number
  seniorityLevel?: SeniorityLevel
  targetRoles?: string[]
  skills: SkillItem[]
  workExperiences: WorkExperience[]
  projects: ProjectExperience[]
  education: EducationItem[]
  certifications?: string[]
  languages?: SkillItem[]
}

export interface JobProfile {
  title: string
  company?: string
  location?: string
  employmentType?: 'full_time' | 'part_time' | 'contract' | 'internship' | 'unknown'
  workMode?: 'onsite' | 'hybrid' | 'remote' | 'unknown'
  seniorityLevel?: SeniorityLevel
  summary?: string
  responsibilities: string[]
  requiredSkills: SkillItem[]
  preferredSkills?: SkillItem[]
  requiredYearsOfExperience?: number
  educationRequirements?: string[]
  keywords: string[]
}

export interface SkillMatch {
  skillName: string
  category: SkillCategory
  matchLevel: MatchLevel
  resumeEvidence?: string
  jobRequirement?: string
  score: number
}

export interface GapItem {
  title: string
  description: string
  priority: Priority
  relatedSkills?: string[]
  improvementAdvice?: string
}

export interface ScoreCard {
  label: string
  score: number
  summary: string
}

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

export interface InterviewQuestion {
  id: string
  type: InterviewQuestionType
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  intent: string
  relatedSkills?: string[]
  suggestedAnswerPoints?: string[]
}

export interface AnalysisResult {
  resume: ResumeProfile
  job: JobProfile
  overallScore: number
  overallSummary: string
  recommendation: 'highly_recommended' | 'recommended' | 'borderline' | 'not_recommended'
  scoreCards: ScoreCard[]
  skillMatches: SkillMatch[]
  strengths: string[]
  gaps: GapItem[]
  resumeSuggestions: ResumeSuggestion[]
  interviewQuestions: InterviewQuestion[]
  generatedAt?: string
}
