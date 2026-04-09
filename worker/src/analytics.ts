import type { AnalyticsDestination } from './index'

export interface AnalyticsPayload {
  experimentId: string
  experimentName: string
  variantId: string
  variantName: string
  sessionId: string
  timestamp: string
}

export async function routeAnalytics(
  destinations: AnalyticsDestination[],
  payload: AnalyticsPayload
) {
  const tasks = destinations
    .filter(d => d.enabled)
    .map(d => sendToDestination(d, payload))

  const results = await Promise.allSettled(tasks)

  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      console.error(`Analytics destination ${destinations[i].provider} failed:`, result.reason)
    }
  })
}

async function sendToDestination(dest: AnalyticsDestination, payload: AnalyticsPayload) {
  switch (dest.provider) {
    case 'ga4':         return sendGA4(dest.config, payload)
    case 'posthog':     return sendPostHog(dest.config, payload)
    case 'plausible':   return sendPlausible(dest.config, payload)
    case 'mixpanel':    return sendMixpanel(dest.config, payload)
    case 'amplitude':   return sendAmplitude(dest.config, payload)
    case 'segment':     return sendSegment(dest.config, payload)
    case 'rudderstack': return sendRudderStack(dest.config, payload)
    case 'webhook':     return sendWebhook(dest.config, payload)
  }
}

export async function sendGA4(config: Record<string, string>, p: AnalyticsPayload) {
  await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${config.measurement_id}&api_secret=${config.api_secret}`, {
    method: 'POST',
    body: JSON.stringify({
      client_id: p.sessionId,
      events: [{ name: 'experiment_assigned', params: {
        experiment_id: p.experimentId,
        experiment_name: p.experimentName,
        variant_id: p.variantId,
        variant_name: p.variantName,
        engagement_time_msec: 1,
      }}],
    }),
  })
}

export async function sendPostHog(config: Record<string, string>, p: AnalyticsPayload) {
  await fetch(`${config.host}/capture/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.api_key,
      event: '$experiment_started',
      distinct_id: p.sessionId,
      properties: {
        $feature_flag: p.experimentId,
        $feature_flag_response: p.variantName,
        experiment_name: p.experimentName,
      },
    }),
  })
}

export async function sendPlausible(config: Record<string, string>, p: AnalyticsPayload) {
  await fetch('https://plausible.io/api/event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'Splitr/1.0' },
    body: JSON.stringify({
      domain: config.domain,
      name: 'Experiment Assigned',
      url: `https://${config.domain}/`,
      props: { experiment: p.experimentName, variant: p.variantName },
    }),
  })
}

export async function sendMixpanel(config: Record<string, string>, p: AnalyticsPayload) {
  await fetch('https://api.mixpanel.com/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify([{
      event: 'Experiment Assigned',
      properties: {
        token: config.project_token,
        distinct_id: p.sessionId,
        experiment_id: p.experimentId,
        experiment_name: p.experimentName,
        variant_id: p.variantId,
        variant_name: p.variantName,
        time: Math.floor(Date.now() / 1000),
      },
    }]),
  })
}

export async function sendAmplitude(config: Record<string, string>, p: AnalyticsPayload) {
  await fetch('https://api2.amplitude.com/2/httpapi', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.api_key,
      events: [{
        user_id: p.sessionId,
        event_type: 'Experiment Assigned',
        event_properties: {
          experiment_id: p.experimentId,
          experiment_name: p.experimentName,
          variant_id: p.variantId,
          variant_name: p.variantName,
        },
      }],
    }),
  })
}

export async function sendSegment(config: Record<string, string>, p: AnalyticsPayload) {
  const auth = btoa(config.write_key + ':')
  await fetch('https://api.segment.io/v1/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      userId: p.sessionId,
      event: 'Experiment Assigned',
      properties: {
        experimentId: p.experimentId,
        experimentName: p.experimentName,
        variantId: p.variantId,
        variantName: p.variantName,
      },
      timestamp: p.timestamp,
    }),
  })
}

export async function sendRudderStack(config: Record<string, string>, p: AnalyticsPayload) {
  const auth = btoa(config.write_key + ':')
  await fetch(`${config.data_plane_url}/v1/track`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      userId: p.sessionId,
      event: 'Experiment Assigned',
      properties: {
        experimentId: p.experimentId,
        variantName: p.variantName,
      },
    }),
  })
}

export async function sendWebhook(config: Record<string, string>, p: AnalyticsPayload) {
  const body = JSON.stringify(p)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }

  if (config.secret) {
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(config.secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    )
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body))
    headers['X-Splitr-Signature'] = 'sha256=' + Array.from(new Uint8Array(sig))
      .map(b => b.toString(16).padStart(2, '0')).join('')
  }

  if (config.headers) {
    try { Object.assign(headers, JSON.parse(config.headers)) } catch {}
  }

  await fetch(config.url, { method: 'POST', headers, body })
}
