---
title: Amplitude
description: Forward Koryla experiment events to Amplitude for behavioral and conversion analysis.
section: Integrations
slug: integrations-amplitude
---

# Amplitude

Koryla sends experiment assignment events to Amplitude as `Experiment Viewed` events. Use Amplitude's chart builder or funnel analysis to measure conversion rates per variant.

## Setup

1. In Amplitude, go to **Settings → Projects → your project** and copy the **API key**.
2. Enter the API key in **Dashboard → Integrations → Amplitude** and toggle it on.

## What gets sent

```json
{
  "api_key": "your-api-key",
  "events": [
    {
      "event_type": "Experiment Viewed",
      "user_id": "[session_id]",
      "event_properties": {
        "experiment_id": "a1b2c3...",
        "experiment_name": "Homepage CTA Test",
        "variant_id": "x9y8z7...",
        "variant_name": "Blue button"
      },
      "time": 1712793600000
    }
  ]
}
```

## Analyzing results in Amplitude

**Funnel chart**

1. Go to **Charts → Funnel Analysis**
2. Step 1: `Experiment Viewed` with filter `experiment_name = "Your Test"`
3. Step 2: your goal event
4. Group by `variant_name`

**Segmentation chart**

Use `Event Segmentation` to count `Experiment Viewed` events broken down by `variant_name` over time — useful for checking that traffic split is evenly distributed.

## Notes

- Events fire once per visitor per experiment.
- The `user_id` is the Koryla session ID — an anonymous identifier. If your site uses Amplitude's JS SDK and calls `setUserId()` after the user logs in, the anonymous and identified events won't be merged automatically. For authenticated user attribution, use the custom webhook integration.
