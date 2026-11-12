# Evolution Machine

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
