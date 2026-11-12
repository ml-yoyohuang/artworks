# EVOLUTION MACHINE
## STAGE 1 — Artificial Life Research & Evolution Engine
### Mission Brief for Claude Code / Fable

You are the **Chief Artificial Life Researcher, Evolutionary Systems Architect, and Principal Engineer** of this project.

Your assignment is to design and implement the scientific and computational foundation of **EVOLUTION MACHINE**, an ambitious browser-based artificial life simulation and interactive generative art project.

This is not a conventional game, a screensaver, or a decorative animation.

The ultimate ambition is to create a digital ecosystem in which simple organisms can reproduce, inherit genes, mutate, compete for resources, adapt to environmental pressures, and potentially produce emergent behaviors that were never explicitly scripted by the developer.

The system must be genuinely functional, scientifically coherent within its declared simplifications, computationally efficient, and extensible.

**Your intelligence is expensive. Use it where advanced reasoning actually matters.**

---

# 0. Project Philosophy

The creator is an experienced front-end engineer with a strong interest in:

- Artificial life and emergent systems
- Generative art, shaders, and creative coding
- Beautiful interactive digital experiments
- Surreal, imaginative, and unexpected experiences
- Highly polished visual design
- Playful, strange, and occasionally absurd creations
- Systems capable of producing results their creators did not predict

The creator particularly enjoys observing autonomous systems over long periods.

The intended experience is:

> I introduce a tiny living organism into a beautiful artificial environment.
>
> I change the conditions under which it lives.
>
> I observe generations of descendants adapting, competing, surviving, and sometimes becoming extinct.
>
> Eventually, I witness patterns or strategies that I did not directly design.

The creator must feel like both a scientific researcher and a curious visitor to an impossible natural history museum.

This project must balance three pillars:

1. **Scientific integrity:** The simulation must implement genuine heritable variation and differential reproductive success.
2. **Emergent possibility:** New behaviors should arise from interactions among general rules, rather than a library of scripted events.
3. **Artistic excellence:** The finished experience must be visually extraordinary, imaginative, polished, and enjoyable to observe.

Scientific integrity takes priority over visually impressive but misleading claims.

---

# 1. Your Responsibilities

Your highest-priority tasks are:

1. Investigate suitable artificial-life and evolutionary-computation approaches.
2. Select an appropriately scoped model for a browser-based MVP.
3. Design a coherent genotype-to-phenotype architecture.
4. Design organism perception, behavioral decision-making, and energy economics.
5. Design mutation, inheritance, selection, reproduction, and mortality.
6. Define the environmental rules and ecological feedback loops.
7. Implement a deterministic, testable simulation core.
8. Establish scientific validation and experimental controls.
9. Document how the system can eventually support more sophisticated evolution.

Use your strongest reasoning for biological abstractions, simulation architecture, evolutionary dynamics, algorithmic tradeoffs, and verification.

Do not spend extensive high-level reasoning on routine UI development, CSS, decorative components, or boilerplate.

---

# 2. Essential Scientific Requirements

## 2.1 Real Evolution, Not Fake Evolution

The simulation must contain:

- Heritable genetic information
- Genetic variation introduced through mutation
- Phenotypic differences influenced by genetic information
- Environmental interactions
- Differential survival and reproductive success
- Population-level genetic changes across generations

Do not simulate evolution by periodically replacing organisms with arbitrarily stronger or prettier variants.

Do not hardcode an evolutionary sequence such as:

Generation 1: slow organisms  
Generation 100: fast organisms  
Generation 500: intelligent organisms

Such staged progression is unacceptable.

Emergent adaptations must be outcomes of the simulation.

## 2.2 No Guaranteed Intelligence

Evolution is not a predetermined march toward intelligence, complexity, speed, or beauty.

It is acceptable for:

- A lineage to become simpler
- A trait to disappear
- A population to become extinct
- Multiple strategies to coexist
- A previously successful strategy to fail after environmental change
- Evolutionary change to stall
- A population to exhibit genetic drift without clear adaptation

Do not guarantee increasingly complex behavior.

An honest but surprising simulation is more valuable than a dramatic but fabricated one.

## 2.3 Evolutionary Constraints

Implement meaningful tradeoffs.

Examples:

- Faster movement consumes more energy.
- Greater sensory range increases metabolic cost.
- Larger bodies require more energy to maintain.
- Reproduction competes with survival for resources.
- Expensive neural processing should have an appropriate cost, if modeled.
- Aggressive resource acquisition may expose organisms to ecological risks.

Avoid a system in which organisms simply evolve all traits toward their maximum values.

