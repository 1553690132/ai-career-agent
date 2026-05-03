<script setup lang="ts">
defineProps<{
  currentStep: number
}>()

const steps = [
  '正在解析输入文件',
  '正在提取简历与岗位信息',
  '正在生成匹配分析',
]
</script>

<template>
  <section class="mx-auto flex min-h-[620px] w-full max-w-5xl items-center justify-center rounded-2xl border border-indigo-100 bg-white/80 p-6 shadow-sm shadow-indigo-100">
    <div class="w-full max-w-md text-center">
      <div class="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-full bg-indigo-50 text-2xl text-indigo-600 shadow-sm">
        ✦
      </div>
      <h2 class="mt-8 text-2xl font-bold text-slate-900">
        正在分析你的匹配度
      </h2>
      <p class="mt-3 text-sm leading-6 text-slate-500">
        我们正在整理简历和岗位信息，请稍等片刻。
      </p>

      <div class="mt-10 flex flex-col gap-3 text-left">
        <div
          v-for="(step, index) in steps"
          :key="step"
          class="flex items-center gap-3 rounded-xl border px-4 py-3 text-sm transition duration-300"
          :class="[
            index < currentStep && 'border-indigo-100 bg-indigo-50 text-slate-700',
            index === currentStep && 'scale-[1.01] border-indigo-200 bg-white text-indigo-700 shadow-sm shadow-indigo-100',
            index > currentStep && 'border-slate-100 bg-slate-50 text-slate-400',
          ]"
        >
          <span
            class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition"
            :class="[
              index < currentStep && 'bg-indigo-600 text-white',
              index === currentStep && 'animate-pulse bg-indigo-100 text-indigo-700 ring-4 ring-indigo-50',
              index > currentStep && 'bg-slate-100 text-slate-300',
            ]"
          >
            <span v-if="index < currentStep">✓</span>
            <span
              v-else-if="index === currentStep"
              class="inline-flex gap-0.5"
            >
              <span class="h-1 w-1 rounded-full bg-indigo-600" />
              <span class="h-1 w-1 rounded-full bg-indigo-600" />
              <span class="h-1 w-1 rounded-full bg-indigo-600" />
            </span>
            <span v-else>{{ index + 1 }}</span>
          </span>
          <span class="font-medium">{{ step }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
