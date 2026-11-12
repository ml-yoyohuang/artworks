# RESEARCH — model selection for the STAGE 1 engine

## Goal

A browser-scale world in which evolution by natural selection is a *consequence* of the rules
(heritable variation + ecological competition), measurable with controlled experiments, and cheap
enough to run hundreds of organisms for hundreds of generations in seconds to minutes.

## Approaches considered

| Approach | Verdict | Reason |
|---|---|---|
| Genetic algorithm with an explicit fitness function (generational, tournament selection) | Rejected | Selection is imposed by the developer, generations are synchronous, there is no ecology. Violates "avoid a universal fitness score". |
| Digital-organism instruction-set systems (Tierra, Avida) | Rejected for MVP | Open-ended, but organisms are programs: hard to make visible, spatial and beautiful; large design surface. |
| Chemistry / pattern systems (Lenia, particle life, reaction–diffusion) | Rejected | Striking visuals, but no explicit heritable genome, so inheritance and selection cannot be cleanly tested. |
| Agent-based ecology with intrinsic ("endogenous") fitness: Bugs (Packard 1989), PolyWorld (Yaeger 1994), Echo (Holland), Bibites-style simulators | **Chosen** | Fitness is never computed. An organism reproduces if it gathers enough energy and dies if it does not. Selection, drift and density dependence all emerge from energy bookkeeping. |
| Controller: hand-written rules / finite-state machine | Rejected | That is a library of scripted behaviours. |
| Controller: NEAT / topology-evolving or recurrent networks | Deferred | Speciation bookkeeping, variable genome length and brain-cost accounting are substantial; not needed to demonstrate selection on behaviour. |
| Controller: small fixed-topology feed-forward network, weights in the genome | **Chosen** | ~70 multiply-adds per organism per tick, fixed-length genome, trivially mutable, and general (no behaviour is named in code). |
| Sexual reproduction | Deferred | Asexual clones make ancestry a tree, make competition assays exact (no mutation => allele frequency is a pure fitness readout) and remove mate-finding from the MVP. |

## Recommended (implemented) model in one paragraph

Organisms live in a bounded 2D arena laid over a grid of a single renewable resource with patchy
fertility and logistic regrowth. Each organism carries a flat real-valued genome: 7 trait loci
(5 functional, 2 neutral markers) and 68 controller weights. Three forward sensor rays read
resource density and the body mass of other organisms; an 8-6-2 network outputs turn and thrust.
Uptake is a saturating function of local resource, is reduced while moving, and is shared
proportionally when a cell is contested. Body size, speed capacity, sense range, the controller
and movement all cost energy each tick. An organism that reaches its (heritable) reserve threshold
splits off a mutated offspring, paying a (heritable) share of its reserve; an organism at zero
energy dies, and an age-dependent hazard removes the old. Nothing else selects.

## Why these traits

- **size** — allometry gives opposing effects: uptake ∝ m^2/3, upkeep ∝ m^3/4, reserve ∝ m, offspring cost ∝ m, plus size-independent overheads (brain, sensing). This yields an interior optimum rather than "bigger is better".
- **maxSpeed** — realised speed is a behaviour (the network's thrust output), so the *capacity* must carry a standing cost, otherwise it drifts to the maximum for free.
- **senseRange** — linear upkeep versus information about where food is.
- **reproThreshold**, **offspringInvest** — a life-history (r/K-like) axis: many poorly provisioned offspring or few well provisioned ones.
- **markerA / markerB** — read by no rule. They are the built-in drift control and give the renderer a heritable, selection-free colour signal (lineage tint).
- *Metabolic efficiency* (suggested in the brief) was **left out**: a pure efficiency gene has no cost and would simply run to its bound. Efficiency instead emerges from the other traits.

## Major assumptions and simplifications

- One resource, one trophic level, no predation, no physical collisions (bodies overlap; crowding acts through shared food).
- Phenotype is a fixed function of genotype: no development, plasticity or learning.
- One locus per trait, additive Gaussian mutation on an unbounded scale, logistic expression. No recombination, no gene duplication, constant genome length, non-evolvable mutation rate.
- Time is discrete; all organisms perceive the same start-of-tick world.
- Mortality hazard parameters and maturity age are global constants, not heritable.
- Energy is the single currency; "mass" is a scaling variable, not a conserved material.

## Scientific limitations

- This is evolution of ~75 real parameters in a fixed architecture. It can optimise and diversify strategies inside that space; it cannot invent new sensors, organs or controller structure. No claim of open-ended evolution is made.
- Asexual populations in one well-mixed arena tend to be dominated by one founder clade (observed: usually 1 founder lineage remains). Long-term coexistence of distinct strategies is possible in principle (patchiness, density-dependent sensing) but is **not demonstrated**.
- No species concept is implemented. Marker colour clusters are lineages, not species.
- Bit-exact reproducibility holds on one JS engine; `Math.exp/tanh/sin/cos` are not guaranteed identical across engines.

## Key tradeoffs taken

- Order-independent feeding (proportional sharing) instead of sequential feeding: removes array-order advantage at the cost of one extra pass.
- Bounded pruned genealogy instead of a full event log: ancestry of the living is always available, memory does not grow with time, but extinct side-branches are forgotten.
- A hard population cap exists only as a safety valve and is reported (`capHits`); it was never hit in the recorded experiments.

## References

- Packard, N. (1989). *Intrinsic adaptation in a simple model for evolution.* Artificial Life (SFI).
- Yaeger, L. (1994). *Computational genetics, physiology, metabolism, neural systems, learning, vision, and behavior or PolyWorld.* Artificial Life III.
- Ray, T. (1991). *An approach to the synthesis of life.* Artificial Life II. (Tierra)
- Ofria, C. & Wilke, C. (2004). *Avida: a software platform for research in computational evolutionary biology.* Artificial Life 10.
- Stanley, K. & Miikkulainen, R. (2002). *Evolving neural networks through augmenting topologies.* Evolutionary Computation 10.
- Lenski, R. et al. (1991). *Long-term experimental evolution in E. coli. I.* Am. Nat. 138. (competition-assay methodology used in `experiments/`)
- Kleiber, M. (1932). *Body size and metabolism.* Hilgardia 6. (3/4-power scaling)
- Holling, C. S. (1959). *Some characteristics of simple types of predation and parasitism.* Can. Entomol. 91. (type-II response)
- Bedau, M. et al. (2000). *Open problems in artificial life.* Artificial Life 6.

References are cited from memory; verify bibliographic details before quoting them elsewhere.
