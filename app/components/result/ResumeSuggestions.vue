<script setup lang="ts">
// 简历建议列表：展示问题、修改建议和可选改写示例。
import type { ResumeSuggestion } from '../../../types/analysis'

const props = defineProps<{
  resumeSuggestions: ResumeSuggestion[]
}>()
</script>

<template>
  <!-- 老版建议网格组件，用于逐条展示简历优化建议。 -->
  <section>
    <h2 class="mb-3 text-lg font-semibold text-slate-950">简历优化建议</h2>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <article
        v-for="suggestion in props.resumeSuggestions"
        :key="suggestion.id"
        class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <h3 class="font-medium text-slate-950">{{ suggestion.title }}</h3>
          <span class="w-fit rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
            {{ suggestion.type }}
          </span>
        </div>

        <div class="mt-4 space-y-3 text-sm leading-6">
          <p class="text-slate-600">
            <span class="font-medium text-slate-950">问题：</span>{{ suggestion.problem }}
          </p>
          <p class="text-slate-600">
            <span class="font-medium text-slate-950">建议：</span>{{ suggestion.suggestion }}
          </p>
          <p
            v-if="suggestion.exampleRewrite"
            class="rounded-md bg-slate-50 p-3 text-slate-700"
          >
            <span class="font-medium text-slate-950">示例：</span>{{ suggestion.exampleRewrite }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>
