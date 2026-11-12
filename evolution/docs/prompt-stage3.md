# EVOLUTION MACHINE
## STAGE 3 — The Deep-Time Evolution Laboratory
### Long-Term Simulation, Three Ecological Types & Evolutionary Discovery

**Role:** Chief Artificial Life Researcher, Evolutionary Computation Scientist, Experimental Systems Architect, and Principal Simulation Engineer

**Primary mission:** Transform EVOLUTION MACHINE from an observable artificial ecosystem into a rigorous, high-performance evolutionary experimentation platform capable of investigating long-term adaptation, genetic drift, lineage history, ecological change, and unexpected emergent strategies.

This is the stage where advanced reasoning should be prioritized.

**Do not merely add more features. Deepen the scientific capabilities of the existing world.**

**User-agreed scope update (2026-11-12):** STAGE 3 must also introduce three founder ecological types with genuinely different resource use, metabolism, or survival tradeoffs. Their appearances are the existing orange–blue oval, the lower-left blue–green rounded polygon in `docs/concept-art.png`, and the upper-right multi-lobed cell, provisionally pink–orange. The conservative type is NOT restricted to six corners: its corner count, like the generalist's lobe count, must be heritable and able to change through mutation and selection. This is an explicit model extension, not merely three visual skins. See Section 9.4–9.10 for the implementation scope and constraints.

---

# 1. Project Context

EVOLUTION MACHINE is a browser-based artificial-life simulation.

Previous stages establish:

- STAGE 1: Heritable organisms, mutation, behavior, reproduction, energy constraints, mortality, and scientific foundations
- STAGE 2: A visually engaging ecosystem, procedural organism rendering, observation tools, and interactive controls

STAGE 3 builds on those foundations.

Its purpose is to make long-term evolution observable, measurable, reproducible, and scientifically interpretable.

The central research question is:

> Given a set of general biological and environmental rules, what kinds of adaptive strategies and population dynamics can emerge over many generations?

Avoid predetermined evolutionary progress.

The simulation must be allowed to produce unremarkable outcomes, extinction, coexistence, drift, or evolutionary stagnation.

Unexpected results are valuable only when their underlying causes can be investigated.

---

# 2. Begin with a Scientific and Technical Audit

Before implementation:

1. Inspect the existing repository.
2. Read STAGE 1 and STAGE 2 documentation.
3. Identify the actual implemented genetics, behavior, and ecological mechanics.
4. Review existing test results.
5. Determine whether long-term evolution is currently possible.
6. Identify scientific weaknesses, performance limitations, and misleading metrics.
7. Establish a prioritized implementation plan.
8. Read `docs/STAGE2_REPORT.md`, `docs/VISUAL_SYSTEM.md`, and `docs/ART_DIRECTION.md`; preserve the current appearance, inherited orange/blue palette variations, and rendering contracts.
9. Audit how a second resource, ecological type identity, and corner/lobe inheritance affect sensing, uptake allocation, energy accounting, genome layout, snapshots, metrics, and existing experiment baselines before extending them.

Do not assume all previous milestones were correctly implemented.

Do not rewrite the existing system without evidence that its architecture prevents necessary research capabilities.

Create:

`docs/STAGE3_RESEARCH_AUDIT.md`

The audit must distinguish:

- Verified capabilities
- Scientifically questionable assumptions
- Technical limitations
- Missing research infrastructure
- Proposed improvements

---

# 3. High-Speed Evolution Simulation

One primary objective is to simulate large numbers of generations efficiently.

## 3.1 Headless Execution

Implement or improve a headless simulation mode.

Requirements:

- Run without rendering frames
- Advance deterministic logical simulation steps
- Execute configurable experiment durations
- Support seeded randomness
- Produce measurable results
- Report progress without overwhelming logging
- Support cancellation
- Handle numerical errors gracefully

Do not equate rendering FPS with evolutionary speed.

Do not advance time through arbitrary shortcuts that change ecological dynamics unless explicitly documented and validated.

## 3.2 Simulation Acceleration

Support different execution modes:

- Real-time observation
- Accelerated simulation
- Maximum-throughput headless execution

Maintain the same scientific transition rules across modes unless explicitly testing alternative approximations.

Define benchmarks and compare actual execution throughput.

## 3.3 Generational Measurement

Many organisms may reproduce asynchronously.

Therefore:

