import { describe, it, expect } from 'vitest'
import { isPublicDomain, extractDomain } from './publicDomains'

describe('isPublicDomain', () => {
  it('returns true for gmail.com', () => {
    expect(isPublicDomain('user@gmail.com')).toBe(true)
  })

  it('returns true for all common providers', () => {
    const publicEmails = [
      'a@gmail.com', 'a@hotmail.com', 'a@outlook.com',
      'a@icloud.com', 'a@yahoo.com', 'a@proton.me',
    ]
    publicEmails.forEach(email => {
      expect(isPublicDomain(email)).toBe(true)
    })
  })

  it('returns false for company domains', () => {
    expect(isPublicDomain('john@acme.com')).toBe(false)
    expect(isPublicDomain('dev@startup.io')).toBe(false)
    expect(isPublicDomain('admin@mycompany.es')).toBe(false)
  })

  it('returns true for malformed emails', () => {
    expect(isPublicDomain('notanemail')).toBe(true)
    expect(isPublicDomain('')).toBe(true)
  })

  it('is case insensitive', () => {
    expect(isPublicDomain('user@Gmail.COM')).toBe(true)
  })
})

describe('extractDomain', () => {
  it('returns null for public emails', () => {
    expect(extractDomain('user@gmail.com')).toBeNull()
  })

  it('returns domain for company emails', () => {
    expect(extractDomain('john@acme.com')).toBe('acme.com')
  })

  it('lowercases the domain', () => {
    expect(extractDomain('john@ACME.com')).toBe('acme.com')
  })
})
