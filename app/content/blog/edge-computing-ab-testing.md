---
title: How Edge Computing Changed A/B Testing Forever
description: For 20 years, A/B testing ran in the browser. Edge computing moved it to the network layer. Here's why that shift matters and what it enables.
date: 2026-04-05
author: Andrés Clúa
slug: edge-computing-ab-testing
---

The first generation of web A/B testing tools — Optimizely, VWO, Google Optimize — were all built on the same assumption: the browser is where the experiment runs.

That assumption made sense in 2010. The alternative was modifying server-side code for every experiment, which was slow, required developer involvement, and was hard to roll back. A JavaScript snippet on the page was an elegant shortcut.

Fifteen years later, that shortcut has become a ceiling.

## What client-side testing can't solve

The browser-based approach has three structural problems that can't be engineered away — only worked around:

**Flicker.** The page loads, the original content renders, then the script swaps in the variant. The gap between render and swap is visible. Tools like Optimizely work around it by hiding the entire page (`body { opacity: 0 }`) until the variant is applied. This prevents the visual flash but creates a blank-page experience that measurably hurts performance scores.

**Blockability.** Browser extensions can identify and block any JavaScript from known tracking domains. Major ad blockers maintain lists of Optimizely, VWO, and similar CDN URLs. When blocked, the user sees the control. No impression is recorded. Your sample excludes every user with an ad blocker — which on some audiences exceeds 40%.

**Performance cost.** A typical client-side testing library is 80–150KB. It executes synchronously or near-synchronously on page load. On mobile, on slow connections, in competitive markets where every millisecond affects conversion, this is a cost with no offsetting benefit for users.

## What edge computing makes possible

An edge network is a global set of servers — Cloudflare's network has over 300 points of presence — that sit between the visitor and your origin server. Every HTTP request passes through one of these nodes, which are typically within 20–50ms of the visitor.

Running A/B test logic at the edge means:

- **The variant is assigned before any HTML is generated.** No flicker is possible because the browser never sees the original content. It receives the variant from the first byte.
- **No JavaScript is involved.** The browser executes nothing to participate in the experiment. Ad blockers have nothing to intercept.
- **The performance cost is ~0ms.** The experiment logic runs in ~1ms at the edge node. The browser doesn't know it happened.

The request reaches the edge, is assigned to a variant, and the edge fetches the correct content from your origin. The browser receives the final page with no intermediate states.

## What this unlocks for teams

**Experimentation becomes infrastructure, not overhead.** When the experiment layer is decoupled from your codebase, you can run experiments on any page without a deploy. Create an experiment in your dashboard, define the variant URL, and traffic starts splitting within 60 seconds.

**More accurate data.** Because all users are captured (including ad blocker users), conversion rates reflect your actual audience. Results are comparable across device types and technical sophistication levels.

**Larger scope of testable changes.** Client-side tools are effectively limited to DOM manipulation — changing text, colors, images, element visibility. Edge-based experiments can route to entirely different pages, built with different frameworks, deployed on different infrastructure. The variant page doesn't need to be related to the control page in any technical sense.

## The current state

The tooling is young. Cloudflare Workers, Netlify Edge Functions, and Vercel Edge Middleware all shipped in the last four years. The testing tools built on top of them — including Koryla — are early.

But the underlying infrastructure is mature and runs at global scale. Cloudflare's network processes 46 million HTTP requests per second. Netlify's edge functions run in Deno on V8 isolates. The primitives are production-grade.

What's still being figured out: developer experience, non-technical user interfaces, and pricing models. Those are solvable problems. The hard part — building a reliable, high-performance global edge network — was solved by others.

A/B testing at the edge isn't the future of experimentation. It's the present. It just hasn't been fully packaged yet.
