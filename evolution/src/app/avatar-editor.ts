import {AVATAR_FIELDS,DEFAULT_AVATAR,PART_NAMES,PART_POSITION,avatarDocument,parseAvatar,renderResearcher,type AvatarKey,type AvatarPart,type AvatarParameters,type AvatarField} from './researcher-avatar';
import {installSelectControls} from './select-control';
import {avatarStyleAt} from './avatar-time';

const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const storageKey='evolution-researcher-draft-v1';
let state={...DEFAULT_AVATAR},selected:AvatarPart='hair';
const undo:AvatarParameters[]=[],redo:AvatarParameters[]=[];
let drag:{x:number;y:number;before:AvatarParameters;part:AvatarPart}|undefined;
let pendingNumber:AvatarParameters|undefined;
let refreshSelects=()=>{};
try {const saved=localStorage.getItem(storageKey);if(saved){state=parseAvatar(JSON.parse(saved));$('draft-status').textContent='已接續你上次微調的草稿。確認後再套用到觀察箱。';}}catch{$('draft-status').textContent='草稿無法讀取，先以這次的新造型開始。';}
const fieldEntries=Object.entries(AVATAR_FIELDS) as [AvatarKey,AvatarField][];
const partButtons=$('part-buttons');
for(const [part,name] of Object.entries(PART_NAMES)) {const b=document.createElement('button');b.type='button';b.className='pill';b.dataset.part=part;b.textContent=name;b.onclick=()=>select(part as AvatarPart);partButtons.append(b);}
for(const [key,field] of fieldEntries) {
  const label=document.createElement('label');label.className=`avatar-field${typeof field.value==='boolean'?' check':''}`;label.dataset.field=key;label.dataset.section=field.part;
  if(typeof field.value==='number') {
    const head=document.createElement('span');head.className='avatar-field-header';const text=document.createElement('span');text.textContent=field.label;
    const number=document.createElement('input');number.type='number';number.id=`number-${key}`;number.min=String(field.min);number.max=String(field.max);number.step=String(field.step);number.setAttribute('aria-label',`${field.label}數值`);
    const range=document.createElement('input');range.type='range';range.id=`field-${key}`;range.min=number.min;range.max=number.max;range.step=number.step;range.setAttribute('aria-label',field.label);
    range.onpointerdown=()=>{pendingNumber={...state};};
    range.oninput=()=>{if(!pendingNumber)pendingNumber={...state};set(key,Number(range.value));number.value=range.value;draw();};
    range.onchange=()=>{commit(pendingNumber);pendingNumber=undefined;};
    number.onfocus=()=>{pendingNumber={...state};};
    number.oninput=()=>{if(number.value!==''&&Number.isFinite(number.valueAsNumber)){set(key,Math.min(field.max!,Math.max(field.min!,number.valueAsNumber)));range.value=String(state[key]);draw();}};
    number.onchange=()=>{number.value=String(state[key]);commit(pendingNumber);pendingNumber=undefined;};head.append(text,number);label.append(head,range);
  } else if(typeof field.value==='boolean') {
    const input=document.createElement('input');input.type='checkbox';input.id=`field-${key}`;input.onchange=()=>change(key,input.checked);label.append(input,document.createTextNode(field.label));
  } else if(field.choices) {
    const head=document.createElement('span');head.className='avatar-field-header';head.textContent=field.label;const select=document.createElement('select');select.id=`field-${key}`;
    field.choices.forEach((value,i)=>{const option=document.createElement('option');option.value=value;option.textContent=field.names?.[i]??value;select.append(option);});select.onchange=()=>change(key,select.value);label.append(head,select);
  } else {
    const head=document.createElement('span');head.className='avatar-field-header';head.textContent=field.label;const input=document.createElement('input');input.type='color';input.id=`field-${key}`;input.onfocus=()=>{pendingNumber={...state};};input.oninput=()=>{if(!pendingNumber)pendingNumber={...state};set(key,input.value);draw();};input.onchange=()=>{commit(pendingNumber);pendingNumber=undefined;};label.append(head,input);
  }
  $('field-controls').append(label);
}
function set(key:AvatarKey,value:number|string|boolean) {(state as Record<string,unknown>)[key]=key==='hairCurls'?Math.round(Number(value)):value;}
function commit(before:AvatarParameters|undefined) {if(before&&JSON.stringify(before)!==JSON.stringify(state)){undo.push(before);if(undo.length>50)undo.shift();redo.length=0;}persist();draw();}
function change(key:AvatarKey,value:number|string|boolean) {const before={...state};set(key,value);commit(before);syncFields();}
function persist() {try{localStorage.setItem(storageKey,JSON.stringify(avatarDocument(state)));}catch{$('draft-status').textContent='本機保存不可用，請複製或下載參數保留這次微調。';}}
function syncFields() {
  for(const [key,field] of fieldEntries) {
    const input=$<HTMLInputElement|HTMLSelectElement>(`field-${key}`);
    if(typeof field.value==='boolean')(input as HTMLInputElement).checked=state[key] as boolean;
    else input.value=String(state[key]);
    const number=document.getElementById(`number-${key}`) as HTMLInputElement|null;if(number&&number!==document.activeElement)number.value=String(state[key]);
  }
  refreshSelects();
}
function select(part:AvatarPart) {
  selected=part;$('part-title').textContent=PART_NAMES[part];
  document.querySelectorAll<HTMLElement>('[data-section]').forEach(el=>el.hidden=el.dataset.section!==part);
  partButtons.querySelectorAll<HTMLButtonElement>('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.part===part)));
  $('part-hint').textContent=part==='glasses'?'鏡片維持不透光，不會露出眼睛。可調整反光亮度、寬度與鏡框輪廓。':part==='hair'?'蓬亂程度讓左右捲髮更不對稱；捲度起伏決定輪廓有多炸。':part==='mouth'?'弧度為0就是橫線嘴巴；正負值可微調嘴角。':part==='colours'?'顏色會同步顯示在大圖和實際頭像大小。':'可直接拖曳預覽中的部位，或使用位置與比例數值。';
  draw();
}
function draw() {
  const timeMs=Date.now();
  $('avatar-art').innerHTML=renderResearcher(state,{editable:true,prefix:'editor',timeMs});$('avatar-small').innerHTML=renderResearcher(state,{prefix:'small',timeMs});
  $<HTMLTextAreaElement>('parameters').value=JSON.stringify(avatarDocument(state),null,2);
  $<HTMLButtonElement>('undo').disabled=!undo.length;$<HTMLButtonElement>('redo').disabled=!redo.length;selectionBox();
}
function selectionBox() {
  const group=$('avatar-art').querySelector<SVGGElement>(`[data-part="${selected}"]`),box=$('selection-box');box.hidden=!group||!$<HTMLInputElement>('show-guides').checked;
  if(group&&!box.hidden){const r=group.getBoundingClientRect(),s=$('avatar-stage').getBoundingClientRect();Object.assign(box.style,{left:`${r.left-s.left-5}px`,top:`${r.top-s.top-5}px`,width:`${r.width+10}px`,height:`${r.height+10}px`});}
}
function point(e:PointerEvent) {const svg=$('avatar-art').querySelector('svg')!,p=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM()!.inverse());return p;}
const stage=$('avatar-stage');
stage.onpointerdown=e=>{
  const part=(e.target as Element).closest<SVGGElement>('[data-part]')?.dataset.part as AvatarPart|undefined;if(!part||!PART_POSITION[part])return;
  e.preventDefault();select(part);const p=point(e);drag={x:p.x,y:p.y,before:{...state},part};stage.setPointerCapture(e.pointerId);stage.classList.add('dragging');stage.focus();
};
stage.onpointermove=e=>{if(!drag)return;const p=point(e),keys=PART_POSITION[drag.part]!;for(const [i,key] of keys.entries()){const field=AVATAR_FIELDS[key] as AvatarField;const delta=i?p.y-drag.y:p.x-drag.x;set(key,Math.round(Math.min(field.max!,Math.max(field.min!,Number(drag.before[key])+delta))*2)/2);}syncFields();draw();};
const finish=()=>{if(drag){const before=drag.before;drag=undefined;stage.classList.remove('dragging');commit(before);}};stage.onpointerup=finish;stage.onpointercancel=finish;
stage.onkeydown=e=>{
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)||!PART_POSITION[selected])return;e.preventDefault();
  const keys=PART_POSITION[selected]!,key=keys[e.key==='ArrowLeft'||e.key==='ArrowRight'?0:1],field=AVATAR_FIELDS[key] as AvatarField,delta=(e.key==='ArrowUp'||e.key==='ArrowLeft'?-1:1)*(e.shiftKey?5:1);
  change(key,Math.min(field.max!,Math.max(field.min!,Number(state[key])+delta)));
};
$('show-guides').onchange=selectionBox;window.addEventListener('resize',selectionBox);
$('undo').onclick=()=>{const previous=undo.pop();if(previous){redo.push({...state});state=previous;syncFields();persist();draw();}};
$('redo').onclick=()=>{const next=redo.pop();if(next){undo.push({...state});state=next;syncFields();persist();draw();}};
$('reset-part').onclick=()=>{const before={...state};for(const [key,field] of fieldEntries)if(field.part===selected)set(key,DEFAULT_AVATAR[key]);commit(before);syncFields();};
$('reset-all').onclick=()=>{const before={...state};state={...DEFAULT_AVATAR};commit(before);syncFields();};
const copyParameters=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(avatarDocument(state),null,2));$('draft-status').textContent='參數已複製。貼回對話，我就能套用你的版本。';}catch{$<HTMLDetailsElement>('parameter-details').open=true;$<HTMLTextAreaElement>('parameters').select();$('draft-status').textContent='已選取參數，請按 Ctrl/Cmd+C 複製，再貼回對話。';}};
$('copy-parameters').onclick=copyParameters;$('copy-parameters-bottom').onclick=copyParameters;
function download(name:string,text:string,type:string) {const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('download-parameters').onclick=()=>download('researcher-parameters.json',JSON.stringify(avatarDocument(state),null,2),'application/json');
$('download-svg').onclick=()=>download('researcher.svg',renderResearcher(state,{timeMs:Date.now()}),'image/svg+xml');
$('import-parameters').onclick=()=>$('parameter-file').click();
$<HTMLInputElement>('parameter-file').onchange=async e=>{const input=e.target as HTMLInputElement,file=input.files?.[0];if(!file)return;try{if(file.size>100000)throw new Error('參數檔案太大，請選擇工具匯出的JSON。');const next=parseAvatar(JSON.parse(await file.text())),before={...state};state=next;commit(before);syncFields();$('draft-status').textContent='已讀入參數，可繼續微調或複製給我。';}catch(error){$('draft-status').textContent=`沒有更動草稿：${error instanceof Error?error.message:'檔案無法讀取。'}`;}finally{input.value='';}};
syncFields();refreshSelects=installSelectControls();select(selected);
let timedStyle=JSON.stringify(avatarStyleAt(Date.now()));
setInterval(()=>{if(document.hidden||drag)return;const next=JSON.stringify(avatarStyleAt(Date.now()));if(next!==timedStyle){timedStyle=next;if(state.accessoryType==='cycle'||state.glassesShape==='daily')draw();}},1000);
