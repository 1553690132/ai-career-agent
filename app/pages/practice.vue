<script setup lang="ts">
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

const route = useRoute()
const practiceSet = ref<PracticeSet | null>(null)
const currentIndex = ref(0)
const isLoading = ref(true)
const errorMessage = ref('')

const currentQuestion = computed(() => practiceSet.value?.questions[currentIndex.value])

const parsePracticeSet = (value: string | null | undefined): PracticeSet | null => {
  if (!value) {
    return null
  }

  try {
    return JSON.parse(value) as PracticeSet
  } catch {
    return null
  }
}

const getApiErrorMessage = (error: unknown) => {
  if (!error || typeof error !== 'object') {
    return '练习题生成失败，请稍后重试'
  }

  const apiError = error as ApiErrorResponse

  if (apiError.data?.errors?.length) {
    return apiError.data.errors.join('；')
  }

  return apiError.data?.message ?? apiError.statusMessage ?? apiError.message ?? '练习题生成失败，请稍后重试'
}

const readPracticeSetFromRoute = () => {
  const rawValue = route.query.practiceSet

  if (typeof rawValue !== 'string') {
    return null
  }

  return parsePracticeSet(decodeURIComponent(rawValue))
}

const loadPracticeSet = async () => {
  const routePracticeSet = readPracticeSetFromRoute()
  const storedPracticeSet = parsePracticeSet(sessionStorage.getItem('practiceSet'))

  if (routePracticeSet || storedPracticeSet) {
    practiceSet.value = routePracticeSet ?? storedPracticeSet
    return
  }

  const storedAnalysis = sessionStorage.getItem('analysisResult')
  const analysisResult = storedAnalysis ? (JSON.parse(storedAnalysis) as AnalysisResult) : null

  if (!analysisResult) {
    errorMessage.value = '暂无分析结果，请先完成一次简历分析'
    return
  }

  const generatedPracticeSet = await $fetch<PracticeSet>('/api/practice/generate', {
    method: 'POST',
    body: {
      analysisResult,
      roleType: route.query.roleType?.toString() || analysisResult.job.title || 'unknown',
    },
  })

  practiceSet.value = generatedPracticeSet
  sessionStorage.setItem('practiceSet', JSON.stringify(generatedPracticeSet))
}

const handlePrevious = () => {
  currentIndex.value = Math.max(0, currentIndex.value - 1)
}

const handleNext = () => {
  const total = practiceSet.value?.questions.length ?? 0
  currentIndex.value = Math.min(total - 1, currentIndex.value + 1)
}

onMounted(async () => {
  try {
    await loadPracticeSet()
  } catch (error: unknown) {
    errorMessage.value = getApiErrorMessage(error)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-gradient-to-b from-indigo-50/70 via-slate-50 to-white text-slate-900">
    <AppHeader action="reanalyze" />

    <main class="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-8 sm:px-6 lg:px-8 mt-10">
      <section v-if="isLoading" class="rounded-3xl bg-white p-5 mt-10 text-center shadow-sm ring-1 ring-indigo-100">
        <p class="text-sm font-semibold text-indigo-600">
          正在生成专项练习题...
        </p>
      </section>

      <section v-else-if="errorMessage" class="rounded-3xl bg-white p-5 mt-10 text-center shadow-sm ring-1 ring-red-100">
        <p class="text-sm font-semibold text-red-600">
          {{ errorMessage }}
        </p>
        <NuxtLink to="/analyze"
          class="mt-5 inline-flex h-10 items-center rounded-full bg-indigo-600 px-5 text-sm font-semibold text-white transition hover:bg-indigo-700">
          返回分析页
        </NuxtLink>
      </section>

      <template v-else-if="practiceSet && currentQuestion">
        <PracticeHeader :role-type="practiceSet.roleType" :weak-skills="practiceSet.weakSkills" />

        <PracticeQuestionCard :question="currentQuestion" />

        <PracticeNavigation :current-index="currentIndex" :total="practiceSet.questions.length"
          @previous="handlePrevious" @next="handleNext" />
      </template>
    </main>
  </div>
</template>
