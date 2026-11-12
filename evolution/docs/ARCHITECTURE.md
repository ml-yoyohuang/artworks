# ARCHITECTURE

TypeScript, no runtime dependencies. Vite 4 / Vitest 0.34 / vite-node are dev tools only
(chosen because the machine runs Node 16; newer versions need Node ≥ 18).

```
src/sim/            simulation core — no DOM, no timers, no wall-clock, no Math.random
  rng.ts            sfc32 PRNG, 4-word serialisable state, Box–Muller gauss
  config.ts         SimConfig / EnvConfig, DEFAULT_CONFIG, makeConfig(patch)
  genome.ts         TRAITS table, expression, expressPhenotype, mutate, randomGenome
  brain.ts          8-6-2 feed-forward controller, weights read in place from the genome
  sim.ts            Simulation: world state, step(), interventions, snapshot/restore, hash
  lineage.ts        pruned, bounded genealogy of the living
  metrics.ts        Sample definition, sampling, decimation, histograms
  clock.ts          real time -> fixed ticks (pause, speed) for interactive front ends
  index.ts          public API (import only from here)
src/viewer/main.ts  diagnostic Canvas viewer (reads state; writes only via the public API)
experiments/        seeded headless experiments (run.ts), example config, results/
tests/              Vitest unit + integration tests
```

## Component boundaries

- **Genotype** `Organism.genome` — immutable array of raw genes.
- **Phenotype** `Organism.ph` — pure function of genome + config, cached at birth (`expressPhenotype`).
- **Physiological state** — `energy`, `age`, position, heading, `speed`.
- **Controller** — `think(genome, offset, inputs, outputs)`; stateless.
- **Environment** — `resource`, `fertility`, `biomass` grids and `env` parameters.
- **Fitness outcomes** — never computed by the engine; observable as births/deaths, lineage and frequencies.

## Organism lifecycle

founder (`spawn`/`introduce`) or birth → juvenile (age < maturity) → adult (may reproduce whenever
the energy conditions hold) → death (starvation or hazard). Dead organisms are removed in the same tick.

## Simulation clock and determinism

`step(n)` advances n fixed ticks. All randomness comes from one `Rng` seeded by `cfg.seed`
(fertility uses a second stream derived from the seed, so the map does not depend on founder
settings). Organisms are processed in stable array order; feeding is order-independent. Same
config ⇒ bit-identical `stateHash()` on the same JS engine. `Clock` lives outside the simulation.

## Data flow

```
config ──> Simulation ──step()──> state (orgs, resource, lineage)
                │                         │
   setEnvironment / introduce       history: Sample[] (bounded), events, counters, ledger
                │                         │
            front end  <── read-only ─────┘        snapshot() <-> restore()  (plain JSON)
```

## Renderer data contract (for STAGE 2)

A renderer needs only: `sim.orgs[]` (`id, x, y, heading, speed, energy, age, generation, founderId,
ph.traits[], ph.radius, ph.capacity`), `sim.resource`, `sim.fertility`, `sim.cols/rows`,
`sim.cfg.width/height/cellSize`, `sim.env`, `sim.history`, `sim.events`, `sim.lineage`.
Treat all of it as read-only. Per-organism visual state (trails, interpolation, animation phase)
belongs in the renderer, keyed by `id`.

## Complexity and memory

Per tick O(N + cells): no pairwise organism interaction (organisms sense each other through the
biomass grid, which doubles as the spatial index). History ≤ `maxSamples` (pairwise decimation),
events ≤ 500, lineage = coalescent tree of the living, population ≤ `maxPopulation`.

Measured (Node 16, one core): ≈ 0.8 µs per organism-tick; 640×480 arena with 600–700 organisms
≈ 2,400 ticks/s. Budget for the viewer: 1,000 organisms at 60 ticks/s uses ≈ 5 % of a frame.

## Extension strategy

| Future feature | Where it plugs in |
|---|---|
| new heritable trait | append to `TRAITS`, read it in `expressPhenotype` or `stepOnce` |
| richer controller (recurrent, more sensors) | `brain.ts` + input assembly in `stepOnce` step 2; genome length follows `BRAIN_WEIGHTS` |
| topology mutation | needs variable-length genomes: replace `Float64Array` genome with a struct and make brain cost ∝ size |
| gradients, seasons | make `env` a function of tick / position before step 7 |
| second resource, predation | add a grid / an interaction pass between steps 3 and 4; biomass grid already locates prey |
| sexual reproduction | step 5: pick a mate via the biomass grid, add crossover in `genome.ts`; lineage becomes a DAG |
| lineage tree / archive export | `Lineage` nodes + periodic `snapshot()` |
| Web Worker | the core is DOM-free; post `snapshot()` slices or typed arrays |

Snapshots carry `version: 1`; bump it when the genome layout or state fields change.
