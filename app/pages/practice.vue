<script setup lang="ts">
// 练习页：读取练习题集、支持逐题练习，并可上传 Markdown 资料重新生成 RAG 增强题。
import PracticeHeader from '../components/practice/PracticeHeader.vue'
import PracticeNavigation from '../components/practice/PracticeNavigation.vue'
import PracticeQuestionCard from '../components/practice/PracticeQuestionCard.vue'
import type { AnalysisResult, PracticeSet } from '../../types/analysis'

interface ApiErrorResponse {
  data?: {
    errors?: string[]
    message?: string
  }
  statusMessage?: string
  message?: string
}

interface MarkdownUploadPayload {
  name: string
  mimeType: string
  bytes: number[]
}

type PracticeSource = 'base' | 'rag'

const route = useRoute()

// 当前练习题集和题号状态。
const practiceSet = ref<PracticeSet | null>(null)
const currentIndex = ref(0)
const practiceVersion = ref(0)

// 题目来源状态：base 表示默认生成，rag 表示结合用户上传 Markdown 资料生成。
const practiceSource = ref<PracticeSource>('base')
const mdSourceFileName = ref('')

// 页面加载、生成中和错误状态。
const isLoading = ref(true)
const isGeneratingRagQuestions = ref(false)
const errorMessage = ref('')
const mdErrorMessage = ref('')
const mdFile = ref<File | null>(null)
const appContext = useAppContext()

// 当前题目由题集和 currentIndex 推导得到。
const currentQuestion = computed(() => practiceSet.value?.questions[currentIndex.value])

// 用 key 强制题卡在切题或重新生成后重置内部展开状态。
const questionRenderKey = computed(() =>
  currentQuestion.value ? `${practiceVersion.value}-${currentQuestion.value.id}` : `${practiceVersion.value}-empty`,
)
// 展示当前题目来源，区分普通练习和资料增强练习。
const sourceLabel = computed(() =>
  practiceSource.value === 'rag' ? '资料增强练习' : '基础练习题',
)

// 将后端校验错误或生成失败错误整理成页面提示文案。
const getApiErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '练习题生成失败，请稍后重试'
  }

  const apiError = error as ApiErrorResponse

  if (apiError.data?.errors?.length) {
    return apiError.data.errors.join('，')
  }

  return apiError.data?.message
    ?? apiError.statusMessage
    ?? apiError.message
    ?? '练习题生成失败，请稍后重试'
}

// RAG 重新生成需要基于原始分析结果里的 gaps 和 skillMatches。
const readAnalysisResult = () => appContext.getAnalysisResult()

// 将 Markdown 文件转成后端 API 接受的 JSON 结构。
const readFileBytes = async (file: File) => Array.from(new Uint8Array(await file.arrayBuffer()))

const createMarkdownPayload = async (file: File): Promise<MarkdownUploadPayload> => ({
  name: file.name,
  mimeType: file.type || 'text/markdown',
  bytes: await readFileBytes(file),
})

// 优先使用路由参数，其次沿用题集或分析结果中的岗位信息。
const getRoleType = (analysisResult: AnalysisResult) =>
  route.query.roleType?.toString()
  || practiceSet.value?.roleType
  || analysisResult.job?.title
  || 'frontend'

// 替换整套题目，并同步到 sessionStorage，保证刷新后仍能恢复。
const replacePracticeSet = (nextPracticeSet: PracticeSet, source: PracticeSource, fileName = '') => {
  practiceSet.value = nextPracticeSet
  currentIndex.value = 0
  practiceVersion.value += 1
  practiceSource.value = source
  mdSourceFileName.value = source === 'rag' ? fileName : ''
  errorMessage.value = ''

  appContext.savePracticeSet(nextPracticeSet, {
    source,
    lastUploadedMdName: fileName,
  })
}

