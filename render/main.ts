import { initStrudel, renderPatternAudio } from '@strudel/web'

const SAMPLE_RATE = 44100
const MAX_POLYPHONY = 128

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
