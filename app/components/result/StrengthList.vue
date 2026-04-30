<script setup lang="ts">
import type { AnalysisResult } from '../../../types/analysis'

const props = defineProps<{
  strengths: AnalysisResult['strengths']
}>()
</script>

<template>
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
