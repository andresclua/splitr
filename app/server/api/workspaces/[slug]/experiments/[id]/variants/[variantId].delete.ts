import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const variantId = getRouterParam(event, 'variantId')!
  const body = (await readBody(event)) ?? {}

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Workspace check
  const { data: ws } = await supabase
    .from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  // Membership check
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  // Experiment check
  const { data: exp } = await supabase
    .from('experiments').select('id, status')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot delete variants of a completed experiment' })

  // Variant check
  const { data: variant } = await supabase
    .from('variants').select('id, is_control')
    .eq('id', variantId).eq('experiment_id', id).single()
  if (!variant) throw createError({ statusCode: 404, message: 'Variant not found' })
  if (variant.is_control) throw createError({ statusCode: 400, message: 'Cannot delete the control variant' })

  // Must have at least 3 variants before delete (so at least 2 remain)
  const { count } = await supabase
    .from('variants').select('id', { count: 'exact', head: true })
    .eq('experiment_id', id)
  if ((count ?? 0) < 3) throw createError({ statusCode: 400, message: 'Cannot delete: experiment must keep at least 2 variants' })

  // Validate new_weights
  if (!Array.isArray(body.new_weights) || body.new_weights.length === 0)
    throw createError({ statusCode: 400, message: 'new_weights is required' })
  const newWeights: Array<{ id: string; traffic_weight: number }> = body.new_weights

  // Fetch remaining variant IDs (excluding the one being deleted)
  const { data: remaining } = await supabase
    .from('variants').select('id')
    .eq('experiment_id', id).neq('id', variantId)
  const remainingIds = new Set((remaining ?? []).map(v => v.id))
  const providedIds = new Set(newWeights.map(v => v.id))

  if (
    remainingIds.size !== providedIds.size ||
    ![...remainingIds].every(rid => providedIds.has(rid)) ||
    ![...providedIds].every(pid => remainingIds.has(pid))
  ) throw createError({ statusCode: 400, message: 'new_weights must cover exactly the remaining variants' })

  const total = newWeights.reduce((s, v) => s + Number(v.traffic_weight), 0)
  if (Math.round(total) !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })

  if (!newWeights.every(v => Number.isInteger(Number(v.traffic_weight)) && Number(v.traffic_weight) >= 1))
    throw createError({ statusCode: 400, message: 'Each traffic_weight must be a positive integer' })

  // Update remaining weights first (reversible; delete is irreversible)
  for (const entry of newWeights) {
    const { error: updateError } = await supabase
      .from('variants')
      .update({ traffic_weight: Number(entry.traffic_weight) })
      .eq('id', entry.id).eq('experiment_id', id)
    if (updateError) throw createError({ statusCode: 500, message: `Weight update failed for ${entry.id}: ${updateError.message}` })
  }

  // Delete variant only after weights are committed
  const { error: deleteError } = await supabase
    .from('variants').delete().eq('id', variantId).eq('experiment_id', id)
  if (deleteError) throw createError({ statusCode: 500, message: deleteError.message })

  return { deleted: variantId }
})
