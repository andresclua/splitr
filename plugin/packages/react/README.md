# @koryla/react

React Server Component SDK for [Koryla](https://koryla.com) A/B testing.
Zero client-side JavaScript — variants are resolved on the server before the page renders.

## When to use this vs the middleware approach

| Approach | Use when |
|---|---|
| **Middleware** (`@koryla/next`) | Routing visitors to entirely different pages (e.g. `/` vs `/homepage-v2`) |
| **Components** (`@koryla/react`) | Testing specific UI elements within a single page (CTA text, hero image, pricing layout) |

Both approaches are 0-flicker and require no client-side JS.

## Setup

```bash
npm install @koryla/react
```

Create a shared Koryla client (instantiate once — it holds the 60s config cache):

```ts
// lib/koryla.ts
import { createKoryla } from '@koryla/react'

export const koryla = createKoryla({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!, // https://koryla.com
})
```

## Usage — Next.js App Router

```tsx
// app/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'
import { Experiment, Variant } from '@koryla/react'

export default async function Page() {
  const result = await koryla.getVariant(
    'your-experiment-id',           // from Koryla dashboard
    headers().get('cookie') ?? '',  // sticky sessions via cookie
  )

  return (
    <main>
      <Experiment variantId={result?.variantId ?? ''}>
        <Variant id="control">
          <h1>Original headline</h1>
        </Variant>
        <Variant id="variant-b">
          <h1>New headline that converts better</h1>
        </Variant>
      </Experiment>
    </main>
  )
}
```

## Setting the variant cookie

On new assignments the visitor's variant isn't persisted yet. To make sessions sticky, set the cookie in a middleware or route handler:

```ts
// middleware.ts (simple cookie passthrough)
import { koryla } from '@/lib/koryla'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  const result = await koryla.getVariant('your-experiment-id', request.headers.get('cookie') ?? '')
  const response = NextResponse.next()
  if (result?.isNewAssignment) {
    response.cookies.set(result.cookieName, result.variantId, {
      maxAge: 60 * 60 * 24 * 30,
      sameSite: 'lax',
      path: '/',
    })
  }
  return response
}
```

Or use `@koryla/next` middleware which handles this automatically.

## API

### `createKoryla(options)`

| Option | Type | Description |
|---|---|---|
| `apiKey` | `string` | Your `sk_live_...` key from Settings → API Keys |
| `apiUrl` | `string` | Your Koryla app URL (`https://koryla.com`) |
| `cacheTtl` | `number` | Config cache TTL in ms. Default: `60000` |

Returns `{ getVariant }`.

### `koryla.getVariant(experimentId, cookieHeader)`

Returns `VariantResult | null`. `null` means the experiment wasn't found or has no variants.

```ts
interface VariantResult {
  experiment: Experiment
  variant: Variant       // the assigned variant object
  variantId: string      // e.g. "abc-123"
  isNewAssignment: boolean
  cookieName: string     // e.g. "ky_exp-id"
}
```

### `<Experiment variantId={...}>`

Renders only the `<Variant>` child whose `id` matches `variantId`.
Falls back to the first child if no match (safe default).

### `<Variant id="...">`

Marker component. Always wrap content in a `<Variant>` inside `<Experiment>`.
