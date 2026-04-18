import { serverSupabaseUser } from '#supabase/server'
import { createClient } from '@supabase/supabase-js'
import { PLANS } from '~/lib/plans'
import type { PlanKey } from '~/lib/plans'
import { getMonthlyImpressions, nextMonthReset } from '~/lib/usage'

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Unauthorized' })

  const slug = getRouterParam(event, 'slug')!
  const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

  const { data: ws } = await supabase
    .from('workspaces')
    .select('id, plan')
    .eq('slug', slug)
    .single()
  if (!ws) throw createError({ statusCode: 404, message: 'Workspace not found' })

  const { data: member } = await supabase
    .from('workspace_members')
    .select('id')
    .eq('workspace_id', ws.id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (!member) throw createError({ statusCode: 403, message: 'Not a member' })

  const plan = ((ws.plan ?? 'free') as PlanKey)
  const planLimits = PLANS[plan] ?? PLANS.free

  const [impressionsUsed, experimentsResult, ownedMembers] = await Promise.all([
    getMonthlyImpressions(supabase, ws.id),
    supabase
      .from('experiments')
      .select('id', { count: 'exact', head: true })
      .eq('workspace_id', ws.id)
      .in('status', ['draft', 'active', 'paused']),
    supabase
      .from('workspace_members')
      .select('workspace_id, workspace:workspaces(is_demo)')
      .eq('user_id', user.id)
      .eq('role', 'owner'),
  ])

  // Exclude demo workspaces from the count (Koryla's demo workspace is shown to all users but shouldn't count toward limits)
  const nonDemoWorkspaceCount = (ownedMembers.data ?? []).filter((m: any) => !m.workspace?.is_demo).length

  return {
    plan,
    impressions: {
      used: impressionsUsed,
      limit: planLimits.impressionsPerMonth,
    },
    experiments: {
      used: experimentsResult.count ?? 0,
      limit: planLimits.experiments,
    },
    workspaces: {
      used: nonDemoWorkspaceCount,
      limit: planLimits.workspaces,
    },
    resets_at: nextMonthReset(),
  }
})
