---
title: Ad Blockers Are Killing Your A/B Test Data — And You Probably Don't Know It
description: Client-side testing tools are blocked by ad blockers at rates between 20–40% of traffic. Here's what that means for your results, and how server-side testing fixes it.
date: 2026-03-05
author: Andrés Clúa
slug: ad-blockers-killing-ab-test-data
---

Ad blocker adoption has been growing for a decade. In some demographics — tech-savvy users, privacy-conscious users, younger audiences — it's above 40%. On developer-focused sites, it can reach 60–70%.

Most A/B testing tools load entirely in JavaScript, from third-party CDNs. Ad blockers don't just block ads. They block scripts from known tracking domains. Optimizely, VWO, AB Tasty — all of them appear on blocklists maintained by uBlock Origin, Privacy Badger, and Brave's built-in blocker.

## What actually happens when a user has an ad blocker

The testing library fails to load silently. The user sees the control (your original page). No impression is recorded. No assignment is made.

For your experiment, this means:

**1. Your sample is biased.** Users in the test were not randomly assigned — they were selected by whether they have a browser extension. Ad blocker users skew heavily technical, younger, and more privacy-conscious. Their behavior is systematically different from your general audience.

**2. Your conversion rates are inflated.** The users who *are* tracked tend to be less technical (they didn't install an ad blocker). If you're tracking purchases or signups, the population being measured may convert at a higher rate than your actual user base — making your numbers look better than they are.

**3. You have no idea how large the problem is.** Because the users with ad blockers are completely invisible to your client-side tool, you can't measure what you're missing.

## How to estimate your exposure

Check your analytics for the browser breakdown of your traffic. Then look for signs:

- High Brave browser usage (Brave blocks by default — no extension required)
- High Firefox usage with uBlock Origin (common in technical audiences)
- A gap between your analytics page view count and your server-side request logs — if your server served 100,000 requests but GA4 shows 72,000 sessions, you have a 28% invisible audience

For most B2B SaaS companies, the gap is between 15–35%. For developer tools, it's higher.

## Why server-side testing is immune

When the experiment logic runs on the server — in a Cloudflare Worker, a Netlify Edge Function, or Next.js middleware — there is no JavaScript to block. The request reaches your server, the variant is assigned, the response is the correct page.

Ad blockers intercept browser requests to known tracking domains. They cannot intercept server-to-server HTTP calls. The impression event that Koryla sends to GA4 goes from Koryla's server to Google's Measurement Protocol API — the browser is never involved.

The result: your experiment captures **all** your traffic, including the 30% who would have been invisible to a client-side tool.

## The double benefit

Server-side testing solves two problems at once. It eliminates the ad blocker blind spot, and it eliminates the flicker that client-side tools produce. Both problems have the same root cause: running experiment logic in the browser, where you don't control the environment.

Moving the logic to the server means you control it completely. The browser receives the final page. It doesn't need to know there was ever a choice being made.

If your product has any technical users in the audience — and most SaaS products do — this isn't a minor edge case. It's a significant portion of your traffic that your current testing tool is probably ignoring.
