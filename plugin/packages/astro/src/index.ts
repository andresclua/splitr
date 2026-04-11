/**
 * @koryla/astro
 *
 * Server-side A/B testing helper for Astro.
 * Reads the visitor's variant from cookies (or assigns a new one) without
 * any client-side JavaScript.
 *
 * Usage (Astro page or layout):
 *   ---
 *   import { getVariant } from '@koryla/astro'
 *
 *   const result = await getVariant(Astro.request, 'exp-id', {
 *     apiKey: import.meta.env.KORYLA_API_KEY,
 *     apiUrl: import.meta.env.KORYLA_API_URL,
 *   })
 *   ---
 *
 *   {result?.variant.name === 'control' ? <HeroOriginal /> : <HeroVariantB />}
 *
 * Cookie handling:
 *   On new assignments you should set the variant cookie in the response so
 *   the visitor stays in the same variant on future visits. Example:
 *
 *   if (result?.isNewAssignment) {
 *     Astro.cookies.set(result.cookieName, result.variantId, {
 *       maxAge: 60 * 60 * 24 * 30,
 *       sameSite: 'lax',
 *       path: '/',
 *     })
 *   }
 *
 * Note:
 *   The edge function approach (astro-demo-internal/netlify/edge-functions/koryla.ts)
 *   handles full-page URL rewrites automatically — no code changes needed in your
 *   Astro pages. Use @koryla/astro when you want to A/B test a specific component
 *   or section within a page rather than routing to a different URL.
 */

import { createSplitEngine, parseCookies, getVariantFromCookies } from '@koryla/core'
import type { SplitEngineOptions, Experiment, Variant } from '@koryla/core'

export interface VariantResult {
  experiment: Experiment
  variant: Variant
  variantId: string
  isNewAssignment: boolean
  cookieName: string
}

// Module-level engine cache so the config isn't re-fetched on every request
// during server-side rendering of the same Astro build.
const engines = new Map<string, ReturnType<typeof createSplitEngine>>()

/**
 * Returns the active variant for an experiment.
 *
 * @param request       The Astro.request object (or any Request).
 * @param experimentId  The experiment ID shown in your Koryla dashboard.
 * @param options       `{ apiKey, apiUrl }` — use import.meta.env in Astro.
 */
export async function getVariant(
  request: Request,
  experimentId: string,
  options: SplitEngineOptions,
): Promise<VariantResult | null> {
  const cacheKey = `${options.apiKey}:${options.apiUrl}`
  if (!engines.has(cacheKey)) {
    engines.set(cacheKey, createSplitEngine(options))
  }
  const engine = engines.get(cacheKey)!

  const experiments = await engine.getConfig()
  const experiment = experiments.find(e => e.id === experimentId)
  if (!experiment || !experiment.variants.length) return null

  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookies = parseCookies(cookieHeader)
  const { variantId, isNewAssignment, cookieName } = getVariantFromCookies(
    cookies,
    experimentId,
    experiment.variants,
  )
  const variant = experiment.variants.find(v => v.id === variantId)!

  return { experiment, variant, variantId, isNewAssignment, cookieName }
}
