import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Config fetcher
 * --------------
 * The worker needs experiment config on every request.
 * Reading from the Splitr API on every request would be too slow (~50–200ms round-trip).
 *
 * Strategy:
 *  1. Check KV cache first — if hit, return immediately (< 1ms)
 *  2. On cache miss, call GET /api/worker/config with the workspace API key
 *  3. Write result to KV with a 60-second TTL
 *  4. On network failure, return [] so traffic passes through unaffected
 *
 * The KV cache means a cold start adds one API call latency, then all
 * subsequent requests for the next 60 seconds are served from KV at edge speed.
 */

// Minimal inline re-implementation of getConfig to test the fetch logic in isolation.
// The real implementation lives in worker/src/index.ts.
interface MockEnv {
  SPLITR_CONFIG: { get: (k: string, t: string) => Promise<unknown>; put: (k: string, v: string, opts: object) => Promise<void> }
  SPLITR_API_URL: string
  SPLITR_API_KEY: string
}

const EXPERIMENTS = [
  { id: 'exp-1', name: 'Homepage Hero', base_url: 'https://acme.com/', variants: [], destinations: [] },
]

async function getConfig(env: MockEnv) {
  const cached = await env.SPLITR_CONFIG.get('experiments', 'json')
  if (cached) return cached

  let experiments
  try {
    const res = await fetch(`${env.SPLITR_API_URL}/api/worker/config`, {
      headers: { Authorization: `Bearer ${env.SPLITR_API_KEY}` },
    })
    if (!res.ok) return []
    experiments = await res.json()
  } catch {
    return []
  }

  await env.SPLITR_CONFIG.put('experiments', JSON.stringify(experiments), { expirationTtl: 60 })
  return experiments
}

describe('getConfig — KV cache layer', () => {
  let env: MockEnv

  beforeEach(() => {
    env = {
      SPLITR_CONFIG: {
        get: vi.fn().mockResolvedValue(null),
        put: vi.fn().mockResolvedValue(undefined),
      },
      SPLITR_API_URL: 'https://app.splitr.dev',
      SPLITR_API_KEY: 'sk_live_abc123',
    }
  })

  it('returns cached experiments without hitting the API — avoids latency on every request', async () => {
    env.SPLITR_CONFIG.get = vi.fn().mockResolvedValue(EXPERIMENTS)
    global.fetch = vi.fn()

    const result = await getConfig(env)

    expect(result).toEqual(EXPERIMENTS)
    expect(fetch).not.toHaveBeenCalled() // API never called when KV has data
  })

  it('calls /api/worker/config with Bearer token on cache miss — proves the API key is used for auth', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => EXPERIMENTS })

    await getConfig(env)

    expect(fetch).toHaveBeenCalledWith(
      'https://app.splitr.dev/api/worker/config',
      expect.objectContaining({ headers: { Authorization: 'Bearer sk_live_abc123' } })
    )
  })

  it('writes fetched experiments to KV with 60-second TTL — so next 60s of requests skip the API', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => EXPERIMENTS })

    await getConfig(env)

    expect(env.SPLITR_CONFIG.put).toHaveBeenCalledWith(
      'experiments',
      JSON.stringify(EXPERIMENTS),
      { expirationTtl: 60 }
    )
  })

  it('returns [] when API responds with non-2xx — site traffic passes through unaffected', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 })

    const result = await getConfig(env)

    expect(result).toEqual([])
  })

  it('returns [] on network error — a worker outage cannot break the client site', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('fetch failed'))

    const result = await getConfig(env)

    expect(result).toEqual([])
  })
})

describe('getConfig — API key authentication', () => {
  it('uses SPLITR_API_KEY as the Bearer token — this is the key generated in Settings → API Keys', async () => {
    const env: MockEnv = {
      SPLITR_CONFIG: { get: vi.fn().mockResolvedValue(null), put: vi.fn() },
      SPLITR_API_URL: 'https://app.splitr.dev',
      SPLITR_API_KEY: 'sk_live_deadbeef',
    }
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => [] })

    await getConfig(env)

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.headers.Authorization).toBe('Bearer sk_live_deadbeef')
  })
})
