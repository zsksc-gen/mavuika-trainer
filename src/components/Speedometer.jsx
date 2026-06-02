import React, { useState, useEffect, useRef } from 'react';
import { VULCAN_CONFIG } from '../core/config';
import { clamp } from '../core/utils';

export default function Speedometer({ speed, running }) {
  const { SPEED_MAX, REDLINE } = VULCAN_CONFIG;
  const cx = 160, cy = 150, R = 132, RT = 118, RL = 96;
  const polar = (r, deg) => {
    const a = deg * Math.PI / 180;
    return [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  };
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

  useEffect(() => {
    targetRef.current = speed;
  }, [speed]);

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
        if (p >= 1) {
          sweepRef.current = null;
          v = targetRef.current;
        } else {
          v = Math.sin(Math.min(p, 1) * Math.PI) * SPEED_MAX; // up to max and back
        }
      } else {
        v += (targetRef.current - v) * 0.22; // critically-ish damped chase
      }
      if (Math.abs(v - dispRef.current) > 0.05 || v !== dispRef.current) {
        dispRef.current = v;
        setDisp(v);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [SPEED_MAX]);

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
