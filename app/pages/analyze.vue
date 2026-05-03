<script setup lang="ts">
import type { AnalysisResult } from '../../types/analysis'

type RoleType = 'frontend' | 'backend' | 'product' | 'algorithm'
type InputFileType = 'txt' | 'pdf' | 'docx' | 'image'
type InputMode = 'file' | 'text'

interface UploadPayload {
  name: string
  type: InputFileType
  mimeType: string
  bytes: number[]
}

interface AnalyzeRequestBody {
  resumeText?: string
  resumeFile?: UploadPayload
  jobText?: string
  jobFile?: UploadPayload
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
const resumeInputMode = ref<InputMode>('file')
const jobText = ref('')
const jobFile = ref<File | null>(null)
const jobInputMode = ref<InputMode>('text')
const roleType = ref<RoleType>('frontend')
const isLoading = ref(false)
const currentLoadingStep = ref(0)
const hasSubmitted = ref(false)
const apiErrorMessage = ref('')
let loadingTimer: ReturnType<typeof setInterval> | undefined

const roleTypeOptions: Array<{ label: string; value: RoleType }> = [
  { label: '前端开发', value: 'frontend' },
  { label: '后端开发', value: 'backend' },
  { label: '产品经理', value: 'product' },
  { label: '算法工程师', value: 'algorithm' },
]

const resumeError = computed(() => {
  if (resumeInputMode.value === 'file') {
    return resumeFile.value ? '' : '请上传简历文件'
  }

  const text = resumeText.value.trim()

  if (!text) {
    return '请输入简历文本'
  }

  if (text.length < minInputLength) {
    return `简历文本太短，请至少输入 ${minInputLength} 个字符`
  }

  return ''
})

const jobTextError = computed(() => {
  if (jobInputMode.value === 'file') {
    return jobFile.value ? '' : '请上传岗位 JD 文件'
  }

  const text = jobText.value.trim()

  if (!text) {
    return '请输入岗位 JD'
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

const handleJobFileChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  jobFile.value = input.files?.[0] ?? null
}

const readResumeFileBytes = async (file: File) => {
  const arrayBuffer = await file.arrayBuffer()

  return Array.from(new Uint8Array(arrayBuffer))
}

const getInputFileType = (file: File): InputFileType => {
  const fileName = file.name.toLowerCase()
  const mimeType = file.type.toLowerCase()

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return 'pdf'
  }

  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    || fileName.endsWith('.docx')
  ) {
    return 'docx'
  }

  if (
    mimeType.startsWith('image/')
    || fileName.endsWith('.jpg')
    || fileName.endsWith('.jpeg')
    || fileName.endsWith('.png')
    || fileName.endsWith('.webp')
  ) {
    return 'image'
  }

  return 'txt'
}

const createUploadPayload = async (file: File): Promise<UploadPayload> => ({
  name: file.name,
  type: getInputFileType(file),
  mimeType: file.type,
  bytes: await readResumeFileBytes(file),
})

const stopLoadingProgress = () => {
  if (loadingTimer) {
    clearInterval(loadingTimer)
    loadingTimer = undefined
  }
}

const startLoadingProgress = () => {
  stopLoadingProgress()
  currentLoadingStep.value = 0

  loadingTimer = setInterval(() => {
    if (currentLoadingStep.value < 2) {
      currentLoadingStep.value += 1
    } else {
      stopLoadingProgress()
    }
  }, 1200)
}

const handleAnalyze = async () => {
  hasSubmitted.value = true
  apiErrorMessage.value = ''

  if (!canSubmit.value) {
    return
  }

  isLoading.value = true
  startLoadingProgress()

  try {
    const selectedResumeFile = resumeFile.value
    const selectedJobFile = jobFile.value
    const requestBody: AnalyzeRequestBody = {
      roleType: roleType.value,
    }

    if (resumeInputMode.value === 'file' && selectedResumeFile) {
      requestBody.resumeFile = await createUploadPayload(selectedResumeFile)
    } else {
      requestBody.resumeText = resumeText.value.trim()
    }

    if (jobInputMode.value === 'file' && selectedJobFile) {
      requestBody.jobFile = await createUploadPayload(selectedJobFile)
    } else {
      requestBody.jobText = jobText.value.trim()
    }

    const result = await $fetch<AnalysisResult>('/api/analyze', {
      method: 'POST',
      body: requestBody,
    })

    sessionStorage.setItem('analysisResult', JSON.stringify(result))
    stopLoadingProgress()
    await navigateTo('/result')
  } catch (error: unknown) {
    stopLoadingProgress()
    apiErrorMessage.value = getApiErrorMessage(error)
  } finally {
    isLoading.value = false
  }
}

onBeforeUnmount(() => {
  stopLoadingProgress()
})
</script>

<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#eef2ff_0,#f8fafc_42%,#ffffff_100%)] text-slate-900">
    <AppHeader
      action="role"
      :role-type="roleType"
      :role-type-options="roleTypeOptions"
      :disabled="isLoading"
      @update:role-type="roleType = $event"
    />

    <main class="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-10 sm:px-6 lg:px-8">
      <AnalyzeLoadingPanel
        v-if="isLoading"
        :current-step="currentLoadingStep"
      />

      <template v-else>
        <section class="mx-auto max-w-3xl text-center">
          <p class="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">
            AI Career Agent
          </p>
          <h1 class="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            构建更有胜算的求职申请
          </h1>
          <p class="mt-4 text-base leading-7 text-slate-600">
            上传简历并提供目标岗位 JD，系统会分析匹配度、技能差距、简历优化方向和面试题预测。
          </p>
        </section>

        <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AnalyzeResumeUploadCard
            v-model="resumeText"
            v-model:mode="resumeInputMode"
            :file="resumeFile"
            :error="resumeError"
            :show-error="hasSubmitted"
            :disabled="isLoading"
            @file-change="handleResumeFileChange"
          />

          <AnalyzeJobInputCard
            v-model="jobText"
            v-model:mode="jobInputMode"
            :file="jobFile"
            :error="jobTextError"
            :show-error="hasSubmitted"
            :disabled="isLoading"
            @file-change="handleJobFileChange"
          />
        </section>

        <AnalyzeActionBar
          :can-submit="canSubmit"
          :is-loading="isLoading"
          :error-message="apiErrorMessage"
          @analyze="handleAnalyze"
        />
      </template>
    </main>
  </div>
</template>
