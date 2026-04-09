import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const { token } = await readBody<{ token: string }>(event)
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: invite } = await supabase
    .from('workspace_invites')
    .select('id, workspace_id, role, expires_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!invite) throw createError({ statusCode: 404, message: 'Invite not found' })
  if (invite.accepted_at) throw createError({ statusCode: 400, message: 'Invite already used' })
  if (new Date(invite.expires_at) < new Date()) throw createError({ statusCode: 400, message: 'Invite expired' })

  // Add member
  await supabase
    .from('workspace_members')
    .upsert({ workspace_id: invite.workspace_id, user_id: user.id, role: invite.role })

  // Mark invite as accepted
  await supabase
    .from('workspace_invites')
    .update({ accepted_at: new Date().toISOString() })
    .eq('id', invite.id)

  return { success: true }
})
