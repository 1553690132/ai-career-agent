import { analysisAdviceChain } from '../chains/analysisAdviceChain'
import { analysisScoreChain } from '../chains/analysisScoreChain'
import { jobExtractChain, type JobExtractChainOutput, type JobJson } from '../chains/jobExtractChain'
import { resumeReviewAdviceChain } from '../chains/resumeReviewAdviceChain'
import { resumeReviewScoreChain } from '../chains/resumeReviewScoreChain'
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

export type AiWorkflowStep =
  | 'resume_extract'
  | 'job_extract'
  | 'analysis_match'
  | 'analysis_score'
  | 'analysis_advice'
  | 'resume_review_score'
  | 'resume_review_advice'
export type AnalysisWorkflowStage = 'resume' | 'job' | 'analysis'


export interface AnalysisWorkflowInput {
  resumeText: string
  jobText?: string
  roleType?: string
}


export interface AnalysisWorkflowMetrics {
  totalDuration: number
}

// workflow 返回显式 success/false，便于 API 层决定是否进入 fallback。
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

// 对外暴露的步骤错误：保留失败 step 和原始错误，方便 API 层分类处理。
export class AiWorkflowStepError extends Error {
  constructor(
    public readonly step: AiWorkflowStep,
    message: string,
    public readonly sourceError: unknown,
  ) {
    super(message)
  }
}

// 对 LLM 输出的字符串数组做裁剪和去空，避免结果页展示过长。
const normalizeStringList = (value: string[] | undefined, limit: number): string[] =>
  (value ?? [])
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, limit)

// LLM 未识别资历等级时统一归为 unknown。
const normalizeSeniorityLevel = (value: SeniorityLevel | undefined): SeniorityLevel =>
  value ?? 'unknown'

// 从技能名称粗略推断分类，补齐抽取 chain 中只返回字符串技能的缺口。
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

// 将字符串技能列表转换成前端统一使用的 SkillItem。
const createSkillItems = (skills: string[] | undefined, limit: number): SkillItem[] =>
  normalizeStringList(skills, limit).map((name) => ({
    name,
    category: inferSkillCategory(name),
  }))

// 将 resume_extract 的轻量 JSON 归一化成完整 ResumeProfile。
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

// 将 job_extract 的轻量 JSON 归一化成完整 JobProfile。
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

// 没有 JD 时创建默认岗位画像，让结果页仍然能展示 job 区块。
const createDefaultJobProfile = (roleType: string): JobProfile => ({
  title: roleType,
  company: '',
  summary: '无具体JD，基于目标岗位类型进行通用简历诊断',
  responsibilities: [],
  requiredSkills: [],
  preferredSkills: [],
  keywords: [],
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

// 将 workflow 阶段映射到具体 step 名，供错误对象使用。
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

// 实际主流程调度器：在服务端内部串联多个 chain，而不是让前端逐个调用接口。
export async function runAnalysisWorkflow(
  input: AnalysisWorkflowInput,
): Promise<AnalysisWorkflowResult> {
  const workflowStartTime = Date.now()
  const roleType = input.roleType?.trim() || 'unknown'
  const jobText = input.jobText?.trim() ?? ''
  const hasValidJobText = jobText.length > 0
  let failedStage: AnalysisWorkflowStage = 'resume'

  console.log('[Workflow] start')

  try {
    let resumeJson: ResumeExtractChainOutput
    let resume: ResumeProfile

    try {
      // 抽取简历画像
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

    let job: JobProfile

    if (hasValidJobText) {
      // 有 JD 时抽取岗位画像，然后进入岗位匹配模式
      let jobJson: JobExtractChainOutput

      try {
        failedStage = 'job'
        jobJson = await jobExtractChain.invoke({
          jobText,
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
    } else {
      // 没有 JD 时跳过 job_extract，进入通用简历体检模式。
      job = createDefaultJobProfile(roleType)
      console.log('[Workflow] job_extract skipped: no JD provided')
    }

    try {
      // 先评分，再把评分摘要交给 advice chain 生成建议和面试题。
      failedStage = 'analysis'
      const scoreAnalysis = hasValidJobText
        ? await analysisScoreChain.invoke({
            resumeJson: resume,
            jobJson: job,
            roleType,
          })
        : await resumeReviewScoreChain.invoke({
            resumeJson: resume,
            roleType,
          })
      console.log(hasValidJobText ? '[Workflow] analysis_score done' : '[Workflow] resume_review_score done')

      const adviceAnalysis = hasValidJobText
        ? await analysisAdviceChain.invoke({
            resumeJson: resume,
            jobJson: job,
            roleType,
            scoreSummary: scoreAnalysis,
          })
        : await resumeReviewAdviceChain.invoke({
            resumeJson: resume,
            roleType,
            scoreSummary: scoreAnalysis,
          })
      console.log(hasValidJobText ? '[Workflow] analysis_advice done' : '[Workflow] resume_review_advice done')

      // score/advice 两段结果合并成 AnalysisResult 中除 resume/job 外的分析主体。
      const analysis = {
        ...scoreAnalysis,
        ...adviceAnalysis,
      }
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

// 分段接口resume
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

// 分段接口job
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

// 分段接口match
export const analyzeMatch = async (
  resume: ResumeProfile,
  job: JobProfile,
  roleType: string,
): Promise<AnalysisResult> => {
  logStepStart('analysis_match')

  try {
    const scoreAnalysis = await analysisScoreChain.invoke({
      resumeJson: resume,
      jobJson: job,
      roleType,
    })
    const adviceAnalysis = await analysisAdviceChain.invoke({
      resumeJson: resume,
      jobJson: job,
      roleType,
      scoreSummary: scoreAnalysis,
    })

    const result = {
      resume,
      job,
      ...scoreAnalysis,
      ...adviceAnalysis,
    }
    logStepSuccess('analysis_match')

    return result
  } catch (error: unknown) {
    logStepFail('analysis_match', error)
    throw new AiWorkflowStepError('analysis_match', 'Analysis match step failed', error)
  }
}

// API 主入口使用的方法：失败时抛出 AiWorkflowStepError，成功时返回完整 AnalysisResult。
export const runFullAnalysis = async (
  resumeText: string,
  jobText: string | undefined,
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
