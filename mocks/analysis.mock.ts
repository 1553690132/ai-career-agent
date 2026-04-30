import type { AnalysisResult } from '../types/analysis'

export const mockAnalysisResult: AnalysisResult = {
  resume: {
    name: '林澈',
    headline: '前端开发工程师 | Vue / JavaScript / 小程序',
    summary:
      '3 年前端开发经验，主要负责 Vue 后台系统、移动端 H5 和微信小程序开发，熟悉组件拆分、接口联调和业务页面交付。',
    location: '上海',
    yearsOfExperience: 3,
    seniorityLevel: 'mid',
    targetRoles: ['前端开发工程师', 'Vue 前端工程师', 'Web 前端工程师'],
    skills: [
      {
        name: 'Vue',
        category: 'framework',
        level: 'advanced',
        yearsOfExperience: 3,
        evidence: '在多个后台管理系统中负责 Vue 页面开发、组件封装和状态管理。',
      },
      {
        name: 'JavaScript',
        category: 'programming',
        level: 'advanced',
        yearsOfExperience: 3,
        evidence: '熟悉 ES6+ 语法，能独立完成复杂表单、列表筛选和异步数据处理。',
      },
      {
        name: 'HTML/CSS',
        category: 'programming',
        level: 'advanced',
        yearsOfExperience: 3,
        evidence: '能够根据设计稿完成响应式页面和常见交互动效。',
      },
      {
        name: 'Element Plus',
        category: 'framework',
        level: 'intermediate',
        yearsOfExperience: 2,
        evidence: '使用 Element Plus 搭建中后台表单、表格和弹窗交互。',
      },
      {
        name: 'TypeScript',
        category: 'programming',
        level: 'beginner',
        yearsOfExperience: 0.5,
        evidence: '在个人项目中有少量类型标注经验，工作项目使用较少。',
      },
    ],
    workExperiences: [
      {
        company: '上海云栈科技有限公司',
        title: '前端开发工程师',
        startDate: '2023-06',
        endDate: '2026-03',
        isCurrent: false,
        summary: '负责 SaaS 后台系统、运营活动页和小程序页面的前端开发。',
        highlights: [
          '独立完成客户管理、订单管理、数据看板等模块的页面开发和接口联调。',
          '沉淀 20+ 个业务组件，包括高级筛选、批量操作表格和文件上传组件。',
          '参与移动端 H5 活动页开发，支持多端适配和埋点接入。',
        ],
        skills: ['Vue', 'JavaScript', 'Element Plus', 'Pinia', 'Vite'],
      },
    ],
    projects: [
      {
        name: '企业客户管理后台',
        role: '前端负责人',
        summary:
          '面向销售和运营团队的 CRM 后台，包含客户线索、跟进记录、订单流转和数据看板。',
        highlights: [
          '设计并实现可复用的搜索表单和表格配置方案，减少重复页面代码。',
          '接入权限菜单和按钮级权限控制，支持不同角色访问不同操作。',
          '优化列表筛选体验，将常用筛选条件保存到本地状态。',
        ],
        skills: ['Vue', 'JavaScript', 'Pinia', 'Element Plus', 'ECharts'],
      },
      {
        name: '会员增长小程序',
        role: '核心开发',
        summary:
          '用于线下门店拉新和会员积分兑换的小程序项目，包含活动报名、积分明细和优惠券领取。',
        highlights: [
          '完成活动页面、兑换流程和用户授权登录模块。',
          '配合后端完成接口错误处理和加载状态设计。',
        ],
        skills: ['JavaScript', '微信小程序', 'CSS'],
      },
    ],
    education: [
      {
        school: '南京信息工程大学',
        degree: '本科',
        major: '软件工程',
        startDate: '2018-09',
        endDate: '2022-06',
      },
    ],
    certifications: ['大学英语四级'],
    languages: [
      {
        name: '英语',
        category: 'language',
        level: 'intermediate',
      },
    ],
  },
  job: {
    title: '前端开发工程师',
    company: '星河智能科技',
    location: '上海',
    employmentType: 'full_time',
    workMode: 'hybrid',
    seniorityLevel: 'mid',
    summary:
      '负责 AI 产品控制台和数据分析后台的前端开发，要求具备扎实的 Vue、TypeScript 和工程化实践能力。',
    responsibilities: [
      '负责 Vue3 + TypeScript 前端项目的功能开发、组件抽象和体验优化。',
      '与产品、设计、后端和算法团队协作，完成 AI 工作流、数据看板等复杂业务页面。',
      '参与前端工程化建设，包括代码规范、构建优化、组件库维护和测试补充。',
      '持续优化页面性能、加载速度和关键交互体验。',
    ],
    requiredSkills: [
      {
        name: 'Vue3',
        category: 'framework',
        level: 'advanced',
      },
      {
        name: 'TypeScript',
        category: 'programming',
        level: 'advanced',
      },
      {
        name: 'JavaScript',
        category: 'programming',
        level: 'advanced',
      },
      {
        name: '前端工程化',
        category: 'tool',
        level: 'intermediate',
      },
      {
        name: '性能优化',
        category: 'framework',
        level: 'intermediate',
      },
    ],
    preferredSkills: [
      {
        name: '单元测试',
        category: 'tool',
        level: 'intermediate',
      },
      {
        name: 'ECharts',
        category: 'framework',
        level: 'intermediate',
      },
      {
        name: 'AI 产品经验',
        category: 'ai',
        level: 'beginner',
      },
    ],
    requiredYearsOfExperience: 3,
    educationRequirements: ['本科及以上学历，计算机相关专业优先'],
    keywords: [
      'Vue3',
      'TypeScript',
      'JavaScript',
      'Vite',
      '组件化',
      '性能优化',
      '前端工程化',
      '数据可视化',
      '单元测试',
    ],
  },
  overallScore: 68,
  overallSummary:
    '候选人与岗位的业务开发经验和 Vue 技术栈匹配度较好，能够支撑常规中后台页面开发。但岗位强调 TypeScript、性能优化和前端工程化，候选人在这些方面证据不足，建议补强后再投递更有竞争力。',
  recommendation: 'borderline',
  scoreCards: [
    {
      label: '技能匹配度',
      score: 70,
      summary: 'Vue 和 JavaScript 基础较好，但 TypeScript 与工程化能力低于岗位要求。',
    },
    {
      label: '项目相关度',
      score: 76,
      summary: '有后台系统、数据看板和小程序经验，业务形态与岗位较接近。',
    },
    {
      label: '经验年限',
      score: 82,
      summary: '3 年经验符合岗位最低要求，具备独立模块交付经历。',
    },
    {
      label: '成长风险',
      score: 55,
      summary: '关键短板集中在 TypeScript 深度、性能优化方法论和工程化实践。',
    },
  ],
  skillMatches: [
    {
      skillName: 'Vue3',
      category: 'framework',
      matchLevel: 'strong',
      resumeEvidence: '多个后台系统中负责 Vue 页面开发、组件封装和状态管理。',
      jobRequirement: '负责 Vue3 + TypeScript 前端项目开发。',
      score: 85,
    },
    {
      skillName: 'JavaScript',
      category: 'programming',
      matchLevel: 'strong',
      resumeEvidence: '熟悉 ES6+，能完成复杂表单、列表筛选和异步数据处理。',
      jobRequirement: '要求扎实的 JavaScript 基础。',
      score: 84,
    },
    {
      skillName: 'TypeScript',
      category: 'programming',
      matchLevel: 'weak',
      resumeEvidence: '仅在个人项目中有少量类型标注经验。',
      jobRequirement: '岗位要求熟练使用 TypeScript 进行复杂业务开发。',
      score: 38,
    },
    {
      skillName: '前端工程化',
      category: 'tool',
      matchLevel: 'partial',
      resumeEvidence: '使用过 Vite 和组件沉淀，但缺少规范、测试、构建优化等描述。',
      jobRequirement: '参与代码规范、构建优化、组件库维护和测试补充。',
      score: 52,
    },
    {
      skillName: '性能优化',
      category: 'framework',
      matchLevel: 'missing',
      resumeEvidence: '简历中没有明确性能指标、优化手段或监控数据。',
      jobRequirement: '持续优化页面性能、加载速度和关键交互体验。',
      score: 28,
    },
    {
      skillName: 'ECharts',
      category: 'framework',
      matchLevel: 'partial',
      resumeEvidence: 'CRM 项目中使用 ECharts 开发数据看板。',
      jobRequirement: '有数据可视化经验优先。',
      score: 65,
    },
  ],
  strengths: [
    '具备 3 年前端开发经验，符合岗位基础年限要求。',
    'Vue 和 JavaScript 经验较扎实，能独立完成中后台业务模块。',
    '有 CRM、数据看板、小程序等真实业务项目经历，项目类型与岗位较接近。',
    '简历中体现了一定组件复用意识，例如搜索表单、表格配置和业务组件沉淀。',
  ],
  gaps: [
    {
      title: 'TypeScript 熟练度不足',
      description:
        '岗位要求在 Vue3 项目中熟练使用 TypeScript，但候选人简历只体现少量个人项目经验，缺少复杂类型、组件 Props、接口模型等实践证据。',
      priority: 'high',
      relatedSkills: ['TypeScript', 'Vue3'],
      improvementAdvice:
        '补充 1-2 个 TypeScript 实战项目描述，突出接口类型建模、组件类型约束、泛型工具类型或重构收益。',
    },
    {
      title: '性能优化经验缺少量化结果',
      description:
        '简历没有展示首屏加载、包体积、接口并发、列表渲染等性能优化案例，难以证明能承担岗位中的体验优化要求。',
      priority: 'high',
      relatedSkills: ['性能优化', 'Vite', 'Vue'],
      improvementAdvice:
        '加入具体优化场景和指标，例如首屏时间下降、包体积减少、长列表渲染流畅度提升等。',
    },
    {
      title: '前端工程化表达偏弱',
      description:
        '候选人使用过 Vite 和组件库，但缺少代码规范、构建配置、测试、CI 或组件库维护的完整经验说明。',
      priority: 'medium',
      relatedSkills: ['前端工程化', 'Vite', '单元测试'],
      improvementAdvice:
        '在项目经历中补充 ESLint、Prettier、Git 工作流、构建优化、组件文档或测试覆盖的实践。',
    },
    {
      title: 'AI 产品相关经验不足',
      description:
        '岗位面向 AI 产品控制台和数据分析后台，候选人暂无 AI 工作流、模型配置或智能分析类页面经验。',
      priority: 'low',
      relatedSkills: ['AI 产品经验', '数据看板'],
      improvementAdvice:
        '可以用个人项目补充 AI 简历分析、智能问答或数据标注控制台等相关场景。',
    },
  ],
  resumeSuggestions: [
    {
      id: 'suggestion-001',
      type: 'skill',
      title: '强化 TypeScript 技能呈现',
      priority: 'high',
      problem:
        '当前简历中 TypeScript 只被轻描淡写提到，无法支撑岗位对 TypeScript 的核心要求。',
      suggestion:
        '在技能列表和项目经历中分别补充 TypeScript 使用场景，说明你如何定义接口类型、约束组件入参、处理接口响应类型和减少运行时错误。',
      exampleRewrite:
        '使用 Vue3 + TypeScript 重构客户管理模块，抽象 Customer、Order、Pagination 等核心接口类型，并为表单组件补充 Props 和 Emits 类型约束，减少联调阶段字段错误。',
      relatedKeywords: ['TypeScript', 'Vue3', 'Props', '接口类型', '类型约束'],
    },
    {
      id: 'suggestion-002',
      type: 'project',
      title: '为项目成果补充量化指标',
      priority: 'high',
      problem:
        '项目描述能看出你做了什么，但缺少业务结果和技术结果，竞争力不够突出。',
      suggestion:
        '把“完成页面开发”改成“解决了什么问题，带来了什么效果”，优先补充效率、性能、稳定性或复用率指标。',
      exampleRewrite:
        '沉淀高级筛选、批量表格、文件上传等 20+ 个业务组件，使同类管理页面开发周期从 3 天缩短到 1.5 天。',
      relatedKeywords: ['量化成果', '组件复用', '开发效率'],
    },
    {
      id: 'suggestion-003',
      type: 'keyword',
      title: '补齐岗位关键词',
      priority: 'medium',
      problem:
        '岗位 JD 中的“前端工程化、性能优化、单元测试”等关键词在简历中出现较少。',
      suggestion:
        '如果确实有相关经验，应在技能和项目经历中自然加入这些关键词，避免只堆关键词而没有证据。',
      exampleRewrite:
        '参与项目工程化配置维护，统一 ESLint、Prettier 和 Git 提交规范，并配合 Vite 拆包优化首屏资源加载。',
      relatedKeywords: ['前端工程化', '性能优化', '单元测试', 'Vite'],
    },
    {
      id: 'suggestion-004',
      type: 'summary',
      title: '调整个人总结以贴合岗位',
      priority: 'medium',
      problem:
        '个人总结偏通用，尚未突出“Vue3 + TypeScript + 中后台复杂页面”的岗位定位。',
      suggestion:
        '用 2-3 句话概括核心技术栈、业务类型、可交付能力和正在补强的方向。',
      exampleRewrite:
        '3 年前端开发经验，长期负责 Vue 中后台系统和数据看板开发，熟悉组件化、权限控制和接口联调。近期重点使用 TypeScript 完善业务类型建模，并持续补强性能优化和工程化实践。',
      relatedKeywords: ['Vue3', 'TypeScript', '中后台', '组件化'],
    },
  ],
  interviewQuestions: [
    {
      id: 'question-001',
      type: 'technical',
      difficulty: 'medium',
      question:
        '在 Vue3 项目中，你会如何为一个可复用表格组件设计 TypeScript 类型？',
      intent:
        '考察候选人是否理解 Props、泛型、表格列配置、事件回调等类型设计能力。',
      relatedSkills: ['Vue3', 'TypeScript', '组件封装'],
      suggestedAnswerPoints: [
        '用泛型描述行数据类型，例如 TableColumn<T>。',
        '为列配置、分页参数、选择事件和操作回调分别定义类型。',
        '说明类型约束如何减少字段拼写错误和联调成本。',
      ],
    },
    {
      id: 'question-002',
      type: 'technical',
      difficulty: 'medium',
      question:
        '如果一个 Vue 后台列表页首屏加载慢，你会从哪些方向定位和优化？',
      intent:
        '考察性能优化思路是否系统，是否能结合网络、资源、渲染和业务接口分析。',
      relatedSkills: ['性能优化', 'Vue', 'Vite'],
      suggestedAnswerPoints: [
        '先用 Performance、Network、Lighthouse 等工具定位瓶颈。',
        '检查接口耗时、资源体积、路由懒加载、组件渲染和大列表处理。',
        '结合缓存、分页、虚拟列表、按需加载和拆包说明优化方案。',
      ],
    },
    {
      id: 'question-003',
      type: 'project',
      difficulty: 'medium',
      question:
        '你在 CRM 后台项目中沉淀了哪些组件？这些组件如何保证灵活性和可维护性？',
      intent:
        '考察候选人项目经验真实性，以及组件抽象、配置设计和边界控制能力。',
      relatedSkills: ['Vue', '组件化', 'Element Plus'],
      suggestedAnswerPoints: [
        '举例说明搜索表单、表格、上传组件等具体组件。',
        '解释哪些能力做成配置，哪些能力保留插槽或回调扩展。',
        '说明如何处理不同业务页面的差异。',
      ],
    },
    {
      id: 'question-004',
      type: 'technical',
      difficulty: 'hard',
      question:
        '你如何理解前端工程化？如果加入我们团队，你会优先从哪些方面提升项目质量？',
      intent:
        '验证候选人是否具备代码规范、构建、测试、协作流程和可维护性意识。',
      relatedSkills: ['前端工程化', 'Vite', '单元测试'],
      suggestedAnswerPoints: [
        '从规范、构建、测试、文档、发布流程和监控几个维度回答。',
        '结合 ESLint、Prettier、提交规范、CI、组件文档等实践。',
        '说明会先观察项目痛点，再选择低成本高收益的改进项。',
      ],
    },
    {
      id: 'question-005',
      type: 'behavioral',
      difficulty: 'easy',
      question:
        '请讲一次你和后端或产品在需求理解上出现分歧时，是如何推进问题解决的？',
      intent:
        '考察跨职能沟通、问题拆解和推动落地能力。',
      relatedSkills: ['沟通协作', '需求分析'],
      suggestedAnswerPoints: [
        '说明背景、分歧点和影响范围。',
        '描述如何用原型、接口文档或用户场景对齐信息。',
        '强调最终结果和复盘收获。',
      ],
    },
  ],
  generatedAt: '2026-04-29T20:10:00+08:00',
}
