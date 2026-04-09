import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const { data: experiments, error } = await supabase
    .from('experiments')
    .select('id, name, status, base_url, conversion_url, created_at, started_at, ended_at, variants(id, name, traffic_weight, target_url, is_control)')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Fetch impression + conversion counts for all experiments in one query
  const expIds = (experiments ?? []).map(e => e.id)
  let impressions: Record<string, Record<string, number>> = {}
  let conversions: Record<string, number> = {}

  if (expIds.length) {
    const { data: events } = await supabase
      .from('events')
      .select('experiment_id, variant_id, event_type')
      .in('experiment_id', expIds)
      .in('event_type', ['impression', 'conversion'])

    for (const ev of events ?? []) {
      if (ev.event_type === 'impression') {
        impressions[ev.experiment_id] ??= {}
        impressions[ev.experiment_id][ev.variant_id] = (impressions[ev.experiment_id][ev.variant_id] ?? 0) + 1
      } else {
        conversions[ev.experiment_id] = (conversions[ev.experiment_id] ?? 0) + 1
      }
    }
  }

  return (experiments ?? []).map(exp => ({
    ...exp,
    variants: (exp.variants ?? []).map((v: any) => ({
      ...v,
      impressions: impressions[exp.id]?.[v.id] ?? 0,
    })),
    total_impressions: Object.values(impressions[exp.id] ?? {}).reduce((a, b) => a + b, 0),
    total_conversions: conversions[exp.id] ?? 0,
  }))
})
