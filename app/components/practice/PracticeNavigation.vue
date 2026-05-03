<script setup lang="ts">
const props = defineProps<{
  currentIndex: number
  total: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
}>()

const isFirst = computed(() => props.currentIndex <= 0)
const isLast = computed(() => props.currentIndex >= props.total - 1)
const isPreviousDisabled = computed(() => props.disabled || isFirst.value)
const isNextDisabled = computed(() => props.disabled || isLast.value)
</script>

<template>
  <nav class="flex flex-col gap-3 rounded-3xl bg-white p-4 shadow-sm ring-1 ring-indigo-100 sm:flex-row sm:items-center sm:justify-between">
    <button
      type="button"
      class="h-11 rounded-full border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      :disabled="isPreviousDisabled"
      @click="emit('previous')"
    >
      上一题
    </button>

    <p class="text-center text-sm font-semibold text-slate-500">
      {{ currentIndex + 1 }} / {{ total }}
    </p>

    <button
      type="button"
      class="h-11 rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
      :disabled="isNextDisabled"
      @click="emit('next')"
    >
      下一题
    </button>
  </nav>
</template>
