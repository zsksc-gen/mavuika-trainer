/* =============================================================
   VULCAN — trainer.jsx  (components + game loop)
   Reads shared symbols from window (defined in trainer-core.jsx).
   ============================================================= */
const { useState, useEffect, useRef, useCallback, useLayoutEffect } = React;
const {
  REP_LEN, REP_BARS, REP_EVENTS, COMBO_NOTATION, TOL, TEMPOS,
  SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC,
  clamp, rawCode, codeLabel, DEFAULT_BINDINGS, DEFAULT_SETTINGS,
  loadStore, saveStore, GRADE_SOUND,
  PlayIcon, StopIcon, MoonIcon, SunIcon, VulcanMark, VB,
} = window;

const GRADE_COLOR = {
  perfect: 'var(--severity-low)',
  good:    'var(--accent-gold)',
  early:   'var(--severity-high)',
  late:    'var(--severity-critical)',
  miss:    'var(--status-offline)',
  wrong:   'var(--status-offline)',
};
const GRADE_TEXT = { perfect: 'PERFECT', good: 'GOOD', early: 'EARLY', late: 'LATE', miss: 'MISS', wrong: 'WRONG INPUT' };

/* ===============================================================
   SPEEDOMETER — the Flamestrider tachometer
   Needle is smoothed with its own RAF lerp so it sweeps instead of
   snapping, and reps a full startup sweep when a run begins.
   =============================================================== */
