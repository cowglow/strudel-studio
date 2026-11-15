import { initStrudel, renderPatternAudio } from '@strudel/web'

const SAMPLE_RATE = 44100
// renderPatternAudio schedules every note before rendering starts, so none has ended yet and
// superdough's voice limit (normally 128) would fade out the earliest notes over the whole render.
// Effectively no limit here; live playback keeps the normal one.
const MAX_POLYPHONY = 1_000_000

let evalError: Error | undefined
const ready = initStrudel({ onEvalError: (err) => (evalError = err) })

declare global {
  interface Window {
    renderComposition: (code: string, bars: number, name: string) => Promise<{ cps: number }>
  }
}

// one cycle = one bar, so `bars` cycles are rendered from the start
window.renderComposition = async (code, bars, name) => {
  const repl = await ready
  evalError = undefined
  const pattern = await repl.evaluate(code, false)
  if (!pattern || evalError) throw evalError ?? new Error('composition produced no pattern')

  const cps = repl.scheduler.cps
  await renderPatternAudio(pattern, cps, 0, bars, SAMPLE_RATE, MAX_POLYPHONY, false, name)
  return { cps }
}
