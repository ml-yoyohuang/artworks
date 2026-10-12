// Render editorial share cards as 1200x630 JPEGs using the actual artwork previews.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs'),path=require('path');
const root=__dirname,base=process.env.VOL1_LOCAL_URL || 'http://127.0.0.1:8766/sound/vol1/';
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
(async()=>{
 const browser=await chromium.launch({headless:true});
 try{
  fs.mkdirSync(path.join(root,'assets/og'),{recursive:true});
  for(const card of JSON.parse(fs.readFileSync(path.join(root,'og-data.json')))){
   const p=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
   await p.setContent(`<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><style>
   *{box-sizing:border-box}body{margin:0;background:#f4f1e9;color:#272b27;font-family:'PingFang TC',sans-serif}
   header{height:74px;margin:0 42px;border-bottom:1px solid #d4d0c4;display:flex;align-items:center;justify-content:space-between;font-size:12px;letter-spacing:2px}
   main{display:grid;grid-template-columns:400px 1fr;gap:30px;margin:31px 42px 0;height:439px;align-items:center}
   .eyebrow{color:#b0442a;font-size:11px;letter-spacing:1.5px;line-height:1.7;max-width:330px;margin:0 0 26px}
   h1{font:400 ${card.id==='index'?'60':'65'}px/1.3 'Songti TC',serif;letter-spacing:2px;margin:0 0 22px}
   .subtitle{font:400 24px/1.6 'Songti TC',serif;color:#656a61;margin:0 0 27px;max-width:370px}
   .description{font-size:14px;line-height:2;color:#74766c;margin:0;max-width:340px}
   img{width:100%;height:439px;object-fit:cover;display:block}
   footer{height:55px;margin:30px 42px 0;border-top:1px solid #d4d0c4;display:flex;justify-content:space-between;align-items:center;font-size:10px;letter-spacing:1.4px;color:#74766c}
   </style><header><b>SOUND / VOL. 1</b><span>聲音・空間・能量</span></header><main><div><p class="eyebrow">${card.id==='index'?'VOLUME ONE':card.id+' / 08'}<br>${esc(card.en)}</p><h1>${esc(card.title)}</h1><p class="subtitle">${card.id==='index'?'':'《'}${esc(card.subtitle)}${card.id==='index'?'':'》'}</p><p class="description">${esc(card.description)}</p></div><img src="${base+card.preview}" alt=""></main><footer><span>GENERATIVE SOUND ART</span><span>聲音成為物質 / 2026</span></footer></html>`);
   await p.evaluate(async()=>{await document.fonts.ready;await document.querySelector('img').decode()});
   await p.screenshot({path:path.join(root,'assets/og',card.id+'.jpg'),type:'jpeg',quality:92});
   await p.close();console.log('OG '+card.id+' 1200x630');
  }
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
