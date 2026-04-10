# @koryla/next

A/B testing for Next.js with zero flicker. Runs on the Vercel Edge Network.

## Installation

```bash
npm install @koryla/next
```

## Setup

### 1. Add environment variables

```bash
# .env.local
KORYLA_API_KEY=sk_live_...   # generated in Koryla → Settings → API Keys
KORYLA_API_URL=https://your-koryla-app.vercel.app
```

### 2. Create middleware.ts

```ts
// middleware.ts  (project root, next to package.json)
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

// Only run on the pages you're testing — keeps other routes fast
export const config = {
  matcher: ['/', '/pricing', '/landing'],
}
```

### 3. Create your variant pages

The middleware rewrites the URL server-side, so the variant page must exist in your app:

```
app/
  page.tsx           ← control  (base_url: https://acme.com/)
  variant-b/
    page.tsx         ← variant  (target_url: https://acme.com/variant-b)
```

### 4. Create an experiment in Koryla

Go to your Koryla dashboard → New experiment:

| Field | Value |
|-------|-------|
| Base URL | `https://acme.com/` |
| Variant A — Control | `https://acme.com/` · 50% |
| Variant B | `https://acme.com/variant-b` · 50% |
| Conversion URL | `https://acme.com/thank-you` |

Set it to **Active** and you're done.

## How it works

```
User visits /
     │
     ▼
Next.js middleware (runs at Vercel edge, before rendering)
     │
     ├── calls Koryla API once every 60s to get experiment config
     ├── reads sp_<experimentId> cookie
     │     ├── cookie present → use existing variant (sticky)
     │     └── no cookie → assign variant by traffic weight
     │
     ├── rewrites request to /variant-b (server-side, no redirect)
     └── sets cookie for 30 days
     │
     ▼
Next.js renders /variant-b
Browser receives variant B HTML — never sees the rewrite
```

## Why this is better than VWO / Optimizely

| | VWO / Optimizely | @koryla/next |
|--|--|--|
| When variant is decided | In the browser, after JS loads | At the edge, before any HTML |
| Flicker | Yes (page hides while swapping) | No |
| Extra JS | ~80–150 KB | 0 KB |
| Blockable by ad blockers | Yes | No |
| Works without JS | No | Yes |
