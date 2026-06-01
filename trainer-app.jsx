/* =============================================================
   VULCAN — trainer-app.jsx  (simplified layout)
   Speedometer + gif + start + input timeline + live mouse overlay.
   ============================================================= */
const { useState: uS, useEffect: uE, useRef: uR } = React;
const {
  REP_LEN, REP_EVENTS, COMBO_NOTATION, TOL,
  SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC, LS_KEY,
  clamp, rawCode, codeLabel, DEFAULT_BINDINGS,
  loadStore, saveStore, GRADE_SOUND,
  PlayIcon, StopIcon, Speedometer, Lane,
} = window;

const GRADE_COLOR = {
  perfect: 'var(--severity-low)', good: 'var(--accent-gold)',
  early: 'var(--severity-high)', late: 'var(--severity-critical)',
  miss: 'var(--status-offline)', wrong: 'var(--status-offline)',
};
const GRADE_TEXT = { perfect: 'PERFECT', good: 'GOOD', early: 'EARLY', late: 'LATE', miss: 'MISS', wrong: 'WRONG' };

/* 8-step sequence reference (matches the canonical DCDCCF rep) */
const SEQ = [
  { sym: '▼', side: 'L', dwell: 200 },
  { sym: '▼', side: 'R', dwell: 50 },
  { sym: '▲', side: 'R', dwell: 70 },
  { sym: '▲', side: 'L', dwell: 50 },
  { sym: '▼', side: 'L', dwell: 200 },
  { sym: '▼', side: 'R', dwell: 50 },
  { sym: '▲', side: 'R', dwell: 1050 },
  { sym: '▲', side: 'L', dwell: null },
];

/* ===============================================================
   MOUSE OVERLAY — live L / R button state + click-to-rebind
   =============================================================== */
