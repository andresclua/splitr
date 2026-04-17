<script setup lang="ts">
definePageMeta({ layout: 'dashboard', middleware: 'auth', key: route => route.path })

const { currentWorkspace, fetchWorkspaces } = useWorkspace()
await fetchWorkspaces()
if (!currentWorkspace.value) throw createError({ statusCode: 404, statusMessage: "Workspace not found or you don't have access to it." })

const slug = currentWorkspace.value!.slug
const workspaceId = currentWorkspace.value!.id

// ── Data ──────────────────────────────────────────────────
interface Variant { id: string; name: string; traffic_weight: number; is_control: boolean }
interface Experiment { id: string; name: string; status: string; type: string; variants: Variant[] }
interface ApiKey { id: string; key_prefix: string }

const route = useRoute()
const { data: experiments } = await useFetch<Experiment[]>(() => `/api/workspaces/${route.params.slug}/experiments`)
const { data: keys } = await useFetch<ApiKey[]>(() => `/api/workspaces/${route.params.slug}/keys`)

const appUrl = import.meta.client ? window.location.origin : 'https://app.koryla.com'

// ── Mode toggle ───────────────────────────────────────────
const mode = ref<'edge' | 'sdk' | 'devs'>('edge')

// ── Copy helper ───────────────────────────────────────────
const copied = ref<string | null>(null)
const copy = (id: string, text: string) => {
  navigator.clipboard.writeText(text)
  copied.value = id
  setTimeout(() => copied.value = null, 2000)
}

// ── Code Generator ────────────────────────────────────────
const genExperimentId = ref<string>('')
const genFramework = ref<string>('next')

const genExperiment = computed(() =>
  (experiments.value ?? []).find(e => e.id === genExperimentId.value) ?? null
)

const genFrameworks = [
  { id: 'next',      label: 'Next.js' },
  { id: 'netlify',   label: 'Netlify' },
  { id: 'node',      label: 'Node.js' },
  { id: 'react',     label: 'React (SDK)' },
  { id: 'vue',       label: 'Vue / Nuxt (SDK)' },
  { id: 'astro',     label: 'Astro (SDK)' },
  { id: 'wordpress', label: 'WordPress' },
  { id: 'webflow',   label: 'Webflow (via Cloudflare)' },
]

const keyHint = computed(() => {
  const k = (keys.value ?? [])[0]
  return k ? `sk_live_${k.key_prefix}...` : 'sk_live_YOUR_KEY'
})

const generatedCode = computed(() => {
  const exp = genExperiment.value
  if (!exp) return ''
  const expId = exp.id
  const variants = exp.variants ?? []
  const firstVariantId = variants.find(v => v.is_control)?.id ?? variants[0]?.id ?? 'VARIANT_ID'
  const secondVariantId = variants.find(v => !v.is_control)?.id ?? variants[1]?.id ?? 'VARIANT_B_ID'
  const controlName = variants.find(v => v.is_control)?.name ?? 'Control'
  const variantBName = variants.find(v => !v.is_control)?.name ?? 'Variant B'

  const fw = genFramework.value
  const isShellStyle = fw === 'wordpress' || fw === 'webflow'
  const variantComment = variants.map(v => isShellStyle
    ? `#   ${v.is_control ? 'control' : v.name.toLowerCase().replace(/\s+/g, '-')} → "${v.id}"`
    : `  //   ${v.is_control ? 'control' : v.name.toLowerCase().replace(/\s+/g, '-')} → "${v.id}"`
  ).join('\n')

  if (fw === 'next') return `// middleware.ts
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,  // ${keyHint.value}
  apiUrl: '${appUrl}',
})

export const config = { matcher: ['/YOUR_PAGE_PATH'] }

// Experiment: "${exp.name}"
// Variant IDs:
${variantComment}
// Your variant page → app/YOUR_VARIANT_PATH/page.tsx`

  if (fw === 'netlify') return `// netlify/edge-functions/koryla.ts
import { korylaMiddleware } from '@koryla/netlify'

export default korylaMiddleware({
  apiKey: Deno.env.get('KORYLA_API_KEY')!,  // ${keyHint.value}
  apiUrl: Deno.env.get('KORYLA_API_URL') ?? '${appUrl}',
})

export const config = { path: ['/YOUR_PAGE_PATH'] }

// Experiment: "${exp.name}"
// Variant IDs:
${variantComment}`

  if (fw === 'node') return `import { korylaMiddleware } from '@koryla/node'

app.use(korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,  // ${keyHint.value}
  apiUrl: '${appUrl}',
}))

// Experiment: "${exp.name}"
// Variant IDs:
${variantComment}
// Add variant routes:
// app.get('/YOUR_VARIANT_PATH', (req, res) => res.render('variant'))`

  if (fw === 'react') return `// lib/koryla.ts
import { createKoryla } from '@koryla/react/server'

export const koryla = createKoryla({
  apiKey: process.env.KORYLA_API_KEY!,  // ${keyHint.value}
  apiUrl: '${appUrl}',
})

// app/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'
import { Experiment, Variant } from '@koryla/react'

export default async function Page() {
  const result = await koryla.getVariant(
    '${expId}',  // ${exp.name}
    headers().get('cookie') ?? '',
  )

  return (
    <Experiment variantId={result?.variantId ?? ''}>
      <Variant id="${firstVariantId}">{/* ${controlName} */}</Variant>
      <Variant id="${secondVariantId}">{/* ${variantBName} */}</Variant>
    </Experiment>
  )
}

// Conversion page:
// if (result) await koryla.reportConversion(result)`

  if (fw === 'vue') return `<!-- pages/your-page.vue -->
${'<'}script setup lang="ts">
import { getKorylaVariant, KExperiment, KVariant } from '@koryla/vue'

const headers = use${'R'}equestHeaders(['cookie'])
const config = use${'R'}untimeConfig()

const result = await getKorylaVariant(
  '${expId}',  // ${exp.name}
  headers.cookie ?? '',
  { apiKey: config.korylaApiKey, apiUrl: config.korylaApiUrl },
  // korylaApiUrl: '${appUrl}'
)
${'<'}/script>

<template>
  <KExperiment :variant-id="result?.variantId ?? ''">
    <KVariant id="${firstVariantId}"><!-- ${controlName} --></KVariant>
    <KVariant id="${secondVariantId}"><!-- ${variantBName} --></KVariant>
  </KExperiment>
</template>

<!-- Conversion page:
if (result) await reportKorylaConversion(result, { apiKey, apiUrl }) -->`

  if (fw === 'astro') return `---
// src/pages/your-page.astro
import { getVariant } from '@koryla/astro'

const result = await getVariant(Astro.request, '${expId}', {
  // ${exp.name}
  apiKey: import.meta.env.KORYLA_API_KEY,  // ${keyHint.value}
  apiUrl: '${appUrl}',
})

if (result?.isNewAssignment) {
  Astro.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', path: '/',
  })
}
---

{result?.variantId === '${firstVariantId}' && <${controlName.replace(/\s+/g, '')} />}
{result?.variantId === '${secondVariantId}' && <${variantBName.replace(/\s+/g, '')} />}

<!-- Conversion page:
await reportConversion(result, { apiKey, apiUrl }) -->`

  if (fw === 'wordpress') return `# WordPress plugin — Experiment: "${exp.name}"
# Variant IDs:
${variantComment}
#
# 1. WP Admin → Koryla → paste your API key (${keyHint.value})
# 2. Create a WordPress page for each variant URL
# 3. Activate the experiment in Koryla Dashboard
# 4. The plugin assigns variants in PHP — no JavaScript needed.`

  if (fw === 'webflow') return `# Webflow — Experiment: "${exp.name}"
# Variant IDs:
${variantComment}
#
# Webflow doesn't run server code — use a Cloudflare Worker:
# 1. Add your Webflow domain to Cloudflare (free plan)
# 2. Deploy the Koryla Worker (Integrations → Cloudflare tab)
# 3. Create variant pages in the Webflow Designer
# 4. Experiment ID: ${expId}`

  return ''
})

