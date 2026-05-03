<script setup lang="ts">
defineProps<{
  roleType: string
  weakSkills: string[]
}>()
</script>

<template>
  <section class="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-indigo-100 sm:p-8">
    <p class="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">
      Practice Mode
    </p>
    <div class="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
          专项练习题
        </h1>
        <p class="mt-2 text-sm text-slate-500">
          目标方向：{{ roleType || 'unknown' }}
        </p>
      </div>
    </div>

    <div class="mt-5 flex flex-wrap gap-2">
      <span
        v-for="skill in weakSkills"
        :key="skill"
        class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
      >
        {{ skill }}
      </span>
    </div>
  </section>
</template>
