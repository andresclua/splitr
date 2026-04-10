---
title: Getting Started
description: Set up Koryla on your site in under 5 minutes.
order: 1
section: Introduction
slug: getting-started
---

# Getting Started

Koryla runs A/B experiments at the **edge** — before the page reaches the browser. No flicker, no performance hit, no JavaScript required on the visitor's side.

This guide walks you through your first experiment from sign-up to live traffic.

## How it works

When a visitor hits your site, a **Cloudflare Worker** intercepts the request. It checks if there's an active experiment matching that URL, assigns the visitor to a variant (stored in a cookie), and silently rewrites the request to the correct URL. The browser never knows an experiment is running.

1. Visitor makes a request to your domain
2. Cloudflare Worker intercepts the request
3. Worker checks KV cache for experiment config (refreshes every 60s from Koryla API)
4. Worker assigns a variant and rewrites the URL
5. Your server responds with the correct variant page

This is fundamentally different from client-side tools like Optimizely or Google Optimize, which inject JavaScript that modifies the DOM after load — causing the infamous "flicker" effect.

## Prerequisites

- A [Koryla account](/signup) (free tier available)
- A Cloudflare account (free)
- A website you control (any stack — static, Next.js, Astro, WordPress, etc.)

## Step 1 — Create your workspace

After signing up, you'll be prompted to create a workspace. This is where all your experiments, API keys and settings live. Give it your company or project name.

If you sign up with a work email (e.g. `@acme.com`), teammates who sign up with the same domain will be able to join your workspace automatically.

## Step 2 — Create an API key

Go to **Settings → API Keys → New key** in your dashboard.

Give it a name like `Production Worker` and copy the key — it starts with `sk_live_` and is shown only once. If you lose it, delete it and create a new one.

> **Security note:** API keys are hashed before being stored. Koryla can never recover your original key.

## Step 3 — Deploy the Cloudflare Worker

This is the only technical step. You're deploying a small script to Cloudflare that sits in front of your site and handles the traffic splitting. **You don't need to touch your existing site code.**

### What is a Cloudflare Worker?

A Worker is a tiny script that runs at Cloudflare's edge — in data centers around the world, milliseconds from your visitors. It intercepts requests before they reach your server. Cloudflare's free plan includes 100,000 Worker requests per day, which is more than enough to get started.

### Before you begin

You need:
- A **free Cloudflare account** at [cloudflare.com](https://cloudflare.com)
- Your **domain's DNS managed through Cloudflare** — this is how the Worker can intercept your traffic. If your domain is currently at Namecheap, GoDaddy, etc., you'll need to either transfer DNS to Cloudflare (free, takes ~5 minutes) or use a Cloudflare-proxied subdomain. See [Cloudflare's DNS setup guide](https://developers.cloudflare.com/dns/zone-setups/full-setup/).

### Option A — Cloudflare Dashboard (no CLI needed)

This is the easiest path if you've never used a terminal.

**1. Create the Worker**

Go to [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Create Worker**. Give it a name like `koryla-worker` and click **Deploy** (the default script doesn't matter, you'll replace it).

**2. Paste the Worker script**

In your new Worker, click **Edit code**. Delete everything in the editor and paste the Koryla Worker script. You can find the exact script in your Koryla dashboard under **Settings → Worker Script**.

**3. Add environment variables**

Go to your Worker → **Settings → Variables** and add:

| Variable | Value | Type |
|---|---|---|
| `KORYLA_API_URL` | Your Koryla app URL (e.g. `https://app.koryla.io`) | Plain text |
| `KORYLA_API_KEY` | Your `sk_live_...` key from Step 2 | **Secret** (encrypted) |

Always use **Secret** for the API key — it hides the value in the dashboard and in logs.

**4. Create a KV namespace**

Go to **Workers & Pages → KV** → **Create namespace**. Name it `KORYLA_CONFIG`. Copy the namespace ID.

Then go back to your Worker → **Settings → Variables → KV Namespace Bindings** → **Add binding**:
- Variable name: `KORYLA_CONFIG`
- KV namespace: the one you just created

**5. Add a Worker Route**

Go to your domain in the Cloudflare dashboard → **Workers Routes** → **Add route**:
- Route: `yourdomain.com/*`
- Worker: `koryla-worker`

> Make sure your domain's DNS record has the **orange cloud** (Proxied) enabled — otherwise Cloudflare can't intercept the traffic.

---

### Option B — Wrangler CLI (for developers)

If you're comfortable in a terminal, this is faster.

```bash
# Install Wrangler (Cloudflare's CLI)
npm install -g wrangler

# Log in to your Cloudflare account
wrangler login

# Clone the Koryla Worker
git clone https://github.com/andresclua/koryla-worker
cd koryla-worker

# Create a KV namespace for caching
wrangler kv namespace create KORYLA_CONFIG
# → Copy the "id" from the output into wrangler.toml

# Set your API key as an encrypted secret
wrangler secret put KORYLA_API_KEY
# → Paste your sk_live_... key when prompted

# Deploy to Cloudflare
wrangler deploy
```

Then add a Worker Route in the Cloudflare dashboard (same as Step 5 above), or add it to `wrangler.toml`:

```toml
[[routes]]
pattern = "yourdomain.com/*"
zone_name = "yourdomain.com"
```

### Not sure if it's working?

After deploying, visit any page on your domain and open **DevTools → Application → Cookies**. If there's an active experiment, you'll see a cookie named `sp_[experiment-id]`. If you don't see one yet, create your first experiment in Step 5 first, then come back and check.

## Step 4 — Point your domain through Cloudflare

If your domain's DNS is already managed by Cloudflare with the orange cloud (Proxied) enabled, you're done — skip this step.

If not, you have two options:

**Move your DNS to Cloudflare (recommended)**
Cloudflare's DNS is free and faster than most registrars. In your domain registrar (Namecheap, GoDaddy, Google Domains, etc.), change the nameservers to the ones Cloudflare gives you. This takes 5–30 minutes to propagate.

**Use a Cloudflare-proxied subdomain**
If you can't or don't want to move your whole domain, set up a CNAME subdomain (e.g. `www.yourdomain.com`) that points to your server and is proxied through Cloudflare. Run your Worker on that subdomain only.

## Step 5 — Create your first experiment

1. In your Koryla dashboard, go to **Experiments → New**
2. Enter a name (e.g. "Homepage CTA Test")
3. Set the **Base URL** — the path you want to test (e.g. `/`)
4. Add variants:
   - **Control** (original page) — weight `50`
   - **Variant A** — point to an alternate URL (e.g. `/homepage-v2`) — weight `50`
5. Click **Start experiment**

## Step 6 — Verify it's working

Open your site in an incognito window and check the browser cookies. You should see a cookie named `sp_{experimentId}` with a variant ID value. That's Koryla assigning you to a group.

Refresh a few times — the cookie persists so you always see the same variant. Open a second incognito window and you may land in a different variant.

## What's next?

- [Experiments →](/docs/experiments) — learn how to read results and manage experiments
- [Variants →](/docs/variants) — set up multi-variant and multivariate tests
- [Analytics Integrations →](/docs/integrations) — send data to GA4, PostHog, and more
