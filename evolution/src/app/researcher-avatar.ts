import {avatarStyleAt} from './avatar-time';
/** Hand-authored mascot geometry shared by the adjustment tool and the shipped SVG. */
export type AvatarPart='hair'|'glasses'|'mouth'|'head'|'coat'|'accessory'|'colours';
interface Field {part:AvatarPart;label:string;value:number|string|boolean;min?:number;max?:number;step?:number;choices?:readonly string[];names?:readonly string[]}
export type AvatarField=Field;
export const AVATAR_FIELDS={
  hairX:{part:'hair',label:'左右位置',value:62,min:28,max:100,step:.5},
  hairY:{part:'hair',label:'上下位置',value:24.5,min:-2,max:56,step:.5},
  hairWidth:{part:'hair',label:'蓬鬆寬度',value:119,min:70,max:154,step:1},
  hairHeight:{part:'hair',label:'蓬鬆高度',value:68,min:28,max:94,step:1},
  hairCurls:{part:'hair',label:'捲髮團數',value:12,min:6,max:22,step:1},
  hairDepth:{part:'hair',label:'捲度起伏',value:.16,min:.02,max:.24,step:.01},
  hairChaos:{part:'hair',label:'蓬亂程度',value:.16,min:0,max:.5,step:.01},
  hairTilt:{part:'hair',label:'歪斜角度',value:-4,min:-30,max:30,step:1},
  hairStyle:{part:'hair',label:'髮型輪廓',value:'cloud',choices:['cloud','tufts'],names:['蓬鬆雲朵','炸毛捲髮']},
  glassesX:{part:'glasses',label:'左右位置',value:64,min:24,max:104,step:.5},
  glassesY:{part:'glasses',label:'上下位置',value:63.5,min:40,max:86,step:.5},
  glassesRadius:{part:'glasses',label:'鏡框大小',value:18,min:10,max:28,step:.5},
  glassesSpacing:{part:'glasses',label:'鏡片間距',value:43,min:24,max:64,step:.5},
  glassesAspect:{part:'glasses',label:'鏡片高寬比',value:1,min:.6,max:1.4,step:.02},
  glassesStroke:{part:'glasses',label:'鏡框粗細',value:3.5,min:1,max:6,step:.1},
  glassesTilt:{part:'glasses',label:'歪斜角度',value:0,min:-20,max:20,step:1},
  glassesShape:{part:'glasses',label:'鏡框形狀',value:'daily',choices:['daily','round','rounded','angular'],names:['依星期輪換（三種）','圓框','圓角方框','切角框']},
  glassesShine:{part:'glasses',label:'反光亮度',value:.7,min:.2,max:1,step:.05},
  glassesBand:{part:'glasses',label:'反光帶寬度',value:.4,min:.1,max:.65,step:.01},
  mouthX:{part:'mouth',label:'左右位置',value:64,min:36,max:92,step:.5},
  mouthY:{part:'mouth',label:'上下位置',value:85,min:70,max:100,step:.5},
  mouthWidth:{part:'mouth',label:'嘴巴寬度',value:10.5,min:5,max:30,step:.5},
  mouthCurve:{part:'mouth',label:'嘴角弧度',value:0,min:-10,max:10,step:.5},
  mouthStroke:{part:'mouth',label:'線條粗細',value:2.7,min:1,max:5,step:.1},
  mouthTilt:{part:'mouth',label:'歪斜角度',value:0,min:-25,max:25,step:1},
  mouthShape:{part:'mouth',label:'嘴巴形狀',value:'line',choices:['line','small-o','v'],names:['橫線／弧線','小圓嘴','小V嘴']},
  headX:{part:'head',label:'左右位置',value:64,min:36,max:92,step:.5},
  headY:{part:'head',label:'上下位置',value:61,min:42,max:82,step:.5},
  headWidth:{part:'head',label:'臉部寬度',value:86,min:58,max:112,step:1},
  headHeight:{part:'head',label:'臉部高度',value:84,min:54,max:104,step:1},
  headRoundness:{part:'head',label:'圓潤 → 方圓',value:2.8,min:2,max:4,step:.1},
  coatX:{part:'coat',label:'左右位置',value:64,min:24,max:104,step:.5},
  coatY:{part:'coat',label:'上下位置',value:121.5,min:98,max:142,step:.5},
  coatWidth:{part:'coat',label:'白袍寬度',value:98,min:60,max:132,step:1},
  coatHeight:{part:'coat',label:'白袍高度',value:45,min:30,max:70,step:1},
  coatTie:{part:'coat',label:'領帶',value:false},
  coatPockets:{part:'coat',label:'口袋與筆',value:true},
  coatButtons:{part:'coat',label:'白袍鈕扣',value:false},
  accessoryX:{part:'accessory',label:'左右位置',value:92,min:0,max:128,step:.5},
  accessoryY:{part:'accessory',label:'上下位置',value:128,min:60,max:150,step:.5},
  accessoryScale:{part:'accessory',label:'配件大小',value:1,min:.5,max:2,step:.05},
  accessoryTilt:{part:'accessory',label:'歪斜角度',value:-12,min:-45,max:45,step:1},
  accessoryType:{part:'accessory',label:'手邊配件',value:'cycle',choices:['cycle','none','flask','coffee','notebook'],names:['依時間輪換（三種）','不拿配件','小燒瓶','咖啡杯','筆記本']},
  hairColour:{part:'colours',label:'頭髮／鏡框',value:'#393039'},
  faceColour:{part:'colours',label:'臉部',value:'#f4e3ca'},
  lensColour:{part:'colours',label:'不透光鏡片',value:'#c5e0df'},
  coatColour:{part:'colours',label:'白袍',value:'#fffdf7'},
  shirtColour:{part:'colours',label:'領口／燒瓶液體',value:'#93c7c7'},
  tieColour:{part:'colours',label:'領帶／筆記本',value:'#e58ba6'},
} satisfies Record<string,Field>;
export type AvatarKey=keyof typeof AVATAR_FIELDS;
export type AvatarParameters={[K in AvatarKey]: typeof AVATAR_FIELDS[K]['value'] extends number?number:typeof AVATAR_FIELDS[K]['value'] extends boolean?boolean:string};
export const DEFAULT_AVATAR=Object.fromEntries(Object.entries(AVATAR_FIELDS).map(([key,field])=>[key,field.value])) as AvatarParameters;
export const PART_NAMES:Record<AvatarPart,string>={hair:'捲捲頭',glasses:'反光眼鏡',mouth:'嘴巴',head:'臉型',coat:'白袍',accessory:'配件',colours:'顏色'};
export const PART_POSITION:Partial<Record<AvatarPart,[AvatarKey,AvatarKey]>>={hair:['hairX','hairY'],glasses:['glassesX','glassesY'],mouth:['mouthX','mouthY'],head:['headX','headY'],coat:['coatX','coatY'],accessory:['accessoryX','accessoryY']};
export function avatarDocument(parameters:AvatarParameters) {return {schema:'evolution-researcher',version:1,parameters:{...parameters}};}
export function parseAvatar(value:unknown):AvatarParameters {
  const doc=value as {schema?:unknown;version?:unknown;parameters?:unknown};
  if(!doc||doc.schema!=='evolution-researcher'||doc.version!==1||!doc.parameters||typeof doc.parameters!=='object'||Array.isArray(doc.parameters))throw new Error('請貼上研究員工具匯出的完整參數。');
  const input=doc.parameters as Record<string,unknown>,result={...DEFAULT_AVATAR};
  for(const key of Object.keys(input))if(!Object.prototype.hasOwnProperty.call(AVATAR_FIELDS,key))throw new Error(`不認識的參數：${key}`);
  for(const [key,rawField] of Object.entries(AVATAR_FIELDS)) {
    const field=rawField as Field,v=input[key];
    if(v===undefined)throw new Error(`缺少參數：${field.label}（${key}）`);
    if(typeof v!==typeof field.value)throw new Error(`${field.label}的格式不正確。`);
    if(typeof v==='number'&&(!Number.isFinite(v)||v<field.min!||v>field.max!))throw new Error(`${field.label}必須介於 ${field.min} 與 ${field.max}。`);
    if(key==='hairCurls'&&!Number.isInteger(v))throw new Error('捲髮團數請使用整數。');
    if(field.choices&&!field.choices.includes(v as string))throw new Error(`${field.label}的選項不正確。`);
    if(typeof v==='string'&&!field.choices&&!/^#[\da-f]{6}$/i.test(v))throw new Error(`${field.label}請使用六位十六進位色碼。`);
    (result as Record<string,unknown>)[key]=v;
  }
  return result;
}
const n=(v:number)=>Number(v.toFixed(3));
const path=(points:[number,number][])=>points.map(([x,y],i)=>`${i?'L':'M'}${n(x)} ${n(y)}`).join('')+'Z';
export function renderResearcher(p:AvatarParameters=DEFAULT_AVATAR,options:{editable?:boolean;prefix?:string;timeMs?:number}={}):string {
  const timed=avatarStyleAt(options.timeMs??0);
  p={...p,glassesShape:p.glassesShape==='daily'?timed.glassesShape:p.glassesShape,accessoryType:p.accessoryType==='cycle'?timed.accessoryType:p.accessoryType};
  const prefix=(options.prefix??'researcher').replace(/[^a-z\d_-]/gi,''),tag=(part:AvatarPart)=>options.editable?` data-part="${part}"`:'';
  const face=path(Array.from({length:96},(_,i)=>{const a=i/96*Math.PI*2,c=Math.cos(a),s=Math.sin(a);return [Math.sign(c)*Math.pow(Math.abs(c),2/p.headRoundness)*p.headWidth/2,Math.sign(s)*Math.pow(Math.abs(s),2/p.headRoundness)*p.headHeight/2];}));
  const hair=path(Array.from({length:Math.round(p.hairCurls)*24},(_,i)=>{
    const a=i/(Math.round(p.hairCurls)*24)*Math.PI*2;
    const wave=Math.cos(a*Math.round(p.hairCurls)+.4),curl=p.hairStyle==='tufts'?Math.sign(wave)*Math.pow(Math.abs(wave),.45):wave;
    const r=1+p.hairDepth*curl+p.hairChaos*(.19*Math.sin(a*3+1)+.1*Math.cos(a*5));
    return [Math.cos(a)*p.hairWidth/2*r,Math.sin(a)*p.hairHeight/2*r];
  }));
  const bulb=Math.min(p.hairHeight*.4,(p.hairWidth+p.hairHeight)/p.hairCurls*(.65+p.hairDepth*2));
  const cloud=`<ellipse rx="${n(p.hairWidth/2-bulb*.7)}" ry="${n(p.hairHeight/2-bulb*.7)}"/>`+Array.from({length:p.hairCurls},(_,i)=>{
    const a=i/p.hairCurls*Math.PI*2,r=bulb*(1+p.hairChaos*.4*Math.sin(i*2.7));
    const x=Math.cos(a)*(p.hairWidth/2-bulb)+p.hairChaos*7*Math.sin(i*1.8),y=Math.sin(a)*(p.hairHeight/2-bulb)+p.hairChaos*5*Math.cos(i*2.2);
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`;
  }).join('');
  const r=p.glassesRadius,h=r*p.glassesAspect,d=p.glassesSpacing/2;
  const lens=(x:number)=>p.glassesShape==='round'?`<ellipse cx="${x}" rx="${r}" ry="${h}"/>`:p.glassesShape==='rounded'?`<rect x="${x-r}" y="${-h}" width="${2*r}" height="${2*h}" rx="${r*.36}"/>`:`<path d="M${x-r*.65} ${-h}h${r*1.3}l${r*.35} ${h*.35}v${h*1.3}l${-r*.35} ${h*.35}h${-r*1.3}l${-r*.35} ${-h*.35}v${-h*1.3}Z"/>`;
  const lenses=lens(-d)+lens(d),band=p.glassesBand*r*2;
  const reflections=[-d,d].map(x=>`<path transform="translate(${x} 0)" d="M${-r*1.6} ${h*1.5}L${r*.6} ${-h*1.5}h${band}L${-r*1.6+band} ${h*1.5}ZM${-r*.4} ${h*1.5}L${r*1.8} ${-h*1.5}h${band*.4}L${-r*.4+band*.4} ${h*1.5}Z"/>`).join('');
  const mouth=p.mouthShape==='small-o'?`<ellipse rx="${p.mouthWidth*.3}" ry="${p.mouthWidth*.25}"/>`:p.mouthShape==='v'?`<path d="M${-p.mouthWidth/2} -2 0 ${Math.max(2,Math.abs(p.mouthCurve))} ${p.mouthWidth/2} -2"/>`:`<path d="M${-p.mouthWidth/2} 0Q0 ${p.mouthCurve} ${p.mouthWidth/2} 0"/>`;
  const accessory=p.accessoryType==='flask'?`<path d="M-4-15h8v10l8 15c2 5-1 7-5 7H-7c-4 0-7-2-5-7l8-15Z" fill="#eaf3eb" stroke="${p.hairColour}" stroke-width="1.3"/><path d="m-7 4-4 7c-1 3 1 4 4 4H7c3 0 5-1 4-4L7 4Z" fill="${p.shirtColour}"/><path d="M-5-15H5" stroke="${p.hairColour}" stroke-width="2" stroke-linecap="round"/><circle cx="2" cy="9" r="1.7" fill="#fffdf7"/>`:p.accessoryType==='coffee'?`<path d="M-10-8H8V9c0 7-18 7-18 0Z" fill="${p.coatColour}" stroke="${p.hairColour}" stroke-width="1.3"/><path d="M8-4c11-3 11 11 0 8" stroke="${p.hairColour}" stroke-width="2"/><ellipse cx="-1" cy="-8" rx="9" ry="2" fill="#85666a"/>`:p.accessoryType==='notebook'?`<rect x="-11" y="-16" width="23" height="32" rx="2" fill="${p.tieColour}"/><path d="M-6-16v32m5-23H8M-1-1H8" stroke="${p.coatColour}" stroke-width="1.5"/>`:'';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="164" height="184" viewBox="-18 -28 164 184" fill="none" role="img" aria-labelledby="${prefix}-title"><title id="${prefix}-title">蓬鬆捲髮、反光大眼鏡與橫線嘴巴的白袍研究員</title>
<g${tag('coat')} transform="translate(${p.coatX} ${p.coatY}) scale(${p.coatWidth/98} ${p.coatHeight/45}) translate(-64 -121.5)">
<path d="M15 144c3-28 12-41 31-45h36c19 4 28 17 31 45Z" fill="${p.coatColour}"/><path d="m51 101 13 19 13-19" fill="${p.shirtColour}"/>
${p.coatTie?`<path d="m59 106 5 8 5-8-5 21Z" fill="${p.tieColour}"/>`:''}<path d="m46 99 12 25 6-5-8-16m26-4-12 25-6-5 8-16" fill="#e8e3d9"/><path d="M64 124v20" stroke="#d8d0c5" stroke-width="1.5"/>
${p.coatPockets?`<path d="M31 125h16v11H31Zm49 0h16v11H80Z" fill="#e8e3d9"/><path d="M35 120v7m5-9v9" stroke="${p.shirtColour}" stroke-width="2.5" stroke-linecap="round"/>`:''}${p.coatButtons?'<circle cx="68" cy="130" r="1.5" fill="#c8bfb4"/><circle cx="68" cy="140" r="1.5" fill="#c8bfb4"/>':''}</g>
<g${tag('head')} transform="translate(${p.headX} ${p.headY})"><path d="${face}" fill="${p.faceColour}"/></g>
<g${tag('hair')} transform="translate(${p.hairX} ${p.hairY}) rotate(${p.hairTilt})" fill="${p.hairColour}">${p.hairStyle==='cloud'?cloud:`<path d="${hair}"/>`}</g>
<g${tag('glasses')} transform="translate(${p.glassesX} ${p.glassesY}) rotate(${p.glassesTilt})"><defs><clipPath id="${prefix}-lenses">${lenses}</clipPath></defs>
<g fill="${p.lensColour}">${lenses}</g><g clip-path="url(#${prefix}-lenses)" opacity="${p.glassesShine}" fill="#fffdf7">${reflections}</g>
<g stroke="${p.hairColour}" stroke-width="${p.glassesStroke}" fill="none">${lenses}<path d="M${-d+r} -2Q0 -7 ${d-r} -2M${-d-r} -4l-6-2m${p.glassesSpacing+2*r+6} 2 6-2" stroke-linecap="round"/></g></g>
<g${tag('mouth')} transform="translate(${p.mouthX} ${p.mouthY}) rotate(${p.mouthTilt})" stroke="${p.hairColour}" stroke-width="${p.mouthStroke}" stroke-linecap="round" stroke-linejoin="round">${mouth}${options.editable?`<rect x="${-p.mouthWidth/2-4}" y="-8" width="${p.mouthWidth+8}" height="16" fill="transparent" stroke="none"/>`:''}</g>
${accessory?`<g${tag('accessory')} transform="translate(${p.accessoryX} ${p.accessoryY}) rotate(${p.accessoryTilt}) scale(${p.accessoryScale})">${accessory}</g>`:''}</svg>`;
}
