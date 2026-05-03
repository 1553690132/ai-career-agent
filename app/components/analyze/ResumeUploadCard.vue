<script setup lang="ts">
type InputMode = 'file' | 'text'

defineProps<{
  modelValue: string
  file: File | null
  mode: InputMode
  error: string
  showError: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:mode': [value: InputMode]
  fileChange: [event: Event]
}>()

const handleTextInput = (event: Event) => {
  const target = event.target as HTMLTextAreaElement
  emit('update:modelValue', target.value)
}
</script>

<template>
  <section class="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm shadow-indigo-100/60">
    <div class="flex items-center justify-between gap-3">
      <div>
        <h2 class="text-lg font-bold text-slate-900">你的简历</h2>
        <p class="mt-1 text-sm text-slate-500">上传文件或粘贴简历文本</p>
      </div>

      <div class="flex rounded-full bg-slate-100 p-1 text-xs font-semibold text-slate-500">
        <button
          type="button"
          class="rounded-full px-3 py-1.5 transition"
          :class="mode === 'file' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-slate-700'"
          :disabled="disabled"
          @click="emit('update:mode', 'file')"
        >
          File
        </button>
        <button
          type="button"
          class="rounded-full px-3 py-1.5 transition"
          :class="mode === 'text' ? 'bg-white text-indigo-700 shadow-sm' : 'hover:text-slate-700'"
          :disabled="disabled"
          @click="emit('update:mode', 'text')"
        >
          Text
        </button>
      </div>
    </div>

    <AnalyzeFileDropZone
      v-if="mode === 'file'"
      class="mt-5"
      :file="file"
      title="拖拽或选择简历文件"
      description="支持 PDF、DOCX、TXT、JPG、PNG、WEBP"
      :disabled="disabled"
      @change="emit('fileChange', $event)"
    />

    <textarea
      v-else
      :value="modelValue"
      :disabled="disabled"
      class="mt-5 min-h-64 w-full resize-y rounded-lg border border-indigo-100 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
      placeholder="粘贴候选人的简历文本，例如教育背景、技能、项目经历、实习或工作经历。"
      @input="handleTextInput"
    />

    <p
      v-if="showError && error"
      class="mt-3 text-sm text-rose-600"
    >
      {{ error }}
    </p>
  </section>
</template>