- Do not assume every organism belongs to the same synchronized generation.
- Define lineage depth separately from simulation time.
- Track births and deaths independently.
- Define generation-related metrics precisely.
- Consider reporting elapsed simulation time, total births, lineage depth, and estimated generation turnover separately.

If the UI displays a single "Generation" number, document its operational meaning.

---

# 4. Long-Term Simulation Stability

Investigate:

- Uncontrolled population explosions
- Rapid extinction
- Resource monopolization
- Numerical instability
- Excessive genetic convergence
- Mutation-rate sensitivity
- Unbounded memory usage
- Degenerate behavioral strategies
- Unexpected energy accounting
- Simulation-speed-dependent results

Use repeatable tests across multiple random seeds.

Do not interpret all extinction events as defects.

Distinguish ecological extinction from bugs that invalidate the simulation.

When a problem is found, determine whether the cause is:

1. Intentional ecological consequences
2. Parameter sensitivity
3. Modeling limitations
4. Software defects

Do not simply inject extra food or secretly resurrect organisms to force a stable population.

If the application offers an assisted mode with stabilizing interventions, clearly identify it as such.

---

# 5. Environmental Experimentation

Create a general experimental configuration system.

Candidate environmental variables:

- Resource abundance
- Resource regeneration rate
- Spatial distribution of food
- Environmental variability
- Movement costs
- Metabolic constraints
- Habitat size
- Mutation rates
- Environmental disturbances

Prefer variables already supported by the existing engine.

Add new variables only when they serve meaningful experimental questions.

The two-resource, three-type extension in Section 9 is explicitly in scope. Define its equations and experimental questions first; do not introduce additional resources or interactions simply for visual variety.

## Required Experiment Types

### Experiment A — Resource Abundance

Compare populations under plentiful and scarce resources.

Investigate whether differing energy economies and reproductive strategies emerge.

### Experiment B — Spatial Resource Distribution

Compare uniform and clustered resources.

Investigate movement, sensory, and resource-seeking strategies.

### Experiment C — Environmental Change

Allow an environment to change after a specified simulation time.

Investigate whether population traits shift in response.

### Experiment D — Neutral Evolution

Track a selectively neutral heritable marker.

Investigate genetic drift without assuming adaptation.

### Experiment E — Mutation Sensitivity

Compare multiple mutation settings.

Investigate diversity, population stability, and evolutionary responsiveness.

### Experiment F — Control Groups

Run repeated seeded experiments with appropriately matched controls.

Where possible, use paired initial conditions to isolate the effect of one changed parameter.

Do not change multiple uncontrolled variables and then attribute the result to one cause.

### Experiment G — Three-Type Ecology and Morphology Tradeoffs

Run each ecological type alone, each pair, and all three together under documented A-rich, B-rich, and mixed-resource conditions. Compare uniform and spatially differentiated resources where appropriate. Hold total initial population and initial energy budgets comparable, or explicitly report differences and their consequences.

Measure per-type survival, abundance, births/deaths, resource-specific uptake, energy expenditure, the conservative type's corner-count distribution, and the multi-lobed type's lobe-count distribution. Include mutation-disabled controls and separate controlled corner-count and lobe-count comparisons using otherwise matched backgrounds to distinguish inheritance, selection, and drift. Do not change corner count and lobe count together and attribute an effect to one of them.

Predeclare run duration, sampling, extinction criteria, and the operational criterion for persistence/coexistence; use multiple seeds and report the fraction of runs satisfying it. Finite-run persistence is not proof of indefinite stable coexistence. Report exclusion and extinction as valid outcomes. Do not tune on a single attractive run and present it as general evidence.

---

# 6. Experiment Management

Build an experiment runner capable of:

- Defining experiment configurations
- Running repeated trials
- Managing random seeds
- Executing experiments without rendering
- Saving results
- Comparing experimental groups
- Exporting structured data
- Reproducing individual runs

Define an experiment manifest containing:

- Simulation/model version
- Configuration
- Random seed
- Initial conditions or their reproducible description
- Start and stop criteria
- Interventions
- Measurement definitions
- Result metadata
- For the new model: per-type founding counts/genomes, A/B resource settings, type-specific coefficients, corner/lobe expression and mutation rules, and energy-accounting definitions

Version the scientific model separately from purely cosmetic presentation changes where appropriate.

