// Renders compositions/*.js to renders/<slug>.wav and public/audio/<slug>.mp3,
// then rewrites src/tracks.json for the gallery.
//
//   npm run render                 render new or changed compositions
//   npm run render -- jungle-01    render only these slugs
//   npm run render -- --force      re-render everything
//
// Each composition needs a header comment, e.g.:
//   // @title Jungle 01
//   // @bars 24

import { existsSync } from 'node:fs'
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { Mp3Encoder } from '@breezystack/lamejs'
import { chromium } from 'playwright'
import { createServer } from 'vite'
import type { Track } from '../src/track.ts'

const ROOT = join(import.meta.dirname, '..')
const COMPOSITIONS = join(ROOT, 'compositions')
const WAV_DIR = join(ROOT, 'renders')
const MP3_DIR = join(ROOT, 'public', 'audio')
const TRACKS_JSON = join(ROOT, 'src', 'tracks.json')
const MP3_KBPS = 192
const RENDER_TIMEOUT_MS = 10 * 60 * 1000

interface Composition {
  slug: string
  file: string
  code: string
  title: string
  bars: number
}

function parseHeader(code: string): Record<string, string> {
  const header: Record<string, string> = {}
  for (const line of code.split('\n')) {
    const match = line.match(/^\s*\/\/\s*@(\w+)\s+(.+?)\s*$/)
    if (match) header[match[1]] = match[2]
    else if (line.trim() && !line.trim().startsWith('//')) break // header ends at first code line
  }
  return header
}

async function loadCompositions(): Promise<Composition[]> {
  const files = (await readdir(COMPOSITIONS)).filter((f) => f.endsWith('.js')).sort()
  return Promise.all(
    files.map(async (f) => {
      const file = join(COMPOSITIONS, f)
      const code = await readFile(file, 'utf8')
      const slug = basename(f, '.js')
      const header = parseHeader(code)
      const bars = Number(header.bars)
      if (!Number.isInteger(bars) || bars <= 0) throw new Error(`${f}: missing or invalid "// @bars <n>" header`)
      return { slug, file, code, title: header.title ?? slug, bars }
    }),
  )
}

async function isStale(c: Composition): Promise<boolean> {
  const mp3 = join(MP3_DIR, `${c.slug}.mp3`)
  if (!existsSync(mp3)) return true
  return (await stat(c.file)).mtimeMs > (await stat(mp3)).mtimeMs
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

async function readTracks(): Promise<Track[]> {
  if (!existsSync(TRACKS_JSON)) return []
  return JSON.parse(await readFile(TRACKS_JSON, 'utf8'))
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
    if (force || only.length || (await isStale(c))) todo.push(c)
  }

  const previous = new Map((await readTracks()).map((t) => [t.slug, t]))
  const rendered = new Map<string, Track>()

  if (todo.length) {
    await mkdir(WAV_DIR, { recursive: true })
    await mkdir(MP3_DIR, { recursive: true })

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
        const wavPath = join(WAV_DIR, `${c.slug}.wav`)
        await download.saveAs(wavPath)
        await page.close()

        await writeFile(join(MP3_DIR, `${c.slug}.mp3`), encodeMp3(await readFile(wavPath)))

        rendered.set(c.slug, {
          slug: c.slug,
          title: c.title,
          bars: c.bars,
          bpm: Math.round(cps * 60 * 4),
          seconds: Math.round((c.bars / cps) * 10) / 10,
          mp3: `audio/${c.slug}.mp3`,
        })
        console.log(`done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
      }
    } finally {
      await browser.close()
      await server.close()
    }
  } else {
    console.log('nothing to render (use --force to re-render)')
  }

  // keep entries for compositions that still exist and have audio
  const tracks: Track[] = []
  for (const c of compositions) {
    const track = rendered.get(c.slug) ?? previous.get(c.slug)
    if (track && existsSync(join(MP3_DIR, `${c.slug}.mp3`))) tracks.push({ ...track, title: c.title })
  }
  await writeFile(TRACKS_JSON, JSON.stringify(tracks, null, 2) + '\n')
  console.log(`wrote ${tracks.length} track(s) to src/tracks.json`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
