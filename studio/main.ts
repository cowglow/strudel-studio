import { StateEffect } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { StrudelMirror } from '@strudel/codemirror'
import { evalScope } from '@strudel/core'
import { miniAllStrings } from '@strudel/mini'
import { transpiler } from '@strudel/transpiler'
import { getAudioContext, initAudioOnFirstClick, registerSynthSounds, webaudioOutput } from '@strudel/webaudio'

type Status = 'complete' | 'backlog'

interface Entry {
  slug: string
  title: string
  bars: number | null
  status: Status
}

const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!
const pick = $<HTMLSelectElement>('#pick')
const statusPick = $<HTMLSelectElement>('#state')
const status = $<HTMLOutputElement>('#status')
const result = $<HTMLElement>('#result')
const preview = $<HTMLAudioElement>('#result audio')
const log = $<HTMLPreElement>('#log')
const renderButton = $<HTMLButtonElement>('#render')

const SLUG = /^[a-z0-9][a-z0-9-]*$/
const STATUS_LINE = /^\s*\/\/\s*@status\b.*$/m

// mirrors scripts/compositions.ts: only an explicit `@status complete` publishes
const statusOf = (code: string): Status =>
  code.match(STATUS_LINE)?.[0].match(/@status\s+(\w+)/)?.[1] === 'complete' ? 'complete' : 'backlog'

// rewrites (or adds, under the @bars line) the @status header line
function withStatus(code: string, status: Status): string {
  const line = `// @status ${status}`
  if (STATUS_LINE.test(code)) return code.replace(STATUS_LINE, line)
  return code.replace(/^(\s*\/\/\s*@bars\b.*)$/m, `$1\n${line}`).replace(/^(?![\s\S]*@status)/, `${line}\n`)
}

let slug = ''
let savedCode = ''
let playing = false

// same scope as @strudel/web's defaultPrebake, which the renderer uses,
// so what plays here is what gets rendered
miniAllStrings()
const mirror = new StrudelMirror({
  root: $('#editor'),
  bgFill: false,
  defaultOutput: webaudioOutput,
  getTime: () => getAudioContext().currentTime,
  transpiler,
  prebake: async () => {
    initAudioOnFirstClick()
    await Promise.all([
      evalScope(import('@strudel/core'), import('@strudel/mini'), import('@strudel/tonal'), import('@strudel/webaudio')),
      registerSynthSounds(),
    ])
  },
  onToggle: (started) => {
    playing = started
    if (started) preview.pause()
    updateStatus()
  },
  onEvalError: (err) => setStatus(`Error: ${err.message}`),
  afterEval: () => updateStatus(),
})

const isDirty = () => mirror.code !== savedCode

function setStatus(text: string) {
  status.value = text
}

function updateStatus() {
  statusPick.value = statusOf(mirror.code)
  const parts = [slug ? `${slug}.js` : 'no composition']
  if (isDirty()) parts.push('unsaved changes')
  if (playing) parts.push('playing')
  setStatus(parts.join(' · '))
  document.title = `${isDirty() ? '• ' : ''}Studio · COWGLOW's strudel studio`
}

// track edits for the unsaved marker
mirror.editor.dispatch({
  effects: StateEffect.appendConfig.of(EditorView.updateListener.of((u) => u.docChanged && updateStatus())),
})

async function api(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`/api/${path}`, init)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `${res.status} ${res.statusText}`)
  }
  return res
}

async function loadList(): Promise<Entry[]> {
  const list: Entry[] = await (await api('compositions')).json()
  pick.replaceChildren(
    ...list.map((c) => {
      const name = c.title === c.slug ? c.slug : `${c.title} (${c.slug})`
      return new Option(c.status === 'backlog' ? `${name} · backlog` : name, c.slug)
    }),
  )
  pick.value = slug
  return list
}

async function open(next: string) {
  if (next !== slug && isDirty() && !confirm(`Discard unsaved changes to ${slug}.js?`)) {
    pick.value = slug
    return
  }
  await mirror.stop()
  const code = await (await api(`compositions/${next}`)).text()
  slug = next
  savedCode = code
  mirror.setCode(code)
  pick.value = slug
  result.hidden = true
  history.replaceState(null, '', `?c=${slug}`)
  updateStatus()
}

