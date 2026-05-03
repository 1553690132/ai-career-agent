import { createPracticeQuestionPrompt } from '../utils/prompts'
import { callWithLangChain } from '../utils/langchainSparkModel'
import { AiJsonParseError, getErrorMessage, parseAiJsonResponse } from '../utils/json'
import { SchemaValidationError, validatePracticeSet } from '../utils/schemaValidation'
import { logChainMetrics, type ChainErrorStage } from '../utils/chainMetrics'
import type {
  AnalysisResult,
  GapItem,
  PracticeQuestion,
  PracticeSet,
  SkillMatch,
} from '../../types/analysis'

export interface PracticeQuestionChainInput {
  analysisResult: AnalysisResult
  roleType: string
  retrievedContext?: string[]
}

export type PracticeQuestionChainOutput = PracticeSet

const maxStructuredRetries = 1
const structuredRetryDelay = 500
const weakMatchLevels = ['weak', 'missing', 'partial']

const delay = (milliseconds: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })

const isStructuredOutputError = (error: unknown) =>
  error instanceof AiJsonParseError || error instanceof SchemaValidationError

const normalizeSkill = (skill: string) => skill.trim()

const appendUnique = (items: string[], item: string, limit: number) => {
  const normalized = normalizeSkill(item)

  if (!normalized || items.includes(normalized) || items.length >= limit) {
    return
  }

  items.push(normalized)
}

export const extractWeakSkills = (analysisResult: AnalysisResult, limit = 6): string[] => {
  const weakSkills: string[] = []

  analysisResult.gaps.forEach((gap) => {
    appendUnique(weakSkills, gap.title, limit)
    gap.relatedSkills?.forEach((skill) => {
      appendUnique(weakSkills, skill, limit)
    })
  })

  analysisResult.skillMatches
    .filter((skill) => weakMatchLevels.includes(skill.matchLevel))
    .forEach((skill) => {
      appendUnique(weakSkills, skill.skillName, limit)
    })

  return weakSkills.slice(0, limit)
}

const createPracticeInput = (
  analysisResult: AnalysisResult,
  roleType: string,
  weakSkills: string[],
  retrievedContext: string[] = [],
) => {
  const weakSkillSet = new Set(weakSkills)
  const weakSkillMatches = analysisResult.skillMatches
    .filter((skill) => weakMatchLevels.includes(skill.matchLevel) || weakSkillSet.has(skill.skillName))
    .slice(0, 6)
    .map((skill: SkillMatch) => ({
      skillName: skill.skillName,
      category: skill.category,
      matchLevel: skill.matchLevel,
      score: skill.score,
      resumeEvidence: skill.resumeEvidence ?? '',
      jobRequirement: skill.jobRequirement ?? '',
    }))

  return {
    roleType,
    weakSkills,
    gaps: analysisResult.gaps.slice(0, 6).map((gap: GapItem) => ({
      title: gap.title,
      priority: gap.priority,
      description: gap.description,
      improvementAdvice: gap.improvementAdvice ?? '',
      relatedSkills: gap.relatedSkills?.slice(0, 3) ?? [],
    })),
    weakSkillMatches,
    retrievedContext: retrievedContext.slice(0, 4),
  }
}

export const createFallbackPracticeSet = (
  analysisResult: AnalysisResult,
  roleType: string,
): PracticeSet => {
  const weakSkills = extractWeakSkills(analysisResult)
  const fallbackSkills = weakSkills.length > 0 ? weakSkills : ['简历表达']
  const questions: PracticeQuestion[] = fallbackSkills.slice(0, 6).map((skill, index) => {
    const relatedGap = analysisResult.gaps.find((gap) =>
      gap.title === skill || gap.relatedSkills?.includes(skill),
    )

    return {
      id: `fallback-practice-${index + 1}`,
      skill,
      difficulty: index < 2 ? 'easy' : index < 4 ? 'medium' : 'hard',
      question: `请结合你的项目经历，说明你如何提升${skill}能力？`,
      intent: `考察${skill}的理解和实践表达`,
      answerTips: [
        '先说明具体场景',
        '再讲你的行动',
        '最后量化结果',
      ],
      relatedGap: relatedGap?.title ?? '',
    }
  })

  return {
    roleType,
    weakSkills: fallbackSkills.slice(0, 6),
    questions,
  }
}

export const practiceQuestionChain = {
  async invoke(input: PracticeQuestionChainInput): Promise<PracticeQuestionChainOutput> {
    console.log('[Chain] practice_question start')
    const weakSkills = extractWeakSkills(input.analysisResult)
    const practiceInput = createPracticeInput(
      input.analysisResult,
      input.roleType,
      weakSkills,
      input.retrievedContext,
    )
    const practiceInputText = JSON.stringify(practiceInput)
    const prompt = createPracticeQuestionPrompt(practiceInputText)
    const startTime = Date.now()
    const inputLength = practiceInputText.length
    let outputLength = 0

    for (let attempt = 0; attempt <= maxStructuredRetries; attempt += 1) {
      let errorStage: ChainErrorStage = 'llm'

      try {
        const content = await callWithLangChain(prompt, {
          temperature: 0,
          maxTokens: 1000,
        })
        outputLength = content.length
        errorStage = 'parse'
        const practiceJson = parseAiJsonResponse<PracticeQuestionChainOutput>(content)
        errorStage = 'validate'
        validatePracticeSet(practiceJson)

        logChainMetrics({
          chainName: 'practice_question',
          success: true,
          duration: Date.now() - startTime,
          inputLength,
          outputLength,
          usedFallback: false,
        })
        console.log('[Chain] practice_question success')
        return {
          ...practiceJson,
          roleType: practiceJson.roleType || input.roleType,
          weakSkills: practiceJson.weakSkills.slice(0, 6),
          questions: practiceJson.questions.slice(0, 6),
        }
      } catch (error: unknown) {
        if (!isStructuredOutputError(error) || attempt === maxStructuredRetries) {
          logChainMetrics({
            chainName: 'practice_question',
            success: false,
            duration: Date.now() - startTime,
            inputLength,
            outputLength,
            usedFallback: false,
            errorStage,
          })
          console.error('[Chain] practice_question error', getErrorMessage(error))
          throw error
        }

        console.warn(
          `[Chain] practice_question structured output invalid, retrying once: ${getErrorMessage(error)}`,
        )
        await delay(structuredRetryDelay)
      }
    }

    throw new Error('Practice question chain failed')
  },
}

export const runPracticeQuestionChain = (input: PracticeQuestionChainInput) =>
  practiceQuestionChain.invoke(input)

