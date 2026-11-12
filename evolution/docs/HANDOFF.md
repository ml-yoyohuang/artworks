# HANDOFF

## Stage 4 最新交接

本輪已實作觀看／探索／研究模式、本機收藏與兩代自動保存、個體暱稱、自願音訊、引導、手機面板與雙指縮放程式，以及暫停按需重繪。69個測試通過；實際瀏覽器驗證與尚未完成的真機／聽辨／30分鐘驗收見 [QUALITY_REPORT](QUALITY_REPORT.md)。操作與新檔案封裝見 [FINAL_HANDOFF](FINAL_HANDOFF.md)。此區優先於下列歷史紀錄，不將尚未驗證的項目宣告完成。

## 最新體驗更新

最新發版包含 Stage 3 接手完成內容、模型3轉向、本次觀察員紀錄、未讀提示、沉浸式生物筆記與108種實況模板。完整台詞見 [OBSERVER_CONTENT](OBSERVER_CONTENT.md)；三類生物各色系原已具4色票，見 [PIGMENTS](PIGMENTS.md)。缺席巡查的族群名稱改為按當下數量帶入。既有長期實驗主要為模型2，下一步優先補模型3的多種子長期共存與平衡驗證，再進行 Stage 4 整體體驗打磨。

新建世界預設模型 3（speed/R 最小轉動半徑），原模型 1/2 與快照語意保留。節能型改為核向膜內放射線、多瓣型每瓣有 0–3 個中性遺傳粒子；所有系統 confirm/alert 已換成頁內元件；新增本次瀏覽專用的觀察員中文文字播報。55 個測試，細節、運動對照及限制見 [EXPERIENCE_UPDATE](EXPERIENCE_UPDATE.md)。下列 Stage 3 模型 2 與更早段落保留為歷史基準。

## STAGE 3 接手完成版本

預設世界已為模型 2（三類、雙資源、角／瓣遺傳）。原模型 1 經 `legacyConfig()`、原 `npm run exp` 與 `/diagnostic.html` 保留。模型版本與 snapshot schema 是分開的：v2 snapshot 可以保存 model 1 或 2，v1 import 維持 legacy 語意。最新研究能力、實驗結果與限制見 [STAGE3_REPORT](STAGE3_REPORT.md)、[STAGE3_VALIDATION](STAGE3_VALIDATION.md)。以下 Stage 2／Stage 1 區段保留作歷史紀錄，不代表現行功能狀態。

## STAGE 2 status (observation chamber)

2026-11-12 規格對照修正與最新驗證見 [STAGE2_REPORT](STAGE2_REPORT.md)、
[STAGE2_AUDIT](STAGE2_AUDIT.md)、[ART_DIRECTION](ART_DIRECTION.md)、
[VISUAL_SYSTEM](VISUAL_SYSTEM.md)。下方早期「done」表與 GPU 量測屬歷史交接，
不代表跨瀏覽器或完整 Stage 2 驗收。最新介面已澄清顯示尺寸非精確面積比例、
隱藏頁面暫停與倍率為目標值等限制。

`index.html` is now the artistic interface; the STAGE 1 viewer moved to `diagnostic.html`.

| Part | File | State |
|---|---|---|
| watercolour field (WebGL): water = resource, peach = grazed fertile ground, motes = local resource density | `src/app/field.ts` | done; 2D fallback without WebGL |
| organisms: genome-derived silhouettes, sensor antennae, speed-driven tail beat, energy nucleus, real division / dissolution | `src/app/creatures.ts` | done; sprite cache per organism, level of detail when zoomed out |
| camera: microscope start (zoom 2), wheel / buttons zoom, drag pan, follow a specimen | `src/app/camera.ts`, `main.ts` | done; no pinch-zoom on touch yet |
| specimen card: lineage, vitals, each trait against the population distribution | `main.ts` | done |
| field notes: population and resource with intervention marks, auto-ranged trait means, diversity, chronicle, legend | `main.ts` | done |
| climate & experiments: productivity, richness, release a newcomer, place a clone, save / open / new world, `?seed=` URLs | `main.ts` | done |
| idle mode: controls fade after 7 s without input | `style.css`, `main.ts` | done |

Measured in the embedded Chromium (GTX 1050 Ti, 1440×900 at 2× DPR, ~700 organisms): field
0.6 ms, organisms ≈ 4 ms per frame, simulation 0.4 ms per tick. 1× speed = 30 ticks/s.
Bodies are drawn 1.5× their physical radius (`BODY_SCALE`) so they read at a glance; relative
sizes are exact. Not yet verified: Safari / Firefox, real phones, save / open round trip by hand.

Open STAGE 2 work: pinch zoom; a lineage-tree view (`sim.lineage`); simulation in a Web Worker
for 64× speed on slow machines; sound (optional); share-a-world links that embed a snapshot.

---

# STAGE 1 handoff

## Complete

- Simulation core (`src/sim`, ~1,100 lines, zero runtime dependencies): organisms, genome →
  phenotype, neural controller, energy economy, reproduction with mutation, mortality, patchy
  renewable resource, interventions, bounded metrics history, bounded genealogy, JSON
  snapshot / restore, state hash, real-time clock helper.
