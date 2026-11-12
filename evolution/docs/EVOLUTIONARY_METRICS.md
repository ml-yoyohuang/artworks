# Evolutionary metrics — model 2

Definitions are implemented in `src/sim/metrics.ts`. Missing numerical statistics use NaN in memory and null in JSON; missing historical arrays remain absent. The viewer must show gaps/n/a, not invent zero-valued historical observations.

| Metric | Meaning / unit |
|---|---|
| tick | completed scientific update steps; independent of wall-clock seconds |
| totalBirths | successful birth events since start; excludes introductions/founders; unknown for imported v1 history |
| mean/maxGeneration | ancestor birth-event depth, not synchronized generations or tick divided by a constant |
| meanParentAge | mean parent's age at successful birth in the sampled interval, in ticks; unavailable with no births |
| population/typePop | living individuals, each multi-lobed body counts once |
| births/deaths/typeBirths/typeDeaths | interval counts over `span`; per-1000-tick rate = count/span×1000 |
| resourceFrac / resourceFracB | sum resource / (cellCapacity × sum fertility), separately per pool; zero for disabled pools |
| meanEnergyFrac/typeEnergyFrac | mean reserve/capacity of living individuals, not sum energy divided by sum capacity; absent type is n/a |
| typeUptakeA/B | actual resource energy removed during interval, not affinity or requested amount; divide by span for energy/tick |
| typeFixedCost/typeMoveCost | maintenance / locomotion paid from reserves over interval, energy units; paid amounts are apportioned if reserves cannot cover the full cost |
| cornerCounts / lobeCounts | current individuals indexed by expressed count, in separate applicable types |
| traitMean/SD | population mean and population standard deviation of expressed continuous traits; raw speed trait is before type/morph multipliers |
| typeTraitMean | within-type expressed continuous trait means; absent types n/a |
| traitGeneVar / brainGeneVar | across-individual variance of raw locus values, averaged over trait/controller loci; proxy, not heterozygosity |
| founderLineages | number of distinct founders with surviving descendants; not species |
| lrsMean/lrsVar | completed lifetime offspring counts among individuals dying during interval; alive individuals are censored/excluded, so not an unbiased whole-population lifetime fitness estimate |
| capHits | reproduction attempts suppressed by safety cap; scientific-artifact flag |

History uses bounded pairwise decimation: sum interval counters and pool count-weighted parent/death-age and lifetime offspring moments; retain the later sample's instantaneous state. Plot x by actual tick, not sample index. Morphology frequencies in old, merged intervals are endpoint distributions, not pooled births or time averages.

Rule-based discoveries (`research.ts`) record tick, numeric evidence, rule, and interpretation limits: population collapse >50% between samples when previous population ≥10; whole/type extinction; raw trait variance drop >50% when previous variance >.001; one founder lineage remaining. Logs are bounded (experiment 500, viewer 50), threshold-based, and sample-sensitive. No event is labeled adaptation, intention, speciation, or stable coexistence without additional evidence.

Persistence means every initially introduced type is present at every recorded sample in the final 20% of a completed run and at its endpoint, with at least two tail samples. Cancelled/too-short runs do not qualify. It is a finite-run measure, not a guarantee of indefinite coexistence.
