<script setup lang="ts">
import type { GapItem } from '../../../types/analysis'

defineProps<{
  strengths: string[]
  gaps: GapItem[]
}>()
</script>

<template>
  <section class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
    <article class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-emerald-100">
      <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-950">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-xs font-black text-emerald-600">✓</span>
        主要优势
      </h2>
      <ul class="mt-4 space-y-3">
        <li
          v-for="strength in strengths.slice(0, 4)"
          :key="strength"
          class="flex gap-2.5 text-sm leading-6 text-slate-700"
        >
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
          <span class="line-clamp-2">{{ strength }}</span>
        </li>
      </ul>
    </article>

    <article class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-amber-100">
      <h2 class="flex items-center gap-2 text-xl font-semibold text-slate-950">
        <span class="flex h-7 w-7 items-center justify-center rounded-full bg-amber-50 text-xs font-black text-amber-600">↗</span>
        提升点
      </h2>
      <ul class="mt-4 space-y-3">
        <li
          v-for="gap in gaps.slice(0, 4)"
          :key="gap.title"
          class="flex gap-2.5 text-sm leading-6 text-slate-700"
        >
          <span class="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span class="line-clamp-2">
            <strong class="font-semibold text-slate-950">{{ gap.title }}: </strong>
            {{ gap.improvementAdvice || gap.description }}
          </span>
        </li>
      </ul>
    </article>
  </section>
</template>
