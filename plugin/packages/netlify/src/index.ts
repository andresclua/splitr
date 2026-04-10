/**
 * @koryla/netlify
 *
 * Netlify Edge Functions adapter for Koryla A/B testing.
 * Runs on Deno at the Netlify edge — zero latency, zero flicker.
 *
 * Usage:
 *   // netlify/edge-functions/koryla.ts
 *   import { korylaMiddleware } from '@koryla/netlify'
 *
 *   export default korylaMiddleware({
 *     apiKey: Deno.env.get('KORYLA_API_KEY')!,
 *     apiUrl: Deno.env.get('KORYLA_API_URL')!,
 *   })
 *
 *   export const config = {
 *     path: ['/', '/pricing', '/landing'],
 *   }
 *
 * How it works:
 *   Same as @koryla/next — see core package for algorithm details.
 *   Netlify-specific: uses context.rewrite() to serve variant content
 *   without a redirect, then appends Set-Cookie to the response.
 */

import { createSplitEngine } from '@koryla/core'
import type { SplitEngineOptions } from '@koryla/core'

// Netlify Edge Functions type (Deno-based, no @netlify/edge-functions import needed at runtime)
interface NetlifyContext {
  next: () => Promise<Response>
  rewrite: (url: string | URL) => Promise<Response>
}

let engine: ReturnType<typeof createSplitEngine> | null = null

export function korylaMiddleware(options: SplitEngineOptions) {
  return async function handler(request: Request, context: NetlifyContext): Promise<Response> {
    if (!engine) engine = createSplitEngine(options)

    const result = await engine.process(
      request.url,
      request.headers.get('cookie') ?? ''
    )

    if (!result) return context.next()

    // Rewrite to variant — context.rewrite fetches the new URL server-side
    const response = await context.rewrite(result.targetUrl)

    if (result.isNewAssignment) {
      // Clone so we can mutate headers (Response is immutable by default)
      const mutable = new Response(response.body, response)
      mutable.headers.append(
        'Set-Cookie',
        `${result.cookieName}=${result.variantId}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax`
      )
      return mutable
    }

    return response
  }
}
