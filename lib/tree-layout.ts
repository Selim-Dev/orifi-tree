/**
 * Turns a Person hierarchy into a drawable *botanical* tree.
 *
 * Four separate problems, solved separately:
 *
 *  1. WHICH people are drawn — a collapse set. Folded branches keep their real
 *     weight (see `limbWidth`) so a thick limb ending in a bud reads as "a lot
 *     of family is hidden here".
 *
 *  2. WHERE each person sits — delegated to d3-hierarchy's Reingold–Tilford
 *     tidy layout: no overlaps, siblings grouped, subtrees compact. Already
 *     solved, and the genuinely hard part.
 *
 *  3. HOW that grid is bent into a tree — a radial fan (`fan()`). A plain
 *     flipped grid produces a wide flat billboard; sweeping it around a pivot
 *     below the trunk gives the dome silhouette a real canopy has, and makes
 *     every limb radiate outward instead of running sideways.
 *
 *  4. WHAT is drawn between them — fully custom. Each parent→child edge is a
 *     *filled tapered ribbon* whose width comes from how much family hangs off
 *     it (Leonardo da Vinci's rule). That substitution is the whole difference
 *     between "boxes and lines" and something that reads as a tree.
 *
 * Every number that reaches the DOM is rounded. Math.sin/cos differ in their
 * last bits between Node's V8 and the browser's, and raw 17-digit coordinates
 * turn that into a React hydration mismatch.
 */

import { hierarchy, tree as d3tree, type HierarchyNode } from "d3-hierarchy";
import type { Person } from "./family";
import type { FamilyIndex } from "./family-index";
import { jitter, rngFor } from "./rng";
import { buildSprig, type SprigShape } from "./leaf-shapes";

/* ------------------------------------------------------------------ tuning */

const NODE_DX = 190;
const LEVEL_DY = 430;
/** Trunk length: pivot (ground) to the founder. */
const R0 = 340;
/** Total angular sweep of the canopy, radians (~129°). */
const SPREAD = 2.25;

/**
 * Leonardo's exponent. He observed a limb's cross-section equals the sum of
 * its children's: d^Δ = Σ dᵢ^Δ. Measured across real species Δ sits between
 * 1.8 and 2.3; 2.0 gives the most convincing silhouette. Lower Δ ⇒ fatter trunk.
 */
const DELTA = 2.0;
const TIP_W = 17;
const ROOT_DEPTH = 260;

const r2 = (n: number) => Math.round(n * 100) / 100;
const f = (n: number) => Math.round(n * 10) / 10;

/**
 * Name-card footprint per generation — the single source of truth, shared with
 * the renderer. The layout needs it because spacing here is angular: how much
 * arc a generation must be given depends on how wide its cards are.
 */
export function cardSize(depth: number): { w: number; h: number } {
  if (depth <= 1) return { w: 188, h: 84 };
  if (depth === 2) return { w: 170, h: 77 };
  return { w: 158, h: 72 };
}

/* ------------------------------------------------------------------- types */

export type Pt = { x: number; y: number };

export interface TreeNode {
  id: string;
  person: Person;
  depth: number;
  x: number;
  y: number;
  /** Unit vector pointing outward from the pivot — the limb's growth direction. */
  ux: number;
  uy: number;
  w: number;
  /** True when this person has children in the data (drawn or not). */
  hasChildren: boolean;
  /** True when those children are currently folded away. */
  isCollapsed: boolean;
  /** Totals from the full data, so folded branches still report honestly. */
  childCount: number;
  descendants: number;
  parentId?: string;
}

export interface Branch {
  id: string;
  d: string;
  spine: [Pt, Pt, Pt, Pt];
  depth: number;
  origin: Pt;
  tipWidth: number;
}

export interface FoliageGroup {
  id: string;
  sprigs: SprigShape[];
  /** Slower, smaller sway for shoots on heavy limbs. */
  heavy?: boolean;
}

