// @title Jungle 01
// @bars 24
// @status complete
// amen break, wavy three-note bass, half-time reese switch
// paste into https://strudel.cc and press ctrl+enter

// 170 bpm, one cycle = one bar of 4/4
setcpm(170 / 4)

// await so the sample map is loaded before rendering
await samples('github:yaxu/clean-breaks')

// amen cut into 64 slices (4 bars x 16 steps), re-sequenced into a 4-bar phrase.
// splice stretches each slice to fill its step, so it locks to tempo.
const brk = s("amen")
  .splice(64, `<
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 [6 6] 7 0 1 10 11 [12 12] 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 18 19 4 5 22 23 [8 8] 9 42 43 [12 13] [44 45] 46 47]
  >`)
  .cut(1)
  .hpf(90) // leave the low end for the sub
  .gain(0.9)

// three notes (E, G, B), two rhythmic variations; @n = length in 16ths
const groove = note(`<
  [e1@3 e1@4 g1@3 b0@6]
  [e1@3 g1@4 e1@3 b0@6]
>`)

// clean sub underneath
const sub = groove
  .s("sine")
  .lpf(200)
  .gain(0.8)

// the wavy part: slow filter sweep + vibrato on a saw, an octave up
const wobble = groove
  .add(note(12))
  .s("sawtooth")
  .lpf(sine.range(250, 1400).slow(4))
  .lpq(8)
  .vib(4).vibmod(0.3)
  .attack(0.01).release(0.15)
  .gain(0.35)

// --- half-time section ---

// kick on 1, snare on 3, sparse ghost slices in between
const halfBrk = s("amen")
  .splice(64, `<
    [0 ~ 1 ~ ~ ~ 2 ~ 4 ~ 1 ~ ~ ~ 2 1]
    [0 ~ 1 ~ ~ ~ 2 ~ 4 ~ 1 ~ [4 4] ~ 2 [1 1]]
  >`)
  .cut(1)
  .hpf(90)
  .gain(0.9)

// same three notes, held long
const reeseNotes = note("<[e1@12 g1@4] b0>")

// reese: two saws detuned against each other, slow filter + phaser drift
const reese = reeseNotes
  .layer(
    x => x.s("sawtooth").add(note(-0.12)),
    x => x.s("sawtooth").add(note(0.12)),
  )
  .lpf(sine.range(300, 900).slow(8))
  .lpq(3)
  .phaser(0.5)
  .attack(0.05).release(0.3)
  .gain(0.3)

const reeseSub = reeseNotes
  .s("sine")
  .lpf(200)
  .gain(0.8)

// --- arrangement (bars) ---
arrange(
  [8, stack(brk, sub, wobble)],      // full-time, wavy bass
  [8, stack(halfBrk, reeseSub, reese)], // half-time switch, reese
  [8, stack(brk, sub, reese)],       // back to full-time, reese carries over
)
