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
    llmProvider: env.LLM_PROVIDER || 'spark',
    sparkApiKey: env.SPARK_API_KEY || '',
    sparkBaseURL: env.SPARK_BASE_URL || 'https://spark-api-open.xf-yun.com/x2',
    sparkModel: env.SPARK_MODEL || 'spark-x',
    mimoApiKey: env.MIMO_API_KEY || '',
    mimoBaseURL: env.MIMO_BASE_URL || 'https://api.xiaomimimo.com/v1',
    mimoModel: env.MIMO_MODEL || 'mimo-v2-flash',
    embeddingProvider: env.EMBEDDING_PROVIDER || 'local-hash',
    embeddingApiKey: env.EMBEDDING_API_KEY || '',
    embeddingBaseURL: env.EMBEDDING_BASE_URL || '',
    embeddingModel: env.EMBEDDING_MODEL || '',
    vectorStoreProvider: env.VECTOR_STORE_PROVIDER || 'memory',
    chromaUrl: env.CHROMA_URL || 'http://localhost:8000',
    chromaCollection: env.CHROMA_COLLECTION || 'resume_practice_docs',
  },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
      ],
    },
  },
})
