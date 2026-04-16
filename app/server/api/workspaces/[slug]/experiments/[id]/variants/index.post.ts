import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

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
    .from('experiments').select('id, status, type')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot add variants to a completed experiment' })

  // Validate body
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })

  const trafficWeight: number = Number(body.traffic_weight)
  if (!Number.isInteger(trafficWeight) || trafficWeight < 1 || trafficWeight > 98)
    throw createError({ statusCode: 400, message: 'traffic_weight must be an integer between 1 and 98' })

  const existingWeights: Array<{ id: string; traffic_weight: number }> = body.existing_weights ?? []

  const total = trafficWeight + existingWeights.reduce((s, v) => s + Number(v.traffic_weight), 0)
  if (total !== 100) throw createError({ statusCode: 400, message: `Weights must sum to 100 (got ${total})` })

  // For edge experiments, target_url is required
  const targetUrl: string | null = body.target_url?.trim() || null
  if (exp.type === 'edge' && !targetUrl)
    throw createError({ statusCode: 400, message: 'target_url is required for edge experiments' })

  // Insert new variant
  const { data: newVariant, error: insertError } = await supabase
    .from('variants')
    .insert({
      experiment_id: id,
      name,
      target_url: targetUrl,
      traffic_weight: trafficWeight,
      is_control: false,
    })
    .select('id, name, target_url, traffic_weight, is_control')
    .single()

  if (insertError || !newVariant) throw createError({ statusCode: 500, message: insertError?.message ?? 'Insert failed' })

  // Update existing variant weights
  for (const entry of existingWeights) {
    await supabase
      .from('variants')
      .update({ traffic_weight: Number(entry.traffic_weight) })
      .eq('id', entry.id)
      .eq('experiment_id', id)
  }

  return {
    id: newVariant.id,
    name: newVariant.name,
    target_url: newVariant.target_url,
    traffic_weight: newVariant.traffic_weight,
    is_control: newVariant.is_control,
    impressions: 0,
    conversion_count: 0,
  }
})
