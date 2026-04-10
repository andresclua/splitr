export const PROVIDERS = {
  ga4: {
    name: 'Google Analytics 4',
    fields: [
      { key: 'measurement_id', label: 'Measurement ID', placeholder: 'G-XXXXXXXXXX' },
      { key: 'api_secret', label: 'API Secret', placeholder: 'xxxxxxxxxxxx',
        help: 'GA4 Admin → Data Streams → Measurement Protocol API secrets' },
    ],
  },
  posthog: {
    name: 'PostHog',
    fields: [
      { key: 'api_key', label: 'Project API Key', placeholder: 'phc_xxxxxxxxxxxx' },
      { key: 'host', label: 'Host', placeholder: 'https://app.posthog.com',
        help: 'Change if self-hosting PostHog' },
    ],
  },
  plausible: {
    name: 'Plausible',
    fields: [
      { key: 'domain', label: 'Domain', placeholder: 'yoursite.com' },
      { key: 'api_key', label: 'API Key', placeholder: 'xxxxxxxxxxxx' },
    ],
  },
  mixpanel: {
    name: 'Mixpanel',
    fields: [
      { key: 'project_token', label: 'Project Token', placeholder: 'xxxxxxxxxxxx' },
    ],
  },
  amplitude: {
    name: 'Amplitude',
    fields: [
      { key: 'api_key', label: 'API Key', placeholder: 'xxxxxxxxxxxx' },
    ],
  },
  segment: {
    name: 'Segment',
    fields: [
      { key: 'write_key', label: 'Write Key', placeholder: 'xxxxxxxxxxxx' },
    ],
  },
  rudderstack: {
    name: 'RudderStack',
    fields: [
      { key: 'write_key', label: 'Write Key', placeholder: 'xxxxxxxxxxxx' },
      { key: 'data_plane_url', label: 'Data Plane URL', placeholder: 'https://yourrudder.com' },
    ],
  },
  webhook: {
    name: 'Custom Webhook',
    fields: [
      { key: 'url', label: 'Endpoint URL', placeholder: 'https://your-server.com/webhook' },
      { key: 'secret', label: 'Signing Secret', placeholder: 'Optional HMAC secret',
        help: 'We sign each request with HMAC-SHA256 so you can verify it came from Koryla' },
      { key: 'headers', label: 'Custom Headers', placeholder: '{"Authorization": "Bearer xxx"}' },
    ],
  },
} as const

export type ProviderKey = keyof typeof PROVIDERS