Include a machine-readable export format such as JSON or CSV.

Avoid storing massive per-frame histories by default.

Use configurable sampling intervals.

---

# 7. Evolutionary History and Ancestry

This feature is both scientifically important and central to the user experience.

A user should eventually be able to select a living organism and inspect its lineage.

## 7.1 Genealogical Tracking

Track:

- Unique organism ID
- Parent ID or IDs
- Birth time
- Death time
- Genotype reference or compact genetic record
- Relevant ancestry metadata
- Lineage depth

For asexual reproduction, a tree structure is sufficient.

Do not introduce a complex reproductive graph without a scientific need.

## 7.2 Lineage Visualization

Support exploration of:

- Direct ancestors
- Descendants when recorded
- Lineage branches
- Major inherited trait changes
- Extinct branches
- Surviving branches

Use appropriate sampling or pruning to control memory.

Make clear when historical data has been compressed or discarded.

## 7.3 Ancestor Comparison

Allow comparison between a selected organism and recorded ancestors.

Possible comparisons:

- Body size
- Speed
- Sensory range
- Energy efficiency
- Behavioral parameters
- Genetic differences
- Phenotypic differences

Where data exists, provide a visual preview of ancestors using their recorded traits.

Do not reconstruct missing historical data as though it were observed fact.

---

# 8. Population Genetics and Evolutionary Metrics

Implement scientifically meaningful metrics appropriate to the model.

Candidates include:

- Allele or gene-parameter distributions
- Mean and variance of heritable traits
- Genetic diversity metrics
- Trait frequencies over time
- Lineage survival
- Reproductive success
- Resource use
- Mortality rates
- Population growth and decline
- Behavioral measurements
- Adaptation indicators under defined test conditions

Do not assume a trait increasing in frequency proves natural selection.

Investigate whether changes could arise from:

- Random drift
- Sampling effects
- Direct selection
- Correlated selection
- Environmental change
- Model constraints

Where possible, compare replicated experiments.

Do not use arbitrary percentages as scientific measures without definitions.

---

# 9. Evolutionary Divergence and Species Research

The user is interested in the possible emergence of distinguishable forms of life.

However, the system must not falsely claim biological speciation.

This stage has two distinct concerns: implementing the three designed founder types requested by the user, and investigating subsequent evolutionary change within or among observed populations. Introducing three initial types does not demonstrate that three species evolved from one ancestor.

## 9.1 Classification Research — Lineage Clustering

Investigate practical methods for grouping organisms according to:

- Genetic similarity
- Phenotypic similarity
- Behavior
- Ecological specialization
- Shared ancestry

Such groupings may be called:

- Lineages
- Genetic clusters
- Ecotypes
- Phenotypic groups

Do not automatically label them biological species.

## 9.2 Operational Species Definitions

If implementing a species-like classification:

- Define its criteria.
- Explain its limitations.
- Distinguish classification from reproductive isolation.
- Verify that the categories remain meaningful over time.
- Avoid arbitrary claims based on color or appearance alone.

In an asexual simulation, concepts of species require special care.

## 9.3 Long-Term Research Direction

Investigate whether future systems could support:

- Ecological niche specialization
- Persistent lineage divergence
- Reproductive isolation mechanisms
- Variable body morphology
- Evolvable neural topology
- More complex ecological interactions

Do not implement all advanced features merely to produce a more dramatic demo.

The limited, explicitly requested morphology extension below is required in this stage. Arbitrary body-plan evolution, reproductive isolation, and evolvable neural topology remain future research.

## 9.4 Required Milestone — Three Designed Founder Types

The user wants three recognizably different forms of life with different ecological roles. Use stable, inherited ecological-type identifiers; keep them separate from organism ID, founder ID, lineage depth, and any analytical genetic clustering.

For the first implementation, reproduction is asexual and children inherit their parent's type. Mutations change traits within that type, including corner count for the conservative type and lobe count for the generalist; they do not randomly switch type or turn an oval into a polygon. A change in corner count does not create a new ecological type. Cross-type transformation or naturally emerging new species is outside this milestone.

User-facing names may describe three fictional simulated species if the interface explains that these are designed ecological categories, not evidence of biological speciation. Scientific exports must use the operational type definition. Never infer type from colour, shape, or a clustering result alone.

The agreed visual identities and proposed ecological design are:

