# EVOLUTION MACHINE
## STAGE 4 — The Living Artwork
### Art Direction Refinement, Interaction, Sound & Final Quality

**Role:** World-Class Creative Director, Interactive Art Director, Generative Art Engineer, Sound Experience Designer, UX Architect, and Quality Lead

**Primary mission:** Elevate the existing EVOLUTION MACHINE into an exceptionally polished, emotionally engaging, scientifically honest interactive artwork.

STAGE 4 is not primarily about adding more scientific systems.

It is about bringing the existing science, visuals, interactions, sound, and storytelling into one coherent experience.

**The final result should feel like an artwork worth returning to, not merely a completed software project.**

---

# 1. Project Context

EVOLUTION MACHINE is a browser-based artificial-life experience.

Its foundation includes:

- Evolutionary organisms
- Heritable traits and mutation
- Environmental resources
- Autonomous behavior
- Reproduction and mortality
- Long-term experimentation
- Lineage history
- Scientific observation tools
- Procedural visual rendering

The creator values:

- Exceptional aesthetic quality
- Beautiful and imaginative visual worlds
- Charming or fascinating artificial creatures
- Generative art
- Carefully designed interactions
- Unexpected discoveries
- Playful and occasionally absurd details
- Strong conceptual coherence

The creator wants to observe the ecosystem for long periods.

The project must support that behavior.

---

# 2. Core Artistic Vision

The ultimate experience should combine:

**A beautiful living diorama**

with

**A serious artificial-life laboratory**

and

**The emotional curiosity of observing an unfamiliar miniature world.**

The user should be able to appreciate it on several levels:

1. As a visually beautiful artwork
2. As an interactive digital toy
3. As an autonomous ecosystem
4. As a scientific exploration tool
5. As a collection of unexpected evolutionary histories

The experience should reward curiosity without requiring constant interaction.

---

# 3. First Task — Inspect the Actual Application

Before making changes:

1. Read existing project documentation.
2. Inspect STAGE 1, 2, and 3 functionality.
3. Launch the application.
4. Inspect the actual rendered interface.
5. Observe organisms moving.
6. Inspect populated and sparse environments.
7. Test organism selection and scientific panels.
8. Test environmental controls.
9. Observe accelerated simulation.
10. Inspect the interface at different viewport sizes.

If browser execution is available, capture screenshots or equivalent visual evidence.

Evaluate actual behavior, not merely source code.

If browser inspection is unavailable, explicitly state the limitation and do not claim full visual verification.

Create:

`docs/STAGE4_AUDIT.md`

Classify findings by:

- Severity
- User impact
- Artistic impact
- Technical risk
- Estimated implementation cost

Fix critical problems before adding optional enhancements.

---

# 4. Visual Art Direction Refinement

Respect the art direction chosen in previous stages.

Do not replace the complete visual identity without strong justification.

The final visual quality must be evaluated across:

- Composition
- Visual hierarchy
- Color harmony
- Silhouette readability
- Materials
- Depth
- Motion
- Environmental atmosphere
- Interface typography
- UI consistency
- Scientific legibility

## 4.1 Organisms

Organisms must be visually appealing and meaningfully distinct.

Preserve the three-type morphology contract from `docs/prompt-stage3.md`, Section 9.6–9.7, where implemented. The blue–green conservative type has a heritable, evolvable corner count and is not restricted to a hexagon; the pink–orange generalist has a separate heritable lobe count. Polish rounded silhouettes without changing, hardcoding, or inventing these counts. Inspection-scale renderings, portraits, and recorded ancestors must match available simulation data. Do not implement missing scientific traits as decorative animation during this polish stage; report missing Stage 3 work explicitly.

They should look like members of a coherent fictional ecosystem rather than an unrelated collection of decorative illustrations.

Review:

- Shape consistency
- Recognizable inherited characteristics
- Anatomical or visual coherence
- Color variation
- Motion quality
- Scale differences
- Selected-organism visibility
- Readability during crowding

Avoid:

- Disturbing alien-horror forms
- Dense hole patterns
- Grotesque morphology
- Excessive eyes or protrusions
- Unpleasant cellular clusters
- Random visual mutation without meaningful rules
- Uncontrolled glow or decorative noise

The intended emotional qualities include curiosity, wonder, tranquility, charm, and fascination.

Do not require every organism to be conventionally cute.

---

# 5. Motion Design and Life-Like Presence

Refine organism motion so that the world feels naturally alive.

Potential improvements:

- Smooth heading transitions
- Subtle body elasticity
- Inertia-aware animation
- Gentle secondary motion
- Movement patterns reflecting organism traits
- Clear but restrained reproductive events
- Elegant death and disappearance transitions
- Environmental response animation

