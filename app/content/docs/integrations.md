---
title: Analytics Integrations
description: Send experiment data to GA4, PostHog, Plausible, Mixpanel, Amplitude and custom webhooks.
section: Integrations
slug: integrations
---

# Analytics Integrations

Koryla can forward experiment assignment events to your analytics platform automatically. When a new visitor is assigned to a variant, the Worker fires a background event using `waitUntil` — so it never blocks the page load.

## How it works

Every time a visitor is assigned to a variant for the first time, the edge function calls your configured analytics platform in the background. The event is fired only once per visitor per experiment — returning visitors who already have the `ky_` cookie do not trigger a second event.

> **Astro demo:** See [`netlify/edge-functions/koryla.ts#L115-L132`](https://github.com/andresclua/koryla-astro-demo-example/blob/main/netlify/edge-functions/koryla.ts#L115-L132) for the `fireEvent` function that dispatches events without blocking the response.

## Supported platforms

| Platform | Plans | Doc |
|---|---|---|
| Google Analytics 4 | Starter, Growth | [Setup →](/docs/integrations-ga4) |
| PostHog | Growth | [Setup →](/docs/integrations-posthog) |
| Plausible | Starter, Growth | [Setup →](/docs/integrations-plausible) |
| Mixpanel | Growth | [Setup →](/docs/integrations-mixpanel) |
| Amplitude | Growth | [Setup →](/docs/integrations-amplitude) |
| Custom Webhook | Growth | [Setup →](/docs/integrations-webhook) |

## Setting up an integration

1. Go to **Integrations** in your workspace dashboard
2. Select your analytics platform
3. Enter your credentials (Measurement ID, API key, etc.)
4. Toggle it **on**

Changes take effect within 60 seconds (the KV cache TTL).

## Event schema

All integrations receive the same event data:

| Field | Type | Example |
|---|---|---|
| `experiment_id` | UUID | `"a1b2c3..."` |
| `experiment_name` | string | `"Homepage CTA Test"` |
| `variant_id` | UUID | `"x9y8z7..."` |
| `variant_name` | string | `"Blue button"` |
| `session_id` | string | anonymous visitor identifier |
| `timestamp` | ISO 8601 | `"2026-04-10T22:00:00Z"` |

## Events fire only once per visitor

Analytics events are fired **only on new variant assignments** — not on every page view. A returning visitor who already has the `ky_` cookie will not trigger another event. This keeps your data clean and prevents inflating event counts.
