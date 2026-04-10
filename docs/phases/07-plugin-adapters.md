# Phase 07 — Plugin Adapters

## Overview

Implements the client-installable SDK that enables edge-based A/B testing for any Node.js or edge-compatible framework. The SDK is structured as a monorepo sub-workspace under `plugin/packages/` with four packages:

- `@koryla/core` — framework-agnostic engine (config fetching, variant assignment, cookie logic)
- `@koryla/next` — Next.js middleware adapter
- `@koryla/netlify` — Netlify Edge Functions adapter
- `@koryla/node` — Express/Node.js middleware adapter

Additionally, `test-site/` is an Astro static site with a self-contained Netlify Edge Function that validates the full flow in production.

**Confirmed working in production:** 3/7 split observed across 10 requests to `test-site-koryla.netlify.app` — consistent with a 30/70 traffic weight configuration and expected probabilistic variance.

---

## Why

**Separate `@koryla/core` package:** All three adapters share identical logic: fetch config, check cookie, assign variant, rewrite URL. Without a shared core, this logic would be duplicated and drift between adapters. `@koryla/core` is framework-agnostic — it only uses `fetch`, `URL`, and string manipulation. This makes it testable in isolation and portable to any JS runtime.

**In-memory cache over re-fetching:** The core engine caches experiment config in a module-level variable (`let cachedExperiments`, `let cachedAt`). TTL defaults to 60,000ms (60 seconds). The cache persists across requests within the same process/isolate. This avoids one HTTP round-trip per request to the Koryla API — critical for edge runtimes where added latency is unacceptable.

**Stale-on-error:** If the Koryla API is unreachable, `getConfig()` returns the last known experiments rather than throwing. The site continues to serve the last-known variant split. This means a Koryla outage never causes customer site downtime.

**Specificity sorting (longer path first):** If a workspace has experiments on both `/` and `/pricing`, naively matching with `startsWith` would match `/` for `/pricing` requests (since `/pricing` starts with `/`). `@koryla/core` sorts experiments by `base_url` pathname length descending before matching — longer (more specific) paths match first.

```ts
const sorted = [...experiments].sort((a, b) => {
  try { return new URL(b.base_url).pathname.length - new URL(a.base_url).pathname.length }
  catch { return 0 }
})
```

---

## What Was Built

### `plugin/packages/core/src/index.ts`

**`createSplitEngine(options)`** — factory function, returns `{ process, getConfig }`. Instantiate once per process.

```ts
const engine = createSplitEngine({
  apiKey: 'sk_live_...',
  apiUrl: 'https://koryla-dev.netlify.app',
  cacheTtl: 60_000,  // optional, default 60s
})
```

**`process(urlString, cookieHeader): Promise<SplitResult | null>`**
- Returns `null` if no experiment matches (adapter should pass the request through)
- Returns `SplitResult` with `targetUrl`, `cookieName`, `variantId`, `isNewAssignment`

```ts
interface SplitResult {
  experimentId: string
  variantId: string
  targetUrl: string        // full URL to rewrite to
  cookieName: string       // e.g. "sp_<uuid>"
  isNewAssignment: boolean // true only on first visit (no prior cookie)
}
```

**Cookie stickiness with validation:**
```ts
const storedVariant = variantId ? experiment.variants.find(v => v.id === variantId) : null
if (!storedVariant) {
  variantId = assignVariant(experiment.variants)
  isNewAssignment = true
}
```
If the stored cookie references a variant that no longer exists (e.g. experiment was edited), a new assignment is made. This prevents visitors from being stuck in a "ghost" variant.

**Rewrite only pathname, preserve everything else:**
```ts
const targetUrl = new URL(urlString)
targetUrl.pathname = new URL(variant.target_url).pathname
```
Query strings, hash fragments, and host are all preserved. Only the pathname is rewritten.

### `plugin/packages/next/src/index.ts`

Wraps `@koryla/core` for Next.js middleware (edge runtime):

