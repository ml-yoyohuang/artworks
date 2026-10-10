// One entrance gesture. Keep the accessible heading intact and leave no running animation.
let played=false,animations=[],epoch=0;
export function finishIntroTitle(){
 epoch++;animations.forEach(a=>a.cancel());animations=[];
 const title=document.getElementById('exhibition-title');if(title)title.dataset.state='settled';
}
export async function startIntroTitle(isReduced){
 if(played)return;played=true;await document.fonts.ready;
 const title=document.getElementById('exhibition-title');
 if(isReduced()||document.hidden||document.getElementById('intro').hidden){finishIntroTitle();return;}
 const generation=++epoch;title.dataset.state='playing';
 for(const glyph of [title.children[2],title.children[3]])animations.push(glyph.animate([{transform:'translateY(0)'},{transform:'translateY(.055em)'}],{duration:640,delay:70,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
 for(const [half,offset] of [['top','-.03em,-.045em'],['bottom','.03em,.045em']])animations.push(title.querySelector('.'+half).animate([{transform:'translate(0,0)'},{transform:`translate(${offset})`}],{duration:680,delay:300,easing:'cubic-bezier(.22,1,.36,1)',fill:'both'}));
 await Promise.all(animations.map(a=>a.finished.catch(()=>{})));
 if(generation===epoch)finishIntroTitle();
}
