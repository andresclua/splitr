# Phase 04 — Cloudflare Worker

## Overview

The Cloudflare Worker is the primary edge runtime for Koryla. It sits in front of a customer's origin, intercepts requests, assigns visitors to experiment variants using weighted random selection, rewrites the request URL to the assigned variant's target URL, and records analytics — all at the edge with no client-side JS and no DOM flicker.

Worker source: `worker/src/`
Config: `worker/wrangler.toml`
Deployed at: `koryla-worker.koryla-app.workers.dev`

---

## Why

**Cloudflare Workers over Vercel Edge / Lambda@Edge:** Workers have true 0ms cold start (they run in V8 isolates, not containers). They are available globally on Cloudflare's network at 300+ PoPs. KV (Key-Value) storage is globally replicated, making config caching available at every edge location. Lambda@Edge has cold starts and is tightly coupled to CloudFront. Vercel Edge is excellent but tied to the Vercel platform.

**KV cache for config:** Fetching the experiment config from the Koryla dashboard API on every request would add latency and hammer the Supabase database. KV stores the config for 60 seconds with `expirationTtl`. On cache hit, config is served from the edge node's memory. On miss, the worker fetches from `KORYLA_API_URL/api/worker/config` and immediately writes back to KV.

**Fire-and-forget analytics with `ctx.waitUntil`:** The Worker response is sent to the visitor immediately. Analytics calls to GA4, PostHog, etc. are enqueued via `ctx.waitUntil()`, which allows the Worker runtime to continue executing them after the response is sent. This means analytics never adds latency to the page load.

**URL rewrite over HTTP redirect:** The visitor's browser always sees the original URL (e.g. `/pricing`). The worker rewrites the fetch request to the variant URL server-side. No `301`/`302` is sent. This is critical for:
1. No flicker (redirect causes a full page load cycle)
2. SEO (Google sees one canonical URL)
3. Analytics accuracy (no double-counting from redirect bounce)

---

## What Was Built

### `worker/wrangler.toml`

```toml
name = "koryla-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[vars]
KORYLA_API_URL = "https://koryla-dev.netlify.app"
# KORYLA_API_KEY is a secret — set via: wrangler secret put KORYLA_API_KEY

[[kv_namespaces]]
binding = "KORYLA_CONFIG"
id = "cbc8f00a39134717843e2a1afee8731d"
```

- `nodejs_compat` flag enables Node.js APIs (e.g. `crypto`) in the Worker runtime.
- `KORYLA_API_KEY` is a Wrangler secret (encrypted, never in source control).
- `KORYLA_CONFIG` KV namespace is bound — available in the handler as `env.KORYLA_CONFIG`.

### `worker/src/index.ts` — Main Handler

**Environment interface:**
```ts
interface Env {
  KORYLA_CONFIG: KVNamespace
  KORYLA_API_URL: string
  KORYLA_API_KEY: string
}
```

**`getConfig(env)`:** Checks KV for `experiments` key. On hit, returns parsed JSON. On miss, fetches `${KORYLA_API_URL}/api/worker/config` with `Authorization: Bearer ${KORYLA_API_KEY}`, writes result to KV with `expirationTtl: 60`, returns experiments array.

**`assignVariant(variants)`:**
```ts
export function assignVariant(variants: Pick<Variant, 'id' | 'traffic_weight'>[]): string {
  const total = variants.reduce((sum, v) => sum + v.traffic_weight, 0)
  let rand = Math.random() * total
  for (const variant of variants) {
    rand -= variant.traffic_weight
    if (rand <= 0) return variant.id
  }
  return variants[variants.length - 1].id
}
```
Exported as a named export for unit testing. Weighted random — `traffic_weight` values are summed and a random float in `[0, total)` is drawn. Works with any positive integers; weights do not need to sum to 100.

**Cookie stickiness:**
- Cookie name: `sp_<experimentId>`
- Cookie format: `sp_<id>=<variantId>; Path=/; Max-Age=2592000; SameSite=Lax` (30 days)
- On each request, existing cookies are parsed. If `sp_<experimentId>` exists, that variant is used without re-rolling. This ensures the same visitor always sees the same variant (sticky sessions).

**Request flow:**
1. Parse cookies from incoming request
2. Call `getConfig()` — returns active experiments from KV cache or API
3. Find experiment whose `base_url` pathname matches the incoming pathname (`url.pathname.startsWith(...)`)
4. Check for existing variant cookie
5. If no cookie: call `assignVariant()`, set `isNewAssignment = true`
6. Rewrite request URL to variant's `target_url` pathname (preserves query string and host)
7. `await fetch(new Request(targetUrl, request))` — fetch variant content from origin
8. If new assignment: append `Set-Cookie` header and enqueue analytics via `ctx.waitUntil()`

