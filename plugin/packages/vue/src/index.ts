/**
 * @koryla/vue
 *
 * Server-side A/B testing helper and Vue 3 components for Koryla.
 * Works with Nuxt 3/4 (SSR) and any Vue 3 app with server-side rendering.
 *
 * Usage (Nuxt 4 page):
 *   <script setup lang="ts">
 *   import { getKorylaVariant, KExperiment, KVariant } from '@koryla/vue'
 *   const headers = useRequestHeaders(['cookie'])
 *   const config = useRuntimeConfig()
 *
 *   const result = await getKorylaVariant('exp-id', headers.cookie ?? '', {
 *     apiKey: config.korylaApiKey,
 *     apiUrl: config.korylaApiUrl,
 *   })
 *   </script>
 *
 *   <template>
 *     <KExperiment :variant-id="result?.variantId ?? ''">
 *       <KVariant id="control"><HeroOriginal /></KVariant>
 *       <KVariant id="variant-b"><HeroVariantB /></KVariant>
 *     </KExperiment>
 *   </template>
 */

import { defineComponent, provide, inject, h } from 'vue'
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
 * Server-side helper — resolves the active variant for an experiment.
 * Call in <script setup> with await (requires Nuxt's useAsyncData or Suspense).
 */
export async function getKorylaVariant(
  experimentId: string,
  cookieHeader: string,
  options: SplitEngineOptions,
): Promise<VariantResult | null> {
  const engine = createSplitEngine(options)
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

const KORYLA_VARIANT_KEY = 'koryla:variantId'

/**
 * Wrapper component. Provide a `variantId` and only the matching
 * <KVariant> child will render.
 *
 * <KExperiment :variant-id="result.variantId">
 *   <KVariant id="control">...</KVariant>
 *   <KVariant id="variant-b">...</KVariant>
 * </KExperiment>
 */
export const KExperiment = defineComponent({
  name: 'KExperiment',
  props: {
    variantId: { type: String, required: true },
  },
  setup(props, { slots }) {
    provide(KORYLA_VARIANT_KEY, () => props.variantId)
    return () => h('template', slots.default?.())
  },
})

/**
 * Variant slot. Renders its children only when its `id` matches the
 * `variantId` provided by the parent <KExperiment>.
 */
export const KVariant = defineComponent({
  name: 'KVariant',
  props: {
    id: { type: String, required: true },
  },
  setup(props, { slots }) {
    const getVariantId = inject<() => string>(KORYLA_VARIANT_KEY, () => '')
    return () => getVariantId() === props.id ? slots.default?.() : null
  },
})
