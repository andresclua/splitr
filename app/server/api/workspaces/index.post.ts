import { createClient } from '@supabase/supabase-js'
import { extractDomain, isPublicDomain } from '~/lib/publicDomains'

interface Body {
  userId: string
  workspaceName: string
  email: string
  joinWorkspaceId?: string | null
}

export default defineEventHandler(async (event) => {
  const { userId, workspaceName, email, joinWorkspaceId } = await readBody<Body>(event)

  if (!userId || !workspaceName) {
    throw createError({ statusCode: 400, message: 'userId and workspaceName are required' })
  }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  // Join existing workspace via domain match
  if (joinWorkspaceId) {
    const { error } = await supabase
      .from('workspace_members')
      .insert({ workspace_id: joinWorkspaceId, user_id: userId, role: 'member' })

    if (error) throw createError({ statusCode: 400, message: error.message })

    const { data: ws } = await supabase
      .from('workspaces')
      .select('slug')
      .eq('id', joinWorkspaceId)
      .single()

    return { slug: ws?.slug }
  }

  // Create new workspace
  const baseSlug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Ensure slug uniqueness
  let slug = baseSlug
  let i = 1
  while (true) {
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = `${baseSlug}-${i++}`
  }

  const domain = email && !isPublicDomain(email) ? extractDomain(email) : null

  const { data: ws, error: wsErr } = await supabase
    .from('workspaces')
    .insert({ name: workspaceName, slug, domain })
    .select()
    .single()

  if (wsErr) throw createError({ statusCode: 400, message: wsErr.message })

  const { error: memberErr } = await supabase
    .from('workspace_members')
    .insert({ workspace_id: ws.id, user_id: userId, role: 'owner' })

  if (memberErr) throw createError({ statusCode: 500, message: memberErr.message })

  return { slug: ws.slug }
})
