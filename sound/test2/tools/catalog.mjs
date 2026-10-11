// 展覽策展資料：tools/pages.mjs 依此產生九個真實 HTML 入口。
export const exhibition = {
  title: '聲音的居所',
  en: 'SOUND / 4 — Where Sound Stays',
  theme: '聲音如何形成空間、材料、記憶與事件',
  intro: [
    '聲音一發出就開始消失。這八件作品各自替它找一個可以停留的地方：一座只在和弦裡站穩的建築、一匹記得樂句的布、一道被沉默切開的縫、一枚把整首歌收進螺旋的化石；兩層幾乎同步的潮汐、一口氣留下的玻璃、一座由回聲一段段點亮的迷宮，以及一個始終差一點就要翻開的形體。',
    '每件作品都由一份明確的樂譜同時驅動聲音與圖像：你聽見的事件，就是畫面發生的原因。慢慢看，暫停，重播；同一條規則在不同時刻會長出不同的東西。'
  ]
};


export const works = [
  {
    file: '01-resonant-architecture.html', no: '01', js: '01-architecture.js', title: '共振建築', subtitle: '空氣有自己的骨架', en: 'Resonant Architecture',
    accent: '#7d93b5', theme: 'light', icon: 'arch',
    canvasLabel: '霧白空間中，由和弦決定位置的牆、拱門與懸浮隔板，隨音樂緩慢重組。',
    invite: '每八秒換一個和弦，整座建築在三秒內慢慢挪成另一種空間。',
    statement: '在霧白的空間裡，牆、拱門與懸浮的隔板原本看不見。持續的聲音讓它們凝聚、站穩；和弦一換，空間不會重建，而是沿著聲部的移動被推開、折合、重新分隔。共同音留下的牆不動，級進的聲部讓牆滑過一小段距離——你看見的是和聲進行本身的平面圖。',
    moment: '開始後第 8 秒第一次換和弦：低音移動，最前方的長牆與它的陰影一起滑向新位置，拱門的跨度隨音程改變。之後每 8 秒一次；第 4 與第 8 個和弦會讓整座空間明顯轉向。',
    view: ['等待長音出現：牆從地面升起、半透明的輪廓逐漸變實。', '注意短促的鐘音：它們只留下細薄、晃動的懸掛片，很快散去。', '拖曳畫面可稍微轉動視角；左右方向鍵也可以。'],
    rules: ['四個聲部各自對應一道牆，音高決定牆在平面上的位置；音程寬度成為兩牆之間的通道與拱門跨度。', '持續音讓構件的「穩定度」上升；只有短音時構件會變輕、搖晃並逐漸下沉。', '和弦的緊張度（半音、三全音）讓牆體偏轉，形成收束或斜向的空間；七和弦加入夾層。', '所有構件保持身分與連續性，以臨界阻尼彈簧移動到新位置，不會因單一瞬間音量而跳動。'],
    tech: 'three.js r180（WebGL）即時陰影與霧；原生 Web Audio 程式作曲。這是聲學啟發的造形系統，並未求解真實聲場，不是聲學模態模擬。',
    controls: `<span class="group-label" id="g-set">和弦組</span><div class="seg" role="group" aria-labelledby="g-set"><button data-set data-value="0" aria-pressed="true">中殿</button><button data-set data-value="1" aria-pressed="false">迴廊</button><button data-set data-value="2" aria-pressed="false">高塔</button></div><span class="group-label" id="g-mode">空間</span><div class="seg" role="group" aria-labelledby="g-mode"><button data-mode data-value="nave" aria-pressed="true">縱向廊道</button><button data-mode data-value="court" aria-pressed="false">環形中庭</button></div>`
  },
  {
    file: '02-chord-loom.html', no: '02', js: '02-loom.js', title: '和弦織機', subtitle: '一首歌，被織成一匹布', en: 'Chord Loom',
    accent: '#d08f6a', theme: 'dark', icon: 'loom',
    canvasLabel: '布面由下往上持續織出：低音是粗經線，旋律是細緯線，打擊是結點。',
    invite: '同一個樂句回來時，布面上的紋樣也跟著回來。',
    statement: '低音、旋律與打擊樂是三種不同的線。音樂往前走，布就在織口一列一列長出來：低音是粗而深的經線，旋律是帶顏色的細緯，打擊樂打成短促的結。重複的樂句在同一條規則下織出同一塊紋樣；變奏讓紋樣錯位；聲部退場，布就變得鬆、薄、透光。',
    moment: '第 10 秒左右，第一個樂句原樣重複，你會在織口看見剛剛那塊紋樣再次出現；第 21 秒變奏把紋樣往右推偏，第 31 秒旋律退場留下一段透光的薄紗。',
    view: ['看織口（亮線）附近：每一列就是一個八分音符。', '關掉一個聲部，聽見它消失，也看見它的線不再進入布面。', '換織法會改變經緯上下穿越的規律，已織好的布保留原樣。暫停時可以慢慢看布，或匯出整匹布的 PNG。'],
    rules: ['樂譜直接記錄三個聲部何時發聲；不使用混音分析或 FFT 推測聲部。', '低音音高決定粗經線落在哪一個區帶，持續期間每列交替上下穿越緯線。', '旋律音高決定緯線顏色與提綜位移，形成斜紋走向；同一音型產生同一紋樣。', '打擊：低鼓打出大結、軍鼓是一段亮色短緯、沙鈴是細小的結點。', '布面最多保留 360 列歷史；畫面以快取影像捲動，長時間播放不會增加幾何量。'],
    tech: 'Canvas 2D 逐列繪製圓柱光影與纖維；原生 Web Audio 三聲部原創曲（92 BPM，16 小節循環）。',
    controls: `<span class="group-label" id="g-weave">織法</span><div class="seg" role="group" aria-labelledby="g-weave"><button data-weave data-value="0" aria-pressed="false">平織</button><button data-weave data-value="1" aria-pressed="true">斜紋</button><button data-weave data-value="2" aria-pressed="false">緞紋</button></div><span class="group-label" id="g-voice">聲部</span><div class="seg" role="group" aria-labelledby="g-voice"><button class="voice-toggle" data-voice="bass" aria-pressed="true">低音</button><button class="voice-toggle" data-voice="melody" aria-pressed="true">旋律</button><button class="voice-toggle" data-voice="drums" aria-pressed="true">打擊</button></div><button id="export">匯出 PNG</button>`
  },
  {
    file: '03-silence-cuts.html', no: '03', js: '03-cuts.js', title: '休止符', subtitle: '沉默把空間切開', en: 'Silence Cuts',
    accent: '#d0413a', theme: 'dark', icon: 'cut',
    canvasLabel: '墨黑的表面在聲音持續時繃緊；聲音停止時出現切口，露出白色紙芯與深處的紅。',
    invite: '一段有張力的聲音突然停下，表面安靜地打開。',
    statement: '濃密的墨黑表面在聲音持續時一直繃著。只有聲音停下來，它才會被切開：短的停頓留下細線，長的沉默讓縫真正打開，露出紙的白色斷面與深處的一抹紅。切口的方向、長度與深度，由前一段聲音的力度、長度與音域決定——沉默記得它之前的聲音。',
    moment: '第 7 秒，一段強而密的弦樂突然停住 3.5 秒，表面打開第一道深縫；第 22 秒一段漸強後的 5 秒長休止，開出最大的切口。',
    view: ['比較短休止（細線）與長休止（打開的縫）。', '聲音恢復時，切口以固定速度收合，留下一道疤；很深的切口會保持微微張開。', '暫停、靜音或聲音被瀏覽器擋下都不會切開表面——只有樂曲裡的休止會。'],
    rules: ['樂譜中寫入不同長度的休止與不同力度的樂句。', '每段聲音記錄平均力度、長度與音域，休止開始時決定切口方向、尺度與深度。', '開口寬度隨休止已經持續的時間成長（不預先偷看休止長度）。', '「用我的聲音」使用麥克風音量的開／關雙門檻、遲滯與最短持續時間判斷休止，避免背景雜訊快速開合；分析只在本機進行，不錄音、不上傳。', '最多保留 9 道切口與疤痕，舊的逐漸癒合。'],
    tech: '自寫 GLSL 片段著色器（WebGL）以距離場繪製切口厚度、陰影與內部；原生 Web Audio 原創弦樂質地。',
    controls: `<span class="group-label" id="g-space">留白</span><div class="seg" role="group" aria-labelledby="g-space"><button data-space data-value="0.6" aria-pressed="false">少</button><button data-space data-value="1" aria-pressed="true">中</button><button data-space data-value="1.6" aria-pressed="false">多</button></div><button id="mic" aria-pressed="false">用我的聲音</button>`
  },
  {
    file: '04-sound-fossil.html', no: '04', js: '04-fossil.js', title: '聲音化石', subtitle: '這首歌曾經存在', en: 'Sound Fossil',
    accent: '#c7a26b', theme: 'dark', icon: 'fossil',
    canvasLabel: '一枚沿對數螺旋生長的石灰質標本，表面有節奏留下的細肋、長音留下的脊線與礦物沉積。',
    invite: '最後一個音消失，生長停止，燈光轉成看標本的光。',
    statement: '聲音沿著一條對數螺旋沉積成殼。密集的節奏留下細碎的肋紋，長音拉出一條連續的脊線；休止在殼上刻下縫合線。後來的聲音會讀取已經存在的表面：重複的樂句沿著舊脊線再長一次，把它加厚、礦化成金屬色的脈。曲子結束時，留下的是這首歌的完整標本。',
    moment: '約 47 秒曲終：生長停止，燈光從工作燈轉為斜側的展示光，標本開始緩慢自轉。第 26 秒起主題重複，可看到舊脊線被加厚並出現金屬光澤。',
    view: ['拖曳或用左右方向鍵旋轉標本，靠近看肋紋與脊線。', '「重播」以同一個 seed 重新長出完全相同的標本；「重新生成」換 seed，得到另一枚。', '曲終不會自動清空，也不會循環覆寫。'],
    rules: ['材料狀態逐環累積，每一環讀取上一環的表面高度再沉積或刻蝕。', '短音（節奏）→ 環向細肋與色層；長音 → 依音高落在固定角位的連續脊線；休止 → 縫合線與收縮。', '重複樂句的沉積量依既有脊線的高度分配，沿舊痕跡再生長並礦化。', '以 1/120 秒固定步長模擬整首樂譜，同一 seed 與設定得到逐位元相同的標本；播放時依實際音訊時間顯露。沒有跳轉功能，以確保時間與材料歷史一致。', '幾何預算固定：最多 420 環 × 48 角位。'],
    tech: 'three.js r180：自訂頂點屬性控制礦化金屬度、程序化石灰岩凹凸；原生 Web Audio 木琴與擦弦原創曲。',
    controls: `<button id="regen">重新生成</button><button id="export">匯出 PNG</button><span class="group-label">拖曳畫面可旋轉</span>`
  },
  {
    file: '05-phase-tides.html', no: '05', js: '05-tides.js', title: '相位潮汐', subtitle: '兩個幾乎同步的世界', en: 'Phase Tides',
    accent: '#5d7fd0', theme: 'dark', icon: 'tide',
    canvasLabel: '鈷藍與朱紅兩層波場以略不同的速度互相穿過，形成緩慢移動的巨大色帶。',
    invite: '兩層幾乎同步的節奏慢慢錯開，再安靜地重新聚合。',
    statement: '兩組節奏用幾乎相同的速度演奏同一個音型：鈷藍的木琴每 6 秒一輪，朱紅的玻璃鐘稍快一點。每一個音都在各自的波場推出一道浪；兩層之間的相位差慢慢累積，在畫面上變成巨大的色帶——起初幾乎重合，逐漸錯開成兩個不同的世界，然後再一次明亮而安靜地聚合。',
    moment: '約第 14 秒第一次聚合：兩層的浪前緣重疊，交會處出現少量的亮色。約第 59 秒到達最大分離——兩層錯開成互補的構圖——第 104 秒再次聚合（預設速度差）。',
    view: ['聽：兩層節奏的錯位就是畫面上色帶的位置。', '「速度差」改變整個潮汐的週期（150／90／45 秒）；改變時兩層相位保持連續。', '「靠近／離開」改變朱紅層追趕的方向。'],
    rules: ['兩組節奏都由同一個 AudioContext 時鐘推導相位，沒有兩個會漂移的計時器。', '畫面的波場相位就是聲音的相位：每個音在自己的波場推出一道浪。', '相位差 Δ 決定大尺度的干涉帶位置與兩層浪前緣的夾角；Δ=0 時兩層對齊，Δ=π 時完全互補。', '暫停只凍結音訊時鐘，恢復後相位關係不變。'],
    tech: '自寫 GLSL 片段著色器（WebGL）；兩組原創音型（Steve Reich 式相位手法），原生 Web Audio。',
    controls: `<span class="group-label" id="g-speed">速度差</span><div class="seg" role="group" aria-labelledby="g-speed"><button data-cycle data-value="150" aria-pressed="false">慢</button><button data-cycle data-value="90" aria-pressed="true">中</button><button data-cycle data-value="45" aria-pressed="false">快</button></div><div class="seg" role="group" aria-label="相位方向"><button data-dir data-value="1" aria-pressed="true">靠近</button><button data-dir data-value="-1" aria-pressed="false">離開</button></div>`
  },
  {
    file: '06-breath-portrait.html', no: '06', js: '06-breath.js', title: '呼吸雕塑', subtitle: '一口氣的肖像', en: 'Breath Portrait',
    accent: '#9fb3a8', theme: 'dark', icon: 'breath',
    canvasLabel: '每一次發聲長成一件玻璃、陶瓷或石膏的物件，定型後排列在展台上。',
    invite: '同一句話，慢慢說與急著說，留下兩件不同的雕塑。',
    statement: '每一次發聲或吐氣長成一件物件。聲音開始時它從底座長出，持續時拉伸、扭轉，停下時定型。音高決定扭轉，力度決定厚度，氣息的成分決定表面的孔隙；中途的停頓收成細頸，較長的停頓讓它分成兩個部件。完成的物件留在展台上，像一口氣的標本。',
    moment: '第一件（短句・輕緩）約在第 6 秒定型；第二件用同一句話、更快更強地說出，約第 11 秒定型——兩件並排，可以直接比較。之後是長吟與氣音。',
    view: ['看扭轉：有音高的聲音才會扭轉，純氣音不會。', '按示範按鈕再做一件；展台最多留下五件，最舊的會被收走。', '「用我的聲音」會在你按下之後才請求麥克風。'],
    rules: ['示範聲音以樂譜已知的音高與氣息參數驅動（不是猜測）；麥克風模式以自相關法估計音高，信度不足就不產生扭轉。', '氣息感來自頻譜平坦度與能量；無聲的氣流只改變孔隙。', '起止偵測有開／關門檻、0.45 秒停頓容忍與 12 秒上限，避免雜訊抖動或無限生長。', '麥克風只在本機分析：不錄音、不上傳、不保存；拒絕或無裝置時回到示範。', '作品不從聲音推斷個性、情緒、健康或身份。'],
    tech: 'three.js r180：MeshPhysicalMaterial 透射玻璃與半透明陶瓷、程序化石膏孔隙；原生 Web Audio 共振峰合成人聲。',
    controls: `<span class="group-label" id="g-demo">示範</span><div class="seg" role="group" aria-labelledby="g-demo"><button data-demo data-value="soft">短句・輕緩</button><button data-demo data-value="urgent">短句・急促</button><button data-demo data-value="long">長吟</button><button data-demo data-value="air">氣音</button></div><button id="mic" aria-pressed="false">用我的聲音</button><button id="export">匯出 PNG</button>`
  },
  {
    file: '07-echo-labyrinth.html', no: '07', js: '07-echo.js', title: '回聲迷宮', subtitle: '房間是聲音走過的路', en: 'Echo Labyrinth',
    accent: '#8fc0d8', theme: 'dark', icon: 'echo',
    canvasLabel: '黑暗中一個聲源發出聲音，回聲返回時照亮一段牆；已照亮的牆會反射之後的聲音。',
    invite: '一個新轉角被回聲照亮，下一次回聲就繞進了原本看不見的通道。',
    statement: '起初只有黑暗和一個聲音。聲音向四周傳出，碰到牆再回來；回聲抵達的那一刻，那一小段牆才被照亮。已經被照亮的牆會反射之後的聲音，讓下一次回聲繞過轉角、走得更遠、照亮更多的房間。聲音揭露空間，空間又改寫聲音。',
    moment: '第一聲（0.4 秒）之後不到一秒，最近的牆就被回聲照亮。聲源每 2.4 秒往未知的方向走一格；走到轉角後，回聲開始沿著已揭露的牆反射，照亮原本看不見的走道。一輪完整的探索約 1.5–2 分鐘，完成後換一座新的迷宮。',
    view: ['每一個亮起的牆段，都對應一個你聽見的回聲：越遠越晚、越暗、越低。', '「發出一個聲音」立即從聲源發聲；點擊地面或用方向鍵移動聲源。', '「換一個起點」把聲源移到另一個房間，已揭露的牆保留。'],
    rules: ['二維路徑模型：聲線從聲源出發，與牆相交得到距離；回聲延遲 = 路徑長 ÷ 傳播速度（縮尺世界每秒 9 單位）。', '未揭露的牆吸收聲線並在回聲抵達時被照亮；已揭露的牆以鏡面反射延續聲線，最多 3 次反射，每次衰減。', '回聲的音量、濾波與聲像由距離、反射次數與方向決定；畫面與聲音都在計算出的抵達時間發生。', '距離下限 0.6、每次發聲最多 18 個回聲、事件數與聲部有上限，不會形成零延遲循環或音訊回授。', '這是創作性的回聲模型，不是測量真實房間的聲學求解器。'],
    tech: 'three.js r180：暗室、局部點光源與牆緣反光；原生 Web Audio 立體聲像與濾波。',
    controls: `<button id="ping">發出一個聲音</button><button id="relocate">換一個起點</button><span class="group-label">點擊地面或用方向鍵移動</span>`
  },
  {
    file: '08-stored-energy.html', no: '08', js: '08-energy.js', title: '能量蓄積', subtitle: '尚未發生的爆發', en: 'Stored Energy',
    accent: '#c2306f', theme: 'light', icon: 'energy',
    canvasLabel: '一個由細線懸吊的白色瓣狀形體逐漸繃緊、膨脹，越過臨界點時翻開，露出內側鮮豔的顏色。',
    invite: '形體快撐不住了，但你不知道是哪一個音會讓它翻開。',
    statement: '中央的形體被細線懸在半空。每一個音都把一點力量注入它：線逐漸繃直，瓣片鼓起，縫隙裡透出內側的顏色。能量會累積，也會在安靜時慢慢流失；越過臨界點的那一刻，形體整個翻開，露出一直藏在背面的鮮豔色彩，停留一段時間，再以不同的排列重新闔上。',
    moment: '預設「平衡」模式約在第 21 秒第一次翻開；之前有兩段刻意的停頓，能量會在安靜中退回去。之後每一輪的翻開時間取決於累積歷史，而不是固定拍點。',
    view: ['注意停頓：安靜時線會鬆一點、內側顏色會退去。', '「注入一次」加入一個音；同樣的音在不同的蓄能狀態下得到不同的反應。', '「脆弱／平衡／穩定」改變臨界點與流失速度。'],
    rules: ['能量以固定步長積分：每個音依力度注入，並以指數速率自然流失；數值有上下界、與幀率無關。', '蓄能控制線的張力、瓣片鼓起、縫隙與內側發光；當下的音只造成局部擾動，不直接決定形體大小。', '越過臨界點觸發翻開並鎖定：翻開 2.8 秒、停留 6 秒、重組 3.5 秒後才重新蓄能，不會在門檻附近連續觸發。', '翻開時的和聲在算出的臨界時刻發聲，音量受包絡與壓縮器限制，不突然變大。', '暫停時能量不再變化。'],
    tech: 'three.js r180：MeshPhysicalMaterial 虹彩內側、即時懸線張力；原生 Web Audio 原創蓄能曲。',
    controls: `<span class="group-label" id="g-mode">模式</span><div class="seg" role="group" aria-labelledby="g-mode"><button data-mode data-value="fragile" aria-pressed="false">脆弱</button><button data-mode data-value="balanced" aria-pressed="true">平衡</button><button data-mode data-value="stable" aria-pressed="false">穩定</button></div><button id="inject">注入一次</button>`
  }
];
