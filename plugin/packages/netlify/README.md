# @splitr/netlify

A/B testing for Netlify sites with zero flicker. Runs on Netlify Edge Functions (Deno).

## Installation

```bash
npm install @splitr/netlify
```

## Setup

### 1. Add environment variables

In your Netlify dashboard → Site settings → Environment variables:

```
SPLITR_API_KEY   = sk_live_...
SPLITR_API_URL   = https://your-splitr-app.vercel.app
```

Or in `netlify.toml`:

```toml
[build.environment]
  SPLITR_API_URL = "https://your-splitr-app.vercel.app"
# SPLITR_API_KEY should be set via the dashboard (never commit secrets)
```

### 2. Create an edge function

```ts
// netlify/edge-functions/splitr.ts
import { splitrMiddleware } from '@splitr/netlify'

export default splitrMiddleware({
  apiKey: Deno.env.get('SPLITR_API_KEY')!,
  apiUrl: Deno.env.get('SPLITR_API_URL')!,
})

export const config = {
  path: ['/', '/pricing', '/landing'],
}
```

### 3. Create your variant pages

Your variant pages must be real pages in your site:

```
src/pages/
  index.astro        ← control  (base_url: https://acme.com/)
  variant-b.astro    ← variant  (target_url: https://acme.com/variant-b)
```

Works with any Netlify-hosted framework: Astro, SvelteKit, Nuxt, plain HTML.

### 4. Create the experiment in Splitr

Go to your Splitr dashboard → New experiment → set to Active.

## How it works

```
User visits /
     │
     ▼
Netlify Edge Function (runs at Deno edge, before your site)
     │
     ├── fetches experiment config from Splitr API (cached 60s)
     ├── reads variant cookie — if present, reuses it
     └── assigns variant by weight, rewrites via context.rewrite()
     │
     ▼
Netlify serves /variant-b content
Browser sees original URL (/) — no redirect, no flicker
```