function MouseOverlay({ pressed, bindings, listen, onRebind }) {
  const atkOn = pressed.atk, dashOn = pressed.dash;
  const atkListen = listen === 'attack', dashListen = listen === 'dash';
  const ATK = '#ff7a18', DASH = '#ffc24a', INK = '#6e4a38';
  const LEFT = 'M14 68 L14 40 Q14 6 48 6 L50 6 L50 68 Z';
  const RIGHT = 'M50 68 L50 6 L52 6 Q86 6 86 40 L86 68 Z';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 100 152" width="92" style={{ display: 'block', overflow: 'visible' }}>
        {/* button fills */}
        <path d={LEFT} fill={ATK} opacity={atkOn ? 0.92 : atkListen ? 0.3 : 0.07} style={{ transition: 'opacity 0.08s' }} />
        <path d={RIGHT} fill={DASH} opacity={dashOn ? 0.92 : dashListen ? 0.3 : 0.07} style={{ transition: 'opacity 0.08s' }} />
        {/* outline + dividers */}
        <rect x="14" y="6" width="72" height="140" rx="34" ry="38" fill="none" stroke={INK} strokeWidth="2.5" />
        <line x1="50" y1="6" x2="50" y2="68" stroke={INK} strokeWidth="2" />
        <line x1="14" y1="68" x2="86" y2="68" stroke={INK} strokeWidth="2" />
        <rect x="45" y="20" width="10" height="24" rx="5" fill="none" stroke={INK} strokeWidth="2" />
        {/* hit areas for rebind */}
        <path d={LEFT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('attack')} />
        <path d={RIGHT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('dash')} />
      </svg>
      <div style={{ display: 'flex', gap: 22, fontSize: 12 }}>
        {[['attack', 'L', ATK, bindings.attack, atkListen], ['dash', 'R', DASH, bindings.dash, dashListen]].map(([id, lbl, c, code, lis]) => (
          <button key={id} onClick={() => onRebind(id)} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: c }}>{lbl}</span>
            <span style={{ fontSize: 12, color: lis ? c : 'var(--text-secondary)', fontWeight: lis ? 700 : 500, borderBottom: '1px dashed var(--border-light)', paddingBottom: 1 }}>
              {lis ? 'press input…' : codeLabel(code)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, hot, align }) {
  return (
    <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, lineHeight: 1, color: hot ? 'var(--severity-critical)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{value}</div>
    </div>
  );
}


/* ===============================================================
   APP
   =============================================================== */
function App() {
  const init = loadStore();
  const [bindings, setBindings] = uS(init.bindings);
  const [sound, setSound] = uS(init.settings.sound !== false);
  const [running, setRunning] = uS(false);
  const [countdown, setCountdown] = uS(0);
  const [speed, setSpeed] = uS(0);
  const [last, setLast] = uS(null);
  const [pressed, setPressed] = uS({ atk: false, dash: false });
  const [listen, setListen] = uS(null);
  const [streak, setStreak] = uS(0);
  const [topSpeed, setTopSpeed] = uS(0);
  const streakRef = uR(0);
  const topRef = uR(0);

  const RATE = 1.0, WIN = TOL.normal;

  const nowRef = uR(-3000);
  const runRef = uR({ running: false, startPerf: 0, now: -3000, lastT: null, nextIdx: 0, genRep: 0, events: [], speed: 0, pressed: new Set(), atk: false, dash: false });
  const lastRef = uR(null);
  const cdRef = uR(0);
  const rafRef = uR(null);
  const bindingsRef = uR(bindings);
  const soundRef = uR(sound);
  const listenRef = uR(null);

  uE(() => { bindingsRef.current = bindings; }, [bindings]);
  uE(() => { soundRef.current = sound; saveStore(bindings, { ...init.settings, sound }); }, [sound, bindings]);
  uE(() => { listenRef.current = listen; }, [listen]);

  const ensureEvents = (maxRep) => {
    const run = runRef.current;
    while (run.genRep <= maxRep) {
      const base = run.genRep * REP_LEN;
      REP_EVENTS.forEach((e) => run.events.push({ action: e.action, t: base + e.t }));
      run.genRep++;
    }
  };

  const grade = (g, delta) => {
    const run = runRef.current;
    run.speed = clamp(run.speed + (SPEED_DELTA[g] || 0), 0, SPEED_MAX);
    lastRef.current = { grade: g, delta, ts: performance.now() };
    // momentum streak: clean hits build it, mistakes break it
    if (g === 'perfect' || g === 'good') streakRef.current += 1;
    else streakRef.current = 0;
    setStreak(streakRef.current);
    if (run.speed > topRef.current) { topRef.current = run.speed; setTopSpeed(run.speed); }
    if (soundRef.current && GRADE_SOUND[g]) GRADE_SOUND[g]();
    setLast(lastRef.current);
  };

  const transition = (action) => {
    const run = runRef.current;
    if (!run.running || run.now < 0) return;
    const ev = run.events[run.nextIdx];
    if (!ev) return;
    const tReal = ev.t / RATE;
    if (ev.action === action) {
      const delta = run.now - tReal;
      const ad = Math.abs(delta);
      const g = ad <= WIN.perfect ? 'perfect' : ad <= WIN.good ? 'good' : (delta < 0 ? 'early' : 'late');
      grade(g, delta); run.nextIdx++;
    } else {
      grade('wrong', 0);
    }
  };

  // main loop (pause-aware clock)
  uE(() => {
    const loop = () => {
      const t = performance.now();
      const run = runRef.current;
      if (run.running) {
        if (run.lastT == null) run.lastT = t;
        let frameDelta = t - run.lastT;
        run.lastT = t;
        if (frameDelta > 200) { run.startPerf += frameDelta; frameDelta = 0; }
        const now = t - run.startPerf;
        run.now = now; nowRef.current = now;
        const dtSec = frameDelta / 1000;
        if (now >= 0) {
          ensureEvents(Math.ceil((now * RATE) / REP_LEN) + 2);
          let ev;
          while ((ev = run.events[run.nextIdx]) && now > ev.t / RATE + WIN.good + 70) {
            grade('miss', 0); run.nextIdx++;
          }
          run.speed = clamp(run.speed - DECAY_PER_SEC * dtSec, 0, SPEED_MAX);
        }
        const cd = now < 0 ? Math.ceil(-now / 1000) : 0;
        if (cd !== cdRef.current) { cdRef.current = cd; setCountdown(cd); }
        setSpeed(run.speed);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const start = () => {
    const run = runRef.current;
    run.events = []; run.genRep = 0; run.nextIdx = 0; run.speed = 0;
    run.now = -3000; run.startPerf = performance.now() + 3000; run.lastT = null;
    run.pressed = new Set(); run.atk = false; run.dash = false;
    ensureEvents(4);
    lastRef.current = null; setLast(null); setPressed({ atk: false, dash: false });
    streakRef.current = 0; topRef.current = 0; setStreak(0); setTopSpeed(0);
    run.running = true; setRunning(true);
    try { const a = new (window.AudioContext || window.webkitAudioContext)(); if (a.state === 'suspended') a.resume(); } catch (e) {}
  };
  const stop = () => { runRef.current.running = false; setRunning(false); };

  // ---- input handling ----
  const stageRef = uR(null);
  uE(() => {
    const handle = (e, isDown) => {
      if (listenRef.current) {
        if (e.type === 'keydown' && e.code === 'Escape') { e.preventDefault(); setListen(null); return; }
        if (isDown) {
          e.preventDefault();
          const code = rawCode(e);
          const action = listenRef.current;
          const nb = { ...bindingsRef.current, [action]: code };
          const other = action === 'attack' ? 'dash' : 'attack';
          if (nb[other] === code) nb[other] = bindingsRef.current[action];
          setBindings(nb); setListen(null);
        }
        return;
      }
      const code = rawCode(e);
      const b = bindingsRef.current, run = runRef.current;
      const isAtkKey = (code === b.attack);
      const isDashKey = (code === b.dash) || 
        ((b.dash === 'ShiftLeft' || b.dash === 'ShiftRight') && (code === 'ShiftLeft' || code === 'ShiftRight'));
      
      if ((isAtkKey || isDashKey) && (code === 'Space' || code.startsWith('Arrow'))) e.preventDefault();
      if (isDown) {
        if (run.pressed.has(code)) return;
        run.pressed.add(code);
        if (isAtkKey && !run.atk) { run.atk = true; setPressed({ atk: true, dash: run.dash }); transition('atk-down'); }
        if (isDashKey && !run.dash) { run.dash = true; setPressed({ atk: run.atk, dash: true }); transition('dash-down'); }
      } else {
        run.pressed.delete(code);
        if (isAtkKey && run.atk) { run.atk = false; setPressed({ atk: false, dash: run.dash }); transition('atk-up'); }
        if (isDashKey && run.dash) { run.dash = false; setPressed({ atk: run.atk, dash: false }); transition('dash-up'); }
      }
    };
    const kd = (e) => handle(e, true);
    const ku = (e) => handle(e, false);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const stage = stageRef.current;
    const md = (e) => { e.preventDefault(); handle(e, true); };
    const mu = (e) => { handle(e, false); };
    const cm = (e) => e.preventDefault();
    if (stage) { stage.addEventListener('mousedown', md); stage.addEventListener('contextmenu', cm); }
    window.addEventListener('mouseup', mu);
    return () => {
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
      window.removeEventListener('mouseup', mu);
      if (stage) { stage.removeEventListener('mousedown', md); stage.removeEventListener('contextmenu', cm); }
    };
  }, []);

  const onRebind = (id) => setListen((cur) => (cur === id ? null : id));
  const inRed = speed >= REDLINE;
  const scale = 1 + clamp(speed / SPEED_MAX, 0, 1) * 0.16;
  const lc = last ? GRADE_COLOR[last.grade] : 'transparent';
  const showDelta = last && ['perfect', 'good', 'early', 'late'].includes(last.grade);
  const liveFlash = last && performance.now() - last.ts < 220 ? last : null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.5em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2, paddingLeft: '0.5em' }}>Flamestrider Drill</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}>Mavuika Combo Trainer</h1>
        <div style={{ display: 'inline-block', marginTop: 10, padding: '5px 18px', border: '1px solid var(--border-light)', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '0.16em', color: 'var(--text-secondary)' }}>{COMBO_NOTATION}</div>
      </div>

      {/* sequence reference */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
        {SEQ.map((s, i) => {
          const c = s.side === 'L' ? 'var(--severity-high)' : 'var(--accent-gold)';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, minWidth: 58 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 600, color: c }}>
                <span>{s.sym}</span><span>{s.side}</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{s.dwell == null ? '—' : s.dwell + 'ms'}</div>
            </div>
          );
        })}
      </div>

      {/* input timeline */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Input Timeline</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            <b style={{ color: 'var(--severity-high)' }}>C</b> charge · <b style={{ color: 'var(--accent-gold)' }}>D</b> dash · <b style={{ color: 'var(--severity-critical)' }}>F</b> finisher
          </span>
        </div>
        <div ref={stageRef} tabIndex={0} className="stage-focus" style={{ position: 'relative', cursor: running ? 'crosshair' : 'default' }}>
          <Lane nowRef={nowRef} rate={RATE} judgeFlash={liveFlash} />
          {running && countdown > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 700, color: 'var(--severity-high)' }}>{countdown}</span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7, textAlign: 'center' }}>
          Hold <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.attack)}</b> across each charge bar; tap <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.dash)}</b> inside it. Mouse input works over this strip.
        </div>
      </div>

      {/* mouse + speedometer + rider */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 30, flexWrap: 'wrap' }}>
        <MouseOverlay pressed={pressed} bindings={bindings} listen={listen} onRebind={onRebind} />
        <div style={{ width: 320, maxWidth: '100%', position: 'relative' }}>
          {/* dial stat rail */}
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 6px', marginBottom: -8 }}>
            <Stat label="STREAK" value={'×' + streak} hot={streak >= 6} />
            <Stat label="TOP" value={Math.round(topSpeed)} hot={topSpeed >= REDLINE} align="right" />
          </div>
          <Speedometer speed={speed} running={running} />
          {/* grade readout under the dial */}
          <div style={{ textAlign: 'center', marginTop: -4, height: 24 }}>
            {liveFlash && (
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, letterSpacing: '0.14em', color: lc, textTransform: 'uppercase' }}>
                {GRADE_TEXT[last.grade]}{showDelta ? `  ${last.delta > 0 ? '+' : ''}${Math.round(last.delta)}ms` : ''}
              </span>
            )}
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <img src="assets/mavuika-dance.gif" alt="Mavuika" style={{ width: 112, height: 112, display: 'block', position: 'relative', transform: `scale(${scale})`, transformOrigin: 'bottom center', transition: 'transform 0.2s' }} />
        </div>
      </div>

      {/* start / stop + sound */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <button onClick={running ? stop : start} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '15px 46px',
          fontSize: 16, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.16em',
          background: running ? 'transparent' : 'var(--text-primary)',
          color: running ? 'var(--severity-critical)' : 'var(--bg-primary)',
          border: `2px solid ${running ? 'var(--severity-critical)' : 'var(--text-primary)'}`,
        }}>
          {running ? <StopIcon /> : <PlayIcon />}{running ? 'Stop' : 'Ride'}
        </button>
        <button onClick={() => setSound((s) => !s)} title={sound ? 'Mute' : 'Unmute'} style={{
          width: 44, height: 44, border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', cursor: 'pointer',
          color: sound ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{sound ? '♪' : '✕'}</button>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
