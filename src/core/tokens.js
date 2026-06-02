export const GRADE_COLOR = {
  perfect: 'var(--severity-low)',
  good:    'var(--accent-gold)',
  early:   'var(--severity-high)',
  late:    'var(--severity-critical)',
  miss:    'var(--status-offline)',
  wrong:   'var(--status-offline)',
};

export const GRADE_TEXT = {
  perfect: 'PERFECT',
  good:    'GOOD',
  early:   'EARLY',
  late:    'LATE',
  miss:    'MISS',
  wrong:   'WRONG',
};

export const VB = {
  serif: { fontFamily: 'var(--font-display)' },
  card: { background: 'var(--bg-card)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(26,26,46,0.04)' },
  label: { fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' },
  sectionTitle: { fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 600, color: 'var(--accent-indigo)' },
};

export const TEMPOS = [
  { label: '50%', rate: 0.50 },
  { label: '65%', rate: 0.65 },
  { label: '80%', rate: 0.80 },
  { label: '100%', rate: 1.0 },
];
