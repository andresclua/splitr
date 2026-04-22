---
title: PostHog
description: Forward Koryla experiment assignments to PostHog as $experiment_started events.
section: Integrations
slug: integrations-posthog
order: 16
---

# PostHog

Koryla sends experiment assignments to PostHog as `$experiment_started` events — the same event format PostHog's own feature flags use, so they integrate cleanly with the Experiments and Insights features.

## Setup

1. In your PostHog project, go to **Project Settings → Project API key** and copy the key (starts with `phc_`).
2. If you're on **PostHog Cloud EU**, also note your host: `https://eu.i.posthog.com`. US Cloud uses `https://us.i.posthog.com`.
3. Enter the API key (and host if needed) in **Dashboard → Integrations → PostHog** and toggle it on.

## What gets sent

```json
{
  "event": "$experiment_started",
  "distinct_id": "[session_id]",
  "properties": {
    "experiment_name": "Homepage CTA Test",
    "variant": "Blue button",
    "$experiment_id": "a1b2c3...",
    "$variant_id": "x9y8z7..."
  }
}
```

The `distinct_id` is the Koryla session ID — an anonymous identifier persisted in the `ky_session` cookie.

## Analyzing results in PostHog

**Option 1 — Experiments**

If you use PostHog's Experiments feature, Koryla events will appear in the experiment results automatically when the `experiment_name` matches.

**Option 2 — Funnel in Insights**

1. Create a new Insight → Funnel
2. Step 1: Filter by `$experiment_started` where `experiment_name = "Your Test"`
3. Step 2: Add your goal event (e.g. `purchase`, `signed_up`)
4. Break down by `variant`

This shows conversion rates per variant over any date range.

## Notes

- Events fire once per visitor per experiment (on new `ky_` cookie assignment).
- The `distinct_id` is anonymous — if you also have PostHog's JS snippet on your pages and users are identified, the events won't be automatically merged. For full funnel attribution, pass your own user ID via a custom webhook integration instead.
