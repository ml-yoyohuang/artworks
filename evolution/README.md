# Evolution Machine

Stage 4 adds Watch / Explore / Research views, optional ambient synthesis, local autosave with a backup,
named chambers, specimen favourites and nicknames, a short skippable introduction and touch pinch zoom.
Open **收藏與續看** to resume a previous observation. Export important worlds: browser-local storage can
be cleared. New application exports wrap the scientific snapshot and favourites in `evolution-world` v1;
plain legacy snapshots still import. See [QUALITY_REPORT](docs/QUALITY_REPORT.md) for actual tests and
outstanding audio, device and long-session verification. Stage 4 science rules remain model 3.

Latest experience update: internal grazer rays, inherited per-lobe particles, model 3 curvature-limited movement,
in-page confirmation dialogs, and a session-only Chinese observer journal (20 s / 1 / 3 / 10 min).
New worlds use model 3; existing model-1/2 snapshots keep their rules. Original `research` suites default
to model 2; add `--model3` for separately named new-model results. See [EXPERIENCE_UPDATE](docs/EXPERIENCE_UPDATE.md).

STAGE 3 now adds three designed ecological types, two resources, inherited corner/lobe counts,
recorded ancestry, exact checkpoints and a cancellable research laboratory in Field notes.
New worlds use model 3; old snapshots retain their original model. Three-way coexistence is
not guaranteed. Current results and limitations: [STAGE3_REPORT](docs/STAGE3_REPORT.md).

```bash
npm run research -- g          # 87 ecology/morphology runs, seeds 1–3
npm run research -- controls   # model-2 A–F paired comparisons
npm run research -- long       # 3 seeds × 100,000 ticks
npm run research -- benchmark  # four starting population sizes
npm run research -- path/to/manifest.json
```

Results include complete reproducible configurations in `experiments/results/stage3/`.
Ctrl+C cancels with partial results. Add `--quick` for smoke runs. The existing `npm run exp`
commands below explicitly keep model-1 semantics and their archived scientific baselines.
The diagnostic page is legacy model 1; use the main chamber to open model-3 worlds.

A deterministic artificial-life engine: organisms with heritable genomes forage, reproduce with
mutation and die in a 2D world of renewable resource. Fitness is never computed; selection is
whatever the energy economy does.

```bash
npm install
npm test                 # unit + integration tests
npm run dev              # observation chamber at http://localhost:5183 (diagnostics: /diagnostic.html)
npm run exp example      # run experiments/example.config.json headless
npm run exp baseline     # 10 seeds x 100k ticks (stability, replicate trait change)
npm run exp selection    # constructed selection pressure + neutral control
npm run exp adaptation   # evolved vs ancestor, sensor lesions (needs baseline first)
npm run exp envchange    # productivity drop + reciprocal transplant
```

Chamber controls: drag to pan, wheel or +/− to zoom, click a specimen to inspect it, Space pause,
1–4 speed, F follow, N field notes, Esc cancel. `?seed=123` opens a specific world.
Use `[` / `]` to inspect living specimens by keyboard. Hidden tabs suspend simulation time.
Speeds are targets; Field notes shows the actual ticks/s and frame CPU time.

STAGE 2 review: [audit](docs/STAGE2_AUDIT.md), [art direction](docs/ART_DIRECTION.md),
[visual contracts](docs/VISUAL_SYSTEM.md), [verification and limitations](docs/STAGE2_REPORT.md).

Add `-- --quick` to any experiment for a short smoke run. Requires Node ≥ 16.

Minimal use:

```ts
import { Simulation, makeConfig } from './src/sim';
const sim = new Simulation(makeConfig({ seed: 7 }));
sim.step(10_000);
console.log(sim.history.at(-1));           // population, trait means, births, deaths ...
const saved = JSON.stringify(sim.snapshot());
const again = Simulation.restore(JSON.parse(saved));
```

Docs: [RESEARCH](docs/RESEARCH.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) ·
[EVOLUTION_MODEL](docs/EVOLUTION_MODEL.md) · [EXPERIMENTS](docs/EXPERIMENTS.md) ·
[HANDOFF](docs/HANDOFF.md)
