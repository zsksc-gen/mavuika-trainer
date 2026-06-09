let audioCtx = null;

export function initAudio() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx && audioCtx.state === "suspended") {
      audioCtx.resume();
    }
  } catch (e) {
    console.error("Failed to initialize AudioContext:", e);
  }
}

export function blip(freq, dur, vol, type) {
  try {
    initAudio();
    if (!audioCtx) return;
    const o = audioCtx.createOscillator(),
      g = audioCtx.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    o.connect(g);
    g.connect(audioCtx.destination);
    const now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    o.start(now);
    o.stop(now + dur + 0.02);
  } catch (e) {}
}

export const GRADE_SOUND = {
  perfect: () => blip(880, 0.09, 0.18, "triangle"),
  good: () => blip(620, 0.08, 0.14, "triangle"),
  early: () => blip(240, 0.1, 0.12, "sawtooth"),
  late: () => blip(200, 0.12, 0.08, "sawtooth"),
  miss: () => blip(150, 0.16, 0.08, "square"),
  wrong: () => blip(110, 0.1, 0.06, "square"),
};
