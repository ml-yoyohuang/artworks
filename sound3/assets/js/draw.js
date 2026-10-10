import {clamp,mix,noise,ease} from './model.js';
export const TAU=Math.PI*2;
export function polygon(g,pts,fill,stroke=null,width=1){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.closePath();if(fill){g.fillStyle=fill;g.fill()}if(stroke){g.strokeStyle=stroke;g.lineWidth=width;g.stroke()}}
export function line(g,pts,color,width=1){g.beginPath();pts.forEach((p,i)=>i?g.lineTo(...p):g.moveTo(...p));g.strokeStyle=color;g.lineWidth=width;g.stroke()}
export function ellipse(g,x,y,rx,ry,color){g.fillStyle=color;g.beginPath();g.ellipse(x,y,Math.max(.01,rx),Math.max(.01,ry),0,0,TAU);g.fill()}
export function scene(g,w,h,bg){g.fillStyle=bg;g.fillRect(0,0,w,h);g.save();const u=Math.min(w/1100,h/650),mobile=w<600;g.translate(w/2,h/2);g.scale(u,u);return {u,mobile,w:w/u,h:h/u}}
export function grain(g,w,h,seed,alpha=.05,count=1800){g.save();g.globalAlpha=alpha;for(let i=0;i<count;i++){g.fillStyle=i%2?'#fff':'#000';g.fillRect((noise(i,seed)-.5)*w,(noise(i+345,seed)-.5)*h,noise(i+8,seed)*1.3+.3,.8)}g.restore()}
export function project(x,y,z,angle=.64,scale=70,cy=75){const a=x*Math.cos(angle)-z*Math.sin(angle),b=x*Math.sin(angle)+z*Math.cos(angle);return [a*scale,cy+b*scale*.4-y*scale]}
export function panel(g,pts,color,angle=.64,scale=70,cy=75,edge='rgba(255,255,255,.3)'){polygon(g,pts.map(p=>project(...p,angle,scale,cy)),color,edge,.6)}
export function box(g,x,y,z,wx,hy,wz,colors,angle=.64,scale=70,cy=75){panel(g,[[x,y,z],[x+wx,y,z],[x+wx,y+hy,z],[x,y+hy,z]],colors[0],angle,scale,cy);panel(g,[[x+wx,y,z],[x+wx,y,z+wz],[x+wx,y+hy,z+wz],[x+wx,y+hy,z]],colors[1],angle,scale,cy);panel(g,[[x,y+hy,z],[x+wx,y+hy,z],[x+wx,y+hy,z+wz],[x,y+hy,z+wz]],colors[2],angle,scale,cy)}
export function plinth(g,angle,scale,cy=75){panel(g,[[-3.9,-.3,-3],[3.9,-.3,-3],[3.9,-.3,3],[-3.9,-.3,3]],'#12191f',angle,scale,cy);panel(g,[[-3.9,-.3,3],[3.9,-.3,3],[3.9,-.55,3],[-3.9,-.55,3]],'#111419',angle,scale,cy);panel(g,[[3.9,-.3,-3],[3.9,-.3,3],[3.9,-.55,3],[3.9,-.55,-3]],'#1c242b',angle,scale,cy)}
// Lathe surfaces are sorted front-to-back. Seeded roughness makes each ring
// a material surface rather than an instantaneous waveform.
export function lathe(g,{profile,x=0,y=40,scale=1,angle=0,color=[182,172,151],glass=false,seed=4172,twist=0}){
 const rings=profile.length,segments=44,faces=[];if(rings<2)return;
 const pt=(i,j)=>{const p=profile[i],a=j/segments*TAU+angle+(p.twist||0)*twist,r=p.r*(glass?(1+.16*Math.cos(a*2+(p.twist||0)*1.4)):1);const rough=glass?1:(.98+noise(i*101+j,seed)*.04);return [x+Math.cos(a)*r*rough*scale,y-p.y*scale+Math.sin(a)*r*.27*scale,Math.sin(a),a]};
 for(let i=0;i<rings-1;i++)for(let j=0;j<segments;j++){const a=pt(i,j),b=pt(i,j+1),c=pt(i+1,j+1),d=pt(i+1,j),z=(a[2]+b[2])/2;faces.push({pts:[a.slice(0,2),b.slice(0,2),c.slice(0,2),d.slice(0,2)],z,i,j,a:a[3]})}
 faces.sort((a,b)=>a.z-b.z);
 for(const f of faces){const light=.48+.42*clamp(Math.cos(f.a+2.1)*.5+.5)+.16*noise(f.i*4+f.j,seed),c=color.map(v=>Math.round(v*light));const alpha=glass?.10+.29*clamp(f.z*.5+.5):1;polygon(g,f.pts,`rgba(${c.join(',')},${alpha})`,glass?'rgba(224,238,234,.05)':null);if(glass&&f.j%11===0)line(g,[f.pts[0],f.pts[3]],'rgba(247,255,246,.23)',1.1);if(!glass&&f.i%4===0)line(g,[f.pts[2],f.pts[3]],'rgba(235,218,186,.22)',.55)}
}
