# EVOLUTION MODEL — the rules as implemented

## Model versions (STAGE 3)

**後續運動更新：新世界預設已升為 model 3**，在 model 2 生態上加入 speed/R 最小轉動半徑。舊模型／快照保持原規則，詳見 [EXPERIENCE_UPDATE](EXPERIENCE_UPDATE.md)。以下段落保留 model 2 基準，原長期實驗尚未全部重跑為模型 3。

The **model 2 baseline** has A and B resources, three designed founder ecological types, independently inherited corner/lobe counts, and corpse reserve dissipation. The detailed implemented equations and coefficients are in [EXPERIMENT_DESIGN](EXPERIMENT_DESIGN.md); metric definitions in [EVOLUTIONARY_METRICS](EVOLUTIONARY_METRICS.md), lineage retention in [LINEAGE_MODEL](LINEAGE_MODEL.md). These documents describe abstract artificial-life rules, not biological claims.

Model 2 shares one total intake budget across resources, uses affinity-weighted versions of the existing eight controller inputs, and applies explicit type/morphology multipliers to uptake, basal maintenance, maximum speed and body construction. Continuous genome length remains 75; `type`, `corners`, `lobes` are additional discrete inherited genotype fields. Size-based mass and capacity do not increase merely because a body has more corners/lobes. Corner range 3–8 and lobe range 3–6 are configurable implementation defaults. Each count mutation is an independent ±1 at birth; type never randomly switches. Generalist intake .55 limits its single-resource uptake compared with the corresponding specialist under matched size/speed.

Version 2 snapshots save both grids, both live environments, the combined ledger, discrete traits, counters, retained ancestor genotypes and pruning metadata. Version 1 imports preserve **model 1** semantics and known scientific state; absent historical measurements stay unknown. Unsupported versions and malformed stocks/genomes/configurations fail before world replacement. New-model hashes additionally include discrete genotype, both grids, reproduction/kinematic state, configuration, environments, ledger and counters; model-1 hashes retain their original layout. Same-version same-seed/config/interventions are deterministic within documented JS-engine limits.

### Legacy model 1 baseline below

The following sections retain the original single-resource rules for `legacyConfig()` and the archived STAGE 1 experiments; they must not be read as the model-2 resource or morphology definitions. The legacy engine returns remaining corpse reserves to the cell. Its energy ledger and golden hashes remain valid; the earlier viewer legend stating no recycling did not accurately describe this legacy rule.

Source of truth: `src/sim/sim.ts`, `genome.ts`, `brain.ts`, `config.ts`. Default parameter values
are in `DEFAULT_CONFIG`. One tick = one logical time step (dt = 1).

## Genotype

`Float64Array` of 75 unbounded real genes: loci 0–6 are trait genes, loci 7–74 are controller
weights. The genome never changes during life.

## Trait expression (genotype → phenotype)

`s = 1 / (1 + e^-raw)`; linear traits `min + (max − min)·s`, log traits `min·(max/min)^s`.

| # | trait | range | scale | read by |
|---|---|---|---|---|
| 0 | size | 0.4 – 2.4 | log | mass, all allometric terms |
| 1 | maxSpeed | 0.3 – 4 (units/tick) | linear | movement, speed-capacity cost |
| 2 | senseRange | 6 – 80 (units) | log | sensor rays, sensing cost |
| 3 | reproThreshold | 0.3 – 0.95 (of capacity) | linear | reproduction |
| 4 | offspringInvest | 0.1 – 0.5 (of reserve) | linear | reproduction |
| 5, 6 | markerA, markerB | 0 – 1 | linear | **nothing** (neutral) |

Derived: `mass m = size²`, `radius = 4·size`, `capacity = 30·m`, `intakeMax = 0.6·m^(2/3)`.

## Perception and controller

Three rays at −0.7, 0, +0.7 rad from the heading, each sampled at ⅓, ⅔ and 1× `senseRange`.
Samples outside the arena read as empty.

| input | definition |
|---|---|
| 0–2 | mean resource of the 3 samples / `cellCapacity`, clipped to 1 (left, front, right) |
| 3–5 | `b/(b+2)` where b = mean body mass in the sampled cells, excluding self |
| 6 | resource in own cell / `cellCapacity`, clipped to 1 |
| 7 | own energy / capacity |

