import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const ADMIN_EMAIL = 'andresclua@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const supabase = serverSupabaseServiceRole(event)

  const { data: { users }, error } = await supabase.auth.admin.listUsers({ perPage: 1000 })
  if (error) throw createError({ statusCode: 500, message: error.message })

  const { data: membersRaw } = await supabase
    .from('workspace_members')
    .select('user_id, workspace_id, role, workspace:workspaces(name, slug, plan)')

  const workspacesByUser: Record<string, any[]> = {}
  for (const m of membersRaw ?? []) {
    if (!workspacesByUser[m.user_id]) workspacesByUser[m.user_id] = []
    workspacesByUser[m.user_id].push(m.workspace)
  }

  return users.map(u => ({
    id: u.id,
    email: u.email,
    provider: u.app_metadata?.provider ?? 'email',
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at,
    workspaces: workspacesByUser[u.id] ?? [],
  }))
})
