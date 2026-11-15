// Renders compositions/*.js (see scripts/tracks.ts for where the outputs go),
// then syncs the published tracks and src/tracks.json for the gallery.
//
//   npm run render                 render new or changed compositions
//   npm run render -- jungle-01    render only these slugs
//   npm run render -- --force      re-render everything
//
// Each composition needs a header comment, e.g.:
//   // @title Jungle 01
//   // @bars 24
//   // @status complete     (or backlog: rendered locally, kept out of the gallery)

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Mp3Encoder } from '@breezystack/lamejs'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import { type Composition, readCompositions } from './compositions.ts'
import { dirs, needsRender, type RenderFacts, syncTracks } from './tracks.ts'

const ROOT = join(import.meta.dirname, '..')
const { compositions: COMPOSITIONS, backlog: RENDERS } = dirs(ROOT)
const MP3_KBPS = 192
const RENDER_TIMEOUT_MS = 10 * 60 * 1000

async function loadCompositions(): Promise<Composition[]> {
  const compositions = await readCompositions(COMPOSITIONS)
  for (const c of compositions) {
    if (Number.isNaN(c.bars)) throw new Error(`${basename(c.file)}: missing or invalid "// @bars <n>" header`)
  }
  return compositions
}

// renderPatternAudio writes 16-bit PCM; find the fmt and data chunks
function decodeWav(buf: Buffer) {
  let channels = 0
  let sampleRate = 0
  let offset = 12
  while (offset < buf.length) {
    const id = buf.toString('ascii', offset, offset + 4)
    const size = buf.readUInt32LE(offset + 4)
    const body = offset + 8
    if (id === 'fmt ') {
      channels = buf.readUInt16LE(body + 2)
      sampleRate = buf.readUInt32LE(body + 4)
    } else if (id === 'data') {
      const samples = new Int16Array(buf.buffer.slice(buf.byteOffset + body, buf.byteOffset + body + size))
      const frames = samples.length / channels
      const left = new Int16Array(frames)
      const right = new Int16Array(frames)
      for (let i = 0; i < frames; i++) {
        left[i] = samples[i * channels]
        right[i] = samples[i * channels + (channels - 1)]
      }
      return { sampleRate, left, right }
    }
    offset = body + size + (size % 2)
  }
  throw new Error('invalid wav: no data chunk')
}

function encodeMp3(wav: Buffer): Buffer {
  const { sampleRate, left, right } = decodeWav(wav)
  const encoder = new Mp3Encoder(2, sampleRate, MP3_KBPS)
  const chunks: Buffer[] = []
  // lamejs returns Int8Array views; wrap them without copying
  const push = (c: Int8Array | Uint8Array) => chunks.push(Buffer.from(c.buffer, c.byteOffset, c.byteLength))
  const block = 1152
  for (let i = 0; i < left.length; i += block) {
    push(encoder.encodeBuffer(left.subarray(i, i + block), right.subarray(i, i + block)))
  }
  push(encoder.flush())
  return Buffer.concat(chunks)
}

async function main() {
  const args = process.argv.slice(2)
  const force = args.includes('--force')
  const only = args.filter((a) => !a.startsWith('--'))

  const compositions = await loadCompositions()
  const unknown = only.filter((slug) => !compositions.some((c) => c.slug === slug))
  if (unknown.length) throw new Error(`unknown composition(s): ${unknown.join(', ')}`)

  const todo: Composition[] = []
  for (const c of compositions) {
    if (only.length && !only.includes(c.slug)) continue
    if (force || only.length || (await needsRender(ROOT, c.slug, c.code))) todo.push(c)
  }

  if (todo.length) {
    await mkdir(RENDERS, { recursive: true })

    const server = await createServer({
      root: ROOT,
      logLevel: 'error',
      server: { port: 0 },
      // prebundle up front so the page doesn't reload mid-render
      optimizeDeps: { include: ['@strudel/web'], entries: ['render/index.html'] },
    })
    await server.listen()
    const url = `${server.resolvedUrls!.local[0]}render/`

    const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
    const context = await browser.newContext({ acceptDownloads: true })

    try {
      for (const c of todo) {
        const started = Date.now()
        process.stdout.write(`rendering ${c.slug} (${c.bars} bars)… `)

        // fresh page per composition, so no audio or sample state leaks between them
        const page = await context.newPage()
        page.on('pageerror', (err) => console.error(`\n  [page] ${err.message}`))
        page.on('console', (msg) => msg.type() === 'error' && console.error(`\n  [console] ${msg.text()}`))
        await page.goto(url)
        await page.waitForFunction(() => typeof window.renderComposition === 'function')

        const [download, { cps }] = await Promise.all([
          page.waitForEvent('download', { timeout: RENDER_TIMEOUT_MS }),
          page.evaluate(([code, bars, name]) => window.renderComposition(code, bars, name), [c.code, c.bars, c.slug] as const),
        ])
        const out = (ext: string) => join(RENDERS, `${c.slug}.${ext}`)
        await download.saveAs(out('wav'))
        await page.close()

        // everything lands in renders/ first; syncTracks publishes complete ones
        const facts: RenderFacts = {
          bars: c.bars,
          bpm: Math.round(cps * 60 * 4),
          seconds: Math.round((c.bars / cps) * 10) / 10,
        }
        await writeFile(out('mp3'), encodeMp3(await readFile(out('wav'))))
        await writeFile(out('txt'), c.code)
        await writeFile(out('json'), JSON.stringify(facts, null, 2) + '\n')
        console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
      }
    } finally {
      await browser.close()
      await server.close()
    }
  } else {
    console.log('nothing to render (use --force to re-render)')
  }

  const tracks = await syncTracks(ROOT)
  console.log(`${tracks.length} track(s) in the gallery`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
