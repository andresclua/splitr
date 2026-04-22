---
title: Google Analytics 4
description: Send Koryla experiment events to GA4 using the Measurement Protocol — no gtag.js required.
section: Integrations
slug: integrations-ga4
order: 13
---

# Google Analytics 4

Koryla sends experiment data to GA4 via the **Measurement Protocol** — a server-to-server API that doesn't require the gtag.js snippet on your page.

## Setup

You need two values from your GA4 property:

1. **Measurement ID** — found in Admin → Data Streams → your stream. Looks like `G-XXXXXXXXXX`.
2. **Measurement Protocol API secret** — in the same screen, scroll to **Measurement Protocol API secrets** → create a new one and copy the value.

Enter both in **Dashboard → Integrations → Google Analytics 4** and toggle it on.

## What gets sent

Koryla fires a `experiment_viewed` custom event on every new variant assignment:

```json
{
  "name": "experiment_viewed",
  "params": {
    "experiment_id": "a1b2c3...",
    "experiment_name": "Homepage CTA Test",
    "variant_id": "x9y8z7...",
    "variant_name": "Blue button"
  }
}
```

## Analyzing results in GA4

Go to **Explore → Free form** and configure:

- **Dimensions:** `experiment_name`, `variant_name`
- **Metric:** conversions, sessions, or your goal metric
- **Filter:** event name = `experiment_viewed`

This gives you a breakdown of impressions and conversion rates per variant.

## Notes

- Events are fired once per visitor — returning visitors with an existing `ky_` cookie do not generate a second event.
- The Measurement Protocol sends events as anonymous (no `client_id` linkage to browsing sessions). Use `experiment_name` and `variant_name` as dimensions to slice data.
- GA4 can take up to 24 hours to show custom events in the UI for the first time.
