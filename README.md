# 🚀 AI Career Agent

一个基于大模型与 RAG（Retrieval-Augmented Generation）的智能求职辅助系统，支持**简历解析、岗位匹配分析、专项练习题生成、知识库增强训练**等完整闭环。

---

## 📌 项目简介

AI Career Agent 旨在解决求职过程中“不会优化简历、不清楚岗位要求、缺乏针对性练习”的问题。

系统通过：

- 大模型结构化解析简历与岗位描述
- 基于多维度评分生成匹配分析报告
- 自动提取弱点并生成专项练习题
- 引入 RAG 机制，结合用户资料或内置知识库增强训练效果

构建一个从“分析 → 提升 → 练习”的完整 AI 求职闭环。

---

## ✨ 核心功能

### 🧠 1. 简历解析（多输入支持）

支持多种输入方式：

- 文本 / TXT
- PDF / DOCX
- 图片（OCR，基于 Tesseract.js）

流程：

```txt
input → clean → section extract → normalize → LLM结构化解析

raw input
→ OCR / file parse
→ cleanText
→ sectionExtractor
→ resumeNormalizer
→ compactResumeText

---

### 🔹 2. 三阶段 AI 分析流程（核心）


resume_extract
→ job_extract
→ analysis_match


#### resume_extract
- 提取：技能、项目、经验、教育
- 输出结构化 JSON

#### job_extract
- 提取：岗位要求、关键词、技能要求

#### analysis_match
- 匹配评分
- 技能对比
- 差距分析
- 简历优化建议
- 面试题预测

---

### 🔹 3. 无 JD 简历体检模式

当用户未提供 JD 时：


resume_extract
→ resume_review_score
→ resume_review_advice


基于目标岗位类型进行通用评估：

- 技能完整度
- 项目表达质量
- 关键词覆盖
- 简历结构与可读性

---

### 🔹 4. 面试练习模块（Practice）

基于分析结果自动生成专项练习题：

- 从 gaps + skillMatches 提取薄弱点
- 每个弱点生成对应问题
- 提供答题提示（answerTips）


analysisResult
→ weakSkills
→ practiceQuestionChain
→ PracticeSet


---

### 🔹 5. 报告导出

支持下载分析结果：

- Markdown 报告
- PDF 报告（支持中文）

---

## 🧱 系统架构

            前端 UI
        (analyze / result)
                │
        POST /api/analyze
                │
        Input Adapter
 (text/pdf/docx/image OCR)
                │
  Resume Section Extractor
      Resume Normalizer
                │
      AI Workflow (核心)

resume → job → analysis
│
Chains
- resumeExtractChain
- jobExtractChain
- analysisMatchChain
│
LLM 调用层
LangChain + Spark Model


---

## ⚙️ 技术栈

### 前端
- Nuxt 3 / Vue 3
- TypeScript
- TailwindCSS

### 后端
- Nuxt Server API
- Node.js

### AI / LLM
- 星火大模型（HTTP 调用）
- LangChain.js（自定义封装）

### 文件处理
- pdf-parse（PDF）
- mammoth（docx）
- tesseract.js（OCR）

### 报告导出
- jsPDF（PDF）
- Blob API（Markdown）

---

## 🧠 核心工程设计

### 🔹 三阶段 AI Workflow


resume_extract → job_extract → analysis_match


优势：

- 降低 token 压力
- 提高 JSON 稳定性
- 支持分阶段调试

---

### 🔹 Chain 封装


resumeExtractChain.invoke({ resumeText, roleType })
jobExtractChain.invoke({ jobText, roleType })
analysisMatchChain.invoke({ resumeJson, jobJson, roleType })


特点：

- 输入输出结构统一
- 可复用
- 易扩展

---

### 🔹 Workflow 调度


runAnalysisWorkflow({
resumeText,
jobText,
roleType
})


功能：

- 顺序执行三阶段
- 统一错误处理
- 汇总 metrics

---

### 🔹 JSON 稳定性策略

- extractJson（提取 JSON）
- schema 校验
- retry 重试
- fallback 降级

---

### 🔹 输入优化（减少 token）


rawResumeText
→ sectionExtractor
→ resumeNormalizer
→ compactResumeText


效果：

- 降低 token 使用
- 提高解析准确率

---

### 🔹 多输入适配层


normalizeCommonInput(input)


支持：

- text / txt
- pdf / docx
- image（OCR）

---

### 🔹 Metrics 可观测性


{
chainName,
duration,
inputLength,
outputLength,
success,
usedFallback,
errorStage
}


用于：

- 调试
- 性能优化
- 面试展示

---

## 📊 AnalysisResult 输出结构


{
overallScore,
overallSummary,
recommendation,
scoreCards,
skillMatches,
strengths,
gaps,
resumeSuggestions,
interviewQuestions
}


---

## 🚀 项目亮点（简历可用）

- 设计三阶段 AI workflow（resume → job → analysis）
- 构建 Chain + Workflow 架构
- 支持多输入解析（PDF / docx / OCR）
- 实现输入清洗与结构压缩
- 解决 LLM JSON 不稳定问题
- 实现 retry + fallback 稳定机制
- 构建 AI 面试练习闭环
- 支持 PDF / Markdown 报告导出

---

## 🔮 后续规划

- RAG 面试题（知识库增强）
- 用户历史记录
- 个性化学习路径推荐
- 多岗位对比分析
- 模型性能优化

---

## 📌 项目总结

AI Career Agent 不只是一个简历分析工具，而是一个面向求职场景的 AI 能力提升系统。