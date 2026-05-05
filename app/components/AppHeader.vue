<script setup lang="ts">
// 顶部全局导航栏
type RoleType = 'frontend' | 'backend' | 'product' | 'algorithm'
type HeaderAction = 'role' | 'reanalyze'

interface RoleTypeOption {
  label: string
  value: RoleType
}

const props = withDefaults(defineProps<{
  action: HeaderAction
  roleType?: RoleType
  roleTypeOptions?: RoleTypeOption[]
  disabled?: boolean
}>(), {
  roleType: 'frontend',
  roleTypeOptions: () => [],
  disabled: false,
})

const emit = defineEmits<{
  'update:roleType': [value: RoleType]
}>()

// 将岗位下拉框的 DOM change 事件转换成父组件使用的 v-model 更新事件。
const handleRoleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:roleType', target.value as RoleType)
}
</script>

<template>
  <header class="border-b border-indigo-100 bg-white/80 backdrop-blur">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div class="flex min-w-0 items-center gap-6 sm:gap-8">
        <NuxtLink
          to="/analyze"
          class="shrink-0 text-base font-bold text-slate-900"
        >
          ResumeFlow AI
        </NuxtLink>

        <nav class="hidden items-center gap-6 text-sm text-slate-500 md:flex">
          <!-- <NuxtLink
            to="/analyze"
            class="font-semibold text-indigo-600"
          >
            Analysis
          </NuxtLink> -->
          <!-- <span>History</span>
          <span>Practice</span> -->
        </nav>
      </div>

      <label
        v-if="props.action === 'role'"
        class="flex items-center gap-2"
      >
        <span class="hidden text-sm font-medium text-slate-500 sm:inline">岗位类型</span>
        <select
          :value="props.roleType"
          :disabled="props.disabled"
          class="h-10 rounded-full border border-indigo-100 bg-indigo-50 px-4 text-sm font-medium text-indigo-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          @change="handleRoleChange"
        >
          <option
            v-for="option in props.roleTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </label>

      <NuxtLink
        v-else
        to="/analyze"
        class="rounded-full bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm shadow-indigo-200 transition hover:bg-indigo-700"
      >
        重新分析
      </NuxtLink>
    </div>
  </header>
</template>
