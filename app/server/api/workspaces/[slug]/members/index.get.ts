import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: self } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!self) throw createError({ statusCode: 403, message: 'Not a member' })

  const { data, error } = await supabase
    .from('workspace_members')
    .select('id, role, created_at, user_id')
    .eq('workspace_id', ws.id)
    .order('created_at', { ascending: true })

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Fetch user emails from auth.users via admin API
  const userIds = (data ?? []).map(m => m.user_id)
  const { data: users } = await supabase.auth.admin.listUsers()
  const emailMap = Object.fromEntries(
    (users?.users ?? []).filter(u => userIds.includes(u.id)).map(u => [u.id, u.email])
  )

  return (data ?? []).map(m => ({ ...m, email: emailMap[m.user_id] ?? m.user_id }))
})
