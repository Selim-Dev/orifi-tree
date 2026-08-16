"use client";

import { memo } from "react";
import type { TreeNode } from "@/lib/tree-layout";
import { cardSize } from "@/lib/tree-layout";
import { namePlatePath, namePlateVeins } from "@/lib/leaf-shapes";
import { jitter } from "@/lib/rng";
import { lifespan, toArabicDigits } from "@/lib/format";

interface Props {
  node: TreeNode;
  isFounder: boolean;
  selected: boolean;
  dimmed: boolean;
  matched: boolean;
  onSelect: (node: TreeNode) => void;
  onToggle: (node: TreeNode) => void;
}

const FOUNDER_R = 84;

function PersonLeafInner({
  node,
  isFounder,
  selected,
  dimmed,
  matched,
  onSelect,
  onToggle,
}: Props) {
  const p = node.person;
  const deceased = typeof p.death === "number";
  // Shared with the layout, which sizes angular spacing from these numbers.
  const { w, h } = cardSize(node.depth);

  const tilt = jitter(`tilt-${node.id}`, -7, 7);
  const years = lifespan(p.birth, p.death);
  const opacity = dimmed ? 0.16 : 1;

  const fill = deceased
    ? "url(#cardPassed)"
    : node.depth <= 1
      ? "url(#cardElder)"
      : "url(#cardLiving)";
  const rim = deceased ? "#7a5320" : node.depth <= 1 ? "#f0d99a" : "#2c6b33";

  /** Fold/unfold control, drawn below the card. */
  const toggle = node.hasChildren ? (
    <g
      className={`toggle${node.isCollapsed ? " collapsed" : " expanded"}`}
      transform={`translate(0 ${h * 0.86 + 20})`}
      onClick={(e) => {
        e.stopPropagation();
        onToggle(node);
      }}
      role="button"
      tabIndex={0}
      aria-label={
        node.isCollapsed
          ? `إظهار ذرّية ${p.name} (${node.descendants})`
          : `طيّ فرع ${p.name}`
      }
    >
      {/* Generous invisible target covering the gap between leaf and control.
          Kept clear of the card's lower edge so clicking the leaf still
          selects rather than folds. */}
      <circle className="hit" r={24} cy={-6} />
      <circle className="dot" r={node.isCollapsed ? 20 : 14} />
      {node.isCollapsed ? (
        <text className="toggle-count" direction="ltr">
          {toArabicDigits(node.descendants)}
        </text>
      ) : (
        <path d="M -6 0 L 6 0" className="toggle-glyph" />
      )}
    </g>
  ) : null;

  /* ---------------------------------------------------------- founder */
  if (isFounder) {
    return (
      <g
        transform={`translate(${node.x} ${node.y})`}
        opacity={opacity}
        className="node"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        role="button"
        tabIndex={0}
        aria-label={p.full}
      >
        <g className="sway sway-slow">
          <circle r={FOUNDER_R + 13} fill="#0f2c14" opacity={0.2} />
          <circle r={FOUNDER_R + 6} fill="none" stroke="#c8a44f" strokeWidth={1.5} opacity={0.7} />
          <circle
            r={FOUNDER_R}
            fill="url(#founder)"
            stroke={selected || matched ? "#fff6dc" : "#7d5a1d"}
            strokeWidth={selected || matched ? 4 : 2.5}
            filter="url(#softShadow)"
          />
          <circle r={FOUNDER_R - 9} fill="none" stroke="#8a6522" strokeWidth={1} opacity={0.65} />
          <text className="founder-name" y={-8}>
            {p.name}
          </text>
          <text className="founder-years" y={22}>
            {years}
          </text>
          <text className="founder-title" y={FOUNDER_R + 30}>
            {p.title}
          </text>
        </g>
      </g>
    );
  }

  /* ------------------------------------------------------------- leaf */
  return (
    <g
      transform={`translate(${node.x} ${node.y})`}
      opacity={opacity}
      className="node"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(node);
      }}
      role="button"
      tabIndex={0}
      aria-label={p.full}
    >
      <g className="sway" style={{ animationDelay: `${jitter(`d-${node.id}`, 0, 4).toFixed(2)}s` }}>
        {/* petiole tying the leaf back to its twig */}
        <path
          d={`M ${-w * 0.42} ${h * 0.2} q ${tilt * 0.6} 18 ${tilt * 0.2} 30`}
          stroke="#5b3d21"
          strokeWidth={4}
          fill="none"
          strokeLinecap="round"
        />

        <g transform={`rotate(${tilt.toFixed(2)})`}>
          <path
            d={namePlatePath(w, h)}
            fill={fill}
            stroke={selected || matched ? "#ffffff" : rim}
            strokeWidth={selected || matched ? 3.5 : 1.6}
            filter={selected || matched ? "url(#glow)" : "url(#softShadow)"}
          />
          <path
            d={namePlateVeins(w, h)}
            stroke={deceased ? "#8c6427" : "#e8f6d8"}
            strokeOpacity={0.3}
            strokeWidth={1.1}
            fill="none"
          />
          <text className="leaf-name" y={-1}>
            {p.name}
          </text>
          {years && (
            <text className="leaf-years" y={19}>
              {years}
            </text>
          )}
        </g>
      </g>
      {toggle}
    </g>
  );
}

export const PersonLeaf = memo(PersonLeafInner);
