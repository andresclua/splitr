import { createClient } from '@supabase/supabase-js'
import { hashApiKey } from '~/lib/apiKeys'
import { PLANS } from '~/lib/plans'
import type { PlanKey } from '~/lib/plans'
import { isOverImpressionLimit } from '~/lib/usage'

export default defineEventHandler(async (event) => {
  // Machine-to-machine auth — API key in Authorization header, no user session
  const auth = getHeader(event, 'authorization')
  if (!auth?.startsWith('Bearer ')) {
    throw createError({ statusCode: 401, message: 'Missing API key' })
  }

  const rawKey = auth.slice(7).trim()
  const keyHash = hashApiKey(rawKey)

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Validate key and get workspace
  const { data: apiKey } = await supabase
    .from('api_keys')
    .select('id, workspace_id')
    .eq('key_hash', keyHash)
    .maybeSingle()

  if (!apiKey) {
    throw createError({ statusCode: 401, message: 'Invalid API key' })
  }

  // Update last_used_at — fire-and-forget, don't block response
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', apiKey.id)
    .then()

  // Fetch workspace plan and check impression limit
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('plan')
    .eq('id', apiKey.workspace_id)
    .single()

  const plan = ((workspace?.plan ?? 'free') as PlanKey)

  const overLimit = await isOverImpressionLimit(supabase, apiKey.workspace_id, plan)
  if (overLimit) return []

  // Fetch active experiments with variants — optionally filter by type
  const typeFilter = getQuery(event).type as string | undefined
  const validTypes = ['edge', 'component']

  let query = supabase
    .from('experiments')
    .select('id, name, base_url, conversion_url, override_assignment, type, variants(id, name, traffic_weight, target_url, is_control, rules)')
    .eq('workspace_id', apiKey.workspace_id)
    .eq('status', 'active')

  if (typeFilter && validTypes.includes(typeFilter)) {
    query = query.eq('type', typeFilter)
  }

  const { data: experiments, error: expError } = await query

  if (expError) throw createError({ statusCode: 500, message: expError.message })

  // Fetch analytics destinations for this workspace
  const { data: destinations } = await supabase
    .from('analytics_destinations')
    .select('provider, enabled, config')
    .eq('workspace_id', apiKey.workspace_id)
    .eq('enabled', true)

  // Shape response to match the worker's Experiment interface
  return (experiments ?? []).map(exp => ({
    id: exp.id,
    name: exp.name,
    base_url: exp.base_url,
    conversion_url: exp.conversion_url ?? null,
    override_assignment: exp.override_assignment ?? false,
    variants: (exp.variants ?? []).map(v => ({
      ...v,
      rules: v.rules ?? [],
    })),
    destinations: destinations ?? [],
  }))
})
