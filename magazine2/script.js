(() => {
  'use strict';
  const tools = document.querySelector('.catalog-tools');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const works = [...document.querySelectorAll('.work')];
  const search = document.querySelector('#search');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('.empty');
  let active = 'all';
  function matchesFilter(work, filter) {
    return filter === 'all' || work.dataset.kind === filter || work.dataset.series === filter;
  }
  buttons.forEach(button => {
    button.querySelector('span').textContent = works.filter(work => matchesFilter(work, button.dataset.filter)).length;
  });
  function update() {
    const query = search.value.trim().normalize('NFKC').toLocaleLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    let total = 0;
    for (const work of works) {
      const text = work.dataset.search.normalize('NFKC').toLocaleLowerCase();
      const visible = matchesFilter(work, active) && words.every(word => text.includes(word));
      work.hidden = !visible;
      if (visible) total++;
    }
    count.textContent = `${total} 件作品${query ? ` /「${search.value.trim()}」` : ''}`;
    empty.hidden = total !== 0;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));
  }
  buttons.forEach(button => button.addEventListener('click', () => { active = button.dataset.filter; update(); }));
  search.addEventListener('input', update);
  document.querySelector('#reset').addEventListener('click', () => {
    active = 'all'; search.value = ''; update(); search.focus({preventScroll:true});
  });
  tools.hidden = false;
})();

// Two small gestures for the opening spread. No scroll interception or render loop.
(() => {
  'use strict';
  const art = document.querySelector('.hero-art');
  const plate = art.querySelector('.hero-main');
  const image = plate.querySelector('img');
  const inset = art.querySelector('.hero-inset');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const mouseAvailable = matchMedia('(any-hover: hover) and (any-pointer: fine)');
  let visible = false;
  let inside = false;
  let hoverTimer = 0;
  let frame = 0;
  let touchPlayed = false;
  let touchAnimation = null;
  let imageReady = image.complete && image.naturalWidth > 0;
  let pendingPoint = null;
  const enabled = () => !reduced.matches && visible && !document.hidden;

  function rest() {
    clearTimeout(hoverTimer);
    hoverTimer = 0;
    cancelAnimationFrame(frame);
    frame = 0;
    pendingPoint = null;
    art.classList.remove('is-exposed');
    inset.style.removeProperty('--plate-x');
    inset.style.removeProperty('--plate-y');
  }
  function stop() {
    art.classList.add('is-motion-paused');
    inside = false;
    rest();
    if (touchAnimation) touchAnimation.cancel();
    touchAnimation = null;
  }
  function touchExposure() {
    if (!enabled() || touchPlayed || !imageReady || typeof image.animate !== 'function') return;
    touchPlayed = true;
    art.classList.remove('is-motion-paused');
    touchAnimation = image.animate([
      {filter:'saturate(.35) contrast(.88) brightness(1.08)'},
      {filter:'saturate(1) contrast(1) brightness(1)'}
    ], {duration:1600, easing:'cubic-bezier(.22,.61,.36,1)'});
    touchAnimation.onfinish = () => { touchAnimation = null; };
  }
  function ready() {
    imageReady = image.naturalWidth > 0;
    if (!mouseAvailable.matches) touchExposure();
  }
  if (!imageReady) image.addEventListener('load', ready, {once:true});

  art.addEventListener('pointerenter', event => {
    if (event.pointerType !== 'mouse' || !mouseAvailable.matches || !enabled()) return;
    inside = true;
    art.classList.remove('is-motion-paused');
    hoverTimer = setTimeout(() => {
      hoverTimer = 0;
      if (inside && enabled() && imageReady) art.classList.add('is-exposed');
    }, 180);
  });
  art.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !mouseAvailable.matches || !inside || !enabled()) return;
    pendingPoint = {x:event.clientX, y:event.clientY};
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      if (!pendingPoint || !enabled() || !inside) return;
      const rect = art.getBoundingClientRect();
      const x = Math.max(-1,Math.min(1,(pendingPoint.x-rect.left)/rect.width*2-1));
      const y = Math.max(-1,Math.min(1,(pendingPoint.y-rect.top)/rect.height*2-1));
      inset.style.setProperty('--plate-x',`${(x*14).toFixed(2)}px`);
      inset.style.setProperty('--plate-y',`${(y*12).toFixed(2)}px`);
    });
  });
  art.addEventListener('pointerleave', () => { inside = false; rest(); });
  // Touch on a hybrid laptop also uses the quiet, one-time exposure.
  art.addEventListener('pointerdown', event => {
    if (event.pointerType !== 'mouse') { rest(); touchExposure(); }
  }, {passive:true});

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting && entries[0].intersectionRatio >= .4;
      if (!visible) { stop(); return; }
      art.classList.remove('is-motion-paused');
      if (!mouseAvailable.matches) touchExposure();
    }, {threshold:[0,.4]});
    observer.observe(plate);
  }
  reduced.addEventListener('change', () => {
    stop();
    if (!reduced.matches && visible && !document.hidden) {
      art.classList.remove('is-motion-paused');
      if (!mouseAvailable.matches) touchExposure();
    }
  });
  mouseAvailable.addEventListener('change', () => {
    stop();
    if (!mouseAvailable.matches) touchExposure();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (visible && !reduced.matches) {
      art.classList.remove('is-motion-paused');
      if (!mouseAvailable.matches) touchExposure();
    }
  });
})();
