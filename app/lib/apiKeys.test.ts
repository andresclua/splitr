import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey, generateSlug, generateInviteToken, KEY_PREFIX_LENGTH } from './apiKeys'

/**
 * API Keys
 * --------
 * Koryla uses API keys to authenticate the Cloudflare Worker with a workspace.
 *
 * Flow:
 *  1. Owner generates a key in Settings → the full key is shown ONCE
 *  2. Owner copies it into wrangler.toml (WORKER_API_KEY secret)
 *  3. The worker sends the key in every request: Authorization: Bearer sk_live_...
 *  4. The Nitro server hashes the incoming key and looks it up in api_keys.key_hash
 *
 * We never store the raw key — only its SHA-256 hash.
 * The prefix (first 16 chars) is stored separately so users can identify keys
 * in the dashboard without exposing the secret.
 */
describe('generateApiKey', () => {
  it('key starts with "sk_live_" so workers and humans can identify Koryla keys at a glance', () => {
    const { raw } = generateApiKey()
    expect(raw.startsWith('sk_live_')).toBe(true)
  })

  it('key contains only hex chars after the prefix — safe to use in HTTP headers and env vars', () => {
    const { raw } = generateApiKey()
    expect(raw).toMatch(/^sk_live_[a-f0-9]+$/)
  })

  it('key is 56 chars total (8-char prefix + 48 hex = 192 bits of entropy)', () => {
    // 24 random bytes → 48 hex chars → ~10^57 possible keys, brute-force infeasible
    const { raw } = generateApiKey()
    expect(raw.length).toBe(56)
  })

  it('raw key is NEVER stored — only its SHA-256 hash goes in the database', () => {
    const { raw, hash } = generateApiKey()
    // The hash looks nothing like the original key
    expect(hash).not.toContain('sk_live_')
    expect(hash).toMatch(/^[a-f0-9]{64}$/) // 32 bytes = 64 hex chars
  })

  it('same raw key always produces the same hash — so the server can verify incoming keys', () => {
    const { raw } = generateApiKey()
    const hashA = hashApiKey(raw)
    const hashB = hashApiKey(raw)
    expect(hashA).toBe(hashB)
  })

  it('different keys always produce different hashes — so one key cannot impersonate another', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.hash).not.toBe(b.hash)
  })

  it('prefix is first 16 chars of the raw key — shown in dashboard to help owners identify keys', () => {
    // e.g. "sk_live_a3f9c2b1" displayed as "sk_live_a3f9c2b1••••••••"
    const { raw, prefix } = generateApiKey()
    expect(prefix).toBe(raw.substring(0, KEY_PREFIX_LENGTH))
    expect(prefix.length).toBe(KEY_PREFIX_LENGTH)
  })

  it('every call produces a unique key — collisions would allow one customer to access another workspace', () => {
    const keys = Array.from({ length: 100 }, () => generateApiKey().raw)
    const unique = new Set(keys)
    expect(unique.size).toBe(100)
  })
})

/**
 * Slugs
 * -----
 * Workspace slugs appear in URLs: /dashboard/acme-inc
 * They must be URL-safe, lowercase, and human-readable.
 */
describe('generateSlug', () => {
  it('converts workspace name to a URL-safe lowercase slug', () => {
    expect(generateSlug('Acme Inc')).toBe('acme-inc')
    // Result is used directly in: /dashboard/acme-inc
  })

  it('replaces any non-alphanumeric sequence with a single hyphen', () => {
    expect(generateSlug('Foo & Bar')).toBe('foo-bar')
    expect(generateSlug('Hello   World')).toBe('hello-world')
  })

  it('strips special chars so the slug is safe in URLs without encoding', () => {
    expect(generateSlug('Acme & Co. (2024)')).toBe('acme-co-2024')
  })

  it('strips leading/trailing hyphens that would make the URL look broken', () => {
    expect(generateSlug('---Acme---')).toBe('acme')
  })

  it('collapses consecutive separators into one hyphen', () => {
    expect(generateSlug('Foo   ---   Bar')).toBe('foo-bar')
  })
})

/**
 * Invite tokens
 * -------------
 * When an owner invites a teammate, we generate a token and store it in
 * workspace_invites. The invite link is: /invite/<token>
 * Tokens expire after 7 days and are single-use.
 */
describe('generateInviteToken', () => {
  it('token is a 64-char hex string — safe to use as a URL path segment', () => {
    const token = generateInviteToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
    // e.g. /invite/a3f9c2b1d4e5f6...
  })

  it('token has 256 bits of entropy — cannot be guessed by iterating URLs', () => {
    // 32 random bytes = 2^256 possible tokens
    expect(generateInviteToken().length).toBe(64)
  })

  it('every invite gets a unique token — so old invites cannot be reused', () => {
    const tokens = Array.from({ length: 50 }, generateInviteToken)
    expect(new Set(tokens).size).toBe(50)
  })
})