```ts
// middleware.ts (customer's project root)
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

export const config = {
  matcher: ['/', '/pricing', '/landing'],
}
```

Implementation:
```ts
const response = NextResponse.rewrite(new URL(result.targetUrl))
if (result.isNewAssignment) {
  response.cookies.set(result.cookieName, result.variantId, {
    maxAge: 60 * 60 * 24 * 30,  // 30 days
    sameSite: 'lax',
    path: '/',
  })
}
return response
```

`NextResponse.rewrite()` is the Next.js API for server-side URL rewrites. The browser sees the original URL. Uses `response.cookies.set()` (Next.js typed API) rather than raw `Set-Cookie` headers.

### `plugin/packages/netlify/src/index.ts`

Wraps `@koryla/core` for Netlify Edge Functions (Deno runtime):

```ts
// netlify/edge-functions/koryla.ts (customer's project)
import { korylaMiddleware } from '@koryla/netlify'

export default korylaMiddleware({
  apiKey: Deno.env.get('KORYLA_API_KEY')!,
  apiUrl: Deno.env.get('KORYLA_API_URL')!,
})

export const config = { path: ['/', '/pricing'] }
```

Netlify-specific: uses `context.rewrite(url)` (not `NextResponse`) and must clone the Response to mutate headers:

```ts
const response = await context.rewrite(result.targetUrl)
if (result.isNewAssignment) {
  const mutable = new Response(response.body, response)  // clone — Response is immutable
  mutable.headers.append('Set-Cookie', `${result.cookieName}=...`)
  return mutable
}
return response
```

### `plugin/packages/node/src/index.ts`

Wraps `@koryla/core` for Express/Node.js:

```ts
app.use(korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
}))
```

Node.js cannot transparently proxy to another origin (unlike edge runtimes). Instead it rewrites `req.url` to the variant's pathname and calls `next()`. The variant pages must exist as routes in the same app:

```ts
const variantPath = new URL(result.targetUrl).pathname
req.url = variantPath
if (req.originalUrl) req.originalUrl = variantPath
```

Cookie handling appends without overwriting existing `Set-Cookie` headers:
```ts
const existing = res.getHeader('Set-Cookie')
if (Array.isArray(existing)) {
  res.setHeader('Set-Cookie', [...existing, cookie])
} else if (existing) {
  res.setHeader('Set-Cookie', [existing as string, cookie])
} else {
  res.setHeader('Set-Cookie', cookie)
}
```

### `test-site/` — Proof of Concept

Astro static site with Netlify Edge Functions demonstrating the full flow.

**Pages:**
- `/` — homepage variant A
- `/variant-b` — homepage variant B
- `/pricing` — pricing variant A
- `/pricing-b` — pricing variant B
- `/thank-you` — conversion page

**Edge function:** `test-site/netlify/edge-functions/koryla.ts`

This file contains the `@koryla/core` logic **inlined** (not imported from the workspace package). This is necessary because Netlify's esbuild-based bundler for edge functions does not resolve pnpm workspace symlinks at build time. The inlined code is identical to `@koryla/core/src/index.ts`.

```ts
// test-site/netlify/edge-functions/koryla.ts
// @koryla/core logic inlined here because esbuild doesn't resolve workspace packages

const engine = createSplitEngine({
  apiKey: Deno.env.get('KORYLA_API_KEY') ?? '',
  apiUrl: Deno.env.get('KORYLA_API_URL') ?? 'http://localhost:3001',
})
```

The `deno_import_map` in `netlify.toml` points to `import_map.json`:
```json
{ "imports": { "@koryla/core": "../plugin/packages/core/src/index.ts" } }
```
This was the intended solution (have Deno resolve the workspace package via import map), but the Netlify CLI's esbuild step runs before Deno and fails to follow the map. The inline approach is the working solution.

**`netlify.toml` edge function config:**
```toml
[[edge_functions]]
  function = "koryla"
  path = "/"

[[edge_functions]]
  function = "koryla"
  path = "/pricing"
```

