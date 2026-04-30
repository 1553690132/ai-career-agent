<script setup lang="ts">
import type { ScoreCard } from '../../../types/analysis'

const props = defineProps<{
  scoreCards: ScoreCard[]
}>()
</script>

<template>
  <section>
    <h2 class="mb-3 text-lg font-semibold text-slate-950">评分卡</h2>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <article v-for="card in props.scoreCards" :key="card.label"
        class="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-medium text-slate-600">{{ card.label }}</h3>
          <span class="text-2xl font-semibold text-slate-950">{{ card.score }}</span>
        </div>

        <div class="mt-3 h-2 rounded-full bg-slate-100">
          <div class="h-2 rounded-full bg-sky-500" :style="{ width: `${card.score}%` }"></div>
        </div>

        <p class="mt-3 text-sm leading-6 text-slate-600">{{ card.summary }}</p>
      </article>
    </div>
  </section>
</template>
