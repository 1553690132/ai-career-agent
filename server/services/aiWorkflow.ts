import { runAnalyzeMatchChain } from '../chains/analyzeMatchChain'
import { runJobExtractChain, type MinimalJobExtract } from '../chains/jobExtractChain'
import {
  runResumeExtractChain,
  type MinimalResumeExtract,
  type MinimalSeniorityLevel,
} from '../chains/resumeExtractChain'
import { getErrorMessage } from '../utils/json'
import type {
  AnalysisResult,
  JobProfile,
  ResumeProfile,
  SeniorityLevel,
  SkillCategory,
  SkillItem,
} from '../../types/analysis'

export type AiWorkflowStep = 'resume_extract' | 'job_extract' | 'analysis_match'

export class AiWorkflowStepError extends Error {
  constructor(
    public readonly step: AiWorkflowStep,
    message: string,
    public readonly sourceError: unknown,
  ) {
    super(message)
  }
}

const normalizeStringList = (value: string[] | undefined, limit: number): string[] =>
  (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)

const normalizeSeniorityLevel = (value: MinimalSeniorityLevel | undefined): SeniorityLevel =>
  value ?? 'unknown'

const inferSkillCategory = (name: string): SkillCategory => {
  const normalizedName = name.toLowerCase()

  if (['vue', 'react', 'angular', 'nuxt', 'next', 'vite'].some((item) => normalizedName.includes(item))) {
    return 'framework'
  }

  if (['typescript', 'javascript', 'html', 'css', 'node', 'python', 'java'].some((item) => normalizedName.includes(item))) {
    return 'programming'
  }

  if (['mysql', 'postgres', 'redis', 'mongodb'].some((item) => normalizedName.includes(item))) {
    return 'database'
  }

  if (['git', 'webpack', 'eslint', '工程化', '性能', '优化'].some((item) => normalizedName.includes(item))) {
    return 'tool'
  }

  return 'other'
}

const createSkillItems = (skills: string[] | undefined, limit: number): SkillItem[] =>
  normalizeStringList(skills, limit).map((name) => ({
    name,
    category: inferSkillCategory(name),
  }))

const normalizeResumeProfile = (resume: MinimalResumeExtract): ResumeProfile => ({
  name: resume.name ?? '',
  headline: resume.headline ?? '',
  summary: resume.summary ?? '',
  yearsOfExperience: resume.yearsOfExperience ?? 0,
  seniorityLevel: normalizeSeniorityLevel(resume.seniorityLevel),
  targetRoles: normalizeStringList(resume.targetRoles, 3),
  skills: createSkillItems(resume.skills, 8),
  workExperiences: [],
  projects: (resume.projects ?? []).slice(0, 2).map((project) => ({
    name: project.name ?? '',
    summary: project.summary ?? '',
    highlights: [],
    skills: normalizeStringList(project.skills, 5),
  })),
  education: normalizeStringList(resume.education, 2).map((school) => ({
    school,
  })),
})

const normalizeJobProfile = (job: MinimalJobExtract): JobProfile => ({
  title: job.title ?? '',
  company: job.company ?? '',
  seniorityLevel: normalizeSeniorityLevel(job.seniorityLevel),
  summary: job.summary ?? '',
  responsibilities: normalizeStringList(job.responsibilities, 3),
  requiredSkills: createSkillItems(job.requiredSkills, 8),
  preferredSkills: createSkillItems(job.preferredSkills, 5),
  requiredYearsOfExperience: job.requiredYearsOfExperience ?? 0,
  educationRequirements: normalizeStringList(job.educationRequirements, 2),
  keywords: normalizeStringList(job.keywords, 10),
})

const createAnalysisInput = (resume: ResumeProfile, job: JobProfile) => ({
  resume: {
    summary: resume.summary ?? '',
    yearsOfExperience: resume.yearsOfExperience ?? 0,
    skills: resume.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    projects: resume.projects.slice(0, 2).map((project) => ({
      name: project.name,
      summary: project.summary,
      skills: project.skills.slice(0, 5),
    })),
  },
  job: {
    title: job.title,
    summary: job.summary ?? '',
    requiredSkills: job.requiredSkills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    preferredSkills: job.preferredSkills?.map((skill) => skill.name).filter(Boolean).slice(0, 5) ?? [],
    keywords: job.keywords.slice(0, 10),
  },
})

const logStepStart = (step: AiWorkflowStep) => {
  console.log(`[ai_workflow] ${step} start`)
}

const logStepSuccess = (step: AiWorkflowStep) => {
  console.log(`[ai_workflow] ${step} success`)
}

const logStepFail = (step: AiWorkflowStep, error: unknown) => {
  console.error(`[ai_workflow] ${step} fail: ${getErrorMessage(error)}`)
}

export const extractResumeProfile = async (
  resumeText: string,
  roleType: string,
): Promise<ResumeProfile> => {
  logStepStart('resume_extract')

  try {
    const resume = await runResumeExtractChain({ resumeText, roleType })

    const normalizedResume = normalizeResumeProfile(resume)
    logStepSuccess('resume_extract')

    return normalizedResume
  } catch (error: unknown) {
    logStepFail('resume_extract', error)
    throw new AiWorkflowStepError('resume_extract', 'Resume extract step failed', error)
  }
}

export const extractJobProfile = async (
  jobText: string,
  roleType: string,
): Promise<JobProfile> => {
  logStepStart('job_extract')

  try {
    const job = await runJobExtractChain({ jobText, roleType })

    const normalizedJob = normalizeJobProfile(job)
    logStepSuccess('job_extract')

    return normalizedJob
  } catch (error: unknown) {
    logStepFail('job_extract', error)
    throw new AiWorkflowStepError('job_extract', 'Job extract step failed', error)
  }
}

export const analyzeMatch = async (
  resume: ResumeProfile,
  job: JobProfile,
  roleType: string,
): Promise<AnalysisResult> => {
  logStepStart('analysis_match')

  try {
    const analysisInput = createAnalysisInput(resume, job)
    const analysis = await runAnalyzeMatchChain({
      analysisInput: JSON.stringify(analysisInput),
      roleType,
    })

    const result = {
      resume,
      job,
      ...analysis,
    }
    logStepSuccess('analysis_match')

    return result
  } catch (error: unknown) {
    logStepFail('analysis_match', error)
    throw new AiWorkflowStepError('analysis_match', 'Analysis match step failed', error)
  }
}

export const runFullAnalysis = async (
  resumeText: string,
  jobText: string,
  roleType: string,
): Promise<AnalysisResult> => {
  const resume = await extractResumeProfile(resumeText, roleType)
  const job = await extractJobProfile(jobText, roleType)

  return analyzeMatch(resume, job, roleType)
}
