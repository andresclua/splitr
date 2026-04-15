import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

const PROVIDERS = ['ga4', 'posthog', 'mixpanel', 'segment', 'webhook'] as const

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const body = await readBody(event)
  const { provider, config } = body

  if (!PROVIDERS.includes(provider)) throw createError({ statusCode: 400, message: 'Invalid provider' })
  if (!config || typeof config !== 'object') throw createError({ statusCode: 400, message: 'Missing config' })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase.from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase.from('workspace_members').select('id').eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const { data, error } = await supabase
    .from('analytics_destinations')
    .insert({ workspace_id: ws.id, provider, config, enabled: true })
    .select('id, provider, enabled, config, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data
})
