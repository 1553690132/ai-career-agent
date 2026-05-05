<script setup lang="ts">
// 面试题紧凑区：在结果页侧栏展示 AI 预测的问题和考察意图。
import type { InterviewQuestion } from '../../../types/analysis'

defineProps<{
  interviewQuestions: InterviewQuestion[]
}>()

// 不同难度使用不同标签颜色，便于扫读。
const difficultyClassMap: Record<InterviewQuestion['difficulty'], string> = {
  easy: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  medium: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  hard: 'bg-rose-50 text-rose-700 ring-rose-100',
}
</script>

<template>
  <!-- 结果页中的面试题预览列表。 -->
  <section class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <h2 class="text-xl font-semibold tracking-tight text-slate-950">
      面试问题
    </h2>
    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      <article
        v-for="question in interviewQuestions"
        :key="question.id"
        class="relative rounded-2xl bg-slate-50/80 p-4 pr-5 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
      >
        <span
          class="absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
          :class="difficultyClassMap[question.difficulty]"
        >
          {{ question.difficulty }}
        </span>
        <h3 class="line-clamp-2 pr-20 text-sm font-semibold leading-6 text-slate-950">
          {{ question.question }}
        </h3>
        <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
          {{ question.intent }}
        </p>
      </article>
    </div>
  </section>
</template>
