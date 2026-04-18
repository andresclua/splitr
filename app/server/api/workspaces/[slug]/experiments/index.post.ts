import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { PLANS } from '~/lib/plans'
import type { PlanKey } from '~/lib/plans'

interface VariantInput {
  name: string
  description?: string
  target_url: string
  traffic_weight: number
  is_control?: boolean
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { name, base_url, conversion_url, type, variants } = body as {
    name: string
    base_url: string
    conversion_url?: string
    type?: 'edge' | 'component'
    variants: VariantInput[]
  }

  if (!name?.trim()) throw createError({ statusCode: 400, message: 'Name is required' })
  if (!base_url?.trim()) throw createError({ statusCode: 400, message: 'Base URL is required' })
  if (!variants?.length || variants.length < 2) throw createError({ statusCode: 400, message: 'At least 2 variants required' })

  const totalWeight = variants.reduce((sum, v) => sum + (v.traffic_weight ?? 0), 0)
  if (totalWeight !== 100) throw createError({ statusCode: 400, message: 'Variant weights must sum to 100' })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces').select('id, plan').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  // Enforce experiment limit (only draft/active/paused count)
  const plan = PLANS[(ws.plan ?? 'free') as PlanKey] ?? PLANS.free
  const expLimit = plan.experiments
  if (isFinite(expLimit as number)) {
    const { count } = await supabase
      .from('experiments')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ws.id)
      .in('status', ['draft', 'active', 'paused'])
    if ((count ?? 0) >= (expLimit as number)) {
      throw createError({
        statusCode: 403,
        message: `Your ${ws.plan} plan allows up to ${expLimit} active experiment${expLimit === 1 ? '' : 's'}. Upgrade to create more.`,
      })
    }
  }

  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const { data: experiment, error: expError } = await supabase
    .from('experiments')
    .insert({ workspace_id: ws.id, name: name.trim(), base_url: base_url.trim(), conversion_url: conversion_url?.trim() || null, type: type ?? 'edge' })
    .select('id').single()

  if (expError) throw createError({ statusCode: 500, message: expError.message })

  const { error: varError } = await supabase
    .from('variants')
    .insert(variants.map(v => ({
      experiment_id: experiment.id,
      name: v.name.trim(),
      description: v.description?.trim() || null,
      target_url: v.target_url?.trim() || null,
      traffic_weight: v.traffic_weight,
      is_control: v.is_control ?? false,
    })))

  if (varError) throw createError({ statusCode: 500, message: varError.message })

  return { id: experiment.id }
})
