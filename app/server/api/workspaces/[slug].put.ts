import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const { name, domain, auto_join_domain } = await readBody<{
    name: string
    domain: string | null
    auto_join_domain: boolean
  }>(event)

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Verify owner
  const { data: member } = await supabase
    .from('workspace_members')
    .select('role, workspace_id, workspace:workspaces(id, slug)')
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (!member || (member.workspace as any)?.slug !== slug) {
    throw createError({ statusCode: 403, message: 'Only owners can update workspace settings' })
  }

  const { data, error } = await supabase
    .from('workspaces')
    .update({ name, domain: domain || null, auto_join_domain: !!auto_join_domain })
    .eq('id', (member.workspace as any).id)
    .select()
    .single()

  if (error) throw createError({ statusCode: 400, message: error.message })
  return data
})