**Production validation:** With a 30/70 split configured in the dashboard, 10 requests to `test-site-koryla.netlify.app` returned approximately 3 variant-A responses and 7 variant-B responses — confirming weighted random assignment works correctly end-to-end.

---

## Key Decisions

**Single engine instance per process:** All three adapters use a module-level `let engine = null` pattern with lazy initialization:
```ts
let engine: ReturnType<typeof createSplitEngine> | null = null
// ...
if (!engine) engine = createSplitEngine(options)
```
This ensures the in-memory cache is shared across all requests in the same Node.js process or edge isolate. Recreating the engine on every request would reset the cache and cause a config fetch on every request.

**`context.rewrite()` vs `fetch()` in Netlify:** Netlify's `context.rewrite()` serves the rewritten URL from the same Netlify CDN — it's not an external HTTP request. This is critical for performance: no round-trip to origin, no additional network hop. The rewrite happens entirely at the edge.

**Response immutability in Web Fetch API:** Both the Netlify and Cloudflare Worker adapters must create `new Response(response.body, response)` before mutating headers. The Web Fetch API `Response` objects returned by `fetch()` and `context.rewrite()` are immutable per spec. Attempting to call `.headers.append()` on them directly throws a `TypeError`.

**Cookie `Max-Age` of 30 days:** Variant assignment sticks for 30 days. This is a product decision: long enough that a visitor reliably sees the same variant across multiple sessions (returning visitors don't get re-assigned), but not so long that it prevents clean experiment restarts.

---

## How to Reproduce

### Next.js project setup:
```bash
npm install @koryla/next  # once published to npm
# or for workspace development:
# pnpm install (workspace symlinks handle it)
```

```ts
// middleware.ts
import { korylaMiddleware } from '@koryla/next'
export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})
export const config = { matcher: ['/'] }
```

### Netlify Edge Function setup:
```ts
// netlify/edge-functions/koryla.ts
import { korylaMiddleware } from '@koryla/netlify'
export default korylaMiddleware({ ... })
export const config = { path: ['/'] }
```

### Test locally:
```bash
pnpm test-site:netlify  # runs: netlify dev in test-site/
# Set KORYLA_API_KEY and KORYLA_API_URL in test-site/netlify.toml [dev.environment]
```

---

## Known Issues / Gotchas

**esbuild + pnpm workspace packages:** Netlify's esbuild bundler cannot resolve `@koryla/core` from a pnpm workspace symlink. The import map (`deno_import_map`) only applies to Deno's runtime resolution, not esbuild's compile step. Workaround: inline the core logic in the edge function. When `@koryla/core` is published to npm, this issue disappears — npm installs resolve normally.

**Engine singleton in edge runtimes:** Edge runtimes (Cloudflare Workers, Netlify Edge Functions) may share or isolate module state between requests depending on the runtime. In Cloudflare Workers, module-level state is shared within an isolate but isolates can be recycled. In practice, the `let engine = null` pattern works correctly — the in-memory cache improves performance but is not required for correctness (cache miss just triggers a fresh fetch).

**Node.js adapter: same-origin variants only:** The `@koryla/node` adapter rewrites `req.url` internally — it cannot proxy to an external origin. Variants must be routes in the same Express application. If variant B is on a different server/domain, the Node.js adapter is not suitable — the Cloudflare Worker or edge adapters should be used instead.

**No SSR support for `@koryla/core` in Nuxt/Vue:** The Koryla adapters are designed to run in middleware (before rendering), not during SSR. Using `@koryla/core` directly in a Nuxt server route would work, but the cache would be shared across users (session state is per-request, not global). The recommended approach for Nuxt apps is to use the `@koryla/netlify` adapter as a Netlify Edge Function, not in Nuxt middleware.

**`assignVariant` is not deterministic:** Each call to `assignVariant()` uses `Math.random()`. There is no seed or deterministic assignment based on user ID. This means a user who clears cookies (or uses a different browser) gets a fresh random assignment and may be placed in a different variant. True user-based determinism would require a hashed user ID as input to the random selection.
