import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

const ADMIN_EMAIL = 'andresclua@gmail.com'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const { userId, workspaceName } = await readBody<{ userId: string; workspaceName: string }>(event)
  if (!userId || !workspaceName) {
    throw createError({ statusCode: 400, message: 'userId and workspaceName are required' })
  }

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    throw createError({ statusCode: 409, message: `Slug "${slug}" already exists. Choose a different name.` })
  }

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName, slug })
    .select()
    .single()

  if (wsErr) throw createError({ statusCode: 400, message: wsErr.message })

  const { error: memberErr } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: userId, role: 'owner' })

  if (memberErr) throw createError({ statusCode: 500, message: memberErr.message })

  return { slug: ws.slug }
})