Avoid constant or excessive animation.

The visual system should distinguish between:

- Actual simulation behavior
- Render-time interpolation
- Decorative secondary motion

Decorative animation must not falsely imply unimplemented abilities.

Use measured movement data where available.

Do not animate an organism as if it has functional wings, fins, or limbs unless the interpretation is consistent with the implemented simulation.

---

# 6. Visual Composition Across Population Sizes

An important challenge is maintaining beauty regardless of ecosystem density.

Test at least:

- Very small populations
- Typical populations
- High-density populations
- Near-extinction scenarios
- Empty ecosystems

A nearly empty ecosystem must still feel intentional.

A crowded ecosystem must remain readable.

Use appropriate:

- Spatial hierarchy
- Layering
- Contrast
- Selection emphasis
- Detail reduction
- Zoom behavior
- Visual density control

Avoid turning high population density into a visually unpleasant collection of overlapping organisms.

Do not hide scientific population growth through artificial rendering limits without indicating the simplification.

---

# 7. Interaction Design

The interface should feel playful, precise, and pleasurable.

Refine:

- Hover feedback
- Selection
- Dragging or panning
- Zoom
- Time controls
- Simulation pause/resume
- Environmental adjustment
- Tooltips
- Transitions
- Panel opening and closing
- Keyboard interactions

Avoid controls that look interactive but do nothing.

Avoid unnecessary modal dialogs.

Avoid forcing the user through long tutorials before they can enjoy the ecosystem.

Interactions should provide immediate and understandable feedback.

The interface should never confuse visual feedback with a successful scientific operation.

---

# 8. Three Experience Modes

Design three complementary modes.

They may be separate UI states or progressively disclosed interfaces.

## 8.1 Immersive Mode — Just Watch

The ecosystem becomes the central visual experience.

Characteristics:

- Minimal controls
- Large or fullscreen ecosystem
- Beautiful ambient movement
- Optional sound
- Minimal scientific information
- Comfortable long-term viewing

The user should be able to leave the simulation open for extended periods.

Avoid intrusive notifications and constant attention-grabbing effects.

## 8.2 Explorer Mode — Follow a Life

The user can inspect and follow organisms.

Features may include:

- Organism selection
- Follow-camera behavior
- Trait inspection
- Parent/offspring relationship
- Life history
- Individual statistics

If a selected organism dies, preserve the ability to inspect available historical data.

Optional personality-like presentation may be introduced as a clearly marked creative layer.

Do not invent psychological states as scientific facts.

## 8.3 Research Mode — Understand Evolution

Provide access to:

- Experimental controls
- Environmental interventions
- Population graphs
- Genetic distributions
- Lineage history
- Experiment comparison
- Discovery records

The interface should remain elegant despite the greater information density.

Use progressive disclosure.

Do not put every analytical tool on screen simultaneously.

---

# 9. Sound and Generative Audio

Design a sophisticated ambient sound experience.

The creator enjoys musical interaction, experimental instruments, and audio-reactive art.

Sound can become an important part of EVOLUTION MACHINE.

However, the audio must not become distracting.

## 9.1 Sound Philosophy

The environment should sound like a mysterious, gentle, living instrument.

Possible directions:

- Soft synthesis
- Minimal ambient textures
- Gentle harmonic drones
- Sparse melodic events
- Subtle organic electronic sounds
- Carefully designed spatial ambience

Avoid:

- Constant beeping
- Harsh alarms
- Loud repetitive loops
- Random notes without musical structure
- Excessive reverb
- Musical clutter

## 9.2 Data-Driven Sonification

Investigate whether real simulation variables can influence sound.

Examples:

- Population influences musical density.
- Average movement influences rhythmic activity.
- Resource abundance influences harmonic texture.
- Genetic diversity influences timbral complexity.
- Major ecological changes influence sound transitions.

Do not claim these relationships are scientifically meaningful beyond their defined artistic mapping.

Separate artistic sonification from scientific measurements.

## 9.3 Technical Requirements

Use Web Audio or an appropriate browser-compatible sound engine.

Requirements:

- Audio opt-in when required by browser policy
- Mute and volume controls
- Safe volume levels
- Stable timing
- Low unnecessary CPU usage
- No memory leaks
- Graceful behavior when audio is disabled

Do not add audio that prevents the simulation from working offline.

---

# 10. Surprise and Discovery

The creator enjoys unexpected events.

However, discoveries must originate from the simulation or be explicitly identified as creative presentation.

Design a subtle discovery experience.

Examples:

- A lineage survives a major environmental change.
- A previously uncommon trait becomes widespread.
- A population undergoes an unexpected crash.
- Several genetic clusters diverge.
- An unusual long-lived organism is discovered.