- 25 automated tests (`npm test`), all passing.
- Four seeded headless experiments with recorded results (`docs/EXPERIMENTS.md`,
  `experiments/results/`), plus an example configuration.
- Diagnostic viewer (`npm run dev`): field, organisms, inspector, charts, pause / speed,
  environment sliders, introduce organism, save / load. Checked in the embedded browser:
  renders, no console errors, inspection and environment change work. Save / load buttons and
  shift-click introduction were **not** clicked through by hand (the underlying API is tested).
- `npm run build` produces a static `dist/`.

## Definition of done

| Item | State |
|---|---|
| independently simulated organisms; finite energy and resource; reproduction and death | done, tested |
| genomes inherited and mutated; genotype affects behaviour and survival | done, tested |
| general controller, no scripted behaviours | done |
| ecological tradeoffs | done; interior optima observed for size and sense range |
| headless experiments, reproducibility, metrics | done, tested |
| natural-selection experiments executed and documented | done |
| minimal visualisation | done |

## Known limitations

- One founder clade takes over every long run; no stable coexistence of strategies observed.
- Local adaptation to a poorer environment was tested and **not** found (EXPERIMENTS, Test F).
- Evolution moved towards smaller, slower, shorter-sighted grazers. The current economy does
  not reward long-range sensing or speed; that is a property of the parameters, not a bug.
- Bit-exact reproducibility is per JS engine. Snapshots of the default world are ≈ 1 MB of JSON.
- Organisms have no collisions; the arena edge is a clamp (organisms can slide along walls).
- Hazard and maturity parameters are global, not heritable. Mutation rate is not evolvable.
- Node 16 pins Vite 4 / Vitest 0.34. Upgrading Node allows current tooling; nothing in `src/` depends on it.
- The viewer redraws every organism with a fresh gradient each frame: fine at ~1,000, not at 10,000.

## How to run experiments

See `README.md`. To write a new one, copy a function in `experiments/run.ts`; the reusable
pieces are `arena()`, `sampleGenomes()`, `compete()` (mutation-free competition assay) and
`report()`. Always: several seeds, a neutral or identical-group control, and record the result
whichever way it comes out.

## STAGE 2 — building the artistic interface

*(Implemented in STAGE 2 — see the status table at the top.)* Visual direction (from `docs/concept-art.png`): warm paper ground, pale-blue water bodies,
peach sediment, kidney-shaped cells with orange↔blue gradients and deep-violet nuclei, fine
antennae with dotted tips, soft grain, no glow.

Keep every visual tied to data. The diagnostic viewer already uses this mapping; keep or refine it:

| Visual | Data |
|---|---|
| blue water | `resource / cellCapacity` |
| peach sediment | `fertility` where resource has been grazed |
| body area | `ph.radius` (size) |
| elongation | maxSpeed |
| antenna length | senseRange (true reach shown on selection) |
| warm / cool hue | markerA / markerB — neutral, heritable: reads as lineage |
| nucleus size | energy / capacity |
| candidates not yet drawn | age (membrane thickness), reproThreshold / offspringInvest (budding shape), births and deaths (division and dissolution animations from `id` appearance / disappearance) |

Guidance:

- Import only from `src/sim/index.ts`; treat state as read-only; intervene only through
  `setEnvironment`, `introduce`, `restore`. Renderer state is keyed by organism `id`.
- Run the simulation in a Web Worker if the renderer gets heavy; the core has no DOM dependency.
- The field is a 96×64 grid: render it as a texture and shape it in a shader (threshold + soft
  edge gives the concept art's organic shorelines).
- Wanted researcher views: trait histograms (`traitHistogram`), lineage tree (`sim.lineage`),
  event markers on the timeline (`sim.events`), A/B comparison of two saved snapshots.
- Do not label marker-colour clusters "species".

## Research directions worth the expensive model

1. Why does one clade always win? Test spatial structure (barriers, larger worlds) and
   frequency-dependent resources for coexistence.
2. Make information valuable: moving or seasonal resource so that sensing and speed pay.
3. Controller–morphology co-adaptation (the Test D surprise): test directly by transplanting
   controllers between sense-range backgrounds.
4. Environmental gradients, a second resource, then predation.
5. Evolvable mutation rate; recurrent or topology-evolving controllers with size-dependent cost.

## Safe to give to a less expensive model

Renderer and shaders, UI panels and charts, histogram and lineage-tree views, Web Worker
plumbing, snapshot compression, more unit tests, parameter-sweep scripts that reuse `compete()`,
packaging. **Not** without review: anything in `stepOnce`, `genome.ts`, the energy rules, or the
interpretation of experiment results.

### 2026-11-12 已確認研究員造型

研究員預設採用使用者回傳參數。鏡框依當地星期輪換三種形狀；配件每分鐘輪換燒瓶／咖啡杯／筆記本，詳見AVATAR_EDITOR.md。進站倍率統一為最小1×連按三次＋（3.375×），工具列即時顯示倍率，收藏按鈕改手刻SVG。75個測試、typecheck、build通過，桌機與390px手機介面已驗證。所有時間裝飾與生態模擬隨機序列無關。
