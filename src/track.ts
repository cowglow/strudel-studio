// one entry in src/tracks.json, written by scripts/tracks.ts
export interface Track {
  slug: string
  title: string
  bars: number
  bpm: number
  seconds: number
  mp3: string // relative to the site root
  source: string // the exact code that was rendered, relative to the site root
  strudel: string // opens that code in the strudel.cc REPL
}
