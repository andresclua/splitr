---
title: How to Run Your First A/B Test Without Bothering a Developer
description: Most A/B testing setups require engineering time. Here's how to run real experiments — without a ticket queue.
date: 2026-02-20
author: Andrés Clúa
slug: ab-testing-without-developer
---

The biggest bottleneck in most CRO programs isn't ideas. It's implementation. A marketer has a hypothesis, writes a brief, waits two weeks for an engineer to have capacity, and by then the experiment feels stale.

There's a better way.

## What you actually need

To run an A/B test, you need three things:

1. **Two versions of a page** — the original and the variant
2. **A way to split traffic** between them
3. **A way to measure which one converts better**

Most tools conflate these. They give you a visual editor (for #1), proprietary traffic splitting (for #2), and a locked-in dashboard (for #3). The price is usually flicker, slow pages, and data you can't export.

Let's break each one down separately.

## Creating the variant page

For a Netlify or Astro site: duplicate the page file, make your changes, and deploy it at a different URL. If your homepage is `/`, your variant lives at `/homepage-v2`. This takes 10 minutes.

For WordPress: duplicate the page in the admin, make changes, set it to private (so it's not indexed). Five minutes.

For Next.js: add a new route. The variant page is just another file in your `app/` directory.

You're not building anything complex. It's a copy of a page with one or two things changed.

## Splitting the traffic

With Koryla, you add an experiment in the dashboard:

1. Set **Base URL** to `/` (your original page)
2. Set **Variant URL** to `/homepage-v2`
3. Set the traffic split (50/50 to start)
4. Hit **Start**

The edge function — already running on your domain — picks this up within 60 seconds (config refresh interval). No deploys, no code changes.

From that point, every new visitor is randomly assigned to one version. The assignment is stored in a cookie so they see the same variant on every return visit.

## Measuring the result

Define a conversion URL — the page a visitor lands on after completing the goal. For signups, that's usually `/thank-you` or `/dashboard`. For purchases, it's the order confirmation page.

Koryla tracks when a visitor who was assigned to an experiment reaches that URL and sends the event to your analytics stack automatically. You can see it in GA4 as a custom event, in PostHog, or in the Koryla dashboard.

No custom event code. No GTM tags. No waiting for engineering.

## What you can do yourself

- Changing headline copy → yes
- Changing button text or color → yes
- Adding or removing social proof → yes
- Reordering sections → yes
- Changing the form → yes
- Complete redesign → you might want a developer for the CSS

The threshold for needing engineering help is higher than most teams realize. If you can make the change in a page editor or by editing a template file, you can run the test yourself.

## The one thing to get right

Keep your variant focused. One change per test. If you change the headline, the button, and the image at the same time, you'll know which *combination* won — but not which element drove the result. You can't apply that learning to the next test.

One change. Two pages. Let it run for two weeks. Read the result. Ship or discard.

That's the whole process.
