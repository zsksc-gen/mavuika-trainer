import React, { useRef } from "react";
import { COMBOS } from "../core/config";
import { GearIcon } from "./Icons";

// Defined at module scope (not inside the component) so its identity is stable
// across renders, otherwise React remounts its children every render, which
// would drop an in-progress slider drag after the first onChange.
function Row({ children }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        paddingBottom: 16,
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {children}
    </div>
  );
}

// Unified settings sheet opened by the gear button. Holds every option that
// used to live inline in the main view: combo (+ CD multiplier), game speed,
// freestyle, sound (SFX), and the dark/light theme toggle.
export default function SettingsPanel({
  open,
  onClose,
  comboKey,
  setComboKey,
  cdMultiplier,
  setCdMultiplier,
  gameSpeed,
  setGameSpeed,
  freestyle,
  setFreestyle,
  sound,
  setSound,
  theme,
  setTheme,
  rubberband,
  setRubberband,
  running,
  waitingForStart,
}) {
  // Only dismiss when the press *starts* on the backdrop, otherwise dragging
  // the slider (and releasing over the backdrop) would fire a click on the
  // backdrop and close the panel mid-drag.
  const downOnBackdrop = useRef(false);

  if (!open) return null;
  // Combo/speed/freestyle change the active timing, so lock them mid-run
  // (idle / awaiting-first-input stays editable, matching the old behavior).
  const locked = running && !waitingForStart;

  const labelStyle = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.1em",
    color: "var(--text-muted)",
    textTransform: "uppercase",
  };

  const segBtn = (active, onClick, children, disabled) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: active ? "var(--text-primary)" : "var(--bg-secondary)",
        color: active ? "var(--bg-primary)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--text-primary)" : "var(--border-light)"}`,
        padding: "7px 14px",
        fontFamily: "var(--font-display)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        borderRadius: 4,
        transition: "all 0.15s",
      }}
    >
      {children}
    </button>
  );

  return (
    <div
      onMouseDown={(e) => {
        downOnBackdrop.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && downOnBackdrop.current) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 9800,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 420,
          maxWidth: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: 10,
          padding: 22,
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
            }}
          >
            <GearIcon size={18} /> Settings
          </h2>
          <button
            onClick={onClose}
            title="Close"
            style={{
              width: 32,
              height: 32,
              border: "1px solid var(--border-light)",
              background: "var(--bg-secondary)",
              color: "var(--text-secondary)",
              cursor: "pointer",
              fontSize: 16,
              borderRadius: 4,
              lineHeight: 1,
            }}
          >
            ✕
          </button>
        </div>

        {/* Combo */}
        <Row>
          <span style={labelStyle}>Combo</span>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {Object.entries(COMBOS).map(([key, item]) =>
              segBtn(
                comboKey === key,
                () => setComboKey(key),
                item.name,
                locked,
              ),
            )}
          </div>
          {comboKey === "cd" && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginTop: 4,
              }}
            >
              <span style={labelStyle}>Multiplier</span>
              <div style={{ display: "flex", gap: 6 }}>
                {[1, 2].map((num) =>
                  segBtn(
                    cdMultiplier === num,
                    () => setCdMultiplier(num),
                    num === 1 ? "1x (CD)" : "2x (CDCD)",
                    locked,
                  ),
                )}
              </div>
            </div>
          )}
        </Row>

        {/* Game speed */}
        <Row>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Game Speed</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                color:
                  gameSpeed < 1
                    ? "var(--accent-gold)"
                    : "var(--text-secondary)",
              }}
            >
              {Math.round(gameSpeed * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={Math.round(gameSpeed * 100)}
            disabled={locked}
            onChange={(e) => setGameSpeed(Number(e.target.value) / 100)}
            style={{
              width: "100%",
              height: 20,
              margin: "2px 0",
              accentColor: "var(--accent-gold)",
              cursor: locked ? "not-allowed" : "pointer",
            }}
          />
          {gameSpeed < 1 && (
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
              Slower practice scores lower, your score scales with speed.
            </span>
          )}
        </Row>

        {/* Freestyle */}
        <Row>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={labelStyle}>Freestyle</span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                Loop freely without the rhythm timeline.
              </span>
            </div>
            {segBtn(
              freestyle,
              () => setFreestyle((f) => !f),
              freestyle ? "On" : "Off",
              locked,
            )}
          </div>
        </Row>

        {/* Rubberbanding */}
        <Row>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={labelStyle}>Rubberbanding</span>
              <span
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  lineHeight: 1.5,
                }}
              >
                When you hit an input off-beat, the rest of the combo shifts to
                follow your timing, so a slightly late tap doesn't cascade into
                more misses. Turn off for strict, fixed timing.
              </span>
            </div>
            {segBtn(
              rubberband,
              () => setRubberband((r) => !r),
              rubberband ? "On" : "Off",
              false,
            )}
          </div>
        </Row>

        {/* Sound */}
        <Row>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={labelStyle}>Sound FX</span>
            {segBtn(
              sound,
              () => setSound((s) => !s),
              sound ? "On" : "Off",
              false,
            )}
          </div>
        </Row>

        {/* Theme */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={labelStyle}>Theme</span>
          <div style={{ display: "flex", gap: 6 }}>
            {segBtn(theme === "light", () => setTheme("light"), "Light", false)}
            {segBtn(theme === "dark", () => setTheme("dark"), "Dark", false)}
          </div>
        </div>
      </div>
    </div>
  );
}
