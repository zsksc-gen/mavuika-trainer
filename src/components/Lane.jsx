import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { VULCAN_CONFIG } from '../core/config';
import { VB, GRADE_COLOR } from '../core/tokens';

const PX_PER_MS = 0.26;

export default function Lane({ nowRef, rate, judgeFlash }) {
  const { REP_LEN, REP_BARS } = VULCAN_CONFIG;
  const wrapRef = useRef(null);
  const [w, setW] = useState(900);
  const innerRef = useRef(null);

  useLayoutEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth));
    ro.observe(el);
    setW(el.clientWidth);
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
          if (!seen[k]) {
            inner.__bars[k].remove();
            delete inner.__bars[k];
          }
        });
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [w, rate, REP_LEN, REP_BARS]);

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
