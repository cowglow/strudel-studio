// Where rendered tracks live, and keeping the published set in line with each
// composition's @status. Shared by the render script and the studio's dev API.
//
// A render produces, per composition:
//   <slug>.mp3   the audio
//   <slug>.txt   the exact code that was rendered (download / open in strudel.cc)
//   <slug>.json  render facts (bars, bpm, seconds)
// complete → public/tracks/ (published), backlog → renders/ (local only).
// renders/<slug>.wav, the master, always stays in renders/.

import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Track } from '../src/track.ts'
import { readCompositions, withoutStatus } from './compositions.ts'

export const OUTPUTS = ['mp3', 'txt', 'json'] as const

export interface RenderFacts {
  bars: number
  bpm: number
  seconds: number
}

export function dirs(root: string) {
  return {
    compositions: join(root, 'compositions'),
    published: join(root, 'public', 'tracks'),
    backlog: join(root, 'renders'),
    tracksJson: join(root, 'src', 'tracks.json'),
  }
}

// a rendered output, in whichever of the two folders it currently is
export function findOutput(root: string, slug: string, ext: string): string | undefined {
  const { published, backlog } = dirs(root)
  return [published, backlog].map((d) => join(d, `${slug}.${ext}`)).find(existsSync)
}

// true when the code changed since the last render (status changes don't count)
export async function needsRender(root: string, slug: string, code: string): Promise<boolean> {
  const rendered = findOutput(root, slug, 'txt')
  if (!rendered || !findOutput(root, slug, 'mp3')) return true
  return withoutStatus(await readFile(rendered, 'utf8')) !== withoutStatus(code)
}

// same encoding as strudel.cc's share links (code2hash in @strudel/core)
export function strudelUrl(code: string): string {
  return `https://strudel.cc/#${encodeURIComponent(Buffer.from(code, 'utf8').toString('base64'))}`
}

async function move(from: string, to: string) {
  if (!existsSync(from)) return
  await mkdir(join(to, '..'), { recursive: true })
  await rename(from, to)
}

// moves outputs to match each composition's status, then rewrites src/tracks.json
export async function syncTracks(root: string): Promise<Track[]> {
  const d = dirs(root)
  const compositions = await readCompositions(d.compositions)
  const tracks: Track[] = []

  for (const c of compositions) {
    const [target, other] = c.status === 'complete' ? [d.published, d.backlog] : [d.backlog, d.published]
    for (const ext of OUTPUTS) await move(join(other, `${c.slug}.${ext}`), join(target, `${c.slug}.${ext}`))

    const facts = join(d.published, `${c.slug}.json`)
    if (c.status !== 'complete' || !existsSync(facts)) continue
    const { bars, bpm, seconds }: RenderFacts = JSON.parse(await readFile(facts, 'utf8'))
    const code = await readFile(join(d.published, `${c.slug}.txt`), 'utf8')
    tracks.push({
      slug: c.slug,
      title: c.title,
      bars,
      bpm,
      seconds,
      mp3: `tracks/${c.slug}.mp3`,
      source: `tracks/${c.slug}.txt`,
      strudel: strudelUrl(code),
    })
  }

  await writeFile(d.tracksJson, JSON.stringify(tracks, null, 2) + '\n')
  return tracks
}

// renames a composition and everything rendered from it; compositions are never deleted
export async function renameComposition(root: string, from: string, to: string) {
  const d = dirs(root)
  const target = join(d.compositions, `${to}.js`)
  if (existsSync(target)) throw new Error(`"${to}" already exists`)
  await rename(join(d.compositions, `${from}.js`), target)
  for (const dir of [d.published, d.backlog]) {
    for (const ext of [...OUTPUTS, 'wav']) await move(join(dir, `${from}.${ext}`), join(dir, `${to}.${ext}`))
  }
  await syncTracks(root)
}
