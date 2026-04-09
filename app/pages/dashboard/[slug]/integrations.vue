<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth' })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
await fetchWorkspaces()
if (!currentWorkspace.value) await navigateTo('/dashboard', { replace: true })

const slug = currentWorkspace.value!.slug

// ── Platform tabs ─────────────────────────────────────────
const platforms = [
  { id: 'next',       label: 'Next.js',    badge: 'Vercel Edge' },
  { id: 'netlify',    label: 'Netlify',    badge: 'Edge Functions' },
  { id: 'node',       label: 'Node.js',    badge: 'Railway · Render · Fly' },
  { id: 'cloudflare', label: 'Cloudflare', badge: 'CF Workers' },
]
const active = ref('next')

// ── Copy helper ───────────────────────────────────────────
const copied = ref<string | null>(null)
const copy = (id: string, text: string) => {
  navigator.clipboard.writeText(text)
  copied.value = id
  setTimeout(() => copied.value = null, 2000)
}

// ── Code snippets ─────────────────────────────────────────
const appUrl = import.meta.client ? window.location.origin : 'https://your-splitr-app.vercel.app'

const snippets = {
  next: {
    install: `npm install @splitr/next`,
    env: `# .env.local
SPLITR_API_KEY=sk_live_...   # Settings → API Keys
SPLITR_API_URL=${appUrl}`,
    middleware: `// middleware.ts  (project root)
import { splitrMiddleware } from '@splitr/next'

export default splitrMiddleware({
  apiKey: process.env.SPLITR_API_KEY!,
  apiUrl: process.env.SPLITR_API_URL!,
})

// Only intercept the pages you're testing
export const config = {
  matcher: ['/', '/pricing', '/landing'],
}`,
    variant: `// app/variant-b/page.tsx  ← your variant page
export default function VariantB() {
  return <main>...</main>   // different copy, layout, CTA
}`,
  },
  netlify: {
    install: `npm install @splitr/netlify`,
    env: `# Netlify dashboard → Site settings → Environment variables
SPLITR_API_KEY=sk_live_...
SPLITR_API_URL=${appUrl}`,
    middleware: `// netlify/edge-functions/splitr.ts
import { splitrMiddleware } from '@splitr/netlify'

export default splitrMiddleware({
  apiKey: Deno.env.get('SPLITR_API_KEY')!,
  apiUrl: Deno.env.get('SPLITR_API_URL')!,
})

export const config = {
  path: ['/', '/pricing', '/landing'],
}`,
    variant: `// src/pages/variant-b.astro  (or .tsx, .svelte, etc.)
---
// your variant page — different hero, copy, or layout
---
<main>...</main>`,
  },
  node: {
    install: `npm install @splitr/node`,
    env: `# .env
SPLITR_API_KEY=sk_live_...
SPLITR_API_URL=${appUrl}`,
    middleware: `import express from 'express'
import { splitrMiddleware } from '@splitr/node'

const app = express()

// Add Splitr before your routes
app.use(splitrMiddleware({
  apiKey: process.env.SPLITR_API_KEY!,
  apiUrl: process.env.SPLITR_API_URL!,
}))

// Variant pages must exist as routes in the same app
app.get('/', (req, res) => res.render('home'))
app.get('/variant-b', (req, res) => res.render('home-variant-b'))`,
    variant: `// Both routes must exist in your app
// Splitr rewrites req.url internally — the browser sees /`,
  },
  cloudflare: {
    install: `# 1. Create a KV namespace
wrangler kv namespace create SPLITR_CONFIG

# 2. Set your API key as a secret
wrangler secret put SPLITR_API_KEY`,
    env: `# wrangler.toml
name = "my-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[vars]
SPLITR_API_URL = "${appUrl}"

[[kv_namespaces]]
binding = "SPLITR_CONFIG"
id = "paste-your-kv-id-here"`,
    middleware: `// src/index.ts  — your existing worker
import { splitrWorker } from './splitr'   // copy from worker/src/index.ts

export default {
  async fetch(request, env, ctx) {
    return splitrWorker(request, env, ctx)
  }
}`,
    variant: `# Deploy
wrangler deploy

# The worker intercepts requests to your zone
# and rewrites them to the variant URL`,
  },
}

type Platform = keyof typeof snippets
const s = computed(() => snippets[active.value as Platform])

