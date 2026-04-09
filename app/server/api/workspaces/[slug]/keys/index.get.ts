import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Verify membership
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, key_prefix, created_at, last_used_at')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: false })

  if (error) throw createError({ statusCode: 500, message: error.message })
  return data ?? []
})
