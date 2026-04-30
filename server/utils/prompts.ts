const strictJsonInstruction = `
Return valid JSON only.
No markdown, no code fences, no comments, no explanation.
Use empty strings, empty arrays, 0, or "unknown" when unsure.
Keep output compact.
`.trim()

export const createResumeExtractPrompt = (resumeText: string, roleType: string) => `
Extract a minimal resume JSON for ${roleType}.
${strictJsonInstruction}

Output exactly this shape:
{
  "name": "string",
  "headline": "string",
  "summary": "max 50 Chinese chars",
  "yearsOfExperience": 0,
  "seniorityLevel": "intern | junior | mid | senior | unknown",
  "targetRoles": ["string"],
  "skills": ["string"],
  "projects": [
    {
      "name": "string",
      "summary": "max 30 Chinese chars",
      "skills": ["string"]
    }
  ],
  "education": ["string"]
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

Output exactly this shape:
{
  "title": "string",
  "company": "string",
  "summary": "max 50 Chinese chars",
  "seniorityLevel": "intern | junior | mid | senior | unknown",
  "responsibilities": ["string"],
  "requiredSkills": ["string"],
  "preferredSkills": ["string"],
  "requiredYearsOfExperience": 0,
  "educationRequirements": ["string"],
  "keywords": ["string"]
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
Do not include resume or job.

Allowed skill category values:
programming, framework, tool, cloud, database, ai, domain, soft_skill, language, other.
Never output category "performance"; use "tool" or "other".

Output fields only:
overallScore, overallSummary, recommendation, scoreCards, skillMatches, strengths, gaps, resumeSuggestions, interviewQuestions, generatedAt.

Limits:
- scoreCards: exactly 4.
- skillMatches: max 5.
- strengths: max 3.
- gaps: max 2.
- resumeSuggestions: max 2.
- interviewQuestions: max 3.
- Keep each text field under 18 Chinese chars when possible.

Required shapes:
{
  "overallScore": 0,
  "overallSummary": "string",
  "recommendation": "highly_recommended | recommended | borderline | not_recommended",
  "scoreCards": [{"label":"string","score":0,"summary":"string"}],
  "skillMatches": [{"skillName":"string","category":"programming | framework | tool | cloud | database | ai | domain | soft_skill | language | other","matchLevel":"strong | partial | weak | missing","resumeEvidence":"string","jobRequirement":"string","score":0}],
  "strengths": ["string"],
  "gaps": [{"title":"string","description":"string","priority":"high | medium | low","relatedSkills":["string"],"improvementAdvice":"string"}],
  "resumeSuggestions": [{"id":"s1","type":"summary | experience | project | skill | keyword | format | other","title":"string","priority":"high | medium | low","problem":"string","suggestion":"string","exampleRewrite":"string","relatedKeywords":["string"]}],
  "interviewQuestions": [{"id":"q1","type":"technical | project | behavioral | system_design | case_study | other","difficulty":"easy | medium | hard","question":"string","intent":"string","relatedSkills":["string"],"suggestedAnswerPoints":["string"]}],
  "generatedAt": "ISO datetime"
}

Input:
${analysisInput}
`.trim()
