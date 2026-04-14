---
title: How to Run A/B Tests on Astro Sites
description: Astro's static-first output makes client-side A/B testing awkward and flicker-prone. Edge middleware and the Koryla Astro SDK give you a clean path to proper experiments without touching your build pipeline.
date: 2025-12-16
author: Koryla Team
slug: ab-testing-astro-sites
---

Astro is genuinely good at what it does: shipping fast, content-heavy sites with minimal JavaScript. But that strength creates a specific problem for A/B testing. Most testing tools assume a runtime environment where you can intercept requests, evaluate user segments, and serve different responses dynamically. Astro's default output is static HTML files. Those two realities don't fit together well.

Here's how to think about the problem — and what actually works.

## The rendering model matters

Astro supports three output modes: `static` (default), `server`, and `hybrid`. In static mode, all pages are pre-rendered at build time to plain `.html` files. There's no server to intercept requests, no middleware to evaluate, no dynamic logic at all.

Client-side testing tools work on static sites, but they come with the usual problems: flicker, pre-hide snippets blocking LCP, and JavaScript overhead on every page. If you've spent effort optimizing your Astro site's Lighthouse score — and Astro teams usually have — a testing library can undo that work fast.

`server` and `hybrid` output modes give you more options because requests actually hit a server (or edge function). In `hybrid` mode, you can mark individual pages as server-rendered while keeping the rest static. That's useful when you only need experiments on a few specific pages.

## Why client-side tools are especially awkward with Astro

Astro encourages a "use JavaScript only where needed" philosophy. Pages are typically pure HTML with component islands that hydrate selectively. This is exactly the opposite of what client-side testing tools expect — they want to be loaded on every page, executing before render, modifying the DOM.

Adding a testing library like VWO or Optimizely to an Astro site means:

- Adding a global `<script>` tag to your base layout
- Accepting the pre-hide snippet to prevent flicker
- Adding 50–150KB of JavaScript that runs on pages that don't have any experiments running

The performance regression on a well-optimized Astro site is visible. Sites that score 98+ on Lighthouse often drop to the low 80s after adding a standard testing library.

## The edge middleware approach

Astro supports middleware through its `src/middleware.ts` file, which runs on every request when using server or hybrid output. When deployed to Cloudflare Pages, Vercel, or Netlify, this middleware executes at the edge — close to the user, before HTML is returned.

This is where proper A/B testing belongs. Variant assignment happens in the middleware, the correct HTML is returned, and the browser renders it without any swap or flicker.

A minimal implementation using the Koryla SDK:

```typescript
// src/middleware.ts
import { defineMiddleware } from 'astro:middleware';
import { KorylaEdge } from '@koryla/astro';

const koryla = new KorylaEdge({ projectId: 'your-project-id' });

export const onRequest = defineMiddleware(async (context, next) => {
  const variant = await koryla.getVariant(context.request, 'hero-experiment');

  context.locals.variant = variant;

  const response = await next();
  koryla.attachCookie(response, variant);

  return response;
});
```

In your Astro component, read from `Astro.locals`:

```astro
---
// src/pages/index.astro
const { variant } = Astro.locals;
---

{variant === 'control' ? (
  <HeroOriginal />
) : (
  <HeroVariantB />
)}
```

No JavaScript in the browser. No flicker. The page the user receives is already the correct one.

## Using the `<Experiment>` component

For teams that prefer a declarative approach, the Koryla Astro SDK includes an `<Experiment>` component that handles the variant branching in your template:

```astro
---
import { Experiment, Variant } from '@koryla/astro';
---

<Experiment name="pricing-layout" request={Astro.request}>
  <Variant name="control">
    <PricingTableOriginal />
  </Variant>
  <Variant name="three-column">
    <PricingTableThreeColumn />
  </Variant>
</Experiment>
```

The component evaluates the variant server-side during rendering. Both `<Variant>` slots are defined in source but only one is included in the rendered HTML — the other never reaches the browser.

This approach works well in hybrid mode: mark just the pages with experiments as `export const prerender = false`, keep everything else static, and you get experiment capability on the pages that need it without affecting the static pages that don't.

## Static output with edge rewrites

If you're committed to fully static output — no server rendering at all — there's still an option, but it has tradeoffs.

You can build separate static versions of each variant (e.g., `/index.html` and `/index-b.html`) and use edge rewrite rules to serve the correct one based on a cookie. Cloudflare Pages, Netlify Edge Functions, and Vercel Edge Middleware all support this pattern.

```typescript
// Cloudflare Pages _worker.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === '/') {
      const cookie = request.headers.get('Cookie') || '';
      const variant = getVariantFromCookie(cookie) ?? assignVariant();
      
      const targetPath = variant === 'b' ? '/index-b.html' : '/index.html';
      const response = await env.ASSETS.fetch(new URL(targetPath, url));
      
      // Clone response and attach variant cookie
      const headers = new Headers(response.headers);
      headers.set('Set-Cookie', `koryla_variant=${variant}; Path=/; Max-Age=2592000`);
      return new Response(response.body, { headers });
    }
    return env.ASSETS.fetch(request);
  }
};
```

The downside: you're building and deploying every variant on every build. For two variants on one page, that's manageable. For five experiments across twenty pages, the combinatorial explosion becomes a problem.

## Which approach to use

| Situation | Recommended approach |
|---|---|
| Astro + server or hybrid output | Edge middleware with Koryla SDK |
| Astro + static, few experiment pages | Edge rewrites to pre-built variant files |
| Astro + static, complex experiments | Switch target pages to hybrid output |
| Cosmetic-only changes (CSS, copy with no layout shift) | Client-side, but keep it narrow |

**Practical takeaway:** If you're running Astro with server or hybrid output, use middleware for variant assignment and keep testing logic out of the browser entirely. If you're on fully static output and want to experiment on high-traffic pages, switching just those pages to hybrid mode is usually less disruptive than adding a client-side testing library to your entire site.