These events must be backed by actual simulation data.

## 10.1 Discovery Presentation

Possible elements:

- Beautifully designed discovery cards
- Timeline markers
- Research notebook entries
- Historical snapshots
- Selected-organism portraits
- Evolutionary history illustrations

Avoid constant celebratory popups.

Surprise should be occasional and meaningful.

## 10.2 Creative Narrative Layer

A separate optional creative mode may add playful or poetic descriptions.

For example:

"An exceptionally stubborn little lineage has survived another harsh season."

If implemented, clearly distinguish this creative interpretation from scientific findings.

Do not fabricate underlying data.

Do not use per-organism language-model calls.

---

# 11. Onboarding and First-Time Experience

Design the first two minutes carefully.

A new visitor should understand:

1. This world contains autonomous organisms.
2. Organisms reproduce, inherit traits, and mutate.
3. Environmental conditions influence survival.
4. The user can observe or conduct experiments.
5. Unexpected outcomes may emerge over time.

Avoid overwhelming users with technical terminology.

Provide concise optional explanations.

Let people begin observing immediately.

A possible onboarding structure:

- Enter the world
- Observe movement
- Select an organism
- Examine inherited traits
- Change one environmental variable
- Advance time
- Compare population changes

Do not fabricate a guaranteed evolution outcome for the tutorial.

If the tutorial requires a specific demonstration, use a clearly labeled prerecorded or controlled experiment.

---

# 12. Emotional Engagement

The project is not just a research tool.

The creator should feel attached to the world.

Explore ethically and artistically appropriate features such as:

- Bookmarking an organism
- Following a lineage
- Naming a favorite organism
- Saving memorable discoveries
- Taking ecosystem snapshots
- Comparing ancestral forms
- Reviewing extinct lineages

These interactions should not interfere with the underlying ecological rules.

Naming an organism must not change its fitness.

Following a lineage must not secretly protect it from extinction.

Emotional attachment should arise from authentic observation.

---

# 13. Historical and Scientific Storytelling

Use the information collected in STAGE 3 to tell meaningful evolutionary stories.

Possible presentation formats:

- Lineage trees
- Illustrated ancestral comparisons
- Environmental histories
- Ecological event timelines
- Trait evolution charts
- Research notebook entries

Present facts clearly.

Distinguish:

- Observed data
- Statistical interpretation
- Hypothesis
- Creative narration

Avoid anthropomorphic or teleological explanations of evolution.

Do not imply that evolution has a goal or predetermined direction.

---

# 14. Long-Term Use and Persistence

This is essential.

The user wants to return to the same world repeatedly.

Implement or verify:

- Save and restore
- Named experiments or ecosystems
- Autosave where practical
- Clear persistence status
- Recovery from corrupted saves
- Version compatibility strategy
- Export and import
- Safe reset
- Clear confirmation for destructive actions

Avoid data loss after a long simulation.

Test persistence using realistic saved states.

Do not claim indefinite background execution.

Explain browser limitations when relevant.

When the simulation is suspended, the application should not falsely claim that organisms continued evolving unless a defined catch-up mechanism actually ran.

---

# 15. Accessibility and Comfort

The creator has professional experience with web accessibility and values high-quality implementation.

Audit:

- Keyboard usability
- Focus management
- Semantic controls
- Screen-reader labels
- Accessible status information
- Color contrast
- Non-color information cues
- Reduced-motion support
- Audio controls
- Responsive layout
- Error recovery

Provide meaningful accessible alternatives to important visualization data.

Avoid flashing effects.

Keep the experience comfortable for long sessions.

Aim to meet applicable WCAG 2.2 AA success criteria for the conventional web interface where feasible.

Document any limitations involving complex real-time visual simulation.

---

# 16. Performance and Engineering Quality

Audit:

- Rendering frame rate
- Simulation throughput
- Memory growth
- Save-file size
- Event listener cleanup
- GPU resource lifecycle
- Audio node lifecycle
- Resize behavior
- Long-session stability
- Hidden-tab behavior
- Reduced-motion behavior

Avoid unnecessary visual complexity that damages performance.

Where applicable, test:

- 30-minute runs
- Longer accelerated runs
- Repeated pause/resume cycles
- Repeated save/load cycles
- High population density
- Organism selection during rapid simulation
- Window resizing
- Audio enable/disable cycles

Do not claim long-duration tests unless actually performed.

---

# 17. Artistic Quality Assurance

This is a mandatory part of STAGE 4.

Assess the result like a demanding interactive-art curator, not merely a software engineer.

Ask:

