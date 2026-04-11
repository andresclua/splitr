import tailwindcss from '@tailwindcss/vite'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'path'

// Load root .env for monorepo setup (app runs from app/ but .env is at root)
loadEnv({ path: resolve(__dirname, '../.env') })

export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',

  css: ['~/assets/css/main.css'],

  app: {
    head: {
      script: [
        {
          src: 'https://www.googletagmanager.com/gtag/js?id=G-5X1YJG3CYK',
          async: true,
        },
        {
          innerHTML: `window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-5X1YJG3CYK');`,
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap' },
      ],
    },
  },

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
      exclude: ['/', '/signup', '/login', '/verify-email', '/blog', '/blog/**', '/docs', '/docs/**'],
    },
    clientOptions: {
      auth: {
        flowType: 'implicit',
      },
    },
  },

  content: {
    highlight: {
      theme: 'github-light',
      langs: ['js', 'ts', 'php', 'bash', 'json', 'vue', 'sql'],
    },
  },

  runtimeConfig: {
    supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    resendApiKey: process.env.RESEND_API_KEY,
    resendFromEmail: process.env.RESEND_FROM_EMAIL || 'hello@koryla.com',
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || 'http://localhost:3000',
    },
  },

  routeRules: {
    '/dashboard/**': { ssr: false },
  },
})
