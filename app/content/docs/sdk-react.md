---
title: React / Next.js
description: A/B test React Server Components with @koryla/react and @koryla/next middleware. Zero flicker, zero client JS.
section: SDK
slug: sdk-react
---

# React / Next.js

Two packages work together — pick what you need:

| Package | Use for |
|---|---|
| `@koryla/next` | Full-page routing (`/` → `/variant-b`) via Next.js middleware |
| `@koryla/react` | Component-level testing within a single page |

The [live demo](https://next-demo.koryla.com) uses the middleware approach — three experiments running on `/headline`, `/hero`, and `/pricing`.

---

## @koryla/next — Full-page middleware

The simplest path. No changes to your pages — the middleware intercepts requests and rewrites the URL before Next.js renders anything.

> **Next.js demo:** [`middleware.ts`](https://github.com/andresclua/koryla-next-demo-example/blob/main/middleware.ts) — the complete middleware setup used in the demo, intercepting `/headline`, `/hero`, and `/pricing`.

### Install

```bash
npm install @koryla/next
```

### middleware.ts

> **Next.js demo:** [`app/headline/page.tsx`](https://github.com/andresclua/koryla-next-demo-example/blob/main/app/headline/page.tsx) and [`app/headline-b/page.tsx`](https://github.com/andresclua/koryla-next-demo-example/blob/main/app/headline-b/page.tsx) — control and variant pages for a text-change experiment.

```ts
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

export const config = {
  matcher: ['/', '/pricing', '/landing'],  // paths to A/B test
}
```

### .env.local

```bash
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=https://koryla.com
```

That's it. Create variants in your dashboard, point them to `/your-page-v2`, and Koryla handles the rest.

---

## @koryla/react — Component-level testing

Test a specific section within a page — CTA copy, hero image, pricing layout — without routing to a different URL.

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

### 2. Use in a Server Component

```tsx
// app/page.tsx
import { headers } from 'next/headers'
import { koryla } from '@/lib/koryla'
import { Experiment, Variant } from '@koryla/react'

export default async function Page() {
  const result = await koryla.getVariant(
    'your-experiment-id',
    headers().get('cookie') ?? '',
  )

  return (
    <main>
      <Experiment variantId={result?.variantId ?? ''}>
        <Variant id="control">
          <h1>Original headline</h1>
        </Variant>
        <Variant id="variant-b">
          <h1>New headline — does it convert?</h1>
        </Variant>
      </Experiment>
    </main>
  )
}
```

### 3. Persist the cookie

Use `@koryla/next` alongside — it handles cookie setting automatically. Or set it manually in a route handler:

```ts
if (result?.isNewAssignment) {
  response.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30,
    sameSite: 'lax',
    path: '/',
  })
}
```

---

## Environment variables

| Variable | Value |
|---|---|
| `KORYLA_API_KEY` | Your `sk_live_...` key from Settings → API Keys |
| `KORYLA_API_URL` | `https://koryla.com` |
