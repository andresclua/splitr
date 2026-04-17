import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const id = getRouterParam(event, 'id')!
  const variantId = getRouterParam(event, 'variantId')!
  const body = (await readBody(event)) ?? {}

  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Workspace check
  const { data: ws } = await supabase
    .from('workspaces').select('id').eq('slug', slug).single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  // Membership check
  const { data: member } = await supabase
    .from('workspace_members').select('role')
    .eq('workspace_id', ws.id).eq('user_id', user.id).maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  // Experiment check
  const { data: exp } = await supabase
    .from('experiments').select('id, status')
    .eq('id', id).eq('workspace_id', ws.id).single()
  if (!exp) throw createError({ statusCode: 404, message: 'Experiment not found' })
  if (exp.status === 'completed') throw createError({ statusCode: 400, message: 'Cannot edit variants of a completed experiment' })

  // Variant check
  const { data: variant } = await supabase
    .from('variants').select('id')
    .eq('id', variantId).eq('experiment_id', id).single()
  if (!variant) throw createError({ statusCode: 404, message: 'Variant not found' })

  // Validate name
  const name: string = (body.name ?? '').trim()
  if (!name) throw createError({ statusCode: 400, message: 'Name is required' })

  // Build update
  const updates: Record<string, unknown> = { name }
  if ('description' in body) {
    updates.description = (body.description ?? '').trim() || null
  }
  if (body.rules === null) {
    updates.rules = []
  } else if (Array.isArray(body.rules)) {
    updates.rules = (body.rules as { param: string; value: string }[])
      .filter(r => typeof r.param === 'string' && typeof r.value === 'string' && r.param.trim() && r.value.trim())
      .map(r => ({ param: r.param.trim(), value: r.value.trim() }))
  }

  const { error } = await supabase
    .from('variants').update(updates)
    .eq('id', variantId).eq('experiment_id', id)

  if (error) throw createError({ statusCode: 500, message: error.message })

  return { id: variantId }
})