// ── Steps per platform ────────────────────────────────────
const steps: Record<string, { title: string; key: string }[]> = {
  next:       [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Create middleware.ts', key: 'middleware' }, { title: 'Add your variant page', key: 'variant' }],
  netlify:    [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Create edge function', key: 'middleware' }, { title: 'Add your variant page', key: 'variant' }],
  node:       [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Add middleware', key: 'middleware' }, { title: 'Add variant routes', key: 'variant' }],
  cloudflare: [{ title: 'Create KV + secret', key: 'install' }, { title: 'Configure wrangler.toml', key: 'env' }, { title: 'Add to your worker', key: 'middleware' }, { title: 'Deploy', key: 'variant' }],
}
</script>

<template>
  <div class="p-8 max-w-3xl space-y-8">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h1>
      <p class="text-sm text-gray-500 mt-1">
        Install Splitr on your stack. Variant assignment happens server-side —
        no flicker, no extra JavaScript in the browser.
      </p>
    </div>

    <!-- How it works — 3 steps -->
    <div class="grid grid-cols-3 gap-3">
      <div v-for="(item, i) in [
        { n: '1', title: 'Generate an API key', desc: 'Settings → API Keys → New key', href: `/dashboard/${slug}/settings` },
        { n: '2', title: 'Install the adapter', desc: 'Pick your platform below and follow the steps' },
        { n: '3', title: 'Create an experiment', desc: 'Dashboard → New experiment → set Active', href: `/dashboard/${slug}` },
      ]" :key="i" class="bg-white border border-gray-200 rounded-2xl p-4">
        <div class="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center mb-3">{{ item.n }}</div>
        <p class="text-sm font-semibold text-gray-800">{{ item.title }}</p>
        <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ item.desc }}</p>
        <NuxtLink v-if="item.href" :to="item.href" class="text-xs text-blue-600 hover:underline mt-1.5 inline-block">Go →</NuxtLink>
      </div>
    </div>

    <!-- Platform tabs -->
    <div>
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button
          v-for="p in platforms" :key="p.id"
          :class="[
            'flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all',
            active === p.id
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          ]"
          @click="active = p.id"
        >
          {{ p.label }}
          <span class="text-[10px] font-normal mt-0.5" :class="active === p.id ? 'text-gray-400' : 'text-gray-400'">{{ p.badge }}</span>
        </button>
      </div>

      <!-- Steps -->
      <div class="space-y-4">
        <div
          v-for="(step, i) in steps[active]" :key="step.key"
          class="bg-white border border-gray-200 rounded-2xl overflow-hidden"
        >
          <!-- Step header -->
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
              {{ i + 1 }}
            </div>
            <p class="text-sm font-semibold text-gray-800">{{ step.title }}</p>
          </div>

          <!-- Code block -->
          <div class="relative group">
            <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 whitespace-pre">{{ (s as any)[step.key] }}</pre>
            <button
              :class="[
                'absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all',
                copied === `${active}-${step.key}`
                  ? 'bg-green-100 text-green-700'
                  : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100'
              ]"
              @click="copy(`${active}-${step.key}`, (s as any)[step.key])"
            >
              {{ copied === `${active}-${step.key}` ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- No flicker callout -->
    <div class="bg-blue-50 border border-blue-100 rounded-2xl px-6 py-5">
      <p class="text-sm font-semibold text-blue-900 mb-2">Why no flicker?</p>
      <p class="text-sm text-blue-700 leading-relaxed">
        Tools like VWO and Optimizely run in the browser — they hide the page, swap content, then reveal it.
        Splitr decides the variant <strong>before any HTML leaves the server</strong>.
        The browser only ever receives the assigned variant. Nothing to flash.
      </p>
      <div class="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div class="bg-white/60 rounded-xl p-3">
          <p class="font-semibold text-red-600 mb-1">VWO / Optimizely</p>
          <p class="text-blue-700">JS loads → page hides → content swaps → page shows<br/>~80–150KB extra JS · blockable</p>
        </div>
        <div class="bg-white/60 rounded-xl p-3">
          <p class="font-semibold text-green-600 mb-1">Splitr</p>
          <p class="text-blue-700">Server picks variant → sends correct HTML<br/>0KB extra JS · not blockable</p>
        </div>
      </div>
    </div>

  </div>
</template>
