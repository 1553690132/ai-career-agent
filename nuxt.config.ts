// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

const env =
  (globalThis as typeof globalThis & {
    process?: {
      env?: Record<string, string | undefined>
    }
  }).process?.env ?? {}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    aiApiKey: env.AI_API_KEY || '',
    aiBaseURL: env.AI_BASE_URL || 'https://spark-api-open.xf-yun.com/x2',
    aiModel: env.AI_MODEL || 'spark-x',
  },
  vite: {
    plugins: [tailwindcss()],
  },
})