// ── Edge platforms ────────────────────────────────────────
const edgePlatforms = [
  { id: 'next',       label: 'Next.js',    badge: 'Vercel Edge' },
  { id: 'netlify',    label: 'Netlify',    badge: 'Edge Functions' },
  { id: 'node',       label: 'Node.js',    badge: 'Railway · Render · Fly' },
  { id: 'cloudflare', label: 'Cloudflare', badge: 'CF Workers' },
  { id: 'wordpress',  label: 'WordPress',  badge: 'PHP Plugin' },
  { id: 'webflow',    label: 'Webflow',    badge: 'via Cloudflare' },
]
const activeEdge = ref('next')

const sdkPlatforms = [
  { id: 'react', label: 'React',  badge: 'Next.js · Remix' },
  { id: 'vue',   label: 'Vue',    badge: 'Nuxt 3/4' },
  { id: 'astro', label: 'Astro',  badge: 'Astro 4+' },
]
const activeSdk = ref('react')

// ── Snippets (generic) ────────────────────────────────────
const edgeSnippets = {
  next: {
    install: `npm install @koryla/next`,
    env: `# .env.local
KORYLA_API_KEY=sk_live_...   # Settings → API Keys
KORYLA_API_URL=${appUrl}`,
    middleware: `// middleware.ts  (project root)
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

export const config = {
  matcher: ['/', '/pricing', '/landing'],
}`,
    variant: `// app/variant-b/page.tsx
export default function VariantB() {
  return <main>...</main>
}`,
  },
  netlify: {
    install: `npm install @koryla/netlify`,
    env: `# Netlify → Site settings → Environment variables
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=${appUrl}`,
    middleware: `// netlify/edge-functions/koryla.ts
import { korylaMiddleware } from '@koryla/netlify'

export default korylaMiddleware({
  apiKey: Deno.env.get('KORYLA_API_KEY')!,
  apiUrl: Deno.env.get('KORYLA_API_URL')!,
})

export const config = {
  path: ['/', '/pricing'],
}`,
    variant: `// src/pages/variant-b.astro
---
// your variant page
---
<main>...</main>`,
  },
  node: {
    install: `npm install @koryla/node`,
    env: `# .env
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=${appUrl}`,
    middleware: `import express from 'express'
import { korylaMiddleware } from '@koryla/node'

const app = express()

app.use(korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
}))

app.get('/', (req, res) => res.render('home'))
app.get('/variant-b', (req, res) => res.render('home-variant-b'))`,
    variant: `// Both routes must exist — Koryla rewrites internally`,
  },
  cloudflare: {
    install: `wrangler kv namespace create KORYLA_CONFIG
wrangler secret put KORYLA_API_KEY`,
    env: `# wrangler.toml
[vars]
KORYLA_API_URL = "${appUrl}"`,
    middleware: `// src/index.ts
import { korylaWorker } from './koryla'

export default {
  async fetch(request, env, ctx) {
    return korylaWorker(request, env, ctx)
  }
}`,
    variant: `wrangler deploy`,
  },
  wordpress: {
    install: `# 1. Download the plugin file
curl -O https://raw.githubusercontent.com/andresclua/koryla/main/plugin/koryla.php

# 2. Place it in your WordPress plugins folder
cp koryla.php /wp-content/plugins/koryla/koryla.php

# 3. Activate from WP Admin → Plugins → Installed Plugins`,
    env: `# WP Admin → Koryla → Settings
# Paste your API key (sk_live_... from Dashboard → Settings → API Keys)
# The plugin fetches your active experiments automatically.`,
    middleware: `# WP Admin → Pages → Add New
# Create a page for each variant at the variant URL, e.g.:
#
#   Original page   /pricing       ← control
#   Variant page    /pricing-v2    ← variant B
#
# The plugin redirects server-side (PHP) before WordPress renders.
# Set variant pages to Draft or Private to hide them from the sitemap.`,
    variant: `# Verify it's working:
# 1. Open an incognito window and visit your base URL
# 2. DevTools → Application → Cookies
#    Look for:  ky_{experimentId}  (set by PHP, not JavaScript)
# 3. Clear the cookie and reload a few times to confirm traffic splitting

# Note: WordPress uses a 302 redirect (visible to browser).
# For a fully transparent rewrite, pair with a Cloudflare Worker.`,
  },
  webflow: {
    install: `# Webflow doesn't support server-side code directly.
# The recommended approach: put a Cloudflare Worker in front of your Webflow domain.
#
# 1. Make sure your Webflow site uses a custom domain (e.g. acme.com)
# 2. Add acme.com to Cloudflare (free plan works)
# 3. Point your domain's nameservers to Cloudflare
# 4. Deploy the Koryla Cloudflare Worker (see Cloudflare tab)`,
    env: `# wrangler.toml
name = "koryla-webflow"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[vars]
KORYLA_API_URL = "${appUrl}"

# Your Webflow site continues to serve pages normally.
# The Worker intercepts requests at the CDN edge before they reach Webflow.`,
    middleware: `// src/index.ts — same Worker as the Cloudflare tab
import { korylaWorker } from './koryla'

export default {
  async fetch(request, env, ctx) {
    return korylaWorker(request, env, ctx)
  }
}

// Koryla rewrites /pricing → /pricing-b transparently.
// Create the variant page in Webflow at /pricing-b.
// Publish it — Webflow serves it, the Worker decides who sees it.`,
    variant: `# In Webflow:
# 1. Create your variant page (e.g. /pricing-b) in the Webflow Designer
# 2. Publish the site
# 3. In Koryla Dashboard → New experiment:
#    Base URL:      https://acme.com/pricing
#    Variant B URL: https://acme.com/pricing-b
#    Conversion URL: https://acme.com/thank-you
# 4. Set experiment to Active — done.`,
  },
}

