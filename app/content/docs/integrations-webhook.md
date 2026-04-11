---
title: Custom Webhook
description: Receive Koryla experiment events as JSON POST requests — forward to any platform or internal system.
section: Integrations
slug: integrations-webhook
---

# Custom Webhook

For any platform not listed, or to send experiment data to your own backend, configure a custom webhook. Koryla will `POST` a JSON payload to your URL on every new variant assignment.

## Setup

1. Create an endpoint on your server that accepts `POST` requests with a JSON body.
2. In **Dashboard → Integrations → Custom Webhook**, enter your endpoint URL and an optional secret token.
3. Toggle it on.

## Payload

```json
{
  "event": "experiment_viewed",
  "experimentId": "a1b2c3...",
  "experimentName": "Homepage CTA Test",
  "variantId": "x9y8z7...",
  "variantName": "Blue button",
  "sessionId": "ky-session-uuid",
  "timestamp": "2026-04-10T22:00:00Z"
}
```

## Verifying the signature

If you set a secret token, Koryla includes it in every request as a header:

```
X-Koryla-Secret: your-secret-token
```

Always verify this on your server before processing the payload:

```ts
// Example — Express.js
app.post('/koryla-webhook', (req, res) => {
  const secret = req.headers['x-koryla-secret']
  if (secret !== process.env.KORYLA_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  // process req.body ...
  res.sendStatus(200)
})
```

## Common use cases

- **Segment / RudderStack** — forward events to your CDP for downstream enrichment
- **Internal databases** — record experiment assignments in your own data warehouse
- **Slack / Discord alerts** — notify your team when experiment traffic crosses a threshold
- **Customer data platforms** — attach experiment context to user profiles before it reaches your analytics tool

## Notes

- Koryla expects a `2xx` response within 10 seconds. If your endpoint is slow or returns an error, the event is dropped (not retried).
- Events fire once per visitor per experiment.
- The webhook fires in a `waitUntil` context — it never blocks the visitor's page load.