| Working type | Visual identity | Ecological role to implement and test | Required tradeoff |
|---|---|---|---|
| Mobile forager | Existing orange–blue oval/bean form | Preferentially exploits resource A; movement can help reach separated patches | Movement and maintenance consume energy; mobility must not guarantee success |
| Conservative grazer | Lower-left concept-art cells: soft blue–green rounded polygon with an evolvable corner count and a dark central energy metaphor; six corners are a reference example, not a fixed requirement | Preferentially exploits resource B, with slower movement and lower maintenance | Lower uptake/turnover or another explicit cost prevents low metabolism from being a free advantage; corner-count effects require the explicit tradeoff in Section 9.6.2 |
| Multi-lobed generalist | Upper-right concept-art cells: smooth connected lobes; pink–orange palette is provisional and replaceable | Can exploit both A and B, with lower resource-specific efficiency than the corresponding specialist under matched conditions | Additional lobes increase potential uptake but also increase maintenance and may reduce mobility |

These roles are the starting model design, not claims about observed adaptation. Choose and document quantitative coefficients through controlled experiments. Type differences must enter actual engine equations; do not merely change animation speed, colour, or narrative labels. Preserve meaningful heritable variation within each type rather than assigning identical fixed behaviours to all its members.

Use inherited controllers for movement and supported decisions. Do not script intentions, route following, or guaranteed resource discovery to make a type appear intelligent. Do not claim a mobility advantage until it has been measured under the relevant resource geometry.

## 9.5 Two Explicit Resources and Consistent Energy Accounting

Start with exactly two resource pools, A and B, on the existing spatial grid. Each needs defined capacity, fertility/spatial distribution, regeneration/influx, initial stock, and energy units. Document whether units are directly comparable and how assimilation converts each resource into reserves.

Define type-specific uptake/assimilation coefficients and a shared per-organism intake budget. A generalist must not receive two unrestricted full intake budgets simply because it can access two resources. Allocate simultaneous requests proportionally or using another documented order-independent rule, including demand from different types and requests sharing an organism's total budget. Never allow negative resources or double consumption.

Decide explicitly how sensors encode A and B. Either provide separate signals or document an affinity-weighted signal and its informational limitations; update controller/genome contracts and tests if inputs change. A new resource must affect real uptake and behaviour through supported data paths, not just background colour.

Extend the energy ledger to include both resource pools, organism reserves, external inputs, regrowth, assimilation losses, metabolism, movement, and birth/body-construction costs. Define terms to avoid double-counting transformation losses. Pay all morphology costs in the engine. Rendering must neither create nor consume energy.

Resource regeneration may depend on documented environmental rules. Do not add hidden type-dependent subsidies, balancing respawns, or automatic population quotas. Predation, photosynthesis, nutrient recycling from corpses, a third resource, and symbiosis are not required and should not be added in this milestone.

Two resources and three types do not guarantee three-way coexistence. Begin with documented spatial resource structure and measured tradeoffs; report exclusion honestly before considering further model complexity.

## 9.6 Heritable Morphology Counts With Functional Consequences

Corner count and lobe count are distinct type-specific traits. Do not reuse one shared count that accidentally couples the two types' configurations, mutation probabilities, physiological effects, or history. Both require actual inheritance, not random per-frame rendering choices.

### 9.6.1 Multi-Lobed Type — Lobe Count

The multi-lobed type must inherit a real morphology trait that affects both rendered lobe count and modeled physiology.

Use a bounded initial range of **3–6 lobes** as the starting design; record the chosen expression and mutation model. This range is provisional for legibility and controlled experimentation, not a claim that these counts are biologically privileged. A minimal implementation may use a directly inherited integer with independent per-birth mutation probability and a ±1 mutation step; document boundary behaviour and expose the settings in experiment configurations. Do not silently reuse a continuous-gene mutation rule if it does not support this contract.

Requirements:

- Offspring normally inherit the parent's count; an enabled lobe mutation changes it by at most one lobe within the documented bounds.
- With mutation disabled, the count is inherited unchanged.
- Increased lobe count raises potential uptake or another explicitly defined benefit, while imposing maintenance/body-construction costs and any declared mobility penalty.
- Control for body size/mass in comparisons. Specify whether extra lobes redistribute a fixed body area or add biomass; charge corresponding costs consistently and avoid counting both the same size benefit and a second unexplained uptake multiplier.
- A single individual does not gain lobes merely by aging, reaching a level, or surviving a fixed number of ticks. Count changes occur across reproduction, inheritance, and mutation.
- Selection may change the population distribution, but the system must not force increasing counts or a particular optimal count. Report drift and boundary effects as alternatives to adaptation.
- Save/restore, ancestry records, ancestor previews, and exports must retain the morphology data needed to reproduce observed differences.