**Response mutation:**
```ts
const response = await fetch(new Request(targetUrl.toString(), request))
const newResponse = new Response(response.body, response)
// newResponse is a mutable clone
newResponse.headers.append('Set-Cookie', ...)
```
Cloudflare `Response` objects from `fetch()` are immutable. A `new Response(response.body, response)` clone is required to mutate headers.

### `worker/src/analytics.ts` — Analytics Routing

Routes analytics payloads to 8 providers: GA4, PostHog, Plausible, Mixpanel, Amplitude, Segment, RudderStack, and generic Webhook.

All calls are made via `Promise.allSettled()` so a failure in one destination doesn't block others.

**Webhook provider** supports HMAC-SHA256 request signing:
```ts
const sig = await crypto.subtle.sign('HMAC', key, body)
headers['X-Koryla-Signature'] = 'sha256=' + hex(sig)
```

**Analytics payload:**
```ts
interface AnalyticsPayload {
  experimentId: string
  experimentName: string
  variantId: string
  variantName: string   // currently set to variantId — known issue
  sessionId: string     // same as variantId cookie value
  timestamp: string     // ISO 8601
}
```

---

## Key Decisions

**KV TTL of 60 seconds:** This means experiment config changes (activating/pausing an experiment) take up to 60 seconds to propagate to the edge. This is an explicit trade-off — 60s propagation delay is acceptable for the expected use case (experiments run for hours or days). Lowering the TTL reduces the propagation delay but increases API calls to Supabase.

**`ctx.waitUntil` for analytics:** Analytics calls run after the response is sent. The Worker runtime gives these a budget of approximately 30 seconds after the response. If the Worker exits before the analytics calls complete (e.g. error thrown), the calls are dropped silently. This is acceptable — analytics is best-effort.

**Stale-on-error config:** If the fetch to `/api/worker/config` fails (network error, 5xx), `getConfig()` returns the last known cached experiments rather than an empty array. This means experiments keep running even if the Koryla dashboard is temporarily down.

**Worker vs. Plugin Adapters:** This Worker is for use as a Cloudflare proxy in front of any origin. The plugin adapters (`@koryla/next`, `@koryla/netlify`, `@koryla/node`) are for instrumenting the framework's own middleware pipeline. The Worker is more powerful (works with any site, no code changes to the origin required) but requires DNS routing through Cloudflare.

---

## How to Reproduce (Deploy)

```bash
# 1. Create KV namespace
wrangler kv namespace create KORYLA_CONFIG
# Copy the returned id into wrangler.toml [[kv_namespaces]] id = "..."

# 2. Set API key secret
wrangler secret put KORYLA_API_KEY
# Paste the sk_live_... key from the Koryla dashboard

# 3. Deploy
cd worker
wrangler deploy

# 4. Test
curl -H "Cookie: " https://koryla-worker.koryla-app.workers.dev/
```

For local development:
```bash
pnpm worker:dev  # runs: wrangler dev (from root)
```

---

## Known Issues / Gotchas

**`variantName` is set to `variantId`:** In `analytics.ts`, the `AnalyticsPayload.variantName` field is populated with `variant.id` instead of `variant.name`. This means analytics platforms (PostHog, GA4, etc.) receive UUIDs as variant names. Fixed by looking up `variant.name` from the experiments config — trivial but not yet patched.

**Single experiment per URL:** The worker finds the first experiment whose `base_url` pathname matches. If two experiments share the same base URL, only the first one in the array is applied. The config endpoint returns experiments in Postgres insertion order (no guaranteed ordering by specificity at the worker level). The `@koryla/core` package sorts by pathname length (longer = more specific) but the standalone worker does not implement this sorting.

**`parseCookies` splits on first `=` only:** The implementation does `.split('=').map(s => s.trim())`, which splits on the first `=`. Cookie values that contain `=` (e.g. base64) would be split incorrectly. Variant IDs are UUIDs so this is not a current issue, but it's a latent bug.

**Worker URL must be proxied:** The worker URL `koryla-worker.koryla-app.workers.dev` is a Cloudflare-hosted route. For production use, a customer would need to configure their custom domain's DNS to proxy through Cloudflare and point the Worker route at their domain. This setup is not automated in the current dashboard.
