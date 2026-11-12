/** Styled listboxes. Original selects remain the source of values and change events. */
class SelectControl {
  private button=document.createElement('button');
  private popup=document.createElement('div');
  private active=0;
  private expanded=false;
  private search='';
  private searchedAt=0;
  constructor(private source:HTMLSelectElement) {
    source.hidden=true;
    this.button.type='button';this.button.id=`${source.id}-button`;this.button.className='select-control';
    this.button.setAttribute('role','combobox');this.button.setAttribute('aria-haspopup','listbox');
    this.button.setAttribute('aria-expanded','false');this.button.setAttribute('aria-controls',`${source.id}-listbox`);
    if(source.title)this.button.title=source.title;
    this.popup.id=`${source.id}-listbox`;this.popup.className='select-menu';this.popup.setAttribute('role','listbox');
    this.popup.setAttribute('popover','manual');this.popup.hidden=true;
    source.after(this.button);document.body.append(this.popup);
    this.button.onclick=()=>this.expanded?this.close():this.open();this.button.onkeydown=e=>this.key(e);
    this.popup.addEventListener('pointerdown',e=>e.preventDefault());
    source.addEventListener('change',()=>this.sync());
    new MutationObserver(()=>this.sync()).observe(source,{attributes:true,childList:true,characterData:true,subtree:true});
    for(const label of source.labels??[])label.addEventListener('click',e=>{if(!(e.target as Element).closest('button,select,input,a')){e.preventDefault();this.button.focus();}});
    this.sync();
  }
  sync() {
    const name=this.source.getAttribute('aria-label')||[...(this.source.labels??[])].map(label=>{
      const clone=label.cloneNode(true) as HTMLElement;clone.querySelectorAll('select,button,input,output').forEach(e=>e.remove());return clone.textContent?.trim()||'';
    }).join(' ')||this.source.id;
    this.button.setAttribute('aria-label',name);this.popup.setAttribute('aria-label',name);
    this.button.disabled=this.source.disabled;this.button.textContent=this.source.selectedOptions[0]?.label??'';
    this.popup.lang=this.source.closest<HTMLElement>('[lang]')?.lang||document.documentElement.lang;
    if(this.expanded){if(this.source.disabled)this.close();else this.options();}
  }
  private options() {
    this.popup.replaceChildren();
    [...this.source.options].forEach((option,index)=>{
      const row=document.createElement('div');row.id=`${this.source.id}-option-${index}`;row.className='select-option';row.setAttribute('role','option');
      row.setAttribute('aria-selected',String(option.selected));row.setAttribute('aria-disabled',String(option.disabled));row.textContent=option.label;
      row.onclick=()=>this.choose(index);row.onpointermove=()=>{if(!option.disabled){this.active=index;this.highlight();}};this.popup.append(row);
    });this.highlight();
  }
  private highlight() {
    [...this.popup.children].forEach((row,i)=>row.classList.toggle('active',i===this.active));
    const row=this.popup.children[this.active] as HTMLElement|undefined;
    if(row){this.button.setAttribute('aria-activedescendant',row.id);row.scrollIntoView({block:'nearest'});}
  }
  private open() {
    if(this.source.disabled)return;
    current?.close();current=this;this.expanded=true;this.active=Math.max(0,this.source.selectedIndex);
    this.popup.hidden=false;this.options();this.popup.style.minWidth=`${this.button.getBoundingClientRect().width}px`;
    if(typeof this.popup.showPopover==='function')this.popup.showPopover();
    this.button.setAttribute('aria-expanded','true');
    const anchor=this.button.getBoundingClientRect(),menu=this.popup.getBoundingClientRect();
    const below=window.innerHeight-anchor.bottom-12,above=anchor.top-12;
    this.popup.style.maxHeight=`${Math.max(60,Math.min(280,Math.max(below,above)))}px`;
    const height=Math.min(menu.height,Math.max(below,above),280);
    this.popup.style.left=`${Math.max(12,Math.min(anchor.left,window.innerWidth-menu.width-12))}px`;
    this.popup.style.top=`${below>=height?anchor.bottom+6:Math.max(12,anchor.top-height-6)}px`;
    this.highlight();
  }
  close() {
    if(!this.expanded)return;
    this.expanded=false;this.button.setAttribute('aria-expanded','false');this.button.removeAttribute('aria-activedescendant');
    if(typeof this.popup.hidePopover==='function'&&this.popup.matches(':popover-open'))this.popup.hidePopover();
    this.popup.hidden=true;this.search='';if(current===this)current=undefined;
  }
  contains(target:Node) {return this.button.contains(target)||this.popup.contains(target);}
  private choose(index:number) {
    if(this.source.disabled||this.source.options[index]?.disabled)return;
    const changed=this.source.selectedIndex!==index;this.source.selectedIndex=index;this.close();this.sync();this.button.focus();
    if(changed){this.source.dispatchEvent(new Event('input',{bubbles:true}));this.source.dispatchEvent(new Event('change',{bubbles:true}));}
  }
  private move(direction:number) {
    const options=this.source.options;
    for(let i=this.active+direction;i>=0&&i<options.length;i+=direction)if(!options[i].disabled){this.active=i;break;}
    this.highlight();
  }
  private key(e:KeyboardEvent) {
    if(['ArrowDown','ArrowUp','Home','End','Enter',' '].includes(e.key)) {
      e.preventDefault();e.stopPropagation();
      if(!this.expanded){this.open();if(e.key==='Home'){this.active=0;this.highlight();}else if(e.key==='End'){this.active=this.source.options.length-1;this.highlight();}return;}
      if(e.key==='Enter'||e.key===' ')this.choose(this.active);
      else if(e.key==='Home'){this.active=0;this.highlight();}
      else if(e.key==='End'){this.active=this.source.options.length-1;this.highlight();}
      else this.move(e.key==='ArrowDown'?1:-1);
    } else if(e.key==='Escape'&&this.expanded){e.preventDefault();e.stopPropagation();this.close();}
    else if(e.key==='Tab')this.close();
    else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey) {
      e.stopPropagation();const now=performance.now();this.search=now-this.searchedAt>700?e.key:this.search+e.key;this.searchedAt=now;
      const index=[...this.source.options].findIndex(o=>!o.disabled&&o.label.toLocaleLowerCase().startsWith(this.search.toLocaleLowerCase()));
      if(index>=0){if(this.expanded){this.active=index;this.highlight();}else this.choose(index);}
    }
  }
}
let current:SelectControl|undefined;
export function installSelectControls() {
  const controls=[...document.querySelectorAll<HTMLSelectElement>('select')].map(select=>new SelectControl(select));
  document.addEventListener('pointerdown',e=>{if(current&&!current.contains(e.target as Node))current.close();},true);
  window.addEventListener('resize',()=>current?.close());
  document.addEventListener('scroll',e=>{if(current&&!(e.target as Element).closest?.('.select-menu'))current.close();},true);
  document.addEventListener('app-dialog-toggle',()=>current?.close());
  document.addEventListener('data-language-change',()=>controls.forEach(control=>control.sync()));
  return ()=>controls.forEach(control=>control.sync());
}
