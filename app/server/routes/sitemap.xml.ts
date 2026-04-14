export default defineEventHandler(async () => {
  const BASE = 'https://koryla.com'

  const staticRoutes = [
    { url: '/', priority: '1.0', changefreq: 'weekly' },
    { url: '/blog', priority: '0.8', changefreq: 'daily' },
    { url: '/docs', priority: '0.8', changefreq: 'weekly' },
    { url: '/docs/getting-started', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/worker-setup', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/sdk', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/sdk-react', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/sdk-vue', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/sdk-astro', priority: '0.7', changefreq: 'weekly' },
    { url: '/docs/sdk-wordpress', priority: '0.7', changefreq: 'weekly' },
    { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
    { url: '/terms', priority: '0.3', changefreq: 'yearly' },
  ]

  const blogSlugs = [
    'ab-testing-saas-pricing-page',
    'ab-testing-without-developer',
    'ab-testing-wordpress-guide',
    'ab-testing-nextjs-middleware',
    'ad-blockers-killing-ab-test-data',
    'conversion-rate-optimization-guide',
    'edge-computing-ab-testing',
    'edge-testing-vs-client-testing',
    'feature-flags-vs-ab-tests',
    'flicker-effect-ab-testing',
    'how-to-build-experimentation-culture',
    'multivariate-testing-vs-ab-testing',
    'statistical-significance-ab-testing',
    'what-is-ab-testing',
    'writing-better-ab-test-hypotheses',
    'ab-testing-core-web-vitals',
    'ab-test-results-are-wrong',
    'ab-testing-astro-sites',
    'ab-testing-landing-pages',
    'server-side-vs-client-side-ab-testing',
    'ab-testing-ecommerce',
    'first-ab-test-checklist',
    'ab-testing-too-long',
  ]

  const today = new Date().toISOString().split('T')[0]

  const urls = [
    ...staticRoutes.map(r => `
  <url>
    <loc>${BASE}${r.url}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`),
    ...blogSlugs.map(slug => `
  <url>
    <loc>${BASE}/blog/${slug}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`),
  ]

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
})
