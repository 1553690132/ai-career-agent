<script setup lang="ts">
// 结果页概览条：用一句总结承接整体匹配结论，放在报告顶部帮助快速扫读。
defineProps<{
  overallSummary: string
  strengths: string[]
  gaps: Array<{ title: string; improvementAdvice?: string }>
}>()
</script>

<template>
  <!-- 总览摘要区：横向展示报告的核心判断。 -->
  <section class="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-slate-200">
    <div class="flex flex-col items-center gap-2 sm:flex-row sm:items-start sm:gap-4">
      <h2 class="shrink-0 text-sm font-semibold uppercase tracking-[0.16em] text-indigo-500">
        The Big Picture
      </h2>
      <p class="line-clamp-2 text-sm leading-6 text-slate-600">
        {{ overallSummary }}
      </p>
    </div>
  </section>
</template>
