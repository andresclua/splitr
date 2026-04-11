---
title: How It Works
description: A deep dive into the Koryla architecture — edge Workers, KV caching, variant assignment and sticky sessions.
section: Introduction
slug: how-it-works
---

# How It Works

Koryla is built on three layers that work together to deliver experiments with zero performance overhead.

## Architecture overview

| Step | Where | What happens |
|---|---|---|
| 1 | Browser | Visitor requests your page |
| 2 | Cloudflare edge | Worker intercepts the request |
| 3 | Worker | Checks cookie — visitor already assigned? |
| 4 | Worker → KV | Fetches experiment config (cached 60s) |
| 5 | Worker | Assigns variant, rewrites URL, sets cookie |
| 6 | Your server | Responds with the correct variant page |

## The Worker

The Cloudflare Worker runs on Cloudflare's global network — in 300+ data centers worldwide. When a request comes in:

1. **Cookie check** — looks for a `sp_{experimentId}` cookie. If found, the visitor is already assigned; skip to step 4.
2. **Config fetch** — retrieves active experiments from KV cache. If the cache is stale (>60 seconds), it fetches fresh config from the Koryla API and writes it back to KV.
3. **Variant assignment** — picks a variant based on traffic weights using a weighted random algorithm.
4. **URL rewrite** — rewrites the request URL to the variant's target path. The response comes from your server directly — no redirect, no round-trip.
5. **Cookie set** — sets the assignment cookie with a 30-day expiry so the visitor always sees the same variant.

The entire process adds **~0ms** of latency because the Worker runs at the network edge, co-located with Cloudflare's cache.

## KV caching

Koryla uses Cloudflare KV (Key-Value) storage to cache experiment configuration. This means the Worker doesn't have to call the Koryla API on every request — only when the cache expires (every 60 seconds).

- **Cache hit** → Worker uses the cached config instantly
- **Cache miss** → Worker fetches fresh config from the Koryla API, stores it in KV, then uses it

This is important for two reasons:
- **Performance** — KV reads are near-instant (microseconds), API calls are slower
- **Reliability** — if the Koryla API is temporarily unreachable, the Worker falls back gracefully and passes traffic through without experiments

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

- **Name:** `sp_{experimentId}`
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

When you create or update an experiment in the Koryla dashboard, changes take up to **60 seconds** to reach the Worker (the KV TTL). You don't need to redeploy anything.

If you stop an experiment, traffic stops being split within 60 seconds — the Worker will serve all requests to the original URL.

## Analytics

Koryla fires analytics events at the point of variant assignment (new visitors only). Events are sent to your configured destinations (GA4, PostHog, etc.) via `waitUntil` — meaning they don't block the response to the visitor.

See [Analytics Integrations](/docs/integrations) for setup details.
