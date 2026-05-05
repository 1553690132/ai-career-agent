import { AiWorkflowStepError, extractJobProfile } from '../services/aiWorkflow'
import { AiJsonParseError, createAiJsonErrorData, getErrorMessage } from '../utils/json'
import type { JobProfile } from '../../types/analysis'

// 单独的岗位抽取接口：用于调试或分阶段调用 job_extract chain。
interface JobExtractRequestBody {
  jobText?: string
  roleType?: string
}

// 与主分析接口保持一致，限制进入 LLM 的 JD 文本长度。
const minTextLength = 50
const maxTextLength = 2000

// 只做 JD 结构化抽取，不执行简历抽取和匹配分析。
export default defineEventHandler(async (event): Promise<JobProfile> => {
  const body = await readBody<JobExtractRequestBody>(event)
  const errors: string[] = []

  const jobText = body.jobText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

  // JD 文本和岗位类型都是抽取 prompt 的必要输入。
  if (!jobText) {
    errors.push('jobText is required')
  } else if (jobText.length < minTextLength) {
    errors.push(`jobText must be at least ${minTextLength} characters`)
  } else if (jobText.length > maxTextLength) {
    errors.push(`jobText must be at most ${maxTextLength} characters`)
  }

  if (!roleType) {
    errors.push('roleType is required')
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid job extract request',
      data: { errors },
    })
  }

  try {
    // 调用 aiWorkflow 中封装好的 job_extract 步骤。
    return await extractJobProfile(jobText, roleType)
  } catch (error: unknown) {
    // JSON 解析失败时返回更详细的原始响应片段，方便排查 prompt 输出问题。
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Job extract returned invalid JSON',
        data: {
          step: error.step,
          ...createAiJsonErrorData(error.sourceError),
        },
      })
    }

    // 其他 LLM/网络/schema 错误统一转成 500，并尽量带上失败 step。
    throw createError({
      statusCode: 500,
      statusMessage: getErrorMessage(error, 'Job extract failed'),
      data: error instanceof AiWorkflowStepError ? { step: error.step } : undefined,
    })
  }
})
