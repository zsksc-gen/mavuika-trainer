import React, { useState, useEffect, useRef } from 'react';
import { VULCAN_CONFIG, COMBOS } from './core/config';
import { clamp, rawCode, codeLabel, loadStore, saveStore } from './core/utils';
import { GRADE_SOUND } from './core/audio';
import { GRADE_COLOR, GRADE_TEXT } from './core/tokens';
import { PlayIcon, StopIcon } from './components/Icons';
import Speedometer from './components/Speedometer';
import Lane from './components/Lane';
import DynamicIsland from './components/DynamicIsland';
import { MouseOverlay, Stat } from './components/MouseOverlay';



function AnalyticsReport({ show, onClose, gradesLog, speedHistory, speedMax, redline }) {
  if (!show) return null;

  const totalHits = gradesLog.length;
  const gradeCounts = gradesLog.reduce((acc, curr) => {
    acc[curr.grade] = (acc[curr.grade] || 0) + 1;
    return acc;
  }, { perfect: 0, good: 0, early: 0, late: 0, miss: 0, wrong: 0 });

  const validHits = gradesLog.filter(g => ['perfect', 'good', 'early', 'late'].includes(g.grade));
  const avgOffset = validHits.length > 0
    ? Math.round(validHits.reduce((acc, curr) => acc + Math.abs(curr.delta), 0) / validHits.length)
    : 0;

  let pointsStr = '';
  if (speedHistory.length > 1) {
    const minTime = speedHistory[0].time;
    const maxTime = speedHistory[speedHistory.length - 1].time || 1;
    const timeSpan = maxTime - minTime || 1;

    pointsStr = speedHistory.map((pt) => {
      const x = ((pt.time - minTime) / timeSpan) * 280 + 10;
      const y = 90 - (pt.speed / speedMax) * 80;
      return `${x},${y}`;
    }).join(' ');
  }

  return (
    <div 
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000,
        animation: 'fadeIn 0.25s ease-out',
        color: 'var(--text-primary)'
      }}
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-light)',
          width: 640,
          maxWidth: '92vw',
          padding: 30,
          borderRadius: 16,
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-light)', paddingBottom: 14 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Performance Report</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              borderRadius: '50%',
              width: 30,
              height: 30,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}
          >✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Stats breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Timing Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>
                <span>Accuracy Consistency</span>
                <span style={{ fontWeight: 600, color: avgOffset <= 50 ? 'var(--severity-low)' : 'var(--text-primary)' }}>
                  {totalHits > 0 ? `${avgOffset} ms` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--border-subtle)', paddingBottom: 4 }}>
                <span>Total Evaluated Actions</span>
                <span style={{ fontWeight: 600 }}>{totalHits}</span>
              </div>
            </div>
            {/* Grade list */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 8 }}>
              {['perfect', 'good', 'early', 'late', 'miss', 'wrong'].map((g) => {
                const count = gradeCounts[g];
                const label = g.toUpperCase();
                const color = GRADE_COLOR[g];
                return (
                  <div key={g} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 12px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-light)',
                    fontSize: 11,
                    fontWeight: 600
                  }}>
                    <span style={{ color, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: color }} />
                      {label}
                    </span>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Speed Chart */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>Speed Profile (KM/H)</h3>
            <div style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-light)',
              height: 140,
              position: 'relative',
              borderRadius: 8,
              overflow: 'hidden'
            }}>
              {speedHistory.length > 1 ? (
                <svg width="100%" height="100%" viewBox="0 0 300 100" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="90" x2="300" y2="90" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="50" x2="300" y2="50" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3,3" />
                  <line x1="0" y1="10" x2="300" y2="10" stroke="var(--border-light)" strokeWidth="1" strokeDasharray="3,3" />
                  <text x="5" y="86" fontSize="7" fill="var(--text-muted)">0</text>
                  <text x="5" y="46" fontSize="7" fill="var(--text-muted)">{Math.round(speedMax / 2)}</text>
                  <text x="5" y="16" fontSize="7" fill="var(--text-muted)">{speedMax}</text>
                  {/* Speed Line */}
                  <polyline
                    fill="none"
                    stroke="var(--severity-critical)"
                    strokeWidth="2.5"
                    points={pointsStr}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  No speed data collected
                </div>
              )}
            </div>
          </div>
        </div>

        <button 
          onClick={onClose}
          style={{
            background: 'var(--text-primary)',
            color: 'var(--bg-primary)',
            border: 'none',
            padding: '12px 0',
            fontFamily: 'var(--font-display)',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            marginTop: 10,
            transition: 'opacity 0.2s'
          }}
        >
          Confirm & Close
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const init = loadStore();
  const [bindings, setBindings] = useState(init.bindings);
  const [sound, setSound] = useState(init.settings.sound !== false);
  const [freestyle, setFreestyle] = useState(init.settings.freestyle === true);
  const [waitingForStart, setWaitingForStart] = useState(false);
  const [running, setRunning] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [last, setLast] = useState(null);
  const [pressed, setPressed] = useState({ atk: false, dash: false });
  const [listen, setListen] = useState(null);
  const [streak, setStreak] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [grades, setGrades] = useState([]);
  const [gradesLog, setGradesLog] = useState([]);
  const [speedHistory, setSpeedHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const streakRef = useRef(0);
  const topRef = useRef(0);

  const [comboKey, setComboKey] = useState('cdcdcf');
  const [cdMultiplier, setCdMultiplier] = useState(2); // 1 = CD, 2 = CDCD

  const activeCombo = (() => {
    const base = COMBOS[comboKey] || COMBOS.cdcdcf;
    if (comboKey === 'cd') {
      const repBars = [
        { lane: "atk", start: 0, end: 320, finisher: false },
        { lane: "dash", start: 200, end: 250 }
      ];
      const repEvents = [
        { action: "atk-down", t: 0, label: "CHARGE" },
        { action: "dash-down", t: 200, label: "DASH" },
        { action: "dash-up", t: 250, label: "dash end" },
        { action: "atk-up", t: 320, label: "cancel" }
      ];
      const seq = [
        { sym: '▼', side: 'L', dwell: 200 },
        { sym: '▼', side: 'R', dwell: 50 },
        { sym: '▲', side: 'R', dwell: 70 }
      ];

      if (cdMultiplier === 2) {
        seq.push({ sym: '▲', side: 'L', dwell: 50 });
        repBars.push(
          { lane: "atk", start: 370, end: 690, finisher: false },
          { lane: "dash", start: 570, end: 620 }
        );
        repEvents.push(
          { action: "atk-down", t: 370, label: "CHARGE" },
          { action: "dash-down", t: 570, label: "DASH" },
          { action: "dash-up", t: 620, label: "dash end" },
          { action: "atk-up", t: 690, label: "cancel" }
        );
        seq.push(
          { sym: '▼', side: 'L', dwell: 200 },
          { sym: '▼', side: 'R', dwell: 50 },
          { sym: '▲', side: 'R', dwell: 70 },
          { sym: '▲', side: 'L', dwell: 1000 }
        );
      } else {
        seq.push({ sym: '▲', side: 'L', dwell: 1000 });
      }

      const repLen = cdMultiplier === 2 ? 1690 : 1320;

      return {
        ...base,
        name: cdMultiplier === 1 ? "CD (Short Loop)" : "CDCD (Short Loop)",
        notation: cdMultiplier === 1 ? "CD (Spaced 1s)" : "CDCD (Spaced 1s)",
        repLen,
        repBars,
        repEvents,
        seq
      };
    }
    return base;
  })();

  const SEQ = activeCombo.seq;
  const COMBO_NOTATION = activeCombo.notation;
  const REP_LEN = activeCombo.repLen;
  const REP_EVENTS = activeCombo.repEvents;

  const { SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC, TOL } = VULCAN_CONFIG;
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
    dash: false,
    gpAtkPressed: false,
    gpDashPressed: false,
    gradesLog: [],
    speedHistory: [],
    lastRecordTime: 0,
    waitingForStart: false
  });
  const lastRef = useRef(null);
  const cdRef = useRef(0);
  const rafRef = useRef(null);
  const bindingsRef = useRef(bindings);
  const soundRef = useRef(sound);
  const listenRef = useRef(null);
  const videoRef = useRef(null);
  const [latestPR, setLatestPR] = useState(null);
  const [gamepadConnected, setGamepadConnected] = useState(false);

  useEffect(() => {
    const checkGamepads = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let found = false;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          setGamepadConnected(true);
          found = true;
          break;
        }
      }
      if (!found) {
        setGamepadConnected(false);
      }
    };

    window.addEventListener('gamepadconnected', checkGamepads);
    window.addEventListener('gamepaddisconnected', checkGamepads);
    
    checkGamepads();
    const interval = setInterval(checkGamepads, 1000);

    return () => {
      window.removeEventListener('gamepadconnected', checkGamepads);
      window.removeEventListener('gamepaddisconnected', checkGamepads);
      clearInterval(interval);
    };
  }, []);

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
    saveStore(bindings, { ...init.settings, sound, freestyle });
  }, [sound, freestyle, bindings, init.settings]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  // Auto-start on mount
  useEffect(() => {
    start();
  }, []);

  // Regenerate events when combo config changes while waiting for start
  useEffect(() => {
    if (runRef.current.waitingForStart) {
      runRef.current.events = [];
      runRef.current.genRep = 0;
      runRef.current.nextIdx = 0;
      ensureEvents(freestyle ? 0 : 4);
    }
  }, [comboKey, cdMultiplier, freestyle]);

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

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (speed === 0) {
      if (!video.paused) {
        video.pause();
      }
    } else {
      // 1-299 is 0% to 300% speed.
      const rate = ((speed - 1) / 298) * 3.0;
      const clampedRate = clamp(rate, 0.0625, 3.0);
      video.playbackRate = clampedRate;
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [speed]);

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

    // Record to gradesLog ref for after action report
    if (run.running) {
      run.gradesLog = run.gradesLog || [];
      run.gradesLog.push({
        grade: g,
        delta,
        ts
      });
    }
  };

  const transition = (action) => {
    const run = runRef.current;
    if (!run.running) return;

    if (run.waitingForStart) {
      const firstEvent = REP_EVENTS[0];
      if (firstEvent && firstEvent.action === action) {
        run.waitingForStart = false;
        setWaitingForStart(false);
        run.startPerf = performance.now();
        run.now = 0;
        nowRef.current = 0;
      } else {
        return;
      }
    }

    const ev = run.events[run.nextIdx];
    if (!ev) return;
    const tReal = ev.t / RATE;
    if (ev.action === action) {
      const delta = run.now - tReal;
      const eventInRep = run.nextIdx % REP_EVENTS.length;
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

      // Poll Gamepad
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      let gp = null;
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          gp = gamepads[i];
          break;
        }
      }

      if (gp) {
        const b = bindingsRef.current;

        // Controller Rebinding Check
        if (listenRef.current === 'gpAttack' || listenRef.current === 'gpDash') {
          for (let buttonIdx = 0; buttonIdx < gp.buttons.length; buttonIdx++) {
            if (gp.buttons[buttonIdx]?.pressed) {
              const action = listenRef.current;
              const code = 'GP' + buttonIdx;
              const nb = { ...bindingsRef.current, [action]: code };
              const other = action === 'gpAttack' ? 'gpDash' : 'gpAttack';
              if (nb[other] === code) nb[other] = bindingsRef.current[action];
              setBindings(nb);
              setListen(null);
              break;
            }
          }
        } else {
          // Gameplay Polling
          const getGpBtnIndex = (bindStr) => {
            if (bindStr && bindStr.startsWith('GP')) {
              return parseInt(bindStr.slice(2));
            }
            return -1;
          };

          const atkIdx = getGpBtnIndex(b.gpAttack);
          const dashIdx = getGpBtnIndex(b.gpDash);

          const atkPressed = atkIdx !== -1 && gp.buttons[atkIdx]?.pressed;
          const dashPressed = dashIdx !== -1 && gp.buttons[dashIdx]?.pressed;

          // Gamepad Attack button transition
          if (atkPressed && !run.gpAtkPressed) {
            run.gpAtkPressed = true;
            if (!run.atk) {
              run.atk = true;
              setPressed(p => ({ ...p, atk: true }));
              transition('atk-down');
            }
          } else if (!atkPressed && run.gpAtkPressed) {
            run.gpAtkPressed = false;
            const kbCode = b.attack;
            const kbPressed = run.pressed.has(kbCode);
            if (!kbPressed && run.atk) {
              run.atk = false;
              setPressed(p => ({ ...p, atk: false }));
              transition('atk-up');
            }
          }

          // Gamepad Dash button transition
          if (dashPressed && !run.gpDashPressed) {
            run.gpDashPressed = true;
            if (!run.dash) {
              run.dash = true;
              setPressed(p => ({ ...p, dash: true }));
              transition('dash-down');
            }
          } else if (!dashPressed && run.gpDashPressed) {
            run.gpDashPressed = false;
            const kbCode = b.dash;
            const kbPressed = run.pressed.has(kbCode) || 
              ((kbCode === 'ShiftLeft' || kbCode === 'ShiftRight' || kbCode === 'M2') && 
               (run.pressed.has('ShiftLeft') || run.pressed.has('ShiftRight') || run.pressed.has('M2')));
            if (!kbPressed && run.dash) {
              run.dash = false;
              setPressed(p => ({ ...p, dash: false }));
              transition('dash-up');
            }
          }
        }
      }

      if (run.running) {
        if (run.lastT == null) run.lastT = t;
        let frameDelta = t - run.lastT;
        run.lastT = t;
        if (frameDelta > 200) {
          run.startPerf += frameDelta;
          frameDelta = 0;
        }

        if (run.waitingForStart) {
          run.now = 0;
          nowRef.current = 0;
          setSpeed(run.speed);
        } else {
          const now = t - run.startPerf;
          run.now = now;
          nowRef.current = now;
          const dtSec = frameDelta / 1000;
          if (now >= 0) {
            if (!freestyle) {
              ensureEvents(Math.ceil((now * RATE) / REP_LEN) + 2);
            }
            
            // Sample speed for analytics graph
            if (now - run.lastRecordTime >= 100) {
              run.speedHistory = run.speedHistory || [];
              run.speedHistory.push({ time: now, speed: run.speed });
              run.lastRecordTime = now;
            }

            let ev;
            while ((ev = run.events[run.nextIdx])) {
              const eventInRep = run.nextIdx % REP_EVENTS.length;
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

            if (freestyle && run.nextIdx >= REP_EVENTS.length) {
              run.waitingForStart = true;
              setWaitingForStart(true);
              run.events = [];
              run.genRep = 0;
              run.nextIdx = 0;
              ensureEvents(0);
              run.now = 0;
              nowRef.current = 0;
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
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [DECAY_PER_SEC, RATE, REP_LEN, SPEED_MAX, WIN.good, freestyle, REP_EVENTS]);

  const start = () => {
    const run = runRef.current;
    run.events = [];
    run.genRep = 0;
    run.nextIdx = 0;
    run.speed = 0;
    run.lastT = null;
    run.pressed = new Set();
    run.atk = false;
    run.dash = false;
    run.gradesLog = [];
    run.speedHistory = [{ time: 0, speed: 0 }];
    run.lastRecordTime = 0;

    run.now = 0;
    run.startPerf = 0;
    run.waitingForStart = true;
    setWaitingForStart(true);
    setCountdown(0);

    if (freestyle) {
      ensureEvents(0);
    } else {
      ensureEvents(4);
    }

    lastRef.current = null;
    setLast(null);
    setGrades([]);
    setGradesLog([]);
    setSpeedHistory([]);
    setShowReport(false);
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
    setGradesLog([...runRef.current.gradesLog]);
    setSpeedHistory([...runRef.current.speedHistory]);
    setShowReport(true);
  };

  const closeReport = () => {
    setShowReport(false);
    start();
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
          
          // Only rebind keyboard/mouse actions using keyboard/mouse inputs
          if (action === 'attack' || action === 'dash') {
            const nb = { ...bindingsRef.current, [action]: code };
            const other = action === 'attack' ? 'dash' : 'attack';
            if (nb[other] === code) nb[other] = bindingsRef.current[action];
            setBindings(nb);
            setListen(null);
          }
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
          setPressed(p => ({ ...p, atk: true }));
          transition('atk-down');
        }
        if (isDashKey && !run.dash) {
          run.dash = true;
          setPressed(p => ({ ...p, dash: true }));
          transition('dash-down');
        }
      } else {
        run.pressed.delete(code);
        if (isAtkKey && run.atk) {
          if (!run.gpAtkPressed) {
            run.atk = false;
            setPressed(p => ({ ...p, atk: false }));
            transition('atk-up');
          }
        }
        if (isDashKey && run.dash) {
          if (!run.gpDashPressed) {
            run.dash = false;
            setPressed(p => ({ ...p, dash: false }));
            transition('dash-up');
          }
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
      <DynamicIsland running={running && !waitingForStart} />
      
      {/* GitHub Link (fixed far left, hidden when playing) */}
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
          opacity: waitingForStart ? 1 : 0,
          pointerEvents: waitingForStart ? 'auto' : 'none',
          transition: 'color 0.2s, opacity 0.25s ease-in-out',
        }}
        onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
        onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
        title="GitHub Repository"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.24 6.839 9.504.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.24 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
      </a>
      
      {/* title */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, letterSpacing: '0.5em', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2, paddingLeft: '0.5em' }}>Flamestrider Drill</div>
        <h1 style={{ fontSize: 40, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '0.02em', textTransform: 'uppercase', lineHeight: 1 }}>Mavuika Combo Trainer</h1>
        <div style={{ display: 'inline-block', marginTop: 10, padding: '5px 18px', border: '1px solid var(--border-light)', fontFamily: 'var(--font-display)', fontSize: 17, letterSpacing: '0.16em', color: 'var(--text-secondary)' }}>{COMBO_NOTATION}</div>
      </div>

      {/* combo selection buttons */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: 12,
        opacity: waitingForStart ? 1 : 0,
        pointerEvents: waitingForStart ? 'auto' : 'none',
        transition: 'opacity 0.25s ease-in-out'
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: -4 }}>
          {Object.entries(COMBOS).map(([key, item]) => {
            const isActive = comboKey === key;
            return (
              <button
                key={key}
                onClick={() => setComboKey(key)}
                style={{
                  background: isActive ? 'var(--text-primary)' : 'var(--bg-secondary)',
                  color: isActive ? 'var(--bg-primary)' : 'var(--text-secondary)',
                  border: `1px solid ${isActive ? 'var(--text-primary)' : 'var(--border-light)'}`,
                  padding: '6px 14px',
                  fontFamily: 'var(--font-display)',
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  borderRadius: 4,
                  transition: 'all 0.15s'
                }}
              >
                {item.name}
              </button>
            );
          })}
        </div>
        {comboKey === 'cd' && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: 12, 
            padding: '6px 12px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-light)',
            borderRadius: 6,
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <span style={{ 
              fontSize: 10, 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              letterSpacing: '0.08em', 
              textTransform: 'uppercase' 
            }}>
              Multiplier:
            </span>
            <div style={{ display: 'flex', gap: 6 }}>
              {[1, 2].map((num) => {
                const active = cdMultiplier === num;
                return (
                  <button
                    key={num}
                    onClick={() => setCdMultiplier(num)}
                    style={{
                      background: active ? 'var(--text-primary)' : 'var(--bg-secondary)',
                      color: active ? 'var(--bg-primary)' : 'var(--text-secondary)',
                      border: `1px solid ${active ? 'var(--text-primary)' : 'var(--border-subtle)'}`,
                      padding: '3px 10px',
                      fontFamily: 'var(--font-display)',
                      fontSize: 10,
                      fontWeight: 700,
                      cursor: 'pointer',
                      borderRadius: 3,
                      transition: 'all 0.15s'
                    }}
                  >
                    {num === 1 ? '1x (CD)' : '2x (CDCD)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}
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
          <Lane nowRef={nowRef} rate={RATE} judgeFlash={liveFlash} repLen={REP_LEN} repBars={activeCombo.repBars} freestyle={freestyle} />
          {running && countdown > 0 && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: 72, fontWeight: 700, color: 'var(--severity-high)' }}>{countdown}</span>
            </div>
          )}
          {running && waitingForStart && (
            <div style={{ 
              position: 'absolute', 
              inset: 0, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              pointerEvents: 'none',
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(1px)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <span style={{ 
                fontFamily: 'var(--font-display)', 
                fontSize: 16, 
                fontWeight: 700, 
                color: 'var(--text-primary)', 
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-light)',
                padding: '10px 22px',
                borderRadius: 6,
                boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
              }}>
                Awaiting First Input (Hold Charge)
              </span>
            </div>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 7, textAlign: 'center' }}>
          Hold <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.attack)}</b> across each charge bar; tap <b style={{ color: 'var(--text-secondary)' }}>{codeLabel(bindings.dash)}</b> inside it. <b style={{ color: 'var(--severity-critical)', fontWeight: '700' }}>Mouse input works over this strip.</b>
        </div>
      </div>

      {/* Dashboard Row (Inputs, Speedometer, and Dancer Side-by-Side) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap', marginTop: 8 }}>
        {/* Left: Interactive Input Visuals */}
        <MouseOverlay pressed={pressed} bindings={bindings} listen={listen} onRebind={onRebind} gamepadConnected={gamepadConnected} />
        
        {/* Center: Speedometer & Readout */}
        <div style={{ width: 260, maxWidth: '100%', position: 'relative' }}>
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

        {/* Right: Dancer GIF/WebM */}
        <div style={{ position: 'relative', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <video
            ref={videoRef}
            src="assets/mavuika-dance.webm"
            loop
            muted
            playsInline
            style={{
              width: 100,
              height: 100,
              display: 'block',
              position: 'relative',
              transform: `scale(${scale})`,
              transformOrigin: 'bottom center',
              transition: 'transform 0.2s',
              objectFit: 'cover'
            }}
          />
          <a href="https://x.com/greentoko/status/1831841462839079241" target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, color: '#0066cc', textDecoration: 'none', marginTop: 4, cursor: 'pointer' }}>
            @GreenToko
          </a>
        </div>
      </div>

      {/* Start / Stop + Sound + Freestyle Controls (Restored at bottom) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, marginTop: 12 }}>
        <button onClick={running ? stop : start} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '12px 36px',
          fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.14em',
          background: running ? 'transparent' : 'var(--text-primary)',
          color: running ? 'var(--severity-critical)' : 'var(--bg-primary)',
          border: `2px solid ${running ? 'var(--severity-critical)' : 'var(--text-primary)'}`,
        }}>
          {running ? <StopIcon /> : <PlayIcon />}{running ? 'Stop' : 'Ride'}
        </button>
        <button onClick={() => setSound((s) => !s)} title={sound ? 'Mute' : 'Unmute'} style={{
          width: 40, height: 40, border: '1px solid var(--border-light)', background: 'var(--bg-secondary)', cursor: 'pointer',
          color: sound ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 4
        }}>{sound ? '♪' : '✕'}</button>
        <button 
          onClick={() => setFreestyle((f) => !f)} 
          disabled={running && !waitingForStart}
          title={freestyle ? "Toggle Rhythm Mode" : "Toggle Freestyle Mode"}
          style={{
            border: '1px solid var(--border-light)',
            background: freestyle ? 'var(--text-primary)' : 'var(--bg-secondary)',
            color: freestyle ? 'var(--bg-primary)' : 'var(--text-secondary)',
            cursor: (running && !waitingForStart) ? 'not-allowed' : 'pointer',
            padding: '0 16px',
            height: 40,
            fontSize: 11,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            transition: 'all 0.15s',
            opacity: (running && !waitingForStart) ? 0.6 : 1,
            borderRadius: 4
          }}
        >
          {freestyle ? 'Freestyle: ON' : 'Freestyle: OFF'}
        </button>
      </div>

      {/* latest update info */}
      {latestPR && (
        <div style={{ 
          textAlign: 'center', 
          fontSize: 10, 
          color: 'var(--text-muted)', 
          marginTop: 8, 
          letterSpacing: '0.02em',
          opacity: waitingForStart ? 1 : 0,
          pointerEvents: waitingForStart ? 'auto' : 'none',
          transition: 'opacity 0.25s ease-in-out'
        }}>
          LATEST UPDATE: <a href={latestPR.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--text-secondary)', textDecoration: 'none', borderBottom: '1px dashed var(--border-light)', fontWeight: 600 }}>
            {latestPR.number ? `#${latestPR.number} ` : ''}{latestPR.title}
          </a> ({latestPR.timeStr})
        </div>
      )}

      <AnalyticsReport 
        show={showReport} 
        onClose={closeReport} 
        gradesLog={gradesLog} 
        speedHistory={speedHistory} 
        speedMax={SPEED_MAX}
        redline={REDLINE}
      />
    </div>
  );
}
