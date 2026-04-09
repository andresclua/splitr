import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const { email, role = 'member' } = await readBody<{ email: string; role?: string }>(event)

  if (!email) throw createError({ statusCode: 400, message: 'Email is required' })

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, name')
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

  if (!owner) throw createError({ statusCode: 403, message: 'Only owners can invite members' })

  const token = randomBytes(32).toString('hex')
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('workspace_invites')
    .insert({ workspace_id: ws.id, email, token, role, expires_at })
    .select()
    .single()

  if (error) throw createError({ statusCode: 400, message: error.message })

  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'http://localhost:3000'

  return {
    ...data,
    invite_url: `${appUrl}/invite/${token}`,
  }
})
