# HANDOFF — end of STAGE 1

## Complete

- Simulation core (`src/sim`, ~1,100 lines, zero runtime dependencies): organisms, genome →
  phenotype, neural controller, energy economy, reproduction with mutation, mortality, patchy
  renewable resource, interventions, bounded metrics history, bounded genealogy, JSON
  snapshot / restore, state hash, real-time clock helper.
- 25 automated tests (`npm test`), all passing.
- Four seeded headless experiments with recorded results (`docs/EXPERIMENTS.md`,
  `experiments/results/`), plus an example configuration.
- Diagnostic viewer (`npm run dev`): field, organisms, inspector, charts, pause / speed,
  environment sliders, introduce organism, save / load. Checked in the embedded browser:
  renders, no console errors, inspection and environment change work. Save / load buttons and
  shift-click introduction were **not** clicked through by hand (the underlying API is tested).
- `npm run build` produces a static `dist/`.

## Definition of done

| Item | State |
|---|---|
| independently simulated organisms; finite energy and resource; reproduction and death | done, tested |
| genomes inherited and mutated; genotype affects behaviour and survival | done, tested |
| general controller, no scripted behaviours | done |
| ecological tradeoffs | done; interior optima observed for size and sense range |
| headless experiments, reproducibility, metrics | done, tested |
| natural-selection experiments executed and documented | done |
| minimal visualisation | done |

## Known limitations

- One founder clade takes over every long run; no stable coexistence of strategies observed.
- Local adaptation to a poorer environment was tested and **not** found (EXPERIMENTS, Test F).
- Evolution moved towards smaller, slower, shorter-sighted grazers. The current economy does
  not reward long-range sensing or speed; that is a property of the parameters, not a bug.
- Bit-exact reproducibility is per JS engine. Snapshots of the default world are ≈ 1 MB of JSON.
- Organisms have no collisions; the arena edge is a clamp (organisms can slide along walls).
- Hazard and maturity parameters are global, not heritable. Mutation rate is not evolvable.
- Node 16 pins Vite 4 / Vitest 0.34. Upgrading Node allows current tooling; nothing in `src/` depends on it.
- The viewer redraws every organism with a fresh gradient each frame: fine at ~1,000, not at 10,000.

## How to run experiments

See `README.md`. To write a new one, copy a function in `experiments/run.ts`; the reusable
pieces are `arena()`, `sampleGenomes()`, `compete()` (mutation-free competition assay) and
`report()`. Always: several seeds, a neutral or identical-group control, and record the result
whichever way it comes out.

## STAGE 2 — building the artistic interface

Visual direction (from `docs/concept-art.png`): warm paper ground, pale-blue water bodies,
peach sediment, kidney-shaped cells with orange↔blue gradients and deep-violet nuclei, fine
antennae with dotted tips, soft grain, no glow.

Keep every visual tied to data. The diagnostic viewer already uses this mapping; keep or refine it:

| Visual | Data |
|---|---|
| blue water | `resource / cellCapacity` |
| peach sediment | `fertility` where resource has been grazed |
| body area | `ph.radius` (size) |
| elongation | maxSpeed |
| antenna length | senseRange (true reach shown on selection) |
| warm / cool hue | markerA / markerB — neutral, heritable: reads as lineage |
| nucleus size | energy / capacity |
| candidates not yet drawn | age (membrane thickness), reproThreshold / offspringInvest (budding shape), births and deaths (division and dissolution animations from `id` appearance / disappearance) |

Guidance:

- Import only from `src/sim/index.ts`; treat state as read-only; intervene only through
  `setEnvironment`, `introduce`, `restore`. Renderer state is keyed by organism `id`.
- Run the simulation in a Web Worker if the renderer gets heavy; the core has no DOM dependency.
- The field is a 96×64 grid: render it as a texture and shape it in a shader (threshold + soft
  edge gives the concept art's organic shorelines).
- Wanted researcher views: trait histograms (`traitHistogram`), lineage tree (`sim.lineage`),
  event markers on the timeline (`sim.events`), A/B comparison of two saved snapshots.
- Do not label marker-colour clusters "species".

## Research directions worth the expensive model

1. Why does one clade always win? Test spatial structure (barriers, larger worlds) and
   frequency-dependent resources for coexistence.
2. Make information valuable: moving or seasonal resource so that sensing and speed pay.
3. Controller–morphology co-adaptation (the Test D surprise): test directly by transplanting
   controllers between sense-range backgrounds.
4. Environmental gradients, a second resource, then predation.
5. Evolvable mutation rate; recurrent or topology-evolving controllers with size-dependent cost.

## Safe to give to a less expensive model

Renderer and shaders, UI panels and charts, histogram and lineage-tree views, Web Worker
plumbing, snapshot compression, more unit tests, parameter-sweep scripts that reuse `compete()`,
packaging. **Not** without review: anything in `stepOnce`, `genome.ts`, the energy rules, or the
interpretation of experiment results.
