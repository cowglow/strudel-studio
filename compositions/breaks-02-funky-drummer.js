// @title Breaks 02 · Funky Drummer 172
// @by COWGLOW
// @origin COWGLOW's strudel studio & gallery
// @bars 8
// @status backlog
// jungle loop for jamming: Funky Drummer, pitched up to 172 and re-cut over 8 bars; no bass, no keys
// paste into https://strudel.cc and press ctrl+enter

// 172 bpm, one cycle = one bar of 4/4
setcpm(172 / 4)

await samples('github:yaxu/clean-breaks')

// Funky Drummer is two bars long: 32 slices, 16 per bar (0-15 = its first bar, 16-31 = its second)
s("funkydrummer")
  .splice(32, `<
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 24 25 26 27 28 29 [30 30] 31]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 8 9 10 11 28 29 30 31]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 [28 28] 29 [28 28] 29 [20 20] 21 [20 20 20 20] 23]
  >`)
  .cut(1)
  .gain(0.5) // a few hits come out much hotter than the rest; this keeps them from clipping
