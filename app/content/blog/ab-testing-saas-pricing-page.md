---
title: How to A/B Test Your SaaS Pricing Page (And What to Actually Test)
description: The pricing page is the highest-leverage page on most SaaS sites. Here's a systematic approach to testing it without destroying trust or confusing users.
date: 2026-04-10
author: Andrés Clúa
slug: ab-testing-saas-pricing-page
---

The pricing page converts more decisions than any other page on your site. A 10% improvement in pricing page conversion has an outsized impact on revenue compared to the same lift on a blog post or a feature page.

It's also the most sensitive page to test carelessly. Get it wrong and you confuse users, create trust issues, or accidentally A/B test your way into a pricing model that doesn't support your unit economics.

Here's how to do it systematically.

## What's actually worth testing

**Pricing structure — highest impact, highest risk**

- Annual vs monthly default (showing annual saves users money; showing monthly lowers the apparent price)
- Free trial length (7 days vs 14 days vs 30 days)
- Freemium tier vs no free tier
- Number of plans (2 vs 3 vs 4)

These changes can produce 20–40% conversion lifts. They also require more careful analysis — specifically, checking that revenue per customer doesn't drop as conversion goes up.

**Plan naming and framing — medium impact**

- "Starter / Growth / Enterprise" vs "Basic / Pro / Business" vs feature-based names ("Essentials / Scale / Custom")
- Highlighting different plans as "Most popular"
- Anchoring with a high-end plan to make the middle plan look reasonable

**Feature comparison table — medium impact**

- Checkmarks vs prose descriptions
- Which features to surface vs hide in the table
- Order of features (users scan top to bottom; put differentiating features at the top)

**CTA copy — lower impact but easy to test**

- "Get started" vs "Start free trial" vs "Try for free" vs "Start building"
- Button color (within your brand palette)
- Presence/absence of "No credit card required"

## The measurement setup

Pricing pages have a complication: the conversion event isn't "clicked CTA" — it's "completed signup" or "started trial." These are downstream events that happen on a different page, potentially minutes later.

Make sure your experiment is configured to track the correct conversion URL — your post-signup confirmation page or first login page, not just the pricing page CTA click.

Also define a secondary guardrail metric: **average revenue per new customer** (or average plan selected). A variant that increases trials but pushes everyone toward your lowest plan may not be an improvement.

## Segment your results

Pricing page visitors are not uniform. Segment your analysis by:

- **Traffic source** — organic vs paid vs direct vs referral. Paid visitors arrived with purchase intent; organic visitors may be early-stage researchers. The same pricing page change can produce opposite results in these segments.
- **First visit vs return visit** — users who are seeing your pricing page for the first time vs those who are returning after initial research
- **Device** — mobile users tend to convert differently on pricing pages; table layouts collapse awkwardly at small sizes

Don't run different tests per segment (that's multivariate territory and requires more traffic). But do check segment breakdown when reading results — an aggregate win that's driven entirely by one segment tells you something different than a broad win.

## What not to test

**Prices themselves** — this is legally murky in many jurisdictions (especially EU, where price discrimination based on user characteristics can violate consumer protection law). It also creates support headaches when users compare notes. Run pricing changes as product decisions, not A/B tests.

**Removing trust signals** — don't test "what happens if we remove the money-back guarantee mention." Trust signals typically have small individual impact and large combined effect. Test adding them; be cautious about removing.

**Structural redesigns** — testing a completely new layout vs your current one tells you which is better today but doesn't tell you why. If the redesign wins, you don't know which element drove it. Test structural changes as product releases after you've mined the smaller elements.

## Running the test

Set up two pages: your current pricing page at `/pricing`, and your variant at `/pricing-v2`. In Koryla, create an experiment with:

- Base URL: `/pricing`
- Variant URL: `/pricing-v2`
- Conversion URL: `/dashboard` or `/welcome` or wherever users land after completing signup
- Traffic split: 50/50

Let it run for a minimum of two full billing cycles — user decision velocity on pricing pages is slower than on content pages.

Read the result. Ship the winner. Run the next test.

The pricing page is never done. It's a compounding asset.
