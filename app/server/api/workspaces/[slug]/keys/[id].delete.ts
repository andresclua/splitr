import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (!member) throw createError({ statusCode: 403, message: 'Only owners can delete API keys' })

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ws.id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
