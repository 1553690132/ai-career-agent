<script setup lang="ts">
defineProps<{
  canSubmit: boolean
  isLoading: boolean
  errorMessage: string
}>()

const emit = defineEmits<{
  analyze: []
}>()
</script>

<template>
  <section class="flex flex-col items-center gap-3 pt-2">
    <button
      type="button"
      class="inline-flex h-12 min-w-56 items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      :disabled="!canSubmit || isLoading"
      @click="emit('analyze')"
    >
      <span v-if="isLoading">分析中...</span>
      <span v-else>✦ 开始分析</span>
    </button>

    <p class="text-xs text-slate-500">
      分析通常需要 30 秒以内，结果会自动进入报告页。
    </p>

    <p
      v-if="errorMessage"
      class="max-w-2xl rounded-lg bg-rose-50 px-4 py-3 text-center text-sm text-rose-600"
    >
      {{ errorMessage }}
    </p>
  </section>
</template>
