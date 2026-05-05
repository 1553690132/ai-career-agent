export type ChainName =
  // 每个名称对应一个 LangChain 处理节点，用于日志中区分耗时和失败位置。
  | 'resume_extract'
  | 'job_extract'
  | 'analysis_match'
  | 'analysis_score'
  | 'analysis_advice'
  | 'resume_review_score'
  | 'resume_review_advice'
  | 'practice_question'

export type ChainErrorStage = 'llm' | 'parse' | 'validate'

export interface ChainMetrics {
  // 单次 chain 调用的轻量观测数据，不包含用户简历/JD 原文。
  chainName: ChainName
  success: boolean
  duration: number
  inputLength: number
  outputLength: number
  usedFallback: boolean
  errorStage?: ChainErrorStage
}

// 统一输出 chain 指标，便于在控制台观察 LLM、解析、校验等阶段的稳定性。
export const logChainMetrics = (metrics: ChainMetrics) => {
  console.log('[Metrics]', {
    chain: metrics.chainName,
    duration: metrics.duration,
    inputLength: metrics.inputLength,
    outputLength: metrics.outputLength,
    success: metrics.success,
    usedFallback: metrics.usedFallback,
    ...(metrics.errorStage ? { errorStage: metrics.errorStage } : {}),
  })
}

// 当链路进入兜底结果时创建一条失败指标，保留失败阶段方便后续优化 prompt。
export const createFallbackMetrics = (
  chainName: ChainName,
  errorStage: ChainErrorStage | undefined,
): ChainMetrics => ({
  chainName,
  success: false,
  duration: 0,
  inputLength: 0,
  outputLength: 0,
  usedFallback: true,
  ...(errorStage ? { errorStage } : {}),
})
