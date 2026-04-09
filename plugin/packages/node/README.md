# @splitr/node

A/B testing middleware for Express and any Node.js server.
Works on Railway, Render, Fly.io, Heroku, AWS EC2/ECS, or any Node host.

## Installation

```bash
npm install @splitr/node
```

## Setup (Express)

```ts
import express from 'express'
import { splitrMiddleware } from '@splitr/node'

const app = express()

// Add Splitr before your routes
app.use(splitrMiddleware({
  apiKey: process.env.SPLITR_API_KEY!,
  apiUrl: process.env.SPLITR_API_URL!,   // your deployed Splitr app URL
}))

// Variant pages must exist as real routes in the same app
app.get('/', (req, res) => res.render('home-control'))
app.get('/variant-b', (req, res) => res.render('home-variant-b'))
app.get('/pricing', (req, res) => res.render('pricing-control'))
app.get('/pricing-b', (req, res) => res.render('pricing-variant-b'))
```

### Environment variables

```bash
SPLITR_API_KEY=sk_live_...
SPLITR_API_URL=https://your-splitr-app.vercel.app
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
     ├── fetches Splitr config once every 60s (cached in memory)
     ├── reads sp_<experimentId> cookie
     ├── assigns variant, rewrites req.url to /variant-b
     └── sets Set-Cookie header on response
     │
     ▼
Express routes /variant-b to its handler
Browser sees original URL (/) — no redirect, no flicker
```

## Difference vs edge adapters

| | @splitr/node | @splitr/next / @splitr/netlify |
|--|--|--|
| Runs at | Your app server | CDN edge node near the user |
| Latency added | ~1ms (in-process) | ~1ms (in-process) |
| Splitr API call | Cached 60s | Cached 60s |
| Variants on different origin | ❌ (same app only) | ✅ |
| Zero flicker | ✅ | ✅ |

Both approaches are server-side — neither has the flicker problem of client-side tools.
The only difference is where the server runs.
