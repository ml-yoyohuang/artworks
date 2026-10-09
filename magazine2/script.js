(() => {
  'use strict';
  const tools = document.querySelector('.catalog-tools');
  const buttons = [...document.querySelectorAll('[data-filter]')];
  const works = [...document.querySelectorAll('.work')];
  const search = document.querySelector('#search');
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('.empty');
  let active = 'all';
  function update() {
    const query = search.value.trim().normalize('NFKC').toLocaleLowerCase();
    const words = query.split(/\s+/).filter(Boolean);
    let total = 0;
    for (const work of works) {
      const text = work.dataset.search.normalize('NFKC').toLocaleLowerCase();
      const visible = (active === 'all' || work.dataset.kind === active) && words.every(word => text.includes(word));
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
