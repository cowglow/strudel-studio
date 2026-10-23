// one entry in src/tracks.json, written by scripts/render.ts
export interface Track {
  slug: string
  title: string
  bars: number
  bpm: number
  seconds: number
  mp3: string // relative to the site root
}
