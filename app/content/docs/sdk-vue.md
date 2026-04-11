---
title: Vue / Nuxt
description: A/B test Nuxt 4 pages and components with @koryla/vue. Server-side, zero flicker.
section: SDK
slug: sdk-vue
---

# Vue / Nuxt

`@koryla/vue` provides a server-side `getKorylaVariant()` helper and two components (`KExperiment`, `KVariant`) for Nuxt 4 / Vue 3 SSR.

---

## Install

```bash
npm install @koryla/vue
```

---

## nuxt.config.ts

Expose your credentials through Nuxt runtime config so they're never sent to the browser:

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    korylaApiKey: '',  // set via NUXT_KORYLA_API_KEY env var
    korylaApiUrl: '',  // set via NUXT_KORYLA_API_URL env var
  },
})
```

---

## .env

```bash
NUXT_KORYLA_API_KEY=sk_live_...
NUXT_KORYLA_API_URL=https://koryla.com
```

---

## Usage — page component

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
        <h1>Original headline</h1>
        <NuxtLink to="/signup">Get started free</NuxtLink>
      </KVariant>
      <KVariant id="variant-b">
        <h1>New headline — does it convert?</h1>
        <NuxtLink to="/signup">Start your free trial</NuxtLink>
      </KVariant>
    </KExperiment>
  </main>
</template>
```

---

## Simpler — v-if approach

For quick experiments you don't need the `KExperiment`/`KVariant` components at all:

```vue
<script setup lang="ts">
import { getKorylaVariant } from '@koryla/vue'

const headers = useRequestHeaders(['cookie'])
const config = useRuntimeConfig()
const result = await getKorylaVariant('your-experiment-id', headers.cookie ?? '', {
  apiKey: config.korylaApiKey,
  apiUrl: config.korylaApiUrl,
})
const isControl = !result || result.variant.is_control
</script>

<template>
  <h1 v-if="isControl">Original headline</h1>
  <h1 v-else>New headline — does it convert?</h1>
</template>
```

---

## Persist the cookie

`getKorylaVariant()` reads the cookie and assigns a variant but doesn't write the cookie — that's up to you. In Nuxt, do it in a server middleware or plugin:

```ts
// server/middleware/koryla.ts
import { getKorylaVariant } from '@koryla/vue'

export default defineEventHandler(async (event) => {
  const cookieHeader = getRequestHeader(event, 'cookie') ?? ''
  const config = useRuntimeConfig()

  const result = await getKorylaVariant('your-experiment-id', cookieHeader, {
    apiKey: config.korylaApiKey,
    apiUrl: config.korylaApiUrl,
  })

  if (result?.isNewAssignment) {
    setCookie(event, result.cookieName, result.variantId, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      path: '/',
    })
  }
})
```
