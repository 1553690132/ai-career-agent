import type { AnalysisResult, PracticeSet } from '../../types/analysis'

type PracticeSource = 'base' | 'rag'

const contextKeys = {
  analysisResult: 'analysisResult',
  practiceSet: 'practiceSet',
  selectedRoleType: 'selectedRoleType',
  practiceSource: 'practiceSource',
  lastUploadedMdName: 'practiceMdFileName',
} as const

const isClient = () => process.client && typeof sessionStorage !== 'undefined'

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

const setStringValue = (key: string, value: string) => {
  if (!isClient()) {
    return
  }

  sessionStorage.setItem(key, value)
}

const getStringValue = (key: string) => {
  if (!isClient()) {
    return ''
  }

  return sessionStorage.getItem(key) ?? ''
}

const removeValue = (key: string) => {
  if (!isClient()) {
    return
  }

  sessionStorage.removeItem(key)
}

export const useAppContext = () => {
  const saveAnalysisResult = (result: AnalysisResult) => {
    setStringValue(contextKeys.analysisResult, JSON.stringify(result))
  }

  const getAnalysisResult = () => {
    if (!isClient()) {
      return null
    }

    return parseStoredJson<AnalysisResult>(sessionStorage.getItem(contextKeys.analysisResult))
  }

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

  const getPracticeSet = () => {
    if (!isClient()) {
      return null
    }

    return parseStoredJson<PracticeSet>(sessionStorage.getItem(contextKeys.practiceSet))
  }

  const saveSelectedRoleType = (roleType: string) => {
    const normalizedRoleType = roleType.trim()

    if (normalizedRoleType) {
      setStringValue(contextKeys.selectedRoleType, normalizedRoleType)
    }
  }

  const getSelectedRoleType = () => getStringValue(contextKeys.selectedRoleType)

  const savePracticeSource = (source: PracticeSource) => {
    setStringValue(contextKeys.practiceSource, source)
  }

  const getPracticeSource = (): PracticeSource =>
    getStringValue(contextKeys.practiceSource) === 'rag' ? 'rag' : 'base'

  const saveLastUploadedMdName = (fileName: string) => {
    const normalizedFileName = fileName.trim()

    if (normalizedFileName) {
      setStringValue(contextKeys.lastUploadedMdName, normalizedFileName)
    }
  }

  const getLastUploadedMdName = () => getStringValue(contextKeys.lastUploadedMdName)

  const clearPracticeContext = () => {
    removeValue(contextKeys.practiceSet)
    removeValue(contextKeys.practiceSource)
    removeValue(contextKeys.lastUploadedMdName)
  }

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
