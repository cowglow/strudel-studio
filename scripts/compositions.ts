// Reading compositions/*.js, shared by the render script and the studio's dev API.

import { readdir, readFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

// file names double as URL segments and output names
export const SLUG = /^[a-z0-9][a-z0-9-]*$/

// stamped into every new composition. @by is strudel.cc's own metadata tag for the
// author (as are @title and @url), so the credit travels with downloads and share links.
export const AUTHOR = 'COWGLOW'
export const ORIGIN = "COWGLOW's strudel studio & gallery"

// complete: published in the gallery. backlog: work in progress, kept off the site.
export type Status = 'complete' | 'backlog'

export interface Composition {
  slug: string
  file: string
  code: string
  title: string
  by: string[] // @by, comma-separated like strudel.cc's parser allows
  bars: number // NaN when the header has no valid @bars
  status: Status
}

const STATUS_LINE = /^\s*\/\/\s*@status\b.*$/m

// `// @key value` comment lines at the top of the file
export function parseHeader(code: string): Record<string, string> {
  const header: Record<string, string> = {}
  for (const line of code.split('\n')) {
    const match = line.match(/^\s*\/\/\s*@(\w+)\s+(.+?)\s*$/)
    if (match) header[match[1]] = match[2]
    else if (line.trim() && !line.trim().startsWith('//')) break // header ends at first code line
  }
  return header
}

// the code minus its @status line: changing status alone doesn't call for a re-render
export function withoutStatus(code: string): string {
  return code.replace(STATUS_LINE, '').trim()
}

export function toComposition(slug: string, file: string, code: string): Composition {
  const header = parseHeader(code)
  const bars = Number(header.bars)
  return {
    slug,
    file,
    code,
    title: header.title ?? slug,
    by: (header.by ?? '').split(',').map((name) => name.trim()).filter(Boolean),
    bars: Number.isInteger(bars) && bars > 0 ? bars : NaN,
    // only an explicit `@status complete` publishes
    status: header.status === 'complete' ? 'complete' : 'backlog',
  }
}

export async function readCompositions(dir: string): Promise<Composition[]> {
  const files = (await readdir(dir)).filter((f) => f.endsWith('.js')).sort()
  return Promise.all(
    files.map(async (f) => {
      const file = join(dir, f)
      return toComposition(basename(f, '.js'), file, await readFile(file, 'utf8'))
    }),
  )
}

// starting point for a new composition; must stay pasteable into strudel.cc
export function template(title: string): string {
  return `// @title ${title}
// @by ${AUTHOR}
// @origin ${ORIGIN}
// @bars 8
// @status backlog
// paste into https://strudel.cc and press ctrl+enter

// one cycle = one bar of 4/4
setcpm(120 / 4)

// samples aren't preloaded when rendering, so load them here (await: ready before render)
await samples('github:tidalcycles/dirt-samples')

s("bd*2 [~ bd] sd ~, hh*8")
`
}
