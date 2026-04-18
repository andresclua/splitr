import { PLANS } from './plans'
import type { PlanKey } from './plans'

export function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function nextMonthReset(): string {
  const now = new Date()
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return next.toISOString().split('T')[0]!
}

export async function getMonthlyImpressions(
  supabase: { from: Function },
  workspaceId: string
): Promise<number> {
  const { data } = await (supabase.from('usage_monthly') as any)
    .select('visits_count')
    .eq('workspace_id', workspaceId)
    .eq('month', currentMonth())
    .maybeSingle()
  return (data as any)?.visits_count ?? 0
}

export async function isOverImpressionLimit(
  supabase: { from: Function },
  workspaceId: string,
  plan: PlanKey
): Promise<boolean> {
  const limit = PLANS[plan]?.impressionsPerMonth
  if (!limit || !isFinite(limit as number)) return false
  const used = await getMonthlyImpressions(supabase, workspaceId)
  return used >= (limit as number)
}

export async function incrementMonthlyImpressions(
  supabase: { rpc: Function },
  workspaceId: string
): Promise<void> {
  await (supabase.rpc as any)('increment_monthly_impressions', {
    p_workspace_id: workspaceId,
    p_month: currentMonth(),
  })
}
