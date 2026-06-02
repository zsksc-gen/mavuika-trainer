const LS_KEY = 'vulcan-trainer-v1';

export const DEFAULT_BINDINGS = { attack: 'M0', dash: 'ShiftLeft' };
export const DEFAULT_SETTINGS = { tempo: 1.0, tolerance: 'normal', sound: true, dark: false };

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export const rawCode = (e) => (e.type.startsWith('mouse') ? 'M' + e.button : e.code);

export function codeLabel(code) {
  if (code === 'M0') return 'Mouse Left';
  if (code === 'M1') return 'Mouse Mid';
  if (code === 'M2') return 'Mouse Right';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'Shift';
  if (code === 'Space') return 'Space';
  if (code && code.startsWith('Key')) return code.slice(3);
  if (code && code.startsWith('Digit')) return code.slice(5);
  if (code && code.startsWith('Arrow')) return code.slice(5) + ' Arrow';
  return code || '—';
}

export function loadStore() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
    return {
      bindings: { ...DEFAULT_BINDINGS, ...(s.bindings || {}) },
      settings: { ...DEFAULT_SETTINGS, ...(s.settings || {}) },
    };
  } catch (e) {
    return { bindings: { ...DEFAULT_BINDINGS }, settings: { ...DEFAULT_SETTINGS } };
  }
}

export function saveStore(bindings, settings) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ bindings, settings }));
  } catch (e) {}
}
