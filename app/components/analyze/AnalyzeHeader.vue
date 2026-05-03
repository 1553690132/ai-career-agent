<script setup lang="ts">
type RoleType = 'frontend' | 'backend' | 'product' | 'algorithm'

interface RoleTypeOption {
  label: string
  value: RoleType
}

defineProps<{
  roleType: RoleType
  roleTypeOptions: RoleTypeOption[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  'update:roleType': [value: RoleType]
}>()

const handleRoleChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  emit('update:roleType', target.value as RoleType)
}
</script>

<template>
  <header class="border-b border-indigo-100 bg-white/80 backdrop-blur">
    <div class="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <div class="flex items-center gap-8">
        <NuxtLink
          to="/analyze"
          class="text-base font-bold text-slate-900"
        >
          ResumeFlow AI
        </NuxtLink>
        <nav class="hidden items-center gap-6 text-sm text-slate-500 md:flex">
          <span class="font-semibold text-indigo-600">Analysis</span>
          <span>History</span>
          <span>Practice</span>
        </nav>
      </div>

      <label class="flex items-center gap-2">
        <span class="hidden text-sm font-medium text-slate-500 sm:inline">岗位类型</span>
        <select
          :value="roleType"
          :disabled="disabled"
          class="h-10 rounded-full border border-indigo-100 bg-indigo-50 px-4 text-sm font-medium text-indigo-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:opacity-60"
          @change="handleRoleChange"
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
  </header>
</template>
