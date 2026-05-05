<script setup lang="ts">
// 通用文件选择区：被简历上传卡和 JD 输入卡复用，负责展示文件名、大小和选择入口。
interface Props {
  file: File | null
  title: string
  description: string
  accept?: string
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '.pdf,.txt,.docx,.jpg,.jpeg,.png,.webp',
  disabled: false,
})

const emit = defineEmits<{
  change: [event: Event]
}>()

const fileInputId = useId()

// 格式化字节数为MB或KB
const formattedFileSize = computed(() => {
  if (!props.file) {
    return ''
  }
  const sizeInKb = props.file.size / 1024
  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }
  return `${(sizeInKb / 1024).toFixed(2)} MB`
})
</script>

<template>
  <!-- 外层虚线区域提供上传语义，实际文件选择由隐藏 input 完成。 -->
  <div class="rounded-lg border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
    <label :for="fileInputId"
      class="flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-md bg-white/60 px-4 py-6 text-center transition hover:bg-white"
      :class="{ 'pointer-events-none opacity-60': disabled }">
      <span class="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl text-indigo-600">
        {{ file ? '✓' : '↥' }}
      </span>

      <span class="mt-4 text-sm font-semibold text-slate-900">
        {{ file ? file.name : title }}
      </span>
      <span class="mt-2 text-xs leading-5 text-slate-500">
        {{ file ? `${formattedFileSize} · ${file.type || 'unknown'}` : description }}
      </span>
      <span class="mt-4 rounded-full bg-indigo-100 px-4 py-2 text-xs font-semibold text-indigo-700">
        {{ file ? '重新选择文件' : '选择文件' }}
      </span>
    </label>

    <input :id="fileInputId" type="file" :accept="accept" class="sr-only" :disabled="disabled"
      @change="emit('change', $event)">
  </div>
</template>
