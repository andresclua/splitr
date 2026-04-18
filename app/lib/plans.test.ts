import { describe, it, expect } from 'vitest'
import { PLANS } from './plans'

describe('PLANS', () => {
  it('free plan has 250 impression limit', () => {
    expect(PLANS.free.impressionsPerMonth).toBe(250)
  })

  it('free plan has 1 experiment limit', () => {
    expect(PLANS.free.experiments).toBe(1)
  })

  it('free plan has 1 workspace limit', () => {
    expect(PLANS.free.workspaces).toBe(1)
  })

  it('free plan shows branding', () => {
    expect(PLANS.free.showBranding).toBe(true)
  })

  it('paid plans do not show branding', () => {
    expect(PLANS.starter.showBranding).toBe(false)
    expect(PLANS.growth.showBranding).toBe(false)
  })

  it('growth plan supports multivariate', () => {
    expect(PLANS.growth.multivariate).toBe(true)
  })

  it('starter plan does not support multivariate', () => {
    expect(PLANS.starter.multivariate).toBe(false)
  })

  it('scale plan has Infinity limits', () => {
    expect(PLANS.scale.impressionsPerMonth).toBe(Infinity)
    expect(PLANS.scale.experiments).toBe(Infinity)
    expect(PLANS.scale.workspaces).toBe(Infinity)
  })

  it('impression limits are in ascending order', () => {
    expect(PLANS.starter.impressionsPerMonth).toBeGreaterThan(PLANS.free.impressionsPerMonth)
    expect(PLANS.growth.impressionsPerMonth).toBeGreaterThan(PLANS.starter.impressionsPerMonth)
  })
})
