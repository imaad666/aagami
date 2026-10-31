/** Product illustrations matching the client mockup. */

export function ArtChip({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 160" fill="none" aria-hidden>
      <rect width="220" height="160" rx="18" fill="#0b2744" />
      <rect x="38" y="28" width="144" height="104" rx="8" fill="#d9b56a" />
      <rect x="50" y="40" width="120" height="80" rx="4" fill="#c9a24e" />
      <rect x="78" y="58" width="64" height="44" rx="3" fill="#f3e3b0" />
      <rect x="92" y="70" width="36" height="20" rx="2" fill="#8fd4f8" opacity="0.85" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={`t${i}`} x={58 + i * 22} y="34" width="8" height="8" rx="1" fill="#8a6a28" />
      ))}
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={`b${i}`} x={58 + i * 22} y="118" width="8" height="8" rx="1" fill="#8a6a28" />
      ))}
    </svg>
  )
}

export function ArtDevice({ className }) {
  return (
    <svg className={className} viewBox="0 0 240 170" fill="none" aria-hidden>
      <rect width="240" height="170" rx="18" fill="#123652" />
      <rect x="42" y="48" width="156" height="86" rx="10" fill="#eef3f8" />
      <rect x="42" y="48" width="156" height="22" rx="10" fill="#d7dee8" />
      <rect x="58" y="78" width="78" height="42" rx="6" fill="#0d2a4a" />
      <path d="M66 104c8-10 14-6 20 0s14 8 24-6" stroke="#00BBF9" strokeWidth="2.4" fill="none" />
      <circle cx="158" cy="92" r="10" fill="#1b1465" />
      <circle cx="158" cy="92" r="4" fill="#00BBF9" />
      <rect x="70" y="132" width="100" height="8" rx="4" fill="#c5d0dc" />
    </svg>
  )
}

export function ArtLaptop({ className }) {
  return (
    <svg className={className} viewBox="0 0 240 170" fill="none" aria-hidden>
      <rect width="240" height="170" rx="18" fill="#0f3050" />
      <rect x="44" y="36" width="152" height="92" rx="6" fill="#1a1f2c" />
      <rect x="50" y="42" width="140" height="80" rx="3" fill="#0b1c33" />
      <path d="M62 96c16-22 28-10 40 4 14 16 26-20 48-8 12 6 22 10 32 6" stroke="#00BBF9" strokeWidth="2.2" fill="none" />
      <circle cx="86" cy="62" r="10" fill="#F15BB5" opacity="0.85" />
      <circle cx="118" cy="70" r="16" fill="#00BBF9" opacity="0.35" />
      <rect x="36" y="128" width="168" height="10" rx="3" fill="#d5dbe3" />
    </svg>
  )
}

export function ArtVials({ className }) {
  return (
    <svg className={className} viewBox="0 0 220 160" fill="none" aria-hidden>
      <rect width="220" height="160" rx="18" fill="#102c4a" />
      <rect x="48" y="40" width="28" height="84" rx="6" fill="#e9eef4" />
      <rect x="52" y="78" width="20" height="40" rx="4" fill="#7ad3f2" />
      <rect x="92" y="32" width="28" height="92" rx="6" fill="#e9eef4" />
      <rect x="96" y="84" width="20" height="34" rx="4" fill="#F15BB5" />
      <rect x="136" y="48" width="28" height="76" rx="6" fill="#e9eef4" />
      <rect x="140" y="90" width="20" height="28" rx="4" fill="#fee440" />
    </svg>
  )
}

