import { describe, it, expect } from 'vitest'
import { findRuleMatch } from '../src/index'

interface Rule { param: string; value: string }

const makeVariant = (id: string, rules: Rule[]) => ({
  id,
  name: `Variant ${id}`,
  traffic_weight: 50,
  target_url: 'https://example.com',
  rules,
})

describe('findRuleMatch', () => {
  it('returns null when no variants have rules', () => {
    const variants = [makeVariant('a', []), makeVariant('b', [])]
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch(variants, params)).toBeNull()
  })

  it('returns matching variant when rule matches', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const varB = makeVariant('b', [])
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch([varA, varB], params)).toBe(varA)
  })

  it('returns null when param present but value does not match', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_source=google')
    expect(findRuleMatch([varA], params)).toBeNull()
  })

  it('returns null when matching param is absent', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_medium=email')
    expect(findRuleMatch([varA], params)).toBeNull()
  })

  it('uses OR logic — returns variant if any rule matches', () => {
    const varA = makeVariant('a', [
      { param: 'utm_source', value: 'facebook' },
      { param: 'utm_medium', value: 'email' },
    ])
    const params = new URLSearchParams('utm_medium=email')
    expect(findRuleMatch([varA], params)).toBe(varA)
  })

  it('returns first matching variant when multiple variants have matching rules', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const varB = makeVariant('b', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('utm_source=facebook')
    expect(findRuleMatch([varA, varB], params)).toBe(varA)
  })

  it('returns null when params are empty', () => {
    const varA = makeVariant('a', [{ param: 'utm_source', value: 'facebook' }])
    const params = new URLSearchParams('')
    expect(findRuleMatch([varA], params)).toBeNull()
  })
})
