# Koryla

Server-side A/B testing. Variant decisions happen before HTML is sent to the browser — at the network edge or during SSR. No flicker. No client JavaScript. Analytics forwarded to GA4 server-side via the Measurement Protocol.

**[koryla.com](https://koryla.com)**

---

## The Core Idea

Most A/B testing tools run in the browser. They load JavaScript, wait for the page to render, then swap content. The user sees a flash — the "flicker problem." And because the logic runs in the browser, ad blockers can silently exclude 20–40% of visitors from your experiments, skewing your GA4 data.

Koryla runs before the HTML is generated. The variant decision happens at the edge or on the server. The browser receives the correct version directly. Events are sent to GA4 server-side via the Measurement Protocol — the `api_secret` never reaches the browser.

You keep GA4. You just start trusting the data.

---

## Demo Implementations

Working reference implementations with real Supabase-backed experiments and live GA4 analytics:

| Platform | Repo | Live demo | Docs |
|---|---|---|---|
| **Astro + Netlify** | [koryla-astro-demo-example](https://github.com/andresclua/koryla-astro-demo-example) | [astro-demo.koryla.com](https://astro-demo.koryla.com) | [README](https://github.com/andresclua/koryla-astro-demo-example#readme) |
| **Next.js + Netlify** | [koryla-next-demo-example](https://github.com/andresclua/koryla-next-demo-example) | [next-demo.koryla.com](https://next-demo.koryla.com) | [README](https://github.com/andresclua/koryla-next-demo-example#readme) |

---

## How It Works

→ [Quick overview](https://github.com/andresclua/koryla-astro-demo-example/blob/main/docs/how-it-works.md)

→ [Technical reference](https://github.com/andresclua/koryla-astro-demo-example/blob/main/docs/how-it-works-technical.md) — architecture, cookie reference, analytics pipeline, event metadata

→ [For sales / product](https://github.com/andresclua/koryla-astro-demo-example/blob/main/docs/how-it-works-sales.md) — value prop, GA4 angle, competitive positioning

→ [Blog version](https://github.com/andresclua/koryla-astro-demo-example/blob/main/docs/how-it-works-blog.md) — "Your A/B test data in GA4 is probably wrong"

---

## Platform Integration Guides

| Platform | Guide |
|---|---|
| Astro + Netlify | [astro-integration-guide.md](https://github.com/andresclua/koryla-astro-demo-example/blob/main/docs/astro-integration-guide.md) |
| Next.js | [koryla.com/docs/sdk-react](https://koryla.com/docs/sdk-react) |
| WordPress | [koryla.com/docs/wordpress](https://koryla.com/docs/wordpress) |

---

## Two Layers

**Edge** — Runs as an edge function (Netlify/Cloudflare) before the framework processes the request. Intercepts every request, reads or assigns a variant cookie, transparently rewrites the URL. Best for testing full-page layouts.

**SDK** — Runs inside the framework during SSR. Wrapping a component in `<Experiment>` renders only the active variant — the inactive one never reaches the browser. Best for headlines, CTAs, and contained components.

Both layers fire events to Koryla, which forwards them to GA4 via the Measurement Protocol.

---

## Analytics Pipeline

```
Edge / SDK layer
      │
      ▼  POST /api/worker/event
Koryla API
      ├─→ Stored in Koryla database
      └─→ GA4 Measurement Protocol (server-side)
            impression  → experiment_assigned
            conversion  → experiment_converted
```

Configure in Koryla dashboard → **Settings → Analytics destinations → Google Analytics 4**.

---

## Repo Structure

```
app/          ← Koryla dashboard (Nuxt)
worker/       ← Koryla API (Hono on Cloudflare Workers)
plugin/       ← SDKs (@koryla/astro, @koryla/next, @koryla/react, @koryla/vue, @koryla/node)
```

---

## Related

- [ROADMAP.md](ROADMAP.md) — completed phases and pending work
- [koryla.com/docs](https://koryla.com/docs) — public documentation