const sdkSnippets = {
  react: {
    install: `npm install @koryla/react`,
    env: `# .env.local
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=${appUrl}`,
    usage: `// lib/koryla.ts
import { createKoryla } from '@koryla/react/server'

export const koryla = createKoryla({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

// app/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'
import { Experiment, Variant } from '@koryla/react'

export default async function Page() {
  const result = await koryla.getVariant(
    'YOUR_EXPERIMENT_ID',
    headers().get('cookie') ?? '',
  )
  return (
    <Experiment variantId={result?.variantId ?? ''}>
      <Variant id="control"><HeroOriginal /></Variant>
      <Variant id="variant-b"><HeroVariantB /></Variant>
    </Experiment>
  )
}`,
    conversion: `// app/thank-you/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'

export default async function ThankYou() {
  const result = await koryla.getVariant(
    'YOUR_EXPERIMENT_ID',
    headers().get('cookie') ?? '',
  )
  if (result) await koryla.reportConversion(result)
  return <main>Thank you!</main>
}`,
  },
  vue: {
    install: `npm install @koryla/vue`,
    env: `# nuxt.config.ts → runtimeConfig
runtimeConfig: {
  korylaApiKey: process.env.KORYLA_API_KEY,
  korylaApiUrl: '${appUrl}',
}`,
    usage: `<!-- pages/index.vue -->
${'<'}script setup lang="ts">
import { getKorylaVariant, KExperiment, KVariant } from '@koryla/vue'

const headers = use${'R'}equestHeaders(['cookie'])
const config = use${'R'}untimeConfig()

const result = await getKorylaVariant(
  'YOUR_EXPERIMENT_ID',
  headers.cookie ?? '',
  { apiKey: config.korylaApiKey, apiUrl: config.korylaApiUrl },
)
${'<'}/script>

<template>
  <KExperiment :variant-id="result?.variantId ?? ''">
    <KVariant id="control"><HeroOriginal /></KVariant>
    <KVariant id="variant-b"><HeroVariantB /></KVariant>
  </KExperiment>
</template>`,
    conversion: `<!-- pages/thank-you.vue -->
${'<'}script setup lang="ts">
import { getKorylaVariant, reportKorylaConversion } from '@koryla/vue'

const headers = use${'R'}equestHeaders(['cookie'])
const config = use${'R'}untimeConfig()

const result = await getKorylaVariant('YOUR_EXPERIMENT_ID', headers.cookie ?? '', {
  apiKey: config.korylaApiKey, apiUrl: config.korylaApiUrl,
})
if (result) await reportKorylaConversion(result, {
  apiKey: config.korylaApiKey, apiUrl: config.korylaApiUrl,
})
${'<'}/script>`,
  },
  astro: {
    install: `npm install @koryla/astro`,
    env: `# .env
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=${appUrl}`,
    usage: `---
import { getVariant } from '@koryla/astro'
import HeroOriginal from '../components/HeroOriginal.astro'
import HeroVariantB from '../components/HeroVariantB.astro'

const result = await getVariant(Astro.request, 'YOUR_EXPERIMENT_ID', {
  apiKey: import.meta.env.KORYLA_API_KEY,
  apiUrl: import.meta.env.KORYLA_API_URL,
})

if (result?.isNewAssignment) {
  Astro.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30, sameSite: 'lax', path: '/',
  })
}
---

{result?.variantId === 'control' && <HeroOriginal />}
{result?.variantId === 'variant-b' && <HeroVariantB />}`,
    conversion: `---
import { getVariant, reportConversion } from '@koryla/astro'

const result = await getVariant(Astro.request, 'YOUR_EXPERIMENT_ID', {
  apiKey: import.meta.env.KORYLA_API_KEY,
  apiUrl: import.meta.env.KORYLA_API_URL,
})
if (result) await reportConversion(result, {
  apiKey: import.meta.env.KORYLA_API_KEY,
  apiUrl: import.meta.env.KORYLA_API_URL,
})
---
<main>Thank you!</main>`,
  },
}

