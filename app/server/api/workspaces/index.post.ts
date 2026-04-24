import { createClient } from '@supabase/supabase-js'
import { extractDomain, isPublicDomain } from '~/lib/publicDomains'
import { sendWelcomeEmail } from '~/server/utils/resend'
import { PLANS } from '~/lib/plans'
import type { PlanKey } from '~/lib/plans'

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

  // Enforce workspace limit based on plan
  if (!joinWorkspaceId) {
    const { data: ownedMembers } = await supabase
      .from('workspace_members')
      .select('workspace:workspaces(plan, is_demo)')
      .eq('user_id', userId)
      .eq('role', 'owner')

    const ownedWorkspaces = (ownedMembers ?? [])
      .map((m: any) => m.workspace)
      .filter((w: any) => w && !w.is_demo)

    const highestPlan = ownedWorkspaces.reduce((best: string, w: any) => {
      const order = ['free', 'starter', 'growth', 'scale']
      return order.indexOf(w.plan) > order.indexOf(best) ? w.plan : best
    }, 'free')

    const planConfig = PLANS[(highestPlan as PlanKey)] ?? PLANS.free
    const limit = planConfig.workspaces
    if (isFinite(limit as number) && ownedWorkspaces.length >= (limit as number)) {
      throw createError({
        statusCode: 403,
        message: `Your ${highestPlan} plan allows up to ${limit} workspace${limit === 1 ? '' : 's'}. Upgrade to create more.`,
      })
    }
  }

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
  const slug = workspaceName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

  // Reject if slug already taken
  const { data: existing } = await supabase
    .from('workspaces')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()

  if (existing) {
    throw createError({
      statusCode: 409,
      message: `This project already exists. Contact whoever manages this website to get access to Koryla.`,
    })
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

  // Send welcome email (fire-and-forget)
  const config = useRuntimeConfig()
  const appUrl = config.public.appUrl || 'http://localhost:3000'
  sendWelcomeEmail(email, workspaceName, appUrl).catch(console.error)

  return { slug: ws.slug }
})
