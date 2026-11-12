# EVOLUTION MACHINE
## STAGE 2 — The Living Museum
### Art Direction, Procedural Organisms & Interactive Ecosystem

**Role:** Principal Creative Technologist, Generative Art Director, Front-end Architect, and Interaction Designer

**Mission:** Transform the existing artificial-life simulation into a beautiful, legible, emotionally engaging, interactive ecosystem without compromising the scientific integrity of the underlying simulation.

This document is a standalone specification for STAGE 2. Read the existing repository and its documentation before implementation.

**Important: STAGE 2 may already be partially or substantially implemented. Do not restart, overwrite, or unnecessarily redesign existing work.**

---

# 1. Project Identity

EVOLUTION MACHINE is a browser-based artificial-life simulation.

Its organisms possess heritable genetic characteristics, consume resources, behave autonomously, reproduce, mutate, compete, and die.

The project is intended to combine:

1. Genuine evolutionary computation
2. Interactive generative art
3. A beautiful miniature living world
4. Scientific observation and exploration

The final experience should feel like a world-class interactive artwork or miniature digital natural-history museum.

It must be visually extraordinary, but its underlying behavior must remain authentic.

**Central artistic ambition:**

> Make a living ecosystem so beautiful and fascinating that the visitor wants to leave it running and observe it for hours.

---

# 2. First Task — Audit Existing STAGE 2 Work

Before modifying code:

1. Inspect the current repository and project documentation.
2. Identify completed STAGE 1 and STAGE 2 capabilities.
3. Examine existing rendering, UI, simulation integration, and visual assets.
4. Identify the current art direction and its implementation maturity.
5. Run the project and inspect the actual rendered result if browser execution is available.
6. Identify incomplete requirements, visual inconsistencies, technical problems, and scientific misrepresentations.

Classify findings as:

- Complete and verified
- Present but incomplete
- Missing
- Incorrect or misleading
- Unable to verify

Preserve working features.

Do not implement features twice.

Do not replace established art direction merely because you prefer another aesthetic.

If the selected art direction is undocumented, derive it from existing project materials and supplied concept art. Explicitly report remaining uncertainty rather than inventing user approval.

Create or update:

`docs/STAGE2_AUDIT.md`

After auditing, implement only the missing or substantially deficient parts of STAGE 2.

---

# 3. Art Direction — Critical

The creator has explored several visual approaches.

The preferred directions are:

### A. Flat Color × Geometric Life

- Crisp, readable silhouettes
- Elegant geometric or biomorphic structures
- Sophisticated flat-color composition
- Clear individual differences
- Expressive but restrained motion

### B. Translucency × Soft Gradients × Bioluminescence

- Graceful translucent membranes
- Soft, controlled gradients
- Subtle bioluminescence
- Floating and swimming movement
- Dreamlike microscopic atmosphere

### C. Scientific Microscopy × Beautiful Realism

- Naturalistic microscopic materials
- Optical depth and gentle illumination
- Plausible but fictional microorganisms
- Scientific wonder rather than biological horror

### D. Pixel Ecosystem × Retro Handheld

- Genuine pixel-grid-based rendering
- Consistent low-resolution artwork
- Limited, coherent color palettes
- Charming retro game aesthetics
- Pixel-perfect nearest-neighbor scaling

If the chosen direction is D, **do not use irregular pixel sizes, soft pixel edges, inconsistent grids, or artificial pixelation filters as substitutes for true pixel art**.

## 3.1 Style Selection Policy

Use the user's explicitly selected style if documented.

If the existing implementation has a coherent direction, retain it unless it violates the established requirements.

Do not arbitrarily combine all four styles.

If no style has been selected, implement a provisional and replaceable style layer, favoring elegant geometric silhouettes with restrained gradients and translucency.

Do not spend substantial effort implementing four complete alternative rendering engines.

## 3.2 Strong Aesthetic Restrictions

The creator dislikes disturbing alien-horror imagery and visual patterns that trigger trypophobia.

Avoid:

- Xenomorph-like creatures
- Horror-oriented anatomy
- Parasitic imagery
- Dense clusters of pores or holes
- Excessive compound eyes
- Protruding organic nodules
- Unpleasant repetitive cellular textures
- Grotesque body distortion
- Slimy or diseased-looking surfaces
- Disturbingly realistic insect anatomy

