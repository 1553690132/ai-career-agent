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