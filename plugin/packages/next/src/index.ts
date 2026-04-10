/**
 * @koryla/next
 *
 * Next.js middleware adapter for Koryla A/B testing.
 * Runs on the Vercel Edge Network — zero latency, zero flicker.
 *
 * Usage:
 *   // middleware.ts (project root)
 *   import { korylaMiddleware } from '@koryla/next'
 *
 *   export default korylaMiddleware({
 *     apiKey: process.env.KORYLA_API_KEY!,
 *     apiUrl: process.env.KORYLA_API_URL!,   // e.g. https://your-app.koryla.com
 *   })
 *
 *   export const config = {
 *     matcher: ['/', '/pricing', '/landing'],  // pages to A/B test
 *   }
 *
 * How it works:
 *   1. Middleware intercepts the request before Next.js renders anything
 *   2. Calls Koryla API to get active experiments (cached 60s in memory)
 *   3. Checks for an existing variant cookie — if found, sticks with it
 *   4. If no cookie, randomly assigns a variant by traffic weight
 *   5. Rewrites the request URL to the variant's target_url (server-side, no redirect)
 *   6. Sets a 30-day cookie so the user always sees the same variant
 *
 * The browser never sees the rewrite — it only ever receives the assigned variant.
 * This eliminates the flash of original content (FOOC) that client-side tools like
 * VWO or Optimizely cause.
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSplitEngine } from '@koryla/core'
import type { SplitEngineOptions } from '@koryla/core'

// Engine is created once per cold start and reused across requests
let engine: ReturnType<typeof createSplitEngine> | null = null

export function korylaMiddleware(options: SplitEngineOptions) {
  return async function middleware(request: NextRequest): Promise<NextResponse> {
    // Lazy-init engine (Next.js middleware may run in edge runtime where
    // top-level await is not always available)
    if (!engine) engine = createSplitEngine(options)

    const result = await engine.process(
      request.url,
      request.headers.get('cookie') ?? ''
    )

    // No matching experiment — let Next.js handle it normally
    if (!result) return NextResponse.next()

    // Rewrite to variant URL — the browser sees the original URL
    const response = NextResponse.rewrite(new URL(result.targetUrl))

    // Only set cookie on new assignments to avoid unnecessary Set-Cookie headers
    if (result.isNewAssignment) {
      response.cookies.set(result.cookieName, result.variantId, {
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
        path: '/',
      })
    }

    return response
  }
}