export interface Scene {
  nodes: TreeNode[];
  branches: Branch[];
  foliage: FoliageGroup[];
  trunk: string;
  trunkFlare: string;
  roots: string[];
  canopyBlobs: { x: number; y: number; r: number; tone: number }[];
  grass: string[];
  groundSpan: number;
  guideArcs: { depth: number; d: string; label: Pt }[];
  bounds: { x: number; y: number; w: number; h: number };
  maxDepth: number;
}

/* --------------------------------------------------------------- geometry */

function cubicAt(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return {
    x: a * p0.x + b * c1.x + c * c2.x + d * p3.x,
    y: a * p0.y + b * c1.y + c * c2.y + d * p3.y,
  };
}

function cubicTangent(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  return {
    x: 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x),
    y: 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y),
  };
}

/**
 * A limb: the centreline is a cubic whose end tangents follow the radial
 * growth direction, and the outline is that centreline offset **perpendicular
 * to itself**.
 *
 * Offsetting perpendicular (rather than horizontally) is what makes limbs hold
 * their thickness at any angle — a horizontal offset collapses to nothing the
 * moment a limb runs sideways, which turns the whole tree into bent wire.
 */
function ribbon(
  base: Pt,
  baseDir: Pt,
  baseW: number,
  tip: Pt,
  tipDir: Pt,
  tipW: number,
  sway: number,
  samples = 24,
): { d: string; spine: [Pt, Pt, Pt, Pt] } {
  const dist = Math.hypot(tip.x - base.x, tip.y - base.y);

  const c1: Pt = {
    x: base.x + baseDir.x * dist * 0.44 + sway * 0.22,
    y: base.y + baseDir.y * dist * 0.44,
  };
  const c2: Pt = {
    x: tip.x - tipDir.x * dist * 0.4 - sway * 0.34,
    y: tip.y - tipDir.y * dist * 0.4,
  };

  const left: Pt[] = [];
  const right: Pt[] = [];

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const p = cubicAt(base, c1, c2, tip, t);
    const tg = cubicTangent(base, c1, c2, tip, t);
    const len = Math.hypot(tg.x, tg.y) || 1;
    const nx = -tg.y / len;
    const ny = tg.x / len;
    // Real limbs shed most of their girth just past the fork, then taper
    // gently — pow(t, 0.62) is concave and matches that far better than lerp.
    const hw = (baseW + (tipW - baseW) * Math.pow(t, 0.62)) / 2;
    left.push({ x: p.x + nx * hw, y: p.y + ny * hw });
    right.push({ x: p.x - nx * hw, y: p.y - ny * hw });
  }

  const d =
    `M ${f(left[0].x)} ${f(left[0].y)} ` +
    left.slice(1).map((p) => `L ${f(p.x)} ${f(p.y)}`).join(" ") +
    " " +
    right.reverse().map((p) => `L ${f(p.x)} ${f(p.y)}`).join(" ") +
    " Z";

  return { d, spine: [base, c1, c2, tip] };
}

/* ------------------------------------------------------------------- build */

