import React from 'react';

export const Svg = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d={d} fill="currentColor" />
  </svg>
);

export const PlayIcon = () => (
  <Svg d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v15.78a1.5 1.5 0 0 0 2.3 1.27l12.7-7.89a1.5 1.5 0 0 0 0-2.54L6.3 2.84Z" />
);

export const StopIcon = () => (
  <Svg d="M6 5h12a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
);

// Material Symbols "settings" gear (filled), inherits currentColor.
export const GearIcon = ({ size = 20 }) => (
  <Svg
    size={size}
    d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58ZM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6Z"
  />
);

export const MoonIcon = () => (
  <Svg d="M12.73 2.004a.75.75 0 0 1 .12.904 8.25 8.25 0 0 0 10.24 10.24.75.75 0 0 1 .906 1.033A10.001 10.001 0 0 1 12 22C6.477 22 2 17.523 2 12A10 10 0 0 1 11.82 2.01a.75.75 0 0 1 .91-.006Z" />
);

export const SunIcon = () => (
  <Svg d="M12 2.25a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9ZM3 11.25a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5H3Zm16.5 0a.75.75 0 0 0 0 1.5H21a.75.75 0 0 0 0-1.5h-1.5Zm-14.03-6.53a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 1 0 1.06-1.06L5.47 4.72Zm12.12 0-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0-1.06-1.06ZM12 19.5a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-1.5a.75.75 0 0 1 .75-.75Zm-5.47-.97-1.06 1.06a.75.75 0 1 0 1.06 1.06l1.06-1.06a.75.75 0 0 0-1.06-1.06Zm10.94 0a.75.75 0 0 0-1.06 1.06l1.06 1.06a.75.75 0 0 0 1.06-1.06l-1.06-1.06Z" />
);

export const VulcanMark = ({ size = 34 }) => (
  <div style={{
    width: size,
    height: size,
    border: '2px solid var(--accent-indigo)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    position: 'relative'
  }}>
    <div style={{ width: size * 0.34, height: size * 0.34, background: 'var(--accent-gold)', borderRadius: '50%' }} />
    {[0, 45, 90, 135].map((a) => (
      <div key={a} style={{
        position: 'absolute',
        width: size,
        height: 1,
        background: 'var(--accent-indigo)',
        opacity: 0.22,
        transform: `rotate(${a}deg)`
      }} />
    ))}
  </div>
);
