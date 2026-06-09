import React from 'react';
import { codeLabel } from '../core/utils';

export function MouseOverlay({ pressed, bindings, listen, onRebind, gamepadConnected }) {
  if (gamepadConnected) {
    return <GamepadOverlay pressed={pressed} bindings={bindings} listen={listen} onRebind={onRebind} />;
  }

  const atkOn = pressed.atk, dashOn = pressed.dash;
  const atkListen = listen === 'attack', dashListen = listen === 'dash';
  const ATK = 'var(--text-primary)', DASH = 'var(--text-primary)', INK = 'var(--text-muted)';
  const LEFT = 'M14 68 L14 40 Q14 6 48 6 L50 6 L50 68 Z';
  const RIGHT = 'M50 68 L50 6 L52 6 Q86 6 86 40 L86 68 Z';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <svg viewBox="0 0 100 152" width="76" style={{ display: 'block', overflow: 'visible', flexShrink: 0 }}>
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
      <BindingsMenu bindings={bindings} listen={listen} onRebind={onRebind} gamepadConnected={gamepadConnected} />
    </div>
  );
}

export function GamepadOverlay({ pressed, bindings, listen, onRebind }) {
  const square = (action, label, code, active) => {
    const listening = listen === action;
    return (
      <button key={action} onClick={() => onRebind(action)} style={{
        width: 104, height: 58, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 3,
        background: active ? 'color-mix(in srgb, var(--text-primary) 18%, var(--bg-card))' : 'var(--bg-card)',
        border: `2px solid ${listening ? 'var(--text-primary)' : active ? 'var(--text-muted)' : 'var(--border-light)'}`,
        borderRadius: 10, cursor: 'pointer', padding: 6, transition: 'all 0.08s'
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{label}</span>
        <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1, color: 'var(--text-primary)' }}>
          {listening ? '...' : codeLabel(code)}
        </span>
      </button>
    );
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        {square('gpAttack', 'Attack', bindings.gpAttack, pressed.atk)}
        {square('gpDash', 'Dash', bindings.gpDash, pressed.dash)}
      </div>
      <BindingsMenu bindings={bindings} listen={listen} onRebind={onRebind} gamepadConnected={true} />
    </div>
  );
}

export function BindingsMenu({ bindings, listen, onRebind, gamepadConnected }) {
  const atkListen = listen === 'attack', dashListen = listen === 'dash';
  const gpAtkListen = listen === 'gpAttack', gpDashListen = listen === 'gpDash';
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, width: '100%', maxWidth: 320 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, width: '100%' }}>
        {/* Keyboard / Mouse Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 2 }}>
            KBM
          </div>
          {[['attack', 'ATTACK', bindings.attack, atkListen], ['dash', 'DASH', bindings.dash, dashListen]].map(([id, lbl, code, lis]) => (
            <button key={id} onClick={() => onRebind(id)} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
              background: lis ? 'var(--bg-secondary)' : 'var(--bg-card)', 
              border: `1px solid ${lis ? 'var(--text-primary)' : 'var(--border-light)'}`, 
              cursor: 'pointer', padding: '6px 10px', borderRadius: 4, width: '100%'
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)' }}>{lbl}</span>
              <span style={{ fontSize: 10, color: lis ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: lis ? 700 : 600 }}>
                {lis ? '...' : codeLabel(code)}
              </span>
            </button>
          ))}
        </div>

        {/* Controller Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--text-muted)', textTransform: 'uppercase', textAlign: 'center', marginBottom: 2 }}>
            Gamepad
          </div>
          {!gamepadConnected && (
            <div style={{ fontSize: 8, color: 'var(--severity-critical)', textAlign: 'center', padding: '4px 0', border: '1px dashed var(--border-light)', borderRadius: 4, background: 'var(--bg-secondary)' }}>
              NO GP
            </div>
          )}
          {gamepadConnected && (
            <div style={{ fontSize: 8, color: 'var(--status-online)', textAlign: 'center', padding: '4px 0', border: '1px dashed var(--border-light)', borderRadius: 4, background: 'var(--bg-secondary)', fontWeight: 600 }}>
              OK
            </div>
          )}
          {[['gpAttack', 'ATTACK', bindings.gpAttack, gpAtkListen], ['gpDash', 'DASH', bindings.gpDash, gpDashListen]].map(([id, lbl, code, lis]) => (
            <button key={id} onClick={() => onRebind(id)} disabled={!gamepadConnected} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6,
              background: lis ? 'var(--bg-secondary)' : 'var(--bg-card)', 
              border: `1px solid ${lis ? 'var(--text-primary)' : 'var(--border-light)'}`, 
              cursor: gamepadConnected ? 'pointer' : 'not-allowed', padding: '6px 10px', borderRadius: 4, width: '100%',
              opacity: gamepadConnected ? 1 : 0.5
            }}>
              <span style={{ fontSize: 8, fontWeight: 700, color: 'var(--text-muted)' }}>{lbl}</span>
              <span style={{ fontSize: 10, color: lis ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: lis ? 700 : 600 }}>
                {lis ? '...' : codeLabel(code)}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ fontSize: 8, color: 'var(--text-muted)', textAlign: 'center', maxWidth: 280, lineHeight: 1.3 }}>
        * <b>Shift</b> / <b>M2</b> are interchangeable for Dash by default.
        <div style={{ marginTop: 3 }}>
          * Vivaldi users: Disable "Rocker Gestures" in browser settings to allow simultaneous mouse clicks.
        </div>
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