Instead, prioritize:

- Friendly or intriguing silhouettes
- Smooth, elegant form transitions
- Clear visual breathing room
- Harmonious color relationships
- Delicate movement
- Gentle visual hierarchy
- Charming individuality
- Scientific wonder and playfulness

Organisms do not all need faces.

A creature can feel alive through posture, timing, movement, asymmetry, and environmental response.

Avoid making every organism into an identical round mascot.

---

# 4. Procedural Organism Design

This is one of the most important tasks.

Organisms must be visually generated from actual simulation data.

They should not simply be arbitrary sprites with unrelated random appearances.

Design a rendering pipeline such as:

Genotype → Phenotype → Visual Parameters → Geometry / Materials / Animation

Keep rendering completely separate from simulation logic.

## 4.1 Visual Parameters

Candidate visual attributes include:

- Body length and width
- Silhouette
- Color palette
- Fin or membrane proportions
- Symmetry
- Surface markings
- Transparency
- Visual motion amplitude
- Characteristic movement rhythm

Use meaningful mappings where supported by actual genotype or phenotype.

Distinguish:

- Heritable functional traits
- Heritable neutral decorative traits
- Temporary physiological state
- Purely presentational effects

Do not present random decorative variations as evolutionary adaptations.

## 4.2 Visual Inheritance

Where applicable:

- Children should resemble their parents.
- Mutations may cause subtle visible differences.
- Related lineages should be visually recognizable.
- Large changes should reflect the implemented mutation model.
- Cosmetic traits must not imply unimplemented biological capabilities.

For example, do not visually depict an organism suddenly growing functional wings if the simulation does not model wings or their locomotion consequences.

Visual metaphor is permitted when clearly separated from biological claims.

## 4.3 Procedural Shape Quality

Implement constraints preventing:

- Self-intersecting malformed silhouettes
- Extreme deformation
- Excessively sharp appendages
- Unreadable tiny details
- Disproportionate visual overlap
- Disturbing clustering
- Abrupt animation discontinuities

Variation must remain expressive without destroying artistic coherence.

---

# 5. The Living Ecosystem

The ecosystem is the primary visual focus.

It should dominate the experience.

The interface must not look like a conventional administrative dashboard.

Design a compelling observation environment with:

- Clearly defined simulation space
- Beautiful background composition
- Organisms at multiple visual scales
- Environmental resources
- Subtle spatial depth
- Restrained ambient motion
- Legible interaction feedback

All decorative environmental features must remain visually subordinate to the organisms.

Where possible, environmental changes should have observable consequences.

Examples:

- Scarce resources alter movement and population patterns.
- Population growth increases crowding.
- Environmental changes alter measurable conditions.
- Extinction produces genuine absence.

Do not fake ecological responses solely through animation.

---

# 6. Animation and Life-Like Behavior

The organisms should feel alive rather than mechanically translated across the screen.

Explore:

- Gentle body deformation
- Breathing-like or swimming-like visual motion
- Acceleration and deceleration
- Orientation changes
- Subtle secondary movement
- Different movement signatures
- Smooth interpolation of simulation state

Visual motion must reflect real movement and behavior.

Do not add decorative motion that falsely implies a behavior the simulation does not have.

The system should remain comfortable to observe for extended periods.

Avoid constant shaking, flashing, excessive movement, or intense visual noise.

Respect reduced-motion preferences where practical.

---

# 7. Observation Interface

The user should be able to enjoy the ecosystem without constantly interacting with controls.

Prioritize three modes of engagement:

## 7.1 Observe

A clean, immersive view.

Requirements:

- Large ecosystem viewport
- Minimal interface obstruction
- Pause and resume
- Simulation-speed control
- Clear population status
- Optional fullscreen or immersive mode

## 7.2 Inspect

Select an individual organism.

Display:

- Organism ID
- Age
- Energy
- Relevant phenotype
- Available genetic traits
- Parent or lineage information
- Current behavioral state, if available
- Other scientifically supported details

Highlight the selected organism without altering its behavior.

Do not invent thoughts, intentions, or emotions as factual simulation data.

## 7.3 Analyze

Present relevant ecosystem statistics, such as:

