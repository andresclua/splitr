import { createClient } from '@supabase/supabase-js'
import { isPublicDomain, extractDomain } from '~/lib/publicDomains'

export default defineEventHandler(async (event) => {
  const { email } = await readBody<{ email: string }>(event)

  if (!email || isPublicDomain(email)) {
    return { domain: null, workspace: null }
  }

  const domain = extractDomain(email)
  if (!domain) return { domain: null, workspace: null }

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  )

  const { data } = await supabase
    .from('workspaces')
    .select('id, name, slug')
    .eq('domain', domain)
    .eq('auto_join_domain', true)
    .maybeSingle()

  return { domain, workspace: data ?? null }
})
