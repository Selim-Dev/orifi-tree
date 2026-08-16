# شجرة العائلة — Organic Family Tree POC

A proof of concept for rendering a family tree as an **actual tree** — roots in the
soil, a trunk rising from the founder, limbs thickening with the size of the family
they carry, and names written on green leaves in the canopy.

Built to answer one question: *can we replace the boxes-and-lines matrix with
something that looks like a real tree, and is it technically practical?*

**Answer: yes, and it's cheap.** ~700 lines, one runtime dependency, 112 kB first load.

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## The research: why there is no library for this

I looked for something off-the-shelf. There isn't one, and the reason is
structural — the ecosystem splits cleanly in two:

| Category | Examples | Why it doesn't fit |
| --- | --- | --- |
| Family-tree / org-chart libraries | [BALKAN FamilyTree JS](https://balkan.app/FamilyTreeJS/Docs/React), [GoJS Genogram](https://gojs.net/latest/samples/genogram.html), [yFiles](https://www.yworks.com/pages/drawing-family-trees-with-javascript), [Treant.js](https://fperucic.github.io/treant-js/), [react-family-tree](https://github.com/SanichKotikov/react-family-tree), [react-d3-tree](https://bkrem.github.io/react-d3-tree/docs/), dTree | These *are* the boxes-and-lines matrix your client rejected. Their node renderer is a rectangle and their edge renderer is a stroked polyline. Some let you swap the node template — none let you replace the **edge** with a tapered organic shape, which is where the entire "tree" look lives. |
| Botanical / procedural tree generators | L-system renderers, `Tree.js`-style canvas toys, The Grove (3D) | Beautiful trees, but they generate *fictional* branch structures from fractal rules. You cannot feed them "these 40 real people in these real relationships" and get a non-overlapping, readable layout. |

Nothing bridges the two. So the correct architecture is to **take the layout from
column 1 and the rendering from column 2**, which is exactly what this POC does.

### The split

1. **Layout — `d3-hierarchy`** (the only dependency, ~12 kB).
   Its `d3.tree()` implements the Reingold–Tilford tidy algorithm: no overlaps,
   siblings kept together, subtrees compact. This is the genuinely hard part and
   it is already solved.

2. **Bending the grid — a radial fan.** Flipping d3's grid upside-down is not
   enough; it gives a wide flat billboard. Reading d3's sibling axis as an
   *angle* and depth as a *radius*, swept around a pivot at the foot of the
   trunk, produces the dome a real canopy has and makes every limb radiate
   outward instead of running sideways. See `fan()` in
   [`lib/tree-layout.ts`](lib/tree-layout.ts).

3. **Rendering — fully custom SVG.** Every parent→child edge becomes a *filled,
   tapered ribbon* instead of a stroked line. That one substitution is the whole
   difference between an org chart and a tree.

### Branch thickness: Leonardo's rule

The detail that makes it read as wood rather than as brown pipes. Leonardo da
Vinci observed that a limb's cross-section equals the sum of its children's:

```
d^Δ = Σ dᵢ^Δ
```

Measured across real species Δ falls between 1.8 and 2.3
([PNAS Nexus, 2025](https://academic.oup.com/pnasnexus/article/4/2/pgaf003/7996468)).
We use Δ = 2.0 in [`limbWidth()`](lib/tree-layout.ts).

The payoff is that it's not just decorative — **limb thickness encodes descendant
count**. A branch carrying twelve descendants is visibly heavier than one carrying
two. That's real information a stroked line cannot express, and it's free.

### Folding: the answer to "the family has thousands of people"

The tree opens showing **three generations**; everything deeper is folded into a
green bud carrying its hidden descendant count. Generation count is switchable
(٢ / ٣ / ٤ / الكل), and any single branch can be folded or unfolded on its own.

The detail that makes folding work visually: **a folded limb keeps the weight of
what it hides.** `limbWidth()` charges a folded node for the tips in its *full*
subtree, not the one card you can see — so a branch hiding 8 descendants stays
visibly heavier than one hiding 1, and the trunk's proportions don't jump around
as branches open and close. Fold state is the only thing that changes; the
silhouette stays honest.

Two behaviours worth knowing:

- **Search reaches folded people.** It runs over the whole family, then unfolds
  *only the ancestors of each match* — never the whole tree. Searching جواهر in
  a 2-generation view pulls her up from three levels down and leaves everything
  else folded.
- **Clearing the search restores your fold state exactly**, because the reveal
  is derived (`effectiveCollapsed`) rather than written into state.

Folding also reflows the layout, so the viewport re-anchors on whichever person
you acted on instead of letting you lose your place.

### Leaves

Two things were wrong in the first pass, and both are about *arrangement* as
much as shape:

1. **A symmetric lens is not a leaf** — it reads as a green pill. Real leaves are
   asymmetric (upper half fuller), taper to a point at the apex, narrow to a
   petiole, and mostly curl off-axis. [`UNIT_LEAVES`](lib/leaf-shapes.ts) covers
   that with six variants.
2. **Real foliage does not scatter — it grows in sprigs.** Several leaves
   arranged alternately along a short shoot, splayed wider at the base and
   tighter at the tip. Random scatter reads as confetti no matter how good the
   individual leaf is; [`buildSprig()`](lib/leaf-shapes.ts) is what fixed it.

Bare structural limbs looked dead, so the heavy inner branches and the trunk
foot now carry a sparse scatter of shoots too — real trees do this (epicormic
shoots), and it ties the canopy to the trunk.

Leaves are defined once in unit space and instanced with `<use>`, with **flat
fills rather than gradients** — there are ~1,600 leaf instances at full
expansion and per-element gradients are the one thing that would make the scene
expensive.

### Two non-obvious traps (both cost me a rewrite)

**1. Offset limb outlines *perpendicular to the centreline*, never horizontally.**
The first version offset each flank by ±w/2 in X. That looks fine for a vertical
limb and collapses to zero visible thickness the moment a limb runs sideways —
so generation 1, which is nearly horizontal, rendered as bent wire. Sampling the
centreline and offsetting along its normal fixes it at every angle.

**2. In a fan, equal grid spacing does *not* mean equal room.**
Arc available to a node is `angle × radius`, so inner generations — closest to
the trunk, and carrying the widest cards — get a fraction of the space the
outer ones do, and their name cards overlap. The fix is a `separation()` that
scales with `cardWidth(depth) ÷ radius(depth)`, normalised against the outermost
generation. `cardSize()` is exported and shared by layout and renderer so the
two can't drift apart.

> Corollary worth knowing before scaling up: the room per person is
> `SPREAD × r_max ÷ tipCount`, **independent of node spacing**. Widening the
> angular sweep or adding a generation are the only ways to fit bigger cards —
> which is the real reason folding matters: it controls `tipCount`, the one
> term you can actually move.

**3. Never call `setPointerCapture` on a container you also want clicks inside.**
Panning captured the pointer on the `<svg>`, and the browser then retargets the
following `click` to the capture element — so no click ever reached a leaf or a
fold control. Every node interaction silently died while panning worked fine.
Panning is now driven from window-level `pointermove`/`pointerup` listeners,
which keeps drag-outside-the-element working without stealing click targeting.
A 4px movement threshold distinguishes a click from a pan, so releasing a drag
over a leaf no longer selects it and releasing over the background no longer
clears the selection.

> Testing note: this bug survived an earlier round of verification because the
> test dispatched synthetic `click` events directly at elements, which bypasses
> both hit-testing *and* pointer capture. Only `Input.dispatchMouseEvent` at
> real coordinates reproduces it. Synthetic events verify handlers; they do not
> verify that anything is clickable.

**4. Round every number that reaches the DOM.**
`Math.sin`/`Math.cos` differ in their last bits between Node's V8 and the
browser's, so raw 17-digit coordinates produce a React hydration mismatch
(`cx={-261.1677618864138}` vs `cx="-261.1677618864139"`). Rounding to 2 decimals
fixes it and shrinks the HTML.

### The other tricks that sell it

| Trick | Where |
| --- | --- |
| Limb bases are **wider than needed and sunk into the parent**, so sibling limbs overlap inside the trunk and forks fuse seamlessly instead of showing seams | [`buildScene()`](lib/tree-layout.ts) — `collarDrop` |
| Limbs taper on `pow(t, 0.62)`, not linearly — real limbs shed most of their girth just past the fork | [`ribbon()`](lib/tree-layout.ts) |
| Limbs are filled with a **horizontal** gradient (dark → lit → dark), which runs across the limb's width and reads as a lit cylinder | [`TreeDefs.tsx`](components/TreeDefs.tsx) — `#bark` |
| **Decorative foliage** scattered along the outer half of every twig — named leaves alone look sparse; the canopy needs mass | [`buildScene()`](lib/tree-layout.ts) — foliage section |
| Foliage is **grouped per twig**, so one CSS transform sways ~14 leaves together and the canopy moves like a branch rather than like confetti | [`globals.css`](app/globals.css) — `.sway` |
| Roots and the trunk buttress reuse the **same ribbon code pointed downward** — they're what makes it read as "growing from the ground up" | [`buildScene()`](lib/tree-layout.ts) — roots section |
| Ground is a soft radial **mound**, not a band — a rectangle reads as a plank | [`FamilyTree.tsx`](components/FamilyTree.tsx) |

All randomness is **seeded from node IDs** ([`lib/rng.ts`](lib/rng.ts)), never
`Math.random()`. The tree is byte-identical between server render and client
hydration, and doesn't reshuffle itself when you type in the search box.

---

## What's in the POC

Verified end-to-end: clean `next build` + `tsc --noEmit`, no console errors or
hydration warnings, and the interaction layer driven over CDP with **real
hit-tested mouse input** (`Input.dispatchMouseEvent` at actual coordinates, not
synthetic events) — leaf click → panel, "+N" bud → expand, minus → collapse,
pan, pan-does-not-clear-selection, generation selector, and search reaching a
person three levels inside a folded branch then restoring the fold state on
clear.

- 4 generations, 31 people, static data in [`lib/family.ts`](lib/family.ts)
- **Collapsible branches** — opens at 3 generations, buds show hidden descendant
  counts, per-branch fold/unfold, generation selector
- Full RTL Arabic throughout, Arabic-Indic numerals everywhere. Latin
  transliteration is shown in the detail panel only, never on the leaves
- Click any leaf → detail panel with lineage, wife, children, total descendants;
  click through to father or children and the view reveals and flies to them,
  unfolding whatever is in the way
- Search runs over the whole family (folded people included) and dims non-matches
- Wheel zoom / drag pan / fit-to-screen (hand-rolled, ~80 lines — no `d3-zoom`)
- Deceased relatives render as **autumn leaves** rather than greyed-out boxes —
  same visual language, read as a season rather than a status flag
- Wind animation, always on; the only thing that stops it is
  `prefers-reduced-motion`

### Data shape

Swapping in a real API payload is the only change needed — the renderer only
reads `children`:

```ts
interface Person {
  id: string;
  name: string;    // short name, shown on the leaf
  full: string;    // full lineage, shown in the panel
  latin: string;
  gender: "m" | "f";
  birth?: number; death?: number;
  spouse?: string; title?: string; note?: string;
  children?: Person[];
}
```

---

## Honest limits (worth knowing before this becomes production)

1. **Scale.** Folding is now the main defence, and it is the right one: it
   controls `tipCount`, which is the only term in the room-per-person formula
   you can move. What is *not* yet handled is a single person with 50+ direct
   children — they'd all land on one arc and collide, since folding only helps
   between generations, not within one. That needs sibling paging ("عرض ٢٠
   التالية") or a second-order fan. Rendering cost is not the problem: ~1,600
   leaf instances at full expansion and browsers don't blink at that.

2. **Spouses are a property, not a node.** This models the patrilineal structure
   Saudi family trees normally use — wives recorded on the husband's node. If the
   client needs both parents drawn as their own nodes, the layout stops being a
   tree and becomes a DAG, and `d3.tree()` no longer applies. That's a real
   architectural fork worth deciding early. The organic rendering still works —
   the couple becomes two leaves on a shared stem — but the layout engine would
   need replacing (Sugiyama layering, or hand-rolled).

3. **No print/export yet.** It's all SVG, so PDF/PNG export is easy to add, but
   the wind animation and the pan/zoom transform need freezing first.

4. **Text is SVG `<text>`** with no wrapping. Short given names are shown on the
   leaf and the full lineage lives in the panel — deliberate, since long Arabic
   lineage names will not fit a leaf at readable size.

5. **Names are not unique.** The sample already contains two people whose full
   lineage name is identical (عبدالعزيز بن سليمان العريفي — a grandson named
   after his grandfather), which is completely normal in Saudi families. Nothing
   breaks, since everything keys off `id`, but any UI that identifies a person
   by name alone will be ambiguous. Worth remembering when wiring real data.

---

## Sources

- [Scaling in branch thickness and the fractal aesthetic of trees — PNAS Nexus](https://academic.oup.com/pnasnexus/article/4/2/pgaf003/7996468)
- [Leonardo's rule, self-similarity and wind-induced stresses in trees — arXiv](https://arxiv.org/pdf/1105.2591)
- [d3-hierarchy tree layout](https://d3js.org/d3-hierarchy/tree)
- [Top 6 JavaScript Family Tree Diagram Libraries — DZone](https://dzone.com/articles/top-6-javascript-family-tree-diagram-libraries)
- [Drawing Family Trees With JavaScript — yWorks](https://www.yworks.com/pages/drawing-family-trees-with-javascript)
