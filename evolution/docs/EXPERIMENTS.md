# EXPERIMENTS — recorded results

All numbers below were produced on 2026-11-12 by `npm run exp <name>` (Node 16.14, Windows,
single core) and are stored in `experiments/results/*.json` and `*.log`. Experiments use a
640×480 arena (same rules as the default 960×640 world) so that replicates are fast.
Rerunning on the same JS engine reproduces them exactly.

Status labels: **[verified]** asserted by an automated test · **[observed]** measured in seeded
experiments, with replicate counts · **[hypothesis]** an explanation that was *not* tested.

Statistics: "sign test" = two-sided exact binomial test on the direction across replicates.
Replicates that share a stock population or parent line are not fully independent; treat
p-values as descriptive.

## Tests A, B, C, G — unit / integration (`npm test`, 25 tests, all pass)

| Test | What is asserted | Status |
|---|---|---|
| A inheritance | with mutation off, after 3000 ticks every descendant's genome equals its founder's genome exactly; with mutation on, offspring are > 4× closer to their parent than to an unrelated individual; `generation` and `founderId` propagate | verified |
| B mutation | over 4000 births the per-locus mutation frequency is 0.05 ± 0.003, effect sd is 0.15 (trait loci) / 0.2 (controller loci), mean effect ≈ 0; rate 0 copies exactly | verified |
| C energy limits | a world without resource goes extinct with zero births; a richer world holds > 1.3× the population of a poorer one (3 seeds); no birth before maturity; reserves stay within [0, capacity] | verified |
| G reproducibility | same seed ⇒ identical state hash and history; chunked stepping = single stepping; `restore(JSON(snapshot))` continues bit-identically, including after an environment change | verified |
| energy ledger | world energy equals injected + regrowth − dissipation (relative error < 1e-9) | verified |
| neutrality | changing marker genes changes no position or energy of any organism after 1500 ticks | verified |
| lineage, metrics, clock | pruning / trunk trimming, bounded history with conserved birth counts, pause and speed | verified |

## Test H — stability (`baseline`: 10 seeds × 100,000 ticks) [observed]

| quantity | result |
|---|---|
| extinctions | 0 / 10 |
| population after tick 5000 | min 199 – max 759 across all seeds; final 609 – 741 |
| organisms ever born per run | 58,000 – 117,000 |
| mean generation at end | 96 – 125 (generation time ≈ 950 – 1110 ticks) |
| population-cap hits | 0 |
| non-finite values | none |
| energy ledger relative error | ≤ 2.3e-10 |
| lineage nodes retained | ≤ 2,049 (vs ~100,000 organisms born) |
| history samples | 1,001 (bounded) |
| heap growth per run | −17 to +19 MB, no trend |
| speed | 0.77 – 0.90 µs per organism-tick |
| founder lineages surviving | 1 in every run |

Not covered: runs longer than 100k ticks, the default larger arena for that duration, browsers
other than the embedded Chromium (the viewer ran 1500 ticks with 660 organisms in 0.55 s there).

## Test D(1) — constructed selection pressure (`selection`) [observed]

**Hypothesis.** The cost of sensing determines which of two sense-range alleles wins.

**Design.** A stock of 100 genomes is taken from one evolving population (seed 100). Each genome
is copied 4 times: senseRange forced to 10 ("short") or 40 ("long") × markerA forced to 0.1 or
0.9 (crossed, so the marker starts unlinked). 400 founders, shuffled, **mutation off**, 8000
ticks, 16 seeds per treatment. Treatments: sensing cost per unit range 0.002 (5× default),
0.0004 (default), 0. Readout: frequency of the short allele (start 0.5) and the change in
logit frequency over the first 1000 ticks (a selection coefficient per 1000 ticks).

| stock | sensing cost | logit change / 1000 ticks | short-allele frequency at 8000 | seeds with short > 0.5 |
|---|---|---|---|---|
| young (tick 8,000) | 0.002 | +2.58 ± 0.27 | 1.000 | 16/16 |
| young | 0.0004 | +0.78 ± 0.26 | 0.774 ± 0.078 | 16/16 |
| young | 0 | −0.20 ± 0.23 | 0.202 ± 0.132 | **0/16** |
| old (tick 30,000) | 0.002 | +6.72 ± 0.12 | 1.000 | 16/16 |
| old | 0.0004 | +2.53 ± 0.21 | 1.000 | 16/16 |
| old | 0 | +0.58 ± 0.15 | 0.978 ± 0.018 | 16/16 |

**Outcome.** Supported. Selection strength rises monotonically with the cost in both stocks,
and in the young stock the direction *reverses* when sensing is free (long range wins 16/16).

**Unexpected finding.** In the old stock the short allele wins even when sensing is free.
[hypothesis] After 30k ticks the controllers are co-adapted to the ≈17-unit range they evolved
with, so a 40-unit sensor feeds them misleading inputs (epistasis between morphology and
controller). The stock-age contrast is consistent with this but does not prove it; both stocks
come from a single run.

## Test E — neutral drift [observed]

Same runs as above; markerA allele frequency (start 0.5):

| | logit change / 1000 ticks | final frequency (mean ± sd over 16 seeds) | seeds > 0.5 |
|---|---|---|---|
| six treatment × stock cells | −0.05 … +0.03 | 0.457 … 0.546, sd 0.13 – 0.23 | 6 – 9 of 16 (sign-test p ≥ 0.45) |

