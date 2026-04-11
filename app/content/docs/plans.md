---
title: Plans & Limits
description: What's included in each Koryla plan and what happens when you hit a limit.
section: Account
slug: plans
---

# Plans & Limits

Koryla offers three plans. All plans include the core A/B testing infrastructure — the Worker, KV caching, and sticky sessions.

## Plan comparison

| Feature | Free | Starter | Growth |
|---|---|---|---|
| **Price** | $0/mo | $29/mo | $79/mo |
| **Active experiments** | 100 | 3 | 10 |
| **Monthly visits** | 10,000 | 50,000 | 500,000 |
| **Workspaces** | 1 | 1 | 3 |
| **Multivariate testing** | ✗ | ✗ | ✓ |
| **Webhooks** | ✗ | ✗ | ✓ |
| **Analytics destinations** | None | GA4, Plausible | All platforms |
| **Support** | Community | Email | Email |
| **Koryla branding** | Shown | Hidden | Hidden |

Yearly billing saves 17% (equivalent to ~2 months free).

## Free plan

The free plan is generous for small sites and personal projects. You get 100 active experiments and 10,000 monthly visits — enough for a solo developer to run meaningful tests.

There's no credit card required and no time limit. The free plan doesn't expire.

**Limitations:**
- No analytics integrations (you can still use the Worker and track events manually)
- Koryla branding may appear in certain contexts
- No multivariate testing

## Starter plan

For small teams and growing products. Includes GA4 and Plausible integration, so you can analyze results in your existing analytics setup.

**Best for:** SaaS products, e-commerce stores, marketing sites with moderate traffic.

## Growth plan

For larger teams running continuous experimentation. Includes all analytics integrations, webhooks for custom pipelines, multivariate testing, and support for 3 workspaces.

**Best for:** Teams with dedicated growth or product functions, high-traffic sites.

## What counts as a "visit"?

A visit is counted when the Worker assigns a visitor to an experiment variant for the first time. Returning visitors (those with the `sp_` cookie) are **not** counted again, even if they visit multiple pages.

In practice, the visit count ≈ the number of unique new visitors to pages covered by your active experiments.

## What happens when you hit the limit?

If you exceed your monthly visit limit, the Worker will continue to serve experiments — **we don't cut off your traffic**. However:

- You'll receive an email notification
- Your dashboard will show an overage warning
- Continued overages may result in an automatic plan upgrade to the next tier

We'll always contact you before charging anything extra.

## Changing plans

You can upgrade or downgrade at any time from **Dashboard → Billing**.

- **Upgrades** take effect immediately
- **Downgrades** take effect at the end of the current billing period
- **Cancellations** take effect at the end of the current billing period — you keep access until then

## Workspaces across plans

Each workspace is billed separately based on the plan you choose for it. If you're on the Growth plan, you can have up to 3 workspaces — each with its own experiments, API keys and settings.

Team members can be invited to a workspace from **Settings → Members**. Members don't consume extra billing slots — you pay per workspace, not per user.

## Questions?

If you need a custom plan (higher visit limits, more workspaces, white-label), reach out at [hello@koryla.io](mailto:hello@koryla.io).
