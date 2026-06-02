import React from 'react';
import { codeLabel } from '../core/utils';

export function MouseOverlay({ pressed, bindings, listen, onRebind }) {
  const atkOn = pressed.atk, dashOn = pressed.dash;
  const atkListen = listen === 'attack', dashListen = listen === 'dash';
  const ATK = 'var(--text-primary)', DASH = 'var(--text-primary)', INK = 'var(--text-muted)';
  const LEFT = 'M14 68 L14 40 Q14 6 48 6 L50 6 L50 68 Z';
  const RIGHT = 'M50 68 L50 6 L52 6 Q86 6 86 40 L86 68 Z';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <svg viewBox="0 0 100 152" width="92" style={{ display: 'block', overflow: 'visible' }}>
        {/* button fills */}
        <path d={LEFT} fill={ATK} opacity={atkOn ? 0.3 : atkListen ? 0.15 : 0.03} style={{ transition: 'opacity 0.08s' }} />
        <path d={RIGHT} fill={DASH} opacity={dashOn ? 0.3 : dashListen ? 0.15 : 0.03} style={{ transition: 'opacity 0.08s' }} />
        {/* outline + dividers */}
        <rect x="14" y="6" width="72" height="140" rx="34" ry="38" fill="none" stroke={INK} strokeWidth="1.5" />
        <line x1="50" y1="6" x2="50" y2="68" stroke={INK} strokeWidth="1.2" />
        <line x1="14" y1="68" x2="86" y2="68" stroke={INK} strokeWidth="1.2" />
        <rect x="45" y="20" width="10" height="24" rx="5" fill="none" stroke={INK} strokeWidth="1.2" />
        {/* hit areas for rebind */}
        <path d={LEFT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('attack')} />
        <path d={RIGHT} fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('dash')} />
      </svg>
      <BindingsMenu bindings={bindings} listen={listen} onRebind={onRebind} />
    </div>
  );
}

export function BindingsMenu({ bindings, listen, onRebind }) {
  const atkListen = listen === 'attack', dashListen = listen === 'dash';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
        {[['attack', 'ATTACK BIND', bindings.attack, atkListen], ['dash', 'DASH BIND', bindings.dash, dashListen]].map(([id, lbl, code, lis]) => (
          <button key={id} onClick={() => onRebind(id)} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, width: 180,
            background: lis ? 'var(--bg-secondary)' : 'var(--bg-card)', 
            border: `1px solid ${lis ? 'var(--text-primary)' : 'var(--border-light)'}`, 
            cursor: 'pointer', padding: '8px 12px', borderRadius: 4
          }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)' }}>{lbl}</span>
            <span style={{ fontSize: 11, color: lis ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: lis ? 700 : 600 }}>
              {lis ? '...' : codeLabel(code)}
            </span>
          </button>
        ))}
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 200, lineHeight: 1.4 }}>
        * <b>Shift</b> and <b>Mouse Right</b> are interchangeable for Dash by default.
      </div>
    </div>
  );
}

export function Stat({ label, value, hot, align }) {
  return (
    <div style={{ textAlign: align === 'right' ? 'right' : 'left' }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', color: 'var(--text-muted)' }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, lineHeight: 1, color: hot ? 'var(--severity-critical)' : 'var(--text-primary)', transition: 'color 0.2s' }}>{value}</div>
    </div>
  );
}
