/**
 * Genealogy of the living population, with a compact genetic record per ancestor.
 *
 * What is kept
 *   - every living organism;
 *   - every dead organism that still has living descendants (so each living organism has an
 *     unbroken recorded chain back to its founder, unless thinning has occurred - see below).
 * What is discarded
 *   - a dead organism with no living descendants is removed immediately ("extinct branch");
 *     only the count of such removals is kept (`prunedCount`);
 *   - when the tree exceeds `maxNodes`, the oldest dead single-child ancestors are spliced out.
 *     The child then points at its grandparent and its `gap` records how many ancestors are
 *     missing between them. Branch points and founders are never spliced.
 * Nothing is reconstructed: a missing ancestor is reported as missing.
 */
export interface LineageNode {
  id: number;
  parent: number; // -1 for founders
  birthTick: number;
  deathTick: number; // -1 while alive
  children: number; // children currently present in the tree
  /** ancestors omitted between this node and `parent` (0 = parent is the true parent) */
  gap: number;
  /** ecological type id, or -1 when the record predates model 2 and was not observed */
  type: number;
  corners: number;
  lobes: number;
  /** the organism's genome (immutable, shared with the organism); null if not recorded */
  genome: Float64Array | null;
}

export class Lineage {
  nodes = new Map<number, LineageNode>();
  /** dead organisms removed because no descendant was alive */
  prunedCount = 0;
  /** ancestors removed by thinning (their existence is known, their records are gone) */
  thinnedCount = 0;

  constructor(public maxNodes = 12000) {}

  birth(id: number, parent: number, tick: number, type = -1, corners = 0, lobes = 0, genome: Float64Array | null = null): void {
    this.nodes.set(id, { id, parent, birthTick: tick, deathTick: -1, children: 0, gap: 0, type, corners, lobes, genome });
    const p = this.nodes.get(parent);
    if (p) p.children++;
  }

  death(id: number, tick: number): void {
    let n = this.nodes.get(id);
    if (!n) return;
    n.deathTick = tick;
    while (n && n.deathTick >= 0 && n.children === 0) {
      this.nodes.delete(n.id);
      this.prunedCount++;
      const p = this.nodes.get(n.parent);
      if (p) p.children--;
      n = p;
    }
  }

  /** Thin the tree if it is over budget. O(nodes log nodes) when it acts, O(1) otherwise. */
  compact(): void {
    if (this.nodes.size <= this.maxNodes) return;
    const target = Math.floor(this.maxNodes * 0.8);
    const soleChild = new Map<number, LineageNode>();
    for (const n of this.nodes.values()) {
      const p = this.nodes.get(n.parent);
      if (p && p.children === 1) soleChild.set(p.id, n);
    }
    const candidates: LineageNode[] = [];
    for (const n of this.nodes.values()) if (n.deathTick >= 0 && n.children === 1 && n.parent >= 0 && this.nodes.has(n.parent)) candidates.push(n);
    candidates.sort((a, b) => a.birthTick - b.birthTick || a.id - b.id);
    // splice every second candidate (oldest first) so the remaining chain stays evenly sampled
    for (let i = 0; i < candidates.length && this.nodes.size > target; i += 2) {
      const n = candidates[i];
      const c = soleChild.get(n.id);
      if (!c || c.parent !== n.id) continue;
      c.parent = n.parent;
      c.gap += n.gap + 1;
      soleChild.set(n.parent, c); // harmless if the grandparent has other children
      this.nodes.delete(n.id);
      this.thinnedCount++;
    }
  }

  /** Recorded chain from the organism up to its oldest recorded ancestor (self first). */
  chain(id: number): LineageNode[] {
    const out: LineageNode[] = [];
    let n = this.nodes.get(id);
    while (n) {
      out.push(n);
      n = this.nodes.get(n.parent);
    }
    return out;
  }

  /** Ancestor ids from the organism up to the oldest retained ancestor. */
  ancestors(id: number): number[] {
    return this.chain(id).map((n) => n.id);
  }

  /** Most recent recorded common ancestor of two organisms, or -1. */
  mrca(a: number, b: number): number {
    const seen = new Set(this.ancestors(a));
    for (const id of this.ancestors(b)) if (seen.has(id)) return id;
    return -1;
  }

  /** Recorded children of a node (descendants exist only while they have living descendants). */
  childrenOf(id: number): LineageNode[] {
    const out: LineageNode[] = [];
    for (const n of this.nodes.values()) if (n.parent === id) out.push(n);
    return out;
  }

  /** Number of living organisms that descend from `id` (including itself if alive). */
  livingDescendants(id: number): number {
    const kids = new Map<number, number[]>();
    for (const n of this.nodes.values()) {
      const k = kids.get(n.parent);
      if (k) k.push(n.id); else kids.set(n.parent, [n.id]);
    }
    let count = 0;
    const stack = [id];
    while (stack.length) {
      const cur = stack.pop()!;
      const n = this.nodes.get(cur);
      if (!n) continue;
      if (n.deathTick < 0) count++;
      const k = kids.get(cur);
      if (k) for (const c of k) stack.push(c);
    }
    return count;
  }

  toJSON(): unknown[] {
    const out: unknown[] = [];
    for (const n of this.nodes.values())
      out.push([n.id, n.parent, n.birthTick, n.deathTick, n.children, n.gap, n.type, n.corners, n.lobes, n.genome ? Array.from(n.genome) : null]);
    return out;
  }

  /** Accepts model-2 rows and the 5-number STAGE 1 rows (which carry no genetic record). */
  static fromJSON(rows: any[], maxNodes = 12000, meta?: { pruned?: number; thinned?: number }): Lineage {
    const l = new Lineage(maxNodes);
    for (const r of rows) {
      l.nodes.set(r[0], {
        id: r[0], parent: r[1], birthTick: r[2], deathTick: r[3], children: r[4],
        gap: r[5] ?? 0, type: r[6] ?? -1, corners: r[7] ?? 0, lobes: r[8] ?? 0,
        genome: r[9] ? Float64Array.from(r[9]) : null,
      });
    }
    l.prunedCount = meta?.pruned ?? 0;
    l.thinnedCount = meta?.thinned ?? 0;
    return l;
  }
}
