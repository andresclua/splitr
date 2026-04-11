---
title: A/B Testing for WordPress — A Complete Guide for 2026
description: WordPress powers 43% of the web. Here's how to run proper A/B tests on a WordPress site without slowing it down or breaking your SEO.
date: 2026-03-28
author: Andrés Clúa
slug: ab-testing-wordpress-guide
---

WordPress is the most A/B-tested platform on the internet, and also the one most likely to be doing it wrong. The combination of plugin-heavy setups, shared hosting, and client-side testing tools creates a perfect environment for slow, biased, flickering experiments.

Here's how to do it right.

## The WordPress A/B testing landscape

Most WordPress A/B testing happens through one of three approaches:

**1. Client-side plugins** (Nelio A/B Testing, Google Optimize integrations, VWO with GTM) — these inject JavaScript into your page that hides content, applies the variant, and reveals the page. On a WordPress site that's already loading 15 plugins, the performance cost is significant. And as discussed elsewhere, they're blocked by ad blockers.

**2. Page builder variants** — some builders like Elementor Pro have split testing built in. The same client-side problems apply, plus you're locked into that builder's data model.

**3. Server-side** — the variant assignment happens in PHP or at the edge, before content is sent to the browser. No flicker, no JavaScript dependency. This is the correct approach.

## Option 1 — Koryla WordPress plugin (server-side, no npm)

The Koryla PHP plugin handles splitting in the `template_redirect` hook — one of the earliest points in WordPress's request lifecycle, before any output has been sent.

**How it works:**
1. Plugin fetches your active experiments from the Koryla API (cached in WP transients for 5 minutes)
2. For each request, it reads the visitor's `ky_{experimentId}` cookie
3. If no cookie → randomly assigns a variant → sets cookie
4. If the assigned variant is not the control → `wp_redirect()` to the variant page

**Setup:**
1. Download `koryla.php` from [github.com/andresclua/koryla](https://github.com/andresclua/koryla)
2. Add to `/wp-content/plugins/koryla/koryla.php`
3. Activate in **Plugins → Installed Plugins**
4. Go to **Koryla** in the admin menu, paste your API key

**Creating variants:**
- Create the variant as a standard WordPress page (you can set it to private)
- In Koryla dashboard, create an experiment with Base URL `/your-page` and Variant URL `/your-page-v2`
- Start the experiment — traffic splits immediately

No code changes to your theme. No additional plugins. The variant page is a regular WordPress page.

## Option 2 — Cloudflare Worker (edge, any stack)

If your WordPress site has DNS routed through Cloudflare, you can run the Koryla Worker in front of your site. This is faster than the PHP approach because the request never hits your server — the Worker handles assignment at Cloudflare's edge.

This is especially valuable for high-traffic sites where PHP execution time is a concern. See [Worker Setup →](/docs/worker-setup).

## WordPress-specific considerations

**SEO impact of redirects**

The PHP plugin uses `wp_redirect()` with a 302 (temporary) status code. Google does not index 302 redirects as permanent — they follow the redirect but attribute the content to the original URL. This means your variant pages won't compete with your control in search results.

To be safe, add a `noindex` meta tag to variant pages using your SEO plugin (Yoast, RankMath, etc.). This prevents them from being indexed independently.

**Caching**

WordPress caching plugins (WP Rocket, W3 Total Cache, LiteSpeed Cache) can interfere with variant assignment if they serve cached responses before PHP runs. 

Configure your caching plugin to **exclude pages with the `ky_` cookie** from the cache. Most plugins support cookie-based cache exclusion rules. Alternatively, exclude your experiment URLs from the cache entirely.

**Multisite**

The Koryla plugin works with WordPress Multisite. Use a different API key per site (different workspace per domain) so analytics are separated.

## Measuring results in WordPress

The conversion URL approach works the same as any other platform. Set `/thank-you` or `/order-received` as your conversion URL in the Koryla dashboard. The edge function (or worker) detects when a visitor who was assigned to an experiment reaches that URL and fires the conversion event.

Results appear in your Koryla dashboard and in GA4 or PostHog if you've connected them.

## The one mistake to avoid

Don't use the same page as both control and variant. The control is your original page at its original URL. The variant is a copy at a new URL. They need to be two separate pages, or the redirect logic has nothing to redirect to.

Make the copy, change the one thing you're testing, set the variant URL in the dashboard, and go.