// 上传 Markdown 资料后，请求后端进行切块、检索和题目重生成。
const requestPracticeSet = async (analysisResult: AnalysisResult, selectedMdFile: File) => {
  const generatedPracticeSet = await $fetch<PracticeSet>('/api/practice/generate', {
    method: 'POST',
    body: {
      analysisResult,
      roleType: getRoleType(analysisResult),
      mdFile: await createMarkdownPayload(selectedMdFile),
    },
  })

  replacePracticeSet(generatedPracticeSet, 'rag', selectedMdFile.name)
}

// 页面进入时从 sessionStorage 读取结果页提前生成好的练习题。
const loadPracticeSet = () => {
  const storedPracticeSet = appContext.getPracticeSet()

  if (storedPracticeSet) {
    practiceSet.value = storedPracticeSet
    practiceSource.value = appContext.getPracticeSource()
    mdSourceFileName.value = appContext.getLastUploadedMdName()
    currentIndex.value = 0
    practiceVersion.value += 1
    return
  }

  errorMessage.value = '暂无练习题，请先完成简历分析'
}

// 记录用户选择的 Markdown 文件，生成前再做类型和大小校验。
const handleMdFileChange = (event: Event) => {
  if (isGeneratingRagQuestions.value) {
    return
  }

  const input = event.target as HTMLInputElement
  mdFile.value = input.files?.[0] ?? null
  mdErrorMessage.value = ''
}

// 基于用户上传的 Markdown 资料重新生成一套 RAG 增强练习题。
const handleGenerateWithMd = async () => {
  if (isGeneratingRagQuestions.value) {
    return
  }

  if (!mdFile.value) {
    mdErrorMessage.value = '请先上传 Markdown 文档'
    return
  }

  if (!mdFile.value.name.toLowerCase().endsWith('.md')) {
    mdErrorMessage.value = '仅支持 .md 文件'
    return
  }

  const maxFileSize = 5 * 1024 * 1024

  if (mdFile.value.size > maxFileSize) {
    mdErrorMessage.value = '文件大小不能超过 5MB，请精简文档内容'
    return
  }

  const analysisResult = readAnalysisResult()

  if (!analysisResult) {
    mdErrorMessage.value = '暂无分析结果，请先完成一次简历分析'
    return
  }

  try {
    isGeneratingRagQuestions.value = true
    mdErrorMessage.value = ''
    await requestPracticeSet(analysisResult, mdFile.value)
  } catch (error: unknown) {
    mdErrorMessage.value = getApiErrorMessage(error)
  } finally {
    isGeneratingRagQuestions.value = false
  }
}

const handlePrevious = () => {
  if (isGeneratingRagQuestions.value) {
    return
  }

  currentIndex.value = Math.max(0, currentIndex.value - 1)
}

const handleNext = () => {
  if (isGeneratingRagQuestions.value) {
    return
  }

  const total = practiceSet.value?.questions.length ?? 0
  currentIndex.value = Math.min(total - 1, currentIndex.value + 1)
}

onMounted(() => {
  // 首次进入练习页时恢复题集并关闭加载态。
  loadPracticeSet()
  isLoading.value = false
})
</script>