export function buildScene(
  root: Person,
  index: FamilyIndex,
  collapsed: ReadonlySet<string>,
): Scene {
  // Folded people are simply not given children, so d3 lays out the visible
  // slice and knows nothing about what is hidden.
  const h = hierarchy<Person>(root, (d) => (collapsed.has(d.id) ? undefined : d.children));
  const maxDepth = h.height;
  const rAt = (depth: number) => R0 + depth * LEVEL_DY;
  const rMax = rAt(maxDepth);

  // Grid spacing becomes an *angle*, so the arc a node actually receives is
  // proportional to its radius. A generation therefore needs grid room
  // proportional to (its card width ÷ its radius); normalising against the
  // outermost generation keeps every card equally clear of its neighbours.
  // Without this the inner generations collide — they sit closest to the trunk
  // and carry the widest cards.
  const angularUnit = cardSize(maxDepth).w / rMax;

  const laid = d3tree<Person>()
    .nodeSize([NODE_DX, LEVEL_DY])
    .separation((a, b) => {
      // Cousins get extra air so separate branches read as separate branches.
      const base = a.parent === b.parent ? 1 : 1.45;
      const need = cardSize(Math.max(1, a.depth)).w / rAt(a.depth);
      return (base * need * 1.06) / angularUnit;
    })(h);

  const all = laid.descendants();

  /**
   * Leonardo's rule, applied bottom-up: a limb is as thick as it needs to be
   * to carry every twig above it.
   *
   * A folded node is charged for the tips it is *hiding*, not for the one card
   * you can see. That keeps the trunk's proportions stable as branches open
   * and close, and makes a heavy limb ending in a bud read honestly.
   */
  const widths = new Map<string, number>();
  const widthOf = (node: HierarchyNode<Person>): number => {
    const cached = widths.get(node.data.id);
    if (cached !== undefined) return cached;
    let w: number;
    if (!node.children?.length) {
      const tips = Math.max(1, index.leafCount.get(node.data.id) ?? 1);
      w = TIP_W * Math.pow(tips, 1 / DELTA);
    } else {
      w = Math.pow(
        node.children.reduce((acc, c) => acc + Math.pow(widthOf(c), DELTA), 0),
        1 / DELTA,
      );
    }
    widths.set(node.data.id, w);
    return w;
  };
  for (const n of all) widthOf(n);

  /**
   * Bend the tidy grid around a pivot at the foot of the trunk. d3 gives x
   * along the sibling axis and y along depth; we read x as an *angle* and
   * depth as a *radius*, so generations arc overhead instead of stacking into
   * a flat billboard.
   */
  const halfSpan = Math.max(1, ...all.map((n) => Math.abs(n.x)));
  function fan(gridX: number, depth: number) {
    const angle = (gridX / halfSpan) * (SPREAD / 2);
    const r = rAt(depth);
    const ux = Math.sin(angle);
    const uy = -Math.cos(angle);
    return { x: r2(ux * r), y: r2(uy * r), ux: r2(ux), uy: r2(uy) };
  }

  const nodes: TreeNode[] = all.map((n) => {
    const p = fan(n.x, n.depth);
    const id = n.data.id;
    return {
      id,
      person: n.data,
      depth: n.depth,
      ...p,
      w: r2(widths.get(id)!),
      hasChildren: !!n.data.children?.length,
      isCollapsed: collapsed.has(id) && !!n.data.children?.length,
      childCount: n.data.children?.length ?? 0,
      descendants: index.descendantCount.get(id) ?? 0,
      parentId: n.parent?.data.id,
    };
  });
  const byId = new Map(nodes.map((n) => [n.id, n]));

  /* -------------------------------------------------------- limbs */

  const branches: Branch[] = [];
  for (const n of all) {
    if (!n.children?.length) continue;
    const parent = byId.get(n.data.id)!;
    const kids = [...n.children].sort((a, b) => a.x - b.x);

    kids.forEach((kid, i) => {
      const child = byId.get(kid.data.id)!;

      // Fan the limb bases across the parent's cross-section (measured
      // perpendicular to its growth direction) so the fork spreads out.
      const spread = kids.length > 1 ? (i / (kids.length - 1) - 0.5) * parent.w * 0.62 : 0;
      const px = -parent.uy;
      const py = parent.ux;

      // Sink the base back into the parent so sibling limbs overlap inside the
      // trunk and the fork fuses seamlessly instead of showing a seam.
      const collarDrop = Math.min(70, parent.w * 0.75);
      const base: Pt = {
        x: parent.x + px * spread - parent.ux * collarDrop,
        y: parent.y + py * spread - parent.uy * collarDrop,
      };

      const { d, spine } = ribbon(
        base,
        { x: parent.ux, y: parent.uy },
        Math.max(child.w * 1.34, TIP_W * 1.2),
        { x: child.x, y: child.y },
        { x: child.ux, y: child.uy },
        child.w,
        jitter(`sway-${child.id}`, -34, 34),
      );

      branches.push({
        id: `b-${parent.id}-${child.id}`,
        d,
        spine,
        depth: child.depth,
        origin: base,
        tipWidth: child.w,
      });
    });
  }

  /* -------------------------------------------------------- trunk + roots */

  const rootNode = byId.get(root.id)!;
  const trunkTopW = rootNode.w;
  const trunkBaseW = trunkTopW * 1.55;

  const trunk = ribbon(
    { x: 0, y: 26 },
    { x: 0, y: -1 },
    trunkBaseW,
    { x: rootNode.x, y: rootNode.y },
    { x: 0, y: -1 },
    trunkTopW,
    0,
    18,
  ).d;

  // Buttress flare where trunk meets soil — short, very wide ribbons.
  const flareParts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const t = i / 4 - 0.5;
    const rnd = rngFor(`flare-${i}`);
    flareParts.push(
      ribbon(
        { x: t * trunkBaseW * 1.5, y: 16 },
        { x: t * 0.5, y: -1 },
        trunkBaseW * 0.42,
        { x: t * trunkBaseW * 0.55, y: -150 - rnd() * 90 },
        { x: 0, y: -1 },
        trunkBaseW * 0.16,
        0,
        14,
      ).d,
    );
  }

  // Roots mirror the canopy: the same ribbon code, pointed downward. They are
  // what makes the drawing read as "growing from the ground up".
  const roots: string[] = [];
  const ROOT_COUNT = 9;
  for (let i = 0; i < ROOT_COUNT; i++) {
    const t = i / (ROOT_COUNT - 1) - 0.5;
    const rnd = rngFor(`root-${i}`);
    const angle = t * 2.3 + (rnd() - 0.5) * 0.3;
    const reach = ROOT_DEPTH * (0.55 + rnd() * 0.7) * (1 - Math.abs(t) * 0.3);
    const dir = { x: Math.sin(angle), y: Math.cos(angle) };
    roots.push(
      ribbon(
        { x: t * trunkBaseW * 0.8, y: -70 },
        { x: dir.x * 0.5, y: 1 },
        trunkBaseW * (0.3 - Math.abs(t) * 0.14) + 12,
        { x: dir.x * reach * 2.4, y: reach },
        dir,
        4,
        (rnd() - 0.5) * 90,
        18,
      ).d,
    );
  }

  /* -------------------------------------------------------- foliage */

  const foliage: FoliageGroup[] = [];
  const degOf = (v: Pt) => (Math.atan2(v.y, v.x) * 180) / Math.PI;

  for (const b of branches) {
    const [p0, c1, c2, p3] = b.spine;
    const outer = b.depth >= maxDepth - 1;
    const rnd = rngFor(`fol-${b.id}`);

    // Heavy inner limbs get a *sparse* scatter of shoots rather than none.
    // Bare structural branches look dead; a few sprigs along the big limbs is
    // what real trees do (epicormic shoots) and it ties the canopy together.
    const count = outer ? 5 : 2;
    const sprigs: SprigShape[] = [];

    for (let i = 0; i < count; i++) {
      const t = outer ? 0.34 + (i / count) * 0.62 + (rnd() - 0.5) * 0.08 : 0.3 + rnd() * 0.5;
      const p = cubicAt(p0, c1, c2, p3, Math.min(1, t));
      const tg = cubicTangent(p0, c1, c2, p3, Math.min(1, t));
      const side = i % 2 === 0 ? 1 : -1;
      // Shoots leave the limb at an angle, biased back toward the canopy.
      const shootAngle = degOf(tg) + side * (38 + rnd() * 34);
      const scale = outer ? 1 : 0.62;
      sprigs.push(
        buildSprig(
          `${b.id}-sp${i}`,
          r2(p.x),
          r2(p.y),
          r2(shootAngle),
          (46 + rnd() * 40) * scale,
          (30 + rnd() * 12) * scale,
          outer ? 5 : 4,
          rnd,
        ),
      );
    }
    foliage.push({ id: b.id, sprigs, heavy: !outer });
  }

  // A rosette behind every named leaf so each card sits in green mass rather
  // than floating on its own. Folded branches get a denser, bushier one — it
  // is the visual cue that more family is packed in there.
  for (const n of nodes) {
    if (n.depth === 0) continue;
    const rnd = rngFor(`rose-${n.id}`);
    const bushy = n.isCollapsed;
    const count = bushy ? 9 : n.hasChildren ? 5 : 7;
    const sprigs: SprigShape[] = [];
    for (let i = 0; i < count; i++) {
      const a = (i / count) * 360 + rnd() * 30;
      const rad = (bushy ? 52 : 40) + rnd() * 40;
      const ar = (a * Math.PI) / 180;
      sprigs.push(
        buildSprig(
          `${n.id}-rs${i}`,
          r2(n.x + Math.cos(ar) * rad * 1.15),
          r2(n.y + Math.sin(ar) * rad * 0.72),
          r2(a),
          (bushy ? 58 : 46) + rnd() * 30,
          (bushy ? 34 : 30) + rnd() * 12,
          bushy ? 6 : 5,
          rnd,
        ),
      );
    }
    foliage.push({ id: `rose-${n.id}`, sprigs });
  }

  // A little green at the foot of the trunk, so the base is not bare bark.
  {
    const rnd = rngFor("base-shoots");
    const sprigs: SprigShape[] = [];
    for (let i = 0; i < 6; i++) {
      const t = i / 5 - 0.5;
      sprigs.push(
        buildSprig(
          `base-sp${i}`,
          r2(t * trunkBaseW * 1.15),
          r2(-30 - rnd() * 120),
          r2(t > 0 ? -30 - rnd() * 40 : -150 + rnd() * 40),
          34 + rnd() * 26,
          22 + rnd() * 10,
          4,
          rnd,
        ),
      );
    }
    foliage.push({ id: "trunk-base", sprigs, heavy: true });
  }

  /* -------------------------------------------------------- decor */

  // Kept tight and low-contrast: these only suggest mass behind the foliage.
  // Oversized blobs read as fog, not canopy.
  const canopyBlobs = nodes
    .filter((n) => n.depth >= 1)
    .map((n) => ({
      x: r2(n.x + jitter(`blob-x-${n.id}`, -34, 34)),
      y: r2(n.y + jitter(`blob-y-${n.id}`, -34, 16)),
      r: r2(
        n.isCollapsed
          ? jitter(`blob-r-${n.id}`, 112, 150)
          : n.hasChildren
            ? jitter(`blob-r-${n.id}`, 66, 96)
            : jitter(`blob-r-${n.id}`, 92, 128),
      ),
      tone: Math.floor(jitter(`blob-t-${n.id}`, 0, 3.99)),
    }));

  /* -------------------------------------------------------- bounds */

  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  // Padding stays tight — every wasted world-unit shrinks the fit-to-screen
  // scale, and name legibility at the default view depends entirely on it.
  const minX = Math.min(...xs) - 190;
  const maxX = Math.max(...xs) + 190;
  const minY = Math.min(...ys) - 185;
  const maxY = ROOT_DEPTH + 110;

  const groundSpan = r2(Math.min(Math.max(maxX, -minX) * 0.55, 900));

  const grass: string[] = [];
  for (let i = 0; i < 64; i++) {
    const rnd = rngFor(`grass-${i}`);
    const gx = -groundSpan + (i / 63) * groundSpan * 2 + (rnd() - 0.5) * 40;
    const gh = 12 + rnd() * 22;
    const lean = (rnd() - 0.5) * 16;
    grass.push(`M ${f(gx)} 4 Q ${f(gx + lean * 0.5)} ${f(-gh * 0.6)} ${f(gx + lean)} ${f(-gh)}`);
  }

  const guideArcs = [...new Set(nodes.map((n) => n.depth))]
    .sort((a, b) => a - b)
    .map((depth) => {
      const r = rAt(depth);
      const a = SPREAD / 2;
      return {
        depth,
        d: `M ${f(-Math.sin(a) * r)} ${f(-Math.cos(a) * r)} A ${f(r)} ${f(r)} 0 0 1 ${f(
          Math.sin(a) * r,
        )} ${f(-Math.cos(a) * r)}`,
        label: { x: f(Math.sin(a) * r + 40), y: f(-Math.cos(a) * r) },
      };
    });

  return {
    nodes,
    branches,
    foliage,
    trunk,
    trunkFlare: flareParts.join(" "),
    roots,
    canopyBlobs,
    grass,
    groundSpan,
    guideArcs,
    bounds: { x: r2(minX), y: r2(minY), w: r2(maxX - minX), h: r2(maxY - minY) },
    maxDepth,
  };
}
