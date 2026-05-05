import type { AnalysisResult, PracticeSet } from '../../types/analysis'

type PracticeSource = 'base' | 'rag'

// 页面间共享的 sessionStorage key，集中维护避免散落硬编码。
const contextKeys = {
  analysisResult: 'analysisResult',
  practiceSet: 'practiceSet',
  selectedRoleType: 'selectedRoleType',
  practiceSource: 'practiceSource',
  lastUploadedMdName: 'practiceMdFileName',
} as const

// Nuxt 会有服务端渲染阶段，访问 sessionStorage 前必须确认当前在浏览器端。
const isClient = () => process.client && typeof sessionStorage !== 'undefined'

// 从 sessionStorage 读取 JSON 时做容错，避免坏数据导致页面渲染失败。
const parseStoredJson = <T>(value: string | null): T | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return null
  }
}

// 写入字符串值的统一入口：服务端阶段直接跳过。
const setStringValue = (key: string, value: string) => {
  if (!isClient()) {
    return
  }

  sessionStorage.setItem(key, value)
}

// 读取字符串值的统一入口：没有值或不在浏览器端时返回空字符串。
const getStringValue = (key: string) => {
  if (!isClient()) {
    return ''
  }

  return sessionStorage.getItem(key) ?? ''
}

// 重置练习或清空整个流程状态。
const removeValue = (key: string) => {
  if (!isClient()) {
    return
  }

  sessionStorage.removeItem(key)
}

// 应用级上下文 composable：负责在 analyze/result/practice 页面之间传递临时状态。
export const useAppContext = () => {
  // 保存完整分析结果，结果页会优先从这里恢复报告内容。
  const saveAnalysisResult = (result: AnalysisResult) => {
    setStringValue(contextKeys.analysisResult, JSON.stringify(result))
  }

  // 读取最近一次分析结果
  const getAnalysisResult = () => {
    if (!isClient()) {
      return null
    }

    return parseStoredJson<AnalysisResult>(sessionStorage.getItem(contextKeys.analysisResult))
  }

  // 保存练习题集，并记录题目来源和可选的 Markdown 文件名。
  const savePracticeSet = (
    set: PracticeSet,
    options: {
      source?: PracticeSource
      lastUploadedMdName?: string
    } = {},
  ) => {
    setStringValue(contextKeys.practiceSet, JSON.stringify(set))
    savePracticeSource(options.source ?? 'base')

    if (options.lastUploadedMdName) {
      saveLastUploadedMdName(options.lastUploadedMdName)
    } else {
      removeValue(contextKeys.lastUploadedMdName)
    }
  }

  // 读取结果页预先生成或练习页重新生成的题集。
  const getPracticeSet = () => {
    if (!isClient()) {
      return null
    }

    return parseStoredJson<PracticeSet>(sessionStorage.getItem(contextKeys.practiceSet))
  }

  // 保存用户在分析页选择的岗位类型，供结果页生成练习题时兜底使用。
  const saveSelectedRoleType = (roleType: string) => {
    const normalizedRoleType = roleType.trim()

    if (normalizedRoleType) {
      setStringValue(contextKeys.selectedRoleType, normalizedRoleType)
    }
  }

  const getSelectedRoleType = () => getStringValue(contextKeys.selectedRoleType)

  // 记录练习题来源：base 是默认生成，rag 是结合 Markdown 资料增强生成。
  const savePracticeSource = (source: PracticeSource) => {
    setStringValue(contextKeys.practiceSource, source)
  }

  const getPracticeSource = (): PracticeSource =>
    getStringValue(contextKeys.practiceSource) === 'rag' ? 'rag' : 'base'

  // 记录最近一次用于 RAG 增强的 Markdown 文件名，只用于页面展示。
  const saveLastUploadedMdName = (fileName: string) => {
    const normalizedFileName = fileName.trim()

    if (normalizedFileName) {
      setStringValue(contextKeys.lastUploadedMdName, normalizedFileName)
    }
  }

  const getLastUploadedMdName = () => getStringValue(contextKeys.lastUploadedMdName)

  // 只清空练习相关状态，保留分析报告，便于重新生成题目。
  const clearPracticeContext = () => {
    removeValue(contextKeys.practiceSet)
    removeValue(contextKeys.practiceSource)
    removeValue(contextKeys.lastUploadedMdName)
  }

  // 清空完整流程上下文，通常用于重新开始一次新的分析。
  const clearAllContext = () => {
    removeValue(contextKeys.analysisResult)
    removeValue(contextKeys.practiceSet)
    removeValue(contextKeys.selectedRoleType)
    removeValue(contextKeys.practiceSource)
    removeValue(contextKeys.lastUploadedMdName)
  }

  return {
    saveAnalysisResult,
    getAnalysisResult,
    savePracticeSet,
    getPracticeSet,
    saveSelectedRoleType,
    getSelectedRoleType,
    savePracticeSource,
    getPracticeSource,
    saveLastUploadedMdName,
    getLastUploadedMdName,
    clearPracticeContext,
    clearAllContext,
  }
}
