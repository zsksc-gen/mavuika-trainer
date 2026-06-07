import React, { useEffect, useRef, useState } from "react";

/*
 * On-screen touch controls for the two physical inputs the trainer uses:
 * Attack (hold = charge, release = finisher) and Dash (tap).
 * Positions are user-customizable, stored as viewport fractions
 * { rx: dist-from-right / vw, by: dist-from-bottom / vh } so they stay correct
 * across screen sizes and orientation. Size is a persisted user scale, and in
 * edit mode a two-finger pinch resizes both buttons.
 */

export const DEFAULT_TOUCH_POS = {
  atk: { rx: 0.264, by: 0.352 },
  dash: { rx: 0.117, by: 0.168 },
};

// Default footprint: baseline +30% (1.3), then +30% again per request -> ~1.69.
const SIZE_FACTOR = 1.69;

const BUTTONS = [
  { id: "atk", label: "ATK", sizeMul: 1.0 },
  { id: "dash", label: "DASH", sizeMul: 0.82 },
];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const touchDist = (touches) =>
  Math.hypot(
    touches[0].clientX - touches[1].clientX,
    touches[0].clientY - touches[1].clientY,
  );

function useViewport() {
  const [vp, setVp] = useState(() => ({
    w: window.innerWidth,
    h: window.innerHeight,
  }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", on);
    window.addEventListener("orientationchange", on);
    return () => {
      window.removeEventListener("resize", on);
      window.removeEventListener("orientationchange", on);
    };
  }, []);
  return vp;
}

export function TouchCluster({
  pressed,
  onDown,
  onUp,
  onExit,
  positions,
  editing,
  onMove,
  userScale,
  onScale,
}) {
  const vp = useViewport();
  const portrait = vp.h > vp.w;
  const dragId = useRef(null);
  const grab = useRef({ offR: 0, offB: 0 });
  const pinch = useRef(null); // { startDist, startScale }

  if (portrait) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10000,
          background: "var(--bg-primary, #0c0c14)",
          color: "var(--text-primary, #111)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 18,
          textAlign: "center",
          padding: 24,
        }}
      >
        <div style={{ fontSize: 40, transform: "rotate(90deg)" }}>▭</div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 18,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          Rotate to landscape
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 280 }}>
          The trainer plays in landscape. Turn your device sideways.
        </div>
        <button
          onClick={onExit}
          style={{
            marginTop: 8,
            background: "transparent",
            border: "1px solid var(--border-light)",
            color: "var(--text-muted)",
            padding: "8px 16px",
            borderRadius: 6,
            fontSize: 12,
          }}
        >
          Use keyboard UI instead
        </button>
      </div>
    );
  }

  // Reactive base scaled by the persisted user size.
  const base =
    Math.max(48, Math.min(110, Math.min(vp.w, vp.h) * 0.17)) * SIZE_FACTOR;
  const scaleOf = (id) => (userScale && userScale[id]) || 1;

  const moveButtonTo = (id, touch, centerRight, centerBottom, fresh) => {
    const fingerRight = vp.w - touch.clientX;
    const fingerBottom = vp.h - touch.clientY;
    if (fresh) {
      // Remember where on the button it was grabbed -> no jump on first touch.
      grab.current = {
        offR: fingerRight - centerRight,
        offB: fingerBottom - centerBottom,
      };
      return;
    }
    const cr = fingerRight - grab.current.offR;
    const cb = fingerBottom - grab.current.offB;
    onMove(id, {
      rx: clamp(cr / vp.w, 0.03, 0.97),
      by: clamp(cb / vp.h, 0.03, 0.97),
    });
  };

  // Two-finger pinch (edit mode only) resizes the button nearest the pinch.
  const onPinchStart = (e) => {
    if (!editing || e.touches.length < 2) return;
    const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
    const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    let id = BUTTONS[0].id;
    let bestD = Infinity;
    for (const b of BUTTONS) {
      const pos = positions[b.id] || DEFAULT_TOUCH_POS[b.id];
      const cx = vp.w - pos.rx * vp.w;
      const cy = vp.h - pos.by * vp.h;
      const dd = Math.hypot(midX - cx, midY - cy);
      if (dd < bestD) {
        bestD = dd;
        id = b.id;
      }
    }
    pinch.current = { id, startDist: touchDist(e.touches), startScale: scaleOf(id) };
    dragId.current = null;
  };
  const onPinchMove = (e) => {
    if (!editing || !pinch.current || e.touches.length < 2) return;
    e.preventDefault();
    const ratio = touchDist(e.touches) / pinch.current.startDist;
    onScale(pinch.current.id, clamp(pinch.current.startScale * ratio, 0.6, 2.6));
  };
  const onPinchEnd = (e) => {
    if (e.touches.length < 2) pinch.current = null;
  };

  return (
    <div
      onTouchStart={editing ? onPinchStart : undefined}
      onTouchMove={editing ? onPinchMove : undefined}
      onTouchEnd={editing ? onPinchEnd : undefined}
      onTouchCancel={editing ? onPinchEnd : undefined}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9500,
        pointerEvents: editing ? "auto" : "none",
        overflow: "hidden",
      }}
    >
      {BUTTONS.map((b) => {
        const pos = positions[b.id] || DEFAULT_TOUCH_POS[b.id];
        const d = base * b.sizeMul * scaleOf(b.id);
        const isOn = pressed[b.id];
        const centerRight = pos.rx * vp.w;
        const centerBottom = pos.by * vp.h;
        return (
          <div
            key={b.id}
            onTouchStart={(e) => {
              e.preventDefault();
              if (editing) {
                if (e.touches.length >= 2) return; // pinch handles it
                dragId.current = b.id;
                moveButtonTo(b.id, e.touches[0], centerRight, centerBottom, true);
              } else {
                onDown(b.id);
              }
            }}
            onTouchMove={(e) => {
              if (!editing || pinch.current || dragId.current !== b.id) return;
              e.preventDefault();
              moveButtonTo(b.id, e.touches[0], centerRight, centerBottom, false);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              if (editing) dragId.current = null;
              else onUp(b.id);
            }}
            onTouchCancel={() => {
              if (editing) dragId.current = null;
              else onUp(b.id);
            }}
            style={{
              position: "absolute",
              right: `calc(${centerRight - d / 2}px + env(safe-area-inset-right))`,
              bottom: `calc(${centerBottom - d / 2}px + env(safe-area-inset-bottom))`,
              width: d,
              height: d,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxSizing: "border-box",
              fontFamily: "var(--font-display)",
              fontSize: d * 0.22,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "#fff",
              border: editing
                ? "2px dashed var(--severity-critical)"
                : "2px solid rgba(255,255,255,0.85)",
              background: isOn
                ? "rgba(255,255,255,0.42)"
                : "rgba(15,18,30,0.34)",
              pointerEvents: "auto",
              touchAction: "none",
              WebkitUserSelect: "none",
              userSelect: "none",
              WebkitTapHighlightColor: "transparent",
              transition: "background 0.06s, transform 0.06s",
              transform: isOn ? "scale(0.9)" : "scale(1)",
            }}
          >
            {b.label}
          </div>
        );
      })}
    </div>
  );
}
