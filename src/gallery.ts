import type { Track } from './track.ts'
import tracks from './tracks.json'

const list = document.querySelector<HTMLUListElement>('#tracks')!

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}

function renderTrack(track: Track): HTMLLIElement {
  const li = document.createElement('li')

  const title = document.createElement('h2')
  title.textContent = track.title

  const meta = document.createElement('p')
  meta.textContent = `${track.bpm} bpm · ${track.bars} bars · ${formatTime(track.seconds)}`

  const credit = document.createElement('p')
  credit.textContent = track.by.length ? `by ${track.by.join(', ')}` : ''

  const audio = document.createElement('audio')
  audio.controls = true
  audio.preload = 'none'
  // paths are relative to the site root; the gallery lives one level down
  audio.src = `../${track.mp3}`

  // the exact code behind the recording, to keep or to play with in the REPL
  const download = document.createElement('a')
  download.href = `../${track.source}`
  download.download = `${track.slug}.txt`
  download.textContent = 'Download code'

  const open = document.createElement('a')
  open.href = track.strudel
  open.target = '_blank'
  open.rel = 'noopener'
  open.textContent = 'Open in Strudel ↗'

  const links = document.createElement('p')
  links.className = 'track-links'
  links.append(download, ' · ', open)

  li.append(title, credit, meta, audio, links)
  return li
}

if (tracks.length) {
  list.append(...(tracks as Track[]).map(renderTrack))
} else {
  list.innerHTML = '<li>Nothing here yet.</li>'
}

// only one track plays at a time: starting one pauses the rest.
// `play` doesn't bubble, so listen in the capture phase.
document.addEventListener(
  'play',
  (event) => {
    for (const audio of document.querySelectorAll('audio')) {
      if (audio !== event.target) audio.pause()
    }
  },
  true,
)
