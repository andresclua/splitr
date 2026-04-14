import { routeAnalytics } from './analytics'

export interface Env {
  KORYLA_CONFIG: KVNamespace
  KORYLA_API_URL: string  // e.g. https://your-app.nuxt.dev
  KORYLA_API_KEY: string  // sk_live_... (set via wrangler secret put KORYLA_API_KEY)
}

interface Variant {
  id: string
  traffic_weight: number
  target_url: string
}

interface Experiment {
  id: string
  name: string
  base_url: string
  conversion_url: string | null
  variants: Variant[]
  destinations: AnalyticsDestination[]
}

export interface AnalyticsDestination {
  provider: string
  enabled: boolean
  config: Record<string, string>
}

/**
 * Assigns a variant based on traffic weights.
 * Exported as named export for unit testing.
 */
export function assignVariant(variants: Pick<Variant, 'id' | 'traffic_weight'>[]): string {
  const total = variants.reduce((sum, v) => sum + v.traffic_weight, 0)
  let rand = Math.random() * total
  for (const variant of variants) {
    rand -= variant.traffic_weight
    if (rand <= 0) return variant.id
  }
  return variants[variants.length - 1].id
}

const COOKIE_PREFIX = 'ky_'
const CONFIG_TTL = 60 // seconds

function getCookieName(experimentId: string): string {
  return `${COOKIE_PREFIX}${experimentId}`
}

function parseCookies(header: string | null): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';').map(c => c.trim().split('=').map(s => s.trim()))
  )
}

async function postEvent(env: Env, payload: {
  experiment_id: string
  variant_id: string
  session_id: string
  event_type: 'impression' | 'conversion'
}) {
  try {
    await fetch(`${env.KORYLA_API_URL}/api/worker/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.KORYLA_API_KEY}`,
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // fire-and-forget — don't break the site
  }
}

async function getConfig(env: Env): Promise<Experiment[]> {
  // Serve from KV cache when available (60-second TTL set on write)
  const cached = await env.KORYLA_CONFIG.get('experiments', 'json')
  if (cached) return cached as Experiment[]

  // Cache miss — fetch fresh config from the Koryla API
  let experiments: Experiment[]
  try {
    const res = await fetch(`${env.KORYLA_API_URL}/api/worker/config`, {
      headers: { Authorization: `Bearer ${env.KORYLA_API_KEY}` },
    })
    if (!res.ok) return []
    experiments = await res.json() as Experiment[]
  } catch {
    // Network error — passthrough, don't break the site
    return []
  }

  // Write to KV with TTL so next requests are fast
  await env.KORYLA_CONFIG.put('experiments', JSON.stringify(experiments), {
    expirationTtl: CONFIG_TTL,
  })

  return experiments
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url)
    const cookies = parseCookies(request.headers.get('cookie'))

    const experiments = await getConfig(env)

    // Check if this URL is a conversion URL for any experiment the visitor is in
    for (const exp of experiments) {
      if (!exp.conversion_url) continue
      const convPathname = new URL(exp.conversion_url).pathname
      if (url.pathname === convPathname) {
        const variantId = cookies[getCookieName(exp.id)]
        if (variantId) {
          ctx.waitUntil(
            postEvent(env, {
              experiment_id: exp.id,
              variant_id: variantId,
              session_id: variantId,
              event_type: 'conversion',
            })
          )
        }
      }
    }

    const experiment = experiments.find(e => url.pathname.startsWith(new URL(e.base_url).pathname))
    if (!experiment) {
      return fetch(request)
    }

    const cookieName = getCookieName(experiment.id)
    let variantId = cookies[cookieName]

    let isNewAssignment = false
    if (!variantId) {
      variantId = assignVariant(experiment.variants)
      isNewAssignment = true
    }

    const variant = experiment.variants.find(v => v.id === variantId)
    if (!variant) return fetch(request)

    // Rewrite request to variant URL — no redirect, no DOM flicker
    const targetUrl = new URL(request.url)
    targetUrl.pathname = new URL(variant.target_url).pathname

    const response = await fetch(new Request(targetUrl.toString(), request))
    const newResponse = new Response(response.body, response)

    if (isNewAssignment) {
      newResponse.headers.append(
        'Set-Cookie',
        `${cookieName}=${variantId}; Path=/; Max-Age=2592000; SameSite=Lax`
      )

      // Store impression in Supabase + forward to external analytics — fire-and-forget
      ctx.waitUntil(
        Promise.all([
          postEvent(env, {
            experiment_id: experiment.id,
            variant_id: variant.id,
            session_id: variantId,
            event_type: 'impression',
          }),
          routeAnalytics(experiment.destinations, {
            experimentId: experiment.id,
            experimentName: experiment.name,
            variantId: variant.id,
            variantName: variant.id,
            sessionId: variantId,
            timestamp: new Date().toISOString(),
          }),
        ])
      )
    }

    return newResponse
  },
}
