import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data, error } = await supabase
    .from('workspace_members')
    .select('role, workspace:workspaces(id, name, slug, plan, domain, auto_join_domain)')
    .eq('user_id', user.id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return (data ?? []).map((d: any) => ({ ...d.workspace, role: d.role }))
})
