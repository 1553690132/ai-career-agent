// 所有结构化输出链共用的硬性 JSON 规则，降低模型输出 Markdown 或多余字段的概率。
const strictJsonInstruction = `
STRICT JSON OUTPUT RULES:
- Return exactly one complete JSON object.
- Do not output explanations, markdown, code fences, comments, or extra text.
- Do not use null. Use "", [], 0, or "unknown" when data is missing.
- All object keys and string values must use double quotes.
- Do not use trailing commas.
- Do not add fields outside the schema.
- Prioritize valid, complete JSON over rich detail.
- All text content must be in Chinese.
- Do not output English unless it is a technical keyword (e.g. Vue, TypeScript).
`.trim()

// 中文输出约束会拼进每个 prompt，确保最终给用户看的建议尽量保持中文。
const chineseOutputInstruction = `
IMPORTANT:
- 所有字段内容必须使用中文表达。
- 禁止使用英文句子。
- 技术名词可保留英文，如 Vue、React、TypeScript。
- 不允许中英混合句子。
- 不允许输出 "You should..." 这类英文建议。
`.trim()

// 简历抽取 prompt：把原始简历文本压缩成后续分析可用的标准 resume JSON。
export const createResumeExtractPrompt = (resumeText: string, roleType: string) => `
${chineseOutputInstruction}

Extract a minimal resume JSON for ${roleType}.
${strictJsonInstruction}

Schema and field types:
{
  "name": "string",
  "headline": "string",
  "summary": "string, max 50 Chinese chars",
  "yearsOfExperience": "number",
  "seniorityLevel": "string enum: intern | junior | mid | senior | unknown",
  "targetRoles": "string[]",
  "skills": "string[]",
  "projects": [
    {
      "name": "string",
      "summary": "string, max 30 Chinese chars",
      "skills": "string[]"
    }
  ],
  "education": "string[]"
}

Limits:
- skills: max 8 strings.
- projects: max 2.
- project.skills: max 5 strings.
- education: max 2 strings.
- Do not output workExperiences, certifications, languages, highlights, evidence, category, level, or extra fields.

Resume:
${resumeText}
`.trim()

// JD 抽取 prompt：把岗位描述整理成职责、技能、年限等结构化字段。
export const createJobExtractPrompt = (jobText: string, roleType: string) => `
${chineseOutputInstruction}

Extract a minimal job JSON for ${roleType}.
${strictJsonInstruction}

Schema and field types:
{
  "title": "string",
  "company": "string",
  "summary": "string, max 50 Chinese chars",
  "seniorityLevel": "string enum: intern | junior | mid | senior | unknown",
  "responsibilities": "string[]",
  "requiredSkills": "string[]",
  "preferredSkills": "string[]",
  "requiredYearsOfExperience": "number",
  "educationRequirements": "string[]",
  "keywords": "string[]"
}

Limits:
- responsibilities: max 3.
- requiredSkills: max 8 strings.
- preferredSkills: max 5 strings.
- educationRequirements: max 2.
- keywords: max 10.
- Do not output category, level, evidence, or extra fields.

JD:
${jobText}
`.trim()

// 旧版一体化分析 prompt：一次性生成评分、匹配、差距、简历建议和面试题。
export const createAnalysisPrompt = (analysisInput: string, roleType: string) => `
${chineseOutputInstruction}

Create a compact ${roleType} match JSON.
${strictJsonInstruction}
Do not include resume or job. Server will merge them later.

Use only these category values:
programming, framework, tool, cloud, database, ai, domain, soft_skill, language, other.
Never output "performance".
Only skillMatches.category uses the category enum above.
scoreCards.label must be a natural short Chinese display phrase, not an enum or English category.
Good label examples: 前端基础, Vue能力, 工程化能力, 项目相关度, TypeScript能力, 经验匹配度.
Forbidden scoreCards.label values: programming, framework, tool, cloud, database, program, framew, progra, db.

Return this exact schema:
{
  "overallScore": "number, 0-100",
  "overallSummary": "string, max 20 Chinese chars",
  "recommendation": "highly_recommended | recommended | borderline | not_recommended",
  "scoreCards": [{"label":"string","score":"number","summary":"string"}],
  "skillMatches": [{"skillName":"string","category":"string","matchLevel":"strong | partial | weak | missing","resumeEvidence":"string","jobRequirement":"string","score":"number"}],
  "strengths": "string[]",
  "gaps": [{"title":"string","description":"string","priority":"high | medium | low","relatedSkills":"string[]","improvementAdvice":"string"}],
  "resumeSuggestions": [{"id":"string","type":"summary | experience | project | skill | keyword | format | other","title":"string","priority":"high | medium | low","problem":"string","suggestion":"string","exampleRewrite":"string","relatedKeywords":"string[]"}],
  "interviewQuestions": [{"id":"string","type":"technical | project | behavioral | system_design | case_study | other","difficulty":"easy | medium | hard","question":"string","intent":"string","relatedSkills":"string[]","suggestedAnswerPoints":"string[]"}]
}

Limits:
- scoreCards: exactly 4.
- skillMatches: max 5.
- strengths: max 3.
- gaps: max 2.
- resumeSuggestions: max 2.
- interviewQuestions: max 3.
- relatedSkills/relatedKeywords/suggestedAnswerPoints: max 2 strings.
- Keep every string under 12 Chinese chars except question under 24 chars.

Input:
${analysisInput}
`.trim()

