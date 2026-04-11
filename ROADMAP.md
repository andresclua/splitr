# Koryla — Roadmap

## Completado ✅

| Fase | Descripción |
|------|-------------|
| 01 | Monorepo & stack inicial |
| 02 | Auth & registro con domain matching |
| 03 | Workspaces & API keys |
| 04 | Cloudflare Worker — core engine |
| 05 | Analytics router multi-destino (GA4, PostHog, webhooks) |
| 06 | Dashboard — experimentos |
| 07 | Instalación — WordPress + Next.js |
| 08 | Página de integraciones |
| 09 | Billing con Stripe (free / starter / growth) |
| 10 | Onboarding & emails (Resend) |
| 11 | Blog & Docs (@nuxt/content) |
| 12 | Renombrado Splitr → Koryla |
| 13 | Landing page (koryla.com) |
| 14 | Demo interactiva (astro-demo.koryla.com) + eventos reales en Supabase |
| 15 | SDK components (@koryla/react, @koryla/vue, @koryla/astro, @koryla/next, @koryla/node) |
| 15.1 | Blog — 11 artículos (CRO, edge testing, flicker, stats, WordPress, BoostifyJS, etc.) |

## Pendiente

### Bugs & fixes

| Fase | Descripción | Notas |
|------|-------------|-------|
| 17.5 | **Revisión de docs** | `how-it-works.md` Cloudflare-only — hacer agnóstico a la plataforma |
| 17.6 | **Fix Google OAuth** | Muestra "supabase.co" en el selector de cuenta — cambiar en Google Cloud Console: nombre de app → "Koryla", dominio autorizado → `koryla.com` |
| 17.7 | **Fix conversion rate 0.0%** | Verificar que los experimentos tienen `conversion_url` configurada y que esa URL se está visitando. Revisar datos en Supabase tabla `events` |
| 17.8 | **Emails Resend** | FROM hardcodeado a `onboarding@resend.dev`. Pendiente: dominio propio, verificación de email, reset de contraseña |
| 17.9 | **Blog analytics en admin** | El admin dashboard no muestra datos de blog. Integrar GA4 Reporting API o pageviews en `/admin` |
| 17.10 | **SDK demo — anotaciones visuales** | Añadir etiquetas "Style variation" / "Text variation" sobre el contenido de `/sdk-demo` |
| 17.15 | **SDK reporting al dashboard** | `<Experiment>` dispara `POST /api/events` (impression + conversion) al mismo backend que el Worker. Dashboard muestra experimentos edge y component en la misma lista con badge de tipo. Incluye `onAssigned` callback para dual reporting a PostHog/GA4. |

### SEO & visibilidad

| Fase | Descripción | Notas |
|------|-------------|-------|
| 17.11 | **llms.txt** | Archivo `/public/llms.txt` con descripción del producto, casos de uso, links a docs y blog — para que LLMs entiendan qué es Koryla |
| 17.12 | **SEO técnico** | `<meta>` tags en todas las páginas (title, description, OG, Twitter card), sitemap.xml, robots.txt, canonical URLs |
| 17.13 | **Blog SEO** | Añadir `og:image` por post, structured data (Article schema), reading time estimado |
| 17.14 | **Landing page SEO** | H1/H2 con keywords target, alt text en imágenes, Core Web Vitals limpios |

### Infra & calidad

| Fase | Descripción | Notas |
|------|-------------|-------|
| 17 | **QA & CI/CD** | Tests unitarios, integración, GitHub Actions pipeline |
| 16 | **Proxy gestionado** (`proxy.koryla.com`) | Cloudflare for SaaS — post-launch |

### Launch

| Fase | Descripción | Notas |
|------|-------------|-------|
| 18 | **Launch** | Meta: 2026-05-10 — checklist: SEO ✓, emails ✓, OAuth ✓, conversion rate ✓, docs ✓ |
