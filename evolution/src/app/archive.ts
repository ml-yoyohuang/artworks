import type { Simulation, Organism } from '../sim';
import { confirmAction, showNotice } from './dialog';
import { downloadJson } from './laboratory';
import { makeRecord, openRecord, WorldStore, type Favourite, type WorldRecord } from './world-record';
import { t } from './i18n';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
export class ChamberArchive {
  private store=new WorldStore();
  private records:{key:string;record:WorldRecord}[]=[];
  private name='';
  private favourites:Favourite[]=[];
  private lastSavedTick=-1;
  private due=performance.now()+30000;
  private busy=false;
  private ready=false;
  private pendingRecovery=false;
  private world?:Simulation;
  private favouriteKey='';
  private revision=0;
  private savedRevision=-1;
  constructor(private getSim:()=>Simulation,private replace:(sim:Simulation)=>void,private pick:(id:number)=>void,private getSelected:()=>Organism|null,private openPanel:()=>void) {
    $('vault-close').onclick=()=>this.setOpen(false);
    $('vault-toggle').onclick=()=>{this.setOpen($('vault-panel').hidden);};
    $('vault-save').onclick=()=>{void this.saveNamed();};
    $('vault-export').onclick=()=>this.export();
    $('vault-new-start').onclick=()=>{this.pendingRecovery=false;$('vault-recovery').hidden=true;this.due=0;this.status('已選擇繼續目前觀察；上次存檔會保留為備份。');};
    $('world-name').onchange=()=>{this.name=$<HTMLInputElement>('world-name').value.trim().slice(0,48);this.revision++;};
    $('spec-favourite').onclick=()=>this.toggleFavourite();
    $('spec-name').oninput=()=>this.rename();
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void this.autosave();});
    void this.init();
  }
  private status(text:string) {$('vault-status').textContent=text;$('save-status').textContent=text;}
  setOpen(open:boolean) {
    if(open)this.openPanel();$('vault-panel').hidden=!open;$('vault-toggle').setAttribute('aria-expanded',String(open));
    (open?$('vault-close'):$('vault-toggle')).focus();
  }
  private async init() {
    try {
      this.records=await this.store.list();this.ready=true;
      this.pendingRecovery=this.records.some(r=>r.key==='autosave'||r.key==='backup');
      $('vault-recovery').hidden=!this.pendingRecovery;
      this.status(this.pendingRecovery?'上次的觀察還在，開啟收藏庫即可續看。':'每30秒自動保存在這台裝置。');
      if(this.pendingRecovery)$('vault-toggle').textContent='續看上次';
      this.render();
    } catch {this.status('本機儲存不可用，請用「匯出檔案」保留觀察。');}
  }
  worldChanged(sim:Simulation) {
    this.world=sim;this.name=`觀察箱 ${sim.cfg.seed}`;this.favourites=[];this.lastSavedTick=-1;this.due=performance.now()+30000;
    this.revision++;this.savedRevision=-1;
    $<HTMLInputElement>('world-name').value=this.name;this.renderFavourites();
  }
  open(value:unknown) {
    const opened=openRecord(value); // Full scientific + metadata validation before replacement.
    this.replace(opened.sim);this.name=opened.name;this.favourites=opened.favourites;
    $<HTMLInputElement>('world-name').value=this.name;
    this.pendingRecovery=false;$('vault-recovery').hidden=true;$('vault-toggle').textContent='收藏與續看';
    this.lastSavedTick=-1;this.due=performance.now()+30000;this.renderFavourites();
  }
  export() {downloadJson(`evolution-${this.getSim().cfg.seed}-${this.getSim().tick}.json`,makeRecord(this.getSim(),this.name,this.favourites));}
  frame(now:number) {if(now>=this.due){this.due=now+30000;void this.autosave();}}
  private async autosave() {
    const sim=this.getSim();
    if(!this.ready||this.busy||this.pendingRecovery||(sim.tick===this.lastSavedTick && this.savedRevision===this.revision))return;
    this.busy=true;
    try {
      const revision=this.revision;
      const record=makeRecord(sim,this.name,this.favourites);
      await this.store.put('autosave',record);
      if(this.world===sim){this.lastSavedTick=record.snapshot.tick;this.savedRevision=revision;this.status(`已自動保存 ${new Date(record.savedAt).toLocaleTimeString('zh-TW',{hour:'2-digit',minute:'2-digit'})} · ${record.snapshot.tick.toLocaleString()} 步`);}
      this.records=await this.store.list();this.render();
    } catch {this.status('自動保存未成功，請先匯出檔案。舊存檔仍會保留。');}
    finally{this.busy=false;}
  }
  private async saveNamed() {
    if(this.busy)return;
    if(!this.ready){this.export();return;}
    if(this.records.filter(r=>r.key.startsWith('world-')).length>=6){await showNotice('收藏庫已滿','最多保留6份命名觀察。請先匯出並移除舊收藏，再新增。');return;}
    this.busy=true;
    try {
      this.name=$<HTMLInputElement>('world-name').value.trim().slice(0,48)||this.name;
      await this.store.put(`world-${Date.now()}`,makeRecord(this.getSim(),this.name,this.favourites));
      this.records=await this.store.list();this.render();this.status('這一刻已加入本機收藏。');
    }catch{this.status('收藏失敗，請改用匯出檔案。');}
    finally{this.busy=false;}
  }
  private render() {
    const list=$('vault-list');list.replaceChildren();
    const sorted=this.records.slice().sort((a,b)=>(b.record?.savedAt||0)-(a.record?.savedAt||0));
    if(!sorted.length){const p=document.createElement('p');p.className='hint';p.textContent='還沒有收藏，喜歡這一刻就把它留下來。';list.append(p);}
    for(const {key,record} of sorted) {
      const row=document.createElement('article');row.className='world-entry';
      const title=document.createElement('strong');title.textContent=record?.name||'無法辨識的收藏';
      const detail=document.createElement('p');detail.className='hint';
      detail.textContent=`${key==='autosave'?'最近自動保存':key==='backup'?'前一份備份':'命名收藏'} · ${Number(record?.snapshot?.tick||0).toLocaleString()} 步 · ${new Date(record?.savedAt||0).toLocaleString('zh-TW')}`;
      const actions=document.createElement('div');actions.className='row';
      const restore=document.createElement('button');restore.className='pill';restore.textContent='接著看';restore.onclick=async()=>{
        try{openRecord(record);if(await confirmAction({title:'接續這份觀察？',message:'將取代眼前的觀察時點。若想留下目前進度，請先取消並匯出檔案。',accept:'接續觀察',cancel:'留在這裡'})){this.open(record);this.status('已接續收藏；切換頁面期間沒有補跑時間。');this.setOpen(false);}}
        catch{await showNotice('這份收藏無法開啟','內容不完整或校驗不一致。請試試前一份備份或另存的檔案；目前觀察箱未被更動。');}
      };
      const exp=document.createElement('button');exp.className='link';exp.textContent='匯出';exp.onclick=()=>downloadJson(`evolution-${key}.json`,record);
      const remove=document.createElement('button');remove.className='link';remove.textContent='移除';remove.onclick=async()=>{
        if(this.busy)return;
        if(!await confirmAction({title:'移除這份本機收藏？',message:'移除後無法復原，建議先匯出檔案。眼前的觀察箱不受影響。',accept:'移除收藏',cancel:'保留收藏'}))return;
        try{await this.store.remove(key);this.records=await this.store.list();this.render();}catch{this.status('目前無法移除，請稍後再試。');}
      };
      actions.append(restore,exp,remove);row.append(title,detail,actions);list.append(row);
    }
  }
  refreshSelected() {
    const o=this.getSelected(),f=this.favourites.find(f=>f.id===o?.id);
    $<HTMLButtonElement>('spec-favourite').disabled=!o;
    $('spec-favourite-label').textContent=f?t('已收藏','Saved'):t('收藏牠','Favourite');$('spec-favourite').setAttribute('aria-pressed',String(!!f));
    const input=$<HTMLInputElement>('spec-name');
    if(document.activeElement!==input)input.value=f?.name||'';
    input.disabled=!f;
    if(!$('vault-panel').hidden)this.renderFavourites();
  }
  private toggleFavourite() {
    const o=this.getSelected();if(!o)return;
    const i=this.favourites.findIndex(f=>f.id===o.id);
    if(i>=0)this.favourites.splice(i,1);
    else if(this.favourites.length<100)this.favourites.push({id:o.id,name:'',type:o.type,birthTick:o.birthTick});
    else{void showNotice('收藏名單已滿','每箱可收藏100個體，請先取消一位收藏。');return;}
    this.revision++;this.refreshSelected();this.renderFavourites();
  }
  private rename() {
    const o=this.getSelected(),f=this.favourites.find(f=>f.id===o?.id);if(!f)return;
    f.name=$<HTMLInputElement>('spec-name').value.trim().slice(0,32);this.revision++;this.renderFavourites();
  }
  selectedName(id:number) {return this.favourites.find(f=>f.id===id)?.name;}
  private renderFavourites() {
    const living=new Set(this.getSim().orgs.map(o=>o.id));
    const key=JSON.stringify(this.favourites.map(f=>[f.id,f.name,living.has(f.id)]));
    if(key===this.favouriteKey)return;this.favouriteKey=key;
    const list=$('favourite-list');list.replaceChildren();
    if(!this.favourites.length){list.textContent='點選一個生物，按星號收藏牠；可以給牠取個暱稱。';return;}
    for(const f of this.favourites){const b=document.createElement('button');b.className='favourite-item';b.textContent=`${f.name||`第 ${f.id} 號`} · ${living.has(f.id)?'仍在活動':'已離開'} #${f.id}`;b.onclick=()=>{
      if(living.has(f.id)){this.pick(f.id);this.setOpen(false);}
      else void showNotice(f.name||`第 ${f.id} 號`,'牠已不在現存名單，收藏的名字仍留在這份觀察裡。研究筆記可查詢目前保留的家族資料。');
    };list.append(b);}
  }
}