// 分数链 prompt：只负责匹配评分相关结果，方便和建议链拆开处理。
export const createAnalysisScorePrompt = (analysisInput: string, roleType: string) => `
${chineseOutputInstruction}

Create a compact ${roleType} scoring JSON.
${strictJsonInstruction}
Do not include resume, job, resumeSuggestions, or interviewQuestions.

Use only these category values:
programming, framework, tool, cloud, database, ai, domain, soft_skill, language, other.
Never output "performance".

Return this exact schema:
{
  "overallScore": "number, 0-100",
  "overallSummary": "string, max 40 Chinese chars",
  "recommendation": "highly_recommended | recommended | borderline | not_recommended",
  "scoreCards": [{"label":"string","score":"number","summary":"string"}],
  "skillMatches": [{"skillName":"string","category":"string","matchLevel":"strong | partial | weak | missing","resumeEvidence":"string","jobRequirement":"string","score":"number"}],
  "strengths": "string[]",
  "gaps": [{"title":"string","description":"string","priority":"high | medium | low","relatedSkills":"string[]","improvementAdvice":"string"}]
}

Limits:
- scoreCards: exactly 4.
- scoreCards.label: natural Chinese phrase, max 8 Chinese chars.
- scoreCards.summary: natural Chinese phrase, max 30 Chinese chars.
- scoreCards.summary must be complete, not truncated fragments.
- Bad summary examples: "掌握JS，缺TS深入", "缺TS深", "工程化不".
- Good summary examples: "基础扎实", "缺少TS实践", "项目匹配较高", "工程化经验不足".
- skillMatches: max 6.
- strengths: max 3, each max 40 Chinese chars.
- gaps: max 4.
- gap.description: max 40 Chinese chars.
- gap.improvementAdvice: max 40 Chinese chars.
- gap.relatedSkills: max 2 strings.
- Keep content concise and complete.

Input:
${analysisInput}
`.trim()

// 建议链 prompt：基于评分摘要继续生成简历优化建议和面试题。
export const createAnalysisAdvicePrompt = (
  adviceInput: string,
  roleType: string,
) => `
${chineseOutputInstruction}

Create compact ${roleType} advice JSON.
${strictJsonInstruction}
Return only resumeSuggestions and interviewQuestions.

Return this exact schema:
{
  "resumeSuggestions": [{"id":"string","type":"summary | experience | project | skill | keyword | format | other","title":"string","priority":"high | medium | low","problem":"string","suggestion":"string","exampleRewrite":"string","relatedKeywords":"string[]"}],
  "interviewQuestions": [{"id":"string","type":"technical | project | behavioral | system_design | case_study | other","difficulty":"easy | medium | hard","question":"string","intent":"string","relatedSkills":"string[]","suggestedAnswerPoints":"string[]"}]
}

Limits:
- resumeSuggestions: max 4.
- interviewQuestions: max 4.
- All strings must be short and meaningful.
- problem/suggestion/exampleRewrite: max 40 Chinese chars each.
- question: max 50 Chinese chars.
- intent: max 40 Chinese chars.
- relatedKeywords: max 2 strings.
- relatedSkills: max 2 strings.
- suggestedAnswerPoints: max 2 strings, each max 20 Chinese chars.

Input:
${adviceInput}
`.trim()

