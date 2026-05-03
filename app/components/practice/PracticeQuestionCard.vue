<script setup lang="ts">
import type { PracticeQuestion } from '../../../types/analysis'

const props = defineProps<{
  question: PracticeQuestion
}>()

const showIntent = ref(false)
const showTips = ref(false)

watch(
  () => props.question.id,
  () => {
    showIntent.value = false
    showTips.value = false
  },
)

const difficultyClass = computed(() => {
  if (props.question.difficulty === 'easy') {
    return 'bg-emerald-50 text-emerald-700 ring-emerald-100'
  }

  if (props.question.difficulty === 'medium') {
    return 'bg-amber-50 text-amber-700 ring-amber-100'
  }

  return 'bg-red-50 text-red-700 ring-red-100'
})
</script>

<template>
  <article class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-indigo-100 sm:p-8">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
        {{ question.skill }}
      </span>
      <span
        class="rounded-full px-3 py-1 text-xs font-bold ring-1"
        :class="difficultyClass"
      >
        {{ question.difficulty }}
      </span>
    </div>

    <h2 class="mt-6 text-xl font-bold leading-8 text-slate-950 sm:text-2xl">
      {{ question.question }}
    </h2>

    <div class="mt-6 grid gap-3 sm:grid-cols-2">
      <button
        type="button"
        class="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
        @click="showIntent = !showIntent"
      >
        {{ showIntent ? '收起考察意图' : '查看考察意图' }}
      </button>
      <button
        type="button"
        class="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        @click="showTips = !showTips"
      >
        {{ showTips ? '收起解析' : '查看解析' }}
      </button>
    </div>

    <div
      v-if="showIntent"
      class="mt-4 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"
    >
      {{ question.intent }}
    </div>

    <div
      v-if="showTips"
      class="mt-4 rounded-2xl bg-indigo-50 p-4"
    >
      <p class="text-sm font-semibold text-indigo-900">
        回答提示
      </p>
      <ul class="mt-3 space-y-2 text-sm leading-6 text-indigo-800">
        <li
          v-for="tip in question.answerTips"
          :key="tip"
          class="flex gap-2"
        >
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
          <span>{{ tip }}</span>
        </li>
      </ul>
    </div>
  </article>
</template>
