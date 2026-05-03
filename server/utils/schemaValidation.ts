export class SchemaValidationError extends Error {
  constructor(message: string) {
    super(`Schema validation failed: ${message}`)
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)

const isString = (value: unknown): value is string => typeof value === 'string'

const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every(isString)

const assertRecord = (value: unknown, path: string): Record<string, unknown> => {
  if (!isRecord(value)) {
    throw new SchemaValidationError(`${path} must be an object`)
  }

  return value
}

const assertStringField = (data: Record<string, unknown>, field: string, path = field) => {
  if (!isString(data[field])) {
    throw new SchemaValidationError(`${path} must be a string`)
  }
}

const assertNumberField = (data: Record<string, unknown>, field: string, path = field) => {
  if (!isNumber(data[field])) {
    throw new SchemaValidationError(`${path} must be a number`)
  }
}

const assertStringArrayField = (data: Record<string, unknown>, field: string, path = field) => {
  if (!isStringArray(data[field])) {
    throw new SchemaValidationError(`${path} must be a string array`)
  }
}

const assertObjectArrayField = (
  data: Record<string, unknown>,
  field: string,
): Record<string, unknown>[] => {
  const value = data[field]

  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new SchemaValidationError(`${field} must be an object array`)
  }

  return value
}

export const validateResumeJson = (data: unknown): void => {
  const resume = assertRecord(data, 'resume')

  ;['name', 'headline', 'summary', 'seniorityLevel'].forEach((field) => {
    assertStringField(resume, field)
  })
  assertNumberField(resume, 'yearsOfExperience')
  ;['targetRoles', 'skills', 'education'].forEach((field) => {
    assertStringArrayField(resume, field)
  })

  assertObjectArrayField(resume, 'projects').forEach((project, index) => {
    assertStringField(project, 'name', `projects[${index}].name`)
    assertStringField(project, 'summary', `projects[${index}].summary`)
    assertStringArrayField(project, 'skills', `projects[${index}].skills`)
  })
}

export const validateJobJson = (data: unknown): void => {
  const job = assertRecord(data, 'job')

  ;['title', 'company', 'summary', 'seniorityLevel'].forEach((field) => {
    assertStringField(job, field)
  })
  assertNumberField(job, 'requiredYearsOfExperience')
  ;['responsibilities', 'requiredSkills', 'preferredSkills', 'educationRequirements', 'keywords'].forEach(
    (field) => {
      assertStringArrayField(job, field)
    },
  )
}

export const validateAnalysisResult = (data: unknown): void => {
  const analysis = assertRecord(data, 'analysis')

  assertNumberField(analysis, 'overallScore')
  ;['overallSummary', 'recommendation'].forEach((field) => {
    assertStringField(analysis, field)
  })
  if (analysis.generatedAt !== undefined) {
    assertStringField(analysis, 'generatedAt')
  }
  assertStringArrayField(analysis, 'strengths')

  assertObjectArrayField(analysis, 'scoreCards').forEach((item, index) => {
    assertStringField(item, 'label', `scoreCards[${index}].label`)
    assertNumberField(item, 'score', `scoreCards[${index}].score`)
    assertStringField(item, 'summary', `scoreCards[${index}].summary`)
  })

  assertObjectArrayField(analysis, 'skillMatches').forEach((item, index) => {
    ;['skillName', 'category', 'matchLevel', 'resumeEvidence', 'jobRequirement'].forEach((field) => {
      assertStringField(item, field, `skillMatches[${index}].${field}`)
    })
    assertNumberField(item, 'score', `skillMatches[${index}].score`)
  })

  assertObjectArrayField(analysis, 'gaps').forEach((item, index) => {
    ;['title', 'description', 'priority', 'improvementAdvice'].forEach((field) => {
      assertStringField(item, field, `gaps[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedSkills', `gaps[${index}].relatedSkills`)
  })

  assertObjectArrayField(analysis, 'resumeSuggestions').forEach((item, index) => {
    ;['id', 'type', 'title', 'priority', 'problem', 'suggestion', 'exampleRewrite'].forEach((field) => {
      assertStringField(item, field, `resumeSuggestions[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedKeywords', `resumeSuggestions[${index}].relatedKeywords`)
  })

  assertObjectArrayField(analysis, 'interviewQuestions').forEach((item, index) => {
    ;['id', 'type', 'difficulty', 'question', 'intent'].forEach((field) => {
      assertStringField(item, field, `interviewQuestions[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedSkills', `interviewQuestions[${index}].relatedSkills`)
    assertStringArrayField(
      item,
      'suggestedAnswerPoints',
      `interviewQuestions[${index}].suggestedAnswerPoints`,
    )
  })
}

export const validateAnalysisScoreResult = (data: unknown): void => {
  const analysis = assertRecord(data, 'analysisScore')

  assertNumberField(analysis, 'overallScore')
  ;['overallSummary', 'recommendation'].forEach((field) => {
    assertStringField(analysis, field)
  })
  assertStringArrayField(analysis, 'strengths')

  assertObjectArrayField(analysis, 'scoreCards').forEach((item, index) => {
    assertStringField(item, 'label', `scoreCards[${index}].label`)
    assertNumberField(item, 'score', `scoreCards[${index}].score`)
    assertStringField(item, 'summary', `scoreCards[${index}].summary`)
  })

  assertObjectArrayField(analysis, 'skillMatches').forEach((item, index) => {
    ;['skillName', 'category', 'matchLevel', 'resumeEvidence', 'jobRequirement'].forEach((field) => {
      assertStringField(item, field, `skillMatches[${index}].${field}`)
    })
    assertNumberField(item, 'score', `skillMatches[${index}].score`)
  })

  assertObjectArrayField(analysis, 'gaps').forEach((item, index) => {
    ;['title', 'description', 'priority', 'improvementAdvice'].forEach((field) => {
      assertStringField(item, field, `gaps[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedSkills', `gaps[${index}].relatedSkills`)
  })
}

export const validateAnalysisAdviceResult = (data: unknown): void => {
  const advice = assertRecord(data, 'analysisAdvice')

  assertObjectArrayField(advice, 'resumeSuggestions').forEach((item, index) => {
    ;['id', 'type', 'title', 'priority', 'problem', 'suggestion', 'exampleRewrite'].forEach((field) => {
      assertStringField(item, field, `resumeSuggestions[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedKeywords', `resumeSuggestions[${index}].relatedKeywords`)
  })

  assertObjectArrayField(advice, 'interviewQuestions').forEach((item, index) => {
    ;['id', 'type', 'difficulty', 'question', 'intent'].forEach((field) => {
      assertStringField(item, field, `interviewQuestions[${index}].${field}`)
    })
    assertStringArrayField(item, 'relatedSkills', `interviewQuestions[${index}].relatedSkills`)
    assertStringArrayField(
      item,
      'suggestedAnswerPoints',
      `interviewQuestions[${index}].suggestedAnswerPoints`,
    )
  })
}

export const validatePracticeSet = (data: unknown): void => {
  const practiceSet = assertRecord(data, 'practiceSet')

  assertStringField(practiceSet, 'roleType')
  assertStringArrayField(practiceSet, 'weakSkills')

  assertObjectArrayField(practiceSet, 'questions').forEach((question, index) => {
    ;['id', 'skill', 'difficulty', 'question', 'intent'].forEach((field) => {
      assertStringField(question, field, `questions[${index}].${field}`)
    })
    if (question.relatedGap !== undefined) {
      assertStringField(question, 'relatedGap', `questions[${index}].relatedGap`)
    }
    assertStringArrayField(question, 'answerTips', `questions[${index}].answerTips`)
  })
}