async function save() {
  if (!slug) return
  const code = mirror.code
  await api(`compositions/${slug}`, { method: 'PUT', body: code })
  savedCode = code
  await loadList() // the title may have changed
  updateStatus()
}

async function render() {
  if (!slug) return
  if (isDirty()) await save()
  await mirror.stop()
  renderButton.disabled = true
  setStatus(`Rendering ${slug}.js…`)
  try {
    const { ok, output } = await (await api(`render/${slug}`, { method: 'POST' })).json()
    log.textContent = output
    result.hidden = false
    if (ok) {
      // cache-bust so the fresh mp3 loads
      preview.src = `/api/audio/${slug}?t=${Date.now()}`
      setStatus(
        statusOf(mirror.code) === 'complete'
          ? `Rendered ${slug}.js, in the gallery`
          : `Rendered ${slug}.js, in the backlog (not in the gallery)`,
      )
    } else {
      preview.removeAttribute('src')
      result.querySelector('details')!.open = true
      setStatus(`Render failed, see the log`)
    }
  } finally {
    renderButton.disabled = false
  }
}

async function create() {
  const next = prompt('File name for the new composition (a-z, 0-9, -):')?.trim()
  if (!next) return
  if (!SLUG.test(next)) return setStatus('File names use a-z, 0-9 and -')
  const title = prompt('Title:', next)?.trim() || next
  await api(`compositions/${next}`, { method: 'POST', body: JSON.stringify({ title }) })
  await loadList()
  await open(next)
}

async function renameCurrent() {
  if (!slug) return
  const next = prompt(`Rename ${slug}.js to (a-z, 0-9, -):`, slug)?.trim()
  if (!next || next === slug) return
  if (!SLUG.test(next)) return setStatus('File names use a-z, 0-9 and -')
  if (isDirty()) await save()
  await mirror.stop()
  await api(`rename/${slug}`, { method: 'POST', body: JSON.stringify({ to: next }) })
  slug = next
  await loadList()
  history.replaceState(null, '', `?c=${slug}`)
  setStatus(`Renamed to ${slug}.js`)
}

// the header line in the file is the source of truth; the dropdown edits it and saves
async function changeStatus() {
  mirror.setCode(withStatus(mirror.code, statusPick.value as Status))
  await save()
  setStatus(
    statusPick.value === 'complete'
      ? `${slug}.js is complete${(await hasRender()) ? ' and in the gallery' : '; render it to add it to the gallery'}`
      : `${slug}.js moved to the backlog`,
  )
}

async function hasRender(): Promise<boolean> {
  return (await fetch(`/api/audio/${slug}`, { method: 'HEAD' })).ok
}

// report failures in the status line instead of losing them in the console
const guard =
  (fn: () => Promise<unknown>) =>
  () =>
    fn().catch((err) => setStatus(`Error: ${err instanceof Error ? err.message : err}`))

pick.addEventListener('change', guard(() => open(pick.value)))
statusPick.addEventListener('change', guard(changeStatus))
$('#new').addEventListener('click', guard(create))
$('#rename').addEventListener('click', guard(renameCurrent))
$('#play').addEventListener('click', guard(() => mirror.evaluate()))
$('#stop').addEventListener('click', guard(() => mirror.stop()))
$('#save').addEventListener('click', guard(save))
renderButton.addEventListener('click', guard(render))

// runtime errors (e.g. a sound that isn't loaded) only reach Strudel's logger,
// so surface them; otherwise they just mean silence
document.addEventListener('strudel.log', (e) => {
  const { message, type } = (e as CustomEvent<{ message: string; type?: string }>).detail
  if (type === 'error' || message.includes('error:')) setStatus(message)
})

// one sound at a time: the rendered preview and live playback stop each other
preview.addEventListener('play', () => mirror.stop())

window.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 's') {
    e.preventDefault()
    guard(save)()
  }
})

window.addEventListener('beforeunload', (e) => {
  if (isDirty()) e.preventDefault()
})

guard(async () => {
  const list = await loadList()
  const wanted = new URLSearchParams(location.search).get('c')
  const first = list.find((c) => c.slug === wanted)?.slug ?? list[0]?.slug
  if (first) await open(first)
  else updateStatus()
})()
