/**
 * A flat index over the Person tree.
 *
 * Everything that needs to know about people who are *not currently drawn*
 * reads from here: true descendant totals for collapsed branches, search over
 * hidden relatives, and the ancestor chain used to reveal someone deep in a
 * folded subtree.
 */

import type { Person } from "./family";

export interface FamilyIndex {
  byId: Map<string, Person>;
  parentOf: Map<string, string | undefined>;
  depthOf: Map<string, number>;
  /** Tips in this person's full subtree (a childless person counts as 1). */
  leafCount: Map<string, number>;
  descendantCount: Map<string, number>;
  order: Person[];
  maxDepth: number;
}

export function indexFamily(root: Person): FamilyIndex {
  const byId = new Map<string, Person>();
  const parentOf = new Map<string, string | undefined>();
  const depthOf = new Map<string, number>();
  const leafCount = new Map<string, number>();
  const descendantCount = new Map<string, number>();
  const order: Person[] = [];
  let maxDepth = 0;

  const walk = (p: Person, parent: string | undefined, depth: number) => {
    byId.set(p.id, p);
    parentOf.set(p.id, parent);
    depthOf.set(p.id, depth);
    order.push(p);
    maxDepth = Math.max(maxDepth, depth);

    let leaves = 0;
    let descendants = 0;
    for (const c of p.children ?? []) {
      walk(c, p.id, depth + 1);
      leaves += leafCount.get(c.id)!;
      descendants += descendantCount.get(c.id)! + 1;
    }
    leafCount.set(p.id, p.children?.length ? leaves : 1);
    descendantCount.set(p.id, descendants);
  };

  walk(root, undefined, 0);
  return { byId, parentOf, depthOf, leafCount, descendantCount, order, maxDepth };
}

/** Ids from the root down to (but excluding) `id`. */
export function ancestorsOf(index: FamilyIndex, id: string): string[] {
  const chain: string[] = [];
  let cur = index.parentOf.get(id);
  while (cur) {
    chain.push(cur);
    cur = index.parentOf.get(cur);
  }
  return chain;
}

/**
 * Fold everything below `visibleGenerations`.
 *
 * This is the whole answer to "the family may have thousands of people": the
 * tree opens showing a readable slice, and the rest stays one click away
 * rather than being rendered into an unreadable thicket.
 */
export function collapsedForDepth(index: FamilyIndex, visibleGenerations: number): Set<string> {
  const out = new Set<string>();
  for (const p of index.order) {
    const d = index.depthOf.get(p.id)!;
    if (d >= visibleGenerations - 1 && p.children?.length) out.add(p.id);
  }
  return out;
}