Also avoid excessive arbitrary penalties that make adaptation impossible.

The system should make multiple viable strategies possible under appropriate conditions.

---

# 3. Proposed MVP Scope

For the first milestone, create a **2D, browser-based artificial ecosystem**.

The visual environment will eventually resemble a beautifully designed microscopic observation chamber.

However, the simulation engine must not depend on the rendering layer.

Initial MVP capabilities:

### Organisms

Each organism should possess:

- A unique ID
- A genetic representation
- A phenotype derived from its genotype
- An energy reserve
- An age and lifecycle state
- Position and movement state
- Sensory input
- A behavioral controller
- A lineage reference
- Reproductive capability
- A death condition

### Heritable Traits

Suggested initial traits:

- Body size
- Maximum locomotion speed
- Sensory range
- Metabolic efficiency
- Reproduction threshold
- Energy allocation parameters
- Behavioral controller parameters

These are starting candidates, not mandatory final decisions.

You must evaluate which traits produce meaningful evolutionary dynamics and which introduce unnecessary complexity.

### Behavior

Organisms should be capable of perceiving nearby environmental information and selecting actions.

Possible actions include:

- Movement
- Direction change
- Resource consumption
- Reproduction when eligible
- Inactivity or reduced activity

Avoid directly scripting sophisticated behaviors such as predator avoidance, cooperative hunting, or territorial defense.

If such behaviors are supported in future stages, they should arise from the general perception-action framework.

### Environment

Implement:

- A bounded 2D space
- Spatially distributed renewable food or energy resources
- Resource consumption
- Resource regeneration with finite limits
- Organism energy expenditure
- Reproduction
- Death
- Population statistics

Start with one resource type and one general organism architecture.

Do not introduce multiple trophic levels, elaborate predation, sexual reproduction, or dynamic body morphology unless the initial system is already robust and an extension is clearly justified.

### Behavioral Intelligence

Investigate whether a compact evolvable neural network is the best MVP choice.

Possible starting architecture:

- Small fixed-topology feed-forward neural network
- Environmental sensors as inputs
- Movement controls as outputs
- Inheritable weights and biases
- Mutation of parameters during reproduction

The network must be computationally inexpensive enough for many organisms.

If a simpler controller would produce a better and more testable MVP, explain that tradeoff and recommend it.

Do not introduce large language models into organism behavior.

**The organisms must operate entirely offline without per-organism AI API calls.**

---

# 4. Genotype and Phenotype

Establish a clear distinction among:

- Genotype
- Phenotype
- Internal physiological state
- Behavioral controller
- Environment
- Fitness-related outcomes

The architecture should support adding genes without tightly coupling unrelated simulation components.

Mutation operators must be explicit, documented, bounded where appropriate, and testable.

Decide whether the MVP should use asexual reproduction.

Asexual reproduction is preferred unless a convincing research reason supports something more complex.

Keep a lineage record sufficient to study ancestry without storing unlimited redundant state.

Do not assume that mutation automatically improves fitness.

Avoid explicitly optimizing toward a developer-defined universal fitness score if ecological reproductive success can provide the selection mechanism.

---

# 5. Simulation Architecture

The simulation must support:

- Fixed logical time steps
- Seeded pseudorandomness
- Reproducible experiments under defined conditions
- Clear separation of simulation state from rendering state
- Headless execution
- Pause and resume
- Variable execution speed
- Saving and restoring simulation state
- Population and environmental metrics
- Bounded memory use
- Controlled computational complexity

Propose appropriate technology choices.

TypeScript is preferred for maintainability and integration with future browser interfaces.

The rendering system may later use Canvas, WebGL, PixiJS, or custom shaders. Do not couple the simulation to a particular renderer.

Use a spatial indexing strategy if needed for scalable local sensing and interactions.

Avoid premature optimization, but define performance budgets and benchmark real workloads.

A default population in the low hundreds is sufficient for the initial MVP if it allows meaningful experiments.

---

# 6. Evolutionary Research and Validation

This is among your most important responsibilities.

**A working animation is not proof of evolution.**

Develop automated experiments that help determine whether the system exhibits meaningful evolutionary dynamics.

At minimum, design tests for:

### Test A — Inheritance

Verify offspring inherit expected genetic characteristics from parents.

### Test B — Mutation

Verify mutations occur at the intended frequency and within specified rules.

### Test C — Reproduction and Mortality

Verify finite energy and resource constraints affect survival and reproductive success.

### Test D — Natural Selection

Under a deliberately constructed environmental pressure, test whether an advantageous heritable trait tends to increase in frequency across repeated seeded experiments.

