import { serverSupabaseUser, serverSupabaseServiceRole } from '#supabase/server'

const ADMIN_EMAIL = 'andresclua@gmail.com'

const PLAN_PRICES: Record<string, Record<string, number>> = {
  starter: { monthly: 29, annual: 29 },
  growth:  { monthly: 79, annual: 79 },
}

const PLAN_LIMITS = {
  experiments: { free: 3, starter: 3, growth: Infinity },
  members:     { free: 1, starter: 5, growth: Infinity },
}

export default defineEventHandler(async (event) => {
  const user = await serverSupabaseUser(event)
  if (!user || user.email !== ADMIN_EMAIL) {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }

  const supabase = serverSupabaseServiceRole(event)
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  // ── Workspaces ────────────────────────────────────────────
  const { data: workspacesRaw } = await supabase
    .from('workspaces')
    .select('id, name, slug, plan, billing_period, created_at, stripe_customer_id, is_demo')
    .order('created_at', { ascending: false })

  const workspaces = workspacesRaw ?? []

  // ── Members per workspace ─────────────────────────────────
  const { data: membersRaw } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role')

  const membersByWs: Record<string, number> = {}
  for (const m of membersRaw ?? []) {
    membersByWs[m.workspace_id] = (membersByWs[m.workspace_id] ?? 0) + 1
  }

  // ── Experiments per workspace ─────────────────────────────
  const { data: experimentsRaw } = await supabase
    .from('experiments')
    .select('id, workspace_id, status')

  const expByWs: Record<string, { total: number; active: number }> = {}
  for (const e of experimentsRaw ?? []) {
    if (!expByWs[e.workspace_id]) expByWs[e.workspace_id] = { total: 0, active: 0 }
    expByWs[e.workspace_id].total++
    if (e.status === 'active') expByWs[e.workspace_id].active++
  }

  // ── Events last 30 days per workspace ────────────────────
  const { data: eventsRaw } = await supabase
    .from('events')
    .select('workspace_id, event_type')
    .gte('created_at', thirtyDaysAgo)

  const eventsByWs: Record<string, { impressions: number; conversions: number }> = {}
  let totalImpressions30d = 0
  let totalConversions30d = 0

  for (const e of eventsRaw ?? []) {
    if (!eventsByWs[e.workspace_id]) eventsByWs[e.workspace_id] = { impressions: 0, conversions: 0 }
    if (e.event_type === 'impression') {
      eventsByWs[e.workspace_id].impressions++
      totalImpressions30d++
    } else if (e.event_type === 'conversion') {
      eventsByWs[e.workspace_id].conversions++
      totalConversions30d++
    }
  }

  // ── Events this month (for MoM comparison) ───────────────
  const { data: eventsMonthRaw } = await supabase
    .from('events')
    .select('event_type')
    .gte('created_at', monthStart)

  let impressionsThisMonth = 0
  let conversionsThisMonth = 0
  for (const e of eventsMonthRaw ?? []) {
    if (e.event_type === 'impression') impressionsThisMonth++
    else if (e.event_type === 'conversion') conversionsThisMonth++
  }

  // ── Last API key activity per workspace ──────────────────
  const { data: apiKeysRaw } = await supabase
    .from('api_keys')
    .select('workspace_id, last_used_at')
    .order('last_used_at', { ascending: false })

  const lastApiKeyByWs: Record<string, string | null> = {}
  for (const k of apiKeysRaw ?? []) {
    if (!lastApiKeyByWs[k.workspace_id]) {
      lastApiKeyByWs[k.workspace_id] = k.last_used_at
    }
  }

  // ── MRR + plan counts ────────────────────────────────────
  const planCounts = { free: 0, starter: 0, growth: 0 }
  let mrr = 0

  for (const ws of workspaces) {
    const plan = ws.plan as string
    const period = ws.billing_period as string
    if (plan === 'free') planCounts.free++
    else if (plan === 'starter') { planCounts.starter++; mrr += PLAN_PRICES.starter?.[period] ?? 29 }
    else if (plan === 'growth')  { planCounts.growth++;  mrr += PLAN_PRICES.growth?.[period]  ?? 79 }
  }

  // ── Compose workspace rows ────────────────────────────────
  const workspacesOut = workspaces.map((ws) => {
    const plan = ws.plan as keyof typeof PLAN_LIMITS.experiments
    const expLimit = PLAN_LIMITS.experiments[plan] ?? 3
    const memberLimit = PLAN_LIMITS.members[plan] ?? 1
    const exps = expByWs[ws.id] ?? { total: 0, active: 0 }
    const events = eventsByWs[ws.id] ?? { impressions: 0, conversions: 0 }
    const members = membersByWs[ws.id] ?? 0

    return {
      ...ws,
      member_count: members,
      experiment_count: exps.total,
      active_experiments: exps.active,
      experiment_limit: isFinite(expLimit) ? expLimit : null,
      member_limit: isFinite(memberLimit) ? memberLimit : null,
      impressions_30d: events.impressions,
      conversions_30d: events.conversions,
      conv_rate_30d: events.impressions
        ? Math.round((events.conversions / events.impressions) * 1000) / 10
        : null,
      last_active: lastApiKeyByWs[ws.id] ?? null,
    }
  })

  return {
    total_workspaces: workspaces.filter(w => !w.is_demo).length,
    plan_counts: planCounts,
    total_experiments: (experimentsRaw ?? []).length,
    mrr,
    total_impressions_30d: totalImpressions30d,
    total_conversions_30d: totalConversions30d,
    impressions_this_month: impressionsThisMonth,
    conversions_this_month: conversionsThisMonth,
    workspaces: workspacesOut,
  }
})
