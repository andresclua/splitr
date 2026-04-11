---
title: SDK — Component Testing
description: A/B test specific UI elements within a page using @koryla/react, @koryla/vue, or @koryla/astro.
order: 6
section: Integrations
slug: sdk-components
---

# SDK — Component Testing

The Koryla SDK lets you A/B test **specific components within a page** — not just whole-page routing. It resolves variants on the server, so there is zero flicker and zero client-side JavaScript required.

## Two approaches — pick the right one

| Approach | Best for | How it works |
|---|---|---|
| **Edge / Middleware** | Testing entirely different pages (`/` vs `/variant-b`) | Edge function intercepts the request and rewrites the URL before your app renders anything. No code changes in your pages. |
| **Component SDK** | Testing a CTA, hero section, or pricing layout within a single page | You call `getVariant()` in your page's server code and conditionally render the right component. |

Both are 0-flicker and server-to-server — nothing runs in the browser.

---

## @koryla/react — Next.js / React

### Install

```bash
npm install @koryla/react
```

### 1. Create a shared client

```ts
// lib/koryla.ts
import { createKoryla } from '@koryla/react'

export const koryla = createKoryla({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})
```

### 2. Use in a React Server Component

```tsx
// app/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'
import { Experiment, Variant } from '@koryla/react'

export default async function Page() {
  const result = await koryla.getVariant(
    'your-experiment-id',           // from Koryla dashboard → Experiments
    headers().get('cookie') ?? '',
  )

  return (
    <main>
      <Experiment variantId={result?.variantId ?? ''}>
        <Variant id="control">
          <section>
            <h1>Original headline</h1>
            <a href="/signup">Get started free</a>
          </section>
        </Variant>
        <Variant id="variant-b">
          <section>
            <h1>New headline — does it convert better?</h1>
            <a href="/signup">Start your free trial</a>
          </section>
        </Variant>
      </Experiment>
    </main>
  )
}
```

### 3. Set the variant cookie (sticky sessions)

The `getVariant()` call assigns a variant but doesn't persist it — you need to set the cookie so the visitor always sees the same variant. The easiest way is to use `@koryla/next` middleware alongside the component SDK:

```ts
// middleware.ts
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})
```

This handles cookie setting automatically. If you prefer to do it manually:

```ts
// In a Next.js route handler or middleware:
if (result?.isNewAssignment) {
  response.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
  })
}
```

---

## @koryla/vue — Nuxt 4 / Vue 3

### Install

```bash
npm install @koryla/vue
```

### nuxt.config.ts

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    korylaApiKey: '',  // env: NUXT_KORYLA_API_KEY
    korylaApiUrl: '',  // env: NUXT_KORYLA_API_URL
  },
})
```

### Usage in a Nuxt page

```vue
<script setup lang="ts">
import { getKorylaVariant, KExperiment, KVariant } from '@koryla/vue'

const headers = useRequestHeaders(['cookie'])
const config = useRuntimeConfig()

const result = await getKorylaVariant('your-experiment-id', headers.cookie ?? '', {
  apiKey: config.korylaApiKey,
  apiUrl: config.korylaApiUrl,
})
</script>

<template>
  <main>
    <KExperiment :variant-id="result?.variantId ?? ''">
      <KVariant id="control">
        <section>
          <h1>Original headline</h1>
          <NuxtLink to="/signup">Get started free</NuxtLink>
        </section>
      </KVariant>
      <KVariant id="variant-b">
        <section>
          <h1>New headline — does it convert better?</h1>
          <NuxtLink to="/signup">Start your free trial</NuxtLink>
        </section>
      </KVariant>
    </KExperiment>
  </main>
</template>
```

---

## @koryla/astro — Astro

### Install

```bash
npm install @koryla/astro
```

### Usage

```astro
---
import { getVariant } from '@koryla/astro'

const result = await getVariant(Astro.request, 'your-experiment-id', {
  apiKey: import.meta.env.KORYLA_API_KEY,
  apiUrl: import.meta.env.KORYLA_API_URL,
})

// Persist the variant cookie on new assignments
if (result?.isNewAssignment) {
  Astro.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
  })
}

const isControl = !result || result.variantId === 'control'
---

{isControl ? (
  <section>
    <h1>Original headline</h1>
    <a href="/signup">Get started free</a>
  </section>
) : (
  <section>
    <h1>New headline — does it convert better?</h1>
    <a href="/signup">Start your free trial</a>
  </section>
)}
```

> **Tip:** The live demo at [astro-demo.koryla.com](https://astro-demo.koryla.com) uses the **edge function** approach for full-page routing. The `@koryla/astro` helper is used for component-level tests within a single route.

---

## How it works under the hood

1. `getVariant()` calls `GET /api/worker/config` on your Koryla API (Bearer API key auth). The response is cached in memory for 60 seconds — only one network call per minute per server process.
2. It reads the visitor's variant cookie (`ky_{experimentId}`). If the cookie is present and valid, it returns the same variant every time (sticky sessions).
3. If no cookie, it runs weighted random assignment using the `traffic_weight` values you set in the dashboard.
4. The caller (your page code) renders the appropriate variant content.
5. Cookie setting is the caller's responsibility — use `Astro.cookies.set()`, `response.cookies.set()`, or `res.setHeader('Set-Cookie', ...)` depending on your framework.

The entire flow is **server-to-server**. The browser never knows an experiment is running. Variants are served in the first HTML response, with no JavaScript execution on the client side.

---

## Finding your experiment ID

1. Open your Koryla dashboard
2. Go to **Experiments**
3. Click on the experiment — the ID is in the URL: `/dashboard/my-workspace/experiments/abc-123`

The variant IDs are shown in each experiment's **Variants** tab.
