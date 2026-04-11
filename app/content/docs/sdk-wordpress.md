---
title: WordPress
description: A/B test WordPress pages with the Koryla plugin. No npm, no build step — install and configure from the WP admin.
section: SDK
slug: sdk-wordpress
---

# WordPress

The Koryla WordPress plugin handles traffic splitting server-side using PHP — no npm, no build step, no JavaScript in the browser.

---

## How it works

1. Plugin fetches your active experiments from the Koryla API (cached in WP transients for 5 minutes)
2. On each page request, it checks `$_COOKIE` for a `ky_{experimentId}` cookie
3. If no cookie → weighted random assignment → sets cookie via `setcookie()`
4. If the assigned variant is not the control → `wp_redirect()` to the variant URL

Everything runs in PHP during `template_redirect`, before WordPress renders the page.

---

## Install

**Manual:**

1. Download `koryla.php` from the [Koryla repo](https://github.com/andresclua/koryla/tree/main/plugin)
2. Place it in `/wp-content/plugins/koryla/koryla.php`
3. Go to **WordPress Admin → Plugins → Installed Plugins**
4. Activate **Koryla**

> **WordPress.org listing** coming soon. For now, install manually.

---

## Configure

1. Go to **WP Admin → Koryla**
2. Paste your API key (`sk_live_...` from Koryla Dashboard → Settings → API Keys)
3. Click **Save Settings**

Your active experiments will appear in the panel below the settings form.

---

## Create variants in WordPress

The plugin relies on variant URLs existing as real WordPress pages or custom routes. Typical setup:

| Page | URL | Role |
|---|---|---|
| Original homepage | `/` | Control |
| Variant homepage | `/homepage-v2` | Variant B |

Create the variant page in WordPress normally (or as a custom template), set it to `draft` or `private` if you don't want it discoverable via the sitemap. The plugin redirects to it server-side regardless of its publish status.

> **Tip:** To hide variant pages from search engines, add `noindex` to the variant page's SEO settings (Yoast / RankMath / etc.).

---

## Verify it's working

Visit your homepage in an incognito window. Open **DevTools → Application → Cookies** — you should see a `ky_{experimentId}` cookie set by the server.

Clear the cookie and reload several times to confirm traffic is being split between your variants.

---

## Limitations vs edge approach

| | WordPress plugin | Cloudflare Worker / Netlify Edge |
|---|---|---|
| Redirect visible to browser | Yes (302) | No (transparent rewrite) |
| Runs in | PHP / app server | CDN edge (Cloudflare / Netlify) |
| Latency | ~1ms in-process | ~0ms (edge, before origin) |
| SEO impact | Minimal (same-session redirect) | None |

For large sites where SEO and performance are critical, pair the WordPress plugin with a Cloudflare Worker for the full edge approach.
