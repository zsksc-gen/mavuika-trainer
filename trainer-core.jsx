/* =============================================================
   VULCAN — Mavuika Combo Drill
   Timing model distilled from combo-notes.md (frame-perfect CCDCDF segment).
   Visual system: Ophanim EDR (warm parchment, indigo/gold, sharp corners).
   ============================================================= */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------------------------------------------------------------
   COMBO TIMING MODEL
   One rep = two charged-attack holds, each with a dash tap inside.
   Hold B is the long one (waits out the spin charge) and its release
   is the Finisher (F). Times are ms-from-rep-start (user dwell data).
   --------------------------------------------------------------- */
const {
  TOL, SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC,
  REP_LEN, REP_BARS, REP_EVENTS
} = window.VULCAN_CONFIG;

const COMBO_NOTATION = 'CCDCDCF  2(CDCDCF)';

const TEMPOS = [
  { label: '50%', rate: 0.50 },
  { label: '65%', rate: 0.65 },
  { label: '80%', rate: 0.80 },
  { label: '100%', rate: 1.0 },
];

const LS_KEY = 'vulcan-trainer-v1';

/* ---------- helpers ---------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rawCode = (e) => (e.type.startsWith('mouse') ? 'M' + e.button : e.code);
function codeLabel(code) {
  if (code === 'M0') return 'Mouse Left';
  if (code === 'M1') return 'Mouse Mid';
  if (code === 'M2') return 'Mouse Right';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Space') return 'Space';
  if (code && code.startsWith('Key')) return code.slice(3);
  if (code && code.startsWith('Digit')) return code.slice(5);
  if (code && code.startsWith('Arrow')) return code.slice(5) + ' Arrow';
  return code || '—';
}
const DEFAULT_BINDINGS = { attack: 'M0', dash: 'ShiftLeft' };
const DEFAULT_SETTINGS = { tempo: 1.0, tolerance: 'normal', sound: true, dark: false };

function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      bindings: { ...DEFAULT_BINDINGS, ...(s.bindings || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    };
  } catch (e) { return { bindings: { ...DEFAULT_BINDINGS }, settings: { ...DEFAULT_SETTINGS } }; }
}
function saveStore(bindings, settings) {
  try { localStorage.setItem(LS_KEY, JSON.stringify({ bindings, settings })); } catch (e) {}
}

/* ---------- tiny audio (grade ticks) ---------- */
let audioCtx = null;
function blip(freq, dur, vol, type) {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    o.connect(g); g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now); o.stop(now + dur + 0.02);
  } catch (e) {}
}
const GRADE_SOUND = {
  perfect: () => blip(880, 0.09, 0.18, 'triangle'),
  good:    () => blip(620, 0.08, 0.14, 'triangle'),
  early:   () => blip(240, 0.10, 0.16, 'sawtooth'),
  late:    () => blip(200, 0.12, 0.16, 'sawtooth'),
  miss:    () => blip(150, 0.16, 0.18, 'square'),
  wrong:   () => blip(110, 0.10, 0.14, 'square'),
};

/* ---------- icons (Fluent-style) ---------- */
const Svg = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"><path d={d} fill="currentColor" /></svg>
);
const PlayIcon = () => <Svg d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v15.78a1.5 1.5 0 0 0 2.3 1.27l12.7-7.89a1.5 1.5 0 0 0 0-2.54L6.3 2.84Z" />;
const StopIcon = () => <Svg d="M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />;
const MoonIcon = () => <Svg d="M12.73 2.004a.75.75 0 0 1 .12.904 8.25 8.25 0 0 0 10.24 10.24.75.75 0 0 1 .906 1.033A10.001 10.001 0 0 1 12 22C6.477 22 2 17.523 2 12A10 10 0 0 1 11.82 2.01a.75.75 0 0 1 .91-.006Z" />;
const SunIcon = () => <Svg d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM3 11.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3Zm16.5 0a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5h-1.5Zm-14.03-6.53a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 1 0 1.06-1.06L5.47 4.72Zm12.12 0-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0-1.06-1.06ZM12 19.5a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-5.47-.97-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0-1.06-1.06Zm10.94 0a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 0 0 1.06-1.06l-1.06-1.06Z" />;

/* ---------- Vulcan brand mark (Ophanim eye, re-read as a wheel) ---------- */
const VulcanMark = ({ size = 34 }) => (
  <div style={{ width: size, height: size, border: '2px solid var(--accent-indigo)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, position: 'relative' }}>
    <div style={{ width: size * 0.34, height: size * 0.34, background: 'var(--accent-gold)', borderRadius: '50%' }} />
    {[0, 45, 90, 135].map((a) => (
      <div key={a} style={{ position: 'absolute', width: size, height: 1, background: 'var(--accent-indigo)', opacity: 0.22, transform: `rotate(${a}deg)` }} />
    ))}
  </div>
);

/* shared style tokens for this app */
const VB = {
  serif: { fontFamily: 'var(--font-display)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(26,26,46,0.04)' },
  label: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--accent-indigo)' },
};

Object.assign(window, {
  REP_LEN, REP_BARS, REP_EVENTS, COMBO_NOTATION, TOL, TEMPOS,
  SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC, LS_KEY,
  clamp, rawCode, codeLabel, DEFAULT_BINDINGS, DEFAULT_SETTINGS,
  loadStore, saveStore, blip, GRADE_SOUND,
  Svg, PlayIcon, StopIcon, MoonIcon, SunIcon, VulcanMark, VB,
});
