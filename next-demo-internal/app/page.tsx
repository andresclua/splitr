// Koryla Next.js Demo
import Link from 'next/link'

const demos = [
  {
    href: '/headline',
    number: '01',
    type: 'Text change',
    title: 'Headline Copy Test',
    description: 'Same page, two different headlines. The middleware rewrites the URL server-side — the browser always sees /headline, but 50% of visitors get a different copy.',
    what: ['Control: "Ship faster with A/B testing"', 'Variant B: "Stop guessing. Start converting."'],
    color: '#4338CA',
    bg: '#EEF2FF',
  },
  {
    href: '/hero',
    number: '02',
    type: 'Design change',
    title: 'Hero Layout Test',
    description: 'Two completely different page layouts behind the same URL. Koryla rewrites /hero → /hero-b transparently. No JavaScript required on the page.',
    what: ['Control: Centered single-column layout', 'Variant B: Two-column with product screenshot'],
    color: '#C96A3F',
    bg: '#FEF0E8',
  },
  {
    href: '/pricing',
    number: '03',
    type: 'URL change',
    title: 'Pricing Page Test',
    description: 'Two entirely separate pages at different URLs. The middleware intercepts /pricing and sends half the traffic to /pricing-b — a completely different pricing structure.',
    what: ['Control: 3-tier pricing (Free / Pro / Enterprise)', 'Variant B: 2-tier with annual billing toggle'],
    color: '#0F2235',
    bg: '#f0f4f8',
  },
]

export default function Home() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-16">
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Three ways to run A/B tests</h1>
        <p className="text-gray-500 mt-3 leading-relaxed max-w-xl">
          Each example below is a live experiment powered by <code className="bg-gray-100 px-1.5 py-0.5 rounded text-sm">@koryla/next</code> middleware.
          The server assigns you a variant before any HTML is sent — zero flicker, zero JavaScript overhead.
        </p>
        <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          Middleware active on /headline · /hero · /pricing
        </div>
      </div>

      <div className="space-y-4">
        {demos.map((demo) => (
          <Link key={demo.href} href={demo.href} className="block bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-md hover:border-gray-300 transition-all group">
            <div className="flex items-start gap-4">
              <div className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: demo.bg, color: demo.color }}>
                {demo.number}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: demo.bg, color: demo.color }}>{demo.type}</span>
                </div>
                <h2 className="text-base font-semibold text-gray-900 group-hover:text-[#C96A3F] transition-colors">{demo.title}</h2>
                <p className="text-sm text-gray-500 mt-1 leading-relaxed">{demo.description}</p>
                <ul className="mt-3 space-y-1">
                  {demo.what.map((w, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-gray-500">
                      <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: i === 0 ? '#9ca3af' : demo.color }} />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
              <span className="text-gray-300 group-hover:text-[#C96A3F] transition-colors text-lg shrink-0">→</span>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-center text-gray-400">
        Clear your cookies to be re-assigned. Each experiment uses a <code className="bg-gray-100 px-1 rounded">ky_</code> cookie to keep you on the same variant.
      </p>
    </main>
  )
}
