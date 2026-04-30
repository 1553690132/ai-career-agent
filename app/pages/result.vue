<script setup lang="ts">
import { mockAnalysisResult } from '../../mocks/analysis.mock'
import type { AnalysisResult } from '../../types/analysis'

const analysisResult = ref<AnalysisResult>(mockAnalysisResult)

onMounted(() => {
  const storedResult = sessionStorage.getItem('analysisResult')

  if (!storedResult) {
    return
  }

  try {
    analysisResult.value = JSON.parse(storedResult) as AnalysisResult
  } catch {
    analysisResult.value = mockAnalysisResult
  }
})
</script>

<template>
  <main class="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
    <ResultOverallScore :overall-score="analysisResult.overallScore"
      :overall-summary="analysisResult.overallSummary" :recommendation="analysisResult.recommendation" />

    <ResultScoreCards :score-cards="analysisResult.scoreCards" />

    <section class="grid grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <ResultSkillMatches :skill-matches="analysisResult.skillMatches" />

      <div class="grid grid-cols-1 gap-6">
        <ResultStrengthList :strengths="analysisResult.strengths" />
        <ResultGapList :gaps="analysisResult.gaps" />
      </div>
    </section>

    <ResultResumeSuggestions :resume-suggestions="analysisResult.resumeSuggestions" />

    <ResultInterviewQuestions :interview-questions="analysisResult.interviewQuestions" />
  </main>
</template>
