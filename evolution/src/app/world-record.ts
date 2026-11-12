import { Simulation, type Snapshot } from '../sim';

export interface Favourite { id:number; name:string; type:number; birthTick:number }
export interface WorldRecord {
  format:'evolution-world'; version:1; name:string; savedAt:number; hash:number;
  snapshot:Snapshot; favourites:Favourite[];
}
export function makeRecord(sim:Simulation,name:string,favourites:Favourite[]):WorldRecord {
  return {format:'evolution-world',version:1,name:name.trim().slice(0,48)||`觀察箱 ${sim.cfg.seed}`,savedAt:Date.now(),hash:sim.stateHash(),snapshot:sim.snapshot(),favourites:favourites.slice(0,100).map(f=>({...f}))};
}
/** Validate the entire replacement before the live chamber is touched. Legacy snapshots still open. */
export function openRecord(value:unknown):{sim:Simulation;name:string;favourites:Favourite[]} {
  const record=value as Partial<WorldRecord>|null;
  if(record && record.format==='evolution-world') {
    if(record.version!==1 || typeof record.name!=='string' || record.name.length>48 || !Number.isFinite(record.savedAt) || !Number.isInteger(record.hash) || !Array.isArray(record.favourites) || record.favourites.length>100) throw new Error('觀察箱檔案格式不完整。');
    const sim=Simulation.restore(record.snapshot!);
    if(sim.stateHash()!==record.hash) throw new Error('觀察箱校驗不一致，請改用前一份備份。');
    const ids=new Set<number>();
    for(const f of record.favourites) {
      if(!f || !Number.isSafeInteger(f.id) || f.id<0 || ids.has(f.id) || typeof f.name!=='string' || f.name.length>32 || !Number.isInteger(f.type) || f.type<0 || f.type>2 || !Number.isSafeInteger(f.birthTick) || f.birthTick<0) throw new Error('收藏紀錄格式不完整。');
      ids.add(f.id);
    }
    return {sim,name:record.name,favourites:record.favourites.map(f=>({...f}))};
  }
  const sim=Simulation.restore(value as Snapshot);
  return {sim,name:`觀察箱 ${sim.cfg.seed}`,favourites:[]};
}

export class WorldStore {
  private db?:Promise<IDBDatabase>;
  private connection():Promise<IDBDatabase> {
    if(!this.db) this.db=new Promise((resolve,reject)=>{
      const request=indexedDB.open('evolution-chambers',1);
      request.onupgradeneeded=()=>request.result.createObjectStore('worlds');
      request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();this.db=undefined;};resolve(db);};
      request.onerror=()=>{this.db=undefined;reject(request.error);};
      request.onblocked=()=>reject(new Error('另一個視窗正在更新收藏庫，請先關閉它再試。'));
    });
    return this.db;
  }
  async list():Promise<{key:string;record:WorldRecord}[]> {
    const db=await this.connection();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('worlds','readonly'), store=tx.objectStore('worlds');
      const keys=store.getAllKeys(),values=store.getAll();
      tx.oncomplete=()=>resolve(keys.result.map((key,i)=>({key:String(key),record:values.result[i]})));
      tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  async put(key:string,record:WorldRecord):Promise<void> {
    const db=await this.connection();
    return new Promise((resolve,reject)=>{
      const tx=db.transaction('worlds','readwrite'),store=tx.objectStore('worlds');
      // Atomic two-generation autosave: a failed transaction preserves both old slots.
      if(key==='autosave') {const old=store.get(key);old.onsuccess=()=>{if(old.result) store.put(old.result,'backup');store.put(record,key);};}
      else store.put(record,key);
      tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    });
  }
  async remove(key:string):Promise<void> {
    const db=await this.connection();
    return new Promise((resolve,reject)=>{const tx=db.transaction('worlds','readwrite');tx.objectStore('worlds').delete(key);tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);});
  }
}
