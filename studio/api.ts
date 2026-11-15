// Dev-server-only API for the studio page. `apply: 'serve'` keeps it out of
// `vite build`, so none of this exists on the published site.
//
//   GET  /api/compositions          [{ slug, title, bars, status }]
//   GET  /api/compositions/<slug>   source code
//   POST /api/compositions/<slug>   create from the template (409 if it exists)
//   PUT  /api/compositions/<slug>   save source code (404 if it doesn't exist), then sync tracks
//   POST /api/rename/<slug>         { to } renames the composition and its renders
//   POST /api/render/<slug>         run `npm run render -- <slug>`, returns its output
//   GET  /api/audio/<slug>          the last rendered mp3, published or backlog
//
// There is deliberately no delete: compositions are only ever renamed or moved to the backlog.

import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { readFile, stat, writeFile } from 'node:fs/promises'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import { readCompositions, SLUG, template } from '../scripts/compositions.ts'
import { findOutput, renameComposition, syncTracks } from '../scripts/tracks.ts'

const MAX_BODY = 1024 * 1024

function send(res: ServerResponse, status: number, body: unknown, type = 'application/json') {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.end(type === 'application/json' ? JSON.stringify(body) : String(body))
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = ''
    req.setEncoding('utf8')
    req.on('data', (chunk: string) => {
      body += chunk
      if (body.length > MAX_BODY) reject(new Error('body too large'))
    })
    req.on('end', () => resolve(body))
    req.on('error', reject)
  })
}

// runs the render script for one composition; resolves with its combined output
function render(root: string, slug: string): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      ['--no-warnings=ExperimentalWarning', join(root, 'scripts', 'render.ts'), slug],
      { cwd: root },
    )
    let output = ''
    child.stdout.on('data', (d) => (output += d))
    child.stderr.on('data', (d) => (output += d))
    child.on('close', (code) => resolve({ ok: code === 0, output }))
  })
}

export function studioApi(): Plugin {
  return {
    name: 'studio-api',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root
      const dir = join(root, 'compositions')
      let rendering = false

      server.middlewares.use('/api/compositions', async (req, res) => {
        try {
          const slug = decodeURIComponent((req.url ?? '/').split('?')[0].slice(1))

          if (!slug) {
            if (req.method !== 'GET') return send(res, 405, { error: 'method not allowed' })
            const list = await readCompositions(dir)
            return send(
              res,
              200,
              list.map(({ slug, title, bars, status }) => ({ slug, title, bars: bars || null, status })),
            )
          }

          if (!SLUG.test(slug)) return send(res, 400, { error: 'slugs use a-z, 0-9 and -' })
          const file = join(dir, `${slug}.js`)
          const exists = existsSync(file)

          switch (req.method) {
            case 'GET':
              if (!exists) return send(res, 404, { error: `no composition "${slug}"` })
              return send(res, 200, await readFile(file, 'utf8'), 'text/plain; charset=utf-8')
            case 'POST': {
              if (exists) return send(res, 409, { error: `"${slug}" already exists` })
              const { title } = JSON.parse((await readBody(req)) || '{}')
              await writeFile(file, template(title || slug))
              return send(res, 201, { slug })
            }
            case 'PUT':
              if (!exists) return send(res, 404, { error: `no composition "${slug}"` })
              await writeFile(file, await readBody(req))
              await syncTracks(root) // a @status change publishes or unpublishes
              return send(res, 204, '')
            default:
              return send(res, 405, { error: 'method not allowed' })
          }
        } catch (err) {
          send(res, 500, { error: err instanceof Error ? err.message : String(err) })
        }
      })

      server.middlewares.use('/api/rename', async (req, res) => {
        try {
          const from = decodeURIComponent((req.url ?? '/').slice(1))
          if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
          const { to } = JSON.parse((await readBody(req)) || '{}')
          if (!SLUG.test(from) || !SLUG.test(to ?? '')) return send(res, 400, { error: 'slugs use a-z, 0-9 and -' })
          if (rendering) return send(res, 409, { error: 'wait for the render to finish' })
          await renameComposition(root, from, to)
          send(res, 200, { slug: to })
        } catch (err) {
          send(res, 409, { error: err instanceof Error ? err.message : String(err) })
        }
      })

      server.middlewares.use('/api/audio', async (req, res) => {
        const slug = decodeURIComponent((req.url ?? '/').split('?')[0].slice(1))
        const mp3 = SLUG.test(slug) ? findOutput(root, slug, 'mp3') : undefined
        if (!mp3) return send(res, 404, { error: 'not rendered yet' })
        res.setHeader('Content-Type', 'audio/mpeg')
        res.setHeader('Content-Length', (await stat(mp3)).size)
        res.setHeader('Cache-Control', 'no-store')
        res.end(await readFile(mp3))
      })

      server.middlewares.use('/api/render', async (req, res) => {
        const slug = decodeURIComponent((req.url ?? '/').slice(1))
        if (req.method !== 'POST') return send(res, 405, { error: 'method not allowed' })
        if (!SLUG.test(slug)) return send(res, 400, { error: 'slugs use a-z, 0-9 and -' })
        if (rendering) return send(res, 409, { error: 'a render is already running' })
        rendering = true
        try {
          send(res, 200, await render(root, slug))
        } finally {
          rendering = false
        }
      })
    },
  }
}