<template>
  <!-- 练习页主界面：无题集时提示回分析页，有题集时展示 RAG 上传区和当前题目。 -->
  <div class="min-h-screen bg-linear-to-b from-indigo-50/70 via-slate-50 to-white text-slate-900">
    <AppHeader action="reanalyze" />

    <main class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8">
      <section
        v-if="isLoading"
        class="mt-10 rounded-3xl bg-white p-5 text-center shadow-sm ring-1 ring-indigo-100"
      >
        <p class="text-sm font-semibold text-indigo-600">
          正在加载练习题...
        </p>
      </section>

      <section
        v-else-if="errorMessage"
        class="mt-10 rounded-3xl bg-white p-8 text-center shadow-sm ring-1 ring-indigo-100"
      >
        <p class="text-base font-semibold text-slate-900">
          {{ errorMessage }}
        </p>
        <p class="mt-2 text-sm text-slate-500">
          完成一次分析后，可以从结果页进入专项练习。
        </p>
        <NuxtLink
          to="/analyze"
          class="mt-5 inline-flex h-10 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700"
        >
          返回分析页
        </NuxtLink>
      </section>

      <template v-else-if="practiceSet && currentQuestion">
        <!-- 题集概览：显示岗位方向和弱项标签。 -->
        <PracticeHeader :role-type="practiceSet.roleType" :weak-skills="practiceSet.weakSkills" />

        <!-- 资料增强区：上传 Markdown 后，后端会检索相关片段并重新生成题目。 -->
        <section class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-indigo-100">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100">
                  {{ sourceLabel }}
                </span>
                <span
                  v-if="practiceSource === 'rag' && mdSourceFileName"
                  class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600"
                >
                  {{ mdSourceFileName }}
                </span>
              </div>
              <p class="mt-3 text-sm font-semibold text-slate-900">
                上传学习资料增强出题
              </p>
              <p class="mt-1 text-sm text-slate-500">
                可上传本地 Markdown 文档，系统会优先结合相关片段生成练习题。
              </p>
            </div>

            <label
              class="inline-flex h-10 items-center justify-center rounded-full border border-indigo-200 px-4 text-sm font-semibold text-indigo-600 transition hover:bg-indigo-50"
              :class="isGeneratingRagQuestions ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'"
            >
              选择 .md 文件
              <input
                class="hidden"
                type="file"
                accept=".md"
                :disabled="isGeneratingRagQuestions"
                @change="handleMdFileChange"
              >
            </label>
          </div>

          <div
            v-if="mdFile"
            class="mt-4 rounded-2xl bg-indigo-50 px-4 py-3 text-sm text-slate-700"
          >
            已选择：<span class="font-semibold text-slate-900">{{ mdFile.name }}</span>
          </div>

          <p v-if="mdErrorMessage" class="mt-3 text-sm font-medium text-red-600">
            {{ mdErrorMessage }}
          </p>

          <button
            type="button"
            :disabled="!mdFile || isGeneratingRagQuestions"
            class="mt-4 inline-flex h-11 w-full items-center justify-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300 sm:w-auto"
            @click="handleGenerateWithMd"
          >
            {{ isGeneratingRagQuestions ? '生成中...' : '基于资料生成练习题' }}
          </button>
        </section>

        <!-- RAG 生成中的占位态，避免旧题目和新请求状态混在一起。 -->
        <section
          v-if="isGeneratingRagQuestions"
          class="min-h-[320px] rounded-3xl bg-white p-6 shadow-sm ring-1 ring-indigo-100 sm:p-8"
          aria-live="polite"
        >
          <div class="flex min-h-[260px] flex-col items-center justify-center text-center">
            <div class="relative h-14 w-14">
              <span class="absolute inset-0 animate-ping rounded-full bg-indigo-200 opacity-60" />
              <span class="relative flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600">
                <span class="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              </span>
            </div>
            <p class="mt-5 text-base font-semibold text-slate-900">
              正在基于资料生成专项练习题...
            </p>
            <p class="mt-2 text-sm text-slate-500">
              正在检索资料片段并生成新的练习题组，请稍等。
            </p>
            <div class="mt-6 grid w-full gap-3">
              <div class="h-4 w-2/3 rounded-full bg-slate-100" />
              <div class="h-4 w-full rounded-full bg-slate-100" />
              <div class="h-4 w-5/6 rounded-full bg-slate-100" />
            </div>
          </div>
        </section>

        <!-- 当前题目卡：展示题干、考察意图和答题提示。 -->
        <PracticeQuestionCard
          v-else
          :key="questionRenderKey"
          :question="currentQuestion"
          :disabled="isGeneratingRagQuestions"
        />

        <!-- 题目翻页区。 -->
        <PracticeNavigation
          :current-index="currentIndex"
          :total="practiceSet.questions.length"
          :disabled="isGeneratingRagQuestions"
          @previous="handlePrevious"
          @next="handleNext"
        />
      </template>
    </main>
  </div>
</template>
