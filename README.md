
---

# AI Resume–Job Matcher（简历岗位匹配系统）

## 项目简介

本项目是一个基于大模型的简历分析系统，通过结构化抽取与多阶段 AI Workflow，实现对候选人与岗位的自动匹配分析，包括评分、差距识别、优化建议与面试问题生成。

核心目标是提升简历与岗位匹配效率，辅助求职决策。

---

## 核心功能

* 简历解析（Resume Extract）
* 岗位解析（Job Extract）
* 匹配分析（Analysis Match）
* 自动评分（Score）
* 差距识别（Gap Analysis）
* 简历优化建议（Suggestions）
* 面试问题生成（Interview Questions）

---

## 系统架构

用户输入（简历 + JD）

→ runAnalysisWorkflow（统一调度入口）

→ 三个核心 Chain：

* resumeExtractChain
* jobExtractChain
* analysisMatchChain

→ 输出结构化 JSON

→ 前端展示结果（评分 / 差距 / 建议）

---

## 技术栈

前端：

* Nuxt 4
* Vue 3
* TailwindCSS

后端：

* Node.js（Nuxt Server）
* 自定义 API（/api）

AI：

* 星火大模型（HTTP 调用）
* LangChain.js（仅用于模型封装层）
* 自定义 SparkLLM（适配非 OpenAI 模型）

---

## 核心设计亮点

### 1. 多阶段 AI Workflow

未采用“单次调用大模型”的方式，而是拆分为三个阶段：

* resume_extract：将简历转为结构化 JSON
* job_extract：将岗位要求转为结构化 JSON
* analysis_match：对两者进行匹配分析

优势：

* 降低 token 消耗
* 避免 JSON 截断
* 提高稳定性与可控性

---

### 2. Chain 模块化设计

将 AI 流程拆分为三个独立 Chain：

* resumeExtractChain
* jobExtractChain
* analysisMatchChain

特点：

* 单一职责
* 可复用
* 易扩展

---

### 3. Workflow 调度层（Orchestrator）

统一入口：

runAnalysisWorkflow(input)

负责：

* 调度 Chain
* 控制执行顺序
* 汇总结果
* 统一错误处理
* 输出整体 metrics

---

### 4. 结构化输出与稳定性优化

针对大模型输出不稳定问题，进行了多层优化：

* Prompt 强约束（只允许输出 JSON）
* extractJson 容错解析
* 基础 schema 校验
* retry（失败重试 1 次）
* fallback（兜底结果）

---

### 5. Thinking 控制优化

关闭模型的 reasoning 输出：

thinking: { type: 'disabled' }

避免 reasoning_content 占用 token 导致 JSON 截断问题。

---

### 6. Metrics 可观测性

为每个 Chain 增加运行指标：

* duration（耗时）
* inputLength（输入长度）
* outputLength（输出长度）
* usedFallback（是否使用兜底）
* errorStage（错误阶段：llm / parse / validate）

用于性能分析与稳定性调试。

---

## 稳定性设计

后端：

* try/catch 全覆盖
* JSON 容错解析
* schema 校验
* retry + fallback

前端：

* loading 状态
* 错误提示
* 防止页面崩溃

---

## 示例输出

AnalysisResult 示例：

{
"overallScore": 85,
"strengths": ["Vue3 技术扎实"],
"gaps": ["缺乏性能优化经验"],
"resumeSuggestions": [],
"interviewQuestions": []
}

---

## 项目演进

1.0：原生星火 HTTP + 三阶段 Workflow
1.1：稳定性优化（retry / fallback / JSON 校验）
2.0：LangChain 模型封装（SparkLLM）
2.1：Chain 模块化（3 个 Chain）
2.2：Workflow 调度层 + Metrics

---

## 后续优化方向

* 支持 PDF / 图片 OCR 输入
* RAG（学习路径推荐）
* Agent（动态流程决策）
* SSE（流式输出）
* 多岗位对比分析

---

## 项目总结

本项目重点不在于简单调用大模型，而在于构建稳定、可控、可扩展的 AI Workflow。

通过结构化抽取、Chain 模块化、Workflow 编排与 Metrics 可观测性，实现了一个具备工程能力的 AI 应用系统。

---

## 适用场景

* 求职简历优化
* 岗位匹配分析
* 招聘辅助系统
* 人才评估系统

---

## 运行方式

npm install
npm run dev

---

## 备注

This project focuses on building a reliable AI workflow rather than a simple LLM application.
