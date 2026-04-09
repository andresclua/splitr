import { describe, it, expect, vi, beforeEach } from 'vitest'
import { routeAnalytics } from '../src/analytics'

const mockPayload = {
  experimentId: 'exp_123',
  experimentName: 'Hero Test',
  variantId: 'var_456',
  variantName: 'Variant B',
  sessionId: 'anon_abc',
  timestamp: new Date().toISOString(),
}

describe('routeAnalytics', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  })

  it('calls fetch for each enabled destination', async () => {
    const destinations = [
      { provider: 'ga4', enabled: true, config: { measurement_id: 'G-123', api_secret: 'secret' } },
      { provider: 'posthog', enabled: true, config: { api_key: 'phc_xxx', host: 'https://app.posthog.com' } },
    ]
    await routeAnalytics(destinations, mockPayload)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  it('skips disabled destinations', async () => {
    const destinations = [
      { provider: 'ga4', enabled: false, config: {} },
      { provider: 'mixpanel', enabled: true, config: { project_token: 'tok' } },
    ]
    await routeAnalytics(destinations, mockPayload)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  it('does not throw if one destination fails', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockRejectedValueOnce(new Error('GA4 is down'))
      .mockResolvedValueOnce({ ok: true })
    )
    const destinations = [
      { provider: 'ga4', enabled: true, config: { measurement_id: 'G-123', api_secret: 'x' } },
      { provider: 'mixpanel', enabled: true, config: { project_token: 'tok' } },
    ]
    await expect(routeAnalytics(destinations, mockPayload)).resolves.not.toThrow()
  })

  it('sends correct GA4 payload structure', async () => {
    const destinations = [{
      provider: 'ga4', enabled: true,
      config: { measurement_id: 'G-TESTID', api_secret: 'test_secret' },
    }]
    await routeAnalytics(destinations, mockPayload)

    const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(url).toContain('G-TESTID')
    expect(url).toContain('test_secret')

    const body = JSON.parse(options.body)
    expect(body.events[0].name).toBe('experiment_assigned')
    expect(body.events[0].params.experiment_id).toBe('exp_123')
    expect(body.events[0].params.variant_name).toBe('Variant B')
  })

  it('signs webhook requests with HMAC when secret is provided', async () => {
    const destinations = [{
      provider: 'webhook', enabled: true,
      config: { url: 'https://myserver.com/hook', secret: 'mysecret' },
    }]
    await routeAnalytics(destinations, mockPayload)

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.headers['X-Splitr-Signature']).toBeDefined()
    expect(options.headers['X-Splitr-Signature']).toMatch(/^sha256=/)
  })

  it('sends no signature header when no secret configured', async () => {
    const destinations = [{
      provider: 'webhook', enabled: true,
      config: { url: 'https://myserver.com/hook' },
    }]
    await routeAnalytics(destinations, mockPayload)

    const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(options.headers['X-Splitr-Signature']).toBeUndefined()
  })
})
