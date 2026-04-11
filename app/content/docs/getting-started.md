---
title: Getting Started
description: Set up Koryla on your site in under 5 minutes. Works with Netlify, Next.js, Cloudflare, WordPress, and more.
section: Introduction
slug: getting-started
---

# Getting Started

Koryla runs A/B experiments at the **edge** — before the page reaches the browser. No flicker, no performance hit, no JavaScript required on the visitor's side.

This guide walks you through your first experiment from sign-up to live traffic.

## Prerequisites

- A [Koryla account](/signup) (free tier available)
- A website you control (any stack — Astro, Next.js, WordPress, etc.)

That's it. No Cloudflare account required unless you specifically want the Cloudflare Worker approach.

---

## Step 1 — Create your workspace

After signing up, you'll be prompted to create a workspace. This is where all your experiments, API keys and settings live. Give it your company or project name.

If you sign up with a work email (e.g. `@acme.com`), teammates who sign up with the same domain will be able to join your workspace automatically.

---

## Step 2 — Create an API key

Go to **Settings → API Keys → New key** in your dashboard.

Give it a name like `Production` and copy the key — it starts with `sk_live_` and is shown only once. If you lose it, delete it and create a new one.

> **Security note:** API keys are hashed before being stored. Koryla can never recover your original key.

---

## Step 3 — Connect your platform

Pick the path that matches your stack. You only need one.

### Netlify

The fastest path. Add one file and two lines to `netlify.toml` — no npm install required.

> **Astro demo:** See the full working example in [`netlify/edge-functions/koryla.ts`](https://github.com/andresclua/koryla-astro-demo-example/blob/main/netlify/edge-functions/koryla.ts) and [`netlify.toml`](https://github.com/andresclua/koryla-astro-demo-example/blob/main/netlify.toml).

**1. Create the edge function**

```ts
// netlify/edge-functions/koryla.ts
import { korylaMiddleware } from '@koryla/netlify'

export default korylaMiddleware({
  apiKey: Deno.env.get('KORYLA_API_KEY')!,
  apiUrl: Deno.env.get('KORYLA_API_URL')!,
})
```

Or copy the self-contained version (no npm) from your **Dashboard → Settings → Edge Function Script**.

**2. Register the paths in netlify.toml**

```toml
[[edge_functions]]
  function = "koryla"
  path = "/"

[[edge_functions]]
  function = "koryla"
  path = "/pricing"
```

Add one `[[edge_functions]]` block per path you want to A/B test.

**3. Add environment variables in Netlify**

Go to your site in the Netlify dashboard → **Site configuration → Environment variables**:

| Variable | Value |
|---|---|
| `KORYLA_API_KEY` | `sk_live_...` from Step 2 |
| `KORYLA_API_URL` | `https://koryla.com` |

Deploy and you're done. See the [live demo →](https://astro-demo.koryla.com) for a working example.

---

### Next.js / Vercel

Add a single middleware file to your project root. Runs on the Vercel Edge Network — no Cloudflare needed.

```bash
npm install @koryla/next
```

```ts
// middleware.ts
import { korylaMiddleware } from '@koryla/next'

export default korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,
})

export const config = {
  matcher: ['/', '/pricing', '/landing'],
}
```

Add `KORYLA_API_KEY` and `KORYLA_API_URL` to your Vercel project environment variables.

Full guide → [React / Next.js SDK →](/docs/sdk-react)

---

### Cloudflare Worker

Best for sites where DNS is already managed through Cloudflare, or when you want the Worker in front of any stack (not just Netlify/Vercel).

See [Worker Setup →](/docs/worker-setup) for the full installation guide.

---

### WordPress

No npm, no edge functions — the PHP plugin handles splitting server-side.

See [WordPress SDK →](/docs/sdk-wordpress) for install and configuration.

---

## Step 4 — Create your first experiment

1. In your Koryla dashboard, go to **Experiments → New**
2. Enter a name (e.g. "Homepage CTA Test")
3. Set the **Base URL** — the path you want to test (e.g. `/`)
4. Add variants:
   - **Control** (original page) — weight `50`
   - **Variant B** — point to an alternate URL (e.g. `/homepage-v2`) — weight `50`
5. Click **Start experiment**

Your variant page (`/homepage-v2`) needs to exist in your site. Create it as a duplicate of the original with the change you want to test.

---

## Step 5 — Verify it's working

Open your site in an incognito window and check the browser cookies. You should see a cookie named `ky_{experimentId}` with a variant ID value. That's Koryla assigning you to a group.

Refresh a few times — the cookie persists so you always see the same variant. Open a second incognito window and you may land in a different variant.

---

## What's next?

- [Experiments →](/docs/experiments) — read results and manage experiments
- [Variants →](/docs/variants) — set up multi-variant and multivariate tests
- [Analytics Integrations →](/docs/integrations) — send data to GA4, PostHog, and more
