# Phase 09 — Stripe Billing

## Overview

Implements full Stripe billing integration for Koryla: checkout sessions, billing portal, and webhook handling. Users can upgrade their workspace to Starter or Growth plans via a Stripe-hosted checkout flow, manage their subscription through the Stripe billing portal, and the system automatically reflects subscription changes (upgrades, downgrades, cancellations) via webhooks.

The billing page lives at `/dashboard/[slug]/billing` and includes a monthly/yearly price toggle, per-plan upgrade cards, and a "Manage billing" button for existing subscribers.

---

## Why

**Stripe Checkout over custom payment form:** Stripe Checkout handles PCI compliance, SCA/3DS, card validation, and localization. Building a custom payment form would require significant ongoing maintenance for no user-facing benefit.

**Stripe customer saved to workspace:** Stripe customer IDs are created once on first checkout and persisted in the `workspaces` table (`stripe_customer_id`). This ensures returning customers are recognized by Stripe (preventing duplicate customer records), and enables the billing portal flow which requires a customer ID.

**Hardcoded price IDs in `plans.ts`:** Price IDs (`price_1...`) are not secret — they are safe to ship in client-side code. Storing them as env vars would add deployment complexity with no security benefit and no practical difference between environments (unlike API keys, price IDs do not differ between staging and production in a typical Stripe setup).

**Webhook for subscription state:** Rather than polling Stripe or relying solely on checkout session completion, webhooks handle all subscription lifecycle events (`updated`, `deleted`). This keeps the database accurate across renewals, plan changes, and cancellations initiated through the billing portal.

---

## What Was Built

### `app/server/utils/stripe.ts`

Singleton factory `getStripe()` that instantiates the Stripe Node SDK using `STRIPE_SECRET_KEY` from the runtime environment. Returns the same instance across requests.

### `app/server/api/billing/checkout.post.ts`

Creates a Stripe Checkout Session for upgrading a workspace:

- Reads `priceId` and `workspaceSlug` from the request body.
- Looks up (or creates) a Stripe customer for the workspace. Saves the `stripe_customer_id` back to the `workspaces` row on first checkout.
- Creates a `subscription`-mode Checkout Session with `success_url` pointing back to the billing page with `?success=1`.
- Returns the session URL for client-side redirect.

### `app/server/api/billing/portal.post.ts`

Creates a Stripe Billing Portal session:

- Reads `workspaceSlug` from the request body.
- Looks up the workspace's `stripe_customer_id`.
- Creates a portal session with a `return_url` pointing back to the billing page.
- Returns the portal URL for client-side redirect.

### `app/server/api/billing/webhook.post.ts`

Handles incoming Stripe webhook events:

- Uses `readRawBody(event)` (not `readBody`) to preserve the raw request body required for signature verification.
- Verifies the `stripe-signature` header against `STRIPE_WEBHOOK_SECRET` using `stripe.webhooks.constructEvent()`.
- Handles three event types:
  - `checkout.session.completed` — sets `plan` and `stripe_subscription_id` on the workspace.
  - `customer.subscription.updated` — updates `plan` based on the current price ID; handles downgrades and plan switches.
  - `customer.subscription.deleted` — resets the workspace to the Free plan.

### `app/pages/dashboard/[slug]/billing.vue`

Billing dashboard page:

- Monthly/yearly billing toggle with computed price display.
- Upgrade cards for Starter and Growth plans, each showing included features.
- "Upgrade" button calls `POST /api/billing/checkout` and redirects to the returned Stripe Checkout URL.
- "Manage billing" button (shown when a paid plan is active) calls `POST /api/billing/portal` and redirects to the Stripe Billing Portal.
- Detects `?success=1` in the URL on mount and shows a success toast.

### `app/lib/plans.ts`

Updated with:

- `STRIPE_PRICES` object mapping plan/period combinations to Stripe price IDs (hardcoded, not env vars).
- Free plan updated to 100 experiments and 10,000 visits/month.

**Plan definitions:**

| Plan    | Monthly | Yearly | Experiments | Visits/month |
|---------|---------|--------|-------------|--------------|
| Free    | —       | —      | 100         | 10k          |
| Starter | $29     | $290   | 3           | 50k          |
| Growth  | $79     | $790   | 10          | 500k         |

---

## Key Decisions

**Price IDs in code, not env vars:** `STRIPE_PRICES` in `plans.ts` contains the four Stripe price IDs directly. Price IDs are not credentials — they are safe to expose in client-side bundles. Hardcoding them avoids four additional env vars on Netlify and eliminates a class of deployment errors ("forgot to set STRIPE_PRICE_STARTER_MONTHLY on the new environment").