### Test E — Genetic Drift

Create a neutral-trait experiment and inspect whether frequencies fluctuate without consistent directional selection.

### Test F — Environmental Change

Alter an environmental parameter and observe whether previously advantageous strategies remain successful.

### Test G — Reproducibility

Run the same seed and parameters twice and compare outcomes.

### Test H — Stability

Run extended headless simulations and inspect:

- Population explosions
- Unexpected extinction
- NaN or Infinity values
- Energy creation bugs
- Excessive memory growth
- Numerical instability
- Event-loop or lifecycle defects

Record actual results, not merely whether the program ran.

Use multiple seeds where appropriate.

A failed hypothesis or extinction event is a valid research result. It is not necessarily a software defect.

Do not invent successful experimental outcomes.

Distinguish:

1. Verified properties
2. Observed empirical behavior
3. Hypotheses
4. Unimplemented future possibilities

---

# 7. Scientific Observability

The future interface should help the creator understand what is happening.

Design data access for:

- Current population
- Births and deaths
- Population history
- Mean trait values
- Trait distributions
- Genetic diversity proxies
- Energy distribution
- Resource availability
- Generational turnover
- Lineage information
- Extinction events
- Changes following environmental interventions

Do not treat chronological simulation time as equivalent to generations.

Generations may overlap.

For each relevant metric, define exactly what is being measured.

Do not label arbitrary visual differences as speciation.

If speciation or species clustering is implemented later, define operational criteria and limitations.

---

# 8. Artistic Direction

The final product must reach an exceptionally high aesthetic standard.

Think of:

- A prestigious interactive science museum
- An experimental art installation
- A beautiful fictional microscopic instrument
- A small impossible world that feels alive

Avoid:

- Generic developer dashboards
- Default admin templates
- Bootstrap-like layouts
- Generic particle effects
- Unrefined neon sci-fi clichés
- Plain circles with eyes as the final organism design
- Arbitrary glow applied to everything
- Dense data tables dominating the experience
- Visually noisy interfaces
- Decorative animations unrelated to simulation data

## Desired Experience

The central ecosystem is the hero.

Organisms should eventually have distinctive silhouettes, elegant movement, subtle material qualities, and visually meaningful differences.

The observation environment should feel contemplative, surprising, and beautiful.

Visual diversity should ideally express underlying phenotypic diversity, rather than random cosmetic variation disconnected from genotype.

A user should be able to:

- Watch the ecosystem as a living artwork
- Inspect organisms as a researcher
- Intervene as an experimenter

These three experiences should coexist without overwhelming one another.

## Important Boundary

For STAGE 1, define the visual direction and data contracts, but do not spend substantial implementation effort creating production-grade visual assets.

The advanced scientific engine comes first.

However, implement a simple diagnostic visualization if useful for development and testing.

---

# 9. Long-Term Evolutionary Possibilities

The architecture should leave room for future expansion, including:

- More sophisticated neural controllers
- Predation and trophic relationships
- Environmental gradients
- Seasonal changes
- Spatial ecological niches
- Energy specialization
- Mutation of neural-network topology
- Heritable body morphology
- More complex movement mechanics
- Lineage trees
- Long-term evolutionary archives
- Experimental comparison between ecosystems
- Exportable scientific visualizations

These are **future research directions, not STAGE 1 requirements**.

Do not build unnecessary abstraction layers merely because these features might exist someday.

Avoid a speculative mega-architecture.

Favor a robust minimal core with clear extension points.

---

# 10. Deliverables

Produce the following artifacts in the repository.

### A. Research and Architecture

`docs/RESEARCH.md`

Explain:

- Approaches considered
- Recommended simulation model
- Major assumptions
- Scientific limitations
- Key design tradeoffs
- References, when available

`docs/ARCHITECTURE.md`

Explain:

- Component boundaries
- Genetic representation
- Organism lifecycle
- Behavioral computation
- Environmental update order
- Simulation clock
- Randomness and reproducibility
- Data flow
- Extension strategy

### B. Evolutionary Rules

`docs/EVOLUTION_MODEL.md`

Document the actual implemented equations and rules.

Include:

- Energy accounting
- Resource regeneration
- Trait expression
- Mutation
- Reproduction
- Mortality
- Relevant tradeoffs

### C. Working Simulation

Implement an executable simulation core.

Include:

- Example experiment configuration
- Seeded experiment runner
- Browser-compatible API
- Minimal diagnostic visualization or development interface
- Save and restore functionality, where practical within the milestone

### D. Automated Verification

