<script setup lang="ts">
import type { GapItem, Priority } from '../../../types/analysis'

const props = defineProps<{
  gaps: GapItem[]
}>()

const priorityLabel: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
}

const priorityClass: Record<Priority, string> = {
  high: 'bg-rose-100 text-rose-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-950">差距</h2>

    <div class="mt-4 grid grid-cols-1 gap-4">
      <article
        v-for="gap in props.gaps"
        :key="gap.title"
        class="rounded-lg border border-slate-200 p-4"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="font-medium text-slate-950">{{ gap.title }}</h3>
          <span
            class="w-fit rounded-full px-2.5 py-1 text-xs font-medium"
            :class="priorityClass[gap.priority]"
          >
            {{ priorityLabel[gap.priority] }}
          </span>
        </div>

        <p class="mt-3 text-sm leading-6 text-slate-600">{{ gap.description }}</p>
        <p v-if="gap.improvementAdvice" class="mt-3 text-sm leading-6 text-slate-700">
          <span class="font-medium text-slate-950">建议：</span>{{ gap.improvementAdvice }}
        </p>
      </article>
    </div>
  </section>
</template>
