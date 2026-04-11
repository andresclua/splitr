/**
 * @koryla/react — server helper
 *
 * Use this in React Server Components (Next.js App Router, Remix, etc.)
 * to assign a variant before rendering. Zero client-side JavaScript.
 *
 * Usage (Next.js App Router):
 *   // lib/koryla.ts
 *   import { createKoryla } from '@koryla/react/server'
 *   export const koryla = createKoryla({
 *     apiKey: process.env.KORYLA_API_KEY!,
 *     apiUrl: process.env.KORYLA_API_URL!,
 *   })
 *
 *   // app/page.tsx
 *   import { headers } from 'next/headers'
 *   import { koryla } from '@/lib/koryla'
 *   import { Experiment, Variant } from '@koryla/react/components'
 *
 *   export default async function Page() {
 *     const result = await koryla.getVariant('exp-id', headers().get('cookie') ?? '')
 *
 *     return (
 *       <Experiment variantId={result?.variantId ?? ''}>
 *         <Variant id="control"><HeroOriginal /></Variant>
 *         <Variant id="variant-b"><HeroVariantB /></Variant>
 *       </Experiment>
 *     )
 *   }
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

/**
 * Creates a Koryla client for use in server components.
 * Call this once per app (e.g. in lib/koryla.ts) — the instance holds the
 * in-memory config cache so experiments are only fetched once per 60s.
 */
export function createKoryla(options: SplitEngineOptions) {
  const engine = createSplitEngine(options)

  /**
   * Look up the active experiment by ID and assign/read the visitor's variant.
   * Returns null if the experiment doesn't exist or has no variants.
   *
   * @param experimentId  The experiment ID from your Koryla dashboard.
   * @param cookieHeader  The raw Cookie header from the incoming request.
   */
  async function getVariant(
    experimentId: string,
    cookieHeader: string,
  ): Promise<VariantResult | null> {
    const experiments = await engine.getConfig()
    const experiment = experiments.find(e => e.id === experimentId)
    if (!experiment || !experiment.variants.length) return null

    const cookies = parseCookies(cookieHeader)
    const { variantId, isNewAssignment, cookieName } = getVariantFromCookies(
      cookies,
      experimentId,
      experiment.variants,
    )
    const variant = experiment.variants.find(v => v.id === variantId)!

    return { experiment, variant, variantId, isNewAssignment, cookieName }
  }

  return { getVariant }
}
