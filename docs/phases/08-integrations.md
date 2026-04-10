# Phase 08 — Integrations Page

## Overview

Implements the integrations page in the dashboard (`/dashboard/[slug]/integrations`). This page gives users copy-paste installation instructions tailored to their platform. It has four tabs (Next.js, Netlify, Node.js, Cloudflare), each with multi-step code snippets showing the install command, environment variable setup, middleware code, and variant page structure.

A key UX detail: the `KORYLA_API_URL` in the code snippets is pre-filled with the actual deployed URL of the user's Koryla dashboard, read from `window.location.origin` at runtime.

Relevant file: `app/pages/dashboard/[slug]/integrations.vue`

---

## Why

**In-app docs over external docs site:** Users arrive at the integrations page immediately after setting up their first experiment. Having installation instructions in the dashboard (rather than a separate docs site) reduces friction. The user never needs to leave the product to get a working integration.

**Platform tabs over a single "universal" snippet:** Each platform has different APIs (`NextResponse.rewrite` vs `context.rewrite` vs `req.url` mutation), different env var conventions (`process.env` vs `Deno.env.get()`), and different deployment setup steps (wrangler KV vs Netlify dashboard). Separate tabs with platform-specific copy reduces confusion.

**`window.location.origin` for KORYLA_API_URL:** The Koryla API URL is always the same as the dashboard URL the user is currently viewing. Pre-filling it avoids a common setup error (users copying a template snippet and forgetting to replace the placeholder URL).

**`@nuxt/content` prose code blocks for syntax highlighting:** Code snippets use the `github-dark` theme configured in `nuxt.config.ts`. The `@nuxt/content` module's highlight is based on Shiki and supports all the relevant languages (`ts`, `bash`, `toml`).

---

## What Was Built

### `app/pages/dashboard/[slug]/integrations.vue`

**Platform tabs:**
```ts
const platforms = [
  { id: 'next',       label: 'Next.js',    badge: 'Vercel Edge' },
  { id: 'netlify',    label: 'Netlify',    badge: 'Edge Functions' },
  { id: 'node',       label: 'Node.js',    badge: 'Railway · Render · Fly' },
  { id: 'cloudflare', label: 'Cloudflare', badge: 'CF Workers' },
]
const active = ref('next')
```

Each tab has a `badge` that shows the typical deployment target — communicating at a glance where each adapter is designed to run.

**KORYLA_API_URL pre-fill:**
```ts
const appUrl = import.meta.client
  ? window.location.origin
  : 'https://your-koryla-app.vercel.app'
```
`import.meta.client` is Nuxt's equivalent of `typeof window !== 'undefined'`. The fallback string is used during SSR (but this page is in the `/dashboard/**` SPA section where SSR is disabled, so the fallback is rarely shown).

**Copy button with 2-second feedback:**
```ts
const copied = ref<string | null>(null)
const copy = (id: string, text: string) => {
  navigator.clipboard.writeText(text)
  copied.value = id
  setTimeout(() => copied.value = null, 2000)
}
```
The `copied` ref holds the ID of the currently-copied snippet. The button renders "Copied!" with a checkmark for 2 seconds, then reverts to the copy icon. Multiple snippets on the page each have a unique `id` string passed to `copy()`.

**Per-platform snippet structure:**

Each platform object in `snippets` has:
- `install` — package manager command(s)
- `env` — environment variable setup (`.env.local`, `.env`, `netlify.toml`, `wrangler.toml`)
- `middleware` — the actual middleware/edge function code
- `variant` — how to structure variant pages in the customer's project

**Next.js snippet:**
```ts
middleware: `// middleware.ts  (project root)
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

export const config = {
  matcher: ['/', '/pricing', '/landing'],
}`,
```

**Netlify snippet:**
```ts
middleware: `// netlify/edge-functions/koryla.ts
import { korylaMiddleware } from '@koryla/netlify'