- Does the artwork have a distinctive identity?
- Is the main ecosystem visually compelling?
- Are the organism silhouettes expressive?
- Is motion graceful and coherent?
- Does the world look beautiful at both low and high population density?
- Are the colors intentional?
- Is the interface visually subordinate to the ecosystem?
- Are the interactions satisfying?
- Is the audio elegant rather than annoying?
- Does the experience maintain interest after the initial novelty?
- Is there a coherent emotional atmosphere?
- Does it avoid generic AI-generated visual clichés?

Do not declare artistic quality perfect.

Identify the most important remaining weaknesses and improve them.

Prioritize large artistic improvements over endless minor CSS adjustments.

---

# 18. Required Validation

Perform appropriate verification.

## Functional

- Primary controls work.
- Organism inspection works.
- Simulation speed behaves correctly.
- Research tools access real data.
- Saving/restoring works.
- Existing scientific tests still pass.

## Visual

- Inspect actual rendered screens.
- Check multiple viewport sizes.
- Review sparse and dense ecosystems.
- Inspect organism readability.
- Evaluate overall visual hierarchy.

## Experience

- Test first-time onboarding.
- Test returning-user workflows.
- Test immersive observation.
- Test organism tracking.
- Test research mode.
- Test sound and mute behavior.

## Technical

- Check performance.
- Check memory.
- Check major browser errors.
- Check accessibility.
- Check persistence integrity.

Document actual findings.

Do not invent verification results.

---

# 19. Required Deliverables

Create or update:

`docs/STAGE4_AUDIT.md`

`docs/ART_DIRECTION_FINAL.md`

`docs/INTERACTION_DESIGN.md`

`docs/SOUND_DESIGN.md`

`docs/QUALITY_REPORT.md`

`docs/FINAL_HANDOFF.md`

Implement prioritized improvements directly in the project.

Avoid redundant documentation if equivalent maintained files already exist.

Include:

- Screenshots where feasible
- Visual design decisions
- Accessibility findings
- Performance measurements
- Known limitations
- User-facing instructions
- Remaining creative opportunities

---

# 20. Definition of Done

STAGE 4 is complete when:

- [ ] The existing science remains intact.
- [ ] The visual direction feels coherent and distinctive.
- [ ] Organisms are beautiful and readable.
- [ ] Animation feels alive.
- [ ] The ecosystem is enjoyable in immersive observation mode.
- [ ] Individual organisms can be explored.
- [ ] Scientific features remain accessible.
- [ ] Important discoveries are presented accurately.
- [ ] Sound is polished and optional.
- [ ] First-time interaction is understandable.
- [ ] Long-term persistence is reliable.
- [ ] Primary controls are accessible.
- [ ] Performance is appropriate for the intended environment.
- [ ] The actual application has been visually inspected when tooling permits.
- [ ] Significant bugs have been addressed.
- [ ] Remaining limitations are documented.

Do not treat unchecked requirements as complete.

If a requirement remains unfinished, record it explicitly.

---

# 21. Budget and Execution Strategy

This phase may involve many small visual and interaction improvements.

Avoid spending the highest-reasoning model on routine polishing.

Use advanced reasoning selectively for:

- Complex animation systems
- Difficult rendering architecture
- Procedural organism visual design
- Simulation-to-art integration
- Serious performance defects
- Final architectural review

Use standard coding models for:

- CSS refinement
- UI component polish
- Responsive layout
- Routine accessibility fixes
- Documentation updates
- Standard regression tests

If time or usage budget is constrained, prioritize:

1. Critical functional defects
2. Major visual inconsistencies
3. Core interaction quality
4. Long-term stability and persistence
5. Accessibility
6. Audio quality
7. Optional creative enhancements

Do not introduce major new systems late in the project without a clear benefit.

---

# 22. Final Report

At completion, respond in Traditional Chinese (Taiwan).

Provide:

1. Overall project status
2. Major artistic improvements
3. Functional improvements
4. Scientific integrity verification
5. Performance and accessibility findings
6. Evidence of actual visual inspection
7. Outstanding issues
8. How to run the completed application
9. Future development recommendations

Be candid about shortcomings.

A truthful, polished project is preferable to an exaggerated completion report.

---

# 23. Final Artistic Ambition

The final work should make visitors feel:

"I want to know what these little beings are doing."

"I wonder what will happen if the environment changes."

"That organism looks different from the others."

"Can I see what its ancestors looked like?"

"I wonder what this world will look like after another thousand generations."

Most importantly:

> Create an artificial world that feels worthy of observation, where beauty arises from the interaction of life, time, and rules.

**Make EVOLUTION MACHINE a living artwork, not just an evolution simulator with a beautiful interface.**