// 无 JD 简历诊断的评分 prompt：按目标岗位的通用要求评估简历。
export const createResumeReviewScorePrompt = (resumeJson: string, roleType: string) => `
${chineseOutputInstruction}

Create a compact resume review scoring JSON for target role: ${roleType}.
${strictJsonInstruction}
This is a no-JD resume diagnosis mode. Do not assume any specific company or job description.
Evaluate only against common expectations for the target role type.
Do not include resume, job, resumeSuggestions, or interviewQuestions.

Evaluation dimensions:
- 技能完整度
- 项目表达质量
- 经验匹配度
- 简历可读性
- 岗位关键词覆盖

Use only these category values:
programming, framework, tool, cloud, database, ai, domain, soft_skill, language, other.
Never output "performance".

Return this exact schema:
{
  "overallScore": "number, 0-100",
  "overallSummary": "string, max 50 Chinese chars",
  "recommendation": "highly_recommended | recommended | borderline | not_recommended",
  "scoreCards": [{"label":"string","score":"number","summary":"string"}],
  "skillMatches": [{"skillName":"string","category":"string","matchLevel":"strong | partial | weak | missing","resumeEvidence":"string","jobRequirement":"string","score":"number"}],
  "strengths": "string[]",
  "gaps": [{"title":"string","description":"string","priority":"high | medium | low","relatedSkills":"string[]","improvementAdvice":"string"}]
}

Limits:
- scoreCards: exactly 4.
- scoreCards.label: natural Chinese phrase, max 8 Chinese chars.
- skillMatches: max 6.
- strengths: max 3.
- gaps: max 3.
- gap.relatedSkills: max 2 strings.
- Keep all strings concise and complete.
- jobRequirement should describe generic ${roleType} expectations, not a specific JD.

Resume JSON:
${resumeJson}
`.trim()

// 无 JD 简历诊断的建议 prompt：根据简历和评分摘要给优化建议与面试题。
export const createResumeReviewAdvicePrompt = (
  resumeJson: string,
  roleType: string,
  scoreSummary: string,
) => `
${chineseOutputInstruction}

Create compact resume review advice JSON for target role: ${roleType}.
${strictJsonInstruction}
This is a no-JD resume diagnosis mode. Do not assume any specific company or job description.
Return only resumeSuggestions and interviewQuestions.

Return this exact schema:
{
  "resumeSuggestions": [{"id":"string","type":"summary | experience | project | skill | keyword | format | other","title":"string","priority":"high | medium | low","problem":"string","suggestion":"string","exampleRewrite":"string","relatedKeywords":"string[]"}],
  "interviewQuestions": [{"id":"string","type":"technical | project | behavioral | system_design | case_study | other","difficulty":"easy | medium | hard","question":"string","intent":"string","relatedSkills":"string[]","suggestedAnswerPoints":"string[]"}]
}

Limits:
- resumeSuggestions: max 2.
- interviewQuestions: max 2.
- relatedKeywords: max 2 strings.
- relatedSkills: max 2 strings.
- suggestedAnswerPoints: max 2 strings.
- Keep all strings concise and useful.

Resume JSON:
${resumeJson}

Score summary:
${scoreSummary}
`.trim()

// 练习题 prompt：根据薄弱技能和 RAG 检索上下文生成针对性的练习问题。
export const createPracticeQuestionPrompt = (input: string) => `
${chineseOutputInstruction}

Generate a focused practice question set from weak points.
${strictJsonInstruction}

Return this exact schema:
{
  "roleType": "string",
  "weakSkills": "string[]",
  "questions": [
    {
      "id": "string",
      "skill": "string",
      "difficulty": "easy | medium | hard",
      "question": "string",
      "intent": "string",
      "answerTips": "string[]",
      "relatedGap": "string"
    }
  ]
}

Rules:
- questions: max 6.
- Each weak skill should have at least 1 question when possible.
- question: max 60 Chinese chars.
- answerTips: max 3 strings, each max 30 Chinese chars.
- All natural language content must be Chinese.
- Technical keywords may remain English, such as Vue, TypeScript, React.
- Do not output markdown or explanations.
- Do not invent company-specific requirements.

你可以参考以下学习资料（优先使用）：
Input.retrievedContext

出题规则：
- 如果 provided input 中的 retrievedContext 存在且不为空，必须基于 retrievedContext 出题。
- 如果提供了学习资料，question 内容必须和 retrievedContext 相关。
- 如果提供了学习资料，不允许仅根据 weakSkills 生成通用问题。
- 每个问题应尽量引用 retrievedContext 中的概念或技术点。
- answerTips 可以引用 retrievedContext 中的关键概念。
- 不要编造 retrievedContext 中不存在的概念。
- 如果问题内容未体现学习资料中的知识点，则该问题视为无效。
- 只有当 retrievedContext 为空时，才允许按 weakSkills 正常生成题目。

Input:
${input}
`.trim()
