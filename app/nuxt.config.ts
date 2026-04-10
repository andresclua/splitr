import tailwindcss from '@tailwindcss/vite'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

// Load root .env for monorepo setup (app runs from app/ but .env is at root)
loadEnv({ path: resolve(__dirname, '../.env') })

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  css: ['~/assets/css/main.css'],

  vite: {
    plugins: [tailwindcss()],
  },

  modules: [
    '@nuxtjs/supabase',
    '@nuxt/content',
  ],

  supabase: {
    redirect: false,
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/signup', '/login', '/verify-email'],
    },
    clientOptions: {
      auth: {
        flowType: 'implicit',
      },
    },
  },

  content: {
    highlight: {
      theme: 'github-dark',
      langs: ['js', 'ts', 'php', 'bash', 'json', 'vue', 'sql'],
    },
  },

  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'hello@splitr.io',
    workerSecret: process.env.WORKER_SECRET,
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
  },
})
