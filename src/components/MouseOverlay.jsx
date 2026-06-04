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
  const getGpBtnIndex = (bindStr) => {
    if (bindStr && bindStr.startsWith('GP')) {
      return parseInt(bindStr.slice(2));
    }
    return -1;
  };

  const gpAttackIdx = getGpBtnIndex(bindings.gpAttack);
  const gpDashIdx = getGpBtnIndex(bindings.gpDash);

  const getButtonState = (idx) => {
    const isAtk = (gpAttackIdx === idx);
    const isDash = (gpDashIdx === idx);
    const isPressed = (isAtk && pressed.atk) || (isDash && pressed.dash);
    const isListening = (listen === 'gpAttack' && isAtk) || (listen === 'gpDash' && isDash);
    
    return {
      isBound: isAtk || isDash,
      isPressed,
      opacity: isPressed ? 0.7 : (isListening ? 0.35 : (isAtk || isDash ? 0.25 : 0.04)),
      fill: isPressed ? (isAtk ? 'var(--severity-high)' : 'var(--accent-gold)') : 'var(--text-primary)'
    };
  };

  const INK = 'var(--text-muted)';
  
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ position: 'relative', width: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <svg viewBox="0 0 120 74" width="100" style={{ display: 'block', overflow: 'visible' }}>
          {/* Triggers */}
          <path d="M24,2 L44,4 L44,10 L24,10 Z" fill={getButtonState(6).fill} opacity={getButtonState(6).opacity} style={{ transition: 'opacity 0.08s' }} />
          <path d="M96,2 L76,4 L76,10 L96,10 Z" fill={getButtonState(7).fill} opacity={getButtonState(7).opacity} style={{ transition: 'opacity 0.08s' }} />
          
          {/* Bumpers */}
          <path d="M24,12 C34,8 46,11 48,16 L48,20 C46,16 34,14 24,18 Z" fill={getButtonState(4).fill} opacity={getButtonState(4).opacity} style={{ transition: 'opacity 0.08s' }} />
          <path d="M96,12 C86,8 74,11 72,16 L72,20 C74,16 86,14 96,18 Z" fill={getButtonState(5).fill} opacity={getButtonState(5).opacity} style={{ transition: 'opacity 0.08s' }} />

          {/* Controller Body Outline */}
          <path d="M20,22 C20,12 36,6 60,6 C84,6 100,12 100,22 C100,32 92,54 84,66 C80,72 72,72 67,66 C62,60 62,60 62,60 C62,60 62,60 58,66 C53,72 45,72 41,66 C33,54 20,32 20,22 Z" fill="none" stroke={INK} strokeWidth="1.5" />

          {/* Joysticks */}
          <circle cx="44" cy="46" r="9" fill={getButtonState(10).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(10).isBound ? getButtonState(10).opacity : 0.08} />
          <circle cx="76" cy="46" r="9" fill={getButtonState(11).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(11).isBound ? getButtonState(11).opacity : 0.08} />

          {/* D-Pad center & directions */}
          <rect x="29" y="22" width="6" height="5" fill={getButtonState(12).fill} opacity={getButtonState(12).opacity} />
          <rect x="29" y="35" width="6" height="5" fill={getButtonState(13).fill} opacity={getButtonState(13).opacity} />
          <rect x="20" y="29" width="5" height="6" fill={getButtonState(14).fill} opacity={getButtonState(14).opacity} />
          <rect x="38" y="29" width="5" height="6" fill={getButtonState(15).fill} opacity={getButtonState(15).opacity} />
          <path d="M29,27 H35 V35 H29 Z" fill="none" stroke={INK} strokeWidth="1" />

          {/* Face buttons */}
          <circle cx="78" cy="28" r="3.5" fill={getButtonState(2).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(2).opacity} />
          <circle cx="86" cy="20" r="3.5" fill={getButtonState(3).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(3).opacity} />
          <circle cx="86" cy="36" r="3.5" fill={getButtonState(0).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(0).opacity} />
          <circle cx="94" cy="28" r="3.5" fill={getButtonState(1).fill} stroke={INK} strokeWidth="1" opacity={getButtonState(1).opacity} />

          {/* Select / Start */}
          <rect x="51" y="26" width="5" height="2" rx="0.5" fill={getButtonState(8).fill} stroke={INK} strokeWidth="0.8" opacity={getButtonState(8).opacity} />
          <rect x="64" y="26" width="5" height="2" rx="0.5" fill={getButtonState(9).fill} stroke={INK} strokeWidth="0.8" opacity={getButtonState(9).opacity} />

          {/* Interactive Rebinding Click Zones */}
          <rect x="10" y="0" width="50" height="74" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('gpAttack')} title="Click to rebind Controller Attack" />
          <rect x="60" y="0" width="50" height="74" fill="transparent" style={{ cursor: 'pointer' }} onClick={() => onRebind('gpDash')} title="Click to rebind Controller Dash" />
        </svg>
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