export default korylaMiddleware({
  apiKey: Deno.env.get('KORYLA_API_KEY')!,
  apiUrl: Deno.env.get('KORYLA_API_URL')!,
})

export const config = {
  path: ['/', '/pricing', '/landing'],
}`,
```

**Node.js snippet:** Shows the Express middleware registration order — Koryla must be added before the app's routes so it can rewrite `req.url` before route matching occurs.

**Cloudflare snippet:** Shows the full wrangler setup: `wrangler kv namespace create`, `wrangler secret put KORYLA_API_KEY`, and a `wrangler.toml` template with the KV namespace binding.

---

## Key Decisions

**Snippets as static strings in the component:** Code snippets are defined as template literals in `<script setup>`. An alternative would be MDC files in `content/` — but static strings in the component are simpler, keep the snippets co-located with the display logic, and make the `KORYLA_API_URL` interpolation straightforward (template literals evaluate at component initialization time when `appUrl` is already resolved from `window.location.origin`).

**`import.meta.client` guard for `window.location.origin`:** Even though this page is in the SPA section (`ssr: false`), Nuxt may attempt to evaluate `<script setup>` during the build phase. `import.meta.client` prevents `window is not defined` errors in any server-side context.

**Badge labels on tabs:** The `badge` text ("Vercel Edge", "Edge Functions", "Railway · Render · Fly", "CF Workers") serves as deployment context, not just platform branding. A user who is deploying on Render knows to look at the "Node.js" tab without needing to understand that `@koryla/node` is the underlying package name.

**Snippet IDs for copy tracking:** Each code block has a unique ID string (e.g. `'next-install'`, `'next-middleware'`, `'netlify-env'`). The `copied` ref uses these IDs to track which button shows "Copied!" — allowing multiple copy buttons to be independent.

---

## How to Reproduce

1. Create `app/pages/dashboard/[slug]/integrations.vue`.
2. Define `platforms` array with `id`, `label`, `badge`.
3. Capture `window.location.origin` in `appUrl` using `import.meta.client` guard.
4. Define `snippets` object keyed by platform ID with `install`, `env`, `middleware`, `variant` sub-keys.
5. Render tabs and code blocks:
   ```vue
   <div v-for="platform in platforms" :key="platform.id">
     <button @click="active = platform.id">{{ platform.label }}</button>
   </div>
   <div v-if="active === 'next'">
     <pre>{{ snippets.next.middleware }}</pre>
     <button @click="copy('next-middleware', snippets.next.middleware)">
       {{ copied === 'next-middleware' ? 'Copied!' : 'Copy' }}
     </button>
   </div>
   ```

---

## Known Issues / Gotchas

**`navigator.clipboard` requires HTTPS or localhost:** The Clipboard API is only available in secure contexts. On `http://` (non-localhost) the copy button will silently fail. The dashboard is always deployed to HTTPS (Netlify), so this is not a production issue, but it can cause confusion during local development over HTTP.

**Snippets are not kept in sync with adapter changes:** The code snippets are hardcoded strings. If the `@koryla/next` or `@koryla/netlify` API changes (different function signature, new required option), the snippets on the integrations page must be updated manually. There is no automated test or build step that validates the snippets against the actual package exports.

**`KORYLA_API_URL` in Cloudflare snippet shows dashboard URL:** The pre-filled `KORYLA_API_URL` is the dashboard's origin. For the Cloudflare Worker, this is already set in `wrangler.toml` as a `[vars]` entry pointing to `https://koryla-dev.netlify.app`. The snippet shows the current origin correctly, but users need to understand this URL points to the Koryla dashboard (not their own site).

**No API key shown on integrations page:** The integrations page does not show the workspace's API key. Users must navigate to the Settings page to copy their `sk_live_...` key. This creates a small friction point — a future improvement would be to show the key (or at least the prefix) directly on the integrations page, or provide a "Generate and copy key" action inline.
