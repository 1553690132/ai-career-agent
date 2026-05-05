import { AiWorkflowStepError, extractResumeProfile } from '../services/aiWorkflow'
import { AiJsonParseError, createAiJsonErrorData, getErrorMessage } from '../utils/json'
import type { ResumeProfile } from '../../types/analysis'

// 单独的简历抽取接口：用于调试或分阶段调用 resume_extract chain。
interface ResumeExtractRequestBody {
  resumeText?: string
  roleType?: string
}

// 与主分析接口保持一致，限制进入 LLM 的文本长度。
const minTextLength = 50
const maxTextLength = 2000

// 只做简历结构化抽取，不执行岗位抽取和匹配分析。
export default defineEventHandler(async (event): Promise<ResumeProfile> => {
  const body = await readBody<ResumeExtractRequestBody>(event)
  const errors: string[] = []

  const resumeText = body.resumeText?.trim() ?? ''
  const roleType = body.roleType?.trim() ?? ''

  // 简历文本和岗位类型都是抽取 prompt 的必要输入。
  if (!resumeText) {
    errors.push('resumeText is required')
  } else if (resumeText.length < minTextLength) {
    errors.push(`resumeText must be at least ${minTextLength} characters`)
  } else if (resumeText.length > maxTextLength) {
    errors.push(`resumeText must be at most ${maxTextLength} characters`)
  }

  if (!roleType) {
    errors.push('roleType is required')
  }

  if (errors.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid resume extract request',
      data: { errors },
    })
  }

  try {
    // 调用 aiWorkflow 中封装好的 resume_extract 步骤。
    return await extractResumeProfile(resumeText, roleType)
  } catch (error: unknown) {
    // JSON 解析失败时返回更详细的原始响应片段，方便排查 prompt 输出问题。
    if (error instanceof AiWorkflowStepError && error.sourceError instanceof AiJsonParseError) {
      throw createError({
        statusCode: 500,
        statusMessage: 'Resume extract returned invalid JSON',
        data: {
          step: error.step,
          ...createAiJsonErrorData(error.sourceError),
        },
      })
    }

    // 其他 LLM/网络/schema 错误统一转成 500，并尽量带上失败 step。
    throw createError({
      statusCode: 500,
      statusMessage: getErrorMessage(error, 'Resume extract failed'),
      data: error instanceof AiWorkflowStepError ? { step: error.step } : undefined,
    })
  }
})
