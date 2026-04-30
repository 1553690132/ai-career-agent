import { analysisMatchChain } from '../chains/analyzeMatchChain'
import { jobExtractChain, type JobExtractChainOutput, type JobJson } from '../chains/jobExtractChain'
import {
  resumeExtractChain,
  type ResumeExtractChainOutput,
  type ResumeJson,
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
export type AnalysisWorkflowStage = 'resume' | 'job' | 'analysis'

export interface AnalysisWorkflowInput {
  resumeText: string
  jobText: string
  roleType?: string
}

export interface AnalysisWorkflowMetrics {
  totalDuration: number
}

export type AnalysisWorkflowResult =
  | {
      success: true
      data: {
        resume: ResumeProfile
        job: JobProfile
        analysis: Omit<AnalysisResult, 'resume' | 'job'>
      }
      metrics: AnalysisWorkflowMetrics
    }
  | {
      success: false
      error: string
      stage: AnalysisWorkflowStage
    }

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

const normalizeSeniorityLevel = (value: SeniorityLevel | undefined): SeniorityLevel =>
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

const normalizeResumeProfile = (resume: ResumeJson): ResumeProfile => ({
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

const normalizeJobProfile = (job: JobJson): JobProfile => ({
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

const logStepStart = (step: AiWorkflowStep) => {
  console.log(`[ai_workflow] ${step} start`)
}

const logStepSuccess = (step: AiWorkflowStep) => {
  console.log(`[ai_workflow] ${step} success`)
}

const logStepFail = (step: AiWorkflowStep, error: unknown) => {
  console.error(`[ai_workflow] ${step} fail: ${getErrorMessage(error)}`)
}

const toWorkflowStep = (stage: AnalysisWorkflowStage): AiWorkflowStep => {
  if (stage === 'resume') {
    return 'resume_extract'
  }

  if (stage === 'job') {
    return 'job_extract'
  }

  return 'analysis_match'
}

const createStepError = (
  stage: AnalysisWorkflowStage,
  sourceError: unknown,
): AiWorkflowStepError =>
  new AiWorkflowStepError(toWorkflowStep(stage), `${stage} workflow stage failed`, sourceError)

export async function runAnalysisWorkflow(
  input: AnalysisWorkflowInput,
): Promise<AnalysisWorkflowResult> {
  const workflowStartTime = Date.now()
  const roleType = input.roleType?.trim() || 'unknown'
  let failedStage: AnalysisWorkflowStage = 'resume'

  console.log('[Workflow] start')

  try {
    let resumeJson: ResumeExtractChainOutput
    let resume: ResumeProfile

    try {
      failedStage = 'resume'
      resumeJson = await resumeExtractChain.invoke({
        resumeText: input.resumeText,
        roleType,
      })
      resume = normalizeResumeProfile(resumeJson)
      console.log('[Workflow] resume_extract done')
    } catch (error: unknown) {
      console.error('[Workflow] resume_extract failed', getErrorMessage(error))
      return {
        success: false,
        error: getErrorMessage(error, 'Resume workflow stage failed'),
        stage: failedStage,
      }
    }

    let jobJson: JobExtractChainOutput
    let job: JobProfile

    try {
      failedStage = 'job'
      jobJson = await jobExtractChain.invoke({
        jobText: input.jobText,
        roleType,
      })
      job = normalizeJobProfile(jobJson)
      console.log('[Workflow] job_extract done')
    } catch (error: unknown) {
      console.error('[Workflow] job_extract failed', getErrorMessage(error))
      return {
        success: false,
        error: getErrorMessage(error, 'Job workflow stage failed'),
        stage: failedStage,
      }
    }

    try {
      failedStage = 'analysis'
      const analysis = await analysisMatchChain.invoke({
        resumeJson: resume,
        jobJson: job,
        roleType,
      })
      console.log('[Workflow] analysis_match done')

      const totalDuration = Date.now() - workflowStartTime

      return {
        success: true,
        data: {
          resume,
          job,
          analysis,
        },
        metrics: {
          totalDuration,
        },
      }
    } catch (error: unknown) {
      console.error('[Workflow] analysis_match failed', getErrorMessage(error))
      return {
        success: false,
        error: getErrorMessage(error, 'Analysis workflow stage failed'),
        stage: failedStage,
      }
    }
  } catch (error: unknown) {
    console.error('[Workflow] failed', getErrorMessage(error))
    return {
      success: false,
      error: getErrorMessage(error, 'Analysis workflow failed'),
      stage: failedStage,
    }
  } finally {
    const totalDuration = Date.now() - workflowStartTime
    console.log('[Workflow Metrics]', {
      totalDuration,
    })
  }
}

export const extractResumeProfile = async (
  resumeText: string,
  roleType: string,
): Promise<ResumeProfile> => {
  logStepStart('resume_extract')

  try {
    const resume = await resumeExtractChain.invoke({ resumeText, roleType })

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
    const job = await jobExtractChain.invoke({ jobText, roleType })

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
    const analysis = await analysisMatchChain.invoke({
      resumeJson: resume,
      jobJson: job,
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
  const workflowResult = await runAnalysisWorkflow({
    resumeText,
    jobText,
    roleType,
  })

  if (!workflowResult.success) {
    throw createStepError(workflowResult.stage, new Error(workflowResult.error))
  }

  return {
    resume: workflowResult.data.resume,
    job: workflowResult.data.job,
    ...workflowResult.data.analysis,
  }
}
