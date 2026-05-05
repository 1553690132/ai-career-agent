<script setup lang="ts">
// 优势列表：逐条展示 AI 识别出的候选人亮点。
import type { AnalysisResult } from '../../../types/analysis'

const props = defineProps<{
  strengths: AnalysisResult['strengths']
}>()
</script>

<template>
  <!-- 老版优势列表组件，适合在完整报告中单独成块展示。 -->
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-950">优势</h2>

    <ul class="mt-4 space-y-3">
      <li
        v-for="strength in props.strengths"
        :key="strength"
        class="rounded-md bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900"
      >
        {{ strength }}
      </li>
    </ul>
  </section>
</template>
