<script setup lang="ts">
// 练习题导航：控制上一题/下一题按钮状态，并向父页面派发翻页事件。
const props = defineProps<{
  currentIndex: number
  total: number
  disabled?: boolean
}>()

const emit = defineEmits<{
  previous: []
  next: []
}>()

// 根据当前题号和禁用状态，统一计算按钮是否可点。
const isFirst = computed(() => props.currentIndex <= 0)
const isLast = computed(() => props.currentIndex >= props.total - 1)
const isPreviousDisabled = computed(() => props.disabled || isFirst.value)
const isNextDisabled = computed(() => props.disabled || isLast.value)
</script>

<template>
  <!-- 题目分页控制区：中间展示当前进度，两侧负责切换题目。 -->
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
