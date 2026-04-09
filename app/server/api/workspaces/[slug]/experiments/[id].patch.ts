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

  return data
})
