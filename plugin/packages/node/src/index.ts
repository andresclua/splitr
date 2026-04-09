/**
 * @splitr/node
 *
 * Express / Node.js middleware adapter for Splitr A/B testing.
 * Works anywhere Node.js runs: Railway, Render, Fly.io, Heroku, AWS EC2/ECS,
 * self-hosted servers, or any Express-compatible framework (Fastify via @fastify/express, etc).
 *
 * Usage (Express):
 *   import express from 'express'
 *   import { splitrMiddleware } from '@splitr/node'
 *
 *   const app = express()
 *
 *   app.use(splitrMiddleware({
 *     apiKey: process.env.SPLITR_API_KEY!,
 *     apiUrl: process.env.SPLITR_API_URL!,
 *   }))
 *
 *   // Your routes come after — they receive the rewritten req.url
 *   app.get('/', handler)
 *   app.get('/variant-b', handler)
 *
 * How it works:
 *   Unlike edge runtimes, Node.js middleware cannot transparently proxy to another
 *   origin. Instead it rewrites req.url to the variant's pathname, then calls next()
 *   so Express routes the request to the correct handler.
 *
 *   This means your variant pages must exist as routes in the SAME app:
 *     Control:   GET /          → renders homepage v1
 *     Variant B: GET /variant-b → renders homepage v2
 *
 *   The browser always sees the original URL (/) — the rewrite is internal.
 *
 * Note on latency:
 *   Unlike CF Workers / Vercel Edge / Netlify Edge, this runs in your app server
 *   process — not at the CDN edge. Variant assignment adds ~1ms of in-process work.
 *   The Splitr API call is cached for 60s so it doesn't add per-request latency.
 */

import { createSplitEngine } from '@splitr/core'
import type { SplitEngineOptions } from '@splitr/core'

// Compatible with Express and any framework using (req, res, next) signature
export interface NodeRequest {
  url?: string
  originalUrl?: string
  protocol?: string
  headers: Record<string, string | string[] | undefined>
}

export interface NodeResponse {
  setHeader(name: string, value: string): void
  getHeader(name: string): string | string[] | number | undefined
}

export type NextFunction = (err?: unknown) => void

let engine: ReturnType<typeof createSplitEngine> | null = null

export function splitrMiddleware(options: SplitEngineOptions) {
  return async function middleware(
    req: NodeRequest,
    res: NodeResponse,
    next: NextFunction
  ): Promise<void> {
    if (!engine) engine = createSplitEngine(options)

    try {
      // Reconstruct full URL from Node request
      const protocol = req.protocol ?? 'http'
      const host = (req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost') as string
      const path = req.originalUrl ?? req.url ?? '/'
      const fullUrl = `${protocol}://${host}${path}`

      const cookieHeader = (req.headers['cookie'] as string) ?? ''
      const result = await engine.process(fullUrl, cookieHeader)

      if (!result) return next()

      // Rewrite req.url so Express routes to the variant handler
      const variantPath = new URL(result.targetUrl).pathname
      req.url = variantPath
      if (req.originalUrl) req.originalUrl = variantPath

      if (result.isNewAssignment) {
        const maxAge = 60 * 60 * 24 * 30
        const cookie = `${result.cookieName}=${result.variantId}; Path=/; Max-Age=${maxAge}; SameSite=Lax`

        // Append without overwriting existing Set-Cookie headers
        const existing = res.getHeader('Set-Cookie')
        if (Array.isArray(existing)) {
          res.setHeader('Set-Cookie', [...existing, cookie])
        } else if (existing) {
          res.setHeader('Set-Cookie', [existing as string, cookie])
        } else {
          res.setHeader('Set-Cookie', cookie)
        }
      }

      next()
    } catch {
      // Never block a request due to Splitr errors
      next()
    }
  }
}