Do not add arbitrary appendages, dense surface holes, compound eyes, or an unbounded morphology genome to satisfy this request.

### 9.6.2 Conservative Type — Corner Count

The blue–green conservative type must inherit a real **corner-count trait**. The concept art establishes its soft polygonal character, not an immutable hexagonal body plan.

Requirements:

- Choose a configurable, bounded integer range during model design, with at least three corners and a modest upper bound that remains readable as a rounded polygon. Document defaults, expression, mutation probability, and boundary behaviour. The user has not selected an exact range; do not present an implementation choice as user approval.
- Children normally inherit their parent's corner count. An enabled corner mutation changes it by at most one corner within the bounds; disabled mutation preserves the count. The starting population may contain multiple corner counts under a reproducible founding configuration; do not lock all descendants to six.
- Define and test a physiological tradeoff for corner count before making adaptation claims. For example, a declared morphology-dependent uptake benefit must be offset by maintenance/construction costs or another explicit disadvantage. The exact relationship is a modeling hypothesis to document and test, not an established biological fact.
- Control for size, mass, body area, and rounding. More corners do not automatically mean more perimeter or greater uptake at fixed body area. Either compute the relevant geometry consistently or explicitly identify the chosen trait-to-physiology relationship as an abstract model rule; do not justify bonuses using false geometric claims or double-count costs.
- Keep the type's low-maintenance strategy meaningful. Do not make a single corner count unconditionally superior through an unpriced benefit, or force more/fewer corners over time to provide a visual progression.
- Corner-count changes occur across reproduction and mutation. An organism does not acquire corners merely by aging, reaching a level, or because the camera zoom changes.
- Render exactly the expressed count as gentle, discernible rounded corners at inspection scale. Level-of-detail simplification at distant zoom must not overwrite or misreport the underlying trait. Keep the polygon visually distinct from the generalist's connected lobes.
- Save/restore, genome/phenotype contracts, ancestry records, ancestor previews, exports, and relevant hashes must preserve the actual corner-count state. Missing historical counts must be marked unavailable rather than guessed.
- Run matched corner-count comparisons, mutation-disabled inheritance checks, bounds/step tests, and population-frequency measurements. Distinguish selection from drift and boundary effects; no particular optimal corner count or sustained coexistence is guaranteed.

## 9.7 Procedural Rendering of All Three Types

Use `docs/concept-art.png` as the shape reference, preserving STAGE 2's warm paper, soft pigment, restrained membrane and dark energy-core visual language.

- Keep the existing oval's inherited orange/blue palette variations.
- Make the blue–green type a rounded polygon whose corner count comes from its expressed heritable trait, not a hardcoded hexagon. It must remain soft rather than an angular crystal or a spiky creature. Its interior rays/details, if retained, must be identified as visual metaphors unless the engine models them.
- Render the multi-lobed type as one connected organism with soft lobes, not several independent organisms or a parent with permanently attached offspring. A single organism contributes one to population counts regardless of its lobes.
- Pink–orange distinguishes the third type; retain subtle inherited colour variation and keep palette selection replaceable without changing ecological rules.
- The number of visible corners for the conservative type and lobes for the generalist must match their respective expressed simulation traits, including the portrait and recorded-ancestor view.
- Shape, scale, energy indicators, selection, sensing overlays, camera following, births/deaths, and reduced-motion behaviour must work for all three types.
- Keep sensing anatomy honest: decorative rays or lobe tips must not imply extra sensors, independent brains, or locomotion mechanics that were not implemented.
- Avoid malformed intersections, sharp protrusions, disturbing dense textures, unreadable small lobes, and excessive visual overlap. Update hit testing to account for displayed silhouettes where necessary without introducing unmodeled collisions.
- Keep rendering read-only and cache immutable geometry/materials. Verify appearance in the actual browser at multiple zoom levels and population sizes.

## 9.8 Required Observation and Research Metrics

