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

  const { data: owner } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (!owner) throw createError({ statusCode: 403, message: 'Only owners can remove members' })

  // Prevent removing the last owner
  const { data: target } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('id', id)
    .single()

  if (target?.role === 'owner') {
    throw createError({ statusCode: 400, message: 'Cannot remove the workspace owner' })
  }

  const { error } = await supabase
    .from('workspace_members')
    .delete()
    .eq('id', id)
    .eq('workspace_id', ws.id)

  if (error) throw createError({ statusCode: 500, message: error.message })
  return { success: true }
})
