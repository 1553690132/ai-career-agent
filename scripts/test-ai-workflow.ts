import type { AnalysisResult, JobProfile, ResumeProfile } from '../types/analysis'

const baseURL = process.env.AI_WORKFLOW_BASE_URL ?? 'http://localhost:3000'
const roleType = '前端开发'

const sampleResumeText = `
张三，前端开发工程师，3 年前端开发经验。
熟悉 Vue3、JavaScript、HTML、CSS、Element Plus，参与过后台管理系统、数据看板和移动端活动页开发。
曾负责 CRM 管理系统的客户列表、表单配置、权限菜单和数据可视化模块，实现组件封装、接口联调、页面状态管理和基础性能优化。
项目中使用 Vue、Vue Router、Pinia、Axios、ECharts、Vite 等技术，能够独立完成需求拆解、页面开发和缺陷修复。
教育背景为计算机科学与技术本科。
`.trim()

const sampleJobText = `
岗位：前端开发工程师。
职责：负责公司 SaaS 后台管理系统的前端开发，参与需求评审、页面开发、组件封装、接口联调和线上问题排查；
与产品、设计、后端协作完成业务模块交付；持续优化页面性能、工程化流程和用户体验。
要求：熟悉 Vue3、JavaScript、TypeScript、HTML、CSS，了解 Vite、Vue Router、Pinia、Axios；
具备后台系统或数据可视化项目经验；了解前端性能优化、组件化设计和代码规范。
加分项：熟悉 ECharts、单元测试、CI/CD、微前端或低代码平台经验。
本科及以上学历，计算机相关专业优先。
`.trim()

const postJson = async <TResponse>(path: string, body: unknown): Promise<TResponse> => {
  const response = await fetch(`${baseURL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const responseText = await response.text()

  if (!response.ok) {
    throw new Error(`${path} failed with ${response.status}: ${responseText}`)
  }

  return JSON.parse(responseText) as TResponse
}

const printStep = (title: string, data: unknown) => {
  console.log(`\n===== ${title} =====`)
  console.log(JSON.stringify(data, null, 2))
}

const main = async () => {
  console.log(`Testing AI workflow against ${baseURL}`)

  const resumeJson = await postJson<ResumeProfile>('/api/resume-extract', {
    resumeText: sampleResumeText,
    roleType,
  })
  printStep('1. resume_extract result', resumeJson)

  const jobJson = await postJson<JobProfile>('/api/job-extract', {
    jobText: sampleJobText,
    roleType,
  })
  printStep('2. job_extract result', jobJson)

  const analysisResult = await postJson<AnalysisResult>('/api/analyze-match', {
    resumeJson,
    jobJson,
    roleType,
  })
  printStep('3. analysis_match result', analysisResult)
}

main().catch((error: unknown) => {
  console.error('\nAI workflow test failed.')
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