// ── For devs snippets ─────────────────────────────────────
const devsSnippets = {
  config: `// 1. Fetch your active experiments
const res = await fetch('${appUrl}/api/worker/config', {
  headers: { Authorization: 'Bearer YOUR_API_KEY' },
})
const experiments = await res.json()
// Returns: [{ id, name, base_url, conversion_url, variants: [{ id, name, traffic_weight, is_control }] }]`,

  assign: `// 2. Read or assign a variant
const COOKIE_PREFIX = 'ky_'

function parseCookies(header: string) {
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(s => s.trim())).filter(([k]) => k)
  )
}

function assignVariant(variants: { id: string; traffic_weight: number }[]) {
  const total = variants.reduce((s, v) => s + v.traffic_weight, 0)
  let rand = Math.random() * total
  for (const v of variants) { rand -= v.traffic_weight; if (rand <= 0) return v.id }
  return variants[variants.length - 1].id
}

// In your request handler:
const cookies = parseCookies(request.headers.get('cookie') ?? '')
const cookieName = \`\${COOKIE_PREFIX}\${experiment.id}\`
const sessionId = cookies['ky_session'] ?? crypto.randomUUID()

let variantId = cookies[cookieName]
if (!variantId || !experiment.variants.find(v => v.id === variantId)) {
  variantId = assignVariant(experiment.variants)
  // Set cookie in your response:
  // Set-Cookie: {cookieName}={variantId}; Path=/; Max-Age=2592000; SameSite=Lax
  // Set-Cookie: ky_session={sessionId}; Path=/; Max-Age=31536000; SameSite=Lax
}`,

  events: `// 3. Fire impression & conversion events
async function track(payload: {
  experiment_id: string
  variant_id: string
  session_id: string
  event_type: 'impression' | 'conversion'
}) {
  await fetch('${appUrl}/api/worker/event', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer YOUR_API_KEY',
    },
    body: JSON.stringify(payload),
  })
}

// On the test page → fire impression
await track({ experiment_id, variant_id, session_id, event_type: 'impression' })

// On the conversion page → fire conversion
await track({ experiment_id, variant_id, session_id, event_type: 'conversion' })
// Impressions are deduplicated per session automatically.`,

  cookies: `// Cookie contract
// ky_{experimentId}  →  variantId          (30 days, SameSite=Lax)
// ky_session         →  random session ID  (1 year,  SameSite=Lax)

// Example cookies after assignment:
// ky_830126c2-a494-479a-a065-0da10614be83=05934428-b240-4829-96b1-e617d74a7448
// ky_session=f3a1c82d-9b4e-4d71-b2f7-0e3a7c5d9f12`,
}

// ── Impression tracking snippet ───────────────────────────
const impressionSnippet = computed(() => `${'<'}script>
(function(){
  var w='${workspaceId}',a='${appUrl}';
  function sid(){try{return crypto.randomUUID()}catch(e){return Math.random().toString(36).slice(2)+Date.now().toString(36)}}
  var c=document.cookie.split(';').reduce(function(o,p){var s=p.trim().split('=');if(s[0])o[decodeURIComponent(s[0])]=decodeURIComponent(s[1]||'');return o},{});
  var s=c['ky_session'];
  if(!s){s=sid();document.cookie='ky_session='+s+';path=/;max-age=31536000;samesite=lax'}
  Object.keys(c).filter(function(k){return k.indexOf('ky_')===0&&k!=='ky_session'}).forEach(function(k){
    var v=c[k],e=k.slice(3);
    window.dispatchEvent(new CustomEvent('koryla:impression',{detail:{experiment_id:e,variant_id:v,session_id:s}}));
    fetch(a+'/api/public/'+w+'/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({experiment_id:e,variant_id:v,session_id:s,event_type:'impression'})}).catch(function(){});
  });
})();
${'<'}/script>`)