**Stripe customer reuse via `stripe_customer_id` on workspace:** On first checkout, a Stripe customer is created (or looked up by email) and the resulting `stripe_customer_id` is written to the workspace row. All subsequent checkouts and portal sessions reuse this ID. This prevents Stripe from accumulating multiple customers for the same workspace and ensures subscription history is consolidated.

**`readRawBody` for webhook endpoint:** Stripe signature verification requires the exact raw bytes of the request body. Nuxt's standard `readBody` parses the body as JSON, which may alter whitespace or key ordering and break the HMAC signature check. The webhook handler must call `readRawBody(event)` explicitly.

**`STRIPE_WEBHOOK_SECRET` is separate from `STRIPE_SECRET_KEY`:** The signing secret (`whsec_...`) is generated per webhook endpoint in the Stripe Dashboard. It is not the API key. Each environment (production, local Stripe CLI) has a different signing secret.

**Agency plan deferred:** The Agency plan is defined in `plans.ts` but no Stripe product or price has been created for it yet. The webhook handler maps price IDs to plan names — adding Agency later requires only creating the Stripe product and inserting its price IDs into `STRIPE_PRICES`, with no structural code changes.

---

## How to Reproduce

1. **Create Stripe products.** In the Stripe Dashboard, create two products: "Koryla Starter" and "Koryla Growth". For each product, add two recurring prices: one monthly (USD) and one yearly (USD), matching the amounts in the plan definitions above.

2. **Copy price IDs into `app/lib/plans.ts`.** After creating each price, copy its `price_1...` ID into the `STRIPE_PRICES` object:
   ```ts
   export const STRIPE_PRICES = {
     starter_monthly: 'price_1...',
     starter_yearly:  'price_1...',
     growth_monthly:  'price_1...',
     growth_yearly:   'price_1...',
   }
   ```
   These are not secret and do not need to be env vars.

3. **Add Stripe secret key to Netlify.** Get the secret key (`sk_live_...` or `sk_test_...`) from Stripe Dashboard → Developers → API keys. Add it to Netlify as `STRIPE_SECRET_KEY`.

4. **Create a webhook endpoint in Stripe.** Go to Stripe Dashboard → Developers → Webhooks → Add destination:
   - URL: `https://koryla-dev.netlify.app/api/billing/webhook`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`

5. **Copy the signing secret to Netlify.** After creating the webhook endpoint, reveal the signing secret (`whsec_...`) and add it to Netlify as `STRIPE_WEBHOOK_SECRET`. This is endpoint-specific — it is not the API key.

6. **Remove any `STRIPE_PRICE_*` env vars from Netlify** if they exist from a previous approach. Price IDs now live in `plans.ts`.

7. **For local testing**, use the Stripe CLI to forward events to the local dev server:
   ```bash
   stripe listen --forward-to localhost:3000/api/billing/webhook
   ```
   The CLI will print a local signing secret (`whsec_...`). Set this as `STRIPE_WEBHOOK_SECRET` in your `.env` for local development (different from the production webhook secret).

---

## Known Issues / Gotchas

**`readRawBody` vs `readBody` in the webhook handler.** If the webhook handler ever gets refactored to use `readBody`, Stripe signature verification will fail with a `WebhookSignatureVerificationError`. The raw body must be passed to `stripe.webhooks.constructEvent()` as-is. Do not parse the body before verification.

**`STRIPE_WEBHOOK_SECRET` is not the API key.** A common mistake is using the `sk_...` API key as the webhook secret. The signing secret is the `whsec_...` value shown on the specific webhook endpoint page in the Stripe Dashboard. Each webhook destination has its own signing secret.

**Local vs production signing secrets differ.** The `whsec_...` from the Stripe CLI (`stripe listen`) is different from the one in the Stripe Dashboard webhook endpoint. If you copy the production secret into `.env`, local webhook forwarding will fail signature verification (and vice versa).

**Checkout success relies on `?success=1` query param.** The success toast on the billing page triggers by detecting `?success=1` in the URL. If the `success_url` in the checkout session is ever changed, the toast will stop appearing. The `stripe_customer_id` and plan are set by the webhook, not by detecting this param — the toast is purely cosmetic.

**Subscription state is set by webhook, not checkout redirect.** The workspace plan is not updated at the moment the user lands on `?success=1`. It is updated when Stripe delivers the `checkout.session.completed` webhook event, which may arrive slightly after the redirect. In practice the delay is under a second, but avoid adding logic that reads the updated plan immediately after redirect.

**Agency plan has no Stripe product.** The Agency plan is defined in the frontend but cannot be purchased — there are no Stripe price IDs for it. If shown on the billing page, the upgrade button will fail. Keep the Agency plan card hidden or disabled until Stripe products are created and price IDs are added to `STRIPE_PRICES`.
