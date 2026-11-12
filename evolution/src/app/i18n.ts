export type UiLanguage='zh'|'en';
let language:UiLanguage='zh';
try {if(typeof localStorage!=='undefined'&&localStorage.getItem('evolution-data-language')==='en')language='en';}catch{}
export const getLanguage=()=>language;
export const t=(zh:string,en:string)=>language==='zh'?zh:en;
export const typeName=(type:number)=>t(['橘藍游動型','藍綠節能型','粉橘多瓣型'][type]??'未知類別',['Mobile forager','Conservative grazer','Multi-lobed generalist'][type]??'Unknown type');

/** Only the data instruments are bilingual. The observer's Chinese journal is preserved verbatim. */
const MESSAGES:Record<string,string>={
  'Field notes':'研究筆記','The population':'族群觀察','Specimen':'個體資料','Close':'關閉',
  'Climate & experiments':'環境與實驗','Show or hide climate controls':'展開或收起環境與實驗',
  'Population field notes':'族群研究筆記','Size':'體型','Top speed':'最高游速','Sensing range':'感知範圍','Breeds at':'繁殖門檻','Gives offspring':'子代投資',
  'Lineage colour':'家族色彩','neutral':'中性特徵','Lineage & genome':'家族與基因','Recorded ancestor morphology preview':'祖先外形紀錄預覽',
  'living now':'目前現存','mean generation':'平均世代','ticks per generation':'每世代步數','founding lineages left':'仍延續的起始家族','resource / fertile capacity now':'食物存量／肥沃容量','mean energy / body capacity now':'平均能量／身體容量','births per 1000 ticks':'每千步出生數','deaths per 1000 ticks':'每千步死亡數',
  'ticks old':'存活步數','offspring':'子代數','world units / tick':'距離／步','energy reserve':'能量儲備',
  'Follow':'跟隨牠','Place a clone':'放入同源個體','Resource':'食物','A · blue':'A · 藍色食物','B · green':'B · 綠色食物',
  'The chamber is empty':'水域暫時安靜了','Begin a new world':'開啟新的觀察箱','Release newcomers':'放入新住客',
  'Productivity':'補充速率','Richness':'食物容量','Release a newcomer':'放入新住客','Newcomer':'新住客類別',
  'Orange–blue forager':'橘藍游動型','Blue–green grazer':'藍綠節能型','Pink–orange generalist':'粉橘多瓣型',
  'New world':'新的觀察箱','Save':'匯出檔案','Open…':'開啟檔案…','Diagnostics':'診斷工具',
  'Changes apply now and are logged. Productivity scales regrowth and influx; richness is energy capacity per cell before fertility.':'調整會立即生效並記錄。補充速率影響食物生長與流入；容量是每格依肥沃度換算前可容納的食物量。',
  'living organisms':'現存生物','resource, share of capacity':'食物存量／容量比例','interventions':'環境介入',
  'Recorded population and resource history':'族群與食物歷史紀錄','Three ecological types':'三類生物',
  'Designed founder categories, not observed speciation. Rates below cover the last recorded interval; populations and energy are current. A/B uptake and costs use energy units per tick.':'以下人口與能量為當下讀數；出生、死亡、取食與成本涵蓋最近一段紀錄，取食與成本以每步能量計。類別內的差異不等於新物種形成。',
  'Recorded populations by ecological type':'三類生物的族群歷史','Morphology distributions':'外形分布','Recorded mean corner and lobe counts':'平均角數與瓣數紀錄',
  'Mean traits':'平均特徵','Diversity':'遺傳多樣性',
  'Size: model scale. Speed: world units/tick. Sensing: world units. Breeding: fraction of capacity. Investment: fraction of parental energy. Values are mean ± population standard deviation; each trend uses its own labeled scale.':'體型以相對尺度表示；游速為距離／步，感知為距離。繁殖門檻是能量容量比例，子代投資是親代能量比例。數值為平均值 ± 標準差，各曲線使用個別標示的尺度。',
  'Raw gene diversity history':'基因變異歷史','body genes':'身體特徵基因','controller genes — variance across the population':'行為基因 — 族群內變異數',
  'Chronicle':'介入紀事','Evolution laboratory':'演化研究室',
  "Fresh independent experiments using this world's initial configuration. Current progress and live interventions are not copied. The observation chamber pauses while the batch runs. Experiments continue in hidden tabs, subject to browser throttling; Cancel stops them. Finite-run survival does not establish permanent coexistence.":'比較實驗使用本箱的起始條件另開培養批次，不帶入目前進度或中途介入。執行時本箱暫停；背景分頁的批次可能受瀏覽器限速。可隨時取消。有限時間內存活不代表永久共存。',
  'First seed':'起始種子','Replicates':'重複次數','Ticks per run':'每次步數','Comparison':'比較項目',
  'A-rich / B-rich / mixed (same nominal cell capacity)':'藍食較多／綠食較多／混合（相同名義容量）','No mutation / default mutation':'無突變／一般突變','Uniform / patchy (also changes abundance)':'均勻／斑塊分布（也影響總量）',
  'Run experiments':'開始比較','Cancel':'取消','Export results':'匯出結果','Ready. No experiments run yet.':'準備就緒，尚未進行比較。',
  'Exact state checkpoints':'觀察時點','Keep up to three full states in memory. Restore replaces the world after confirmation. These are exact saved states, not continuous time travel; save a world file for durable storage.':'暫存最多三個完整時點，確認後可回到該刻。這些時點只留在本次開啟期間；長期保存請匯出檔案或加入收藏庫。',
  'Capture current state':'留下目前時點','Discovery log':'觀察發現','Measured sample changes with explicit rules; no inferred intentions or claims of adaptation. Most recent 50 observations.':'依相鄰紀錄的明確變化留下觀察，不憑單一變化判斷原因或適應成功；保留最近50則。',
  'How to read a specimen':'如何閱讀一個生命','Body scale':'身體尺度','Elongation, tail length':'修長程度與尾部','Tail beat':'尾部擺動','Internal structures':'內部構造','Antennae':'觸鬚與感測','Side notch':'側邊凹口','Outline ripples':'輪廓起伏','Form and colour family':'外形與色系','Corners / lobes':'角數／瓣數','Dark nucleus':'深色細胞核','Water, sediment':'水域與沉積','Division, fading':'分裂與淡去',
  'size gene; displayed radius is enlarged ×1.5. Shape also changes area; it is not a physical footprint.':'體型的遺傳特徵；為方便觀察，顯示半徑放大1.5倍，輪廓也影響可見面積，不是精確的物理佔地。',
  'forager maximum speed gene; other types use their own inherited silhouettes':'游動型的最高游速特徵會影響身體修長程度與尾長；其餘兩類各有自己的遺傳輪廓。',
  'how fast it is moving now':'對應當下實際移動速度。',
  'grazer rays run from the energy core toward the inside of the membrane. Generalist lobes have 0–3 inherited decorative particles each; they do not add genes or capabilities.':'節能型的細絲從核周伸向膜內側；多瓣型各瓣可見0–3顆遺傳粒子。粒子數不作為基因數量或取食能力的讀數。',
  'only the forager has external antennae. Selected dotted rays show the actual three sensor directions for every type; internal details are visual metaphors.':'游動型具有外伸觸鬚；選取任一個體時，點狀線會標出三個實際感測方向。',
  "forager's share of energy given to each offspring":'對應游動型分配給每個子代的能量比例。',
  'forager controller genes, used decoratively; no modeled membrane adaptation':'游動型的行為基因會影響可見輪廓起伏；不據此推斷細胞膜的適應能力。',
  'orange–blue oval = forager; blue–green polygon = grazer; pink–orange lobes = generalist. Within-family tint uses two neutral inherited markers.':'橘藍橢圓為游動型，藍綠多角為節能型，粉橘多瓣為多瓣型。同類內的色澤隨兩個中性遺傳標記變化。',
  'inherited integer traits, changed only at birth; affect uptake, maintenance and construction. More is not always better.':'可遺傳的整數特徵，只在新生子代改變；影響取食、維持與建造代價，並非越多越好。',
  'energy reserve metaphor, not a simulated organ':'深淺與大小用來閱讀能量儲備，不能直接推論核內的其他生理活動。',
  'blue = A, green tint = B. Smoothed decorative maps; motes are not countable food items. Read availability in field notes.':'藍色為A類食物，綠色調為B類。水域經過柔化呈現，微粒不等於可逐顆計數的食物；實際豐度請看研究讀數。',
  'observed births and deaths, shown briefly at low speeds. Model 2 dissipates corpse reserves; legacy model 1 returns them to A.':'在低倍率以短暫分裂與淡去呈現實際出生、死亡。現行觀察箱不回收死亡個體的儲備；早期存檔保留原本的回收規則。',
  'Organisms move using inherited controllers. Births require energy and maturity; deaths arise from starvation or age-dependent random hazard. Three types are designed starting categories, not observed speciation. Diversity is mean raw gene variance, not heterozygosity. Birth/death rates cover the latest recorded interval; lineage and trait statistics use the latest recorded sample. Save a snapshot to preserve interventions; the seed alone reproduces only the initial experiment. Hidden tabs suspend simulation time without catching up. At high speed the frame budget may lower actual tick rate; every executed tick uses the same scientific rules. See docs/STAGE3_REPORT.md for measured evidence.':'行為隨遺傳而來；繁殖需要成熟與足夠能量，死亡可能來自飢餓或隨年齡增加的風險。多樣性指基因變異數，不是雜合度。出生、死亡涵蓋最近紀錄區間，家族與特徵統計採最近樣本。請以快照保存中途介入；種子只重現起始實驗。隱藏分頁暫停，不補跑時間。高倍率可能受效能限制，但每一步規則不變。驗證資料見 docs/STAGE3_REPORT.md。',
  '跟隨牠':'跟隨牠',
};
// Controls already authored in Chinese also get an English counterpart.
const EXTRA:[string,string][]=[['Follow','跟隨牠'],['Place a clone','放入同源個體'],['Favourite nickname','收藏暱稱'],['Name after favouriting','收藏後可取名字']];
const pairs:[string,string][]=Object.entries(MESSAGES).filter(([en,zh])=>en!==zh).concat(EXTRA);
export function translateLabel(en:string) {return language==='zh'?(MESSAGES[en]??en):en;}
export function setLanguage(next:UiLanguage) {
  language=next;try{localStorage.setItem('evolution-data-language',next);}catch{}
  if(typeof document!=='undefined')document.dispatchEvent(new CustomEvent('data-language-change'));
}
export function installLanguageControl(onChange:()=>void) {
  const bindings:{node:Text;en:string;zh:string;prefix:string;suffix:string}[]=[];
  const attributes:{node:Element;attribute:string;en:string;zh:string}[]=[];
  for(const id of ['notes','notes-toggle','climate','specimen','extinct']) {
    const root=document.getElementById(id)!;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
      const node=walker.currentNode as Text,trimmed=node.data.trim(),pair=pairs.find(([en,zh])=>trimmed===en||trimmed===zh);
      if(pair)bindings.push({node,en:pair[0],zh:pair[1],prefix:node.data.slice(0,node.data.indexOf(trimmed)),suffix:node.data.slice(node.data.indexOf(trimmed)+trimmed.length)});
    }
    for(const node of [root,...root.querySelectorAll('*')])for(const attribute of ['aria-label','title','placeholder']) {
      const value=node.getAttribute(attribute),pair=pairs.find(([en,zh])=>value===en||value===zh);
      if(pair)attributes.push({node,attribute,en:pair[0],zh:pair[1]});
    }
  }
  const control=document.getElementById('ui-language') as HTMLSelectElement;
  const apply=()=>{
    control.value=language;
    for(const b of bindings)if(b.node.isConnected)b.node.data=b.prefix+t(b.zh,b.en)+b.suffix;
    for(const b of attributes)if(b.node.isConnected)b.node.setAttribute(b.attribute,t(b.zh,b.en));
    for(const id of ['notes','climate','specimen'])document.getElementById(id)!.lang=language==='zh'?'zh-Hant':'en';
    onChange();
  };
  document.addEventListener('data-language-change',apply);
  control.onchange=()=>setLanguage(control.value==='en'?'en':'zh');apply();
}
