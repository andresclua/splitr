import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const workspaceId = getRouterParam(event, 'workspaceId')
  if (!workspaceId) throw createError({ statusCode: 400, message: 'Missing workspaceId' })

  const body = await readBody(event)
  const { experiment_id, variant_id, session_id, event_type } = body

  if (!experiment_id || !variant_id || !session_id || !event_type) {
    throw createError({ statusCode: 400, message: 'Missing required fields' })
  }

  if (!['impression', 'conversion'].includes(event_type)) {
    throw createError({ statusCode: 400, message: 'Invalid event_type' })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Validate workspaceId exists — prevents arbitrary event injection
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', workspaceId)
    .maybeSingle()

  if (!workspace) throw createError({ statusCode: 404, message: 'Workspace not found' })

  // Deduplicate impressions — one per session per experiment
  if (event_type === 'impression') {
    const { data: existing } = await supabase
      .from('events')
      .select('id')
      .eq('experiment_id', experiment_id)
      .eq('session_id', session_id)
      .eq('event_type', 'impression')
      .maybeSingle()

    if (existing) return { ok: true, duplicate: true }
  }

  const { error } = await supabase.from('events').insert({
    workspace_id: workspaceId,
    experiment_id,
    variant_id,
    session_id,
    event_type,
    metadata: null,
  })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Forward to analytics destinations — fire-and-forget
  supabase
    .from('analytics_destinations')
    .select('provider, config')
    .eq('workspace_id', workspaceId)
    .eq('enabled', true)
    .then(({ data: destinations }) => {
      if (!destinations?.length) return
      for (const dest of destinations) {
        routeToAnalytics(dest.provider, dest.config, { event_type, experiment_id, variant_id, session_id }).catch(() => {})
      }
    })

  return { ok: true }
})

async function routeToAnalytics(
  provider: string,
  config: Record<string, string>,
  payload: { event_type: string; experiment_id: string; variant_id: string; session_id: string }
) {
  const eventName = payload.event_type === 'impression' ? 'experiment_assigned' : 'experiment_converted'
  const props = { experiment_id: payload.experiment_id, variant_id: payload.variant_id }

  if (provider === 'posthog' && config.api_key && config.host) {
    await fetch(`${config.host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: config.api_key, event: eventName, distinct_id: payload.session_id, properties: props }),
    })
  }

  if (provider === 'ga4' && config.measurement_id && config.api_secret) {
    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${config.measurement_id}&api_secret=${config.api_secret}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: payload.session_id, events: [{ name: eventName, params: props }] }),
      }
    )
  }

  if (provider === 'webhook' && config.url) {
    await fetch(config.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: eventName, ...props, session_id: payload.session_id }),
    })
  }
}
