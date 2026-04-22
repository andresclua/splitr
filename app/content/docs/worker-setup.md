---
title: Worker Setup
description: How to deploy and configure the Koryla Cloudflare Worker for your domain.
section: Worker
slug: worker-setup
order: 19
---

# Worker Setup

The Koryla Worker is a Cloudflare Worker that intercepts traffic on your domain, assigns visitors to experiment variants, and rewrites requests to the correct variant URL.

## Prerequisites

- A [Cloudflare account](https://cloudflare.com) (free tier works)
- Your domain's DNS managed through Cloudflare (proxied, orange cloud)
- Node.js 18+ and npm installed
- A Koryla API key (see [API Keys →](/docs/api-keys))

## Install Wrangler

Wrangler is Cloudflare's CLI for deploying Workers:

```bash
npm install -g wrangler
wrangler login
```

`wrangler login` opens a browser tab for OAuth authentication with your Cloudflare account.

## Clone the Worker

```bash
git clone https://github.com/andresclua/koryla-worker
cd koryla-worker
npm install
```

## Configure wrangler.toml

Open `wrangler.toml` and update:

```toml
name = "koryla-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"
compatibility_flags = ["nodejs_compat"]

[vars]
KORYLA_API_URL = "https://koryla.com"

[[kv_namespaces]]
binding = "KORYLA_CONFIG"
id = "YOUR_KV_NAMESPACE_ID"
```

Replace `KORYLA_API_URL` with your Koryla app URL.

## Create a KV namespace

The Worker uses KV to cache experiment config:

```bash
wrangler kv namespace create KORYLA_CONFIG
```

Copy the `id` from the output and paste it into `wrangler.toml`:

```
[[kv_namespaces]]
binding = "KORYLA_CONFIG"
id = "abc123..."  # ← paste here
```

## Set your API key

Never put your API key in `wrangler.toml`. Use a secret instead:

```bash
wrangler secret put KORYLA_API_KEY
# Paste your sk_live_... key when prompted
```

## Deploy

```bash
wrangler deploy
```

You should see output like:

```
✓ Deployed koryla-worker (1.23 sec)
  https://koryla-worker.YOUR_SUBDOMAIN.workers.dev
```

## Add a Worker route

For the Worker to intercept traffic on your domain (not just the `.workers.dev` URL), add a route:

### Via Cloudflare Dashboard

1. Go to your domain → **Workers Routes**
2. Click **Add route**
3. Pattern: `yourdomain.com/*`
4. Worker: select `koryla-worker`

### Via wrangler.toml

```toml
[[routes]]
pattern = "yourdomain.com/*"
zone_name = "yourdomain.com"
```

Then redeploy: `wrangler deploy`

## Verify the Worker is running

Visit your site and open DevTools → Application → Cookies. After loading a page that has an active experiment, you should see a cookie:

```
Name:  ky_[experiment-id]
Value: [variant-id]
```

If you don't see the cookie, check:
1. The Worker route is active (Cloudflare Dashboard → Workers Routes)
2. The experiment is in `active` status in Koryla
3. The experiment's base URL matches the page you're visiting
4. The API key is correct (`wrangler secret list` to confirm it's set)

## Local development

You can run the Worker locally for testing:

```bash
wrangler dev
```

This starts a local server at `http://localhost:8787`. You can test your Worker against local experiment config without affecting production.

## Updating the Worker

When a new version of the Koryla Worker is released:

```bash
git pull origin main
wrangler deploy
```

Changes to experiment configuration in the dashboard don't require a Worker redeploy — they're picked up automatically via the KV cache refresh (every 60 seconds).

## Multiple domains

If you run experiments on multiple domains, deploy a separate Worker for each and use a different API key per workspace:

```bash
wrangler deploy --name koryla-worker-blog     # for blog.yourdomain.com
wrangler deploy --name koryla-worker-app      # for app.yourdomain.com
```

Each Worker should have its own `KORYLA_API_KEY` secret pointing to the appropriate workspace.
