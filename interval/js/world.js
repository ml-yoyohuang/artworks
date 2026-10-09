import * as T from '../../showroom/vendor/three/build/three.module.js';
const clamp=T.MathUtils.clamp;
export class MuseumWorld {
 constructor(host,ex,{onWork,onStation,onPortal,onReady,onFailure,onFrame,reduced}){
  Object.assign(this,{host,ex,onWork,onStation,onPortal,onReady,onFailure,onFrame,reduced});this.section=0;this.pendingTextures=0;this.resources=[];this.labels=[];this.targets=[];this.generation=0;this.yaw=0;this.pitch=0;this.position=new T.Vector3(0,2,13);this.suspended=false;this.dirty=true;this.lowFrames=0;this.lastMotionFrame=0;this.closed=false;this.drag=null;this.animation=null;
  this.renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,innerWidth<700?1.5:1.8));this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.15;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=T.PCFSoftShadowMap;this.renderer.shadowMap.autoUpdate=false;
  this.host.append(this.renderer.domElement);this.camera=new T.PerspectiveCamera(54,1,.1,220);this.scene=new T.Scene();this.group=new T.Group();this.scene.add(this.group);this.ray=new T.Raycaster();this.pointer=new T.Vector2();this.clock=0;this.tick=this.tick.bind(this);
  this.renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();if(this.closed)return;this.pause(true);onFailure('繪圖環境已中斷，請使用完整作品目錄。');});
  this.resize=()=>{this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.fov=innerWidth<700?62:54;this.camera.updateProjectionMatrix();this.invalidate();};window.addEventListener('resize',this.resize);this.resize();
  this.host.addEventListener('pointerdown',e=>{this.host.setPointerCapture(e.pointerId);this.drag={id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false};this.animation=null;});
  this.host.addEventListener('pointermove',e=>{if(!this.drag||e.pointerId!==this.drag.id)return;const d=this.drag;const dx=e.clientX-d.lastX,dy=e.clientY-d.lastY;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>7)d.moved=true;if(d.moved){this.yaw-=dx*.004;this.pitch=clamp(this.pitch-dy*.003,-.45,.42);this.invalidate();}d.lastX=e.clientX;d.lastY=e.clientY;});
  this.host.addEventListener('pointerup',e=>{if(!this.drag)return;const d=this.drag;this.drag=null;if(!d.moved)this.pick(e.clientX,e.clientY);});this.host.addEventListener('pointercancel',()=>this.drag=null);
  this.host.addEventListener('keydown',e=>{if(!this.section)return;if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','w','s','a','d','W','S','A','D','Enter'].includes(e.key)){e.preventDefault();this.animation=null;if(e.key==='ArrowLeft')this.yaw+=.1;if(e.key==='ArrowRight')this.yaw-=.1;if(e.key==='ArrowUp')this.pitch=clamp(this.pitch+.06,-.45,.42);if(e.key==='ArrowDown')this.pitch=clamp(this.pitch-.06,-.45,.42);if(/[ws]/i.test(e.key)){let idx=this.nearestStation();idx+=e.key.toLowerCase()==='w'?1:-1;this.onStation(clamp(idx,0,this.stations.length-1));}if(/[ad]/i.test(e.key)){this.position.x=clamp(this.position.x+(e.key.toLowerCase()==='a'?-.6:.6),-2,2);}if(e.key==='Enter'&&this.nearestStation()===this.stations.length-1&&this.section<5)this.onStation(this.stations.length);else if(e.key==='Enter'){const nearest=this.ex.works.filter(w=>w.section===this.section).sort((a,b)=>Math.abs(a.placement.z-this.position.z)-Math.abs(b.placement.z-this.position.z))[0];this.onWork(nearest);}this.invalidate();}});
  this.build(0);this.tick=this.tick.bind(this);this.invalidate();onReady();
 }
 material(color,extra={}){const m=new T.MeshStandardMaterial({color,roughness:.89,metalness:0,...extra});this.resources.push(m);return m;}
 mesh(geo,mat,pos,rot){this.resources.push(geo);const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;}
 box(size,pos,color,extra){return this.mesh(new T.BoxGeometry(...size),this.material(color,extra),pos);}
 line(points,color='#b8b9ad',opacity=.4){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const m=new T.LineBasicMaterial({color,transparent:true,opacity});this.resources.push(g,m);const l=new T.Line(g,m);this.group.add(l);return l;}
 contact(x,z,w,d){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(32,32,2,32,32,31);grad.addColorStop(0,'rgba(0,0,0,.32)');grad.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const tex=new T.CanvasTexture(c);this.resources.push(tex);const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false});this.resources.push(m);this.mesh(new T.PlaneGeometry(w,d),m,[x,.012,z],[-Math.PI/2,0,0]).castShadow=false;}
 clear(){this.membrane=null;this.generation++;this.pendingTextures=0;this.labels.forEach(l=>l.button.remove());this.labels=[];this.targets=[];this.group.clear();this.resources.forEach(r=>r.dispose?.());this.resources=[];this.scene.children.filter(c=>c!==this.group).forEach(c=>{if(c.dispose)c.dispose();else c.shadow?.dispose();this.scene.remove(c);});}
 build(section){this.clear();this.renderer.shadowMap.needsUpdate=true;this.section=section;this.animation=null;const dark=section>=3;const bg=section===0?'#263542':section===1?'#77818a':section===2?'#676e76':section===3?'#0b191e':section===4?'#181f2a':'#101a25';this.scene.background=new T.Color(bg);this.scene.fog=new T.Fog(bg,section===0?24:22,section===0?110:section===1?72:80);
  const hemi=new T.HemisphereLight(dark?'#b9c8d9':'#e5e8e8',dark?'#475563':'#74695d',dark?1.3:2.8);this.scene.add(hemi);const sun=new T.DirectionalLight('#fff1d9',dark?2:3.2);sun.position.set(-9,19,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:20,bottom:-48});sun.shadow.radius=4;sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;this.scene.add(sun,sun.target);sun.target.position.set(0,0,-10);
  this.groundColor=section===0?'#d8d8cc':section===1?'#d7d5cc':section===2?'#c7bfac':section===3?'#2b393a':section===4?'#4a4d51':'#6b7071';
  if(!section){this.entry();this.stations=[];this.position.set(0,3,13);this.lookAt(innerWidth<900?[-1,6.3,-23]:[-8,4,-23]);return;}
  const works=this.ex.works.filter(w=>w.section===section);const end=Math.min(...works.map(w=>w.placement.z))-8;this.end=end;
  this.stations=[{name:'展廳入口',pos:[0,2,10],look:[0,2,-8]},...works.map(w=>({name:w.name,pos:this.viewFor(w).pos,look:this.viewFor(w).look,work:w})),{name:section===5?'終章 · 安靜的平台':'下一個展區',pos:section===5?[0,2,6]:[0,2,end+(innerWidth<700?11:8)],look:section===5?[0,3,-12]:[0,2.35,end-8]}];
  if(section!==2)this.box([section===5?23:16,.26,Math.abs(end)+30],[0,-.18,(end+14)/2],this.groundColor);
  else {for(let z=10;z>end;z-=9){this.box([15,.22,8.3],[0,-.15,z-3.5],this.groundColor);this.box([3,.15,5],[z%2?9:-9,.55,z-5],'#b6b4a5');}}
  this.architecture(section,works,end);
  for(const [i,w] of works.entries())this.artwork(w,i);
  for(const [i,s] of this.stations.entries()){const geometry=new T.RingGeometry(.25,.29,48);const material=new T.MeshBasicMaterial({color:dark?'#a1adae':'#576868',transparent:true,opacity:.65,side:T.DoubleSide,toneMapped:false});this.resources.push(material);const ring=this.mesh(geometry,material,[s.pos[0],.03,s.pos[2]],[-Math.PI/2,0,0]);ring.castShadow=false;ring.userData={station:i};this.targets.push(ring);}
  // A shallow architectural glimpse of the next room; no adjacent artworks run here.
  if(section<5)this.threshold(section+1,end);
  this.position.set(0,2,10);this.lookAt(innerWidth<700?[works[0].placement.x,works[0].placement.y,works[0].placement.z]:[0,2,-8]);this.invalidate();
 }
 threshold(next,end){
  const z=end-2, floor=['','#d7d5cc','#c7bfac','#2b393a','#4a4d51','#6b7071'][next], wall=['','#77818a','#676e76','#102128','#242b36','#161b25'][next];
  const light=new T.PointLight(next===2?'#fff0dd':'#cad9df',32,20,2);light.position.set(0,4.7,z-5);this.group.add(light);
  // Jambs keep the glimpse framed; a continuous threshold makes the route legible.
  this.box([.24,6,.65],[-3.12,3,z],this.groundColor);this.box([.24,6,.65],[3.12,3,z],this.groundColor);this.box([6.48,.24,.65],[0,6.12,z],this.groundColor);
  this.box([6,.22,12],[0,-.14,z-5],floor);this.box([.16,6.24,10.65],[-3.08,3.12,z-5.675],wall,{emissive:wall,emissiveIntensity:.25});this.box([.16,6.24,10.65],[3.08,3.12,z-5.675],wall,{emissive:wall,emissiveIntensity:.25});this.box([6.3,6.24,.15],[0,3.12,z-11],wall,{emissive:wall,emissiveIntensity:.25});this.box([6.3,.15,10.65],[0,6.315,z-5.675],wall,{emissive:wall,emissiveIntensity:.25});
  this.line([[-2.8,.03,z+.5],[2.8,.03,z+.5]],'#c9cbb7',.8);for(const x of [-.12,.12])this.line([[x,.035,z+3],[x,.035,z-4]],'#b9c4be',.5);
  if(next===2){this.box([.2,5.2,7],[-2.5,2.6,z-5],'#b8613f');this.box([2.3,.16,4],[1.55,4.5,z-7],'#718696');this.box([3.3,.22,3],[.4,.05,z-7],'#b6b0a3');}
  // The garden threshold stays empty: depth, light and a clear walking surface.
  if(next===4){for(const [x,d,yaw] of [[-1.9,4,.22],[1.5,7,-.3]]){const m=this.box([2.4,4.8,.05],[x,2.9,z-d],'#a5b0b3',{transparent:true,opacity:.26,depthWrite:false});m.rotation.y=yaw;this.line([[x,5.3,z-d],[x,6.3,z-d]],'#a5b0b3',.6);}this.box([2.5,.16,.65],[0,.6,z-8],'#8b8c83');}
  if(next===5)this.blackMembrane([0,3.12,z-10.9]);
  const hitMaterial=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});this.resources.push(hitMaterial);const hit=this.mesh(new T.PlaneGeometry(6,6),hitMaterial,[0,3,z+.4]);hit.castShadow=false;hit.userData={exit:true};this.targets.push(hit);
 }
 blackMembrane(position){
  // An architectural membrane, independent of the exhibition artworks.
  const geometry=new T.PlaneGeometry(6,6.24,64,64),points=geometry.attributes.position;
  const mesh=this.mesh(geometry,this.material('#06080a',{roughness:.35,metalness:.18,side:T.DoubleSide}),position);mesh.castShadow=false;mesh.receiveShadow=false;
  this.membrane={mesh,base:Float32Array.from(points.array),elapsed:0,last:0};this.disturbMembrane(0);
 }
 ambientActive(){return !!this.membrane&&!this.reduced&&this.section===4&&this.position.z<=this.end+11.05;}
 disturbMembrane(time){const {mesh,base}=this.membrane,points=mesh.geometry.attributes.position;for(let i=0;i<points.count;i++){const x=base[i*3],y=base[i*3+1];const edge=Math.max(0,(1-(x/3)**2)*(1-(y/3.12)**2));points.setZ(i,edge*(.44+.26*Math.sin(x*1.4+y*1.2+time*.47)+.12*Math.sin(y*2.3-x*.8-time*.31)+.05*Math.cos(x*3.1-y*2+time*.23)));}points.needsUpdate=true;mesh.geometry.computeVertexNormals();}
 entry(){
  this.box([5.5,.2,65],[0,-.12,-8],this.groundColor);this.box([14,.26,12],[0,-.22,-27],this.groundColor);this.box([2.2,.16,11],[-5.3,.25,-21],'#babeb6');this.box([4,.14,8],[6.5,.65,-14],'#a5aaa5');
  for(let i=0;i<12;i++){this.line([[-2.75,.015,9-i*4],[2.75,.015,9-i*4]],'#788994',.22);}
  this.line([[-2.65,.025,15],[-2.65,.025,-30]],'#eff1e8',.85);this.line([[2.65,.025,15],[2.65,.025,-30]],'#eff1e8',.85);
  this.box([.2,12,.25],[-7,5.6,-27],'#bec5bc');this.box([.2,12,.25],[7.7,5.6,-27.8],'#a9b4b1');this.box([15,.2,.25],[.3,11.5,-27.4],'#d1d6cb');this.box([15,.17,10],[0,12.3,-28],'#c1c8bf');
  const positions=[],colors=[],idx=[],segments=128,rows=15;
  for(let r=0;r<=rows;r++){const u=r/rows;for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;const outer=4.6*(1+.08*Math.sin(a*3));const radius=.8+(outer-.8)*u;const x=radius*Math.cos(a)*1.3+.55*(1-u);const y=radius*Math.sin(a)*1.1;positions.push(x,y,Math.sin(a*2)*u*.8+Math.cos(a)*u*u*.45);const hue=(a/6.28+u*1.5)%1;const c=new T.Color().setHSL(hue,.12+.42*Math.pow(1-u,7),.53+.12*Math.sin(a));colors.push(c.r,c.g,c.b);if(r<rows&&j<segments){const n=r*(segments+1)+j;idx.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}}}
  const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('color',new T.Float32BufferAttribute(colors,3));g.setIndex(idx);g.computeVertexNormals();const m=this.material('#ffffff',{side:T.DoubleSide,vertexColors:true,roughness:.28,metalness:.38});const membrane=this.mesh(g,m,[3,5.7,-24],[.08,-.2,-.13]);membrane.castShadow=true;this.contact(3,-24,11,7);
  // An architectural bench anchors human scale.
  this.box([3.5,.16,.85],[-4.5,.7,-19],'#d4d4c7');this.box([.12,.7,.8],[-5.8,.3,-19],'#a5ada5');this.box([.12,.7,.8],[-3.2,.3,-19],'#a5ada5');
 }
 architecture(section,works,end){
  if(section===1){
   this.box([.22,10,Math.abs(end)+15],[-9,4.9,(end+8)/2],this.groundColor);this.box([6,.17,Math.abs(end)+18],[-5,8.8,(end+8)/2],'#dadbd3');this.box([4,.15,19],[5,10,-18],'#c9cfc8');
   for(let z=2;z>end;z-=12){this.box([.12,8,.12],[8,4,z],'#adb6b5');this.line([[-7,8,z],[8,8,z]],'#dce1d7',.5);}
  }else if(section===2){
   // Large colour fields stand outside the walking strip; the axis stays open.
   this.box([.24,8,19],[-8,3.8,-4],'#b8613f');this.box([.24,11,22],[8,5.2,-23],'#4e5434');this.box([6,.18,11],[-6,9,-16],'#dfd9cb');this.box([6,.18,8],[5,7.8,-7],'#718696');
   for(let z=-7;z>end;z-=16){const pieces=[[.22,6,.35,-3,3],[.22,6,.35,3,3],[6.22,.22,.35,0,6.11]];for(const [w,h,d,x,y] of pieces)this.box([w,h,d],[x,y,z],z===-7?'#d6d0bd':'#b8613f');this.line([[-2.8,.015,z],[2.8,.015,z]],'#46585c',.6);}
   // A tiny terracotta aperture waits at the far end of the axis.
   this.box([2.4,3.8,.15],[0,1.9,-41],'#b8613f');this.box([.6,1.7,.18],[.1,1.35,-40.88],'#23211f');
  }else if(section===3){
   this.box([.3,6.5,15],[-8.6,3.1,-8],'#263a3b');this.box([6,.2,15],[6,9,-14],'#364548');
   for(let z=-4;z>end;z-=13){this.branch([7.5,0,z],[6.2,7,z-1],.11,'#52625f');this.branch([6.2,4.8,z-.7],[2,9.3,z-3],.08,'#52625f');this.branch([6.2,5.3,z-.7],[9.5,8.5,z-3],.07,'#52625f');this.box([5,.17,5],[7,9.4,z-2],'#394749');}
   this.box([5,.15,3],[-10,2.5,-19],'#344446');this.box([3.6,.15,.75],[-5,.6,-16.5],'#717b73');this.contact(-5,-16.5,5,2);
  }else if(section===4){
   this.box([.2,8,Math.abs(end)+17],[-9.2,3.8,(end+8)/2],'#252936');this.box([17,.18,8],[0,8.5,-3],'#5d6166');
   for(let z=-8;z>end;z-=10){const panel=this.box([4.2,6.7,.045],[z%20===-8?-8.8:8.8,3.35,z],'#879196',{transparent:true,opacity:.13,depthWrite:false});panel.castShadow=false;panel.rotation.y=z%20===-8?.32:-.28;// Suspend the partitions above the artwork sightlines; no floor posts cross an image.
    const rail=this.box([4.2,.06,.07],[panel.position.x,6.73,z],'#8f9a9b');rail.rotation.y=panel.rotation.y;for(const side of [-1,1]){const x=panel.position.x+side*2.1*Math.cos(panel.rotation.y),pz=z-side*2.1*Math.sin(panel.rotation.y);this.line([[x,6.76,pz],[x,8.5,pz]],'#8f9a9b',.6);}}
   this.box([4.2,.15,1.4],[4.8,.82,-8],'#8b8c83');this.box([3.4,.7,.65],[4.8,.36,-8],'#444b51');this.contact(4.8,-8,5,3);this.line([[-.1,.015,9],[-.1,.015,end]],'#adb7b0',.3);
  }else if(section===5){
   this.box([22,12,.3],[0,5.8,-13],'#161b25');this.box([.25,13,25],[-12,6,-5],'#28343e');this.box([.25,13,25],[12,6,-5],'#28343e');this.box([24,.22,13],[0,13,-8],'#515d64');
   this.box([8,.22,4],[0,.12,3],'#a4aaa3');this.box([4.6,.16,.85],[-5.6,.84,5],'#c2c4b7');this.box([.16,.7,.8],[-7.3,.42,5],'#707b7e');this.box([.16,.7,.8],[-3.9,.42,5],'#707b7e');this.contact(-5.6,5,6,2);
   for(const x of [-10.8,10.8])this.line([[x,.1,7],[x,.1,-12],[x,11,-12]],'#a2a9b0',.45);
  }
 }
 branch(a,b,r,color){const start=new T.Vector3(...a),end=new T.Vector3(...b);const mid=start.clone().add(end).multiplyScalar(.5);const m=this.mesh(new T.CylinderGeometry(r*.55,r,start.distanceTo(end),7),this.material(color),mid.toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());}
 enterPortal(){this.renderer.shadowMap.needsUpdate=true;
  // The distant terracotta field expands into two walls around the same path.
  this.box([.18,8,17],[-7.3,4,-31],'#b8613f');this.box([.18,8,17],[7.3,4,-31],'#b8613f');this.box([14.8,.16,9],[0,8.1,-34],'#d6c9b2');this.box([14,.035,8],[0,.001,-31],'#c6a88b');this.invalidate();
 }
 viewFor(w){const p=w.placement,bh=p.width/w.aspect;if(innerWidth>=700){const fraction=Math.min(.6,Math.max(.3,(innerWidth-430)/innerWidth))*(innerWidth<1000?.86:1);const distance=Math.max(w.viewpoint.z-p.z,p.width/(2*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*fraction));const aimOffset=distance*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*Math.max(.3,430/innerWidth);return {pos:[w.viewpoint.x,2,p.z+distance],look:[p.x+aimOffset,p.y,p.z]};}const distance=Math.max(w.viewpoint.z-p.z,p.width/(2*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*.78));return {pos:[w.viewpoint.x,2,p.z+distance],look:[p.x,p.y-bh*.6,p.z]};}
 artwork(w,index){
  const p=w.placement;const bw=p.width,bh=bw/w.aspect;const back=this.box([bw+.1,bh+.1,.08],[p.x,p.y,p.z],this.section===1?'#e7e8df':'#111b20');back.rotation.y=p.yaw;this.contact(p.x,p.z,bw+1,3);
  const mat=new T.MeshBasicMaterial({color:'#3b474c',toneMapped:false,fog:false,side:T.FrontSide});this.resources.push(mat);const board=this.mesh(new T.PlaneGeometry(bw,bh),mat,[p.x,p.y,p.z+.06],[0,p.yaw,0]);board.castShadow=false;board.userData={work:w};this.targets.push(board);const gen=this.generation;
  this.pendingTextures++;new T.TextureLoader().load(w.preview,tex=>{if(gen!==this.generation){tex.dispose();return;}this.pendingTextures--;mat.color.set('#ffffff');button.title='原作品靜態停格';tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());mat.map=tex;mat.needsUpdate=true;this.resources.push(tex);this.invalidate();},undefined,()=>{if(gen!==this.generation)return;this.pendingTextures--;mat.color.set('#8b8580');button.title='預覽載入失敗，可進入原作品觀看';this.invalidate();});
  if(this.section===3){this.box([bw+.6,.18,1.6],[p.x,.8,p.z],'#5c6864');const bottom=p.y-bh/2;this.box([.12,Math.max(.1,bottom-.5),.08],[p.x,(bottom+.5)/2,p.z-.1],'#62716e');}
  if(this.section===4){const bottom=p.y-bh/2;this.box([.1,Math.max(.1,bottom-.08),.08],[p.x,bottom/2,p.z-.1],'#77848a');this.box([2,.07,1],[p.x,.035,p.z],'#59646c');}
  if(this.section===1){for(const x of [p.x-bw*.35,p.x+bw*.35])this.line([[x,p.y+bh/2,p.z],[x,8.5,p.z]],'#aab7b9',.7);}
  const button=document.createElement('button');button.className='art-label';button.hidden=true;button.title='作品停格載入中';button.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small>${w.name}<span class="arrow">↗</span>`;button.setAttribute('aria-label',`靠近作品：${w.name}`);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','work-card');button.addEventListener('click',()=>this.onWork(w));document.getElementById('labels').append(button);this.labels.push({button,pos:new T.Vector3(p.x,p.y-bh/2-.18,p.z+.1),work:w});
 }
 lookAt(target){const dir=new T.Vector3(...target).sub(this.position);this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.atan2(dir.y,Math.hypot(dir.x,dir.z));}
 snapshot(){return {section:this.section,position:this.position.toArray(),yaw:this.yaw,pitch:this.pitch};}
 restore(s){this.animation=null;this.position.fromArray(s.position);this.yaw=s.yaw;this.pitch=s.pitch;this.invalidate();}
 move(pos,look){if(this.reduced){this.position.fromArray(pos);this.lookAt(look);this.invalidate();return;}const from=this.snapshot();const targetPos=new T.Vector3(...pos);const d=new T.Vector3(...look).sub(targetPos);let yaw=Math.atan2(-d.x,-d.z);while(yaw-from.yaw>Math.PI)yaw-=2*Math.PI;while(yaw-from.yaw< -Math.PI)yaw+=2*Math.PI;this.lastMotionFrame=0;this.animation={start:performance.now(),duration:850,from,to:{position:pos,yaw,pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))}};this.invalidate();}
 nearestStation(){let result=0,dist=Infinity;this.stations.forEach((s,i)=>{const d=this.position.distanceToSquared(new T.Vector3(...s.pos));if(d<dist){dist=d;result=i;}});return result;}
 pick(x,y){if(!this.section)return;this.pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.targets,false);if(hits.length){const d=hits[0].object.userData;if(d.exit)this.onStation(this.stations.length);else if(d.work)this.onWork(d.work);else if(d.station!==undefined)this.onStation(d.station);return;}const point=new T.Vector3();if(this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)&&point.z<22&&point.z>this.end&&Math.abs(point.x)<7){let best=0,dist=Infinity;this.stations.forEach((s,i)=>{const d=Math.abs(s.pos[2]-point.z)+Math.abs(s.pos[0]-point.x)*.2;if(d<dist){dist=d;best=i;}});this.onStation(best);}}
 shutdown(){this.closed=true;this.pause(true);this.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();window.removeEventListener('resize',this.resize);}
 pause(p){this.suspended=p;if(this.membrane)this.membrane.last=0;if(p){cancelAnimationFrame(this.raf);this.raf=null;}else this.invalidate();}
 invalidate(){this.dirty=true;if(!this.raf&&!this.suspended&&!document.hidden)this.raf=requestAnimationFrame(this.tick||(()=>{this.raf=null;this.invalidate();}));}
 tick(now){this.raf=null;if(this.suspended||document.hidden)return;const ambient=this.ambientActive();if(ambient){const m=this.membrane;if(!m.last||now-m.last>=1000/30){m.elapsed+=m.last?Math.min((now-m.last)/1000,.05):0;m.last=now;this.disturbMembrane(m.elapsed);this.dirty=true;}}else if(this.membrane)this.membrane.last=0;if(this.animation){if(this.lastMotionFrame&&now-this.lastMotionFrame>120)this.lowFrames++;else this.lowFrames=Math.max(0,this.lowFrames-1);this.lastMotionFrame=now;if(this.lowFrames>6){const ratio=this.renderer.getPixelRatio();if(ratio>.76){this.renderer.setPixelRatio(Math.max(.75,ratio*.65));this.renderer.shadowMap.enabled=false;this.resize();this.lowFrames=0;}else{this.onFailure('裝置繪圖速度較慢，已切換為平面觀看。');return;}}const a=this.animation,t=clamp((now-a.start)/a.duration,0,1),u=t*t*(3-2*t);this.position.fromArray(a.from.position).lerp(new T.Vector3(...a.to.position),u);this.yaw=a.from.yaw+(a.to.yaw-a.from.yaw)*u;this.pitch=a.from.pitch+(a.to.pitch-a.from.pitch)*u;if(t===1)this.animation=null;this.dirty=true;}
  if(this.dirty){this.camera.position.copy(this.position);this.camera.rotation.order='YXZ';this.camera.rotation.set(this.pitch,this.yaw,0);this.camera.updateMatrixWorld();this.renderer.render(this.scene,this.camera);for(const l of this.labels){const dist=this.position.distanceTo(l.pos);const v=l.pos.clone().project(this.camera);const front=(this.position.x-l.work.placement.x)*Math.sin(l.work.placement.yaw)+(this.position.z-l.work.placement.z)*Math.cos(l.work.placement.yaw)>0;const visible=front&&this.section>0&&dist<Math.max(19,l.work.placement.width*3)&&v.z<1&&v.z>0&&Math.abs(v.x)<.92&&v.y<.5&&v.y>-.7;l.button.hidden=!visible;if(visible){l.button.style.left=`${(v.x*.5+.5)*innerWidth}px`;let top=(-v.y*.5+.5)*innerHeight;if(innerWidth<700&&l.button.getAttribute('aria-expanded')==='true')top=Math.min(top,document.getElementById('work-card').offsetTop-l.button.offsetHeight-8);l.button.style.top=`${top}px`;}}
   this.onFrame?.(this.snapshot());this.dirty=false;}
  if(this.animation)this.invalidate();else if(ambient&&!this.raf&&!this.suspended&&!document.hidden)this.raf=requestAnimationFrame(this.tick);
 }
}
