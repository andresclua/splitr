---
title: The Flicker Effect — Why It Happens, What It Costs, and How to Eliminate It
description: The flicker effect is the most visible symptom of client-side A/B testing. It also biases your results in ways most teams don't account for.
date: 2026-04-08
author: Andrés Clúa
slug: flicker-effect-ab-testing
---

If you've ever loaded a page and briefly seen one version before it snapped to another — you've experienced the flicker effect. It's the signature of a client-side A/B test running on a slow connection or a cold cache.

It looks like a bug. It feels like a bug. It isn't one — it's a structural limitation of how browser-based testing tools work. But it behaves like a bug, and it costs you in ways that aren't obvious from a dashboard.

## Why flicker happens

Client-side testing tools load as JavaScript on your page. The sequence of events:

1. Browser requests the page from your server
2. Server returns HTML including the testing library script tag
3. Browser begins rendering the page — the original content starts appearing
4. Script loads, executes, identifies the user's variant assignment (or makes an API call to get it)
5. Script modifies the DOM — swaps content, changes styles, hides elements
6. The variant version is now visible

The gap between steps 3 and 5 is the flicker. On a fast connection with a warm cache, it's 20–50ms — barely perceptible. On a slow mobile connection or first visit, it can be 200–500ms. Visible. Jarring. Bad.

## How tools try to hide it

The standard workaround: add a "pre-hide snippet" to the `<head>` of your page — a blocking script that sets `body { opacity: 0 }` as early as possible, then removes the style once the variant is applied.

This prevents the visual flash. It doesn't eliminate the underlying problem — it just trades one bad experience for a slightly different one. Users see a blank white page instead of a flicker. On slow connections, this blank period is measurable: typically 1.5–4 seconds before the page appears.

Google's Core Web Vitals measure this. The Largest Contentful Paint metric — how long until the main visible content appears — is directly penalized by the pre-hide approach. A/B testing tool on a page can easily add 1–2 seconds to LCP.

## What flicker does to your results

The performance impact of flicker isn't just a UX annoyance — it biases your experiment data.

**Variant B gets an unfair penalty.** When a new variant is shown for the first time (cold cache, no prior cookie), the flicker or blank period is longer. Users assigned to Variant B on their first visit experience a slower-feeling page. This depresses Variant B's conversion rate independently of whether the design is better.

**Results are inflated for returning visitors.** Users who return with a warm cache and an existing variant cookie don't experience the flicker. Their conversion rates are higher, and they're systematically assigned to the same variant — meaning your "winning" variant may just be the one that benefited more from return visit behavior.

**Mobile users are disproportionately affected.** Slower connections, less CPU for JavaScript execution, more sensitive to performance degradation. If your mobile conversion rate is low, some portion of that may be your testing tool's footprint, not your design.

## The only real fix

Eliminate the browser-side test logic. Move variant assignment to before the HTML is generated.

With a server-side approach:

1. Request arrives at the edge (Cloudflare Worker, Netlify Edge Function, Next.js middleware)
2. Variant is assigned based on cookie or random weighted selection
3. Edge fetches the correct variant page from origin
4. Browser receives the final page — no original content, no swap, no flicker

There's nothing to hide because the browser never saw the original. The pre-hide snippet isn't needed. LCP is unaffected.

## Measuring the improvement

If you migrate from a client-side tool to server-side testing, you'll see:

- **LCP improvement** — typically 1–2 seconds on pages with the pre-hide snippet
- **Conversion rate normalization** — especially on mobile and first-visit traffic
- **More consistent results** — the "novelty effect" from flicker on first visits stops distorting early experiment data

The cleaner your measurement environment, the more you can trust your results. Eliminating flicker isn't just a performance improvement — it's a data quality improvement.