Expose total population and per-type population, birth/death rates, mean energy fraction, actual resource-specific uptake, and documented metabolic/movement costs. Distinguish instantaneous values from interval rates and show the relevant units and sample time.

Show A and B availability separately. Allow inspection of each organism's type, lineage, functional traits, and applicable morphology/uptake parameters. Show corner count for conservative individuals and lobe count for generalists, with each population's count frequencies and history separately. Use not-applicable states for types without the corresponding trait. Retain representative ancestry data where storage permits, explicitly marking discarded history.

Keep the ecosystem visually dominant, with progressively disclosed details. Use shape, labels, and text summaries as well as colour. A change in type abundance is an observation; any explanation involving adaptation must refer to controlled evidence.

## 9.9 Model Versioning and Regression Boundaries

The existing single-resource experiments are baselines, not results that can automatically be attributed to the new model. Version the new model, resource schema, genome/controller contracts, and snapshot format where they change.

Preserve a documented route to run the legacy single-resource baseline. When importing old snapshots, either keep legacy semantics or provide an explicit, documented migration with stated defaults and limitations; never silently invent historical type, corner-count, lobe-count, or resource-B observations. Unsupported versions must fail helpfully before replacing a running world.

Within a declared model version, the same seed/config/interventions must reproduce the same trajectory under the documented JS-engine limits. Changed model rules need not reproduce an old version's trajectory, but original baseline tests and their interpretation must remain available. Cosmetic palette changes must not affect scientific state hashes or consume simulation RNG.

## 9.10 Implementation Order and Evidence

1. Audit the existing model, stage documents, and concept art; identify what is already implemented.
2. Write the two-resource equations, three-type tradeoffs, corner/lobe rules, energy ledger, versioning plan, and falsifiable questions into the existing experiment/model documents before changing engine behaviour. Resolve routine coefficient choices with documented reasoning; do not invent user approval for a different scope.
3. Implement a small headless model increment with inheritance, ledger, allocation, reproducibility, and snapshot tests before building new visual forms.
4. Run Experiment G across multiple seeds, recording all outcomes, including exclusion and extinction. Separate designed initial differences from changes caused by subsequent evolution.
5. Implement and inspect all three visual forms, matching actual type/trait data, then add the minimum per-type and resource observations needed to interpret them.
6. Recheck legacy behaviour, accessibility, memory/history bounds, and realistic mixed-population performance; complete remaining Stage 3 research tools incrementally.

The milestone succeeds when three functional types can be introduced, observed, reproduced, and studied honestly. It does not require all three to survive every experiment or require observed speciation. Do not stop after producing three decorative skins, and do not claim this model extension alone completes the rest of STAGE 3.

---

# 10. Emergent Behavior Research

The ultimate ambition is to discover strategies that were not explicitly scripted.

However, emergence must be evaluated carefully.

Possible behaviors of interest:

- Resource-seeking efficiency
- Low-energy survival
- Movement specialization
- Spatial clustering
- Habitat preference
- Risk-sensitive movement
- Alternative reproductive strategies

Do not promise that all these behaviors will occur.

## Required Research Approach

For any claimed emergent behavior:

1. Define the observed pattern.
2. Explain how it was measured.
3. Identify potential causal mechanisms.
4. Compare with appropriate baseline behavior.
5. Test whether the pattern persists across multiple runs.
6. Identify alternative explanations.
7. Report uncertainty.

Do not interpret visually compelling behavior as intentional reasoning.

For example, an organism moving toward food is not necessarily planning.

Do not attribute emotions, intentions, or consciousness to simulated organisms without evidence.

---

# 11. Evolutionary Discovery System

Create a research-oriented event detection system.

This is an important feature, but it must be evidence-driven.

Detect noteworthy changes such as:

- Unusual shifts in trait distributions
- Population crashes
- Extinction
- Rapid lineage expansion
- Genetic diversity changes
- Persistent ecological divergence
- Surprising survival outcomes
- Significant behavioral metric changes

## Scientific Event Records

Each event should contain:

- Event type
- Timestamp or simulation step
- Relevant measured values
- Detection rule
- Affected population or lineage
- Supporting data reference
- Confidence or limitation information where relevant

Avoid invented narratives.

A rule-based explanatory summary is acceptable.

A future creative narration layer may add personality, but it must remain distinguishable from scientific observations.

## Example

Acceptable:

