import React, { useState, useEffect, useRef, useMemo } from "react";
import { VULCAN_CONFIG, COMBOS } from "./core/config";
import { clamp, rawCode, codeLabel, loadStore, saveStore } from "./core/utils";
import { GRADE_SOUND, blip, initAudio } from "./core/audio";
import { GRADE_COLOR, GRADE_TEXT } from "./core/tokens";
import { PlayIcon, StopIcon, GearIcon } from "./components/Icons";
import Speedometer from "./components/Speedometer";
import Lane from "./components/Lane";
import SettingsPanel from "./components/SettingsPanel";
import DynamicIsland from "./components/DynamicIsland";
import { MouseOverlay, Stat } from "./components/MouseOverlay";
import { TouchCluster, DEFAULT_TOUCH_POS } from "./components/TouchCluster";
import { installFakePad } from "./core/fakePad";

// Dev-only: simulate a controller when the page is loaded with ?fakepad=1
installFakePad();

// Friendly names for each combo step (event action -> label)
const ACTION_LABEL = {
  "atk-down": "Attack",
  "atk-up": "A-Release",
  "dash-down": "Dash",
  "dash-up": "D-Release",
};
const ACTION_ORDER = ["atk-down", "atk-up", "dash-down", "dash-up"];

function AnalyticsReport({
  show,
  onClose,
  gradesLog,
  speedHistory,
  speedMax,
  redline,
  gameSpeed = 1,
  rubberband = true,
}) {
  const [verbose, setVerbose] = useState(false);
  if (!show) return null;

  // Per-step breakdown for verbose stats (Attack / A-Release / Dash / D-Release)
  const byAction = {};
  gradesLog.forEach((entry) => {
    if (!entry.action) return;
    const a = (byAction[entry.action] = byAction[entry.action] || {
      total: 0,
      perfect: 0,
      good: 0,
      early: 0,
      late: 0,
      miss: 0,
      wrong: 0,
    });
    a.total += 1;
    a[entry.grade] = (a[entry.grade] || 0) + 1;
  });

  const totalHits = gradesLog.length;
  const gradeCounts = gradesLog.reduce(
    (acc, curr) => {
      acc[curr.grade] = (acc[curr.grade] || 0) + 1;
      return acc;
    },
    { perfect: 0, good: 0, early: 0, late: 0, miss: 0, wrong: 0 },
  );

  const validHits = gradesLog.filter((g) =>
    ["perfect", "good", "early", "late"].includes(g.grade),
  );
  const avgOffset =
    validHits.length > 0
      ? Math.round(
          validHits.reduce((acc, curr) => acc + Math.abs(curr.delta), 0) /
            validHits.length,
        )
      : 0;

  let pointsStr = "";
  if (speedHistory.length > 1) {
    const minTime = speedHistory[0].time;
    const maxTime = speedHistory[speedHistory.length - 1].time || 1;
    const timeSpan = maxTime - minTime || 1;

    pointsStr = speedHistory
      .map((pt) => {
        const x = ((pt.time - minTime) / timeSpan) * 280 + 10;
        const y = 90 - (pt.speed / speedMax) * 80;
        return `${x},${y}`;
      })
      .join(" ");
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
        animation: "fadeIn 0.25s ease-out",
        color: "var(--text-primary)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          width: 640,
          maxWidth: "92vw",
          padding: 30,
          borderRadius: 16,
          boxShadow: "0 20px 40px rgba(0, 0, 0, 0.08)",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid var(--border-light)",
            paddingBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 22,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
              }}
            >
              Performance Report
            </h2>
            <span
              title="Game speed this run was played at, scoring scales with it"
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "3px 8px",
                borderRadius: 6,
                whiteSpace: "nowrap",
                color:
                  gameSpeed < 1 ? "var(--accent-gold)" : "var(--severity-low)",
                background:
                  gameSpeed < 1
                    ? "rgba(245,200,66,0.12)"
                    : "var(--bg-secondary)",
                border: "1px solid var(--border-light)",
              }}
            >
              {Math.round(gameSpeed * 100)}% SPEED
            </span>
            <span
              title={rubberband ? "Rubberbanding ON" : "Rubberbanding OFF"}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.06em",
                padding: "3px 8px",
                borderRadius: 6,
                whiteSpace: "nowrap",
                color: rubberband ? "var(--text-primary)" : "var(--text-muted)",
                background: rubberband
                  ? "rgba(245,200,66,0.12)"
                  : "var(--bg-secondary)",
                border: "1px solid var(--border-light)",
              }}
            >
              RUBBERBAND {rubberband ? "ON" : "OFF"}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-light)",
              borderRadius: "50%",
              width: 30,
              height: 30,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            ✕
          </button>
        </div>

        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}
        >
          {/* Stats breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Timing Metrics
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: 4,
                }}
              >
                <span>Accuracy Consistency</span>
                <span
                  style={{
                    fontWeight: 600,
                    color:
                      avgOffset <= 50
                        ? "var(--severity-low)"
                        : "var(--text-primary)",
                  }}
                >
                  {totalHits > 0 ? `${avgOffset} ms` : "—"}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: 4,
                }}
              >
                <span>Total Evaluated Actions</span>
                <span style={{ fontWeight: 600 }}>{totalHits}</span>
              </div>
            </div>
            {/* Grade list */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 8,
              }}
            >
              {["perfect", "good", "early", "late", "miss", "wrong"].map(
                (g) => {
                  const count = gradeCounts[g];
                  const label = g.toUpperCase();
                  const color = GRADE_COLOR[g];
                  return (
                    <div
                      key={g}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 12px",
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-light)",
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      <span
                        style={{
                          color,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            backgroundColor: color,
                          }}
                        />
                        {label}
                      </span>
                      <span
                        style={{
                          color: "var(--text-primary)",
                          fontWeight: 700,
                        }}
                      >
                        {count}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>

          {/* Speed Chart */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h3
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-muted)",
              }}
            >
              Speed Profile (KM/H)
            </h3>
            <div
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-light)",
                height: 140,
                position: "relative",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              {speedHistory.length > 1 ? (
                <svg
                  width="100%"
                  height="100%"
                  viewBox="0 0 300 100"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines */}
                  <line
                    x1="0"
                    y1="90"
                    x2="300"
                    y2="90"
                    stroke="var(--border-light)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="50"
                    x2="300"
                    y2="50"
                    stroke="var(--border-light)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="0"
                    y1="10"
                    x2="300"
                    y2="10"
                    stroke="var(--border-light)"
                    strokeWidth="1"
                    strokeDasharray="3,3"
                  />
                  <text x="5" y="86" fontSize="7" fill="var(--text-muted)">
                    0
                  </text>
                  <text x="5" y="46" fontSize="7" fill="var(--text-muted)">
                    {Math.round(speedMax / 2)}
                  </text>
                  <text x="5" y="16" fontSize="7" fill="var(--text-muted)">
                    {speedMax}
                  </text>
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
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  No speed data collected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Verbose per-step statistics */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <button
            onClick={() => setVerbose((v) => !v)}
            style={{
              alignSelf: "flex-start",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border-light)",
              borderRadius: 6,
              padding: "6px 12px",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-primary)",
              cursor: "pointer",
            }}
          >
            {verbose ? "Hide" : "Show"} Verbose Stats
          </button>
          {verbose && (
            <div
              style={{
                border: "1px solid var(--border-light)",
                borderRadius: 8,
                overflow: "hidden",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "var(--bg-secondary)",
                      color: "var(--text-muted)",
                    }}
                  >
                    {[
                      "Step",
                      "Hits",
                      "Perfect",
                      "Good",
                      "Early",
                      "Late",
                      "Miss",
                      "Wrong",
                    ].map((h, i) => (
                      <th
                        key={h}
                        style={{
                          padding: "6px 8px",
                          textAlign: i === 0 ? "left" : "center",
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ACTION_ORDER.filter((a) => byAction[a]).map((a) => {
                    const s = byAction[a];
                    const cell = (val, key) => (
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "center",
                          fontWeight: 600,
                          color: val
                            ? GRADE_COLOR[key] || "var(--text-primary)"
                            : "var(--text-muted)",
                        }}
                      >
                        {val || "—"}
                      </td>
                    );
                    return (
                      <tr
                        key={a}
                        style={{ borderTop: "1px solid var(--border-subtle)" }}
                      >
                        <td
                          style={{
                            padding: "6px 8px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                          }}
                        >
                          {ACTION_LABEL[a]}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "center",
                            fontWeight: 700,
                          }}
                        >
                          {s.total}
                        </td>
                        {cell(s.perfect, "perfect")}
                        {cell(s.good, "good")}
                        {cell(s.early, "early")}
                        {cell(s.late, "late")}
                        {cell(s.miss, "miss")}
                        {cell(s.wrong, "wrong")}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {totalHits === 0 && (
                <div
                  style={{
                    padding: 12,
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 11,
                  }}
                >
                  No data recorded.
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          style={{
            background: "var(--text-primary)",
            color: "var(--bg-primary)",
            border: "none",
            padding: "12px 0",
            fontFamily: "var(--font-display)",
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: "pointer",
            marginTop: 10,
            transition: "opacity 0.2s",
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
  const [mobile, setMobile] = useState(() =>
    typeof init.settings.mobile === "boolean"
      ? init.settings.mobile
      : typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(pointer: coarse)").matches,
  );
  const [touchPos, setTouchPos] = useState(() => ({
    ...DEFAULT_TOUCH_POS,
    ...(init.settings.touchPos || {}),
  }));
  const [touchEditing, setTouchEditing] = useState(false);
  const [touchScale, setTouchScale] = useState(() => {
    const s = init.settings.touchScale;
    if (s && typeof s === "object") return { atk: 1, dash: 1, ...s };
    if (typeof s === "number") return { atk: s, dash: s }; // migrate old global
    return { atk: 1, dash: 1 };
  });
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
  const [reportSpeed, setReportSpeed] = useState(1); // game speed captured for the summary
  const [reportRubberband, setReportRubberband] = useState(true); // rubberband state captured for the summary
  const [speedHistory, setSpeedHistory] = useState([]);
  const [showReport, setShowReport] = useState(false);
  const streakRef = useRef(0);
  const topRef = useRef(0);

  const [comboKey, setComboKey] = useState("cdcdcf");
  const [cdMultiplier, setCdMultiplier] = useState(2); // 1 = CD, 2 = CDCD
  const [gameSpeed, setGameSpeed] = useState(1); // playback rate, 0.05–1.0
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [theme, setTheme] = useState(
    init.settings.theme === "dark" ? "dark" : "light",
  );
  // Rubberbanding (re-anchor timing to the player's actual input). Default on.
  const [rubberband, setRubberband] = useState(
    init.settings.rubberband !== false,
  );
  // Pulse the gear on a user's first visit until they open settings, once ever.
  const [settingsSeen, setSettingsSeen] = useState(
    init.settings.settingsSeen === true,
  );

  const openSettings = () => {
    setSettingsOpen(true);
    setSettingsSeen(true);
  };

  const activeCombo = (() => {
    const base = COMBOS[comboKey] || COMBOS.cdcdcf;
    if (comboKey === "cd") {
      const repBars = [
        { lane: "atk", start: 0, end: 320, finisher: false },
        { lane: "dash", start: 200, end: 250 },
      ];
      const repEvents = [
        { action: "atk-down", t: 0, label: "CHARGE" },
        { action: "dash-down", t: 200, label: "DASH" },
        { action: "dash-up", t: 250, label: "dash end" },
        { action: "atk-up", t: 320, label: "cancel" },
      ];
      const seq = [
        { sym: "▼", side: "L", dwell: 200 },
        { sym: "▼", side: "R", dwell: 50 },
        { sym: "▲", side: "R", dwell: 70 },
      ];

      if (cdMultiplier === 2) {
        seq.push({ sym: "▲", side: "L", dwell: 50 });
        repBars.push(
          { lane: "atk", start: 370, end: 690, finisher: false },
          { lane: "dash", start: 570, end: 620 },
        );
        repEvents.push(
          { action: "atk-down", t: 370, label: "CHARGE" },
          { action: "dash-down", t: 570, label: "DASH" },
          { action: "dash-up", t: 620, label: "dash end" },
          { action: "atk-up", t: 690, label: "cancel" },
        );
        seq.push(
          { sym: "▼", side: "L", dwell: 200 },
          { sym: "▼", side: "R", dwell: 50 },
          { sym: "▲", side: "R", dwell: 70 },
          { sym: "▲", side: "L", dwell: 1000 },
        );
      } else {
        seq.push({ sym: "▲", side: "L", dwell: 1000 });
      }

      const repLen = cdMultiplier === 2 ? 1690 : 1320;

      return {
        ...base,
        name: cdMultiplier === 1 ? "CD (Short Loop)" : "CDCD (Short Loop)",
        notation: cdMultiplier === 1 ? "CD (Spaced 1s)" : "CDCD (Spaced 1s)",
        repLen,
        repBars,
        repEvents,
        seq,
      };
    }
    return base;
  })();

  const SEQ = activeCombo.seq;
  const COMBO_NOTATION = activeCombo.notation;
  const REP_LEN = activeCombo.repLen;
  const REP_EVENTS = activeCombo.repEvents;

  // Maps each timeline bar to the rep-relative event indices that drive its
  // start (down) and end (up), so the Lane can apply rubberband offsets.
  // Matching by action + canonical time disambiguates repeated lanes.
  const barEventMap = useMemo(
    () =>
      activeCombo.repBars.map((b) => ({
        startIdx: activeCombo.repEvents.findIndex(
          (e) => e.action === `${b.lane}-down` && e.t === b.start,
        ),
        endIdx: activeCombo.repEvents.findIndex(
          (e) => e.action === `${b.lane}-up` && e.t === b.end,
        ),
      })),
    [comboKey, cdMultiplier],
  );

  const { SPEED_MAX, REDLINE, SPEED_DELTA, DECAY_PER_SEC, TOL } = VULCAN_CONFIG;
  const RATE = gameSpeed;
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
    waitingForStart: false,
  });
  const lastRef = useRef(null);
  const cdRef = useRef(0);
  // Rubberbanding mirror for the Lane: accumulated game-ms offset per
  // rep-relative event index, for the single rep currently being hit.
  // `rep` is the absolute rep number those offsets belong to; -1 = none yet.
  const laneOffsetRef = useRef({ rep: -1, offsets: [] });
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

    window.addEventListener("gamepadconnected", checkGamepads);
    window.addEventListener("gamepaddisconnected", checkGamepads);

    checkGamepads();
    const interval = setInterval(checkGamepads, 1000);

    return () => {
      window.removeEventListener("gamepadconnected", checkGamepads);
      window.removeEventListener("gamepaddisconnected", checkGamepads);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    fetch(
      "https://api.github.com/repos/zsksc-gen/mavuika-trainer/pulls?state=closed&base=main&sort=updated&direction=desc",
    )
      .then((res) => {
        if (!res.ok) throw new Error("API limit or error");
        return res.json();
      })
      .then((data) => {
        const merged = data.find((pr) => pr.merged_at);
        if (merged) {
          const date = new Date(merged.merged_at);
          const timeStr = date.toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
          setLatestPR({
            number: merged.number,
            title: merged.title,
            url: merged.html_url,
            timeStr: timeStr,
          });
        }
      })
      .catch(() => {
        setLatestPR({
          number: "",
          title: "View GitHub updates",
          url: "https://github.com/zsksc-gen/mavuika-trainer/commits/main",
          timeStr: "main",
        });
      });
  }, []);

  useEffect(() => {
    bindingsRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    soundRef.current = sound;
    saveStore(bindings, {
      ...init.settings,
      sound,
      freestyle,
      mobile,
      touchPos,
      touchScale,
      theme,
      rubberband,
      settingsSeen,
    });
  }, [
    sound,
    freestyle,
    mobile,
    touchPos,
    touchScale,
    theme,
    rubberband,
    settingsSeen,
    bindings,
    init.settings,
  ]);

  // Apply the chosen theme to the document root so the CSS palette swaps.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  useEffect(() => {
    listenRef.current = listen;
  }, [listen]);

  // Resume AudioContext on first user interaction
  useEffect(() => {
    const resume = () => {
      initAudio();
      cleanUp();
    };

    const cleanUp = () => {
      window.removeEventListener("click", resume);
      window.removeEventListener("keydown", resume);
      window.removeEventListener("mousedown", resume);
      window.removeEventListener("pointerdown", resume);
      window.removeEventListener("touchstart", resume);
    };

    window.addEventListener("click", resume);
    window.addEventListener("keydown", resume);
    window.addEventListener("mousedown", resume);
    window.addEventListener("pointerdown", resume);
    window.addEventListener("touchstart", resume);

    return cleanUp;
  }, []);

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
      setGrades((prev) => {
        const filtered = prev.filter((item) => now - item.ts < 5000);
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
      // Scale dynamically from 0% to 300% based on SPEED_MAX
      const rate = ((speed - 1) / (SPEED_MAX - 1)) * 3.0;
      const clampedRate = clamp(rate, 0.0625, 3.0);
      video.playbackRate = clampedRate;
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  }, [speed, SPEED_MAX]);

  const ensureEvents = (maxRep) => {
    const run = runRef.current;
    while (run.genRep <= maxRep) {
      const base = run.genRep * REP_LEN;
      REP_EVENTS.forEach((e) =>
        run.events.push({ action: e.action, t: base + e.t }),
      );
      run.genRep++;
    }
  };

  const grade = (g, delta, action) => {
    const run = runRef.current;
    // Speed gains/penalties scale with game speed so slow practice scores lower.
    run.speed = clamp(run.speed + (SPEED_DELTA[g] || 0) * RATE, 0, SPEED_MAX);
    const ts = performance.now();
    lastRef.current = { grade: g, delta, ts, action };
    // momentum streak: clean hits build it, mistakes break it
    if (g === "perfect" || g === "good") streakRef.current += 1;
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
      ts,
      action,
    };
    setGrades((prev) => [...prev, newGrade]);

    // Record to gradesLog ref for after action report
    if (run.running) {
      run.gradesLog = run.gradesLog || [];
      run.gradesLog.push({
        grade: g,
        delta,
        ts,
        action,
      });
    }
  };

  // Always-current transition, so long-lived (empty-deps) input listeners never
  // call a stale closure (e.g. with an outdated game-speed RATE).
  const transitionRef = useRef(null);
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
      const scaleLeniency = eventInRep === 4 ? 1.3 : 1.0;
      let perfectWindow = WIN.perfect * scaleLeniency;
      let goodWindow = WIN.good * scaleLeniency;

      // Let the mistake of holding/tapping dash for too long through (late release leniency)
      if (ev.action === "dash-up" && delta > 0) {
        perfectWindow += 70;
        goodWindow += 70;
      }

      const ad = Math.abs(delta);
      const g =
        ad <= perfectWindow
          ? "perfect"
          : ad <= goodWindow
            ? "good"
            : delta < 0
              ? "early"
              : "late";

      // Rubberbanding: re-anchor every later event in this rep to the player's
      // actual input time, so the rest of the combo follows their real pace.
      // Any matched hit shifts its successors by the raw signed delta; the hit
      // itself still keeps its own grade/penalty. miss/wrong never reach here
      // (they don't match the expected action and don't advance nextIdx), and
      // drift is self-contained per rep, the next rep is generated canonical.
      if (rubberband) {
        const repStartIdx = run.nextIdx - eventInRep;
        const curRep = Math.floor(run.nextIdx / REP_EVENTS.length);
        // Lazily reset the Lane mirror when we've entered a new rep.
        if (laneOffsetRef.current.rep !== curRep) {
          laneOffsetRef.current = {
            rep: curRep,
            offsets: new Array(REP_EVENTS.length).fill(0),
          };
        }
        const shift = delta * RATE; // event times are stored in game-time
        const offsets = laneOffsetRef.current.offsets;
        for (let i = eventInRep + 1; i < REP_EVENTS.length; i++) {
          const evIdx = repStartIdx + i;
          if (run.events[evIdx]) run.events[evIdx].t += shift;
          offsets[i] += shift;
        }
      }

      // Log the offset in game-time ms (delta is real-time) so the readout is
      // consistent across game speeds.
      grade(g, delta * RATE, ev.action);
      run.nextIdx++;
    } else {
      grade("wrong", 0, ev.action);
    }
  };
  transitionRef.current = transition;

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
        if (
          listenRef.current === "gpAttack" ||
          listenRef.current === "gpDash"
        ) {
          for (let buttonIdx = 0; buttonIdx < gp.buttons.length; buttonIdx++) {
            if (gp.buttons[buttonIdx]?.pressed) {
              const action = listenRef.current;
              const code = "GP" + buttonIdx;
              const nb = { ...bindingsRef.current, [action]: code };
              const other = action === "gpAttack" ? "gpDash" : "gpAttack";
              if (nb[other] === code) nb[other] = bindingsRef.current[action];
              setBindings(nb);
              setListen(null);
              break;
            }
          }
        } else {
          // Gameplay Polling
          const getGpBtnIndex = (bindStr) => {
            if (bindStr && bindStr.startsWith("GP")) {
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
              setPressed((p) => ({ ...p, atk: true }));
              transitionRef.current("atk-down");
            }
          } else if (!atkPressed && run.gpAtkPressed) {
            run.gpAtkPressed = false;
            const kbCode = b.attack;
            const kbPressed = run.pressed.has(kbCode);
            if (!kbPressed && run.atk) {
              run.atk = false;
              setPressed((p) => ({ ...p, atk: false }));
              transitionRef.current("atk-up");
            }
          }

          // Gamepad Dash button transition
          if (dashPressed && !run.gpDashPressed) {
            run.gpDashPressed = true;
            if (!run.dash) {
              run.dash = true;
              setPressed((p) => ({ ...p, dash: true }));
              transitionRef.current("dash-down");
            }
          } else if (!dashPressed && run.gpDashPressed) {
            run.gpDashPressed = false;
            const kbCode = b.dash;
            const kbPressed =
              run.pressed.has(kbCode) ||
              ((kbCode === "ShiftLeft" ||
                kbCode === "ShiftRight" ||
                kbCode === "M2") &&
                (run.pressed.has("ShiftLeft") ||
                  run.pressed.has("ShiftRight") ||
                  run.pressed.has("M2")));
            if (!kbPressed && run.dash) {
              run.dash = false;
              setPressed((p) => ({ ...p, dash: false }));
              transitionRef.current("dash-up");
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
              let goodWindow = WIN.good * (eventInRep === 4 ? 1.3 : 1.0);
              if (ev.action === "dash-up") {
                goodWindow += 70;
              }
              if (now > ev.t / RATE + goodWindow + 70) {
                grade("miss", 0, ev.action);
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
              laneOffsetRef.current = { rep: -1, offsets: [] };
              ensureEvents(0);
              run.now = 0;
              nowRef.current = 0;
            }

            run.speed = clamp(
              run.speed - DECAY_PER_SEC * RATE * dtSec,
              0,
              SPEED_MAX,
            );
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
  }, [
    DECAY_PER_SEC,
    RATE,
    REP_LEN,
    SPEED_MAX,
    WIN.good,
    freestyle,
    REP_EVENTS,
  ]);

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
    laneOffsetRef.current = { rep: -1, offsets: [] };

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
  };

  const stop = () => {
    runRef.current.running = false;
    setRunning(false);
    setGradesLog([...runRef.current.gradesLog]);
    setSpeedHistory([...runRef.current.speedHistory]);
    setReportSpeed(gameSpeed);
    setReportRubberband(rubberband);
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
        if (e.type === "keydown" && e.code === "Escape") {
          e.preventDefault();
          setListen(null);
          return;
        }
        if (isDown) {
          e.preventDefault();
          const code = rawCode(e);
          const action = listenRef.current;

          // Only rebind keyboard/mouse actions using keyboard/mouse inputs
          if (action === "attack" || action === "dash") {
            const nb = { ...bindingsRef.current, [action]: code };
            const other = action === "attack" ? "dash" : "attack";
            if (nb[other] === code) nb[other] = bindingsRef.current[action];
            setBindings(nb);
            setListen(null);
          }
        }
        return;
      }
      const code = rawCode(e);
      const b = bindingsRef.current,
        run = runRef.current;
      const isAtkKey = code === b.attack;
      const isDashKey =
        code === b.dash ||
        ((b.dash === "ShiftLeft" ||
          b.dash === "ShiftRight" ||
          b.dash === "M2") &&
          (code === "ShiftLeft" || code === "ShiftRight" || code === "M2"));

      if (
        (isAtkKey || isDashKey) &&
        (code === "Space" || code.startsWith("Arrow"))
      )
        e.preventDefault();
      if (isDown) {
        if (run.pressed.has(code)) return;
        run.pressed.add(code);
        if (isAtkKey && !run.atk) {
          run.atk = true;
          setPressed((p) => ({ ...p, atk: true }));
          transitionRef.current("atk-down");
        }
        if (isDashKey && !run.dash) {
          run.dash = true;
          setPressed((p) => ({ ...p, dash: true }));
          transitionRef.current("dash-down");
        }
      } else {
        run.pressed.delete(code);
        if (isAtkKey && run.atk) {
          if (!run.gpAtkPressed) {
            run.atk = false;
            setPressed((p) => ({ ...p, atk: false }));
            transitionRef.current("atk-up");
          }
        }
        if (isDashKey && run.dash) {
          if (!run.gpDashPressed) {
            run.dash = false;
            setPressed((p) => ({ ...p, dash: false }));
            transitionRef.current("dash-up");
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

    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    window.addEventListener("mousedown", md);
    window.addEventListener("mouseup", mu);
    window.addEventListener("contextmenu", cm);

    return () => {
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("mousedown", md);
      window.removeEventListener("mouseup", mu);
      window.removeEventListener("contextmenu", cm);
    };
  }, []);

  const onRebind = (id) => setListen((cur) => (cur === id ? null : id));

  // Touch HUD -> same input model as keyboard/mouse path.
  const handleTouch = (id, isDown) => {
    const run = runRef.current;
    if (isDown) {
      if (id === "atk" && !run.atk) {
        run.atk = true;
        setPressed((p) => ({ ...p, atk: true }));
        transitionRef.current("atk-down");
      } else if (id === "dash" && !run.dash) {
        run.dash = true;
        setPressed((p) => ({ ...p, dash: true }));
        transitionRef.current("dash-down");
      }
      if (navigator.vibrate) navigator.vibrate(8);
      if (soundRef.current) blip(700, 0.03, 0.05, "sine");
    } else {
      if (id === "atk" && run.atk && !run.gpAtkPressed) {
        run.atk = false;
        setPressed((p) => ({ ...p, atk: false }));
        transitionRef.current("atk-up");
      } else if (id === "dash" && run.dash && !run.gpDashPressed) {
        run.dash = false;
        setPressed((p) => ({ ...p, dash: false }));
        transitionRef.current("dash-up");
      }
    }
  };
  const scale = 1 + clamp(speed / SPEED_MAX, 0, 1) * 0.16;
  const lc = last ? GRADE_COLOR[last.grade] : "transparent";
  const showDelta =
    last && ["perfect", "good", "early", "late"].includes(last.grade);
  const liveFlash = last && performance.now() - last.ts < 220 ? last : null;

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: mobile ? "26px 24px 34vh" : "26px 24px 56px",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <DynamicIsland running={running && !waitingForStart} />

      {mobile && (
        <TouchCluster
          pressed={pressed}
          onDown={(id) => handleTouch(id, true)}
          onUp={(id) => handleTouch(id, false)}
          onExit={() => setMobile(false)}
          positions={touchPos}
          editing={touchEditing}
          onMove={(id, frac) => setTouchPos((p) => ({ ...p, [id]: frac }))}
          userScale={touchScale}
          onScale={(id, val) => setTouchScale((p) => ({ ...p, [id]: val }))}
        />
      )}

      {/* GitHub Link (fixed far left, hidden when playing) */}
      <a
        href="https://github.com/zsksc-gen/mavuika-trainer"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          position: "fixed",
          left: 24,
          bottom: 24,
          color: "var(--text-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9997,
          opacity: waitingForStart ? 1 : 0,
          pointerEvents: waitingForStart ? "auto" : "none",
          transition: "color 0.2s, opacity 0.25s ease-in-out",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--text-primary)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--text-muted)")
        }
        title="GitHub Repository"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
          <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.24 6.839 9.504.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.24 22 16.42 22 12c0-5.523-4.477-10-10-10z" />
        </svg>
        <span
          style={{
            marginLeft: 8,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.04em",
            color: "var(--severity-critical)",
            whiteSpace: "nowrap",
          }}
        >
          Report issue on GitHub
        </span>
      </a>

      {/* title */}
      <div style={{ textAlign: "center" }}>
        <h1
          style={{
            fontSize: 40,
            fontWeight: 600,
            color: "var(--text-primary)",
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            lineHeight: 1,
          }}
        >
          Mavuika Combo Trainer
        </h1>
      </div>

      {/* sequence reference */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 6,
          flexWrap: "wrap",
        }}
      >
        {SEQ.map((s, i) => {
          const c =
            s.side === "L" ? "var(--severity-high)" : "var(--accent-gold)";
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                minWidth: 58,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  color: c,
                }}
              >
                <span>{s.sym}</span>
                <span>{s.side}</span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.dwell == null ? "—" : s.dwell + "ms"}
              </div>
            </div>
          );
        })}
      </div>

      {/* input timeline */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
            }}
          >
            Input Timeline
          </span>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            <b style={{ color: "var(--severity-high)" }}>C</b> charge ·{" "}
            <b style={{ color: "var(--accent-gold)" }}>D</b> dash ·{" "}
            <b style={{ color: "var(--severity-critical)" }}>F</b> finisher
          </span>
        </div>
        <div
          ref={stageRef}
          tabIndex={0}
          className="stage-focus"
          style={{
            position: "relative",
            cursor: running ? "crosshair" : "default",
          }}
        >
          <Lane
            nowRef={nowRef}
            rate={RATE}
            judgeFlash={liveFlash}
            repLen={REP_LEN}
            repBars={activeCombo.repBars}
            freestyle={freestyle}
            offsetRef={laneOffsetRef}
            barEventMap={barEventMap}
          />
          {running && countdown > 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 72,
                  fontWeight: 700,
                  color: "var(--severity-high)",
                }}
              >
                {countdown}
              </span>
            </div>
          )}
          {running && waitingForStart && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                pointerEvents: "none",
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(1px)",
                animation: "fadeIn 0.2s ease-out",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-light)",
                  padding: "10px 22px",
                  borderRadius: 6,
                  boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                }}
              >
                Awaiting First Input (Hold Charge)
              </span>
            </div>
          )}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            marginTop: 7,
            textAlign: "center",
          }}
        >
          Hold{" "}
          <b style={{ color: "var(--text-secondary)" }}>
            {codeLabel(bindings.attack)}
          </b>{" "}
          across each charge bar; tap{" "}
          <b style={{ color: "var(--text-secondary)" }}>
            {codeLabel(bindings.dash)}
          </b>{" "}
          inside it.{" "}
          <b style={{ color: "var(--severity-critical)", fontWeight: "700" }}>
            Mouse input works over this strip.
          </b>
        </div>
      </div>

      {/* Dashboard Row (Inputs, Speedometer, and Dancer Side-by-Side) */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap",
          marginTop: 8,
        }}
      >
        {/* Left: Interactive Input Visuals + input-mode switch */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              border: "1px solid var(--border-light)",
              borderRadius: 6,
              overflow: "hidden",
            }}
          >
            {[
              ["kbm", "🖥 KBM/Controller", false],
              ["touch", "✋ Mobile", true],
            ].map(([key, lbl, val]) => {
              const on = mobile === val;
              return (
                <button
                  key={key}
                  onClick={() => setMobile(val)}
                  style={{
                    background: on ? "var(--text-primary)" : "var(--bg-card)",
                    color: on ? "var(--bg-primary)" : "var(--text-secondary)",
                    border: "none",
                    padding: "6px 12px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  {lbl}
                </button>
              );
            })}
          </div>

          {!mobile && (
            <MouseOverlay
              pressed={pressed}
              bindings={bindings}
              listen={listen}
              onRebind={onRebind}
              gamepadConnected={gamepadConnected}
            />
          )}

          {mobile && running && !waitingForStart && (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button
                onClick={stop}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  padding: "12px 36px",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: "pointer",
                  fontFamily: "var(--font-display)",
                  textTransform: "uppercase",
                  letterSpacing: "0.14em",
                  background: "transparent",
                  color: "var(--severity-critical)",
                  border: "2px solid var(--severity-critical)",
                }}
              >
                <StopIcon />
                Stop
              </button>
              <button
                onClick={openSettings}
                className={settingsSeen ? undefined : "settings-pulse"}
                title="Settings"
                style={{
                  width: 44,
                  height: 44,
                  border: "1px solid var(--border-light)",
                  background: "var(--bg-secondary)",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  fontSize: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 4,
                }}
              >
                <GearIcon size={22} />
              </button>
            </div>
          )}

          {mobile && !(running && !waitingForStart) && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                position: "relative",
                zIndex: touchEditing ? 9600 : "auto",
              }}
            >
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setTouchEditing((e) => !e)}
                  style={{
                    background: touchEditing
                      ? "var(--severity-critical)"
                      : "var(--bg-card)",
                    color: touchEditing ? "#fff" : "var(--text-secondary)",
                    border: "1px solid var(--border-light)",
                    padding: "6px 12px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: 6,
                  }}
                >
                  {touchEditing ? "Done" : "Move buttons"}
                </button>
                <button
                  onClick={() => {
                    setTouchPos({ ...DEFAULT_TOUCH_POS });
                    setTouchScale({ atk: 1, dash: 1 });
                  }}
                  title="Reset button positions & size"
                  style={{
                    background: "var(--bg-card)",
                    color: "var(--text-muted)",
                    border: "1px solid var(--border-light)",
                    padding: "6px 12px",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                    borderRadius: 6,
                  }}
                >
                  Reset
                </button>
              </div>
              {touchEditing && (
                <div
                  style={{
                    fontSize: 9,
                    color: "var(--text-muted)",
                    textAlign: "center",
                    maxWidth: 150,
                    lineHeight: 1.4,
                  }}
                >
                  Drag to move · pinch to resize.<br></br> Tap Done when
                  finished.
                </div>
              )}
            </div>
          )}

          {mobile && (
            <button
              onClick={openSettings}
              className={settingsSeen ? undefined : "settings-pulse"}
              title="Settings"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 44,
                padding: "0 20px",
                border: "1px solid var(--border-light)",
                background: "var(--bg-secondary)",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "var(--font-display)",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                borderRadius: 4,
              }}
            >
              <GearIcon size={18} /> Settings
            </button>
          )}
        </div>

        {/* Center: Speedometer & Readout */}
        <div style={{ width: 260, maxWidth: "100%", position: "relative" }}>
          {/* dial stat rail */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "0 6px",
              marginBottom: -8,
            }}
          >
            <Stat label="STREAK" value={"×" + streak} hot={streak >= 6} />
            <Stat
              label="TOP"
              value={Math.round(topSpeed)}
              hot={topSpeed >= REDLINE}
              align="right"
            />
          </div>
          <Speedometer speed={speed} running={running} />
          {/* grade readout under the dial */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 4,
              height: 96,
              marginTop: 6,
              borderTop: "1px solid var(--border-subtle)",
              paddingTop: 8,
              overflow: "hidden",
            }}
          >
            {grades.slice(-4).map((item) => {
              const color = GRADE_COLOR[item.grade];
              const text = GRADE_TEXT[item.grade];
              const stepLabel = ACTION_LABEL[item.action];
              const showMs = ["perfect", "good", "early", "late"].includes(
                item.grade,
              );
              const msText = showMs
                ? ` ${item.delta > 0 ? "+" : ""}${Math.round(item.delta)}ms`
                : "";
              return (
                <div
                  key={item.id}
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    fontWeight: 700,
                    letterSpacing: "0.1em",
                    color: color,
                    textTransform: "uppercase",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                  {stepLabel && (
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 600 }}
                    >
                      {stepLabel}
                    </span>
                  )}
                  <span>
                    {text}
                    {msText}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Dancer GIF/WebM */}
        <div
          style={{
            position: "relative",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <video
            ref={videoRef}
            src="assets/mavuika-dance.webm"
            loop
            muted
            playsInline
            style={{
              width: 100,
              height: 100,
              display: "block",
              position: "relative",
              transform: `scale(${scale})`,
              transformOrigin: "bottom center",
              transition: "transform 0.2s",
              objectFit: "cover",
            }}
          />
          <a
            href="https://x.com/greentoko/status/1831841462839079241"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 9,
              color: "#0066cc",
              textDecoration: "none",
              marginTop: 4,
              cursor: "pointer",
            }}
          >
            @GreenToko
          </a>
        </div>
      </div>

      {/* Start/Stop + Settings gear (desktop only; mobile shows these in the input slot) */}
      {!mobile && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            marginTop: 12,
          }}
        >
          <button
            onClick={running ? stop : start}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              padding: "12px 36px",
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: "var(--font-display)",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              background: running ? "transparent" : "var(--text-primary)",
              color: running ? "var(--severity-critical)" : "var(--bg-primary)",
              border: `2px solid ${running ? "var(--severity-critical)" : "var(--text-primary)"}`,
            }}
          >
            {running ? <StopIcon /> : <PlayIcon />}
            {running ? "Stop" : "Ride"}
          </button>
          <button
            onClick={openSettings}
            className={settingsSeen ? undefined : "settings-pulse"}
            title="Settings"
            style={{
              width: 44,
              height: 44,
              border: "1px solid var(--border-light)",
              background: "var(--bg-secondary)",
              cursor: "pointer",
              color: "var(--text-secondary)",
              fontSize: 20,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 4,
            }}
          >
            <GearIcon size={22} />
          </button>
        </div>
      )}

      {/* latest update info */}
      {latestPR && (
        <div
          style={{
            textAlign: "center",
            fontSize: 10,
            color: "var(--text-muted)",
            marginTop: 8,
            letterSpacing: "0.02em",
            opacity: waitingForStart ? 1 : 0,
            pointerEvents: waitingForStart ? "auto" : "none",
            transition: "opacity 0.25s ease-in-out",
          }}
        >
          LATEST UPDATE:{" "}
          <a
            href={latestPR.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: "var(--text-secondary)",
              textDecoration: "none",
              borderBottom: "1px dashed var(--border-light)",
              fontWeight: 600,
            }}
          >
            {latestPR.number ? `#${latestPR.number} ` : ""}
            {latestPR.title}
          </a>{" "}
          ({latestPR.timeStr})
        </div>
      )}

      <AnalyticsReport
        show={showReport}
        onClose={closeReport}
        gradesLog={gradesLog}
        speedHistory={speedHistory}
        speedMax={SPEED_MAX}
        redline={REDLINE}
        gameSpeed={reportSpeed}
        rubberband={reportRubberband}
      />

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        comboKey={comboKey}
        setComboKey={setComboKey}
        cdMultiplier={cdMultiplier}
        setCdMultiplier={setCdMultiplier}
        gameSpeed={gameSpeed}
        setGameSpeed={setGameSpeed}
        freestyle={freestyle}
        setFreestyle={setFreestyle}
        sound={sound}
        setSound={setSound}
        theme={theme}
        setTheme={setTheme}
        rubberband={rubberband}
        setRubberband={setRubberband}
        running={running}
        waitingForStart={waitingForStart}
      />
    </div>
  );
}
