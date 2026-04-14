---
title: "A/B Testing for E-commerce: Where to Start When Everything Seems Testable"
description: E-commerce sites have hundreds of testable elements. Most of them aren't worth testing yet. Here's how to prioritize ruthlessly and focus on the pages and changes that actually move revenue.
date: 2026-03-03
author: Koryla Team
slug: ab-testing-ecommerce
---

Every element of an e-commerce site can technically be A/B tested. The add-to-cart button color, the number of product images, the order of items in search results, the copy on the confirmation email. The problem isn't finding things to test — it's deciding which tests are worth running given the traffic and development cost required to run them properly.

The teams that get the most from experimentation aren't the ones running the most tests. They're the ones running tests on the right pages, with sufficient traffic, testing elements that have a realistic chance of meaningful impact.

## The pages where testing actually pays off

E-commerce has a clear hierarchy of page value, and it roughly tracks the purchase funnel.

**Product detail pages (PDPs)** are the highest-leverage testing surface for most stores. This is where purchase decisions happen. Visitors who reach a PDP have already filtered through acquisition and category browsing — they're evaluating your specific product. Small improvements to product trust signals, image presentation, or price framing at this stage compound across every order.

High-impact PDP tests:
- Product image count and order (lifestyle vs. white-background first)
- Social proof placement (reviews visible above the fold vs. below)
- Shipping and returns promise (where it appears, how prominently)
- Size/variant selector UI (dropdown vs. button grid)
- Sticky add-to-cart bar on scroll

**Cart pages** are high-intent pages with relatively low traffic — but high conversion value per session. Users who reach the cart are close to buying. Tests here tend to have large absolute impact on revenue even with modest traffic.

High-impact cart tests:
- Cross-sell placement and format (product tiles vs. "frequently bought together" list)
- Trust signals near the checkout button (security badges, guarantee text)
- Cart-level shipping threshold messaging ("Add $12 more for free shipping")
- Guest checkout prominence vs. account creation

**Checkout** is where the money is lost. The average documented checkout abandonment rate is around 70%. Even a 5% improvement in checkout completion compounds dramatically at scale.

Checkout is also technically the hardest to test — most platforms restrict what can be modified, and any test that introduces friction or bugs will directly cost revenue. Test carefully and with rollback capability.

High-impact checkout tests:
- Number of checkout steps (one-page vs. multi-step)
- Payment method prominence (PayPal/Shop Pay vs. credit card first)
- Form field order and required fields
- Order summary visibility (collapsed vs. always expanded)

## Prioritization frameworks

Two frameworks are widely used in e-commerce experimentation: ICE and PIE. Both are scoring systems for comparing test candidates. Neither is precise — they're useful for forcing structured thinking and creating prioritized backlogs, not for making exact predictions.

### ICE (Impact, Confidence, Ease)

Score each potential test on a 1–10 scale for:
- **Impact:** How much could this move the needle?
- **Confidence:** How sure are you this is actually a problem worth solving?
- **Ease:** How much development effort does this test require?

Multiply the three scores. Sort descending. Start at the top.

ICE is fast and simple. Its weakness is that "confidence" without data is really just intuition. Teams tend to overweight ease and underweight impact.

### PIE (Potential, Importance, Ease)

Similar to ICE but with slightly different axes:
- **Potential:** How much room for improvement exists? (A page converting at 1% has more potential than one at 15%)
- **Importance:** How much traffic does this page get? How much revenue does it represent?
- **Ease:** Development and design complexity

PIE tends to weight toward high-traffic, low-converting pages, which aligns well with e-commerce — the homepage gets more traffic than the cart, but the cart has a clearer path to revenue impact.

In practice: use either framework consistently. The discipline of scoring matters more than which framework you choose.

## What not to test

The biggest time sink in e-commerce experimentation is testing things that can't reach statistical significance with your traffic volume.

**Low-traffic pages:** A PDP that gets 400 visitors per month cannot support an A/B test. At a 3% conversion rate, you'd need roughly 15,000 visitors per variant to detect a 10% relative lift. That's 30,000 total visitors — more than six years of traffic. Run qualitative research on low-traffic pages instead: session recordings, user interviews, heatmaps.

**Small cosmetic changes on low-value pages:** Testing the footer layout on your FAQ page. Changing icon styles on the about page. These tests require the same sample size as meaningful tests and produce findings that rarely transfer to other pages.

**Too many variants:** A test with five variants needs five times the traffic of a two-variant test. Adding variants is seductive — "let's test red, blue, green, orange, and purple buttons" — but it spreads traffic thin and extends test duration, often indefinitely.

## Traffic requirements in practice

The sample size formula is simple but the inputs require honest estimation. For e-commerce:

- **Baseline conversion rate:** Use your actual page-level conversion rate, not site-wide conversion. A PDP converting at 4% needs fewer visitors to test than one at 0.8%.
- **Minimum detectable effect (MDE):** The smallest lift worth acting on. For high-volume SKUs, 5% relative lift might be meaningful. For long-tail products, you might only care about detecting 20%+ improvements.
- **Desired confidence:** 95% (standard), with 80% statistical power

A worked example: your main PDP converts at 3.5%, you want to detect a 10% relative lift (to 3.85%), at 95% confidence and 80% power. You need approximately 18,500 visitors per variant, or 37,000 total. If your PDP gets 5,000 visitors per week, that's a 7-week test — long enough that seasonality becomes a factor, but feasible.

If your PDP gets 800 visitors per week, that's a 46-week test. That's not a testing problem. That's a traffic problem.

## Starting your first e-commerce experiment

The highest-probability path to a meaningful first result:

1. Pick the highest-traffic page in your funnel (usually homepage or a top-category PDP)
2. Identify the element with the most friction based on session recordings or user interviews
3. Generate two or three variants that directly address that friction
4. Calculate the required sample size before building anything
5. If the test is feasible with your traffic, build it. If not, move to the next highest-traffic page.

**Practical takeaway:** Prioritize cart and PDP tests before anything else. Calculate your required sample size before building any variant. If the math says you'd need a year's worth of traffic to see a result, skip the test and invest that development time in qualitative research that informs a bigger change worth testing.
