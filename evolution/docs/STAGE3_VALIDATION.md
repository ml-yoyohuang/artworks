# STAGE 3 validation

最新外觀／模型 3／頁內確認與本次播報更新後，共 **55 個測試**通過（新增 experience.test.ts），型別檢查與正式建置亦通過。包含重跑一組已發表模型 2 的 G 結果，確保新運動規則沒有改掉舊世界；詳見 `EXPERIENCE_UPDATE.md`。下文 48-test 記錄為原 Stage 3 接手基準。

## Reproducible commands

```sh
npm run typecheck
npm test
npm run build
npm run research -- g
npm run research -- controls
npm run research -- long
npm run research -- benchmark
```

`--quick` is a smoke option, not the source of the recorded full results. JSON outputs under `experiments/results/stage3/` contain model/configuration, seeds, initial gene banks, intervention schedules, stop ticks, sampled observations, detection rules, status, scientific hashes, ledger error and performance. SIGINT cancels and preserves partial results; Windows output writes use atomic replacement with bounded retries for transient file locks. Statistical history is downsampled in CLI exports to 500-tick endpoints plus first/last; final counters carry the last interval. Browser exports keep bounded full sampled history.

## Automated checks

目前套件共 **48 個測試**，分為 legacy/core、observation、stage3 與 research 四個檔案；最終建置／檢查結果由交接報告與實際命令輸出確認。

The legacy test suite is explicitly configured with `legacyConfig` for its single-resource scientific assumptions. The old genealogy test now checks the new documented retention policy (ancestors retained below budget), rather than requiring intentional new history to be discarded. No golden scientific hashes were rewritten.

Fixtures recorded before extension verify seeds 3/9/42 at tick 2500: 559568005 / 439080681 / 528942637. The v1 fixture restores hash 3360888390, then reaches 908215809 after 800 more ticks. Legacy phenotype, update order and reserve recycling are retained.

New tests cover both resource pools' ledger through environment changes, disabled-pool starvation, scarce shared-resource proportional allocation, a single total intake budget, v2 JSON continuation, invalid version/genome/config rejection, bounded unbiased one-step mutations, no RNG use when count mutation is disabled, unchanged morphology during life, real birth inheritance, physiological benefits/costs at fixed mass, thinning gaps, read-only geometry, headless chunk equivalence, exact checkpoint continuation and cancellation with partial results. The renderer uses no simulation RNG.

## Executed experiments

- G: 63 ecology cases (3 environments × 7 founder combinations × 3 seeds), plus 24 independent morphology cases, each 6000 ticks: **87 completed runs**.
- A–F: 13 conditions × 3 seeds, each 6000 ticks: **39 completed runs**. Uniform spatial controls match initial per-pool mean stock to the patchy reference.
- Long: **3 × 100000 ticks**; finite state and ledger checked during execution. Maximum final relative ledger error across these files: **7.60e-11** (required invariant threshold 1e-8).
- F identical-repeat scientific hashes agree for all three seeds. Paired neutral-marker changes retain the same ecological trajectories; their genome-inclusive hashes intentionally differ.
- Benchmark: four initial population sizes, each 100 warmup + 1000 measured ticks, with actual population changes, organism updates, memory observations and history/lineage sizes in the output.

Exact final results and interpretation are in `STAGE3_REPORT.md`; exclusions/extinctions are retained as results, not removed as failed demos.

## Browser checks / limits

Chromium inspection exercises the real three-type canvas, per-type statistics, independent A/B controls, integer morphology silhouettes, inspection/ancestor preview, laboratory completion/cancellation and snapshot loading. `tests/fixtures/visual-v2.json` is an intentionally arranged morphology QA world (one oval, corners 3–8, lobes 3–6), not evidence of evolved diversity. Refer to the report for final UI checks and screenshots.

實際祖先點選驗證：seed 7、tick 4350、個體 #3374 的 8 筆 retained chain，點選 #2495 顯示已記錄的 grazer 5 角與「50% 非歷史儲能」說明。此時人口 1433，暫停、筆記與個體卡開啟時，觀察 frame work 約 27.5 ms（JS callback 的牆鐘耗時，非 GPU 完成時間），不是固定 FPS 保證。新量測從 callback 進入時計時，避免把 native confirm 等候時間誤算為繪圖工作。

390×844 視窗已檢查研究表單：輸入、選單、按鈕可讀可操作，面板可捲動，已保存 `stage3-mobile.jpg`；之後回復正常桌面尺寸。這不是實體手機／多指觸控的驗收。

Firefox, Safari, real touch devices, long unattended browser sessions, and screen-reader certification are not claimed. Performance measurements are machine-specific. Headless runs yield to the event loop; there is no Worker and throughput can compete with drawing in the browser. Hidden observation tabs stop chamber time; explicitly running headless experiments continue under browser timer throttling until completed/cancelled.
