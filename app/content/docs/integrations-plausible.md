---
title: Plausible
description: Track Koryla experiment assignments as custom Plausible goals — no cookies, no GDPR headaches.
section: Integrations
slug: integrations-plausible
---

# Plausible

Koryla sends experiment assignment events to Plausible as custom goal events. Because Plausible is privacy-first and cookie-free, this integration works especially well if you want to avoid the complexity of GA4 consent banners.

## Setup

1. In your Plausible dashboard, go to **Settings → Goals** and create a custom event goal named `Experiment`.
2. Copy your **site domain** (e.g. `yoursite.com` — not a URL, just the domain).
3. Enter the domain in **Dashboard → Integrations → Plausible** and toggle it on.

> Plausible Analytics must already be installed on your site (the script tag or proxy setup). The Koryla integration supplements it with server-side events.

## What gets sent

Koryla fires a custom event named `Experiment` with two properties:

```
event: Experiment
props:
  experiment: "Homepage CTA Test"
  variant: "Blue button"
```

## Analyzing results in Plausible

1. Open your Plausible dashboard
2. Scroll to **Goal conversions** → click `Experiment`
3. Filter or break down by the `experiment` and `variant` custom properties

You'll see impression counts per experiment and variant. To measure conversion rate, create a second goal for your conversion event (e.g. `Signup`) and compare the two goal counts filtered by variant.

## Notes

- Plausible custom properties are a paid feature (Plausible Business or self-hosted).
- Events fire once per visitor per experiment.
- No cookies are set by Koryla for Plausible — the integration is purely server-to-server.
