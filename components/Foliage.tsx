"use client";

import { memo } from "react";
import type { FoliageGroup } from "@/lib/tree-layout";
import { jitter } from "@/lib/rng";

/**
 * Flat fills rather than gradients: there are ~1,300 leaf instances on screen
 * and per-element gradients are the one thing that would make this scene
 * expensive. At leaf size the difference is invisible.
 */
const TONES = ["#6fb45e", "#87c86d", "#54994f", "#9ad47c", "#3f8b43"];

interface Props {
  groups: FoliageGroup[];
}

function FoliageInner({ groups }: Props) {
  return (
    <g className="foliage">
      {groups.map((g) => (
        <g
          key={g.id}
          className={`sway${g.heavy ? " sway-heavy" : ""}`}
          style={{
            animationDelay: `${jitter(`fd-${g.id}`, 0, 5).toFixed(2)}s`,
            animationDuration: `${jitter(`fu-${g.id}`, 5, 9).toFixed(2)}s`,
          }}
        >
          {g.sprigs.map((s) => (
            <g key={s.id}>
              <path className="shoot" d={s.stem} />
              {s.leaves.map((l) => (
                // <use> instances a shared path definition — the cheap way to
                // put well over a thousand leaves on screen.
                <use
                  key={l.id}
                  href={`#lf${l.variant}`}
                  transform={`translate(${l.x} ${l.y}) rotate(${l.rot}) scale(${l.len})`}
                  fill={TONES[l.tone]}
                />
              ))}
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

export const Foliage = memo(FoliageInner);
