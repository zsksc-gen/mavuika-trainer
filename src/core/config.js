export const VULCAN_CONFIG = {
  // Tolerance presets (real-ms windows, scaled by tempo separately)
  // Shift and Click leniency increased by 15%
  TOL: {
    strict: { perfect: 37, good: 74 }, // 32ms * 1.15 = ~37ms / 64ms * 1.15 = ~74ms
    normal: { perfect: 63, good: 127 }, // 55ms * 1.15 = ~63ms / 110ms * 1.15 = ~127ms
    lenient: { perfect: 86, good: 184 }, // 75ms * 1.15 = ~86ms / 160ms * 1.15 = ~184ms
  },

  // Speed (km/h on the Flamestrider)
  SPEED_MAX: 289,
  REDLINE: 175,
  SPEED_DELTA: {
    perfect: 10,
    good: 5,
    early: -8,
    late: -10,
    miss: -20,
    wrong: -8,
  },
  DECAY_PER_SEC: 2,
};

export const COMBOS = {
  cdcdcf: {
    name: "CDCDCF (Full Combo)",
    notation: "CCDCDCF  2(CDCDCF)",
    repLen: 2160,
    repBars: [
      { lane: "atk", start: 0, end: 320, finisher: false }, // CD #1 charge
      { lane: "dash", start: 200, end: 250 }, // dash tap inside #1
      { lane: "atk", start: 370, end: 1640, finisher: true }, // CD #2 -> long hold -> F
      { lane: "dash", start: 570, end: 620 }, // dash tap inside #2
    ],
    repEvents: [
      { action: "atk-down", t: 0, label: "CHARGE" },
      { action: "dash-down", t: 200, label: "DASH" },
      { action: "dash-up", t: 250, label: "dash end" },
      { action: "atk-up", t: 320, label: "cancel" },
      { action: "atk-down", t: 370, label: "CHARGE" },
      { action: "dash-down", t: 570, label: "DASH" },
      { action: "dash-up", t: 620, label: "dash end" },
      { action: "atk-up", t: 1640, label: "FINISHER" },
    ],
    seq: [
      { sym: '▼', side: 'L', dwell: 200 },
      { sym: '▼', side: 'R', dwell: 50 },
      { sym: '▲', side: 'R', dwell: 70 },
      { sym: '▲', side: 'L', dwell: 50 },
      { sym: '▼', side: 'L', dwell: 200 },
      { sym: '▼', side: 'R', dwell: 50 },
      { sym: '▲', side: 'R', dwell: 1020 },
      { sym: '▲', side: 'L', dwell: 520 },
    ]
  },
  cd: {
    name: "CD (Short Loop)",
    notation: "CD (Spaced 1s)",
    repLen: 1320,
    repBars: [
      { lane: "atk", start: 0, end: 320, finisher: false }, // CD #1 charge
      { lane: "dash", start: 200, end: 250 }, // dash tap inside #1
    ],
    repEvents: [
      { action: "atk-down", t: 0, label: "CHARGE" },
      { action: "dash-down", t: 200, label: "DASH" },
      { action: "dash-up", t: 250, label: "dash end" },
      { action: "atk-up", t: 320, label: "cancel" },
    ],
    seq: [
      { sym: '▼', side: 'L', dwell: 200 },
      { sym: '▼', side: 'R', dwell: 50 },
      { sym: '▲', side: 'R', dwell: 70 },
      { sym: '▲', side: 'L', dwell: 1000 },
    ]
  }
};