Implement unit tests, integration tests, and reproducible headless experiments.

`docs/EXPERIMENTS.md`

Record:

- Tested hypotheses
- Experiment configurations
- Number of seeds or repetitions
- Metrics
- Observed outcomes
- Limitations
- Unexpected findings

### E. Handoff

`docs/HANDOFF.md`

Document:

- What is complete
- What remains incomplete
- Verified behavior
- Known limitations
- How to run experiments
- How to build the artistic interface in STAGE 2
- Which work can safely be assigned to a less expensive coding model

---

# 11. Development Protocol — Extremely Important

You are running under a costly, limited usage budget.

Efficiency is mandatory.

## Before Coding

1. Inspect the existing project structure.
2. Identify any reusable code.
3. Make the major research and architecture decisions.
4. Write a concise implementation plan.
5. Begin STAGE 1 implementation.

Do not spend excessive tokens repeatedly explaining your plan.

## During Coding

- Prefer targeted file reads over repeatedly loading the entire repository.
- Avoid excessive repetitive status messages.
- Keep documentation concise but accurate.
- Reuse established libraries where they materially reduce work.
- Prefer small, testable modules.
- Avoid speculative refactors.
- Do not expand scope without a compelling reason.
- Do not repeatedly rewrite the same code for purely stylistic reasons.
- Do not claim tests passed unless executed.
- If tools or runtime limitations prevent verification, state that clearly.

## Division of Labor

Reserve your most advanced reasoning for:

- Evolutionary system design
- Mathematical and algorithmic correctness
- Behavioral control
- Ecological dynamics
- Scientific test design
- Difficult architectural choices
- Investigation of unexpected simulation outcomes

Routine UI implementation, styling, and repetitive engineering can be delegated to other models in later stages.

## Stop Conditions

Do not autonomously proceed through all four project stages.

Your current authorization covers **STAGE 1 only**.

Complete the scientific foundation, necessary code, tests, and handoff documentation.

Stop at a stable, independently verifiable checkpoint.

Do not begin the full artistic interface, large content expansion, or advanced morphology simulation.

If the scope exceeds the available execution budget, prioritize:

1. Valid simulation model
2. Reproducible functioning implementation
3. Critical automated tests
4. Experimental observations
5. Documentation

Preserve a usable partial result rather than an impressive but unfinished architecture.

---

# 12. Definition of Done — STAGE 1

STAGE 1 is complete only when:

- [ ] Organisms exist as independently simulated entities.
- [ ] Organisms consume finite energy and resources.
- [ ] Organisms can reproduce and die.
- [ ] Genotypes are inherited and can mutate.
- [ ] Genotype affects actual simulation behavior or survival-relevant phenotype.
- [ ] Behavioral decisions are computed by a general controller rather than hardcoded creature stories.
- [ ] Meaningful ecological tradeoffs exist.
- [ ] Headless experiments can execute.
- [ ] Reproducibility is tested.
- [ ] Scientific metrics can be collected.
- [ ] Natural-selection experiments have been executed and their real results documented.
- [ ] Basic automated tests pass, or unresolved failures are clearly reported.
- [ ] The simulation can run with minimal visualization or diagnostic inspection.
- [ ] The project is ready for another AI engineer to continue STAGE 2.

Do not call STAGE 1 complete if essential scientific tests are missing.

---

# 13. Final Instructions

You have substantial freedom to improve the proposed model.

The requirements describe the project goals, not an obligation to adopt every proposed implementation detail.

If you discover a more elegant, computationally efficient, or scientifically coherent approach, use it and explain your reasoning.

Prioritize **genuine emergence over simulated spectacle**.

Prioritize **measurable evolution over claims of intelligence**.

Prioritize **a working, extensible simulation over an overengineered prototype**.

Most importantly:

> Build a small world whose rules are simple enough to understand, but whose possible futures are difficult to predict.

Begin the research, architectural design, and STAGE 1 implementation now.

Do not ask for confirmation on routine technical decisions. Make well-reasoned choices, document assumptions, and proceed.

**End the task after STAGE 1, with an honest completion report and a handoff for subsequent development.**


## Communication & Token Efficiency

- Use English for code, technical documentation, identifiers, and internal project specifications.
- Communicate with me in Traditional Chinese (Taiwan).
- Keep progress reports concise and focus on important decisions, discoveries, blockers, and verified results.
- Avoid repeating requirements or generating lengthy explanations unless necessary.
- Prioritize implementation, verification, and useful artifacts over verbose commentary.
- Do not sacrifice scientific rigor, code quality, or essential testing merely to reduce token usage.