import type { JobProfile, ResumeProfile } from '../../types/analysis'

export const createCompactAnalysisInput = (resume: ResumeProfile, job: JobProfile) => ({
  resume: {
    summary: resume.summary ?? '',
    yearsOfExperience: resume.yearsOfExperience ?? 0,
    skills: resume.skills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    projects: resume.projects.slice(0, 2).map((project) => ({
      name: project.name,
      summary: project.summary,
      skills: project.skills.slice(0, 5),
    })),
  },
  job: {
    title: job.title,
    summary: job.summary ?? '',
    requiredSkills: job.requiredSkills.map((skill) => skill.name).filter(Boolean).slice(0, 8),
    preferredSkills: job.preferredSkills?.map((skill) => skill.name).filter(Boolean).slice(0, 5) ?? [],
    keywords: job.keywords.slice(0, 10),
  },
})
