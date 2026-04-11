---
title: SDK Overview
description: Install Koryla in your framework — React, Vue, Astro, or WordPress. Zero JS on the client, zero flicker.
section: SDK
slug: sdk
---

# SDK Overview

Koryla ships adapters for every major framework. Pick your stack and follow the guide — each one is a 5-minute setup.

## Two approaches

| | Edge / Middleware | Component SDK |
|---|---|---|
| **What it tests** | Entire pages (`/` vs `/variant-b`) | Specific components within a page |
| **How** | Intercepts the request before your app renders — URL rewrite, no redirect | `getVariant()` in server code, conditionally render the matching component |
| **Code changes** | None in your pages | Add `getVariant()` call + conditional render |
| **Flicker** | Zero | Zero |
| **Client JS** | None | None |

Both approaches are fully server-side. The browser never sees the experiment logic.

## Choose your framework

- [React / Next.js →](/docs/sdk-react) — `@koryla/react` + `@koryla/next` middleware
- [Vue / Nuxt →](/docs/sdk-vue) — `@koryla/vue`
- [Astro →](/docs/sdk-astro) — `@koryla/astro`
- [WordPress →](/docs/sdk-wordpress) — PHP plugin, no npm required

## How variant assignment works

1. **Config fetch** — `getVariant()` calls `GET /api/worker/config` with your API key. Response is cached in memory for 60 seconds (one network call per minute per process).
2. **Cookie check** — reads `ky_{experimentId}` from the request cookies. If present and valid → return the same variant (sticky session).
3. **Weighted assignment** — if no cookie, randomly assigns a variant using the `traffic_weight` values from your dashboard.
4. **Render** — your page code renders the correct variant. Cookie setting is the caller's responsibility.

## Finding your experiment ID

Go to **Dashboard → Experiments → click your experiment**. The ID is in the URL:
`/dashboard/my-workspace/experiments/abc-123`

Variant IDs are shown in the **Variants** tab of each experiment.
