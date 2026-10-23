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

  const audio = document.createElement('audio')
  audio.controls = true
  audio.preload = 'none'
  // mp3 paths are relative to the site root; the gallery lives one level down
  audio.src = `../${track.mp3}`

  li.append(title, meta, audio)
  return li
}

if (tracks.length) {
  list.append(...(tracks as Track[]).map(renderTrack))
} else {
  list.innerHTML = '<li>Nothing rendered yet. Run <code>npm run render</code>.</li>'
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
