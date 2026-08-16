/**
 * All gradients, filters and reusable paint for the scene.
 *
 * The trick that sells "wood" rather than "brown shape": every limb is filled
 * with a *horizontal* gradient (dark edge → lit centre → dark edge). Because
 * limbs are drawn in user space, that gradient runs across the limb's width
 * and reads as a cylinder catching light from the upper left.
 */
export function TreeDefs({ children }: { children?: React.ReactNode }) {
  return (
    <defs>
      {children}

      {/* --- sky ------------------------------------------------------- */}
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dfeee0" />
        <stop offset="45%" stopColor="#eef4e4" />
        <stop offset="100%" stopColor="#f7f1e1" />
      </linearGradient>

      {/* --- bark: cylindrical shading across the limb ----------------- */}
      <linearGradient id="bark" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#3b2718" />
        <stop offset="26%" stopColor="#6b4726" />
        <stop offset="48%" stopColor="#8a6134" />
        <stop offset="70%" stopColor="#5d3d21" />
        <stop offset="100%" stopColor="#2f1f13" />
      </linearGradient>

      <linearGradient id="barkTwig" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#4d321c" />
        <stop offset="45%" stopColor="#7d5730" />
        <stop offset="100%" stopColor="#3d2716" />
      </linearGradient>

      <linearGradient id="rootFill" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor="#2a1b10" />
        <stop offset="45%" stopColor="#59391d" />
        <stop offset="100%" stopColor="#20150c" />
      </linearGradient>

      {/* --- soil: radial so the mound fades out instead of ending in an edge */}
      <radialGradient id="soil" cx="0.5" cy="0.35" r="0.62">
        <stop offset="0%" stopColor="#7d6540" stopOpacity="0.9" />
        <stop offset="55%" stopColor="#6b5734" stopOpacity="0.55" />
        <stop offset="100%" stopColor="#5c4a2c" stopOpacity="0" />
      </radialGradient>

      <radialGradient id="soilTop" cx="0.5" cy="0.4" r="0.6">
        <stop offset="0%" stopColor="#57462a" stopOpacity="0.85" />
        <stop offset="100%" stopColor="#6b5734" stopOpacity="0" />
      </radialGradient>

      {/* --- foliage greens -------------------------------------------- */}
      {(
        [
          ["leafA", "#7fc36a", "#3f8b43"],
          ["leafB", "#9ad47c", "#4f9a4c"],
          ["leafC", "#68b05c", "#2f7237"],
          ["leafD", "#b3dd8b", "#5aa356"],
        ] as const
      ).map(([id, a, b]) => (
        <linearGradient key={id} id={id} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={a} />
          <stop offset="100%" stopColor={b} />
        </linearGradient>
      ))}

      {/* --- named leaf cards ------------------------------------------ */}
      <linearGradient id="cardLiving" x1="0.1" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stopColor="#8fce74" />
        <stop offset="55%" stopColor="#5aa754" />
        <stop offset="100%" stopColor="#357a3c" />
      </linearGradient>

      <linearGradient id="cardElder" x1="0.1" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stopColor="#4f9a55" />
        <stop offset="55%" stopColor="#2f7440" />
        <stop offset="100%" stopColor="#1d5330" />
      </linearGradient>

      {/* Deceased relatives get an autumn leaf rather than a grey box —
          the same visual language, read as a season rather than a status. */}
      <linearGradient id="cardPassed" x1="0.1" y1="0" x2="0.7" y2="1">
        <stop offset="0%" stopColor="#e3b866" />
        <stop offset="55%" stopColor="#c08c3c" />
        <stop offset="100%" stopColor="#8d5f24" />
      </linearGradient>

      <radialGradient id="founder" cx="0.35" cy="0.3" r="0.85">
        <stop offset="0%" stopColor="#f6dfa2" />
        <stop offset="45%" stopColor="#d9ad4e" />
        <stop offset="100%" stopColor="#96702a" />
      </radialGradient>

      {/* --- effects ---------------------------------------------------- */}
      <filter id="canopyBlur" x="-40%" y="-40%" width="180%" height="180%">
        <feGaussianBlur stdDeviation="26" />
      </filter>

      <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%">
        <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#1d3316" floodOpacity="0.34" />
      </filter>

      <filter id="limbShadow" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="3" dy="4" stdDeviation="4" floodColor="#2b1c0d" floodOpacity="0.3" />
      </filter>

      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="9" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}
