# @koryla/vue

Vue 3 / Nuxt 4 SDK for [Koryla](https://koryla.com) A/B testing.
Server-side variant assignment — zero client-side JavaScript, zero flicker.

## Setup

```bash
npm install @koryla/vue
```

## Usage — Nuxt 4

```vue
<script setup lang="ts">
import { getKorylaVariant, KExperiment, KVariant } from '@koryla/vue'

const headers = useRequestHeaders(['cookie'])
const config = useRuntimeConfig()

// Resolves server-side — works in Nuxt SSR without useAsyncData wrapper
const result = await getKorylaVariant('your-experiment-id', headers.cookie ?? '', {
  apiKey: config.korylaApiKey,
  apiUrl: config.korylaApiUrl,
})
</script>

<template>
  <KExperiment :variant-id="result?.variantId ?? ''">
    <KVariant id="control">
      <h1>Original headline</h1>
    </KVariant>
    <KVariant id="variant-b">
      <h1>New headline that converts better</h1>
    </KVariant>
  </KExperiment>
</template>
```

## Runtime config (nuxt.config.ts)

```ts
export default defineNuxtConfig({
  runtimeConfig: {
    korylaApiKey: '',  // set via NUXT_KORYLA_API_KEY env var
    korylaApiUrl: '',  // set via NUXT_KORYLA_API_URL env var
  },
})
```

## API

### `getKorylaVariant(experimentId, cookieHeader, options)`

Async function — call with `await` in `<script setup>`.

| Parameter | Type | Description |
|---|---|---|
| `experimentId` | `string` | Experiment ID from Koryla dashboard |
| `cookieHeader` | `string` | Raw cookie string (use `useRequestHeaders(['cookie']).cookie`) |
| `options.apiKey` | `string` | Your `sk_live_...` API key |
| `options.apiUrl` | `string` | Your Koryla app URL |

Returns `VariantResult | null`.

### `<KExperiment :variant-id="...">`

Renders only the matching `<KVariant>` child.

### `<KVariant id="...">`

Renders its slot only when its `id` matches the parent's `variant-id`.
