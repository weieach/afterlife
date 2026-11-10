(() => {
  'use strict';

  const $ = (sel) => document.querySelector(sel);
  const PAGE = 24; // people shown at first, and added by each "Show more"

  /* ---------- text (same helpers as app.js: English and Chinese side by side) ---------- */

  const CONTENT = window.SURVEY_CONTENT;

  const lookup = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  function t(path, l = 'en', vars) {
    let s = lookup(CONTENT[l] || {}, path);
    if (s == null) s = lookup(CONTENT.en, path);
    if (s == null) return path;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  const pair = (path, vars) => [t(path, 'en', vars), t(path, 'zh', vars)];

  function joined(path, vars) {
    const [en, zh] = pair(path, vars);
    return zh && zh !== en ? `${zh} / ${en}` : en;
  }

  // Text that may mix in Chinese (an English sentence with 纸扎 in it, or what someone typed):
  // each run of Chinese characters goes in its own lang="zh-CN" span, so it gets the Chinese
  // font (style.css --font-zh) rather than the Korean one's few look-alike characters.
  const HAN = /[\u3000-\u303f\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uff00-\uffef]+/g;
  function setText(node, text) {
    const s = String(text);
    HAN.lastIndex = 0;
    const mixed = HAN.test(s);
    HAN.lastIndex = 0; // test() moved it on; matchAll() below starts from here
    if (!mixed) { node.textContent = s; return node; }
    const parts = [];
    let at = 0;
    for (const m of s.matchAll(HAN)) {
      if (m.index > at) parts.push(s.slice(at, m.index));
      const zh = document.createElement('span');
      zh.lang = 'zh-CN';
      zh.textContent = m[0];
      parts.push(zh);
      at = m.index + m[0].length;
    }
    if (at < s.length) parts.push(s.slice(at));
    node.replaceChildren(...parts);
    return node;
  }

  function fillPair(node, en, zh) {
    const parts = [[zh !== en && zh, 'zh'], [en, 'en']].filter(([text]) => text).map(([text, l]) => {
      const span = document.createElement('span');
      span.className = `bi__${l}`;
      span.lang = l === 'zh' ? 'zh-CN' : 'en';
      if (l === 'zh') span.textContent = text;
      else setText(span, text);
      return span;
    });
    node.classList.add('bi');
    node.replaceChildren(...parts);
    return node;
  }
  const fill = (node, path, vars) => fillPair(node, ...pair(path, vars));

  function applyText(root) {
    root.querySelectorAll('[data-t]').forEach((node) => fill(node, node.dataset.t));
    root.querySelectorAll('[data-t-aria]').forEach((node) => { node.setAttribute('aria-label', joined(node.dataset.tAria)); });
  }

  const itemNames = {};
  for (const l of Object.keys(CONTENT)) {
    itemNames[l] = new Map((CONTENT[l].items || []).map((it) => [it.id, it.name]));
  }

  /* ---------- categories and cutouts (same files and colours as the pick screen) ---------- */

  const IMAGES = window.SURVEY_IMAGES || {};
  const COLORS = IMAGES.colors || {};
  const catOf = new Map((CONTENT.en.items || []).map((it) => [it.id, it.category]));

  function cutoutUrl(id) {
    const file = IMAGES.files?.[id];
    if (!file) return null;
    const folder = IMAGES.folders?.[catOf.get(id)];
    return new URL((IMAGES.base || '') + (folder ? `${folder}/` : '') + file, document.baseURI).href;
  }

  // the deeper shade of a category colour, for text (as in the search list)
  function deepen(hex) {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
    const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    const hue = !d ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return `hsl(${Math.round(hue * 60 + 360) % 360} ${Math.round(Math.min(1, sat * 1.15 + 0.1) * 100)}% ${Math.round(l * 52)}%)`;
  }

  // [English, Chinese] for a stored pick: today's names from content/*.js, else what was saved.
  // A write-in shows what the person typed, under a "自定义 Custom" label.
  function namesFor(pick) {
    if (pick.id === 'other') {
      return [pick.custom || lookup(CONTENT.en, 'pick.other'), lookup(CONTENT.zh || {}, 'pick.other') || ''];
    }
    return [itemNames.en.get(pick.id) || pick.en || pick.id, itemNames.zh?.get(pick.id) || pick.zh || ''];
  }

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) setText(node, text); // what people typed may be Chinese
    return node;
  }

  function names(pick, cls) {
    const [en, zh] = namesFor(pick);
    const wrap = el('span', cls);
    if (zh && zh !== en) {
      const z = el('span', `${cls}__zh`);
      const zhText = el('span', '', pick.id === 'other' ? t('results.custom', 'zh') : zh);
      zhText.lang = 'zh-CN';
      z.append(zhText);
      // a write-in keeps the name they typed below; the label above is "自定义 Custom"
      if (pick.id === 'other' && pick.custom) {
        const custom = el('span', '', t('results.custom', 'en'));
        custom.lang = 'en';
        z.append(custom);
      }
      wrap.append(z);
    }
    wrap.append(el('span', `${cls}__en`, en));
    return wrap;
  }

  // The item's cutout on its category colour; a write-in gets every colour at once.
  function thumb(pick, cls) {
    const box = el('span', `thumb ${cls}`);
    box.setAttribute('aria-hidden', 'true');
    const color = pick.id !== 'other' && COLORS[catOf.get(pick.id)];
    if (color) box.style.setProperty('--cat', color);
    if (pick.id === 'other') {
      // a write-in: the survey's noise field (noise.js), a different patch for each one, dealt afresh on every load
      const c = el('canvas', 'thumb__noise');
      c.width = c.height = window.SURVEY_NOISE.PX;
      window.SURVEY_NOISE.draw(c, 0, window.SURVEY_NOISE.variant());
      box.append(c);
    }
    const src = pick.id !== 'other' && cutoutUrl(pick.id);
    if (src) {
      const img = el('img');
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      img.src = src;
      box.append(img);
    }
    return box;
  }

  /* ---------- data ---------- */

  let rows = []; // newest first
  let mine = new Set();
  let shown = PAGE;
  let status = 'loading'; // loading | ready | error
  const demo = new URLSearchParams(location.search).has('demo');

  // ?demo: made-up wishlists, to see the page with a crowd in it. Nothing is saved.
  function sampleRows() {
    let seed = 7;
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const items = (CONTENT.en.items || []).filter((it) => !it.retired).map((it) => ({ id: it.id, w: rand() ** 3 + 0.02 })); // only what can be picked now
    const total = items.reduce((sum, it) => sum + it.w, 0);
    const draw = () => {
      let x = rand() * total;
      return items.find((it) => (x -= it.w) < 0) || items[0];
    };
    const writeIns = ['Grandma’s radio', 'My cat', 'Rice cooker', 'Photo albums', 'Wi-Fi'];
    const reasons = ['', '', 'So I never get bored.', 'I can’t live without it now, so why would I then?', 'For the family reunion down there.', 'Everyone needs one.'];
    return Array.from({ length: 36 }, (_, i) => {
      const ids = new Set();
      while (ids.size < 5) ids.add(draw().id);
      const picks = [...ids].map((id) => ({ id, reason: reasons[Math.floor(rand() * reasons.length)] }));
      if (rand() < 0.3) picks[4] = { id: 'other', custom: writeIns[Math.floor(rand() * writeIns.length)], reason: '' };
      return { id: `demo-${i}`, created_at: new Date(Date.now() - i * 9e6 * (1 + rand())).toISOString(), picks };
    });
  }

  /* ---------- render ---------- */

  // One person: their number (in the order people answered), the date, and their five picks
  // as tiles in a ruled row, each with what they said about it.
  function renderPerson(r, number) {
    const card = el('article', 'person');
    const head = el('header', 'person__head');
    head.append(fill(el('h2', 'person__no'), 'results.person', { n: number }));
    // the nickname they chose, or "访客 Visitor" when they left it blank
    const nick = r.nickname?.trim();
    head.append(nick ? el('span', 'person__nick', nick) : fill(el('span', 'person__nick person__nick--visitor'), 'results.visitor'));
    if (mine.has(r.id)) {
      card.classList.add('is-mine');
      head.append(fill(el('span', 'person__you'), 'results.you'));
    }
    // and the date: the survey answers are never shown with someone's picks
    if (r.created_at) {
      const day = new Date(r.created_at);
      head.append(el('span', 'person__date', day.toLocaleDateString('en', { year: 'numeric', month: 'short', day: 'numeric' }))); // "Nov 5, 2026"
    }

    const picks = el('ol', 'person__picks');
    for (const pick of r.picks || []) {
      const li = el('li', 'person__pick');
      const color = pick.id !== 'other' && COLORS[catOf.get(pick.id)];
      if (color) li.style.setProperty('--cat-deep', deepen(color));
      li.append(thumb(pick, 'person__img'), names(pick, 'person__name'));
      if (pick.variation) li.append(el('span', 'person__variation', pick.variation));
      if (pick.reason) li.append(el('q', 'person__reason', pick.reason));
      picks.append(li);
    }
    card.append(head, picks);
    return card;
  }

  function render() {
    const msg = $('#results-msg');
    const more = $('#more');

    if (status !== 'ready') {
      fill(msg, status === 'error' ? 'results.error' : 'results.loading');
      $('#people').replaceChildren();
      more.hidden = true;
      return;
    }

    const notes = [demo && 'results.demo', !demo && !window.SURVEY_DB.configured && 'results.local', !rows.length && 'results.empty'].filter(Boolean);
    fillPair(msg, ...['en', 'zh'].map((l) => notes.map((path) => t(path, l)).join(' ')));
    // newest first, numbered from the first person to answer
    $('#people').replaceChildren(...rows.slice(0, shown).map((r, i) => renderPerson(r, rows.length - i)));
    const left = rows.length - shown;
    more.hidden = left <= 0;
    if (left > 0) fill(more, 'results.showMore', { n: Math.min(PAGE, left) });
  }

  $('#more').addEventListener('click', () => {
    shown += PAGE;
    render();
  });

  document.title = joined('results.title');
  // the landing's dotted ∞ (infinity.js), over the title
  $('#results-headline').before(window.makeInfinity('results__infinity'));
  applyText(document);
  render();

  // Scrolling down, the title and ∞ condense into the header: as the big title passes under the
  // header, the small copy rises into it (--p: 0 hidden, 1 in place). Scrolling back reverses it.
  const mini = $('.results-mini');
  mini.firstElementChild.prepend(window.makeInfinity('results-mini__mark'));
  const head = $('.screen--results .topbar');
  const bigTitle = $('#results-headline');
  let miniRaf = 0;
  function syncMini() {
    miniRaf = 0;
    const edge = head.getBoundingClientRect().bottom;
    const r = bigTitle.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, (edge - r.top) / (r.height || 1)));
    mini.style.setProperty('--p', p.toFixed(3));
    mini.classList.toggle('is-on', p > 0);
  }
  const queueMini = () => { if (!miniRaf) miniRaf = requestAnimationFrame(syncMini); };
  addEventListener('scroll', queueMini, { passive: true });
  addEventListener('resize', queueMini);
  syncMini();

  /* ---------- load ---------- */

  mine = window.SURVEY_DB.mine();
  (demo ? Promise.resolve(sampleRows()) : window.SURVEY_DB.list())
    .then((data) => {
      rows = data;
      status = 'ready';
    })
    .catch((err) => {
      console.error('[results] could not load responses', err);
      status = 'error';
    })
    .then(render);
})();
