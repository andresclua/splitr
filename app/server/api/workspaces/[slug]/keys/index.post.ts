import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { generateApiKey } from '~/lib/apiKeys'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  // Verify owner
  const { data: ws } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .single()

  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .eq('role', 'owner')
    .maybeSingle()

  if (!member) throw createError({ statusCode: 403, message: 'Only owners can create API keys' })

  const { raw, hash: key_hash, prefix: key_prefix } = generateApiKey()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ workspace_id: ws.id, key_hash, key_prefix })
    .select('id, key_prefix, created_at')
    .single()

  if (error) throw createError({ statusCode: 500, message: error.message })

  // Return full key only once
  return { ...data, key: raw }
})
