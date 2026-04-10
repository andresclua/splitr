# @koryla/node

A/B testing middleware for Express and any Node.js server.
Works on Railway, Render, Fly.io, Heroku, AWS EC2/ECS, or any Node host.

## Installation

```bash
npm install @koryla/node
```

## Setup (Express)

```ts
import express from 'express'
import { korylaMiddleware } from '@koryla/node'

const app = express()

// Add Koryla before your routes
app.use(korylaMiddleware({
  apiKey: process.env.KORYLA_API_KEY!,
  apiUrl: process.env.KORYLA_API_URL!,   // your deployed Koryla app URL
}))

// Variant pages must exist as real routes in the same app
app.get('/', (req, res) => res.render('home-control'))
app.get('/variant-b', (req, res) => res.render('home-variant-b'))
app.get('/pricing', (req, res) => res.render('pricing-control'))
app.get('/pricing-b', (req, res) => res.render('pricing-variant-b'))
```

### Environment variables

```bash
KORYLA_API_KEY=sk_live_...
KORYLA_API_URL=https://your-koryla-app.vercel.app
```

## Important: variant pages must be in the same app

Unlike edge adapters that can proxy to any URL, the Node middleware rewrites
`req.url` internally and calls `next()`. This means:

- ✅ Your variant pages are routes in the same Express app
- ❌ Your variants are on a different domain/server

If your variants are on a different origin you'll need a reverse proxy
(nginx, Caddy) in front of your app instead.

## How it works

```
User visits /
     │
     ▼
Express middleware (in-process, ~1ms overhead)
     │
     ├── fetches Koryla config once every 60s (cached in memory)
     ├── reads sp_<experimentId> cookie
     ├── assigns variant, rewrites req.url to /variant-b
     └── sets Set-Cookie header on response
     │
     ▼
Express routes /variant-b to its handler
Browser sees original URL (/) — no redirect, no flicker
```

## Difference vs edge adapters

| | @koryla/node | @koryla/next / @koryla/netlify |
|--|--|--|
| Runs at | Your app server | CDN edge node near the user |
| Latency added | ~1ms (in-process) | ~1ms (in-process) |
| Koryla API call | Cached 60s | Cached 60s |
| Variants on different origin | ❌ (same app only) | ✅ |
| Zero flicker | ✅ | ✅ |

Both approaches are server-side — neither has the flicker problem of client-side tools.
The only difference is where the server runs.
