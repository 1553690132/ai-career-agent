<script setup lang="ts">
import type { AnalysisResult } from '../../types/analysis'

type RoleType = 'frontend' | 'backend' | 'product' | 'algorithm'

interface AnalyzeRequestBody {
  resumeText?: string
  resumeFile?: {
    name: string
    type: 'txt' | 'pdf' | 'docx' | 'image'
    mimeType: string
    bytes: number[]
  }
  jobText: string
  roleType: RoleType
}

interface ApiErrorResponse {
  data?: {
    errors?: string[]
    message?: string
  }
  statusMessage?: string
  message?: string
}

const minInputLength = 50

const resumeText = ref('')
const resumeFile = ref<File | null>(null)
const jobText = ref('')
const roleType = ref<RoleType>('frontend')
const isLoading = ref(false)
const hasSubmitted = ref(false)
const apiErrorMessage = ref('')

const roleTypeOptions: Array<{ label: string; value: RoleType }> = [
  { label: '前端开发', value: 'frontend' },
  { label: '后端开发', value: 'backend' },
  { label: '产品经理', value: 'product' },
  { label: '算法工程师', value: 'algorithm' },
]

const resumeError = computed(() => {
  const text = resumeText.value.trim()

  if (!text && !resumeFile.value) {
    return '请粘贴或输入简历文本'
  }

  if (text && text.length < minInputLength) {
    return `简历文本太短，请至少输入 ${minInputLength} 个字符`
  }

  return ''
})

const jobTextError = computed(() => {
  const text = jobText.value.trim()

  if (!text) {
    return '请粘贴或输入岗位 JD'
  }

  if (text.length < minInputLength) {
    return `岗位 JD 太短，请至少输入 ${minInputLength} 个字符`
  }

  return ''
})

const canSubmit = computed(
  () => !resumeError.value && !jobTextError.value && !isLoading.value,
)

const getApiErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '分析失败，请稍后重试'
  }

  const apiError = error as ApiErrorResponse

  if (apiError.data?.errors?.length) {
    return apiError.data.errors.join('；')
  }

  return apiError.data?.message ?? apiError.statusMessage ?? apiError.message ?? '分析失败，请稍后重试'
}

const handleResumeFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  resumeFile.value = input.files?.[0] ?? null
}

const readResumeFileBytes = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer()

  return Array.from(new Uint8Array(arrayBuffer))
}

const getResumeFileType = (file: File): 'txt' | 'pdf' | 'docx' | 'image' => {
  const fileName = file.name.toLowerCase()

  if (fileName.endsWith('.pdf')) {
    return 'pdf'
  }

  if (fileName.endsWith('.docx')) {
    return 'docx'
  }

  if (
    fileName.endsWith('.jpg')
    || fileName.endsWith('.jpeg')
    || fileName.endsWith('.png')
    || fileName.endsWith('.webp')
  ) {
    return 'image'
  }

  return 'txt'
}

const handleAnalyze = async () => {
  hasSubmitted.value = true
  apiErrorMessage.value = ''

  if (!canSubmit.value) {
    return
  }

  isLoading.value = true

  try {
    const selectedResumeFile = resumeFile.value
    const requestBody: AnalyzeRequestBody = {
      jobText: jobText.value.trim(),
      roleType: roleType.value,
    }

    if (selectedResumeFile) {
      requestBody.resumeFile = {
        name: selectedResumeFile.name,
        type: getResumeFileType(selectedResumeFile),
        mimeType: selectedResumeFile.type,
        bytes: await readResumeFileBytes(selectedResumeFile),
      }
    } else {
      requestBody.resumeText = resumeText.value.trim()
    }

    const result = await $fetch<AnalysisResult>('/api/analyze', {
      method: 'POST',
      body: requestBody,
    })

    sessionStorage.setItem('analysisResult', JSON.stringify(result))
    await navigateTo('/result')
  } catch (error: unknown) {
    apiErrorMessage.value = getApiErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <section class="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 class="text-2xl font-semibold text-slate-950">职业匹配分析</h1>
          <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            输入简历和岗位 JD，选择岗位类型后开始分析。当前阶段调用本地 mock API，不接真实 AI。
          </p>
        </div>

        <label class="flex w-full flex-col gap-2 md:w-56">
          <span class="text-sm font-medium text-slate-700">岗位类型</span>
          <select
            v-model="roleType"
            class="h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          >
            <option
              v-for="option in roleTypeOptions"
              :key="option.value"
              :value="option.value"
            >
              {{ option.label }}
            </option>
          </select>
        </label>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <label class="flex min-h-96 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <span class="text-base font-semibold text-slate-950">简历文本</span>
        <textarea
          v-model="resumeText"
          class="mt-4 min-h-80 flex-1 resize-y rounded-md border border-slate-300 p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder="请粘贴候选人的简历文本，例如工作经历、项目经历、技能栈和教育背景。"
        />
        <input
          type="file"
          accept=".pdf,.txt,.docx,.jpg,.jpeg,.png,.webp"
          class="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-200"
          @change="handleResumeFileChange"
        >
        <p
          v-if="hasSubmitted && resumeError"
          class="mt-3 text-sm text-rose-600"
        >
          {{ resumeError }}
        </p>
      </label>

      <label class="flex min-h-96 flex-col rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <span class="text-base font-semibold text-slate-950">岗位 JD</span>
        <textarea
          v-model="jobText"
          class="mt-4 min-h-80 flex-1 resize-y rounded-md border border-slate-300 p-4 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
          placeholder="请粘贴岗位 JD，例如岗位职责、必备技能、加分项、经验年限和业务方向。"
        />
        <p
          v-if="hasSubmitted && jobTextError"
          class="mt-3 text-sm text-rose-600"
        >
          {{ jobTextError }}
        </p>
      </label>
    </section>

    <section class="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p class="text-sm leading-6 text-slate-600">
          点击后会调用本地分析接口，成功后进入结果页。
        </p>
        <p
          v-if="apiErrorMessage"
          class="mt-2 text-sm text-rose-600"
        >
          {{ apiErrorMessage }}
        </p>
      </div>

      <button
        type="button"
        class="inline-flex h-11 items-center justify-center rounded-md bg-slate-950 px-5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        :disabled="isLoading"
        @click="handleAnalyze"
      >
        <span v-if="isLoading">分析中...</span>
        <span v-else>开始分析</span>
      </button>
    </section>
  </main>
</template>
