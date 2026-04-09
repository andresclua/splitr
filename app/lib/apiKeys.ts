import { randomBytes, createHash } from 'crypto'

export const KEY_PREFIX_LENGTH = 16 // "sk_live_" + 8 hex chars

export function generateApiKey(): { raw: string; hash: string; prefix: string } {
  const raw = `sk_live_${randomBytes(24).toString('hex')}`
  const hash = createHash('sha256').update(raw).digest('hex')
  const prefix = raw.substring(0, KEY_PREFIX_LENGTH)
  return { raw, hash, prefix }
}

export function hashApiKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function generateInviteToken(): string {
  return randomBytes(32).toString('hex')
}
