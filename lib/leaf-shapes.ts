/**
 * Leaf geometry.
 *
 * Two realism problems the first pass got wrong:
 *
 *  1. A symmetric lens is not a leaf — it reads as a green pill. Real leaves
 *     are asymmetric (upper half fuller than the lower), taper to a point at
 *     the apex, narrow to a petiole at the base, and are rarely flat: most
 *     curl off-axis. `UNIT_LEAVES` covers those with six variants.
 *
 *  2. Real foliage does not scatter — it grows in *sprigs*: several leaves
 *     arranged alternately along a short shoot, angled away from it. Random
 *     scatter reads as confetti no matter how good the individual leaf is,
 *     which is why `buildSprig` exists.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Leaves defined in unit space: petiole at the origin, apex at x≈1, so a
 * placement is just `translate(x y) rotate(deg) scale(len)`. Defining them
 * once and instancing with <use> keeps ~1,300 leaves cheap.
 */
export const UNIT_LEAVES: string[] = [
  // 0 — ovate, flat
  "M 0 0 C 0.07 -0.20, 0.42 -0.33, 1 0 C 0.42 0.30, 0.07 0.18, 0 0 Z",
  // 1 — ovate, curled up
  "M 0 0 C 0.07 -0.22, 0.44 -0.36, 1 -0.13 C 0.44 0.26, 0.07 0.17, 0 0 Z",
  // 2 — lanceolate (narrow), flat
  "M 0 0 C 0.06 -0.15, 0.46 -0.24, 1 0 C 0.46 0.22, 0.06 0.13, 0 0 Z",
  // 3 — lanceolate, curled down
  "M 0 0 C 0.06 -0.13, 0.46 -0.22, 1 0.12 C 0.46 0.24, 0.06 0.14, 0 0 Z",
  // 4 — obovate (widest past the middle)
  "M 0 0 C 0.10 -0.14, 0.55 -0.34, 1 0 C 0.55 0.31, 0.10 0.12, 0 0 Z",
  // 5 — small round, for the dense inner canopy
  "M 0 0 C 0.10 -0.24, 0.58 -0.32, 1 0 C 0.58 0.30, 0.10 0.21, 0 0 Z",
];

export interface LeafInstance {
  id: string;
  x: number;
  y: number;
  rot: number;
  len: number;
  variant: number;
  tone: number;
}

export interface SprigShape {
  id: string;
  stem: string;
  leaves: LeafInstance[];
}

/**
 * One shoot carrying alternating leaves.
 *
 * @param angle direction of the shoot, degrees (0 = +x)
 */
export function buildSprig(
  id: string,
  ox: number,
  oy: number,
  angle: number,
  length: number,
  leafLen: number,
  count: number,
  rnd: () => number,
): SprigShape {
  const rad = (angle * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // Perpendicular, used both to bow the shoot and to offset its leaves.
  const px = -dy;
  const py = dx;

  const bend = (rnd() - 0.5) * length * 0.45;
  const ex = ox + dx * length;
  const ey = oy + dy * length;
  const cx = ox + dx * length * 0.5 + px * bend;
  const cy = oy + dy * length * 0.5 + py * bend;

  const stem = `M ${r2(ox)} ${r2(oy)} Q ${r2(cx)} ${r2(cy)} ${r2(ex)} ${r2(ey)}`;

  const at = (t: number) => {
    const mt = 1 - t;
    return {
      x: mt * mt * ox + 2 * mt * t * cx + t * t * ex,
      y: mt * mt * oy + 2 * mt * t * cy + t * t * ey,
    };
  };

  const leaves: LeafInstance[] = [];
  for (let i = 0; i < count; i++) {
    const terminal = i === count - 1;
    // Leaves start partway up the shoot; the last one caps the tip.
    const t = terminal ? 1 : 0.22 + (i / Math.max(1, count - 1)) * 0.66;
    const p = at(t);
    const side = i % 2 === 0 ? 1 : -1;
    // Splay wider near the base, tighter near the tip — as real shoots do.
    const splay = terminal ? 0 : side * (30 + (1 - t) * 34 + rnd() * 14);
    const scale = terminal ? 0.92 : 0.72 + rnd() * 0.5;

    leaves.push({
      id: `${id}-${i}`,
      x: r2(p.x),
      y: r2(p.y),
      rot: r2(angle + splay + (rnd() - 0.5) * 12),
      len: r2(leafLen * scale),
      variant: Math.floor(rnd() * UNIT_LEAVES.length),
      tone: Math.floor(rnd() * 5),
    });
  }

  return { id, stem, leaves };
}

/* ------------------------------------------------------- name-card leaf */

/**
 * The leaf a name is written on.
 *
 * Kept near-symmetric left-to-right because the text has to sit level and
 * centred, but the upper edge arches noticeably more than the lower one —
 * that asymmetry is what stops it reading as a pill.
 */
export function namePlatePath(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  return [
    `M ${r2(-hw)} ${r2(hh * 0.16)}`,
    // upper edge — full arch, apex right of centre
    `C ${r2(-hw * 0.62)} ${r2(-hh * 1.62)}, ${r2(hw * 0.48)} ${r2(-hh * 1.5)}, ${r2(hw)} ${r2(-hh * 0.14)}`,
    // apex tip
    `C ${r2(hw * 0.72)} ${r2(hh * 0.72)}, ${r2(hw * 0.46)} ${r2(hh * 1.16)}, ${r2(-hw * 0.05)} ${r2(hh * 1.2)}`,
    // lower edge — shallower, back to the petiole
    `C ${r2(-hw * 0.52)} ${r2(hh * 1.18)}, ${r2(-hw * 0.9)} ${r2(hh * 0.8)}, ${r2(-hw)} ${r2(hh * 0.16)}`,
    "Z",
  ].join(" ");
}

/** Midrib plus side veins, following the leaf's arch rather than a flat axis. */
export function namePlateVeins(w: number, h: number): string {
  const hw = w / 2;
  const hh = h / 2;
  const parts = [`M ${r2(-hw * 0.9)} ${r2(hh * 0.12)} Q 0 ${r2(-hh * 0.2)} ${r2(hw * 0.9)} ${r2(-hh * 0.1)}`];
  const n = 5;
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 1);
    const x = -hw * 0.82 + t * hw * 1.64;
    // Height of the midrib at this x, so veins spring from the rib itself.
    const ribY = hh * 0.12 + (-hh * 0.32 - hh * 0.02) * (1 - Math.pow(2 * t - 1, 2));
    const reach = hh * 0.86 * (1 - Math.abs(2 * t - 1) * 0.55);
    parts.push(`M ${r2(x)} ${r2(ribY)} Q ${r2(x + hw * 0.16)} ${r2(ribY - reach * 0.55)} ${r2(x + hw * 0.26)} ${r2(ribY - reach)}`);
    parts.push(`M ${r2(x)} ${r2(ribY)} Q ${r2(x + hw * 0.16)} ${r2(ribY + reach * 0.5)} ${r2(x + hw * 0.24)} ${r2(ribY + reach * 0.86)}`);
  }
  return parts.join(" ");
}
