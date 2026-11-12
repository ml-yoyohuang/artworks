/**
 * Pruned genealogy with bounded memory.
 *
 * Keeps a node for every living organism and for every dead organism that
 * still has living descendants. Dead leaves are removed immediately; dead
 * single-child roots (the "trunk" older than the most recent common ancestor
 * of a clade) are trimmed by compact(). What remains is the coalescent tree
 * of the living population, whose size is bounded by population size and
 * coalescence depth rather than by elapsed time.
 */
export interface LineageNode {
  id: number;
  parent: number; // -1 for founders; may point to a trimmed (absent) node
  birthTick: number;
  deathTick: number; // -1 while alive
  children: number; // children currently present in the tree
}

export class Lineage {
  nodes = new Map<number, LineageNode>();

  birth(id: number, parent: number, tick: number): void {
    this.nodes.set(id, { id, parent, birthTick: tick, deathTick: -1, children: 0 });
    const p = this.nodes.get(parent);
    if (p) p.children++;
  }

  death(id: number, tick: number): void {
    let n = this.nodes.get(id);
    if (!n) return;
    n.deathTick = tick;
    while (n && n.deathTick >= 0 && n.children === 0) {
      this.nodes.delete(n.id);
      const p = this.nodes.get(n.parent);
      if (p) p.children--;
      n = p;
    }
  }

  /** Trim dead roots that have exactly one child. O(nodes). */
  compact(): void {
    const soleChild = new Map<number, LineageNode>();
    const roots: LineageNode[] = [];
    for (const n of this.nodes.values()) {
      const p = this.nodes.get(n.parent);
      if (!p) roots.push(n);
      else if (p.children === 1 && p.deathTick >= 0) soleChild.set(p.id, n);
    }
    for (let r of roots) {
      while (r.deathTick >= 0 && r.children === 1) {
        const c = soleChild.get(r.id);
        if (!c) break;
        this.nodes.delete(r.id);
        r = c;
      }
    }
  }

  /** Ancestor ids from the organism up to the oldest retained ancestor. */
  ancestors(id: number): number[] {
    const out: number[] = [];
    let n = this.nodes.get(id);
    while (n) {
      out.push(n.id);
      n = this.nodes.get(n.parent);
    }
    return out;
  }

  /** Most recent common ancestor of two retained organisms, or -1. */
  mrca(a: number, b: number): number {
    const seen = new Set(this.ancestors(a));
    for (const id of this.ancestors(b)) if (seen.has(id)) return id;
    return -1;
  }

  toJSON(): number[][] {
    const out: number[][] = [];
    for (const n of this.nodes.values()) out.push([n.id, n.parent, n.birthTick, n.deathTick, n.children]);
    return out;
  }

  static fromJSON(rows: number[][]): Lineage {
    const l = new Lineage();
    for (const [id, parent, birthTick, deathTick, children] of rows)
      l.nodes.set(id, { id, parent, birthTick, deathTick, children });
    return l;
  }
}