export function ArtArchitecture({ className }) {
  return (
    <svg className={className} viewBox="0 0 640 280" fill="none" aria-hidden>
      <rect width="640" height="280" rx="24" fill="#f3f6fb" />
      <rect x="48" y="78" width="210" height="128" rx="16" fill="#e8edf4" />
      <rect x="62" y="98" width="182" height="78" rx="10" fill="#fff" />
      <rect x="78" y="112" width="92" height="50" rx="6" fill="#0d2a4a" />
      <path d="M88 142c10-12 18-6 26 2s16 6 28-8" stroke="#00BBF9" strokeWidth="2.2" fill="none" />
      <rect x="250" y="70" width="220" height="140" rx="12" fill="#1a1f2c" />
      <rect x="262" y="82" width="196" height="104" rx="6" fill="#0b1c33" />
      <path d="M280 150c20-24 36-8 52 6 18 16 32-18 70-4" stroke="#00BBF9" strokeWidth="2.4" fill="none" />
      <circle cx="318" cy="112" r="14" fill="#F15BB5" opacity="0.9" />
      <rect x="470" y="118" width="26" height="72" rx="5" fill="#fff" />
      <rect x="474" y="154" width="18" height="30" rx="3" fill="#7ad3f2" />
      <rect x="506" y="108" width="26" height="82" rx="5" fill="#fff" />
      <rect x="510" y="156" width="18" height="28" rx="3" fill="#F15BB5" />
      <rect x="542" y="128" width="26" height="62" rx="5" fill="#fff" />
      <rect x="546" y="162" width="18" height="22" rx="3" fill="#fee440" />
      <rect x="86" y="196" width="54" height="36" rx="6" fill="#d9b56a" />
    </svg>
  )
}

export function ArtBody({ className }) {
  return (
    <svg className={className} viewBox="0 0 420 260" fill="none" aria-hidden>
      <rect width="420" height="260" rx="22" fill="#0c3a66" />
      <ellipse cx="210" cy="168" rx="70" ry="86" fill="#123f6a" />
      <circle cx="210" cy="72" r="28" fill="#1a4f80" />
      <circle cx="168" cy="150" r="22" fill="#F15BB5" opacity="0.55" />
      <circle cx="246" cy="138" r="30" fill="#00BBF9" opacity="0.45" />
      <circle cx="214" cy="176" r="16" fill="#8fd4f8" opacity="0.7" />
      <circle cx="188" cy="118" r="10" fill="#F15BB5" />
    </svg>
  )
}

export function ArtHelixStrip({ className }) {
  return (
    <svg className={className} viewBox="0 0 520 70" fill="none" aria-hidden>
      <path d="M10 35c40-28 70-28 110 0s70 28 110 0 70-28 110 0 70 28 110 0 70-28 70 0" stroke="#00BBF9" strokeWidth="3" />
      <path d="M10 35c40 28 70 28 110 0s70-28 110 0 70 28 110 0 70-28 110 0 70 28 70 0" stroke="#F15BB5" strokeWidth="3" />
    </svg>
  )
}

export function IconDrop() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#eef6fb" stroke="#d5e6f2" />
      <path d="M24 10c6 8 10 13 10 18a10 10 0 1 1-20 0c0-5 4-10 10-18Z" fill="#00BBF9" />
    </svg>
  )
}

export function IconGridPore() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#eef6fb" stroke="#d5e6f2" />
      <rect x="14" y="14" width="20" height="20" rx="3" stroke="#1b1465" strokeWidth="2" />
      <circle cx="24" cy="24" r="5" stroke="#00BBF9" strokeWidth="2" />
    </svg>
  )
}

export function IconWave() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#eef6fb" stroke="#d5e6f2" />
      <path d="M10 28c6-12 10-4 14 0s8 8 14-2" stroke="#00BBF9" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

export function IconBrain() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden>
      <circle cx="24" cy="24" r="23" fill="#eef6fb" stroke="#d5e6f2" />
      <path d="M18 18a6 6 0 0 1 12 0 5 5 0 0 1 3 9H15a5 5 0 0 1 3-9Z" stroke="#1b1465" strokeWidth="2" />
      <path d="M24 16v16M18 24h12" stroke="#00BBF9" strokeWidth="1.6" />
    </svg>
  )
}
