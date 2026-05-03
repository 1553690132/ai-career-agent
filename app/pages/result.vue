<script setup lang="ts">
import { mockAnalysisResult } from '../../mocks/analysis.mock'
import BigPicture from '../components/result/BigPicture.vue'
import BreakdownSummary from '../components/result/BreakdownSummary.vue'
import InterviewQuestionSection from '../components/result/InterviewQuestionSection.vue'
import ResultHero from '../components/result/ResultHero.vue'
import StrengthImprovePanel from '../components/result/StrengthImprovePanel.vue'
import SuggestionSection from '../components/result/SuggestionSection.vue'
import type { AnalysisResult } from '../../types/analysis'
import { downloadMarkdown, downloadResultPdf } from '../../utils/exportReport'

const analysisResult = ref<AnalysisResult>(mockAnalysisResult)
const isExportingPdf = ref(false)
const pdfErrorMessage = ref('')

onMounted(() => {
  const storedResult = sessionStorage.getItem('analysisResult')

  if (!storedResult) {
    return
  }

  try {
    analysisResult.value = JSON.parse(storedResult) as AnalysisResult
  } catch {
    analysisResult.value = mockAnalysisResult
  }
})

const handleDownloadMarkdown = () => {
  downloadMarkdown(analysisResult.value)
}

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
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white text-slate-900">
    <AppHeader action="reanalyze" />

    <main class="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-2">
      <section
        class="mb-4 flex flex-col gap-3 rounded-2xl border border-indigo-100 bg-white/80 p-3 shadow-sm shadow-indigo-100/50 backdrop-blur sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p class="text-sm font-semibold text-slate-900">
            分析报告已生成
          </p>
          <p class="mt-0.5 text-xs text-slate-500">
            可下载当前页面的 Markdown 或 PDF 报告。
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

      <div
        id="analysis-report"
        class="flex flex-col gap-5 rounded-[2rem] bg-gradient-to-b from-white via-indigo-50/20 to-white p-1"
      >
        <ResultHero
          :overall-score="analysisResult.overallScore"
          :overall-summary="analysisResult.overallSummary"
          :recommendation="analysisResult.recommendation"
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

      <section class="flex w-full justify-center py-3">
        <button
          type="button"
          class="inline-flex h-11 w-full max-w-xs items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-md shadow-indigo-200 transition hover:bg-indigo-700 sm:w-auto"
        >
          Next: Practice Interview →
        </button>
      </section>
    </main>
  </div>
</template>
