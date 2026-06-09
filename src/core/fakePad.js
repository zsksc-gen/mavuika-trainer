// Dev-only gamepad simulator. Activated with the ?fakepad=1 URL flag.
// Overrides navigator.getGamepads() with a fake Standard Gamepad so the
// controller overlay can be exercised without real hardware.
//
// Keyboard map (while the flag is active):
//   J = A (0)     K = B (1)     U = X (2)     I = Y (3)
//   Q = LB (4)    E = RB (5)    1 = LT (6)    3 = RT (7)
//   Arrow keys = D-pad (12-15)
// Hold a key to "press" the button; release to let go.

const makeBtn = (pressed = false) => ({
  pressed,
  touched: pressed,
  value: pressed ? 1 : 0,
});

// Maps keyboard codes to Standard Gamepad button indices.
const KEY_TO_BUTTON = {
  KeyJ: 0, // A
  KeyK: 1, // B
  KeyU: 2, // X
  KeyI: 3, // Y
  KeyQ: 4, // LB
  KeyE: 5, // RB
  Digit1: 6, // LT
  Digit3: 7, // RT
  Backspace: 8, // Select
  Enter: 9, // Start
  ArrowUp: 12,
  ArrowDown: 13,
  ArrowLeft: 14,
  ArrowRight: 15,
};

let installed = false;

export function installFakePad() {
  if (installed) return;
  if (typeof window === "undefined") return;
  if (!new URLSearchParams(window.location.search).has("fakepad")) return;
  installed = true;

  const pad = {
    id: "Fake Xbox 360 Controller (simulated)",
    index: 0,
    connected: true,
    mapping: "standard",
    timestamp: performance.now(),
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => makeBtn(false)),
  };

  navigator.getGamepads = () => [pad, null, null, null];

  const setButton = (idx, pressed) => {
    if (idx == null || !pad.buttons[idx]) return;
    pad.buttons[idx] = makeBtn(pressed);
    pad.timestamp = performance.now();
  };

  window.addEventListener("keydown", (e) => {
    const idx = KEY_TO_BUTTON[e.code];
    if (idx == null) return;
    e.preventDefault();
    setButton(idx, true);
  });
  window.addEventListener("keyup", (e) => {
    const idx = KEY_TO_BUTTON[e.code];
    if (idx == null) return;
    e.preventDefault();
    setButton(idx, false);
  });

  // Announce the connection so polling + event listeners pick it up.
  window.dispatchEvent(new Event("gamepadconnected"));

  // Expose helpers for manual poking from the console.
  window.__fakePad = pad;
  window.press = (i) => setButton(i, true);
  window.release = (i) => setButton(i, false);
  window.tap = (i, ms = 150) => {
    setButton(i, true);
    setTimeout(() => setButton(i, false), ms);
  };

  // eslint-disable-next-line no-console
  console.log(
    "[fakepad] simulated controller active. Keys: J/K/U/I=ABXY, Q/E=LB/RB, 1/3=LT/RT, arrows=D-pad. Console: tap(0), press(7), release(7)."
  );
}