- Population
- Births and deaths
- Trait distributions
- Resource availability
- Energy distribution
- Population history
- Genetic diversity indicators

Provide metric definitions and appropriate units.

Use visually elegant data presentation.

Do not display scientifically unsupported values merely to make the interface appear sophisticated.

Do not invent species counts if the simulation has no operational species definition.

---

# 8. Environmental Interaction

Provide interactions supported by the actual engine.

Candidate controls:

- Food/resource abundance
- Resource regeneration
- Environmental conditions
- Mutation rate, if exposed as an experimental parameter
- Simulation speed
- Random seed
- Experiment reset

Separate:

1. Parameters modified before an experiment
2. Interventions applied during a running experiment

Record interventions where necessary for reproducibility.

Warn the user before destructive resets.

Do not introduce an environmental control unless its effect is actually implemented.

---

# 9. Performance Architecture

Target responsive desktop-browser execution.

Recommended principles:

- Separate simulation updates from rendering.
- Use fixed-step simulation updates.
- Interpolate visual movement where appropriate.
- Consider Canvas or WebGL depending on actual needs.
- Avoid per-organism DOM nodes if this becomes a performance bottleneck.
- Avoid creating excessive allocations during every frame.
- Benchmark performance with realistic populations.

Test multiple population sizes and document observed performance.

Consider pausing or reducing rendering work when the page is not visible, while clearly defining what happens to simulation time.

Do not silently change the scientific simulation just to improve visual frame rate.

---

# 10. Quality and Accessibility

Provide:

- Clear interaction hierarchy
- Readable controls
- Keyboard operation for primary UI functions
- Visible focus indicators
- Accessible labels
- Reasonable contrast
- Reduced-motion support where applicable
- Graceful behavior on smaller screens
- Helpful error and empty states

The simulation visualization itself may not be completely accessible through conventional techniques.

Provide meaningful text-based alternatives for core observable state and major controls.

Avoid making scientific information understandable only through color.

---

# 11. Required Deliverables

Create or update:

- `docs/STAGE2_AUDIT.md`
- `docs/ART_DIRECTION.md`
- `docs/VISUAL_SYSTEM.md`
- `docs/STAGE2_REPORT.md`

Implement the required rendering and interaction code using the existing repository architecture.

Document:

- Current visual approach
- Simulation-to-rendering data contracts
- Procedural organism design
- Implemented interactions
- Accessibility considerations
- Performance measurements
- Known limitations
- Recommended STAGE 3 integration points

Do not create redundant documents where equivalent maintained documentation already exists.

---

# 12. Acceptance Criteria

STAGE 2 is complete when:

- [ ] The ecosystem is genuinely driven by the simulation.
- [ ] The visual direction is consistent and intentional.
- [ ] Organisms are visually distinct and appealing.
- [ ] Heritable visual traits are grounded in implemented data.
- [ ] Movement reflects simulation behavior.
- [ ] The simulation can be paused, resumed, and observed.
- [ ] Individual organisms can be inspected.
- [ ] Essential ecosystem statistics are available.
- [ ] Interface interactions function correctly.
- [ ] Basic accessibility is addressed.
- [ ] Performance has been measured.
- [ ] No disturbing or trypophobia-inducing visual patterns are intentionally introduced.
- [ ] The actual application has been visually inspected if a browser is available.
- [ ] STAGE 1 scientific behavior remains intact.

If browser inspection is unavailable, explicitly report that limitation.

Do not claim artistic excellence has been verified solely because the code compiles.

---

# 13. Execution and Budget Rules

Use the existing project rather than rebuilding it.

Work incrementally.

Avoid unnecessary dependencies, speculative refactors, and repeated full-repository inspection.

Do not spend expensive reasoning cycles on routine CSS work.

Do not advance to STAGE 3.

If the visual implementation already meets most requirements, focus on the remaining gaps.

Prefer completing a smaller number of high-quality features over creating many unfinished visual experiments.

At completion, report in Traditional Chinese (Taiwan):

1. What already existed
2. What you changed
3. What was verified
4. What remains incomplete
5. How to run and inspect the result
6. Recommended next steps

**Final goal: Create an artificial ecosystem that is both scientifically credible and genuinely delightful to observe.**