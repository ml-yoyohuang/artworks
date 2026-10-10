import {phaseAt} from './interaction-model.js';
import {clamp,mix,noise,ease} from './model.js';
import {TAU,polygon,line,ellipse,scene,grain,project,panel,box,plinth,lathe} from './draw.js';
function architecture(g,s,v){
 const view=Number(s.params.passage||0),angle=[.63,.98,-.28][view],sc=(v.mobile?93:81)*[1,1.3,1.18][view],cy=[145,190,155][view];
 const ground=g.createLinearGradient(0,-200,0,320);ground.addColorStop(0,'#eef0ef');ground.addColorStop(1,'#d5dde0');g.fillStyle=ground;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 panel(g,[[-4.3,-.04,-3.5],[4.3,-.04,-3.5],[4.3,-.04,3.5],[-4.3,-.04,3.5]],'#e4e8e7',angle,sc,cy);
 const a=s.arch,stable=.55+s.stability*.45;
 // Real footprints, offset shadows and persistent coordinates of the same walls.
 for(let k=0;k<5;k++){const z=-2.4+k*1.15,x=-2.7+a[k%4]*.6,h=1.6+a[(k+1)%4]*.9;panel(g,[[x,0,z],[x+3.5,0,z],[x+4.5,0,z+h*.6],[x+1,0,z+h*.6]],'rgba(27,53,80,.15)',angle,sc,cy);}
 // A broad rear wall with an arched opening, projected as a polygon with a hole.
 const z=-2.45,height=3.55+a[1]*.55,width=4.8+a[2]*.55,left=-2.65;
 box(g,left,0,z,.18,height,.22,['#dce2e3','#758b9b','#fff'],angle,sc,cy);
 const outer=[[left,0,z],[left+width,0,z],[left+width,height,z],[left,height,z]];
 const center=left+width*.56,rad=.76+a[0]*.28,base=1.45;
 const hole=[[center-rad,0,z],[center+rad,0,z],[center+rad,base,z]];
 for(let j=0;j<=24;j++){const t=j/24*Math.PI;hole.push([center+Math.cos(t)*rad,base+Math.sin(t)*rad,z])}hole.push([center-rad,0,z]);
 g.beginPath();for(const pts of [outer,hole]){pts.map(p=>project(...p,angle,sc,cy)).forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath()}g.fillStyle='#f7f7f0';g.fill('evenodd');
 const deep=hole.map(p=>project(p[0],p[1],p[2]+.22,angle,sc,cy)),front=hole.map(p=>project(...p,angle,sc,cy));for(let j=2;j<hole.length-1;j++)polygon(g,[front[j],front[j+1],deep[j+1],deep[j]],'#a0b0b9');
 for(let k=0;k<4;k++){
  const z=-1.25+k*.98,x=-2.5+a[k]*.54,h=(2.05+a[(k+1)%4]*1.0)*stable,w=1.35+a[(k+2)%4]*.42;
  box(g,x,0,z,.13,h,.24,['#f6f6ef','#9fadb4','#fff'],angle,sc,cy);
  box(g,x+w,0,z,.17,h*.85,.24,['#e7e9e5','#71889a','#fff'],angle,sc,cy);
  box(g,x,h-.13,z,w+.17,.13,.24,['#eef0eb','#8195a2','#fff'],angle,sc,cy);
  const fold=.4+a[(k+3)%4]*.48;line(g,[project(x,0,z,angle,sc,cy),project(x,h,z,angle,sc,cy)],'rgba(255,255,249,.9)',.8);panel(g,[[x+w,0,z],[x+w+fold,0,z+.55],[x+w+fold,h*.85,z+.55],[x+w,h*.85,z]],k%2?'#dce2e3':'#c9d5dc',angle,sc,cy);
 }
 // Suspended metal roof plates give the structure a second level and scale.
 for(let k=0;k<3;k++){const x=-.4+k*.85,z=-1.6+k*.6,h=3.2+a[k]*.8;box(g,x,h,z,.7,.055,1.3,['#f3f4ed','#8f9caa','#fdfdfa'],angle,sc,cy);const p=project(x+.35,0,z+.7,angle,sc,cy);ellipse(g,p[0]+15,p[1]+2,16,5,'rgba(42,66,89,.08)')}
 grain(g,v.w,v.h,s.seed,.032);if(!v.mobile){g.font='10px Arial';g.fillStyle='#586d7b';g.fillText(['C · MAJOR','A · MINOR / 9','F · OPEN','G · SUSPENDED'][s.chord],-v.w/2+36,-v.h/2+70)}
}
function loom(g,s,v){
 const W=v.mobile?900:790,H=v.mobile?1030:480,x0=-W/2,y0=-H/2+12,cols=76,dx=W/cols;
 const bg=g.createRadialGradient(-120,-90,20,0,0,600);bg.addColorStop(0,'#eee6d5');bg.addColorStop(1,'#c7bba6');g.fillStyle=bg;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 g.save();g.translate(10,16);polygon(g,[[x0-8,y0],[x0+W+9,y0-5],[x0+W+20,y0+H],[x0-15,y0+H+7]],'rgba(39,31,22,.17)');g.restore();
 polygon(g,[[x0,y0],[x0+W,y0-4],[x0+W+5,y0+H],[x0-4,y0+H+6]],'#dad0ba');
 const rows=s.rows,count=64,dy=H/count,visible=rows.slice(-count),pitches=visible.map(r=>dy*clamp(.6+(r.spacing||.5)*.8,.7,1.65)),total=pitches.reduce((a,b)=>a+b,0),scroll=Math.max(0,total-H);let wovenY=0;
 for(let col=0;col<cols;col++){const x=x0+col*dx,thick=col%8===0;line(g,[[x,y0-24],[x+Math.sin(col)*1.5,y0+H+23]],thick?'#758582':'#b8a992',thick?1.9:1.2);line(g,[[x+.8,y0-25],[x+.8,y0+H+25]],'#f2ebdc',.5);}
 for(let row=0;row<count;row++){
  if(row>=Math.min(count,rows.length))continue;const r=visible[row],y=y0+wovenY-scroll;wovenY+=pitches[row];if(y<y0-1)continue;const dense=r.voices?.[1]!==false,offset=r.variant?3:0;
  if(!dense)continue;
  const palette=['#ac4f3a','#cf9a68','#e5cbae','#667d7a','#f0e5d1'],color=palette[Math.floor((r.pos+offset)/3)%5];
  for(let col=0;col<cols;col++){
   const x=x0+col*dx,over=Number(r.weave??s.params.weave??0)===0?(col+r.key)%2===0:Number(r.weave??s.params.weave)===1?(col+r.key)%4<2:(col+Math.floor(r.key/2))%3!==0;
   const gap=over?.5:3;const thickness=dy*.6;
   line(g,[[x+gap,y],[x+dx-gap,y+Math.sin(col*.3+r.key)*.35]],'rgba(59,39,28,.2)',thickness+2.3);
   line(g,[[x+gap,y-1],[x+dx-gap,y-.8]],color,thickness);
   for(let f=0;f<3;f++)line(g,[[x+gap,y-thickness*.4+f*thickness*.26],[x+dx-gap,y-thickness*.4+f*thickness*.26]],f%2?'rgba(255,247,226,.3)':'rgba(47,39,33,.11)',.6);
   if(!over&&r.voices?.[0]!==false&&col%8===0){line(g,[[x+dx/2,y-dy/2],[x+dx/2,y+dy/2]],'#334757',3.4);line(g,[[x+dx/2+1,y-dy/2],[x+dx/2+1,y+dy/2]],'#78928f',.7)}
   if(r.voices?.[2]!==false&&s.knots.includes(r.key)&&r.row%2===0&&col%12===r.pos%12){ellipse(g,x+dx/2,y,3.4,2.5,'#b56843');ellipse(g,x+dx/2-1,y-.8,1.4,.8,'#f4d4aa')}
  }
 }
 for(let k=0;k<180;k++){const y=y0+noise(k,s.seed)*H;line(g,[[x0-5,y],[x0-15-noise(k+200,s.seed)*22,y+noise(k+15,s.seed)*10-5]],'#e5dcc8',.7);line(g,[[x0+W,y],[x0+W+10+noise(k+5,s.seed)*16,y-4]],'#c9bfa8',.7)}
 const head=y0+Math.min(H,total);line(g,[[x0-25,head],[x0+W+25,head]],'rgba(58,45,35,.23)',1);grain(g,v.w,v.h,s.seed,.05);
}
function silence(g,s,v){
 const W=v.mobile?880:850,H=v.mobile?970:450;
 const bg=g.createRadialGradient(-170,-130,20,40,40,720);bg.addColorStop(0,'#45413b');bg.addColorStop(1,'#282724');g.fillStyle=bg;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 g.save();g.shadowColor='rgba(16,13,11,.3)';g.shadowBlur=26;g.shadowOffsetY=14;
 g.fillStyle='#34322f';g.beginPath();g.roundRect(-W/2,-H/2,W,H,3);g.fill();g.restore();
 // Four separated, gently curved apertures. One continuous inner fold replaces intersecting shards.
 const slots=new Map();for(const cut of s.cuts)slots.set(cut.slot??Math.floor(cut.axis)%4,cut);if(s.pressCut)slots.set(s.pressCut.slot,s.pressCut);
 for(const [slot,cut] of slots){const age=Math.max(0,s.time-cut.start),expand=cut.press?.08+.47*ease(age/2.4):cut.manual?mix(.08+.47*ease((cut.pressDuration||0)/2.4),1,ease(age/2.1)):age<cut.d?ease(age/Math.min(cut.d,1.7)):mix(1,.09,ease((age-cut.d)/2.5));
  const prior=cut.press?clamp((age+.16)*.11,.12,.9):cut.prior,depth=cut.press?.35+prior*.7:cut.depth;const L=(360+prior*170)*(cut.press?mix(.35,1,ease(age/2.4)):cut.manual?mix(mix(.35,1,ease((cut.pressDuration||0)/2.4)),1,ease(age/2.1)):1),x=(slot%2?1:-1)*W*.09,y=(slot-1.5)*H*.225,gape=3+expand*depth*(Number(s.params.space||0)?1.25:1)*(v.mobile?104:66);
  g.save();g.translate(x,y);g.rotate(slot%2?.026:-.022);
  const aperture=()=>{g.beginPath();g.moveTo(-L/2,0);g.bezierCurveTo(-L*.2,-gape*.22,L*.24,-gape*.2,L/2,-3);g.bezierCurveTo(L*.22,gape*.6,-L*.16,gape*1.1,-L/2,0);g.closePath()};
  aperture();g.shadowColor='rgba(10,8,6,.48)';g.shadowBlur=12;g.shadowOffsetY=5;g.fillStyle='#211e1b';g.fill();g.shadowBlur=0;g.shadowOffsetY=0;
  g.save();aperture();g.clip();const interior=g.createLinearGradient(0,-4,0,gape);interior.addColorStop(0,'#66504a');interior.addColorStop(.5,'#a57461');interior.addColorStop(1,'#c8a58c');g.fillStyle=interior;g.fillRect(-L/2,-gape,L,gape*3);
  g.beginPath();g.moveTo(-L*.42,gape*.48);g.bezierCurveTo(-L*.17,gape*.12,L*.18,gape*.12,L*.43,gape*.2);g.bezierCurveTo(L*.12,gape*.75,-L*.13,gape*.92,-L*.42,gape*.48);g.fillStyle='#b99178';g.fill();g.restore();
  g.beginPath();g.moveTo(-L/2,0);g.bezierCurveTo(-L*.2,-gape*.22,L*.24,-gape*.2,L/2,-3);g.strokeStyle='rgba(210,195,174,.55)';g.lineWidth=1.2;g.stroke();g.restore();
 }
 if(s.holding){g.strokeStyle='rgba(205,181,148,.32)';g.lineWidth=1.5;g.strokeRect(-W/2+12,-H/2+12,W-24,H-24)}grain(g,v.w,v.h,s.seed,.026,1400);
}
function fossil(g,s,v){
 const bg=g.createRadialGradient(-200,-190,0,0,50,650);bg.addColorStop(0,'#434649');bg.addColorStop(1,'#191e23');g.fillStyle=bg;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 const rot=s.params.rotation??.3,sc=v.mobile?85:76;plinth(g,.6,sc,200);ellipse(g,0,191,210,52,'rgba(0,0,0,.28)');
 const progress=s.time===0?.48:clamp(s.time/(s.params.fossilDuration??32)),height=110+progress*245;
 const profile=Array.from({length:94},(_,i)=>{const t=i/93,k=Math.floor(t*95),m=s.time===0?.4+noise(k,s.seed)*.5:s.material[k];return {y:t*height,r:75+65*Math.sin(t*Math.PI)**.7+m*62+Math.sin(t*28+s.seed)*7+Math.sin(t*63+s.seed)*2}});
 lathe(g,{profile,y:182,scale:v.mobile?1.45:1.17,angle:rot,color:[223,211,185],seed:s.seed,excavation:s.excavation});
 // Horizontal strata track actual recorded events; metallic veins follow reused pitch sectors.
 const layers=s.layers.length?s.layers:Array.from({length:30},(_,i)=>({t:i*.5,kind:i%8?'grain':'ridge',pitch:55}));
 for(let k=0;k<layers.length;k++){const t=clamp(layers[k].t/(s.params.fossilDuration??32)),y=182-t*height*(v.mobile?1.45:1.17),r=(75+65*Math.sin(t*Math.PI)**.7+s.material[Math.floor(t*95)]*62)*(v.mobile?1.45:1.17),pts=[];for(let j=0;j<=48;j++){const a=j/48*Math.PI;pts.push([Math.cos(a)*r,y+Math.sin(a)*r*.27+Math.sin(j*.9+k)*1.4])}line(g,pts,layers[k].kind==='ridge'?'rgba(181,142,79,.75)':'rgba(84,72,57,.23)',layers[k].kind==='ridge'?2:1)}
 for(let j=0;j<300;j++){const t=noise(j,s.seed),a=noise(j+70,s.seed)*Math.PI,r=(75+65*Math.sin(t*Math.PI)**.7+s.material[Math.floor(t*95)]*62)*(v.mobile?1.45:1.17);ellipse(g,Math.cos(a+rot*.3)*r,182-t*height*(v.mobile?1.45:1.17)+Math.sin(a)*r*.27,noise(j+88,s.seed)*1.7+.4,.65,'rgba(67,57,41,.22)')}
 if(s.selectedLayer){const yy=182-s.selectedLayer.t/(s.params.fossilDuration??32)*height*(v.mobile?1.45:1.17);line(g,[[-150,yy],[150,yy]],'rgba(218,179,111,.55)',1.2)}
 if(s.complete){g.font='11px Arial';g.fillStyle='#ccc5b5';g.textAlign='center';g.fillText('標本已定型 · SEED '+s.seed,0,290);g.textAlign='left'}grain(g,v.w,v.h,s.seed,.035);
}
function tides(g,s,v){
 const t=s.time,phases=phaseAt(s.params,t),phaseA=(s.reduced?(s.params.phaseBase?.[0]||0):phases[0])*TAU,phaseB=(s.reduced?phases[1]-phases[0]+(s.params.phaseBase?.[0]||0):phases[1])*TAU,relation=(phaseB-phaseA)%TAU,W=v.mobile?1320:1250,H=v.mobile?1100:660;
 g.fillStyle='#e9e2d5';g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 for(let layer=0;layer<2;layer++){
  const phase=layer?phaseB:phaseA,sign=layer?1:-1;
  for(let band=0;band<10;band++){
   const pts=[],y0=(band-5)*H/9;for(let j=0;j<=120;j++){const x=-W/2+j/120*W,y=y0+Math.sin(x/W*TAU*1.3+phase)*76+sign*Math.sin(x/W*TAU*.52+relation)*120*Math.sin(relation/2);pts.push([x,y])}
   for(let j=120;j>=0;j--){const x=-W/2+j/120*W,y=y0+Math.sin(x/W*TAU*1.3+phase)*76+sign*Math.sin(x/W*TAU*.52+relation)*120*Math.sin(relation/2)+H/11;pts.push([x,y])}
   const grad=g.createLinearGradient(-W/2,y0,W/2,y0+100);grad.addColorStop(0,layer?'rgba(188,51,33,.70)':'rgba(17,64,149,.84)');grad.addColorStop(.48,layer?'rgba(216,77,46,.66)':'rgba(24,88,181,.70)');grad.addColorStop(1,layer?'rgba(213,66,37,.27)':'rgba(24,72,151,.36)');
   g.save();g.globalCompositeOperation='multiply';polygon(g,pts,grad);g.restore();line(g,pts.slice(0,121),layer?'rgba(240,174,133,.48)':'rgba(156,189,224,.55)',.85);
  }
 }
 const convergence=(Math.cos(relation)+1)/2;g.save();g.globalCompositeOperation='screen';const glow=g.createRadialGradient(Math.sin(relation)*230,0,0,0,0,310);glow.addColorStop(0,`rgba(246,231,201,${convergence*.12})`);glow.addColorStop(1,'rgba(246,231,201,0)');g.fillStyle=glow;g.fillRect(-600,-600,1200,1200);g.restore();grain(g,v.w,v.h,s.seed,.035);
}
function breathProfile(samples,seed,preview=false){
 const raw=Array.from({length:76},(_,i)=>{const t=i/75,b=samples[Math.min(samples.length-1,Math.floor(t*samples.length))],amp=preview?.12+.2*Math.sin(t*9)**2:(b?.r||.018),airy=b?.airy??.3;return {y:t*(preview?330:Math.max(75,samples.length/128*340)),r:(18+amp*190)*(Math.sin(Math.PI*t)*.65+.35)+(noise(i,seed)-.5)*airy*3,twist:b?.twist??Math.sin(t*5)}});
 return raw.map((p,i)=>({...p,r:(raw[Math.max(0,i-2)].r+raw[Math.max(0,i-1)].r+p.r*2+raw[Math.min(75,i+1)].r+raw[Math.min(75,i+2)].r)/6}));
}
function breath(g,s,v){
 const grad=g.createLinearGradient(-300,-300,400,400);grad.addColorStop(0,'#e8e4dd');grad.addColorStop(1,'#c6c7c1');g.fillStyle=grad;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 line(g,[[-v.w/2,220],[v.w/2,220]],'#b9bbb5',.7);
 const objects=s.gallery.slice(-2).concat([{samples:s.breath,seed:s.seed,current:true}]);
 while(objects.length<3)objects.unshift({samples:[],seed:s.seed+objects.length+1,ghost:true});
 for(let k=0;k<objects.length;k++){
  const obj=objects[k],x=(k-1)*(v.mobile?255:265),scale=obj.current?(v.mobile?1.55:1.15):.8,y=210;
  ellipse(g,x,y+9,92*scale,19*scale,'rgba(51,68,64,.10)');ellipse(g,x,y+4,66*scale,13*scale,'rgba(51,68,64,.07)');
  const preview=!obj.samples.length,profile=breathProfile(obj.samples,obj.seed,preview);
  lathe(g,{profile,x,y,scale,angle:s.params.rotation??.2,color:obj.current?[128,161,155]:[155,170,165],glass:true,seed:obj.seed,twist:1.2});
  for(let j=0;j<90;j++){if((obj.samples[Math.floor(j/90*obj.samples.length)]?.airy||0)<.4&&j%4!==0)continue;const t=noise(j,obj.seed),a=noise(j+19,obj.seed)*Math.PI,p=profile[Math.floor(t*75)];ellipse(g,x+Math.cos(a)*p.r*scale,y-p.y*scale+Math.sin(a)*p.r*.27*scale,1.3,1,'rgba(243,244,230,.24)')}
  g.font='10px Arial';g.fillStyle='#586662';g.textAlign='center';g.fillText(obj.ghost?'未留下的氣息':obj.current?(s.complete?'這一口氣 · 已定型':'這一口氣'):'先前的標本',x,255);g.textAlign='left';
 }
 grain(g,v.w,v.h,s.seed,.032);
}
function labyrinth(g,s,v,data){
 const angle=.68,scale=v.mobile?94:83,cy=60;
 g.fillStyle='#10181e';g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 panel(g,[[-3.4,0,-3.4],[3.4,0,-3.4],[3.4,0,3.4],[-3.4,0,3.4]],'#16232b',angle,scale,cy);
 for(let k=-3;k<=3;k++){line(g,[project(k,0,-3,angle,scale,cy),project(k,0,3,angle,scale,cy)],'rgba(102,130,136,.07)',.6);line(g,[project(-3,0,k,angle,scale,cy),project(3,0,k,angle,scale,cy)],'rgba(102,130,136,.07)',.6)}
 const items=data.walls.map((wall,i)=>({wall,i,depth:(wall.a[0]+wall.b[0])*Math.sin(angle)+(wall.a[1]+wall.b[1])*Math.cos(angle)})).sort((a,b)=>a.depth-b.depth);
 for(const {wall,i} of items){const revealed=s.time===0?(i<4?.65:i===4?.28:0):s.reveal[i];if(revealed<.01)continue;const [ax,az]=wall.a,[bx,bz]=wall.b,h=i<4?1.2:1.4;
  panel(g,[[ax,0,az],[bx,0,bz],[bx,h,bz],[ax,h,az]],`rgba(125,151,157,${revealed*.52})`,angle,scale,cy,i===4&&s.params.manual?'rgba(221,166,95,.6)':'rgba(170,191,185,.1)');
  const thick=.055;panel(g,[[ax,h,az],[bx,h,bz],[bx+thick,h,bz+thick],[ax+thick,h,az+thick]],`rgba(221,209,168,${revealed*.93})`,angle,scale,cy);
  line(g,[project(ax,0,az,angle,scale,cy),project(ax,h,az,angle,scale,cy)],`rgba(224,187,119,${revealed*.5})`,1);
 }
 const p=project(...[data.source[0],.04,data.source[1]],angle,scale,cy);ellipse(g,...p,7,3,'#e9c487');
 for(const path of s.paths){const age=s.time-path.start,alpha=clamp(1-age/3);if(alpha<=0)continue;const pts=path.path.map(p=>project(p[0],.03,p[1],angle,scale,cy));line(g,pts,`rgba(235,191,112,${alpha*.6})`,1.4);const end=pts[1];ellipse(g,...end,9+age*18,3+age*5,`rgba(239,198,115,${alpha*.08})`);ellipse(g,...end,2.5,1.5,`rgba(244,217,167,${alpha})`)}
 const gl=g.createRadialGradient(p[0],p[1],5,p[0],p[1],130);gl.addColorStop(0,'rgba(242,200,117,.1)');gl.addColorStop(1,'rgba(242,200,117,0)');g.fillStyle=gl;g.fillRect(-600,-600,1200,1200);grain(g,v.w,v.h,s.seed,.07);
}
function energy(g,s,v){
 const bg=g.createRadialGradient(-130,-180,0,0,0,680);bg.addColorStop(0,'#f0eee6');bg.addColorStop(1,'#d3d3cb');g.fillStyle=bg;g.fillRect(-v.w/2,-v.h/2,v.w,v.h);
 const threshold=Number(s.params.mode??0)===0?.95:1.5,E=clamp(s.energy/threshold),age=s.time-s.releaseTime,open=s.locked?ease(age/1.3)*(1-ease((age-4)/1)):0,rot=s.locked?ease(age/1.3)*(1-ease((age-4)/1))*Math.PI:.08*Math.sin(s.time*.5),size=v.mobile?1.45:1.0;
 const displayedOpen=s.reduced?(s.locked?1:0):open;const displayedRot=s.reduced?(s.locked?Math.PI:0):rot;
 g.save();g.scale(size,size);ellipse(g,0,210,145+displayedOpen*65,24,'rgba(51,62,59,.11)');
 const faces=[],N=9;for(let k=0;k<N;k++){
  const a=k/N*TAU+displayedRot,a1=(k+1)/N*TAU+displayedRot,r=135+E*16+displayedOpen*92,front=[Math.cos(a)*r,Math.sin(a)*r*.37],next=[Math.cos(a1)*r,Math.sin(a1)*r*.37],top=[Math.cos(a+.05)*50,-110-E*28],bottom=[Math.cos(a+.15)*67,123+E*12];
  const spread=displayedOpen*Math.sin(a)*70;faces.push({k,z:Math.sin(a),pts:[[front[0],front[1]+spread],top,[next[0],next[1]+spread],bottom]});
 }
 for(let k=0;k<4;k++){const anchor=[(k-1.5)*135,-280],attach=[Math.cos(Math.round(k/4*9)/9*TAU+displayedRot+.05)*50,-110-E*28];line(g,[anchor,[(anchor[0]+attach[0])/2+Math.sin(k)*((1-E)*9),(-280+attach[1])/2],attach],'#626e6b',.7);ellipse(g,...attach,3,3,'#76817a');ellipse(g,...anchor,2,2,'#707771')}
 faces.sort((a,b)=>a.z-b.z);for(const f of faces){const bright=clamp(f.z*.5+.5);const fill=displayedOpen>.1?`rgb(${Math.round(156+bright*71)},${Math.round(44+bright*37)},${Math.round(25+bright*18)})`:`rgb(${Math.round(160+bright*64)},${Math.round(168+bright*57)},${Math.round(160+bright*57)})`;polygon(g,f.pts,fill,displayedOpen>.1?'rgba(246,173,119,.48)':'rgba(245,245,228,.8)',.9);line(g,[f.pts[0],f.pts[2]],displayedOpen>.1?'rgba(71,30,20,.25)':'rgba(96,116,109,.2)',.8);if(!displayedOpen&&E>.35){const q=f.pts.map(p=>[p[0]*.96,p[1]*.96]);line(g,[q[0],q[1]],`rgba(199,86,42,${(E-.35)*.75})`,2)}}
 g.restore();grain(g,v.w,v.h,s.seed,.038);if(!v.mobile){g.fillStyle='#62736b';g.font='10px Arial';g.fillText(s.locked?'釋放之後，形體暫時留下。':'每一個音，都留下一點力量。',-v.w/2+36,-v.h/2+70)}
}
function handles(g,s,v){
 const y=v.h/2-100;
 const rail=(x1,x2,color)=>{line(g,[[x1,y],[x2,y]],color,1.2);ellipse(g,x1,y,3,3,color);ellipse(g,x2,y,3,3,color)};
 if(s.index===0){rail(-v.w*.3,v.w*.3,'#8b9c9e');const x=(s.params.tuning||0)*v.w*.3;ellipse(g,x,y,13,13,'#647d83');ellipse(g,x,y,4,4,'#eee9dc');s.handle={x,y};}
 if(s.index===1){rail(-v.w*.32,v.w*.32,'#958166');const x=(s.shuttleX??-1)*v.w*.32;polygon(g,[[x-22,y],[x,y-11],[x+22,y],[x,y+11]],'#93674c','#dfc8a2',1);s.handle={x,y};}
 if(s.index===4){s.phaseHandles=[];for(let i=0;i<2;i++){const yy=y-i*54,x=(s.params.phaseControl?.[i]||0)*v.w*.3;line(g,[[-v.w*.3,yy],[v.w*.3,yy]],i?'#b88169':'#7691ad',1);ellipse(g,x,yy,12,12,i?'#b36751':'#436b96');ellipse(g,x,yy,4,4,'#ede4d4');s.phaseHandles.push({x,y:yy})}}
}
export function render(g,w,h,model,bg){const s=model.state,v=scene(g,w,h,bg);[architecture,loom,silence,fossil,tides,breath,labyrinth,energy][s.index](g,s,v,model.data);handles(g,s,v);g.restore()}
