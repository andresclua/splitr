---
title: Mixpanel
description: Send Koryla experiment assignment events to Mixpanel for funnel analysis and cohort breakdowns.
section: Integrations
slug: integrations-mixpanel
order: 14
---

# Mixpanel

Koryla sends experiment assignments to Mixpanel as `Experiment Viewed` events. You can then use Mixpanel's funnel and cohort tools to measure variant performance.

## Setup

1. In Mixpanel, go to **Project Settings → Access Keys** and copy your **Project token**.
2. Enter the token in **Dashboard → Integrations → Mixpanel** and toggle it on.

## What gets sent

```json
{
  "event": "Experiment Viewed",
  "properties": {
    "distinct_id": "[session_id]",
    "token": "your-project-token",
    "experiment_id": "a1b2c3...",
    "experiment_name": "Homepage CTA Test",
    "variant_id": "x9y8z7...",
    "variant_name": "Blue button",
    "time": 1712793600
  }
}
```

The `distinct_id` is the Koryla session ID — an anonymous identifier persisted in the `ky_session` cookie.

## Analyzing results in Mixpanel

**Funnels**

1. Go to **Funnels** → create a new funnel
2. Step 1: `Experiment Viewed` where `experiment_name = "Your Test"`
3. Step 2: your goal event (e.g. `Signed Up`, `Purchase Completed`)
4. Break down by `variant_name`

**Cohort breakdown**

Create cohorts based on `variant_name` and compare downstream behavior — retention, LTV, feature adoption, etc.

## Notes

- Events fire once per visitor per experiment.
- The `distinct_id` is anonymous. If your site also identifies users in Mixpanel (e.g. via `mixpanel.identify()`), the anonymous and identified profiles won't be merged automatically. For full attribution use `$distinct_id` aliasing or the custom webhook integration with your own user ID.
