<script setup lang="ts">
// 结果页：读取分析结果、展示报告、导出报告，并生成下一步练习题。
import { mockAnalysisResult } from '../../mocks/analysis.mock'
import BigPicture from '../components/result/BigPicture.vue'
import BreakdownSummary from '../components/result/BreakdownSummary.vue'
import InterviewQuestionSection from '../components/result/InterviewQuestionSection.vue'
import ResultHero from '../components/result/ResultHero.vue'
import StrengthImprovePanel from '../components/result/StrengthImprovePanel.vue'
import SuggestionSection from '../components/result/SuggestionSection.vue'
import type { AnalysisResult, PracticeSet } from '../../types/analysis'
import { downloadMarkdown, downloadResultPdf } from '../../utils/exportReport'

// 默认使用 mock 数据兜底，真实分析完成后会被 sessionStorage 中的结果覆盖。
const analysisResult = ref<AnalysisResult>(mockAnalysisResult)

// 页面异步操作状态：分别控制 PDF 导出和练习题生成。
const isExportingPdf = ref(false)
const isGeneratingPractice = ref(false)
const pdfErrorMessage = ref('')
const practiceErrorMessage = ref('')
const router = useRouter()
const appContext = useAppContext()

onMounted(() => {
  // 从分析页保存的 sessionStorage 中恢复本次分析结果。
  const storedResult = appContext.getAnalysisResult()

  if (storedResult) {
    analysisResult.value = storedResult
  }
})

// 导出 Markdown 报告，逻辑封装在 utils/exportReport.ts。
const handleDownloadMarkdown = () => {
  downloadMarkdown(analysisResult.value)
}

// 导出 PDF 报告；失败时只影响导出，不影响页面报告展示。
const handleDownloadPdf = async () => {
  if (isExportingPdf.value) {
    return
  }

  try {
    isExportingPdf.value = true
    pdfErrorMessage.value = ''
    await downloadResultPdf(analysisResult.value)
  } catch (error) {
    console.error('PDF export failed:', error)
    pdfErrorMessage.value = 'PDF 生成失败，请稍后重试'
  } finally {
    isExportingPdf.value = false
  }
}

// 基于当前分析结果生成专项练习题，然后进入 /practice。
const handleGoPractice = async () => {
  if (isGeneratingPractice.value) {
    return
  }

  try {
    isGeneratingPractice.value = true
    practiceErrorMessage.value = ''
    const result = analysisResult.value
    // 不上传 mdFile 时，后端会结合内置知识库检索上下文后生成题目。
    const practiceSet = await $fetch<PracticeSet>('/api/practice/generate', {
      method: 'POST',
      body: {
        analysisResult: result,
        roleType: result.job?.title || appContext.getSelectedRoleType() || 'frontend',
      },
    })

    // 练习题同样存入 sessionStorage，练习页直接读取。
    appContext.savePracticeSet(practiceSet, { source: 'base' })
    await router.push('/practice')
  } catch (error: unknown) {
    console.error('Practice question generation failed:', error)
    practiceErrorMessage.value = '练习题生成失败，请稍后重试'
  } finally {
    isGeneratingPractice.value = false
  }
}
</script>

<template>
  <!-- 结果页主界面：顶部操作栏 + 报告主体 + 进入练习按钮。 -->
  <div class="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white text-slate-900">
    <AppHeader action="reanalyze" />

    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-2">
      <!-- 报告操作栏：下载 Markdown/PDF，并提示用户可进入专项练习。 -->
      <section
        class="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm shadow-indigo-100/50 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-semibold text-slate-900">
            分析报告已生成
          </p>
          <p class="mt-0.5 text-xs text-slate-500">
            可下载当前页面的 Markdown 或 PDF 报告，也可以进入专项面试练习。
          </p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-full border border-indigo-100 bg-white px-4 text-sm font-semibold text-indigo-700 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50"
            @click="handleDownloadMarkdown"
          >
            下载 Markdown
          </button>
          <button
            type="button"
            class="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
            :disabled="isExportingPdf"
            @click="handleDownloadPdf"
          >
            {{ isExportingPdf ? '生成中...' : '下载 PDF' }}
          </button>
        </div>
      </section>

      <p
        v-if="pdfErrorMessage"
        class="-mt-2 mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
      >
        {{ pdfErrorMessage }}
      </p>
      <p
        v-if="practiceErrorMessage"
        class="-mt-2 mb-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-600"
      >
        {{ practiceErrorMessage }}
      </p>

      <!-- 报告主体：由多个结果组件组合展示完整 AnalysisResult。 -->
      <div
        id="analysis-report"
        class="flex flex-col gap-5 rounded-[2rem] bg-gradient-to-b from-white via-indigo-50/20 to-white p-1"
      >
        <ResultHero
          :overall-score="analysisResult.overallScore"
          :overall-summary="analysisResult.overallSummary"
          :recommendation="analysisResult.recommendation"
          :practice-loading="isGeneratingPractice"
          @practice="handleGoPractice"
        />

        <BigPicture
          :overall-summary="analysisResult.overallSummary"
          :strengths="analysisResult.strengths"
          :gaps="analysisResult.gaps"
        />

        <section class="grid grid-cols-1 items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <BreakdownSummary
            :score-cards="analysisResult.scoreCards"
            :skill-matches="analysisResult.skillMatches"
          />

          <StrengthImprovePanel
            :strengths="analysisResult.strengths"
            :gaps="analysisResult.gaps"
          />
        </section>

        <section class="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <SuggestionSection :resume-suggestions="analysisResult.resumeSuggestions" />

          <InterviewQuestionSection class="self-start" :interview-questions="analysisResult.interviewQuestions" />
        </section>
      </div>

      <!-- 页面底部的第二个练习入口，方便用户读完报告后继续。 -->
      <section class="flex w-full justify-center py-3">
        <button
          type="button"
          :disabled="isGeneratingPractice"
          class="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300 sm:w-auto"
          @click="handleGoPractice"
        >
          {{ isGeneratingPractice ? '生成题目中...' : 'Next: Practice Interview →' }}
        </button>
      </section>
    </main>
  </div>
</template>
