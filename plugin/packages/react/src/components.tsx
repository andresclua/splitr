/**
 * @koryla/react — UI components
 *
 * <Experiment> + <Variant> — pure React components compatible with
 * React Server Components (no hooks, no 'use client' required).
 *
 * Usage:
 *   import { Experiment, Variant } from '@koryla/react/components'
 *
 *   <Experiment variantId={result.variantId}>
 *     <Variant id="control"><HeroOriginal /></Variant>
 *     <Variant id="variant-b"><HeroVariantB /></Variant>
 *   </Experiment>
 *
 * If `variantId` doesn't match any <Variant>, the first child is rendered
 * as a fallback (control/default).
 */

import React from 'react'

interface ExperimentProps {
  /** The variant ID returned by koryla.getVariant() */
  variantId: string
  children: React.ReactNode
}

interface VariantProps {
  /** Must match a variant ID from your Koryla experiment */
  id: string
  children: React.ReactNode
}

export function Experiment({ variantId, children }: ExperimentProps) {
  const arr = React.Children.toArray(children) as React.ReactElement<VariantProps>[]
  const match = arr.find(child => child.props.id === variantId)
  // Fall back to first child (control) if no match
  return <>{match ?? arr[0] ?? null}</>
}

export function Variant({ children }: VariantProps) {
  return <>{children}</>
}
