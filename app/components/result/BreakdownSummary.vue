<script setup lang="ts">
import type { ScoreCard, SkillMatch } from '../../../types/analysis'

defineProps<{
  scoreCards: ScoreCard[]
  skillMatches: SkillMatch[]
}>()

const matchLevelClassMap: Record<SkillMatch['matchLevel'], string> = {
  strong: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  partial: 'bg-indigo-50 text-indigo-700 ring-indigo-100',
  weak: 'bg-amber-50 text-amber-700 ring-amber-100',
  missing: 'bg-rose-50 text-rose-700 ring-rose-100',
}

const matchLevelTextMap: Record<SkillMatch['matchLevel'], string> = {
  strong: 'Strong',
  partial: 'Partial',
  weak: 'Weak',
  missing: 'Missing',
}
</script>

<template>
  <section class="self-start rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 class="text-xl font-semibold tracking-tight text-slate-950">
          详细要点
        </h2>
        <p class="mt-1 text-sm text-slate-500">
          与目标JD相比的核心竞争力。
        </p>
      </div>
    </div>

    <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-2">
      <article
        v-for="card in scoreCards"
        :key="card.label"
        class="rounded-2xl bg-indigo-50/60 p-3 ring-1 ring-indigo-100"
      >
        <div class="flex items-center justify-between gap-2">
          <h3 class="line-clamp-2 text-sm font-semibold leading-5 text-slate-900">
            {{ card.label }}
          </h3>
          <span class="shrink-0 text-xl font-black text-indigo-600">{{ Math.round(card.score) }}%</span>
        </div>
        <p class="mt-2 line-clamp-2 text-xs leading-5 text-slate-600">
          {{ card.summary }}
        </p>
      </article>
    </div>

    <div class="mt-4 rounded-2xl bg-slate-50/80 p-3 ring-1 ring-slate-200">
      <div class="flex items-center justify-between gap-3 px-1">
        <h3 class="text-sm font-semibold text-slate-950">
          Skill Match Details
        </h3>
        <span class="text-xs text-slate-400">{{ skillMatches.length }} skills</span>
      </div>

      <div class="mt-3 divide-y divide-slate-200">
        <article
          v-for="skill in skillMatches.slice(0, 6)"
          :key="`${skill.skillName}-${skill.category}`"
          class="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-3"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h4 class="text-sm font-semibold text-slate-900">
                {{ skill.skillName }}
              </h4>
              <span
                class="rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1"
                :class="matchLevelClassMap[skill.matchLevel]"
              >
                {{ matchLevelTextMap[skill.matchLevel] }}
              </span>
            </div>
            <p
              v-if="skill.resumeEvidence"
              class="mt-1 line-clamp-2 text-xs leading-5 text-slate-500"
            >
              {{ skill.resumeEvidence }}
            </p>
          </div>
          <span class="text-sm font-black text-indigo-600">
            {{ Math.round(skill.score) }}%
          </span>
        </article>
      </div>
    </div>
  </section>
</template>
