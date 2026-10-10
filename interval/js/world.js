import * as T from '../../showroom/vendor/three/build/three.module.js';
import {architecturalMaterial,GALLERY_LIGHT} from './shading.js?v=colour-1';
import {oilMaterial} from './oil-material.js?v=1';
const clamp=T.MathUtils.clamp;
export class MuseumWorld {
 constructor(host,ex,{onWork,onStation,onPortal,onReady,onFailure,onFrame,reduced}){
  Object.assign(this,{host,ex,onWork,onStation,onPortal,onReady,onFailure,onFrame,reduced});this.shadingMode='clean';this.section=0;this.pendingTextures=0;this.resources=[];this.labels=[];this.targets=[];this.generation=0;this.yaw=0;this.pitch=0;this.position=new T.Vector3(0,2,13);this.suspended=false;this.dirty=true;this.lowFrames=0;this.lastMotionFrame=0;this.closed=false;this.entryOffset=0;this.entryTilt=0;this.entryApproach=null;this.drag=null;this.animation=null;
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
 material(color,extra={}){let m;
  // Preserve the approved entrance and genuinely reflective special materials.
  if(!this.section||extra.metalness>0)m=new T.MeshStandardMaterial({color,roughness:.89,metalness:0,...extra});
  else if(extra.transparent)m=new T.MeshBasicMaterial({color:'#b8d1dc',...extra,toneMapped:false});
  else if(this.shadingMode==='light')m=new T.MeshStandardMaterial({color,roughness:.89,metalness:0,...extra});
  else m=architecturalMaterial(color,extra);
  this.resources.push(m);return m;
 }
 mesh(geo,mat,pos,rot){this.resources.push(geo);const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);if(rot)m.rotation.set(...rot);m.castShadow=true;m.receiveShadow=true;this.group.add(m);return m;}
 box(size,pos,color,extra){return this.mesh(new T.BoxGeometry(...size),this.material(color,extra),pos);}
 softBox(size,pos,color,r=.025,extra={}){const [w,h,d]=size,b=Math.min(r,w/4,h/4,d/4),shape=new T.Shape();shape.moveTo(-w/2+b,-h/2+b);shape.lineTo(w/2-b,-h/2+b);shape.lineTo(w/2-b,h/2-b);shape.lineTo(-w/2+b,h/2-b);shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth:d-2*b,bevelEnabled:true,bevelThickness:b,bevelSize:b,bevelSegments:2,steps:1,curveSegments:1});g.translate(0,0,-d/2+b);return this.mesh(g,this.material(color,extra),pos);}
 solidSection(outline,depth,pos,color,rot){const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const geometry=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:false,steps:1,curveSegments:1});geometry.translate(0,0,-depth/2);const mesh=this.mesh(geometry,this.material(color),pos,rot);mesh.receiveShadow=false;return mesh;}
 insetFloor(end){const shape=new T.Shape();shape.moveTo(-11.5,end-13);shape.lineTo(11.5,end-13);shape.lineTo(11.5,22);shape.lineTo(-11.5,22);shape.closePath();const hole=new T.Path();hole.moveTo(-4,1);hole.lineTo(-4,5);hole.lineTo(4,5);hole.lineTo(4,1);hole.closePath();shape.holes.push(hole);this.mesh(new T.ShapeGeometry(shape),this.material(this.groundColor,{side:T.DoubleSide}),[0,-.05,0],[Math.PI/2,0,0]).castShadow=false;this.mesh(new T.PlaneGeometry(8,4),this.material('#818b89'),[0,-.05,3],[-Math.PI/2,0,0]).castShadow=false;}
 line(points,color='#b8b9ad',opacity=.4){const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));const m=new T.LineBasicMaterial({color,transparent:true,opacity});this.resources.push(g,m);const l=new T.Line(g,m);this.group.add(l);return l;}
 contact(x,z,w,d,opacity=.32,y=.012){const c=document.createElement('canvas');c.width=c.height=64;const ctx=c.getContext('2d');const grad=ctx.createRadialGradient(32,32,2,32,32,31);const tint=this.section>=3?'37,67,87':'89,117,121',alpha=this.section?Math.min(opacity,.2):opacity;grad.addColorStop(0,`rgba(${tint},${alpha})`);grad.addColorStop(1,`rgba(${tint},0)`);ctx.fillStyle=grad;ctx.fillRect(0,0,64,64);const tex=new T.CanvasTexture(c);this.resources.push(tex);const m=new T.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false,toneMapped:false});this.resources.push(m);this.mesh(new T.PlaneGeometry(w,d),m,[x,y,z],[-Math.PI/2,0,0]).castShadow=false;}
 clear(){this.resetEntryApproach();this.entryFilm=null;this.membrane=null;this.floatingAperture=null;this.thresholdSheets=null;this.generation++;this.pendingTextures=0;this.labels.forEach(l=>l.button.remove());this.labels=[];this.targets=[];this.group.clear();this.resources.forEach(r=>r.dispose?.());this.resources=[];this.scene.children.filter(c=>c!==this.group).forEach(c=>{if(c.dispose)c.dispose();else c.shadow?.dispose();this.scene.remove(c);});}
 build(section){this.clear();this.renderer.shadowMap.needsUpdate=true;this.section=section;this.animation=null;const dark=section>=3;const bg=section===0?'#263542':section===1?'#77818a':section===2?'#676e76':section===3?'#0b191e':section===4?'#181f2a':'#101a25';this.scene.background=new T.Color(bg);this.scene.fog=new T.Fog(bg,section===0?24:22,section===0?110:section===1?72:80);
  const lighting=GALLERY_LIGHT[section];if(lighting)this.scene.fog=new T.Fog(bg,...lighting.fog);
  const hemi=new T.HemisphereLight(lighting?.sky||(dark?'#b9c8d9':'#e5e8e8'),lighting?.ground||(dark?'#475563':'#74695d'),dark?1.3:2.8);this.scene.add(hemi);const sun=new T.DirectionalLight(lighting?.sun||'#fff1d9',dark?2:3.2);sun.position.set(-9,19,9);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-18,right:18,top:20,bottom:-48});sun.shadow.radius=4;sun.shadow.bias=-.0005;sun.shadow.normalBias=.04;this.scene.add(sun,sun.target);sun.target.position.set(0,0,-10);
  this.groundColor=section===0?'#d8d8cc':section===1?'#d7d5cc':section===2?'#c7bfac':section===3?'#2b393a':section===4?'#4a4d51':'#6b7071';
  if(!section){this.entry();this.stations=[];this.position.set(0,3,13);this.lookAt(innerWidth<900?[.7,-.6,-26]:[-8,4,-23]);return;}
  const works=this.ex.works.filter(w=>w.section===section);const end=Math.min(...works.map(w=>w.placement.z))-8;this.end=end;
  this.stations=[{name:'展廳入口',pos:[0,2,10],look:[0,2,-8]},...works.map(w=>({name:w.name,pos:this.viewFor(w).pos,look:this.viewFor(w).look,work:w})),{name:section===5?'終章 · 安靜的平台':'下一個展區',pos:section===5?[0,2,6]:[0,2,end+(innerWidth<700?11:8)],look:section===5?[0,3,-12]:[0,2.35,end-8]}];
  if(section===2)this.stations.splice(9,0,{name:'懸浮的門 · 留白之間',pos:[0,2,-73],look:[-3.5,5.2,-88]});
  if(section===5)this.insetFloor(end);
  else if(section!==2)this.box([16,.26,Math.abs(end)+35],[0,-.18,(end+9)/2],this.groundColor);
  else {for(const [front,back] of [[14,-29.35],[-30.65,-77.35],[-78.65,end-13]])this.box([15,.22,front-back],[0,-.16,(front+back)/2],this.groundColor);}
  this.architecture(section,works,end);
  for(const [i,w] of works.entries())this.artwork(w,i);
  const markerRadius=.22,goldenRatio=(1+Math.sqrt(5))/2;
  for(const [i,s] of this.stations.entries()){const geometry=new T.RingGeometry(markerRadius/goldenRatio,markerRadius,48);const material=new T.MeshBasicMaterial({color:dark?'#a1adae':'#576868',transparent:true,opacity:.65,side:T.DoubleSide,toneMapped:false});this.resources.push(material);const ring=this.mesh(geometry,material,[s.pos[0],.03,s.pos[2]],[-Math.PI/2,0,0]);ring.castShadow=false;ring.userData={station:i};this.targets.push(ring);}
  // A shallow architectural glimpse of the next room; no adjacent artworks run here.
  if(section<5)this.threshold(section+1,end);
  this.position.set(0,2,10);this.lookAt(innerWidth<700?[works[0].placement.x,works[0].placement.y,works[0].placement.z]:[0,2,-8]);this.invalidate();
 }
 threshold(next,end){
  const z=end-2, wall=['','#77818a','#676e76','#102128','#242b36','#161b25'][next];
  const light=new T.PointLight('#d9edf4',20,20,2);light.position.set(0,4.7,z-5);this.group.add(light);
  // The frame and corridor share one opening and one extrusion: no second outline behind the frame.
  const outline=[[-3.33,-.05],[-3.33,6.26],[3.33,6.26],[3.33,-.05],[3.07,-.05],[3.07,6],[-3.07,6],[-3.07,-.05]];
  const shape=new T.Shape();outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
  const geometry=new T.ExtrudeGeometry(shape,{depth:11.35,bevelEnabled:false,steps:1,curveSegments:1});geometry.translate(0,0,-11.025);
  const shell=this.mesh(geometry,[this.material(this.groundColor),this.material(wall,{emissive:wall,emissiveIntensity:.25})],[0,0,z]);shell.receiveShadow=false;
  this.box([6.14,6.05,.15],[0,2.975,z-11.1],wall,{emissive:wall,emissiveIntensity:.25});
  if(next===2)this.box([.2,5.2,7],[-2.5,2.6,z-5],'#a8654b');
  // The garden threshold stays empty: depth, light and a clear walking surface.
  // Two parallel, unequal sheets leave clear margins around the corridor corners.
  if(next===4){const sheets=[];for(const [x,d,y,w,h,opacity,amplitude,period,phase] of [[-1.1,4.8,2.75,1.5,3.6,.2,18,18,0],[1.25,7.5,2.85,1.2,3.2,.14,12,23,1.4]]){const material=new T.MeshPhysicalMaterial({color:'#a5b0b3',roughness:.48,metalness:.06,clearcoat:.18,clearcoatRoughness:.28,transparent:true,opacity,depthWrite:false});this.resources.push(material);const panel=this.mesh(new T.BoxGeometry(w,h,.025),material,[x,y,z-d]);panel.name=x<0?'threshold-sheet-left':'threshold-sheet-right';panel.castShadow=false;panel.receiveShadow=false;sheets.push({mesh:panel,amplitude:T.MathUtils.degToRad(amplitude),period,phase});}this.thresholdSheets={sheets,elapsed:0,last:0};}
  if(next===5){this.blackMembrane([0,3,z-10.9]);this.membrane.mesh.scale.set(6.14/6,6/6.24,1);}
  const hitMaterial=new T.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,side:T.DoubleSide});this.resources.push(hitMaterial);const hit=this.mesh(new T.PlaneGeometry(6,6),hitMaterial,[0,3,z+.4]);hit.castShadow=false;hit.userData={exit:true};this.targets.push(hit);
 }
 blackMembrane(position){
  // An architectural membrane, independent of the exhibition artworks.
  const relief=this.membraneStyle==='relief';
  const geometry=new T.PlaneGeometry(6,6.24,relief?64:1,relief?64:1),points=geometry.attributes.position;
  const material=relief?this.material('#303843',{roughness:.35,metalness:.18,emissive:'#292f39',emissiveIntensity:.18,side:T.DoubleSide}):oilMaterial();
  if(!relief){material.side=T.DoubleSide;this.resources.push(material);}
  const mesh=this.mesh(geometry,material,position);mesh.castShadow=false;mesh.receiveShadow=false;
  this.membrane={mesh,relief,base:relief?Float32Array.from(points.array):null,elapsed:0,last:0};this.disturbMembrane(0);
 }
 ambientActive(){return !this.reduced&&(!!this.floatingAperture&&this.section===2||!!this.entryFilm&&this.section===0||!!this.membrane&&this.section===4&&this.position.z<=this.end+11.05||!!this.thresholdSheets&&this.section===3&&this.position.z<=this.end+18);}
 swayThresholdSheets(time){for(const {mesh,amplitude,period,phase} of this.thresholdSheets.sheets)mesh.rotation.y=amplitude*Math.sin(time*Math.PI*2/period+phase);}
 floatAperture(time){const m=this.floatingAperture.mesh;m.position.set(-4.7+.14*Math.sin(time*.25),7.4+.35*Math.sin(time*.48),-88+.22*(Math.cos(time*.3)-1));m.rotation.set(.015*Math.sin(time*.3),.16+.03*Math.sin(time*.29),-.08+.018*Math.sin(time*.37));}
 disturbMembrane(time){const {mesh,base,relief}=this.membrane;if(!relief){mesh.material.uniforms.uTime.value=time;return;}const points=mesh.geometry.attributes.position;for(let i=0;i<points.count;i++){const x=base[i*3],y=base[i*3+1];const edge=Math.max(0,(1-(x/3)**2)*(1-(y/3.12)**2));points.setZ(i,edge*(.44+.26*Math.sin(x*1.4+y*1.2+time*.47)+.12*Math.sin(y*2.3-x*.8-time*.31)+.05*Math.cos(x*3.1-y*2+time*.23)));}points.needsUpdate=true;mesh.geometry.computeVertexNormals();}
 entry(){
  // A clear path rises through four suspended stair plates toward the membrane.
  this.box([5.5,.2,30],[0,-.12,7],this.groundColor);
  for(const [x,y,z] of [[1.8,.45,-13],[1.1,1.35,-19],[.4,2.25,-25],[-.3,3.15,-31]])this.box([6.2,.14,5.4],[x,y,z],'#dde5e4');
  this.line([[-2.65,.025,15],[-2.65,.025,-7]],'#eff1e8',.45);
  this.line([[2.65,.025,15],[2.65,.025,-7]],'#eff1e8',.45);
  const positions=[],colors=[],idx=[],segments=112,rows=20;
  for(let r=0;r<=rows;r++){const u=r/rows;for(let j=0;j<=segments;j++){
   const a=j/segments*Math.PI*2,radius=.8+3.8*u;
   positions.push(radius*Math.cos(a)*1.3,radius*Math.sin(a)*1.1,0);
   const c=new T.Color().setHSL((a/(Math.PI*2)+u*.3)%1,.09,.48);colors.push(c.r,c.g,c.b);
   if(r<rows&&j<segments){const n=r*(segments+1)+j;idx.push(n,n+1,n+segments+1,n+1,n+segments+2,n+segments+1);}
  }}
  const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new T.Float32BufferAttribute(colors,3));geometry.setIndex(idx);
  const material=new T.MeshPhysicalMaterial({color:'#ffffff',side:T.DoubleSide,vertexColors:true,roughness:.32,metalness:.12,iridescence:.4,iridescenceIOR:1.34,iridescenceThicknessRange:[180,380]});this.resources.push(material);
  const mesh=this.mesh(geometry,material,[-.4,10.6,-35],[.08,-.2,-.13]);mesh.castShadow=false;mesh.receiveShadow=false;
  this.entryFilm={mesh,base:Float32Array.from(geometry.attributes.position.array),elapsed:0,last:0,segments,rows};this.disturbEntryFilm(0);
 }
 disturbEntryFilm(time){
  const {mesh,base,segments,rows}=this.entryFilm,points=mesh.geometry.attributes.position,colors=mesh.geometry.attributes.color,color=new T.Color();
  for(let i=0;i<points.count;i++){const u=Math.floor(i/(segments+1))/rows,a=(i%(segments+1))/segments*Math.PI*2,envelope=Math.sin(Math.PI*u);
   points.setXYZ(i,base[i*3]*(1+.045*u*Math.sin(a*2+time*.31)),base[i*3+1]*(1+.065*u*Math.cos(a*3-time*.27)),envelope*(1.2*Math.sin(a*2+time*.4)+.48*Math.sin(a*3-u*3-time*.27))+u*.18*Math.sin(a*2-time*.24));
   const spiral=a+u*11-time*.2,band=.5+.5*Math.sin(spiral),highlight=Math.pow(.5+.5*Math.sin(spiral+.8),5);color.setHSL(.49+.22*band,.46+.18*envelope,.54+.17*highlight);colors.setXYZ(i,color.r,color.g,color.b);
  }
  points.needsUpdate=true;colors.needsUpdate=true;mesh.geometry.computeVertexNormals();const normals=mesh.geometry.attributes.normal,normal=new T.Vector3();for(let row=0;row<=rows;row++){const first=row*(segments+1),last=first+segments;normal.set(normals.getX(first)+normals.getX(last),normals.getY(first)+normals.getY(last),normals.getZ(first)+normals.getZ(last)).normalize();normals.setXYZ(first,normal.x,normal.y,normal.z);normals.setXYZ(last,normal.x,normal.y,normal.z);}normals.needsUpdate=true;mesh.material.roughness=.32+.018*Math.sin(time*.16);mesh.material.iridescenceThicknessRange[0]=180+18*Math.sin(time*.12);mesh.material.iridescenceThicknessRange[1]=380+22*Math.sin(time*.12);
 }
 architecture(section,works,end){
  if(section===1){
   this.solidSection([[-9.11,-.2],[-8.89,-.2],[-8.89,8.52],[-2,8.52],[-2,8.68],[-9.11,8.68]],Math.abs(end)+18,[0,0,(end+8)/2],'#dadbd3');
   this.box([2.4,.12,Math.abs(end)+18],[5,8.6,(end+8)/2],'#c9cfc8');
   for(const z of [-14,-34])this.box([3.6,6.4,.18],[-6.8,3.1,z],'#c8c9c1');
  }else if(section===2){
   // Two colour fields and two portals: small intermediate rooms reveal each pair.
   this.box([.24,8,31],[-8,3.8,-8],'#a8654b');this.box([.24,9,36],[8,4.3,-40],'#555b45');
   // Broad colour walls carry the directional shadow; thin frames and fins stay quiet.
   for(const z of [-9,-71]){this.continuousPortal(z,'#c8c9bc').castShadow=false;for(const side of [-1,1])this.contact(side*3.2,z,1.3,1.7,.13,-.04);}
   for(const z of [-13,-33,-53,-96]){for(const side of [-1,1]){const panel=this.box([4.5,6.7,.2],[side*4.85,3.25,z],z===-33||z===-96?'#7c8580':'#b5b3a7');panel.castShadow=false;panel.receiveShadow=false;}}
   // A suspended colour aperture occupies the open upper bay beyond the second portal.
   const aperture=new T.Group();aperture.name='floating-aperture';this.group.add(aperture);
   aperture.add(this.softBox([2.8,3.8,.15],[0,0,0],'#a8654b',.025));
   const inset=this.box([.7,1.75,.04],[.1,-.45,.105],'#23211f');inset.castShadow=false;aperture.add(inset);
   aperture.position.set(-4.7,7.4,-88);aperture.rotation.set(0,.16,-.08);
   this.floatingAperture={mesh:aperture,elapsed:0,last:0};


  }else if(section===3){
   this.box([.3,6.5,22],[-8.6,3.1,-9],'#263a3b');
   // A single complete branch silhouette, kept outside every artwork sightline.
   this.branch([8.8,0,-18],[8.1,6.8,-20],.16,'#394b49');
   this.branch([8.1,6.8,-20],[5.8,9.1,-23],.12,'#394b49');
   this.branch([8.1,6.8,-20],[9.6,9.1,-22],.11,'#394b49');
   const joint=this.mesh(new T.SphereGeometry(.12,12,8),this.material('#394b49'),[8.1,6.8,-20]);joint.castShadow=false;
   this.softBox([4.65,.18,5.25],[7.7,9.25,-23],'#344447',.035);
   for(let z=-16;z>end+5;z-=22){for(const side of [-1,1])this.box([5,5.8,.24],[side*5.8,2.8,z],'#172a2d');}
   this.softBox([3.6,.22,.75],[-5,.5,-16.5],'#64716b',.035);this.contact(-5,-16.5,4.2,1.6);
  }else if(section===4){
   this.box([.2,8,Math.abs(end)+17],[-9.2,3.8,(end+8)/2],'#252936');
   for(const [z,side] of [[-10,-1],[-32,1],[-54,-1]]){
    for(const layer of [0,1]){const panel=this.box([4.8,6.1,.06],[side*(6.6+layer*.55),3.05,z-layer*1.6],'#9aa8ac',{transparent:true,opacity:layer?.11:.19,depthWrite:false});panel.castShadow=false;panel.receiveShadow=false;panel.rotation.y=side*.07;}
   }
   for(const z of [-15,-37,-59])for(const side of [-1,1])this.box([5,6.2,.16],[side*5.9,3,z],'#222c35');
   this.softBox([3.8,.24,.85],[6,.65,-12],'#747e7e',.035);this.box([2.8,.53,.48],[6,.265,-12],'#303c44');this.contact(6,-12,4.2,1.6);
  }else if(section===5){
   this.solidSection([[13.15,-.2],[12.85,-.2],[12.85,12.91],[1.5,12.91],[1.5,13.09],[13.15,13.09]],22,[0,0,0],'#161b25',[0,Math.PI/2,0]);
   this.box([.25,13,31],[-12,6,-2],'#28343e');this.box([.25,13,31],[12,6,-2],'#28343e');
   this.softBox([4.6,.22,.85],[-6.7,.73,3],'#afb7ae',.035);this.box([3.5,.6,.5],[-6.7,.3,3],'#526263');this.contact(-6.7,3,5.3,1.6);
   // Side works occupy quiet alcoves, discovered by turning away from the finale.
   for(const side of [-1,1])this.box([4.4,6.4,.2],[side*9.6,3.1,.2],'#26333d');
  }
 }
 continuousPortal(z,color,depth=.34){const shape=new T.Shape();const outline=[[-3.33,0],[-3.33,6.26],[3.33,6.26],[3.33,0],[3.07,0],[3.07,6],[-3.07,6],[-3.07,0]];outline.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();const g=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.02,bevelSize:.02,bevelSegments:2,steps:1,curveSegments:1});g.translate(0,0,-depth/2);const frame=this.mesh(g,this.material(color),[0,0,z]);frame.receiveShadow=false;return frame;}
 branch(a,b,r,color){const start=new T.Vector3(...a),end=new T.Vector3(...b);const mid=start.clone().add(end).multiplyScalar(.5);const m=this.mesh(new T.CylinderGeometry(r*.7,r,start.distanceTo(end),12),this.material(color),mid.toArray());m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),end.sub(start).normalize());m.castShadow=false;}
 enterPortal(){this.renderer.shadowMap.needsUpdate=true;
  // The distant terracotta field expands into two walls around the same path.
  this.box([.18,8,17],[-7.3,4,-31],'#b8613f');this.box([.18,8,17],[7.3,4,-31],'#b8613f');this.box([14.8,.16,9],[0,8.1,-34],'#d6c9b2');this.box([14,.035,8],[0,.001,-31],'#c6a88b');this.invalidate();
 }
 viewFor(w){const p=w.placement,bh=p.width/w.aspect;if(innerWidth>=700){const fraction=Math.min(.52,Math.max(.3,(innerWidth-430)/innerWidth))*(innerWidth<1000?.86:1);const distance=Math.max(w.viewpoint.z-p.z,p.width/(2*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*fraction));const aimOffset=distance*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*Math.max(.3,430/innerWidth);return {pos:[w.viewpoint.x,2,p.z+distance],look:[p.x+aimOffset,p.y,p.z]};}const distance=Math.max(w.viewpoint.z-p.z,p.width/(2*Math.tan(T.MathUtils.degToRad(this.camera.fov/2))*this.camera.aspect*.78));return {pos:[w.viewpoint.x,2,p.z+distance],look:[p.x,p.y-bh*.6,p.z]};}
 artwork(w,index){
  const p=w.placement;const bw=p.width,bh=bw/w.aspect;const back=this.box([bw+.06,bh+.06,.07],[p.x,p.y,p.z],this.section===1?'#e7e8df':'#111b20');back.rotation.y=p.yaw;back.castShadow=false;back.receiveShadow=false;
  const mat=new T.MeshBasicMaterial({color:'#3b474c',toneMapped:false,fog:false,side:T.FrontSide});this.resources.push(mat);const board=this.mesh(new T.PlaneGeometry(bw,bh),mat,[p.x,p.y,p.z+.06],[0,p.yaw,0]);board.castShadow=false;board.userData={work:w};this.targets.push(board);const gen=this.generation;
  this.pendingTextures++;new T.TextureLoader().load(w.preview,tex=>{if(gen!==this.generation){tex.dispose();return;}this.pendingTextures--;mat.color.set('#ffffff');button.title='原作品靜態停格';tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=Math.min(8,this.renderer.capabilities.getMaxAnisotropy());mat.map=tex;mat.needsUpdate=true;this.resources.push(tex);this.invalidate();},undefined,()=>{if(gen!==this.generation)return;this.pendingTextures--;mat.color.set('#8b8580');button.title='預覽載入失敗，可進入原作品觀看';this.invalidate();});
  if(this.section===3){const base=this.softBox([bw+.35,.24,1.15],[p.x,.65,p.z],'#52625e');base.rotation.y=p.yaw;base.castShadow=false;const bottom=p.y-bh/2,height=Math.max(.1,bottom-.77);const support=this.box([Math.min(1.15,bw*.3),height,.22],[p.x-Math.sin(p.yaw)*.22,.77+height/2,p.z-Math.cos(p.yaw)*.22],'#263b39');support.rotation.y=p.yaw;support.castShadow=false;}
  if(this.section===4){const bottom=p.y-bh/2,height=Math.max(.1,bottom-.18);const support=this.box([Math.min(1.1,bw*.27),height,.2],[p.x-Math.sin(p.yaw)*.24,.18+height/2,p.z-Math.cos(p.yaw)*.24],'#35454d');support.rotation.y=p.yaw;support.castShadow=false;const base=this.softBox([Math.min(1.45,bw*.4),.13,.65],[p.x,.065,p.z-.2],'#45545c');base.rotation.y=p.yaw;base.castShadow=false;this.contact(p.x,p.z,2.4,1.4);}
  if(this.section===1){for(const offset of [-bw*.35,bw*.35]){const x=p.x+offset*Math.cos(p.yaw),z=p.z-offset*Math.sin(p.yaw);this.line([[x,p.y+bh/2,z],[x,8.51,z]],'#97a3a4',.28);}}
  if(this.section===3)this.contact(p.x,p.z,bw+.4,1.6);
  const button=document.createElement('button');button.className='art-label';button.hidden=true;button.title='作品停格載入中';button.innerHTML=`<small>${String(index+1).padStart(2,'0')}</small>${w.name}<span class="arrow">↗</span>`;button.setAttribute('aria-label',`靠近作品：${w.name}`);button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','work-card');button.addEventListener('click',()=>this.onWork(w));document.getElementById('labels').append(button);this.labels.push({button,mesh:board,pos:new T.Vector3(p.x,p.y-bh/2-.18,p.z+.1),work:w});
 }
 lookAt(target){const dir=new T.Vector3(...target).sub(this.position);this.yaw=Math.atan2(-dir.x,-dir.z);this.pitch=Math.atan2(dir.y,Math.hypot(dir.x,dir.z));}
 resetEntryApproach(){this.entryApproach?.resolve(false);this.entryApproach=null;this.entryOffset=0;this.entryTilt=0;this.dirty=true;}
 approachEntry(target,duration=1000,tilt=0){
  this.entryApproach?.resolve(false);this.entryApproach=null;
  if(this.section!==0||this.reduced||this.suspended||document.hidden){this.entryOffset=0;this.entryTilt=0;this.invalidate();return Promise.resolve(false);}
  if(Math.abs(target-this.entryOffset)<.001&&Math.abs(tilt-this.entryTilt)<.00001){this.entryOffset=target;this.entryTilt=tilt;return Promise.resolve(true);}
  return new Promise(resolve=>{this.entryApproach={from:this.entryOffset,to:target,fromTilt:this.entryTilt,toTilt:tilt,start:performance.now(),duration,resolve};this.invalidate();});
 }
 snapshot(){return {section:this.section,position:this.position.toArray(),yaw:this.yaw,pitch:this.pitch};}
 restore(s){this.animation=null;this.position.fromArray(s.position);this.yaw=s.yaw;this.pitch=s.pitch;this.invalidate();}
 move(pos,look){if(this.reduced){this.position.fromArray(pos);this.lookAt(look);this.invalidate();return;}const from=this.snapshot();const targetPos=new T.Vector3(...pos);const d=new T.Vector3(...look).sub(targetPos);let yaw=Math.atan2(-d.x,-d.z);while(yaw-from.yaw>Math.PI)yaw-=2*Math.PI;while(yaw-from.yaw< -Math.PI)yaw+=2*Math.PI;this.lastMotionFrame=0;this.animation={start:performance.now(),duration:850,from,to:{position:pos,yaw,pitch:Math.atan2(d.y,Math.hypot(d.x,d.z))}};this.invalidate();}
 nearestStation(){let result=0,dist=Infinity;this.stations.forEach((s,i)=>{const d=this.position.distanceToSquared(new T.Vector3(...s.pos));if(d<dist){dist=d;result=i;}});return result;}
 pick(x,y){if(!this.section)return;this.pointer.set(x/innerWidth*2-1,-y/innerHeight*2+1);this.ray.setFromCamera(this.pointer,this.camera);const hits=this.ray.intersectObjects(this.targets,false);if(hits.length){const d=hits[0].object.userData;if(d.work){const obstruction=this.ray.intersectObjects(this.group.children.flatMap(o=>o.isMesh?[o]:o.children).filter(o=>o.isMesh&&!o.material.transparent),false)[0];if(obstruction&&obstruction.distance<hits[0].distance-.01)return;}if(d.exit)this.onStation(this.stations.length);else if(d.work)this.onWork(d.work);else if(d.station!==undefined)this.onStation(d.station);return;}const point=new T.Vector3();if(this.ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),0),point)&&point.z<22&&point.z>this.end&&Math.abs(point.x)<7){let best=0,dist=Infinity;this.stations.forEach((s,i)=>{const d=Math.abs(s.pos[2]-point.z)+Math.abs(s.pos[0]-point.x)*.2;if(d<dist){dist=d;best=i;}});this.onStation(best);}}
 shutdown(){this.closed=true;this.pause(true);this.clear();this.renderer.dispose();this.renderer.forceContextLoss();this.renderer.domElement.remove();window.removeEventListener('resize',this.resize);}
 pause(p){this.suspended=p;if(p)this.resetEntryApproach();if(this.membrane)this.membrane.last=0;if(this.entryFilm)this.entryFilm.last=0;if(this.floatingAperture)this.floatingAperture.last=0;if(this.thresholdSheets)this.thresholdSheets.last=0;if(p){cancelAnimationFrame(this.raf);this.raf=null;}else this.invalidate();}
 invalidate(){this.dirty=true;if(!this.raf&&!this.suspended&&!document.hidden)this.raf=requestAnimationFrame(this.tick||(()=>{this.raf=null;this.invalidate();}));}
 tick(now){this.raf=null;if(this.suspended||document.hidden)return;const ambient=this.ambientActive();if(ambient){const m=this.entryFilm||this.membrane||this.floatingAperture||this.thresholdSheets;if(!m.last||now-m.last>=1000/30){m.elapsed+=m.last?Math.min((now-m.last)/1000,.05):0;m.last=now;if(this.entryFilm)this.disturbEntryFilm(m.elapsed);else if(this.floatingAperture)this.floatAperture(m.elapsed);else if(this.thresholdSheets)this.swayThresholdSheets(m.elapsed);else this.disturbMembrane(m.elapsed);this.dirty=true;}}else {if(this.membrane)this.membrane.last=0;if(this.entryFilm)this.entryFilm.last=0;if(this.floatingAperture)this.floatingAperture.last=0;if(this.thresholdSheets)this.thresholdSheets.last=0;}if(this.entryApproach){const a=this.entryApproach,t=clamp((now-a.start)/a.duration,0,1),u=t*t*(3-2*t);this.entryOffset=a.from+(a.to-a.from)*u;this.entryTilt=a.fromTilt+(a.toTilt-a.fromTilt)*u;this.dirty=true;if(t===1){this.entryApproach=null;a.resolve(true);}}if(this.animation){if(this.lastMotionFrame&&now-this.lastMotionFrame>120)this.lowFrames++;else this.lowFrames=Math.max(0,this.lowFrames-1);this.lastMotionFrame=now;if(this.lowFrames>6){const ratio=this.renderer.getPixelRatio();if(ratio>.76){this.renderer.setPixelRatio(Math.max(.75,ratio*.65));this.renderer.shadowMap.enabled=false;this.resize();this.lowFrames=0;}else{this.onFailure('裝置繪圖速度較慢，已切換為平面觀看。');return;}}const a=this.animation,t=clamp((now-a.start)/a.duration,0,1),u=t*t*(3-2*t);this.position.fromArray(a.from.position).lerp(new T.Vector3(...a.to.position),u);this.yaw=a.from.yaw+(a.to.yaw-a.from.yaw)*u;this.pitch=a.from.pitch+(a.to.pitch-a.from.pitch)*u;if(t===1)this.animation=null;this.dirty=true;}
  if(this.dirty){this.camera.position.copy(this.position);if(this.section===0&&this.entryOffset){const c=Math.cos(this.pitch);this.camera.position.add(new T.Vector3(-Math.sin(this.yaw)*c,Math.sin(this.pitch),-Math.cos(this.yaw)*c).multiplyScalar(this.entryOffset));}this.camera.rotation.order='YXZ';this.camera.rotation.set(this.pitch+(this.section===0?this.entryTilt:0),this.yaw,0);this.camera.updateMatrixWorld();for(const target of this.targets){if(target.userData.station!==undefined){const distance=this.position.distanceTo(target.position);target.material.opacity=.65*(1-clamp((distance-8)/22,0,.9));}}this.renderer.render(this.scene,this.camera);const surfaces=this.group.children.flatMap(o=>o.isMesh?[o]:o.children).filter(o=>o.isMesh&&!o.material.transparent);for(const l of this.labels){const dist=this.position.distanceTo(l.pos);const v=l.pos.clone().project(this.camera);const front=(this.position.x-l.work.placement.x)*Math.sin(l.work.placement.yaw)+(this.position.z-l.work.placement.z)*Math.cos(l.work.placement.yaw)>0;let visible=front&&this.section>0&&dist<Math.max(19,l.work.placement.width*3)&&v.z<1&&v.z>0&&Math.abs(v.x)<.92&&v.y<.5&&v.y>-.7;if(visible){this.ray.set(this.camera.position,l.mesh.position.clone().sub(this.camera.position).normalize());visible=this.ray.intersectObjects(surfaces,false)[0]?.object===l.mesh;}l.button.hidden=!visible;if(visible){l.button.style.left=`${(v.x*.5+.5)*innerWidth}px`;let top=(-v.y*.5+.5)*innerHeight;if(innerWidth<700&&l.button.getAttribute('aria-expanded')==='true')top=Math.min(top,document.getElementById('work-card').offsetTop-l.button.offsetHeight-8);l.button.style.top=`${top}px`;}}
   this.onFrame?.(this.snapshot());this.dirty=false;}
  if(this.animation||this.entryApproach)this.invalidate();else if(ambient&&!this.raf&&!this.suspended&&!document.hidden)this.raf=requestAnimationFrame(this.tick);
 }
}