"After the food regeneration rate was reduced, organisms with lower movement-related energy expenditure became more frequent across most replicated runs."

Only when actual experimental data supports it.

Unacceptable:

"The creatures evolved intelligence because they understood the coming famine."

---

# 12. Historical Replay and Time Travel

Investigate how users can revisit prior ecological states.

Possible approaches:

- Periodic snapshots
- Event logs
- Deterministic replay
- Hybrid checkpoint plus replay

Choose based on:

- Accuracy
- Storage cost
- Browser performance
- Reproducibility
- Engineering complexity

Implement an appropriately scoped solution.

A saved population chart is not equivalent to a fully restorable past ecosystem.

Clearly distinguish:

- Statistical history
- Recorded individual history
- Full-state snapshots
- Reconstructed replay

Do not imply a feature supports exact time travel if it only displays summary metrics.

---

# 13. Research Interface

Extend STAGE 2 with appropriate scientific interaction tools.

Possible components:

### Experiment Setup

- Parameters
- Seed
- Initial population
- Experimental conditions
- Control and treatment groups

### Experiment Comparison

- Population trajectories
- Trait changes
- Genetic diversity
- Resource histories
- Outcome distributions

### Lineage Explorer

- Ancestry tree
- Ancestor comparison
- Lineage history

### Evolution Timeline

- Major events
- Environmental interventions
- Population changes
- Recorded snapshots

### Discovery Log

- Measured notable events
- Evidence and metadata
- Links to relevant simulation states

Scientific information should be accessible without overwhelming the primary artistic ecosystem view.

Do not turn the whole application into a generic analytics dashboard.

Use progressively disclosed research controls.

---

# 14. Scientific Visualization Quality

Visualizations must communicate actual data.

Requirements:

- Meaningful axes
- Explicit units
- Clear metric definitions
- Appropriate scales
- Distinction between raw observations and derived metrics
- Proper comparison of experimental conditions
- Clear treatment of uncertainty

For multiple-run experiments, consider displaying distributions or variability rather than only averages.

Do not display decorative graphs that are disconnected from the simulation.

Do not conflate simulation time, wall-clock time, and lineage depth.

---

# 15. Scientific Verification

Implement repeatable validation.

At minimum:

- Inheritance tests
- Mutation tests
- Energy accounting tests
- Reproducibility tests
- Selection experiments
- Neutral drift experiments
- Environmental intervention tests
- Long-term stability tests
- Lineage consistency tests
- Serialization and restoration tests

For research comparisons:

- Use multiple seeds.
- Record exact configurations.
- Document sample sizes.
- Report uncertainty.
- Avoid cherry-picking favorable runs.
- Avoid claiming causation solely from correlation.

Record failures.

A scientifically honest negative result is valuable.

---

# 16. Performance and Resource Budgets

The platform should support accelerated experiments on ordinary desktop hardware.

Measure:

- Simulation steps per second
- Organism updates per second
- Memory usage
- Experiment throughput
- History storage growth
- Runtime across multiple population sizes

Use benchmarks rather than invented performance claims.

Potential optimizations:

- Spatial indexing
- Typed arrays where beneficial
- Reduced allocations
- Batched statistics
- Configurable history sampling
- Web Workers
- Separate headless execution

Prefer deterministic correctness before aggressive optimization.

Benchmark optimization changes against a baseline.

---

# 17. Required Deliverables

Create or update:

`docs/STAGE3_RESEARCH_AUDIT.md`

`docs/EXPERIMENT_DESIGN.md`

`docs/EVOLUTIONARY_METRICS.md`

`docs/LINEAGE_MODEL.md`

`docs/STAGE3_VALIDATION.md`

`docs/STAGE3_REPORT.md`

Implement:

- Accelerated/headless simulation
- Experiment configurations
- Reproducible experiment runner
- Environmental comparison experiments
- Long-term metrics
- Lineage history and exploration
- Evidence-based evolutionary event detection
- Appropriate visualization or data access
- Relevant automated verification
- The three functional ecological types, two-resource model, heritable corner-count and lobe-count traits, and matching renderers specified in Section 9
- Per-type/resource measurements, separate corner/lobe distributions, and executed Experiment G results
- Model/snapshot compatibility handling and documented legacy baselines

