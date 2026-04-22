---
title: How It Works
description: A deep dive into the Koryla architecture — edge middleware, in-memory caching, variant assignment and sticky sessions.
section: Introduction
slug: how-it-works
order: 2
---

# How It Works

Koryla is built on three layers that work together to deliver experiments with zero performance overhead.

## Architecture overview

| Step | Where | What happens |
|---|---|---|
| 1 | Browser | Visitor requests your page |
| 2 | Edge / Middleware | Intercepts the request before it reaches your app |
| 3 | Edge layer | Checks cookie — visitor already assigned? |
| 4 | Edge layer | Fetches experiment config (cached 60s in memory) |
| 5 | Edge layer | Assigns variant, rewrites URL, sets cookie |
| 6 | Your server | Responds with the correct variant page |

## The edge layer

The Koryla SDK runs at the edge — before your application handles the request. Depending on your platform, this is a Netlify Edge Function, a Next.js middleware, an Astro middleware, or any other server-side interceptor.

When a request comes in:

1. **Cookie check** — looks for a `ky_{experimentId}` cookie. If found, the visitor is already assigned; skip to step 4.
2. **Config fetch** — retrieves active experiments from the in-memory cache. If the cache is stale (>60 seconds), it fetches fresh config from the Koryla API and updates the cache.
3. **Variant assignment** — picks a variant based on traffic weights using a weighted random algorithm.
4. **URL rewrite** — rewrites the request URL to the variant's target path. The response comes from your server directly — no redirect, no round-trip.
5. **Cookie set** — sets the assignment cookie with a 30-day expiry so the visitor always sees the same variant.

The same logic runs on every supported platform — only the adapter (the SDK package) changes:

| Platform | Package | Where the code runs |
|---|---|---|
| Next.js | `@koryla/next` | `middleware.ts` at the root of your project |
| Astro | `@koryla/astro` | `src/middleware.ts` |
| React (custom server) | `@koryla/react` | Your server-side handler |
| Vue (custom server) | `@koryla/vue` | Your server-side handler |

## In-memory config cache

Koryla caches experiment configuration in module-level memory. This means the SDK doesn't call the Koryla API on every request — only when the cache expires (every 60 seconds).

- **Cache hit** → SDK uses the cached config instantly
- **Cache miss** → SDK fetches fresh config from the Koryla API, stores it in memory, then uses it

This is important for two reasons:
- **Performance** — memory reads are near-instant; API calls are not
- **Reliability** — if the Koryla API is temporarily unreachable, the SDK falls back gracefully and passes traffic through without experiments

## Variant assignment

Variants are assigned using a **weighted random** algorithm:

```typescript
function assignVariant(variants) {
  const total = variants.reduce((sum, v) => sum + v.traffic_weight, 0)
  let rand = Math.random() * total
  for (const variant of variants) {
    rand -= variant.traffic_weight
    if (rand <= 0) return variant.id
  }
  return variants[variants.length - 1].id
}
```

If you have two variants with weights `50` and `50`, each has a 50% chance of being selected. Weights don't need to add up to 100 — they're relative. `1 / 1` is the same as `50 / 50`.

## Sticky sessions

Once assigned, visitors always see the same variant. The assignment is stored in a cookie:

- **Name:** `ky_{experimentId}`
- **Value:** variant ID (UUID)
- **Expiry:** 30 days
- **Flags:** `Path=/; SameSite=Lax`

This means:
- Refreshing the page → same variant ✓
- Coming back next week → same variant ✓
- Opening incognito → new random assignment ✓
- Different device → new random assignment ✓

## URL rewriting vs redirects

Koryla uses **URL rewriting**, not redirects. The difference matters:

| Approach | How it works | SEO impact | User experience |
|---|---|---|---|
| **Redirect** | Browser goes to `/variant-b` | Duplicate URL risk | URL changes in browser bar |
| **Rewrite (Koryla)** | Request secretly served from `/variant-b` | No duplicate URLs | URL stays the same |

The visitor always sees the original URL in their browser, and search engines only index the canonical URL.

## Config refresh

When you create or update an experiment in the Koryla dashboard, changes take up to **60 seconds** to reach the edge layer (the in-memory cache TTL). You don't need to redeploy anything.

If you stop an experiment, traffic stops being split within 60 seconds — all requests are served to the original URL.

## Performance and rendering strategy

Koryla's edge layer adds **~0ms** of latency — it runs before your app and does its work in microseconds. That said, your overall page speed depends on how your app renders pages, which is independent of Koryla.

**Recommendation: use SSG (static generation) where possible.**

| Rendering mode | First byte (cold) | First byte (warm) | Notes |
|---|---|---|---|
| **SSG** (pre-built HTML) | ~20ms | ~20ms | Served from CDN — always fast |
| **Edge SSR** (edge functions) | ~50ms | ~50ms | No cold start, runs globally |
| **Serverless SSR** (Lambda) | 1–4s | 100–500ms | Cold start on first request |

If your variant pages are static (no per-request data), pre-render them at build time:

```ts
// Next.js App Router
export const dynamic = 'force-static'
```

```js
// Astro
// output: 'static' in astro.config.mjs (the default)
```

If you need SSR, prefer edge-based adapters (Netlify Edge Functions, Vercel Edge Runtime) over serverless functions to avoid cold starts.

**Koryla itself is not the source of latency** — the split decision and cookie check happen in the same edge function that already intercepts the request. The bottleneck is always the underlying rendering strategy of your app.

## Analytics

Koryla fires analytics events at the point of variant assignment (new visitors only). Events are sent to your configured destinations (GA4, PostHog, etc.) asynchronously — they don't block the response to the visitor.

See [Analytics Integrations](/docs/integrations) for setup details.
