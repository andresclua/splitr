/**
 * @koryla/core
 *
 * Shared engine used by all Koryla adapters (Next.js, Netlify, Node/Express).
 * Contains zero framework-specific code — only fetch, URL, and cookie logic.
 *
 * Flow on every request:
 *  1. Load experiment config from Koryla API (cached in memory for 60s)
 *  2. Find an experiment whose base_url matches the incoming pathname
 *  3. Read the variant cookie — if present, honour it (sticky sessions)
 *  4. If no cookie, randomly assign a variant weighted by traffic_weight
 *  5. Return what to do: rewrite URL + optionally set cookie
 *
 * The caller (adapter) is responsible for actually rewriting the request
 * and setting the cookie — core just tells it what to do.
 */

export interface Variant {
  id: string
  name: string
  traffic_weight: number
  target_url: string
  is_control: boolean
}

export interface Experiment {
  id: string
  name: string
  base_url: string
  conversion_url?: string
  variants: Variant[]
  destinations: unknown[]
}

export interface SplitResult {
  experimentId: string
  variantId: string
  /** Full URL the request should be rewritten to */
  targetUrl: string
  /** Cookie name to set: `sp_<experimentId>` */
  cookieName: string
  /** True only when this is a fresh assignment (no prior cookie) */
  isNewAssignment: boolean
}

export interface SplitEngineOptions {
  /** API key generated in Koryla Settings (sk_live_...) */
  apiKey: string
  /** Base URL of your deployed Koryla app, e.g. https://app.koryla.com */
  apiUrl: string
  /** Config cache TTL in ms. Default: 60 000 (60s) */
  cacheTtl?: number
}

export const COOKIE_PREFIX = 'ky_'

/**
 * Creates a split engine instance.
 * Instantiate once per process — the instance holds the in-memory config cache.
 */
export function createSplitEngine(options: SplitEngineOptions) {
  const { apiKey, apiUrl, cacheTtl = 60_000 } = options

  let cachedExperiments: Experiment[] = []
  let cachedAt = 0

  // ── Config fetching ────────────────────────────────────────────────────────

  async function getConfig(): Promise<Experiment[]> {
    if (Date.now() - cachedAt < cacheTtl) return cachedExperiments

    try {
      const res = await fetch(`${apiUrl}/api/worker/config`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) return cachedExperiments // stale-on-error: keep last known config
      cachedExperiments = await res.json() as Experiment[]
      cachedAt = Date.now()
    } catch {
      // Network down — return stale cache so the site keeps running
    }

    return cachedExperiments
  }

  // ── Variant assignment ──────────────────────────────────────────────────────

  /**
   * Weighted random selection.
   * weights don't need to sum to 100 — any positive numbers work.
   */
  function assignVariant(variants: Pick<Variant, 'id' | 'traffic_weight'>[]): string {
    const total = variants.reduce((sum, v) => sum + v.traffic_weight, 0)
    let rand = Math.random() * total
    for (const v of variants) {
      rand -= v.traffic_weight
      if (rand <= 0) return v.id
    }
    return variants[variants.length - 1].id
  }

  // ── Cookie parsing ──────────────────────────────────────────────────────────

  function parseCookiesInternal(header: string): Record<string, string> {
    if (!header) return {}
    return Object.fromEntries(
      header.split(';')
        .map(c => c.trim().split('=').map(s => s.trim()))
        .filter(([k]) => k?.length > 0)
    )
  }

  // ── Main process function ──────────────────────────────────────────────────

  /**
   * Processes an incoming request and returns what the adapter should do.
   * Returns null if no experiment matches (adapter should pass the request through).
   */
  async function process(urlString: string, cookieHeader: string): Promise<SplitResult | null> {
    const experiments = await getConfig()
    if (!experiments.length) return null

    let url: URL
    try { url = new URL(urlString) } catch { return null }

    // Most specific (longest) path first — so /pricing matches before /
    const sorted = [...experiments].sort((a, b) => {
      try { return new URL(b.base_url).pathname.length - new URL(a.base_url).pathname.length }
      catch { return 0 }
    })
    const experiment = sorted.find(e => {
      try { return url.pathname.startsWith(new URL(e.base_url).pathname) }
      catch { return false }
    })
    if (!experiment || !experiment.variants.length) return null

    const cookieName = `${COOKIE_PREFIX}${experiment.id}`
    const cookies = parseCookiesInternal(cookieHeader)

    let variantId = cookies[cookieName]
    let isNewAssignment = false

    // Validate stored variant still exists (experiment may have changed)
    const storedVariant = variantId ? experiment.variants.find(v => v.id === variantId) : null
    if (!storedVariant) {
      variantId = assignVariant(experiment.variants)
      isNewAssignment = true
    }

    const variant = experiment.variants.find(v => v.id === variantId)!

    // Rewrite only the pathname — preserve query string, hash, host
    const targetUrl = new URL(urlString)
    try { targetUrl.pathname = new URL(variant.target_url).pathname }
    catch { return null }

    return { experimentId: experiment.id, variantId, targetUrl: targetUrl.toString(), cookieName, isNewAssignment }
  }

  return { process, getConfig }
}

export type SplitEngine = ReturnType<typeof createSplitEngine>

// ── Standalone helpers for component-level SDK usage ─────────────────────────

/** Parse a Cookie header string into a key→value map. */
export function parseCookies(header: string): Record<string, string> {
  if (!header) return {}
  return Object.fromEntries(
    header.split(';')
      .map(c => c.trim().split('=').map(s => s.trim()))
      .filter(([k]) => k?.length > 0)
  )
}

/**
 * Read or assign a variant from already-parsed cookies.
 * Pure function — no network calls, no side effects.
 * Used by @koryla/react, @koryla/vue, @koryla/astro component SDKs.
 */
export function getVariantFromCookies(
  cookies: Record<string, string>,
  experimentId: string,
  variants: Pick<Variant, 'id' | 'traffic_weight'>[],
): { variantId: string; isNewAssignment: boolean; cookieName: string } {
  const cookieName = `${COOKIE_PREFIX}${experimentId}`
  let variantId = cookies[cookieName]
  let isNewAssignment = false

  const storedVariant = variantId ? variants.find(v => v.id === variantId) : null
  if (!storedVariant) {
    const total = variants.reduce((s, v) => s + v.traffic_weight, 0)
    let rand = Math.random() * total
    for (const v of variants) { rand -= v.traffic_weight; if (rand <= 0) { variantId = v.id; break } }
    if (!variantId) variantId = variants[variants.length - 1].id
    isNewAssignment = true
  }

  return { variantId, isNewAssignment, cookieName }
}
