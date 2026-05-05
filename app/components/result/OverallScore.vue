<script setup lang="ts">
// 总分卡片：展示整体匹配分、推荐结论和一段总结。
import type { AnalysisResult } from '../../../types/analysis'

const props = defineProps<{
  overallScore: AnalysisResult['overallScore']
  overallSummary: AnalysisResult['overallSummary']
  recommendation: AnalysisResult['recommendation']
}>()

// 将后端枚举值转成用户可读的推荐文案和样式。
const recommendationLabel: Record<AnalysisResult['recommendation'], string> = {
  highly_recommended: '高度推荐',
  recommended: '推荐',
  borderline: '谨慎推荐',
  not_recommended: '暂不推荐',
}

const recommendationClass: Record<AnalysisResult['recommendation'], string> = {
  highly_recommended: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  recommended: 'bg-sky-100 text-sky-700 ring-sky-200',
  borderline: 'bg-amber-100 text-amber-700 ring-amber-200',
  not_recommended: 'bg-rose-100 text-rose-700 ring-rose-200',
}
</script>

<template>
  <!-- 总分和推荐结论通常作为报告首屏重点信息。 -->
  <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
    <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
      <div class="flex items-end gap-3">
        <strong class="text-6xl font-semibold leading-none text-slate-950">
          {{ props.overallScore }}
        </strong>
        <span class="mb-2 text-sm font-medium text-slate-500">/ 100</span>
      </div>

      <span
        class="w-fit rounded-full px-3 py-1 text-sm font-medium ring-1"
        :class="recommendationClass[props.recommendation]"
      >
        {{ recommendationLabel[props.recommendation] }}
      </span>
    </div>

    <p class="mt-5 max-w-4xl text-base leading-7 text-slate-600">
      {{ props.overallSummary }}
    </p>
  </section>
</template>
