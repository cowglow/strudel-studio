// @title Breaks 03 · Think 174
// @by COWGLOW
// @origin COWGLOW's strudel studio & gallery
// @bars 8
// @status backlog
// drum & bass loop for jamming: Think (About It) at 174 with Apache bongos; no bass, no keys
// paste into https://strudel.cc and press ctrl+enter

// 174 bpm, one cycle = one bar of 4/4
setcpm(174 / 4)

await samples('github:yaxu/clean-breaks')

// Think is one bar long: 16 slices = 16 steps
const think = s("think")
  .splice(16, `<
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 4 5 6 7]
    [0 1 2 3 4 5 6 7 8 9 [10 10] 11 12 13 [14 14] 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 2 3 4 5 0 1 8 9 10 11 4 5 6 7]
    [0 1 2 3 4 5 6 7 [4 4] 5 [4 4] 5 [12 12 12 12] [4 4 4 4]]
  >`)
  .cut(1)
  .gain(0.7)

// Apache's bongos underneath, two bars long (32 slices), quieter and thinned to the top
const bongos = s("apache")
  .splice(32, "<[0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15] [16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31]>")
  .cut(2)
  .hpf(400)
  .gain(0.5)

stack(think, bongos)
