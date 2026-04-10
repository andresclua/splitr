---
title: API Keys
description: How to create and manage API keys that authenticate the Koryla Worker.
order: 5
section: Core Concepts
slug: api-keys
---

# API Keys

API keys authenticate the Cloudflare Worker when it fetches experiment configuration from Koryla. Without a valid key, the Worker cannot retrieve your experiments and will pass all traffic through unmodified.

## How keys work

When the Worker needs fresh config (KV cache miss), it calls the Koryla API:

```
GET /api/worker/config
Authorization: Bearer sk_live_...
```

Koryla validates the key, finds the associated workspace, and returns the active experiments for that workspace. The Worker caches this in KV for 60 seconds.

## Creating a key

1. Go to **Settings → API Keys** in your dashboard
2. Click **New key**
3. Enter a descriptive name (e.g. `Production Worker`, `Staging Worker`)
4. Copy the key immediately — it's shown **only once**

Key format: `sk_live_[32 random bytes hex]`

> Koryla hashes the key with SHA-256 before storing it. The original value cannot be recovered. If you lose a key, delete it and create a new one.

## Using the key

### In Wrangler (recommended)

```bash
wrangler secret put KORYLA_API_KEY
# Paste your sk_live_... key when prompted
```

Wrangler secrets are encrypted and never appear in `wrangler.toml` or source code.

### In Cloudflare Dashboard

Go to your Worker → **Settings → Variables** → **Add variable** → set name to `KORYLA_API_KEY`, type **Secret**, paste the value.

> Always use the **Secret** type, not Plain text. Secrets are encrypted at rest and masked in logs.

## Multiple environments

If you run separate Workers for staging and production, create separate API keys for each:

| Environment | Key name | Worker |
|---|---|---|
| Production | `Production Worker` | `koryla-worker` on your main domain |
| Staging | `Staging Worker` | `koryla-worker-staging` on staging domain |

This way you can test experiments on staging without affecting production traffic.

## Rotating a key

To rotate a key without downtime:

1. Create a new key in the dashboard
2. Update the Worker's `KORYLA_API_KEY` secret with the new value
3. Verify the Worker is using the new key (check it fetches config correctly)
4. Delete the old key from the dashboard

The Worker picks up the new secret on the next deploy (or within seconds for Cloudflare Secrets).

## Key permissions

Each key is **scoped to a single workspace**. A key for workspace A cannot access workspace B's experiments. This is enforced server-side — even if someone gets hold of your key, they can only read your experiment config (which is not sensitive data).

## Security best practices

- **Rotate keys** if you suspect they've been exposed
- **Use secrets**, not plain environment variables
- **One key per environment** — don't share keys between production and staging
- **Delete unused keys** — e.g. when offboarding or replacing a Worker
- **Never commit keys** to source code or `wrangler.toml`

## Viewing key usage

The dashboard shows each key's `last_used_at` timestamp, updated on every API call. If a key hasn't been used in a while, you can safely delete it.
