// MP3 grows this shell from nothing; old rings are simplified, never replayed.
import * as THREE from 'three';
import {GrowthRhythm} from '../../../audio/growth-rhythm.js';
import {makeRenderer,envMap,fit,orbitInput,disposeScene,noiseTexture} from '../core/three-kit.js';
const BUDGET=2048,K=32,S=K+1,STEP=.045,B=.135;
const clamp=v=>Math.max(0,Math.min(1,v));
export function createWork(){return {
  init(api){
    this.renderer=makeRenderer(api.canvas,{exposure:1.0});
    this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#121110');
    this.env=envMap(this.renderer,.04);
    this.camera=new THREE.PerspectiveCamera(32,1,.05,80);
    this.view={yaw:0,pitch:0,touched:0};orbitInput(api.canvas,this.view,api,{yaw:[-Math.PI,Math.PI],pitch:[-.35,.35],speed:.008});
    this.scene.add(new THREE.HemisphereLight('#ebe4d6','#3c332c',.8));
    const key=new THREE.DirectionalLight('#ffe2b8',1.8);key.position.set(-3,5,5);this.scene.add(key);
    const rim=new THREE.DirectionalLight('#abbcda',1.4);rim.position.set(4,1,-3);this.scene.add(rim);
    this.shell=new THREE.Group();this.scene.add(this.shell);
    const geo=this.geo=new THREE.BufferGeometry();
    for(const name of ['position','normal','color'])geo.setAttribute(name,new THREE.BufferAttribute(new Float32Array(BUDGET*S*3),3).setUsage(THREE.DynamicDrawUsage));
    const uv=new Float32Array(BUDGET*S*2);for(let i=0;i<BUDGET;i++)for(let k=0;k<=K;k++){const j=(i*S+k)*2;uv[j]=i*.06;uv[j+1]=k/K*3;}geo.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    const indices=new Uint32Array((BUDGET-1)*K*6);let n=0;
    for(let i=0;i<BUDGET-1;i++)for(let k=0;k<K;k++){const a=i*S+k,b=a+S;indices.set([a,b,a+1,b,b+1,a+1],n);n+=6;}geo.setIndex(new THREE.BufferAttribute(indices,1));geo.setDrawRange(0,0);
    const grain=noiseTexture(256,5,5,1);
    const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.82,bumpMap:grain,bumpScale:.045,envMap:this.env,envMapIntensity:.45,side:THREE.DoubleSide});
    this.mesh=new THREE.Mesh(geo,mat);this.mesh.frustumCulled=false;this.shell.add(this.mesh);
    this.base=new THREE.Color('#d6c9ad');this.ribColor=new THREE.Color('#a88d64');this.ridge=new THREE.Color('#f3eee2');this.color=new THREE.Color();
    this.reset();
  },
  reset(){
    this.rings=[];this.totalRings=0;this.theta=.55;this.nextTheta=.55;this.visible=0;this.t=0;this.pulse=0;this.dirty=false;this.lastBuild=-1;
    this.rhythm=new GrowthRhythm();
    this.geo.setDrawRange(0,0);this.mesh.visible=false;this.center=new THREE.Vector3();this.boundsRadius=.3;this.distance=3.8;
  },
  updateMusic(f,dt){
    if(dt<=0)return;
    this.t+=dt;
    const growthRate=this.rhythm.update(f,dt);
    if(growthRate===0)return;
    this.pulse=Math.max(this.pulse,f.pulse||0);
    // Integrate audible time, not track duration; there is no terminal turn count.
    this.theta+=dt*growthRate;
    while(this.nextTheta<=this.theta){
      if(this.rings.length===BUDGET){
        const older=this.rings.slice(0,BUDGET-512).filter((_,i)=>i%2===0);
        this.rings=older.concat(this.rings.slice(BUDGET-512));
      }
      this.rings.push({theta:this.nextTheta,energy:clamp(f.energy),rib:this.pulse,bands:Array.from(f.bands)});
      this.nextTheta+=STEP;this.totalRings++;this.pulse=0;this.dirty=true;
    }
    this.visible=this.rings.length;
  },
  rebuild(){
    const rings=this.rings,N=rings.length;if(N<2)return;
    const pos=this.geo.attributes.position,normal=this.geo.attributes.normal,col=this.geo.attributes.color;
    // Relative exponent keeps geometry numerically bounded even after days of music.
    const tip=rings[N-1].theta,anchor=Math.max(.55,tip-Math.log(2.4/.24)/B);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
    for(let i=0;i<N;i++){
      const r=rings[i],th=r.theta,rr=.24*Math.exp(B*(th-anchor)),cs=Math.cos(th),sn=Math.sin(th),len=Math.hypot(B*cs-sn,B*sn+cs);
      const nx=(B*sn+cs)/len,ny=-(B*cs-sn)/len;
      const rho=rr*.36*(.92+.12*r.energy)*(1+.12*r.rib),cx=rr*cs,cy=rr*sn;
      for(let k=0;k<=K;k++){
        const ph=k/K*Math.PI*2,c=Math.cos(ph),s=Math.sin(ph),band=r.bands[Math.floor((k%K)/4)]||0;
        const re=rho*(1+.24*band),x=cx+nx*c*re,y=cy+ny*c*re,z=s*re*.8,j=i*S+k;
        pos.setXYZ(j,x,y,z);const nl=Math.hypot(nx*c,ny*c,s/ .8);normal.setXYZ(j,nx*c/nl,ny*c/nl,s/.8/nl);
        this.color.copy(this.base).lerp(this.ribColor,r.rib*.7).lerp(this.ridge,band*.7);col.setXYZ(j,this.color.r,this.color.g,this.color.b);
        minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
      }
    }
    pos.needsUpdate=normal.needsUpdate=col.needsUpdate=true;
    this.geo.setDrawRange(0,(N-1)*K*6);this.mesh.visible=true;
    this.center.set((minX+maxX)/2,(minY+maxY)/2,(minZ+maxZ)/2);
    this.boundsRadius=Math.hypot(maxX-minX,maxY-minY,maxZ-minZ)/2;
    this.mesh.position.copy(this.center).multiplyScalar(-1);
    this.dirty=false;this.lastBuild=this.t;
  },
  render(api){
    if(this.dirty&&(!api.state.playing||this.t-this.lastBuild>=.08||this.rings.length<5))this.rebuild();
    this.shell.rotation.y=this.view.yaw+(api.reduced?0:Math.sin(this.t*.12)*.18);
    const aspect=this.camera.aspect,halfFov=16*Math.PI/180;
    this.distance=Math.max(3.8,this.boundsRadius/Math.sin(halfFov)*1.15/Math.min(1,aspect));
    const pitch=.08+this.view.pitch;
    this.camera.position.set(0,Math.sin(pitch)*this.distance,Math.cos(pitch)*this.distance);this.camera.lookAt(0,0,0);
    this.renderer.render(this.scene,this.camera);
  },
  resize(w,h,dpr){fit(this.renderer,this.camera,w,h,dpr);},
  inspect(){return {rings:this.rings.length,totalRings:this.totalRings,turns:(this.theta-.55)/(2*Math.PI),drawCount:this.geo.drawRange.count,sceneMeshes:1,budget:BUDGET,growthRate:this.rhythm.rate,growthBpm:this.rhythm.bpm};},
  dispose(){disposeScene(this.scene,this.renderer);this.env.dispose();}
};}
