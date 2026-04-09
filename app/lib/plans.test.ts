import { describe, it, expect } from 'vitest'
import { PLANS } from './plans'

describe('PLANS', () => {
  it('free plan has 500 visit limit', () => {
    expect(PLANS.free.visitsPerMonth).toBe(500)
  })

  it('free plan shows branding', () => {
    expect(PLANS.free.showBranding).toBe(true)
  })

  it('paid plans do not show branding', () => {
    expect(PLANS.starter.showBranding).toBe(false)
    expect(PLANS.growth.showBranding).toBe(false)
    expect(PLANS.agency.showBranding).toBe(false)
  })

  it('agency plan has unlimited experiments', () => {
    expect(PLANS.agency.experiments).toBe(Infinity)
  })

  it('growth plan supports multivariate', () => {
    expect(PLANS.growth.multivariate).toBe(true)
  })

  it('starter plan does not support multivariate', () => {
    expect(PLANS.starter.multivariate).toBe(false)
  })

  it('all plan visit limits are in ascending order', () => {
    const limits = [
      PLANS.free.visitsPerMonth,
      PLANS.starter.visitsPerMonth,
      PLANS.growth.visitsPerMonth,
      PLANS.agency.visitsPerMonth,
    ]
    for (let i = 1; i < limits.length; i++) {
      expect(limits[i]).toBeGreaterThan(limits[i - 1])
    }
  })
})
