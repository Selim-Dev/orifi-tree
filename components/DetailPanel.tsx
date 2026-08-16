"use client";

import type { TreeNode } from "@/lib/tree-layout";
import { GENERATION_LABELS } from "@/lib/family";
import { lifespan, toArabicDigits } from "@/lib/format";

interface Props {
  node: TreeNode | null;
  onClose: () => void;
  /** Unfold whatever is needed to bring this person into view. */
  onReveal: (id: string) => void;
  onToggle: (node: TreeNode) => void;
}

export function DetailPanel({ node, onClose, onReveal, onToggle }: Props) {
  if (!node) return null;
  const p = node.person;
  const num = toArabicDigits;

  // Read relationships from the person data, not from what happens to be
  // drawn — otherwise a folded branch reports having no children.
  const children = p.children ?? [];

  return (
    <aside className="panel" onClick={(e) => e.stopPropagation()}>
      <button className="close" onClick={onClose} aria-label="إغلاق">
        ×
      </button>

      <span className={`badge ${p.death ? "passed" : "living"}`}>
        {p.death ? "رحمه الله" : "على قيد الحياة"}
      </span>

      <h2>{p.full}</h2>
      <p className="latin">{p.latin}</p>

      <dl>
        <div>
          <dt>الجيل</dt>
          <dd>{GENERATION_LABELS[node.depth] ?? num(node.depth + 1)}</dd>
        </div>
        {(p.birth || p.death) && (
          <div>
            <dt>{p.death ? "الميلاد والوفاة" : "سنة الميلاد"}</dt>
            <dd>{lifespan(p.birth, p.death)}</dd>
          </div>
        )}
        {p.spouse && (
          <div>
            <dt>الزوجة</dt>
            <dd>{p.spouse}</dd>
          </div>
        )}
        {node.parentId && (
          <div>
            <dt>الأب</dt>
            <dd>
              <button className="link" onClick={() => onReveal(node.parentId!)}>
                عرض الأب
              </button>
            </dd>
          </div>
        )}
        <div>
          <dt>الأبناء المباشرون</dt>
          <dd>{num(node.childCount)}</dd>
        </div>
        <div>
          <dt>مجموع الذرّية</dt>
          <dd>{num(node.descendants)}</dd>
        </div>
      </dl>

      {node.hasChildren && (
        <button className="fold-btn" onClick={() => onToggle(node)}>
          {node.isCollapsed
            ? `إظهار الذرّية (${num(node.descendants)})`
            : "طيّ هذا الفرع"}
        </button>
      )}

      {children.length > 0 && (
        <div className="kids">
          <h3>الأبناء</h3>
          <ul>
            {children.map((c) => (
              <li key={c.id}>
                <button className="link" onClick={() => onReveal(c.id)}>
                  {c.name}
                  <span>{lifespan(c.birth, c.death)}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {p.note && <p className="note">{p.note}</p>}
    </aside>
  );
}
