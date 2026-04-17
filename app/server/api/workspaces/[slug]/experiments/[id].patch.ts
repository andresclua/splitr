import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const updates: Record<string, unknown> = {}

  if (body.name) updates.name = body.name.trim()
  if (body.base_url) updates.base_url = body.base_url.trim()
  if ('conversion_url' in body) updates.conversion_url = body.conversion_url?.trim() || null
  if ('override_assignment' in body) updates.override_assignment = Boolean(body.override_assignment)

  if (body.status) {
    updates.status = body.status
    if (body.status === 'active') updates.started_at = new Date().toISOString()
    if (body.status === 'completed') updates.ended_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('experiments')
    .update(updates)
    .eq('id', id)
    .eq('workspace_id', ws.id)
    .select('id, name, status, started_at, ended_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  if (!data) throw createError({ statusCode: 404, message: 'Experiment not found' })

  // Update variant descriptions if provided
  if (Array.isArray(body.variantDescriptions)) {
    for (const v of body.variantDescriptions as { id: string; description: string; rules?: { param: string; value: string }[] }[]) {
      const variantUpdate: Record<string, unknown> = {
        description: v.description?.trim() || null,
      }
      if (Array.isArray(v.rules)) {
        variantUpdate.rules = v.rules
          .filter(r => r.param?.trim() && r.value?.trim())
          .map(r => ({ param: r.param.trim(), value: r.value.trim() }))
      }
      await supabase.from('variants')
        .update(variantUpdate)
        .eq('id', v.id)
        .eq('experiment_id', id)
    }
  }

  // Update variant traffic weights if provided
  if (Array.isArray(body.variantWeights) && body.variantWeights.length > 0) {
    const weights = body.variantWeights as Array<{ id: string; traffic_weight: number }>
    if (!weights.every(v => Number.isInteger(Number(v.traffic_weight)) && Number(v.traffic_weight) >= 1))
      throw createError({ statusCode: 400, message: 'Each traffic_weight must be a positive integer' })
    const total = weights.reduce((s, v) => s + Number(v.traffic_weight), 0)
    if (Math.round(total) !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })
    for (const entry of weights) {
      const { error: weightError } = await supabase
        .from('variants')
        .update({ traffic_weight: Number(entry.traffic_weight) })
        .eq('id', entry.id)
        .eq('experiment_id', id)
      if (weightError) throw createError({ statusCode: 500, message: `Weight update failed for ${entry.id}: ${weightError.message}` })
    }
  }

  return data
})
