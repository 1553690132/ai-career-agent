<script setup lang="ts">
import type { AnalysisResult } from '../../../types/analysis'

type Recommendation = AnalysisResult['recommendation']

const props = defineProps<{
  overallScore: number
  recommendation: Recommendation
  overallSummary: string
  practiceLoading?: boolean
}>()

const emit = defineEmits<{
  practice: []
}>()

const recommendationTitleMap: Record<Recommendation, string> = {
  highly_recommended: 'Strong Candidate Match',
  recommended: 'Good Candidate Match',
  borderline: 'Potential Candidate Match',
  not_recommended: 'Low Match',
}

const scoreText = computed(() => `${Math.round(props.overallScore)}%`)
const recommendationTitle = computed(() => recommendationTitleMap[props.recommendation])
</script>

<template>
  <section class="overflow-hidden rounded-2xl bg-white shadow-md shadow-indigo-100/70 ring-1 ring-indigo-100">
    <div class="grid grid-cols-1 gap-0 md:grid-cols-[0.42fr_0.58fr]">
      <div class="flex items-center justify-center bg-gradient-to-br from-indigo-50 via-violet-50 to-white px-6 py-7 md:py-8">
        <div class="text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">
            Match Score
          </p>
          <h1 class="mt-2 bg-gradient-to-br from-indigo-600 to-violet-500 bg-clip-text text-8xl font-black leading-none tracking-tight text-transparent md:text-9xl">
            {{ scoreText }}
          </h1>
        </div>
      </div>

      <div class="flex flex-col justify-center px-6 py-7 sm:px-8 md:py-8">
        <span class="w-fit rounded-full bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
          {{ recommendationTitle }}
        </span>
        <p class="mt-4 line-clamp-3 text-sm leading-6 text-slate-500">
          {{ overallSummary }}
        </p>
        <div class="mt-5 flex flex-wrap gap-3">
          <NuxtLink
            to="/analyze"
            class="inline-flex h-10 items-center justify-center rounded-full bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
          >
            重新分析
          </NuxtLink>
          <button
            type="button"
            :disabled="practiceLoading"
            class="inline-flex h-10 items-center justify-center rounded-full bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
            @click="emit('practice')"
          >
            {{ practiceLoading ? '生成题目中...' : 'Practice Interview' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
