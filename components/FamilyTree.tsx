"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildScene, type TreeNode } from "@/lib/tree-layout";
import { UNIT_LEAVES } from "@/lib/leaf-shapes";
import { ancestorsOf, collapsedForDepth, indexFamily } from "@/lib/family-index";
import { FAMILY, GENERATION_LABELS } from "@/lib/family";
import { jitter } from "@/lib/rng";
import { TreeDefs } from "./TreeDefs";
import { PersonLeaf } from "./PersonLeaf";
import { Foliage } from "./Foliage";
import { DetailPanel } from "./DetailPanel";
import { Toolbar } from "./Toolbar";
import { useZoomPan } from "./useZoomPan";

const BLOB_TONES = ["#7fb56a", "#5e9a52", "#8cc077", "#4e8a49"];

/** Generations shown before folding. Three keeps the opening view readable. */
const DEFAULT_GENERATIONS = 3;

export function FamilyTree() {
  // Built once from the full data — the source of truth for people who are
  // currently folded away (totals, search, ancestor chains).
  const index = useMemo(() => indexFamily(FAMILY), []);

  const [generations, setGenerations] = useState(DEFAULT_GENERATIONS);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(() =>
    collapsedForDepth(index, DEFAULT_GENERATIONS),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [guides, setGuides] = useState(false);

  const q = query.trim().toLowerCase();

  // Search runs over the *whole* family, not just what is drawn — otherwise
  // searching a folded tree silently misses most relatives.
  const matchIds = useMemo(() => {
    if (!q) return null;
    const hit = new Set<string>();
    for (const p of index.order) {
      if (`${p.name} ${p.full} ${p.latin}`.toLowerCase().includes(q)) hit.add(p.id);
    }
    return hit;
  }, [q, index.order]);

  // A match inside a folded branch is revealed by unfolding only its ancestors
  // — never the whole tree. Derived rather than stored, so clearing the search
  // restores exactly the fold state the user had chosen.
  const effectiveCollapsed = useMemo(() => {
    if (!matchIds?.size) return collapsed;
    const s = new Set(collapsed);
    for (const id of matchIds) for (const a of ancestorsOf(index, id)) s.delete(a);
    return s;
  }, [collapsed, matchIds, index]);

  const scene = useMemo(
    () => buildScene(FAMILY, index, effectiveCollapsed),
    [index, effectiveCollapsed],
  );

  const { svgRef, view, dragging, fit, zoomBy, centerOn, consumeDrag, handlers } = useZoomPan(
    scene.bounds,
  );

  const nodeById = useMemo(() => new Map(scene.nodes.map((n) => [n.id, n])), [scene.nodes]);
  const selected = selectedId ? (nodeById.get(selectedId) ?? null) : null;

  // Folding reflows the whole tree, so hold the viewport on whichever person
  // the user acted on rather than letting them lose their place.
  const anchor = useRef<string | null>(null);
  useEffect(() => {
    const id = anchor.current;
    if (!id) return;
    anchor.current = null;
    const n = nodeById.get(id);
    if (n) centerOn(n.x, n.y);
  }, [nodeById, centerOn]);

  const jumpTo = useCallback(
    (node: TreeNode) => {
      // A pan that happens to end on a leaf is not a selection.
      if (consumeDrag()) return;
      setSelectedId(node.id);
      centerOn(node.x, node.y, Math.max(view.k, 0.6));
    },
    [centerOn, view.k, consumeDrag],
  );

  const toggle = useCallback(
    (node: TreeNode) => {
      if (consumeDrag()) return;
      anchor.current = node.id;
      setCollapsed((prev) => {
        const next = new Set(prev);
        if (next.has(node.id)) next.delete(node.id);
        else next.add(node.id);
        return next;
      });
    },
    [consumeDrag],
  );

  /** Unfold every ancestor so a person deep in a folded branch becomes visible. */
  const reveal = useCallback(
    (id: string) => {
      anchor.current = id;
      setSelectedId(id);
      setCollapsed((prev) => {
        const next = new Set(prev);
        for (const a of ancestorsOf(index, id)) next.delete(a);
        return next;
      });
    },
    [index],
  );

  const applyGenerations = useCallback(
    (g: number) => {
      setGenerations(g);
      setCollapsed(g > index.maxDepth ? new Set<string>() : collapsedForDepth(index, g));
    },
    [index],
  );

  const hiddenCount = index.order.length - scene.nodes.length;

  return (
    <div className="stage">
      <svg
        ref={svgRef}
        className={`canvas${dragging ? " dragging" : ""}`}
        onClick={() => {
          // Releasing a pan over the background must not clear the selection.
          if (consumeDrag()) return;
          setSelectedId(null);
        }}
        {...handlers}
      >
        <TreeDefs>
          {/* Leaf shapes defined once and instanced with <use>. */}
          {UNIT_LEAVES.map((d, i) => (
            <path key={i} id={`lf${i}`} d={d} />
          ))}
        </TreeDefs>

        <rect x={0} y={0} width="100%" height="100%" fill="url(#sky)" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          {/* ------------------------------------------- canopy mass (behind) */}
          <g opacity={0.42} filter="url(#canopyBlur)">
            {scene.canopyBlobs.map((b, i) => (
              <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={BLOB_TONES[b.tone]} />
            ))}
          </g>

          {/* ------------------------------------------- generation guides */}
          {guides && (
            <g className="guide">
              {scene.guideArcs.map((g) => (
                <g key={g.depth}>
                  <path d={g.d} />
                  <text x={g.label.x} y={g.label.y}>
                    {GENERATION_LABELS[g.depth] ?? `الجيل ${g.depth + 1}`}
                  </text>
                </g>
              ))}
            </g>
          )}

          {/* ------------------------------------------- ground + roots */}
          <g>
            {/* Soft mound rather than a hard band — a rectangle reads as a plank. */}
            <ellipse cx={0} cy={30} rx={scene.groundSpan} ry={132} fill="url(#soil)" />
            <ellipse cx={0} cy={12} rx={scene.groundSpan * 0.62} ry={70} fill="url(#soilTop)" />

            <g fill="url(#rootFill)">
              {scene.roots.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>

            <path
              d={`M ${-scene.groundSpan * 0.92} 6 Q 0 -24 ${scene.groundSpan * 0.92} 6`}
              stroke="#6f5a33"
              strokeWidth={6}
              fill="none"
              opacity={0.45}
              strokeLinecap="round"
            />
            <g className="grass">
              {scene.grass.map((d, i) => (
                <path key={i} d={d} />
              ))}
            </g>
          </g>

          {/* ------------------------------------------- trunk + limbs */}
          <g filter="url(#limbShadow)">
            <path d={scene.trunkFlare} fill="url(#bark)" />
            <path d={scene.trunk} fill="url(#bark)" />
            {/* Thick limbs first so thin twigs overlay cleanly. */}
            {[...scene.branches]
              .sort((a, b) => a.depth - b.depth)
              .map((b) => (
                <path key={b.id} d={b.d} fill={b.tipWidth > 30 ? "url(#bark)" : "url(#barkTwig)"} />
              ))}
          </g>

          {/* Bark grain down the trunk. */}
          <g className="grain">
            {Array.from({ length: 9 }).map((_, i) => {
              const root = scene.nodes[0];
              const off = (i / 8 - 0.5) * root.w * 0.78;
              return (
                <path
                  key={i}
                  d={`M ${off} ${root.y + 20} C ${off + jitter(`g${i}`, -12, 12)} ${
                    root.y * 0.6
                  } ${off * 1.2} ${root.y * 0.3} ${off * 1.45} -12`}
                />
              );
            })}
          </g>

          <Foliage groups={scene.foliage} />

          {/* ------------------------------------------- named people */}
          <g>
            {scene.nodes.map((n) => (
              <PersonLeaf
                key={n.id}
                node={n}
                isFounder={n.depth === 0}
                selected={selectedId === n.id}
                matched={!!matchIds?.has(n.id)}
                dimmed={!!matchIds && !matchIds.has(n.id)}
                onSelect={jumpTo}
                onToggle={toggle}
              />
            ))}
          </g>
        </g>
      </svg>

      <Toolbar
        query={query}
        onQuery={setQuery}
        matchCount={matchIds?.size ?? null}
        generations={generations}
        maxGenerations={index.maxDepth + 1}
        onGenerations={applyGenerations}
        guides={guides}
        onGuides={setGuides}
        onFit={() => fit()}
        onZoomIn={() => zoomBy(1.25)}
        onZoomOut={() => zoomBy(0.8)}
        shown={scene.nodes.length}
        hidden={hiddenCount}
        total={index.order.length}
      />

      <DetailPanel
        node={selected}
        onClose={() => setSelectedId(null)}
        onReveal={reveal}
        onToggle={toggle}
      />
    </div>
  );
}
