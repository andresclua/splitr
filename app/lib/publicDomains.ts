export const PUBLIC_DOMAINS = new Set([
  'gmail.com', 'googlemail.com',
  'hotmail.com', 'hotmail.es', 'hotmail.co.uk',
  'outlook.com', 'outlook.es',
  'yahoo.com', 'yahoo.es', 'yahoo.co.uk',
  'icloud.com', 'me.com', 'mac.com',
  'live.com', 'live.es',
  'proton.me', 'protonmail.com',
  'tutanota.com', 'tuta.com',
  'aol.com', 'msn.com',
  'yandex.com', 'yandex.ru',
  'zoho.com',
  'fastmail.com',
  'hey.com',
])

export function isPublicDomain(email: string): boolean {
  const domain = email.split('@')[1]?.toLowerCase()
  return !domain || PUBLIC_DOMAINS.has(domain)
}

export function extractDomain(email: string): string | null {
  const domain = email.split('@')[1]?.toLowerCase()
  if (!domain || PUBLIC_DOMAINS.has(domain)) return null
  return domain
}
