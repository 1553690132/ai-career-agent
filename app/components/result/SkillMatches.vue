<script setup lang="ts">
// 技能匹配列表：对比简历证据和岗位要求，展示每项技能的匹配等级。
import type { MatchLevel, SkillMatch } from '../../../types/analysis'

const props = defineProps<{
  skillMatches: SkillMatch[]
}>()

// 将匹配等级枚举转为标签文案和状态色。
const matchLevelLabel: Record<MatchLevel, string> = {
  strong: '强匹配',
  partial: '部分匹配',
  weak: '较弱',
  missing: '缺失',
}

const matchLevelClass: Record<MatchLevel, string> = {
  strong: 'bg-emerald-100 text-emerald-700 ring-emerald-200',
  partial: 'bg-sky-100 text-sky-700 ring-sky-200',
  weak: 'bg-amber-100 text-amber-700 ring-amber-200',
  missing: 'bg-rose-100 text-rose-700 ring-rose-200',
}
</script>

<template>
  <!-- 每条技能匹配包含候选人证据、岗位要求和匹配得分。 -->
  <section class="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
    <h2 class="text-lg font-semibold text-slate-950">技能匹配</h2>

    <div class="mt-4 divide-y divide-slate-100">
      <article
        v-for="skill in props.skillMatches"
        :key="skill.skillName"
        class="py-4 first:pt-0 last:pb-0"
      >
        <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 class="font-medium text-slate-950">{{ skill.skillName }}</h3>
            <p class="mt-1 text-sm text-slate-500">{{ skill.category }}</p>
          </div>

          <div class="flex items-center gap-3">
            <span
              class="rounded-full px-2.5 py-1 text-xs font-medium ring-1"
              :class="matchLevelClass[skill.matchLevel]"
            >
              {{ matchLevelLabel[skill.matchLevel] }}
            </span>
            <span class="text-sm font-semibold text-slate-800">{{ skill.score }}</span>
          </div>
        </div>

        <div class="mt-3 grid grid-cols-1 gap-3 text-sm leading-6 text-slate-600 md:grid-cols-2">
          <p v-if="skill.resumeEvidence">
            <span class="font-medium text-slate-800">简历证据：</span>{{ skill.resumeEvidence }}
          </p>
          <p v-if="skill.jobRequirement">
            <span class="font-medium text-slate-800">岗位要求：</span>{{ skill.jobRequirement }}
          </p>
        </div>
      </article>
    </div>
  </section>
</template>