function Speedometer({ speed, running }) {
  const cx = 160, cy = 150, R = 132, RT = 118, RL = 96;
  const polar = (r, deg) => { const a = deg * Math.PI / 180; return [cx + r * Math.cos(a), cy - r * Math.sin(a)]; };
  const valToDeg = (v) => 180 - (clamp(v, 0, SPEED_MAX) / SPEED_MAX) * 180;
  const arc = (r, vFrom, vTo) => {
    const [x0, y0] = polar(r, valToDeg(vFrom));
    const [x1, y1] = polar(r, valToDeg(vTo));
    const large = Math.abs(valToDeg(vFrom) - valToDeg(vTo)) > 180 ? 1 : 0;
    return `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1}`;
  };

  // --- needle smoothing + startup sweep ---
  const [disp, setDisp] = useState(0);
  const dispRef = useRef(0);
  const targetRef = useRef(0);
  const sweepRef = useRef(null);
  useEffect(() => { targetRef.current = speed; }, [speed]);
  useEffect(() => {
    if (running) sweepRef.current = { t0: performance.now(), dur: 650 }; // rev test on start
  }, [running]);
  useEffect(() => {
    let raf;
    const tick = () => {
      let v = dispRef.current;
      const sw = sweepRef.current;
      if (sw) {
        const p = (performance.now() - sw.t0) / sw.dur;
        if (p >= 1) { sweepRef.current = null; v = targetRef.current; }
        else { v = Math.sin(Math.min(p, 1) * Math.PI) * SPEED_MAX; } // up to max and back
      } else {
        v += (targetRef.current - v) * 0.22; // critically-ish damped chase
      }
      if (Math.abs(v - dispRef.current) > 0.05 || v !== dispRef.current) { dispRef.current = v; setDisp(v); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const ticks = [];
  for (let v = 0; v <= SPEED_MAX; v += 20) ticks.push(v);
  const [nx, ny] = polar(R - 18, valToDeg(disp));
  const inRed = disp >= REDLINE;
  const liveCol = inRed ? 'var(--severity-critical)' : 'var(--accent-indigo)';

  return (
    <svg viewBox="0 0 320 172" width="100%" style={{ display: 'block', maxHeight: 220 }}>
      {/* base track */}
      <path d={arc(RT, 0, SPEED_MAX)} fill="none" stroke="var(--border-light)" strokeWidth="6" />
      {/* redline zone */}
      <path d={arc(RT, REDLINE, SPEED_MAX)} fill="none" stroke="var(--severity-critical)" strokeWidth="6" />
      {/* live fill */}
      <path d={arc(RT, 0, Math.max(0.6, disp))} fill="none" stroke={liveCol} strokeWidth="6" />
      {/* ticks + labels */}
      {ticks.map((v) => {
        const deg = valToDeg(v);
        const major = v % 40 === 0;
        const [x0, y0] = polar(RT - 7, deg);
        const [x1, y1] = polar(RT - (major ? 16 : 10), deg);
        const [lx, ly] = polar(RL - 8, deg);
        return (
          <g key={v}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} stroke={v >= REDLINE ? 'var(--severity-critical)' : 'var(--text-secondary)'} strokeWidth={major ? 1.4 : 0.8} opacity={major ? 0.9 : 0.4} />
            {major && <text x={lx} y={ly + 4} textAnchor="middle" fontSize="10" fontFamily="var(--font-body)" fill="var(--text-muted)">{v}</text>}
          </g>
        );
      })}
      {/* needle */}
      <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={liveCol} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx={cx} cy={cy} r="6" fill="var(--bg-card)" stroke={liveCol} strokeWidth="2" />
      {/* digital readout */}
      <text x={cx} y={cy - 38} textAnchor="middle" fontFamily="var(--font-display)" fontWeight="600" fontSize="44" fill={inRed ? 'var(--severity-critical)' : 'var(--text-primary)'}>{Math.round(disp)}</text>
      <text x={cx} y={cy - 20} textAnchor="middle" fontFamily="var(--font-body)" fontWeight="600" fontSize="10" letterSpacing="0.22em" fill="var(--text-muted)">KM / H</text>
    </svg>
  );
}

/* ===============================================================
   INPUT LANE — scrolling charge holds + dash taps
   =============================================================== */
const PX_PER_MS = 0.26;
function Lane({ nowRef, rate, judgeFlash }) {
  const wrapRef = useRef(null);
  const [w, setW] = useState(900);
  const innerRef = useRef(null);

  useLayoutEffect(() => {
    const el = wrapRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el); setW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // imperative scroll: position bars every frame
  useEffect(() => {
    let raf;
    const judgeX = Math.min(180, w * 0.22);
    const draw = () => {
      const now = nowRef.current;
      const inner = innerRef.current;
      if (inner) {
        const curRep = Math.max(0, Math.floor((now * rate) / REP_LEN));
        const out = [];
        for (let r = curRep - 1; r <= curRep + 6; r++) {
          if (r < 0) continue;
          const base = r * REP_LEN;
          REP_BARS.forEach((b, bi) => {
            const rs = (base + b.start) / rate, re = (base + b.end) / rate;
            const x = judgeX + (rs - now) * PX_PER_MS;
            const bw = Math.max(8, (re - rs) * PX_PER_MS);
            if (x + bw < -60 || x > w + 60) return;
            out.push({ key: r + '-' + bi, x, bw, lane: b.lane, fin: b.finisher });
          });
        }
        // rebuild via direct DOM for perf
        inner.__bars = inner.__bars || {};
        const seen = {};
        out.forEach((o) => {
          seen[o.key] = 1;
          let el = inner.__bars[o.key];
          if (!el) {
            el = document.createElement('div');
            el.className = 'vlane-bar';
            inner.appendChild(el);
            inner.__bars[o.key] = el;
            const isAtk = o.lane === 'atk';
            el.style.position = 'absolute';
            el.style.height = isAtk ? '44px' : '30px';
            el.style.top = isAtk ? '14px' : '74px';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'space-between';
            el.style.padding = '0 8px';
            el.style.fontSize = '10px';
            el.style.fontWeight = '600';
            el.style.letterSpacing = '0.08em';
            el.style.textTransform = 'uppercase';
            if (isAtk) {
              el.style.background = o.fin ? 'linear-gradient(90deg, rgba(211,84,0,0.16), rgba(192,57,43,0.20))' : 'rgba(211,84,0,0.12)';
              el.style.border = `1px solid ${o.fin ? 'var(--severity-critical)' : 'var(--severity-high)'}`;
              el.style.color = o.fin ? 'var(--severity-critical)' : 'var(--severity-high)';
              el.style.borderRadius = '0px';
              el.style.boxShadow = 'none';
              el.innerHTML = `<span>${o.fin ? 'HOLD (FINISHER)' : 'CHARGE'}</span><span style="color:${o.fin ? 'var(--severity-critical)' : 'var(--severity-high)'};font-weight:700">${o.fin ? 'F' : 'C'}</span>`;
            } else {
              el.style.background = 'rgba(184,150,12,0.16)';
              el.style.border = '1px solid var(--accent-gold)';
              el.style.color = 'var(--accent-gold)';
              el.style.borderRadius = '0px';
              el.style.boxShadow = 'none';
              el.innerHTML = `<span style="font-weight:700">D</span>`;
              el.style.justifyContent = 'center';
            }
          }
          el.style.transform = `translateX(${o.x}px)`;
          el.style.width = o.bw + 'px';
        });
        Object.keys(inner.__bars).forEach((k) => {
          if (!seen[k]) { inner.__bars[k].remove(); delete inner.__bars[k]; }
        });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, rate]);

  const judgeX = Math.min(180, w * 0.22);
  const flashColor = judgeFlash ? GRADE_COLOR[judgeFlash.grade] : 'var(--accent-gold)';
  return (
    <div ref={wrapRef} style={{ position: 'relative', height: 118, overflow: 'hidden', background: 'var(--bg-secondary)', border: '1px solid var(--border-light)' }}>
      {/* lane labels */}
      <div style={{ position: 'absolute', left: 8, top: 16, ...VB.label, fontSize: 9, color: 'var(--severity-high)', zIndex: 3 }}>ATTACK</div>
      <div style={{ position: 'absolute', left: 8, top: 78, ...VB.label, fontSize: 9, color: 'var(--accent-gold)', zIndex: 3 }}>DASH</div>
      {/* moving bars layer */}
      <div ref={innerRef} style={{ position: 'absolute', inset: 0, zIndex: 2 }} />
      {/* judgment line */}
      <div style={{ position: 'absolute', left: judgeX, top: 0, bottom: 0, width: 2, background: flashColor, zIndex: 4, transition: 'background-color 0.12s' }} />
      <div style={{ position: 'absolute', left: judgeX - 16, top: 2, ...VB.label, fontSize: 8, color: flashColor, zIndex: 4 }}>NOW</div>
    </div>
  );
}

window.Speedometer = Speedometer;
window.Lane = Lane;
