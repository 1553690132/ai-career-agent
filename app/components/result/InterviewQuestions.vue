<script setup lang="ts">
import type { InterviewQuestion } from '../../../types/analysis'

const props = defineProps<{
  interviewQuestions: InterviewQuestion[]
}>()
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-950">面试题预测</h2>

    <div class="mt-4 divide-y divide-slate-100">
      <article
        v-for="question in props.interviewQuestions"
        :key="question.id"
        class="py-4 first:pt-0 last:pb-0"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="font-medium leading-6 text-slate-950">{{ question.question }}</h3>
          <span class="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {{ question.difficulty }}
          </span>
        </div>

        <p class="mt-2 text-sm leading-6 text-slate-600">
          <span class="font-medium text-slate-950">考察意图：</span>{{ question.intent }}
        </p>
      </article>
    </div>
  </section>
</template>
