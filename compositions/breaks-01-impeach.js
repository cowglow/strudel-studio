// @title Breaks 01 · Impeach 170
// @by COWGLOW
// @origin COWGLOW's strudel studio & gallery
// @bars 8
// @status backlog
// jungle loop for jamming: Impeach The President, pitched up to 170 and re-cut over 8 bars; no bass, no keys
// paste into https://strudel.cc and press ctrl+enter

// 170 bpm, one cycle = one bar of 4/4
setcpm(170 / 4)

await samples('github:yaxu/clean-breaks')

// Impeach is one bar long: 16 slices = 16 steps. splice stretches each slice to its step,
// so the break locks to the tempo. Bar 8 is a small fill that leads back into bar 1.
s("impeach")
  .splice(16, `<
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 2 3 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 [14 14] 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 0 1 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 [12 12] 13 [12 12] 13 [4 4 4 4] [4 4 4 4]]
  >`)
  .cut(1)
