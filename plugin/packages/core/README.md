# @splitr/core

Shared engine used by all Splitr adapters. You don't install this directly — it's a dependency of `@splitr/next`, `@splitr/netlify`, and `@splitr/node`.

## How the algorithm works

### 1. Config fetching (cached)

On the first request the engine calls `GET /api/worker/config` with your API key:

```
Authorization: Bearer sk_live_...
```

The Splitr server hashes the key, looks it up in the database, and returns all **active** experiments for your workspace:

```json
[
  {
    "id": "exp-123",
    "name": "Homepage Hero",
    "base_url": "https://acme.com/",
    "variants": [
      { "id": "v1", "name": "Control",   "traffic_weight": 50, "target_url": "https://acme.com/",          "is_control": true },
      { "id": "v2", "name": "Variant B", "traffic_weight": 50, "target_url": "https://acme.com/variant-b", "is_control": false }
    ]
  }
]
```

This response is cached **in memory for 60 seconds**. Every request after the first is served from cache — no API call, no added latency.

### 2. URL matching

For each request, the engine checks if `pathname.startsWith(experiment.base_url.pathname)`. First match wins.

### 3. Variant assignment (sticky)

```
cookie present? ──yes──► validate variant still exists ──yes──► use it
                                                        ──no───► re-assign
       │
      no
       │
       ▼
weighted random selection:
  total = sum of all traffic_weight
  rand  = random(0, total)
  iterate variants, subtract weight — first to go ≤ 0 wins
```

Stickiness is maintained via a 30-day cookie named `sp_<experimentId>`.

### 4. Rewrite

The engine returns the `targetUrl` — same host/query string as the original, only the pathname is replaced. The adapter performs the actual rewrite.

## What "no flicker" means

Client-side tools (VWO, Optimizely) work by:
1. Loading JS in the browser
2. Hiding the page
3. Swapping content
4. Showing the page

This causes a flash of the original content. With Splitr, the variant is decided **before any HTML is sent** — the browser only ever receives the assigned variant. There is nothing to flash.
