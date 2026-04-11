---
title: Variants
description: How to set up A/B and multivariate test variants, traffic weights and URL rewriting.
section: Core Concepts
slug: variants
---

# Variants

A variant is one version of the page being tested. Every experiment has at least two variants: a **control** (the original) and one or more **challengers**.

## A/B vs multivariate

### A/B test
The simplest form — two variants, one change at a time.

```
50% → Control    (/pricing)
50% → Variant A  (/pricing-v2)
```

Best for testing big changes where you want a clear winner.

### A/B/n test (multi-variant)
Three or more variants tested simultaneously.

```
34% → Control     (/pricing)
33% → Variant A   (/pricing-v2)
33% → Variant B   (/pricing-v3)
```

Useful when you have multiple ideas and want to test them in one go. Requires more traffic to reach significance.

### Multivariate test *(Growth plan)*
Tests combinations of changes across multiple elements simultaneously. Requires more sophisticated setup and significantly more traffic.

## Setting up variants

Each variant has three fields:

### Name
Internal label — e.g. "Control", "Blue button", "New headline". Used in analytics events.

### Target URL
The URL path your server should serve for this variant. For the control, this is the same as the base URL. For challengers, point to the alternate version:

```
Experiment base URL:  /landing
Control target:       /landing       (no rewrite)
Variant A target:     /landing-new   (rewritten)
```

> The target page must already exist on your site. If the target URL returns a 404, visitors assigned to that variant will see a 404.

### Traffic weight
A relative number determining what percentage of new visitors see this variant. Koryla normalizes weights automatically:

| Weights | Control % | Variant A % |
|---|---|---|
| 50 / 50 | 50% | 50% |
| 80 / 20 | 80% | 20% |
| 1 / 1 | 50% | 50% |
| 100 / 0 | 100% | 0% |

Setting a variant's weight to `0` effectively disables it without deleting it — useful if you want to pause a specific variant without stopping the whole experiment.

## The control variant

The control is special:
- It represents the current version of your page (the baseline)
- Its metrics are what you compare challengers against
- If the experiment has no clear winner, you keep the control
- The control's target URL should match the experiment's base URL (so requests aren't rewritten)

## URL rewriting in practice

When a visitor is assigned to Variant A, the Worker rewrites the URL **server-side** before the response is sent. From the visitor's perspective:

- They requested `/pricing`
- The URL in their browser still shows `/pricing`
- But the page they received came from `/pricing-v2` on your server

This means:
- ✓ No redirect, no extra network round-trip
- ✓ No URL change visible to the user
- ✓ SEO-safe — only one canonical URL
- ✓ Works with any server-side framework

## Sticky assignments

Once assigned to a variant, a visitor always sees that variant. The assignment is stored in a cookie:

```
sp_{experimentId} = {variantId}
```

The cookie is set for **30 days** at `Path=/`. If you clear cookies or use incognito mode, a new variant is randomly assigned.

## Is the control variant
Each variant has an `is_control` flag. This is used to distinguish the control in analytics events and reporting. Set it on the variant that represents your original page.

## Minimum traffic requirements

As a rough guide:

| Type | Minimum conversions per variant |
|---|---|
| A/B (2 variants) | ~100–200 |
| A/B/n (3 variants) | ~200–400 per variant |
| Multivariate | Much higher — depends on factor combinations |

For low-traffic sites, stick to A/B tests and be patient. Running a test for less than a week or stopping it early when one variant is ahead is the #1 cause of misleading results.
