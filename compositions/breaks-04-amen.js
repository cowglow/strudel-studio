// @title Breaks 04 · Amen 170
// @by COWGLOW
// @origin COWGLOW's strudel studio & gallery
// @bars 8
// @status backlog
// jungle loop for jamming: the amen, chopped at 170 bpm over 8 bars; no bass, no keys
// paste into https://strudel.cc and press ctrl+enter

// 170 bpm, one cycle = one bar of 4/4
setcpm(170 / 4)

await samples('github:yaxu/clean-breaks')

// the amen is four bars long: 64 slices, 16 per bar
s("amen")
  .splice(64, `<
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 24 25 26 27 28 29 30 31]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [0 1 18 19 4 5 22 23 [8 8] 9 42 43 [12 13] [44 45] 46 47]
    [0 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15]
    [16 17 18 19 20 21 22 23 0 1 10 11 [12 12] 13 14 15]
    [0 1 2 3 4 5 [6 6] 7 0 1 10 11 12 13 14 15]
    [32 33 34 35 36 37 38 39 [56 56] 57 [58 58] 59 [12 12 12 12] [12 12] [44 44 44 44] [44 44 44 44]]
  >`)
  .cut(1)
