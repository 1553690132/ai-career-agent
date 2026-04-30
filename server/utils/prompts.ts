const strictJsonInstruction = `
STRICT JSON OUTPUT RULES:
- Return exactly one complete JSON object.
- Do not output explanations, markdown, code fences, comments, or extra text.
- Do not use null. Use "", [], 0, or "unknown" when data is missing.
- All object keys and string values must use double quotes.
- Do not use trailing commas.
- Do not add fields outside the schema.
- Prioritize valid, complete JSON over rich detail.
`.trim()

export const createResumeExtractPrompt = (resumeText: string, roleType: string) => `
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

export const createJobExtractPrompt = (jobText: string, roleType: string) => `
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

export const createAnalysisPrompt = (analysisInput: string, roleType: string) => `
Create a compact ${roleType} match JSON.
${strictJsonInstruction}
Do not include resume or job. Server will merge them later.

Use only these category values:
programming, framework, tool, cloud, database, ai, domain, soft_skill, language, other.
Never output "performance".

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