type EdgePlatform = keyof typeof edgeSnippets
type SdkPlatform = keyof typeof sdkSnippets

const edgeSteps: Record<string, { title: string; key: string }[]> = {
  next:       [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Create middleware.ts', key: 'middleware' }, { title: 'Add your variant page', key: 'variant' }],
  netlify:    [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Create edge function', key: 'middleware' }, { title: 'Add your variant page', key: 'variant' }],
  node:       [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Add middleware', key: 'middleware' }, { title: 'Add variant routes', key: 'variant' }],
  cloudflare: [{ title: 'Create KV + secret', key: 'install' }, { title: 'Configure wrangler.toml', key: 'env' }, { title: 'Add to your worker', key: 'middleware' }, { title: 'Deploy', key: 'variant' }],
  wordpress:  [{ title: 'Install the plugin', key: 'install' }, { title: 'Add your API key', key: 'env' }, { title: 'Create variant pages', key: 'middleware' }, { title: 'Verify it\'s working', key: 'variant' }],
  webflow:    [{ title: 'Connect Cloudflare to your domain', key: 'install' }, { title: 'Configure wrangler.toml', key: 'env' }, { title: 'Deploy the Worker', key: 'middleware' }, { title: 'Create variant pages in Webflow', key: 'variant' }],
}

const sdkSteps: Record<string, { title: string; key: string }[]> = {
  react: [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Render variants in your page', key: 'usage' }, { title: 'Track conversions', key: 'conversion' }],
  vue:   [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Render variants in your page', key: 'usage' }, { title: 'Track conversions', key: 'conversion' }],
  astro: [{ title: 'Install', key: 'install' }, { title: 'Environment variables', key: 'env' }, { title: 'Render variants in your page', key: 'usage' }, { title: 'Track conversions', key: 'conversion' }],
}

const devsSteps = [
  {
    title: 'Fetch your experiment config',
    key: 'config',
    description: 'Call this endpoint once per incoming request — or cache the response for up to 60 seconds to reduce latency. It returns all your active experiments along with their variants and traffic weights. Pass your API key in the Authorization header.',
  },
  {
    title: 'Read or assign a variant',
    key: 'assign',
    description: 'Before rendering anything, check the incoming cookies for an existing variant assignment. If the visitor already has a cookie for this experiment, use that variant — this guarantees the same visitor always sees the same version. If they\'re new (no cookie), pick a variant using weighted random selection, then set the cookie on your response so the assignment is remembered for future visits.',
  },
  {
    title: 'Fire impression & conversion events',
    key: 'events',
    description: 'Report two types of events to the dashboard. Fire an impression once per page view on the test page, and a conversion once the visitor reaches your goal URL. Impressions are automatically deduplicated by session ID — calling this multiple times for the same session only counts once, so it\'s safe to fire on every render.',
  },
  {
    title: 'Cookie contract',
    key: 'cookies',
    description: 'Your implementation must set two cookies. The variant cookie ties a visitor to a specific variant for 30 days so they don\'t see different versions on return visits. The session cookie is a stable identifier used to deduplicate impressions and connect conversions back to the right session — without it, every page load would count as a new impression.',
  },
]

const es = computed(() => edgeSnippets[activeEdge.value as EdgePlatform])
const ss = computed(() => sdkSnippets[activeSdk.value as SdkPlatform])

</script>

<template>
  <div class="p-8 max-w-3xl space-y-8">

    <!-- Header -->
    <div>
      <h1 class="text-2xl font-bold text-gray-900 tracking-tight">Integrations</h1>
      <p class="text-sm text-gray-500 mt-1 leading-relaxed max-w-xl">Koryla runs experiments at the <strong class="text-gray-700">server edge</strong> — before any HTML reaches the browser — or inside a <strong class="text-gray-700">component</strong> using the SDK. No flicker, no extra JavaScript. Pick the approach that fits your stack.</p>
    </div>

    <!-- How it works -->
    <div class="grid grid-cols-3 gap-3">
      <div v-for="(item, i) in [
        { n: '1', title: 'Generate an API key', desc: 'Settings → API Keys → New key', href: `/dashboard/${slug}/settings` },
        { n: '2', title: 'Install the adapter', desc: 'Pick your integration below and follow the steps' },
        { n: '3', title: 'Create an experiment', desc: 'Dashboard → New experiment → set Active', href: `/dashboard/${slug}` },
      ]" :key="i" class="bg-white border border-gray-200 rounded-2xl p-4">
        <div class="w-6 h-6 rounded-full bg-[#C96A3F] text-white text-xs font-bold flex items-center justify-center mb-3">{{ item.n }}</div>
        <p class="text-sm font-semibold text-gray-800">{{ item.title }}</p>
        <p class="text-xs text-gray-400 mt-0.5 leading-relaxed">{{ item.desc }}</p>
        <NuxtLink v-if="item.href" :to="item.href" class="text-xs text-[#C96A3F] hover:underline mt-1.5 inline-block">Go →</NuxtLink>
      </div>
    </div>

    <!-- ── Code Generator ─────────────────────────────────── -->
    <div class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
      <div class="px-6 py-4 border-b border-gray-100">
        <h2 class="text-sm font-semibold text-gray-900">Generate your integration code</h2>
        <p class="text-xs text-gray-400 mt-0.5">Select one of your experiments to get a ready-to-paste snippet with real IDs.</p>
      </div>

      <div class="px-6 py-5 space-y-4">
        <!-- Selectors -->
        <div v-if="experiments?.length" class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Experiment</label>
            <select
              v-model="genExperimentId"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C96A3F] bg-white"
            >
              <option value="">Select an experiment…</option>
              <option v-for="exp in experiments" :key="exp.id" :value="exp.id">
                {{ exp.name }}
              </option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-500 mb-1.5">Framework</label>
            <select
              v-model="genFramework"
              class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#C96A3F] bg-white"
            >
              <option v-for="fw in genFrameworks" :key="fw.id" :value="fw.id">{{ fw.label }}</option>
            </select>
          </div>
        </div>

        <!-- Generated code -->
        <div v-if="genExperimentId && generatedCode">
          <!-- Variant legend -->
          <div class="mb-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl">
            <p class="text-xs text-blue-700 leading-relaxed mb-2">
              The IDs in this snippet are the <strong>real variant IDs</strong> for <strong>{{ genExperiment?.name }}</strong>.
              Each visitor gets assigned to one variant and the assignment is stored in a cookie — so they always see the same version.
            </p>
            <div class="flex flex-col gap-1">
              <div v-for="v in genExperiment?.variants" :key="v.id" class="flex items-center gap-2">
                <div :class="['w-1.5 h-1.5 rounded-full shrink-0', v.is_control ? 'bg-gray-400' : 'bg-[#C96A3F]']" />
                <span class="text-xs font-medium text-blue-800 w-24 shrink-0">{{ v.name }}</span>
                <span class="text-[10px] text-blue-500 font-mono">{{ v.id }}</span>
              </div>
            </div>
          </div>
          <div class="relative group">
            <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 rounded-xl whitespace-pre border border-gray-100">{{ generatedCode }}</pre>
            <button
              :class="['absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all', copied === 'gen' ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 opacity-0 group-hover:opacity-100']"
              @click="copy('gen', generatedCode)"
            >{{ copied === 'gen' ? '✓ Copied' : 'Copy' }}</button>
          </div>
          <p class="text-xs text-gray-400 mt-2">
            Replace <code class="bg-gray-100 px-1 rounded">YOUR_API_KEY</code> with a key from
            <NuxtLink :to="`/dashboard/${slug}/settings`" class="text-[#C96A3F] hover:underline">Settings → API Keys</NuxtLink>.
          </p>
        </div>

        <!-- Empty state: no experiments yet -->
        <div v-else-if="!experiments?.length" class="flex items-center justify-between px-4 py-3 bg-[#FEF0E8] rounded-xl border border-[#F0C9B0]">
          <div class="flex items-center gap-2.5">
            <svg class="w-4 h-4 text-[#C96A3F] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-xs text-[#7a4030]">No experiments yet — create one first to generate your snippet.</p>
          </div>
          <NuxtLink :to="`/dashboard/${slug}`" class="text-xs font-semibold text-[#C96A3F] hover:text-[#A8522D] whitespace-nowrap ml-3">
            Create experiment →
          </NuxtLink>
        </div>

        <!-- Empty state: experiment not selected -->
        <div v-else class="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">
          <svg class="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <p class="text-xs text-gray-400">Select an experiment above to generate your snippet.</p>
        </div>
      </div>
    </div>

    <!-- ── Mode toggle ────────────────────────────────────── -->
    <div class="flex gap-3">
      <button
        :class="['flex-1 rounded-2xl border-2 p-4 text-left transition-all', mode === 'edge' ? 'border-[#4338CA] bg-[#EEF2FF]' : 'border-gray-200 bg-white hover:border-gray-300']"
        @click="mode = 'edge'"
      >
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-4 h-4 shrink-0" :class="mode === 'edge' ? 'text-[#4338CA]' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
          </svg>
          <span class="text-sm font-semibold" :class="mode === 'edge' ? 'text-[#4338CA]' : 'text-gray-700'">Edge</span>
          <span class="text-xs px-1.5 py-0.5 rounded font-medium" :class="mode === 'edge' ? 'bg-[#4338CA] text-white' : 'bg-gray-100 text-gray-500'">Recommended</span>
        </div>
        <p class="text-xs leading-relaxed" :class="mode === 'edge' ? 'text-[#4338CA]/80' : 'text-gray-400'">Intercepts requests before the page renders. Zero flicker, no page-level code changes.</p>
      </button>
      <button
        :class="['flex-1 rounded-2xl border-2 p-4 text-left transition-all', mode === 'sdk' ? 'border-[#C96A3F] bg-[#FEF0E8]' : 'border-gray-200 bg-white hover:border-gray-300']"
        @click="mode = 'sdk'"
      >
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-4 h-4 shrink-0" :class="mode === 'sdk' ? 'text-[#C96A3F]' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <span class="text-sm font-semibold" :class="mode === 'sdk' ? 'text-[#C96A3F]' : 'text-gray-700'">SDK</span>
        </div>
        <p class="text-xs leading-relaxed" :class="mode === 'sdk' ? 'text-[#C96A3F]/80' : 'text-gray-400'">Test a specific component within a page. React, Vue, Astro — server-side only.</p>
      </button>
      <button
        :class="['flex-1 rounded-2xl border-2 p-4 text-left transition-all', mode === 'devs' ? 'border-gray-900 bg-gray-900' : 'border-gray-200 bg-white hover:border-gray-300']"
        @click="mode = 'devs'"
      >
        <div class="flex items-center gap-2 mb-1">
          <svg class="w-4 h-4 shrink-0" :class="mode === 'devs' ? 'text-gray-300' : 'text-gray-400'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span class="text-sm font-semibold" :class="mode === 'devs' ? 'text-white' : 'text-gray-700'">For devs</span>
        </div>
        <p class="text-xs leading-relaxed" :class="mode === 'devs' ? 'text-gray-400' : 'text-gray-400'">Raw API protocol. SvelteKit, Angular, Laravel — any framework, no SDK needed.</p>
      </button>
    </div>

    <!-- ── EDGE ───────────────────────────────────────────── -->
    <div v-if="mode === 'edge'">
      <!-- Webflow callout -->
      <div v-if="activeEdge === 'webflow'" class="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 mb-6">
        <p class="text-sm font-semibold text-blue-900 mb-1">Webflow doesn't run server code — but Cloudflare does.</p>
        <p class="text-xs text-blue-700 leading-relaxed">
          Webflow is a hosted platform. The trick is putting a Cloudflare Worker <em>in front of</em> your Webflow domain — Cloudflare intercepts the request at the CDN edge, assigns the variant, and rewrites it to the correct Webflow page. Your visitors never see a redirect.
        </p>
      </div>
      <!-- WordPress callout -->
      <div v-if="activeEdge === 'wordpress'" class="bg-[#FEF0E8] border border-[#F0C9B0] rounded-2xl px-5 py-4 mb-6">
        <p class="text-sm font-semibold text-[#0F2235] mb-1">PHP plugin — no npm, no build step.</p>
        <p class="text-xs text-[#5a3020] leading-relaxed">
          The Koryla WordPress plugin intercepts requests in PHP during <code class="bg-white/60 px-1 rounded">template_redirect</code>, before WordPress renders the page.
          It uses a <strong>302 redirect</strong> (vs the transparent rewrite of a Cloudflare Worker). For most sites this is fine — for large SEO-critical sites, pair it with a Cloudflare Worker for a fully transparent approach.
        </p>
      </div>
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button v-for="p in edgePlatforms" :key="p.id"
          :class="['flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all', activeEdge === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          @click="activeEdge = p.id">
          {{ p.label }}
          <span class="text-[10px] font-normal mt-0.5 text-gray-400">{{ p.badge }}</span>
        </button>
      </div>
      <div class="space-y-4">
        <div v-for="(step, i) in edgeSteps[activeEdge]" :key="step.key" class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</div>
            <p class="text-sm font-semibold text-gray-800">{{ step.title }}</p>
          </div>
          <div class="relative group">
            <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 whitespace-pre">{{ (es as any)[step.key] }}</pre>
            <button :class="['absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all', copied === `e-${activeEdge}-${step.key}` ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100']"
              @click="copy(`e-${activeEdge}-${step.key}`, (es as any)[step.key])">
              {{ copied === `e-${activeEdge}-${step.key}` ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── SDK ────────────────────────────────────────────── -->
    <div v-if="mode === 'sdk'">
      <div class="bg-[#FEF0E8] border border-[#F0C9B0] rounded-2xl px-5 py-4 mb-6 text-sm text-[#5a3020] leading-relaxed">
        <strong class="text-[#0F2235]">How SDK experiments work:</strong>
        call <code class="bg-white/60 px-1 rounded text-xs">getVariant()</code> server-side — it assigns the visitor and fires an impression automatically.
        On the conversion page, call <code class="bg-white/60 px-1 rounded text-xs">reportConversion()</code> to close the loop.
      </div>
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        <button v-for="p in sdkPlatforms" :key="p.id"
          :class="['flex-1 flex flex-col items-center py-2.5 px-3 rounded-lg text-xs font-semibold transition-all', activeSdk === p.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700']"
          @click="activeSdk = p.id">
          {{ p.label }}
          <span class="text-[10px] font-normal mt-0.5 text-gray-400">{{ p.badge }}</span>
        </button>
      </div>
      <div class="space-y-4">
        <div v-for="(step, i) in sdkSteps[activeSdk]" :key="step.key" class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <div class="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100">
            <div class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</div>
            <p class="text-sm font-semibold text-gray-800">{{ step.title }}</p>
          </div>
          <div class="relative group">
            <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 whitespace-pre">{{ (ss as any)[step.key] }}</pre>
            <button :class="['absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all', copied === `s-${activeSdk}-${step.key}` ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100']"
              @click="copy(`s-${activeSdk}-${step.key}`, (ss as any)[step.key])">
              {{ copied === `s-${activeSdk}-${step.key}` ? '✓ Copied' : 'Copy' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── FOR DEVS ───────────────────────────────────────── -->
    <div v-if="mode === 'devs'" class="space-y-4">
      <div class="bg-gray-900 rounded-2xl px-6 py-5">
        <p class="text-sm font-semibold text-white mb-1">Two endpoints. That's it.</p>
        <p class="text-xs text-gray-400 leading-relaxed">
          Koryla's entire runtime is built on two API calls. If your framework isn't listed above — SvelteKit, Angular, Laravel, Django, Rails — you can implement the integration yourself in about 50 lines.
        </p>
        <div class="grid grid-cols-2 gap-3 mt-4">
          <div class="bg-white/5 rounded-xl px-4 py-3">
            <p class="text-xs font-mono text-[#C96A3F] mb-1">GET /api/worker/config</p>
            <p class="text-xs text-gray-400">Returns your active experiments and variants. Cache for 60s.</p>
          </div>
          <div class="bg-white/5 rounded-xl px-4 py-3">
            <p class="text-xs font-mono text-[#C96A3F] mb-1">POST /api/worker/event</p>
            <p class="text-xs text-gray-400">Tracks an impression or conversion. Deduplicated by session.</p>
          </div>
        </div>
      </div>

      <div v-for="(step, i) in devsSteps" :key="step.key" class="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div class="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          <div class="w-5 h-5 rounded-full bg-gray-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{{ i + 1 }}</div>
          <p class="text-sm font-semibold text-gray-800">{{ step.title }}</p>
        </div>
        <p class="px-5 py-3.5 text-xs text-gray-500 leading-relaxed border-b border-gray-100 bg-gray-50/50">{{ step.description }}</p>
        <div class="relative group">
          <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 whitespace-pre">{{ (devsSnippets as any)[step.key] }}</pre>
          <button :class="['absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all', copied === `d-${step.key}` ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100']"
            @click="copy(`d-${step.key}`, (devsSnippets as any)[step.key])">
            {{ copied === `d-${step.key}` ? '✓ Copied' : 'Copy' }}
          </button>
        </div>
      </div>
      <!-- Impression tracking snippet -->
      <div v-if="mode === 'edge'" class="bg-white border border-gray-200 rounded-2xl overflow-hidden mt-4">
        <div class="px-5 py-4 border-b border-gray-100">
          <div class="flex items-center gap-2 mb-1">
            <span class="text-sm font-semibold text-gray-800">Impression tracking snippet</span>
            <span class="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Recommended</span>
          </div>
          <p class="text-xs text-gray-500 leading-relaxed mt-1">
            Edge experiments assign variants on the server — so the browser receives the right page from the first byte, with zero flicker. But the server doesn't know if the user actually saw the page.
            <br/><br/>
            Paste this snippet in your <code class="bg-gray-100 px-1 rounded">&lt;head&gt;</code>. It does three things:
          </p>
          <ul class="mt-2 space-y-1">
            <li class="flex items-start gap-2 text-xs text-gray-500"><span class="text-gray-400 shrink-0 mt-0.5">1.</span> Reads the <code class="bg-gray-100 px-1 rounded">ky_*</code> cookies left by the edge function when it assigned the variant</li>
            <li class="flex items-start gap-2 text-xs text-gray-500"><span class="text-gray-400 shrink-0 mt-0.5">2.</span> Notifies Koryla — so the dashboard shows real impression counts per variant</li>
            <li class="flex items-start gap-2 text-xs text-gray-500"><span class="text-gray-400 shrink-0 mt-0.5">3.</span> Fires a <code class="bg-gray-100 px-1 rounded">koryla:impression</code> browser event so you can forward data to GA4, PostHog or any analytics tool already on your site</li>
          </ul>
          <p class="text-xs text-gray-400 mt-2">Without it, experiments still work — visitors see the correct variant — but the dashboard won't record impressions.</p>
        </div>
        <div class="relative group">
          <pre class="px-5 py-4 text-xs leading-relaxed text-gray-800 font-mono overflow-x-auto bg-gray-50 whitespace-pre">{{ impressionSnippet }}</pre>
          <button
            :class="['absolute top-3 right-3 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all', copied === 'impression' ? 'bg-green-100 text-green-700' : 'bg-white border border-gray-200 text-gray-500 opacity-0 group-hover:opacity-100']"
            @click="copy('impression', impressionSnippet)"
          >{{ copied === 'impression' ? '✓ Copied' : 'Copy' }}</button>
        </div>
      </div>
    </div>

    <!-- No flicker callout -->
    <div class="bg-[#FEF0E8] border border-[#F0C9B0] rounded-2xl px-6 py-5">
      <p class="text-sm font-semibold text-[#0F2235] mb-2">Why no flicker?</p>
      <p class="text-sm text-[#5a3020] leading-relaxed">
        Traditional browser-based testing tools run JavaScript after the page loads — they hide the page, swap content, then reveal it. Visitors often see a brief flash of the original version.
        Koryla decides the variant <strong>before any HTML leaves the server</strong>. The browser receives the correct version from the first byte. Nothing to flash.
      </p>
      <div class="grid grid-cols-2 gap-3 mt-4 text-xs">
        <div class="bg-white/60 rounded-xl p-3">
          <p class="font-semibold text-red-600 mb-1">Browser-based tools</p>
          <p class="text-[#7a4030]">JS loads → page hides → content swaps → page shows<br/>~80–150KB extra JS · blockable by ad blockers</p>
        </div>
        <div class="bg-white/60 rounded-xl p-3">
          <p class="font-semibold text-green-600 mb-1">Koryla</p>
          <p class="text-[#7a4030]">Server picks variant → sends correct HTML<br/>0KB extra JS · not blockable</p>
        </div>
      </div>
    </div>

  </div>
</template>