Extend the deliverables above and the maintained `docs/EVOLUTION_MODEL.md`, `docs/VISUAL_SYSTEM.md`, and `docs/ART_DIRECTION.md` with the new equations, operational type definitions, phenotype mappings, compatibility policy, and measured results. Do not create duplicate parallel specifications where these documents already cover the topic.

If current architecture makes all deliverables impractical, prioritize scientific correctness and a coherent smaller milestone.

Do not silently omit critical requirements.

---

# 18. Definition of Done

STAGE 3 is complete when:

- [ ] Headless experiments can run independently of rendering.
- [ ] Acceleration preserves documented simulation rules.
- [ ] Experiments are reproducible under defined conditions.
- [ ] Multiple seeded runs can be compared.
- [ ] Meaningful environmental experiments have been executed.
- [ ] Long-term stability has been evaluated.
- [ ] Trait distributions and population dynamics can be measured.
- [ ] Lineages can be recorded and inspected.
- [ ] Scientific events are linked to evidence.
- [ ] Experimental data can be exported.
- [ ] Research visualizations reflect actual measurements.
- [ ] Scientific assumptions and limitations are documented.
- [ ] Major results are supported by executed tests.
- [ ] Existing STAGE 1 and STAGE 2 functionality remains operational.
- [ ] Three designed ecological types have stable inherited identities and actual differences in resource use, metabolism, or survival tradeoffs.
- [ ] Both resource pools participate in sensing/uptake through documented rules, with finite stocks, fair allocation, and a verified combined energy ledger.
- [ ] Multi-lobed offspring inherit lobe count; enabled mutations obey documented bounds/steps, and disabled mutations preserve it.
- [ ] Conservative offspring inherit corner count; enabled mutations obey documented bounds/steps, and disabled mutations preserve it. The type is not fixed to six corners.
- [ ] Lobe count affects modeled benefits and costs; tests and controlled experiments evaluate the tradeoff without forcing an optimum.
- [ ] Corner count has a documented physiological tradeoff, with size/mass and rounding controlled; no automatic geometric advantage or predetermined optimal count is assumed.
- [ ] All three concept-art-derived forms render correctly, including variable-corner blue–green polygons and provisional pink–orange multi-lobed cells; visible corner/lobe counts match simulation data.
- [ ] Per-type population/resource use and separate corner-count/lobe-count distributions are observable and exportable.
- [ ] Single-type, pairwise, and three-type experiments have been executed across multiple seeds, with persistence/exclusion criteria and negative results reported.
- [ ] Model/snapshot versioning and the legacy-baseline route are documented and tested; no historical observations are fabricated by migration.
- [ ] The three forms have been visually inspected in a browser where available, and mixed-population performance has been measured.

The bounded heritable corner-count and lobe-count models above ARE required. Arbitrary body-plan evolution, natural emergence of three species from one ancestor, reproductive isolation, and genuine open-ended evolution are NOT required for completion. Sustained three-way coexistence is a research outcome to evaluate, not a guaranteed acceptance criterion.

---

# 19. Execution Protocol

This is a high-reasoning stage.

Prioritize scientific modeling, experiment design, correctness, and evidence.

Avoid spending expensive reasoning on decorative UI details.

Inspect the existing codebase first.

Preserve valid previous work.

Implement incrementally.

Do not proceed to STAGE 4.

If the implementation budget is constrained, prioritize:

1. Correct reproducible headless experiments
2. Two-resource accounting, three functional types, and heritable corner-count/lobe-count correctness
3. Controlled multi-type and separate corner/lobe experiments with reliable per-type long-term metrics
4. All three accurate visual forms and essential observation tools
5. Environmental comparisons and ancestry tracking
6. Evidence-driven event detection and further research interface enhancements

The explicit three-type milestone must not be silently deferred as optional cosmetic work. If it cannot be finished, state the precise remaining requirements and report STAGE 3 as incomplete. Do not expand into predation or open-ended morphology to compensate for unfinished agreed features.

If a feature is incomplete, report it honestly instead of replacing it with fabricated functionality.

At completion, report in Traditional Chinese (Taiwan):

1. Completed research capabilities
2. Experiment results
3. Evidence of genuine evolutionary dynamics
4. Unexpected findings
5. Scientific limitations
6. Performance results
7. Remaining research opportunities
8. Handoff instructions for STAGE 4

**Final mission: Make EVOLUTION MACHINE a system in which unexpected evolutionary discoveries are possible, observable, and scientifically investigable.**
