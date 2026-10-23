// minimal typings for the parts of @strudel/web the renderer uses
declare module '@strudel/web' {
  export interface Pattern {}

  export interface Repl {
    evaluate(code: string, autostart?: boolean): Promise<Pattern | undefined>
    scheduler: { cps: number }
  }

  export function initStrudel(options?: { onEvalError?: (err: Error) => void }): Promise<Repl>

  // triggers a browser download of `${downloadName}.wav`
  export function renderPatternAudio(
    pattern: Pattern,
    cps: number,
    begin: number,
    end: number,
    sampleRate: number,
    maxPolyphony: number,
    multiChannelOrbits: boolean,
    downloadName?: string,
  ): Promise<void>
}
