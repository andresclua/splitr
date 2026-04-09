import { describe, it, expect } from 'vitest'
import { assignVariant } from '../src/index'

describe('assignVariant', () => {
  const variants = [
    { id: 'control', traffic_weight: 50 },
    { id: 'variant-b', traffic_weight: 50 },
  ]

  it('always returns a valid variant id', () => {
    for (let i = 0; i < 100; i++) {
      const result = assignVariant(variants)
      expect(['control', 'variant-b']).toContain(result)
    }
  })

  it('distributes traffic within ±5% of configured weights', () => {
    const counts = { control: 0, 'variant-b': 0 }
    const iterations = 10_000

    for (let i = 0; i < iterations; i++) {
      const result = assignVariant(variants)
      counts[result as keyof typeof counts]++
    }

    const controlRatio = counts.control / iterations
    expect(controlRatio).toBeGreaterThan(0.45)
    expect(controlRatio).toBeLessThan(0.55)
  })

  it('handles uneven weights correctly (70/30)', () => {
    const unevenVariants = [
      { id: 'a', traffic_weight: 70 },
      { id: 'b', traffic_weight: 30 },
    ]
    const counts = { a: 0, b: 0 }
    for (let i = 0; i < 10_000; i++) {
      const result = assignVariant(unevenVariants)
      counts[result as keyof typeof counts]++
    }
    const aRatio = counts.a / 10_000
    expect(aRatio).toBeGreaterThan(0.65)
    expect(aRatio).toBeLessThan(0.75)
  })

  it('handles single variant (100% weight)', () => {
    const single = [{ id: 'only', traffic_weight: 100 }]
    for (let i = 0; i < 50; i++) {
      expect(assignVariant(single)).toBe('only')
    }
  })

  it('handles three variants', () => {
    const three = [
      { id: 'a', traffic_weight: 33 },
      { id: 'b', traffic_weight: 33 },
      { id: 'c', traffic_weight: 34 },
    ]
    for (let i = 0; i < 100; i++) {
      expect(['a', 'b', 'c']).toContain(assignVariant(three))
    }
  })
})
