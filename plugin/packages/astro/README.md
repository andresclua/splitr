# @koryla/astro

Astro server-side A/B testing helper for [Koryla](https://koryla.com).
Assign variants in page frontmatter — zero client-side JavaScript, zero flicker.

## When to use this vs the Netlify edge function

| Approach | Use when |
|---|---|
| **Edge function** (`netlify/edge-functions/koryla.ts`) | Routing visitors to entirely different pages (`/` vs `/variant-b`). Automatic — no code changes in your Astro pages. |
| **`@koryla/astro`** | Testing specific components within a page (CTA copy, hero image, pricing section). |

## Setup

```bash
npm install @koryla/astro
```

## Usage

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
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: 'lax',
    path: '/',
  })
}
---

{result?.variantId === 'control' || !result ? (
  <section>
    <h1>Original headline</h1>
    <a href="/signup">Get started</a>
  </section>
) : (
  <section>
    <h1>New headline that converts better</h1>
    <a href="/signup">Start free trial</a>
  </section>
)}
```

## Environment variables (.env)

```
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=https://koryla.com
```

## API

### `getVariant(request, experimentId, options)`

| Parameter | Type | Description |
|---|---|---|
| `request` | `Request` | `Astro.request` |
| `experimentId` | `string` | Experiment ID from Koryla dashboard |
| `options.apiKey` | `string` | Your `sk_live_...` API key |
| `options.apiUrl` | `string` | Your Koryla app URL |

Returns `Promise<VariantResult | null>`. `null` = experiment not found or inactive.

```ts
interface VariantResult {
  experiment: Experiment
  variant: Variant        // the assigned variant
  variantId: string       // e.g. "abc-123"
  isNewAssignment: boolean
  cookieName: string      // e.g. "ky_exp-id" — use when setting the cookie
}
```
