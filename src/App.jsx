import React, { useState, useEffect, useRef } from 'react';
import { VULCAN_CONFIG } from './core/config';
import { clamp, rawCode, codeLabel, loadStore, saveStore } from './core/utils';
import { GRADE_SOUND } from './core/audio';
import { GRADE_COLOR, GRADE_TEXT } from './core/tokens';
import { PlayIcon, StopIcon } from './components/Icons';
import Speedometer from './components/Speedometer';
import Lane from './components/Lane';
import DynamicIsland from './components/DynamicIsland';
import { MouseOverlay, Stat } from './components/MouseOverlay';

const COMBO_NOTATION = 'CCDCDCF  2(CDCDCF)';

/* 8-step sequence reference (matches the canonical DCDCCF rep) */
const SEQ = [
  { sym: '▼', side: 'L', dwell: 200 },
  { sym: '▼', side: 'R', dwell: 50 },
  { sym: '▲', side: 'R', dwell: 70 },
  { sym: '▲', side: 'L', dwell: 50 },
  { sym: '▼', side: 'L', dwell: 200 },
  { sym: '▼', side: 'R', dwell: 50 },
  { sym: '▲', side: 'R', dwell: 1020 },
  { sym: '▲', side: 'L', dwell: 520 },
];

export default function App() {
  const init = loadStore();
  const [bindings, setBindings] = useState(init.bindings);
  const [sound, setSound] = useState(init.settings.sound !== false);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [last, setLast] = useState(null);
  const [pressed, setPressed] = useState({ atk: false, dash: false });
  const [listen, setListen] = useState(null);
  const [streak, setStreak] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [grades, setGrades] = useState([]);
  const streakRef = useRef(0);
  const topRef = useRef(0);

  const { REP_LEN, REP_EVENTS, SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC, TOL } = VULCAN_CONFIG;
  const RATE = 1.0;
  const WIN = TOL.normal;

  const nowRef = useRef(-3000);
  const runRef = useRef({
    running: false,
    startPerf: 0,
    now: -3000,
    lastT: null,
    nextIdx: 0,
    genRep: 0,
    events: [],
    speed: 0,
    pressed: new Set(),
    atk: false,
    dash: false
  });
  const lastRef = useRef(null);
  const cdRef = useRef(0);
  const rafRef = useRef(null);
  const bindingsRef = useRef(bindings);
  const soundRef = useRef(sound);
  const listenRef = useRef(null);
  const [latestPR, setLatestPR] = useState(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/zsksc-gen/mavuika-trainer/pulls?state=closed&base=main&sort=updated&direction=desc')
      .then((res) => {
        if (!res.ok) throw new Error('API limit or error');
        return res.json();
      })
      .then((data) => {
        const merged = data.find(pr => pr.merged_at);
        if (merged) {
          const date = new Date(merged.merged_at);
          const timeStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          setLatestPR({
            number: merged.number,
            title: merged.title,
            url: merged.html_url,
            timeStr: timeStr
          });
        }
      })
      .catch(() => {
        setLatestPR({
          number: '',
          title: 'View GitHub updates',
          url: 'https://github.com/zsksc-gen/mavuika-trainer/commits/main',
          timeStr: 'main'
        });
      });
  }, []);

  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    soundRef.current = sound;
    saveStore(bindings, { ...init.settings, sound });
  }, [sound, bindings, init.settings]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  useEffect(() => {
    if (grades.length === 0) return;
    const timer = setInterval(() => {
      const now = performance.now();
      setGrades(prev => {
        const filtered = prev.filter(item => now - item.ts < 5000);
        if (filtered.length !== prev.length) return filtered;
        return prev;
      });
    }, 200);
    return () => clearInterval(timer);
  }, [grades]);

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
    const ts = performance.now();
    lastRef.current = { grade: g, delta, ts };
    // momentum streak: clean hits build it, mistakes break it
    if (g === 'perfect' || g === 'good') streakRef.current += 1;
    else streakRef.current = 0;
    setStreak(streakRef.current);
    if (run.speed > topRef.current) {
      topRef.current = run.speed;
      setTopSpeed(run.speed);
    }
    if (soundRef.current && GRADE_SOUND[g]) GRADE_SOUND[g]();
    setLast(lastRef.current);
    
    // Add to grades stack for the 5s persistent log
    const newGrade = {
      id: Math.random().toString(36).substr(2, 9),
      grade: g,
      delta,
      ts
    };
    setGrades(prev => [...prev, newGrade]);
  };

  const transition = (action) => {
    const run = runRef.current;
    if (!run.running || run.now < 0) return;
    const ev = run.events[run.nextIdx];
    if (!ev) return;
    const tReal = ev.t / RATE;
    if (ev.action === action) {
      const delta = run.now - tReal;
      const eventInRep = run.nextIdx % 8;
      // 30% extra leniency for transition to the 2nd charge (index 4 of rep)
      const scaleLeniency = (eventInRep === 4) ? 1.30 : 1.0;
      let perfectWindow = WIN.perfect * scaleLeniency;
      let goodWindow = WIN.good * scaleLeniency;
      
      // Let the mistake of holding/tapping dash for too long through (late release leniency)
      if (ev.action === 'dash-up' && delta > 0) {
        perfectWindow += 70;
        goodWindow += 70;
      }
      
      const ad = Math.abs(delta);
      const g = ad <= perfectWindow ? 'perfect' : ad <= goodWindow ? 'good' : (delta < 0 ? 'early' : 'late');
      
      // Rubberbanding: if this is the start of a CD block (atk-down at index 0 or 4 of rep)
      // and it was hit within the acceptable range (perfect/good), shift the subsequent inputs
      const isAnchor = (eventInRep === 0 || eventInRep === 4);
      if (isAnchor && (g === 'perfect' || g === 'good')) {
        const anchorIdx = run.nextIdx;
        for (let i = 1; i <= 3; i++) {
          if (run.events[anchorIdx + i]) {
            run.events[anchorIdx + i].t += delta * RATE;
          }
        }
      }

      grade(g, delta);
      run.nextIdx++;
    } else {
      grade('wrong', 0);
    }
  };

  // main loop (pause-aware clock)
  useEffect(() => {
    const loop = () => {
      const t = performance.now();
      const run = runRef.current;
      if (run.running) {
        if (run.lastT == null) run.lastT = t;
        let frameDelta = t - run.lastT;
        run.lastT = t;
        if (frameDelta > 200) {
          run.startPerf += frameDelta;
          frameDelta = 0;
        }
        const now = t - run.startPerf;
        run.now = now;
        nowRef.current = now;
        const dtSec = frameDelta / 1000;
        if (now >= 0) {
          ensureEvents(Math.ceil((now * RATE) / REP_LEN) + 2);
          let ev;
          while ((ev = run.events[run.nextIdx])) {
            const eventInRep = run.nextIdx % 8;
            let goodWindow = WIN.good * (eventInRep === 4 ? 1.30 : 1.0);
            if (ev.action === 'dash-up') {
              goodWindow += 70;
            }
            if (now > ev.t / RATE + goodWindow + 70) {
              grade('miss', 0);
              run.nextIdx++;
            } else {
              break;
            }
          }
          run.speed = clamp(run.speed - DECAY_PER_SEC * dtSec, 0, SPEED_MAX);
        }
        const cd = now < 0 ? Math.ceil(-now / 1000) : 0;
        if (cd !== cdRef.current) {
          cdRef.current = cd;
          setCountdown(cd);
        }
        setSpeed(run.speed);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [DECAY_PER_SEC, RATE, REP_LEN, SPEED_MAX, WIN.good]);

  const start = () => {
    const run = runRef.current;
    run.events = [];
    run.genRep = 0;
    run.nextIdx = 0;
    run.speed = 0;
    run.now = -3000;
    run.startPerf = performance.now() + 3000;
    run.lastT = null;
    run.pressed = new Set();
    run.atk = false;
    run.dash = false;
    ensureEvents(4);
    lastRef.current = null;
    setLast(null);
    setGrades([]);
    setPressed({ atk: false, dash: false });
    streakRef.current = 0;
    topRef.current = 0;
    setStreak(0);
    setTopSpeed(0);
    run.running = true;
    setRunning(true);
    try {
      const a = new (window.AudioContext || window.webkitAudioContext)();
      if (a.state === 'suspended') a.resume();
    } catch (e) {}
  };
  
  const stop = () => {
    runRef.current.running = false;
    setRunning(false);
  };

  // ---- input handling ----
  const stageRef = useRef(null);
  useEffect(() => {
    const handle = (e, isDown) => {
      if (listenRef.current) {
        if (e.type === 'keydown' && e.code === 'Escape') {
          e.preventDefault();
          setListen(null);
          return;
        }
        if (isDown) {
          e.preventDefault();
          const code = rawCode(e);
          const action = listenRef.current;
          const nb = { ...bindingsRef.current, [action]: code };
          const other = action === 'attack' ? 'dash' : 'attack';
          if (nb[other] === code) nb[other] = bindingsRef.current[action];
          setBindings(nb);
          setListen(null);
        }
        return;
      }
      const code = rawCode(e);
      const b = bindingsRef.current, run = runRef.current;
      const isAtkKey = (code === b.attack);
      const isDashKey = (code === b.dash) || 
        ((b.dash === 'ShiftLeft' || b.dash === 'ShiftRight' || b.dash === 'M2') && 
         (code === 'ShiftLeft' || code === 'ShiftRight' || code === 'M2'));
      
      if ((isAtkKey || isDashKey) && (code === 'Space' || code.startsWith('Arrow'))) e.preventDefault();
      if (isDown) {
        if (run.pressed.has(code)) return;
        run.pressed.add(code);
        if (isAtkKey && !run.atk) {
          run.atk = true;
          setPressed({ atk: true, dash: run.dash });
          transition('atk-down');
        }
        if (isDashKey && !run.dash) {
          run.dash = true;
          setPressed({ atk: run.atk, dash: true });
          transition('dash-down');
        }
      } else {
        run.pressed.delete(code);
        if (isAtkKey && run.atk) {
          run.atk = false;
          setPressed({ atk: false, dash: run.dash });
          transition('atk-up');
        }
        if (isDashKey && run.dash) {
          run.dash = false;
          setPressed({ atk: run.atk, dash: false });
          transition('dash-up');
        }
      }
    };
    
    const kd = (e) => handle(e, true);
    const ku = (e) => handle(e, false);
    const md = (e) => {
      const stage = stageRef.current;
      const isRebinding = !!listenRef.current;
      const isClickingStage = stage && stage.contains(e.target);
      
      if (isRebinding || (runRef.current.running && isClickingStage)) {
        e.preventDefault();
        handle(e, true);
      }
    };
    const mu = (e) => handle(e, false);
    const cm = (e) => e.preventDefault();

    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    window.addEventListener('mousedown', md);
    window.addEventListener('mouseup', mu);
    window.addEventListener('contextmenu', cm);

    return () => {
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
      window.removeEventListener('mousedown', md);
      window.removeEventListener('mouseup', mu);
      window.removeEventListener('contextmenu', cm);
    };
  }, []);

  const onRebind = (id) => setListen((cur) => (cur === id ? null : id));
  const scale = 1 + clamp(speed / SPEED_MAX, 0, 1) * 0.16;
  const lc = last ? GRADE_COLOR[last.grade] : 'transparent';
  const showDelta = last && ['perfect', 'good', 'early', 'late'].includes(last.grade);
  const liveFlash = last && performance.now() - last.ts < 220 ? last : null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '26px 24px 56px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <DynamicIsland running={running} />
      
      {/* GitHub Link (fixed far left, hidden when playing) */}
      {!running && (
        <a 
          href="https://github.com/zsksc-gen/mavuika-trainer"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            position: 'fixed',
            left: 24,
            bottom: 24,
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9997,
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
          title="GitHub Repository"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.24 6.839 9.504.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.24 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
          </svg>
        </a>
      )}
      
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
          Hold <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.attack)}</b> across each charge bar; tap <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.dash)}</b> inside it. <b style={{ color: 'var(--severity-critical)', fontWeight: '700' }}>Mouse input works over this strip.</b>
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
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 4,
            height: 96,
            marginTop: 6,
            borderTop: '1px solid var(--border-subtle)',
            paddingTop: 8,
            overflow: 'hidden'
          }}>
            {grades.slice(-4).map((item) => {
              const color = GRADE_COLOR[item.grade];
              const text = GRADE_TEXT[item.grade];
              const showMs = ['perfect', 'good', 'early', 'late'].includes(item.grade);
              const msText = showMs ? ` ${item.delta > 0 ? '+' : ''}${Math.round(item.delta)}ms` : '';
              return (
                <div
                  key={item.id}
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: color,
                    textTransform: 'uppercase',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                  <span>{text}{msText}</span>
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img src="assets/mavuika-dance.gif" alt="Mavuika" style={{ width: 112, height: 112, display: 'block', position: 'relative', transform: `scale(${scale})`, transformOrigin: 'bottom center', transition: 'transform 0.2s' }} />
          <a href="https://x.com/greentoko/status/1831841462839079241" target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#0066cc', textDecoration: 'none', marginTop: 4, cursor: 'pointer' }}>
            @GreenToko
          </a>
        </div>
      </div>

      {/* start / stop + sound */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 20 }}>
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

      {/* latest update info */}
      {!running && latestPR && (
        <div style={{ textAlign: 'center', fontSize: 10, color: 'var(--text-muted)', marginTop: 8, letterSpacing: '0.02em' }}>
          LATEST UPDATE: <a href={latestPR.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', borderBottom: '1px dashed var(--border-light)', fontWeight: 600 }}>
            {latestPR.number ? `#${latestPR.number} ` : ''}{latestPR.title}
          </a> ({latestPR.timeStr})
        </div>
      )}
    </div>
  );
}