The marker wanders widely within runs (0.10 – 0.92) with no consistent direction, while the
selected locus in the same runs fixes. In `baseline` the marker means also show no consistent
direction (3/10 increased, p = 0.34). Note: the marker is linked to whatever genome carries it
(asexual), so within a run it hitch-hikes with successful clones; that is drift plus draft, not
pure drift.

## Test D(2) — replicate evolution with mutation (`baseline`) [observed]

Mean expressed trait at tick 5,000 vs 100,000, 10 independent seeds:

| trait | 5k → 100k | sd across seeds at 100k | increased in | sign-test p |
|---|---|---|---|---|
| size | 0.850 → 0.507 | 0.031 | 0/10 | 0.002 |
| senseRange | 23.7 → 11.7 | 1.05 | 0/10 | 0.002 |
| maxSpeed | 2.11 → 1.67 | 0.48 | 2/10 | 0.11 |
| offspringInvest | 0.292 → 0.330 | 0.046 | 8/10 | 0.11 |
| reproThreshold | 0.600 → 0.595 | 0.076 | 4/10 | 0.75 |
| markerA (neutral) | 0.524 → 0.501 | 0.114 | 3/10 | 0.34 |
| markerB (neutral) | 0.528 → 0.479 | 0.133 | 3/10 | 0.34 |

- Size and sense range change in the same direction in every replicate and converge on nearly
  the same value. Neither sits on its bound (0.4 and 6), consistent with an interior optimum.
- **Unexpected:** speed *capacity* ends anywhere between 0.90 and 2.32 across seeds, yet the
  realised mean speed converges to 0.55 – 0.65 in all ten. Different genotypes reach the same
  behaviour (capacity × learned thrust).
- Realised speed fell from 0.61 – 1.14 to ≈ 0.6: populations evolved to move slowly and graze.
- No trend towards "more complex" or "more capable" organisms: bodies got smaller and senses shorter.

## Adaptation and controller use (`adaptation`: 6 lines × 3 unseen worlds, 8000 ticks, mutation off) [observed]

Head-to-head competition, 100 + 100 founders, in worlds with fertility maps the lines never saw.
Frequency of group A at the end (start 0.5):

| A vs B | mean | A > 0.5 in |
|---|---|---|
| evolved (tick 100k) vs own ancestor (tick 5k) | 1.000 | 18/18 |
| intact vs resource-ray inputs disconnected | 1.000 | 18/18 |
| intact vs biomass-ray inputs disconnected | 0.994 | 18/18 |
| intact vs all external inputs disconnected | 1.000 | 18/18 |
| control: identical groups | 0.540 ± 0.088 | 10/18 (p = 0.81) |

Evolved populations displace their ancestors completely, and the advantage transfers to new
maps. Limitations: "evolved vs ancestor" does not separate trait change from controller change.
A lesion zeroes weights the rest of the network was tuned around, so it shows the controller
*depends on* those inputs, not how much information they carry. That organisms respond to each
other's biomass is measurable, but what the response is (avoidance, following) was not analysed.

## Test F — environmental change (`envchange`: 6 seeds) [observed]

50k ticks in the default environment, snapshot, then two branches for another 50k ticks:
control (unchanged) and poor (regrowth and influx × 0.35).

| seed | pop before | 3k ticks after drop | minimum | poor branch end | control end |
|---|---|---|---|---|---|
| 21 | 516 | 125 | 22 | 234 | 649 |
| 22 | 552 | 433 | 45 | 350 | 685 |
| 23 | 553 | 130 | 37 | 246 | 629 |
| 24 | 689 | 73 | 34 | 237 | 760 |
| 25 | 648 | 145 | 63 | 262 | 713 |
| 26 | 542 | 160 | 31 | 148 | 646 |

Every population crashed to 22 – 63 individuals, none went extinct, and all settled at a lower
level. Trait means of the poor branch differ little from the control (size 0.524 vs 0.508,
senseRange 13.3 vs 11.5, each higher in 5/6 seeds, p = 0.22): **no significant divergence.**

**Reciprocal transplant** (poor-evolved vs control-evolved line, 100 + 100, 10k ticks, no mutation):

| assay environment | frequency of poor-evolved line | > 0.5 in |
|---|---|---|
| poor | 0.243 ± 0.335 | 2/10 (2 further assays went extinct) |
| rich | 0.033 ± 0.060 | 0/12 (p = 0.0005) |

**Outcome: the local-adaptation hypothesis is not supported.** The poor-evolved lines lose in
the rich environment and, on average, also at home. Their disadvantage is smaller at home
(0.24 vs 0.03), which is the only hint of environment-specific fitness. [hypothesis] The
bottleneck and the smaller population in the poor branch reduced the efficiency of selection, so
the control lines simply kept improving faster at general foraging. Not tested.
Caveat: assay worlds start with full resource, so the first ~1500 ticks of a "poor" assay are not poor.

## Summary

| Claim | Status |
|---|---|
| genomes are inherited, mutation follows its specification, the engine is deterministic and conserves energy | verified |
| a costly heritable trait is selected against, in proportion to its cost; the direction can reverse when the cost is removed | observed (16 seeds × 6 cells) |
| a neutral marker shows no directional change | observed |
| independent populations evolve the same body size and sense range | observed (10 seeds) |
| evolved populations out-compete their ancestors in unseen worlds | observed (18/18) |
| the evolved controller depends on its sensors | observed (18/18) |
| populations survive a 65 % productivity cut | observed (6/6) |
| adaptation to the poor environment specifically | **not supported** |
| co-adaptation of controller and sense range; cause of the transplant result | hypothesis |
| stable coexistence of distinct strategies, speciation, open-ended evolution | not observed, not claimed |