Network: 8 inputs + bias → 6 tanh → 2 outputs. `turn = tanh(o0)·0.5 rad`, `speed = sigmoid(o1)·maxSpeed`.
Position is clamped to the arena. No behaviour is named or rewarded anywhere in the code.

## Energy accounting (per organism, per tick)

Uptake request, at the position after moving, from its cell with resource R:

```
req = intakeMax · R/(R + 2) · 1/(1 + speed²)        (limited to the room left in the reserve / 0.7)
```

If the requests in a cell sum to more than R, every request is scaled by `R / Σreq` (scramble
competition, independent of processing order). Of what is taken, 70 % becomes reserve and 30 % is
dissipated.

Cost:

```
cost = 0.05·m^0.75            basal
     + 0.004·m·maxSpeed       upkeep of speed capacity
     + 0.0004·senseRange      sensing
     + 0.008                  controller
     + 0.015·m·speed²         locomotion
```

An organism pays `min(cost, energy)`.

## Mortality

- **Starvation**: energy reaches 0.
- **Hazard**: each tick, with probability `0.0002 + 0.00002·e^(age/400)` (extrinsic + Gompertz senescence).
- Remaining reserve of a corpse returns to its cell as resource.

## Reproduction (asexual)

Eligible when `age ≥ 40`, `energy ≥ reproThreshold·capacity` and
`offspringInvest·energy > 5·m` (it can pay for a body like its own). Then:

1. child genome = `mutate(parent genome)`;
2. parent loses `transfer = offspringInvest·energy`;
3. building the child's body dissipates `5·m_child`; the child starts with `transfer − 5·m_child`
   (excess above the child's capacity returns to the parent);
4. if `transfer ≤ 5·m_child` (a mutant too large for its endowment) the transfer is lost: **stillbirth**.

The child appears next to the parent with a random heading and acts from the next tick.
Births are suppressed only at `maxPopulation` (3000), which is counted as `capHits`.

## Mutation

Per birth, each locus independently with probability 0.05: `gene += N(0, σ)`, σ = 0.15 for trait
loci, 0.2 for controller loci (raw scale). Expected 3.75 mutated loci per birth. No bounds are
needed because expression is bounded. No other source of variation exists after founding.

## Environment

Grid of 10×10-unit cells. Fertility `f ∈ [1 − patchiness, 1]` is smooth seeded value noise,
fixed for the run. Per tick, per cell with `K = cellCapacity·f`:

```
R ← max(0, R + (r·R + influx)·(1 − R/K))        r = 0.012, influx = 0.004, cellCapacity = 10
```

Logistic regrowth means over-grazed cells recover slowly: the ecological feedback loop.
`regrowthRate`, `influx`, `cellCapacity` may be changed at run time (`setEnvironment`).

## Update order within a tick

1. rebuild biomass grid; 2. every organism senses the same start-of-tick world, thinks, moves;
3. uptake requests → proportional allocation; 4. uptake, cost, age, death;
5. reproduction; 6. remove dead, append newborn; 7. resource regrowth; 8. clock, metrics.

## Energy ledger (verified invariant)

`Σ resource + Σ reserves = injected + regrowth − metabolism − assimilationLoss − birthCost`.
Checked in tests and in every long experiment (relative error ≤ 1e-9).

## Tradeoffs present by construction

| axis | benefit | cost |
|---|---|---|
| large body | more uptake, longer fasting endurance, larger share of a contested cell | higher upkeep, costlier offspring, costlier movement |
| speed capacity / speed | reach food sooner | standing cost, quadratic movement cost, reduced uptake while moving |
| sense range | information from further away | linear upkeep |
| low repro threshold / investment | more, earlier offspring | poorly provisioned offspring, depleted parent |

## Metric definitions (`Sample`, `src/sim/metrics.ts`)

Interval counters cover the `span` ticks since the previous sample; state fields are instantaneous.
`meanGeneration` = mean number of birth events between a living organism and its founder
(generations overlap; it is *not* tick/constant). `meanParentAge` = mean parent age at birth in
the interval (generation time). `traitGeneVar` / `brainGeneVar` = variance of raw gene values across
the population, averaged over loci (a diversity proxy, not heterozygosity). `founderLineages` =
number of founders with living descendants.
