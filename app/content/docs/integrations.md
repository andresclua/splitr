---
title: Analytics Integrations
description: Send experiment data to GA4, PostHog, Plausible, Mixpanel, Amplitude and custom webhooks.
order: 7
section: Integrations
slug: integrations
---

# Analytics Integrations

Koryla can forward experiment assignment events to your analytics platform automatically. When a new visitor is assigned to a variant, the Worker fires a background event (using `waitUntil` — so it never blocks the page load).

## Supported platforms

| Platform | Plans |
|---|---|
| Google Analytics 4 (GA4) | Starter, Growth |
| Plausible | Starter, Growth |
| PostHog | Growth |
| Mixpanel | Growth |
| Amplitude | Growth |
| Custom Webhook | Growth |

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
| `session_id` | string | same as variant ID (used as anonymous ID) |
| `timestamp` | ISO 8601 | `"2026-04-10T22:00:00Z"` |

---

## Google Analytics 4

### Setup

You need a GA4 **Measurement ID** (`G-XXXXXXXXXX`) and a **Measurement Protocol API secret**.

To get the API secret:
1. Open GA4 → Admin → Data Streams → your stream
2. Scroll to **Measurement Protocol API secrets**
3. Create a new secret and copy the value

Enter both in the Integrations settings.

### What gets sent

Koryla sends a `experiment_viewed` custom event via the GA4 Measurement Protocol:

```json
{
  "name": "experiment_viewed",
  "params": {
    "experiment_id": "...",
    "experiment_name": "Homepage CTA Test",
    "variant_id": "...",
    "variant_name": "Blue button"
  }
}
```

### Analyzing in GA4

In **Explore → Free form**:
- Dimension: `experiment_name`, `variant_name`
- Metric: conversions, sessions, or your goal metric
- Filter: event name = `experiment_viewed`

---

## PostHog

### Setup

Enter your PostHog **Project API key** (starts with `phc_`). If you're using PostHog Cloud EU, also update the host to `https://eu.i.posthog.com`.

### What gets sent

```json
{
  "event": "$experiment_started",
  "distinct_id": "[session_id]",
  "properties": {
    "experiment_name": "Homepage CTA Test",
    "variant": "Blue button",
    "$experiment_id": "...",
    "$variant_id": "..."
  }
}
```

### Analyzing in PostHog

Use PostHog's **Experiments** feature or build a funnel in **Insights**:
1. Filter by `$experiment_started` where `experiment_name = "Your Test"`
2. Break down by `variant`
3. Add a goal event as the next step in the funnel

---

## Plausible

### Setup

Enter your Plausible **domain** (e.g. `yoursite.com`). Plausible Analytics must be set up on that domain.

### What gets sent

Koryla sends a custom event named `Experiment` with props:

```
event: Experiment
props: {
  experiment: "Homepage CTA Test",
  variant: "Blue button"
}
```

### Analyzing in Plausible

Go to your Plausible dashboard → **Goal conversions** → filter by `Experiment`.

---

## Mixpanel

### Setup

Enter your Mixpanel **Project token** (found in Project Settings → Access Keys).

### What gets sent

```json
{
  "event": "Experiment Viewed",
  "properties": {
    "distinct_id": "[session_id]",
    "token": "...",
    "experiment_id": "...",
    "experiment_name": "Homepage CTA Test",
    "variant_id": "...",
    "variant_name": "Blue button"
  }
}
```

---

## Amplitude

### Setup

Enter your Amplitude **API key** (found in Project Settings).

---

## Custom Webhook *(Growth)*

For any platform not listed above, you can configure a custom webhook URL. Koryla will `POST` a JSON payload to your URL on every new variant assignment.

### Payload

```json
{
  "event": "experiment_viewed",
  "experimentId": "...",
  "experimentName": "Homepage CTA Test",
  "variantId": "...",
  "variantName": "Blue button",
  "sessionId": "...",
  "timestamp": "2026-04-10T22:00:00Z"
}
```

### Authentication

Set a secret token in the integration settings. Koryla includes it as a header:

```
X-Koryla-Secret: your-secret-token
```

Verify this header on your server to ensure the request is coming from Koryla.

## Events fire only once per visitor

Analytics events are fired **only on new variant assignments** — not on every page view. A returning visitor who already has the `sp_` cookie will not trigger another event. This keeps your data clean and prevents inflating event counts.
