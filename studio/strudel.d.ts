// minimal typings for the Strudel packages the studio uses

declare module '@strudel/codemirror' {
  import type { EditorView } from '@codemirror/view'

  export class StrudelMirror {
    constructor(options: {
      root: HTMLElement
      initialCode?: string
      bgFill?: boolean
      prebake: () => Promise<unknown>
      defaultOutput: unknown
      getTime: () => number
      transpiler: unknown
      onToggle?: (started: boolean) => void
      onEvalError?: (err: Error) => void
      afterEval?: () => void
    })
    code: string
    editor: EditorView
    evaluate(autostart?: boolean): Promise<void>
    stop(): Promise<void>
    setCode(code: string): void
  }
}

declare module '@strudel/core' {
  export function evalScope(...modules: unknown[]): Promise<unknown>
}

declare module '@strudel/mini' {
  export function miniAllStrings(): void
}

declare module '@strudel/tonal' {}

declare module '@strudel/transpiler' {
  export const transpiler: unknown
}

declare module '@strudel/webaudio' {
  export function getAudioContext(): AudioContext
  export function initAudioOnFirstClick(): Promise<void>
  export function registerSynthSounds(): Promise<void>
  export const webaudioOutput: unknown
}
