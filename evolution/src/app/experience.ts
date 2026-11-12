import type { Simulation } from '../sim';
import { ChamberSound } from './sound';

export type ExperienceMode='watch'|'explore'|'research';
const $=<T extends HTMLElement=HTMLElement>(id:string)=>document.getElementById(id) as T;
const TIPS=[
  ['先看一會兒','這裡的生命會自己覓食、繁殖，孩子也可能長得和親代有一點不同。你不必急著做什麼。'],
  ['靠近一個生命','點選一個小傢伙，看看牠的樣子，再按「跟隨牠」。也可以用 [ 和 ] 換一個觀察對象；空白鍵暫停。'],
  ['留下今天的相遇','喜歡牠就按星號，取個暱稱。收藏庫會自動保存這片水域，也能匯出檔案，改天再接著看。'],
  ['帶著問題探索','切到「研究」，看看族群曲線、改變一類食物，再觀察會發生什麼。沒有保證的勝負，每次觀察都可能不同。'],
];
export class Experience {
  mode:ExperienceMode='explore';
  private sound=new ChamberSound();
  private soundDue=0;
  private tip=0;
  constructor(private getSim:()=>Simulation,private changeMode:(mode:ExperienceMode)=>void,private closePanels:()=>void) {
    document.querySelectorAll<HTMLButtonElement>('#experience-modes [data-mode]').forEach(b=>b.onclick=()=>this.setMode(b.dataset.mode as ExperienceMode));
    $('sound-toggle').onclick=()=>{const open=$('sound-panel').hidden;if(open)this.closePanels();$('sound-panel').hidden=!open;$('sound-toggle').setAttribute('aria-expanded',String(open));if(open)$('sound-close').focus();};
    $('sound-close').onclick=()=>this.closeSound();
    $('sound-enable').onclick=async()=>{
      const b=$<HTMLButtonElement>('sound-enable');b.disabled=true;
      try {await this.sound.setEnabled(!this.sound.active);b.textContent=this.sound.active?'關閉環境音':'開啟環境音';b.setAttribute('aria-pressed',String(this.sound.active));this.soundDue=0;$('sound-status').textContent=this.sound.active?'聲音隨觀測緩慢流動；暫停或切換分頁也會休息。':'已靜音，隨時可以再打開。';}
      catch{$('sound-status').textContent='這個瀏覽器目前無法開啟音訊，觀察箱仍可照常使用。';}
      finally{b.disabled=false;}
    };
    $('sound-volume').oninput=()=>{const volume=Number($<HTMLInputElement>('sound-volume').value);this.sound.setVolume(volume/100);$('sound-volume-label').textContent=`${volume}%`;this.soundDue=0;};
    $('fullscreen-toggle').onclick=async()=>{
      try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
      catch{$('fullscreen-toggle').setAttribute('title','目前瀏覽器不支援全螢幕，仍可用靜觀模式觀看。');}
    };
    if(!document.fullscreenEnabled)$<HTMLButtonElement>('fullscreen-toggle').disabled=true;
    document.addEventListener('fullscreenchange',()=>$('fullscreen-toggle').setAttribute('aria-pressed',String(!!document.fullscreenElement)));
    $('help-toggle').onclick=()=>{if($('onboarding').hidden){this.tip=0;this.renderTip();}else this.dismissTip();};
    $('onboarding-next').onclick=()=>{if(++this.tip>=TIPS.length)this.dismissTip();else this.renderTip();};
    $('onboarding-dismiss').onclick=()=>this.dismissTip();
    try{if(localStorage.getItem('evolution-intro-seen')!=='1')this.renderTip();}catch{this.renderTip();}
    document.addEventListener('visibilitychange',()=>{if(document.hidden)void this.sound.suspend().catch(()=>{});this.soundDue=0;});
    window.addEventListener('pagehide',()=>{void this.sound.suspend().catch(()=>{});});
  }
  setMode(mode:ExperienceMode) {
    this.mode=mode;document.body.dataset.mode=mode;
    document.querySelectorAll<HTMLElement>('#experience-modes [data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));
    this.closeSound();this.changeMode(mode);
    if(mode==='watch'){this.dismissTip();$('experience-modes').querySelector<HTMLButtonElement>('[data-mode="watch"]')?.focus();}
  }
  closeSound() {const focused=$('sound-panel').contains(document.activeElement);$('sound-panel').hidden=true;$('sound-toggle').setAttribute('aria-expanded','false');if(focused)$('sound-toggle').focus();}
  closeExtras() {this.closeSound();this.dismissTip();}
  private renderTip() {
    $('onboarding').hidden=false;$('onboarding-step').textContent=`觀察小提示 ${this.tip+1} / ${TIPS.length}`;
    $('onboarding-title').textContent=TIPS[this.tip][0];$('onboarding-text').textContent=TIPS[this.tip][1];
    $('onboarding-next').textContent=this.tip===TIPS.length-1?'開始觀察':'下一個提示';$('help-toggle').setAttribute('aria-expanded','true');
  }
  private dismissTip() {
    const focused=$('onboarding').contains(document.activeElement);
    $('onboarding').hidden=true;$('help-toggle').setAttribute('aria-expanded','false');
    try{localStorage.setItem('evolution-intro-seen','1');}catch{}
    if(focused)$('help-toggle').focus();
  }
  frame(now:number,paused:boolean) {
    if(now<this.soundDue)return;this.soundDue=now+500;this.sound.update(this.getSim(),paused);
    const status=$('sound-status');status.dataset.audioState=this.sound.state;
    if(this.sound.active){const text=paused?'觀測暫停，環境音也在休息。':!this.getSim().orgs.length?'水域安靜下來，環境音也暫時休息。':'聲音隨族群與水域緩慢流動。';if(status.textContent!==text)status.textContent=text;}
  }
}
