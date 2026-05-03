export type ChainName =
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
  chainName: ChainName
  success: boolean
  duration: number
  inputLength: number
  outputLength: number
  usedFallback: boolean
  errorStage?: ChainErrorStage
}

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
