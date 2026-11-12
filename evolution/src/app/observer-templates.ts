/** Complete lines with distinct emotional registers; placeholders contain measured facts only. */
export const LIVE_TEMPLATES = {
  start: [
    '{reason}。筆記本打開了！從第 {tick} 個模擬步、{population} 個生命開始，陪你看看今天會冒出什麼故事。',
    '{reason}。先記下眼前這一刻：第 {tick} 個模擬步，現存 {population} 個體。接下來，我會留意那些小小的改變。',
    '{reason}！鏡頭就位，咖啡也就位。第 {tick} 個模擬步有 {population} 個生命，今天先不替任何一群預寫結局。',
    '{reason}。我們在第 {tick} 個模擬步加入觀察，目前 {population} 個生命。以前的故事先留白，從現在開始認識牠們。',
    '{reason}。這片水域此刻住著 {population} 個生命；觀察起點是第 {tick} 個模擬步。我想先安靜看一會兒。',
    '{reason}，新的一頁！第 {tick} 個模擬步，{population} 個體。誰的後代會讓我們停下手邊的事？一起等看看。',
  ],
  extinction: [
    '……最後一個生命也停下來了。觀察箱全滅。我先把筆放下來一下；這一輪留下的問題，還值得慢慢追究。',
    '記錄一個沉重的時點：現存個體歸零，觀察箱全滅。光憑這一幕，還無法把原因寫定。',
    '這次真的安靜下來了，觀察箱全滅。剛才還在游動的小身影，如今都不在了。我有點捨不得翻過這一頁。',
    '現存數量來到零，這一輪全滅。沒有最後的贏家；若要再試一次，我想先帶著更明確的問題出發。',
    '沒有活體了。觀察箱全滅，我們看到的故事暫時停在這裡。接下來值得做的，是回頭對照食物、出生和死亡紀錄。',
    '全滅。這條紀錄我寫得很慢：眼前已沒有任何生命。結果不如期待，但它仍是這次實驗真實的一部分。',
  ],
  typeExtinction: [
    '有點捨不得報這一條：{type}的現存數量歸零了。其餘生物還在活動，牠們在這個觀察時點則已退場。',
    '名單上少了一群：目前找不到活著的{type}了。先記下這個變化，原因還得對照其他紀錄。',
    '剛才確認了，{type}已沒有現存個體。看著熟悉的顏色消失，還是會愣一下；另外的生命仍在繼續。',
    '{type}這一欄現在是零。我不想倉促替牠們下評語，這段退場前的變化值得仔細重看。',
    '這次觀察少了一位主角：{type}的現存數量降到零。剩下的族群，會讓局面走向哪裡？',
    '插播一條低聲的消息：{type}現存個體歸零。牠們曾在這裡活動，這個時點則已不見活體。',
  ],
  milestone: [
    '族群越過 {milestone} 個體，目前有 {population} 個生命。觀察箱愈來愈熱鬧了！',
    '{milestone} 的門檻跨過去了！眼前共 {population} 個體，我差點來不及在筆記上畫線。',
    '記一個人口里程碑：跨過 {milestone}，目前 {population} 個體。數量成長是一件事，接下來能維持多久是另一件事。',
    '水域裡又擠了一點：人口跨過 {milestone}，來到 {population}。先替新生命高興一下，再盯盯食物夠不夠。',
    '抬頭一看，竟然已經越過 {milestone} 了。現在有 {population} 個生命，今天這頁恐怕得多留幾行。',
    '新里程碑，{milestone}！現存 {population} 個體。熱鬧歸熱鬧，我還想知道是哪幾條支系撐起了這波成長。',
  ],
  crash: [
    '情勢突然緊繃起來了！上一段記錄後，生命數量掉了超過四成，從 {before} 降到 {population}。{environment}原因仍待追查。',
    '先停一下，這段降幅值得注意：{before} → {population}，少了超過四成。{environment}我還不能把這兩件事直接寫成因果。',
    '眼前空了不少，數量從 {before} 降到 {population}，降幅超過四成。{environment}這一段我會畫上問號，而不是急著填答案。',
    '這回不能只當成小波動了：上一段以來人口下跌超過四成，現在 {population} 個體，先前是 {before}。{environment}值得回看出生與死亡紀錄。',
    '糟糕了，人口掉得比我預期快：{before} 變成 {population}，超過四成不見了。{environment}我替牠們緊張，但還得把推測和證據分開。',
    '記下一次明顯收縮：{before} 個體降至 {population}，超過四成的減幅。{environment}哪個環節先變了？這是接下來想查的問題。',
  ],
  scarcity: [
    '食物警報！{food}只剩容量的 {amount}。{consumer}接下來會怎麼過？我開始替牠們捏把冷汗了。',
    '{food}存量降到 {amount}，已進入稀少區間。先留意{consumer}，看看族群之後如何變化。',
    '餐桌有點空了：{food}剩 {amount}。想到{consumer}還得靠這份食物過日子，我忍不住又看了一眼牠們。',
    '這條要圈起來，{food}只餘 {amount}。{consumer}面對的供應變少了，接下來會不會出現轉折？',
    '供應吃緊：{food}降至容量的 {amount}。對{consumer}來說，這是值得追蹤的環境變化；此刻還不能宣布誰會倒下。',
    '哎呀，{food}快見底了，現在是容量的 {amount}。{consumer}還撐得住嗎？我想把鏡頭多留在這一群一會兒。',
  ],
  recovery: [
    '呼，{food}回升到容量的 {amount}了！餐桌比剛才豐盛一些，會不會迎來新一波出生潮？繼續看。',
    '供應出現回升：{food}來到 {amount}，已離開剛才的稀少區間。族群是否跟著變化，還需要時間。',
    '總算有個讓我鬆口氣的消息，{food}補回到 {amount}。這次食物先回來了，後面的故事會怎麼接？',
    '把剛才的食物警報做個註記：{food}現在有 {amount}。情況比先前緩和，但我還不急著把問號擦掉。',
    '{food}回來了一些，存量達容量的 {amount}。先把這個回升時點記好，等會兒對照出生與族群紀錄。',
    '餐桌重新有了餘裕！{food}回升至 {amount}。我很想替牠們慶祝，不過誰能接住這波供應，還得繼續觀察。',
  ],
  leader: [
    '{type}拉開差距了！現存生命裡超過一半都是牠們。{environment}這個數量優勢能維持多久？我不敢太早宣布勝負。',
    '數量版圖有了明顯重心：{type}佔 {share}。{environment}這是人口上的優勢，還不是某項特徵成功的證明。',
    '哇，{type}已經佔到 {share}！{environment}先記牠們領先，別的支系還會不會追上來？',
    '{type}目前佔 {share}，越過了過半門檻。{environment}我把這一刻標好，想看看領先能延續幾代。',
    '鏡頭裡的主色調開始偏向{type}，牠們佔了 {share}。{environment}熱鬧背後，還得追追哪些支系留下了後代。',
    '這份數量優勢不小：{type}來到 {share}。{environment}我有點好奇，這會是長篇章的開頭，還是短暫的一幕？',
  ],
  overtake: [
    '逆轉了！{type}在數量上超過{rival}，搶到目前的首位。{environment}這回先記牠們領先一分；數量排名還不能證明是哪個特徵幫了忙。',
    '首位換人：{type}的人口超過{rival}。{environment}這是當下的數量排序，還不能據此判定原因。',
    '等等，領先的換成{type}了！牠們在數量上越過{rival}。{environment}這下我又捨不得移開視線了。',
    '把剛才的排名改一下：{type}超過{rival}，目前人數最多。{environment}我想知道這次換位能維持多久。',
    '小小的拉鋸出現轉折，{type}在人口上反超{rival}。{environment}先替這一刻做記號，還不替任何生存策略頒獎。',
    '這輪是{type}站到前面了，數量已超過{rival}。{environment}我能確認的是排名逆轉；背後的解釋，得留給更多紀錄。',
  ],
  featureNew: [
    '等等，這次觀察還沒見過這個外形！{actor}，{change}。這是出生時的遺傳變化，可不是原地變身。我很好奇，這條支系接下來能不能留下更多後代？',
    '新增一筆外形紀錄：{actor}，{change}。子代出生時就帶著這個差異；這是本次觀察首次遇見的輪廓，先記下來。',
    '快靠近看！{actor}帶來了這次觀察的新面孔：{change}。變化出現在親子之間，我差點把這頁筆記寫歪了。',
    '今天的外形名單多了一格。{actor}，{change}。這個出生差異先前還沒在本次觀察裡出現；它會留下多少後代呢？',
    '有個小發現：{actor}，{change}。不是活體突然變形，而是子代帶著不同輪廓出生。我想安靜追牠一段。',
    '這一筆值得畫顆星：{actor}，{change}！這是本次首次見到的外形、發生在出生時。搶眼是一回事，支系能否延續又是另一回事。',
  ],
  featureKnown: [
    '快看，子代帶來了一點新花樣！{actor}，{change}。這個輪廓之前見過，這一對親子仍留下了新的出生差異。',
    '親子比較更新：{actor}，{change}。是出生時的角瓣差異，並非新的物種，也不是活體正在變形。',
    '又有一個小傢伙沒照親代的輪廓長！{actor}，{change}。這次不是首次見到這種外形，但我還是想看看牠的後代。',
    '熟悉的外形，出現在另一個子代身上：{actor}，{change}。把這次出生差異記好，別和整群形態的改變混在一起。',
    '這對親子有一點不同。{actor}，{change}。差異在出生時就存在，先不替它貼上更好或更壞的標籤。',
    '筆記邊上再添一筆：{actor}，{change}。這個角瓣數先前出現過；我更好奇的是，這次由哪條支系把它接下去。',
  ],
  trait: [
    '子代的遺傳特徵有了明顯差異：{actor}，{change}。光看這個數值，還不知道牠能否留下更多後代。',
    '喔，這個差距值得多看一眼！{actor}，{change}。這是親子間的遺傳值差異，不是眼前表現的勝負判定。',
    '記一組親子對照：{actor}，{change}。先把測到的差異寫下來，至於有沒有優勢，暫時留白。',
    '外形之外也有故事。{actor}，{change}。子代帶來了不同的遺傳特徵，我想知道環境會讓這條支系走多遠。',
    '這個新生個體讓我停了一下：{actor}，{change}。變大、變快或看得遠都不自動等於成功，後面才是值得追的部分。',
    '親代與子代的數值沒有完全重合：{actor}，{change}。我把這個遺傳差異圈起來，等後代的紀錄慢慢補上答案。',
  ],
  grow: [
    '又熱鬧起來了！生命數量比上次多了 {delta} 個。{ranking}{births}看看這股成長會走多遠。',
    '人口正在往上走，這段增加 {delta} 個，目前 {population}。{ranking}{births}先記下成長，不急著叫它繁榮。',
    '一轉眼又多了 {delta} 個生命，眼前共 {population} 個體！{ranking}{births}今天的筆記越寫越擠。',
    '和上一段相比，現存多出 {delta} 個體。{ranking}{births}我想再看看，食物與支系組成會不會跟著改變。',
    '這片水域更熱鬧了一些，淨增 {delta} 個生命。{ranking}{births}每一條延續中的支系，都還有故事。',
    '人口帳上添了 {delta}，總數來到 {population}。{ranking}{births}下一段會繼續往上，還是開始拉鋸？',
  ],
  fall: [
    '這段時間少了一些身影，現存比上次減少 {delta} 個。{ranking}{births}我會再留意接下來的變化。',
    '人口回落了 {delta}，目前剩 {population} 個體。{ranking}{births}先別只看總數，出生與死亡的節奏也值得對照。',
    '剛才還很熱鬧，這一段卻淨少 {delta} 個生命。{ranking}{births}我有點在意，是哪些支系的數量正在變動？',
    '記錄一次收縮：比上段少 {delta} 個，總數 {population}。{ranking}{births}原因不能靠一行人口數就定案。',
    '水域稍微空了一點，現存減少 {delta} 個。{ranking}{births}先把這個轉折記好，看看它會不會延續。',
    '這次數量往下走，淨減 {delta} 個體。{ranking}{births}希望下一段能讓我們更看清楚這次變化。',
  ],
  steady: [
    '總數暫時沒變，但故事未必停下。{ranking}{births}我還是想繼續看這些支系怎麼延續。',
    '和上一段同樣是 {population} 個體。{ranking}{births}總量持平，可不表示每一個生命都還是原來那個。',
    '人口帳這回剛好打平，現存 {population}。{ranking}{births}表面平靜，細看也許有不同的變化。',
    '這一段總數沒有增減。{ranking}{births}我把鏡頭留給個體，想看看這份平衡底下的流動。',
    '又數了一遍，仍是 {population} 個生命。{ranking}{births}沒有大幅增減的時候，正好看看不那麼搶眼的支系。',
    '現存維持 {population} 個體。{ranking}{births}這份安靜會持續多久？今天先不替它下結論。',
  ],
  resource: [
    '把目光轉向餐桌：{environment}誰能把找到的食物換成下一代？這是我想繼續追的問題。',
    '食物巡查時間。{environment}人口和供應接下來會怎麼拉鋸，我先留一行空白等它。',
    '先別只盯著誰游得快，也看看補給。{environment}這份背景，值得和稍後的族群變化一起讀。',
    '記下現在的食物狀況：{environment}供應的多寡會進入能量帳，但不能只靠這個截面解釋整段歷史。',
    '我把鏡頭從細胞移到食物上了。{environment}下一個轉折，會不會先在這裡露出一點線索？',
    '來查查今天的餐桌。{environment}先把這頁做好記號，等下一段出生與人口紀錄來對照。',
  ],
  morphology: [
    '來，靠近一點看外形。{detail}。這是現存族群的組成；我想追的是哪條支系留下來，不只是誰長得搶眼。',
    '形態巡查：{detail}。平均值描出整群的樣貌，不代表單一細胞正在變身。',
    '今天輪廓的重心在這裡：{detail}。看著一群細胞慢慢換了組成，有時比突然的驚喜更讓我著迷。',
    '把放大鏡借我一下：{detail}。這是活體的平均外形資料，我還想對照親子紀錄看。',
    '先記一張族群合照：{detail}。合照裡的平均輪廓，還得靠個別支系的故事來補細節。',
    '外形這一頁有了新的讀數：{detail}。它說的是現存組成，不能直接當成哪種外形比較成功的答案。',
  ],
  morphologyAbsent: [
    '鏡頭裡目前沒有{absentTypes}。{presentTypes}的後代會把這片水域帶往哪裡？我把問題留在筆記邊上。',
    '這次巡查，{absentTypes}沒有現存個體。先把缺席如實記下，眼前仍有{presentTypes}值得追。',
    '觀察名單留了空白：目前沒有{absentTypes}。這片水域接下來的故事，由眼前的{presentTypes}繼續寫。',
    '現在看不到{absentTypes}，我想把注意力交還給仍在活動的{presentTypes}，陪牠們多走一段。',
    '名單上缺席的是{absentTypes}，仍在活動的是{presentTypes}。每次看到這樣的空白，我都想回頭多讀幾頁紀錄。',
    '這個時點，{absentTypes}不在現存名單。{presentTypes}的支系還會帶來什麼差異呢？我會繼續留意。',
  ],
} as const;

export type LiveTopic = keyof typeof LIVE_TEMPLATES;
export class LiveNarrator {
  private positions = new Map<LiveTopic,number>();
  next(topic: LiveTopic, facts: Record<string,string|number>): string {
    const templates=LIVE_TEMPLATES[topic], position=this.positions.get(topic) ?? 0;
    this.positions.set(topic,position+1);
    return templates[position % templates.length].replace(/\{(\w+)\}/g,(_,key:string)=>{
      if(facts[key]===undefined) throw new Error(`Missing observer fact: ${topic}.${key}`);
      return String(facts[key]);
    });
  }
}
