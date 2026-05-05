<script setup lang="ts">
// 结果页建议区：用卡片展示简历优化建议、优先级和示例改写。
import type { Priority, ResumeSuggestion } from '../../../types/analysis'

defineProps<{
  resumeSuggestions: ResumeSuggestion[]
}>()

// 根据建议优先级切换标签颜色，提示用户先处理高优先级项。
const priorityClassMap: Record<Priority, string> = {
  high: 'bg-rose-50 text-rose-700 ring-rose-100',
  medium: 'bg-amber-50 text-amber-700 ring-amber-100',
  low: 'bg-slate-100 text-slate-600 ring-slate-200',
}
</script>

<template>
  <!-- 当前结果页使用的简历建议卡片区。 -->
  <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <h2 class="text-xl font-semibold tracking-tight text-slate-950">
      简历优化建议
    </h2>
    <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
      <article
        v-for="suggestion in resumeSuggestions"
        :key="suggestion.id"
        class="rounded-2xl bg-slate-50/80 p-4 ring-1 ring-slate-200"
      >
        <div class="flex items-start justify-between gap-3">
          <h3 class="line-clamp-2 text-sm font-semibold leading-5 text-slate-950">
            {{ suggestion.title }}
          </h3>
          <span
            class="w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
            :class="priorityClassMap[suggestion.priority]"
          >
            {{ suggestion.priority }}
          </span>
        </div>
        <p class="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
          {{ suggestion.problem }}
        </p>
        <p class="mt-2 line-clamp-2 text-sm leading-5 text-slate-700">
          {{ suggestion.suggestion }}
        </p>
        <blockquote
          v-if="suggestion.exampleRewrite"
          class="mt-3 line-clamp-3 h-[76px] rounded-xl bg-white p-3 text-xs leading-5 text-slate-600 ring-1 ring-slate-200"
        >
          {{ suggestion.exampleRewrite }}
        </blockquote>
      </article>
    </div>
  </section>
</template>
