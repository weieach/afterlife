(() => {
  'use strict';

  const { Engine, Bodies, Body, Composite, Constraint, Events, Query } = Matter;
  const MAX_PICKS = 5;
  const $ = (sel) => document.querySelector(sel);

  /* ---------- text (content/en.js, content/zh.js) ---------- */

  // The site is bilingual throughout: every piece of text shows in English and Chinese together.
  // Except the questions (#/about): one language at a time there, with a switch in their top bar.
  const CONTENT = window.SURVEY_CONTENT;

  const lookup = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

  // One language's text (Chinese falls back to English). {name} placeholders are filled from vars.
  function t(path, l = 'en', vars) {
    let s = lookup(CONTENT[l] || {}, path);
    if (s == null) s = lookup(CONTENT.en, path);
    if (s == null) return path;
    if (vars && typeof s === 'string') s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
    return s;
  }
  const pair = (path, vars) => [t(path, 'en', vars), t(path, 'zh', vars)];

  // Both as plain text, for what can't hold markup: attributes, <option>s, the tab title.
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

  /* The questions' language: the browser's at first, then whatever the switch was last set to. */
  const QLANG_KEY = 'afterlife-survey-lang';
  let qLang = (() => {
    try {
      const saved = localStorage.getItem(QLANG_KEY);
      if (saved === 'en' || saved === 'zh') return saved;
    } catch (_) { /* storage unavailable */ }
    const first = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return /^zh\b/i.test(first) ? 'zh' : 'en';
  })();
  // the questions themselves (not their header, which stays bilingual): one language
  const oneLang = (el) => !!el.closest?.('[data-screen="about"] .demo');

  // Both as two spans in el, Chinese first, then English (just one when they're the same).
  // CSS stacks them, English under Chinese. On the questions screen, just the chosen one.
  function fillPair(el, en, zh) {
    if (oneLang(el)) {
      const span = document.createElement('span');
      const useZh = qLang === 'zh' && !!zh;
      span.className = 'bi__one';
      span.lang = useZh ? 'zh-CN' : 'en';
      if (useZh) span.textContent = zh;
      else setText(span, en);
      el.classList.add('bi');
      el.replaceChildren(span);
      return;
    }
    const parts = [[zh !== en && zh, 'zh'], [en, 'en']].filter(([text]) => text).map(([text, l]) => {
      const span = document.createElement('span');
      span.className = `bi__${l}`;
      span.lang = l === 'zh' ? 'zh-CN' : 'en';
      if (l === 'zh') span.textContent = text;
      else setText(span, text);
      return span;
    });
    el.classList.add('bi');
    el.replaceChildren(...parts);
  }
  const fill = (el, path, vars) => fillPair(el, ...pair(path, vars));

  const itemNames = {};
  for (const l of Object.keys(CONTENT)) {
    itemNames[l] = new Map((CONTENT[l].items || []).map((it) => [it.id, it.name]));
  }
  const itemName = (id, l = 'en') => itemNames[l]?.get(id) ?? itemNames.en.get(id) ?? id;

  // Categories: en.js decides the list and each item's category. catName gives [English, Chinese].
  const CATS = CONTENT.en.categories || [];
  const catOf = new Map(CONTENT.en.items.map((it) => [it.id, it.category]));
  const catName = (id) => {
    const en = CATS.find((c) => c.id === id)?.name ?? id;
    return [en, (CONTENT.zh?.categories || []).find((c) => c.id === id)?.name ?? en];
  };

  // Web copy of an item's cutout (content/images.js): base / category folder / file.
  function cutoutUrl(id) {
    const images = window.SURVEY_IMAGES || {};
    const file = images.files?.[id];
    if (!file) return null;
    const folder = images.folders?.[catOf.get(id)];
    return new URL((images.base || '') + (folder ? `${folder}/` : '') + file, document.baseURI).href;
  }

  // Pills and detail cards show the Chinese name with the English name below it.
  // A named "Other" shows just what the person typed.
  function namesFor(p) {
    if (p.other) {
      if (p.customName) return [p.customName, ''];
      return [lookup(CONTENT.en, 'pick.other'), lookup(CONTENT.zh || {}, 'pick.other') || ''];
    }
    const zh = itemNames.zh?.get(p.id) || '';
    return [itemName(p.id, 'en'), zh];
  }

  function renderNames(el, p, cls) {
    const [en, zh] = namesFor(p);
    const parts = [[zh, 'zh'], [en, 'en']].filter(([text]) => text).map(([text, l]) => {
      const span = document.createElement('span');
      span.className = `${cls}__${l}`;
      setText(span, text); // a typed-in name may be Chinese
      if (l === 'zh') span.lang = 'zh-CN';
      return span;
    });
    el.replaceChildren(...parts);
  }

  /* ---------- burning cutouts: the edges catch, char and curl in, but it never burns up ---------- */
  /* (until Continue: then each pick burns right through to nothing before the page moves on) */

  const burn = (() => {
    const DURATION = 2800; // ms for the burn to creep in and die down
    const FIRE_DELAY = 1000; // ms after landing in the tin before it catches fire
    const CHAR_DELAY = 2000; // ms after the fire starts before the edges begin to blacken
    const DEPTH = 0.06; // how far it creeps in, as a share of the image's shorter side
    const LOST = 0.3; // outer share of the burnt depth that falls away; the rest stays as char
    const EMBER = 0.18; // width of the glowing line at the burning edge
    const SCORCH = 0.9; // brown tint beyond the char, as a share of DEPTH
    const SCRUB = 4500; // ms for a hovered sticker to burn right through (and as long to come back)
    const SCRUB_CHAR = 0.35; // share of that spent charring the edges before it burns on inward
    const fields = new Map(); // src@size -> prepared pixels, so each cutout is analysed once

    // Smooth value noise in 0..1 (two octaves) to make the burn line ragged like paper.
    function noise(w, h, cell) {
      const out = new Float32Array(w * h);
      for (const [size, weight] of [[cell, 0.65], [cell / 2.5, 0.35]]) {
        const gw = Math.ceil(w / size) + 2, gh = Math.ceil(h / size) + 2;
        const grid = Float32Array.from({ length: gw * gh }, Math.random);
        for (let y = 0; y < h; y++) {
          const gy = y / size, y0 = Math.floor(gy), fy = gy - y0, sy = fy * fy * (3 - 2 * fy);
          for (let x = 0; x < w; x++) {
            const gx = x / size, x0 = Math.floor(gx), fx = gx - x0, sx = fx * fx * (3 - 2 * fx);
            const a = grid[y0 * gw + x0], b = grid[y0 * gw + x0 + 1];
            const c = grid[(y0 + 1) * gw + x0], d = grid[(y0 + 1) * gw + x0 + 1];
            out[y * w + x] += weight * ((a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy);
          }
        }
      }
      return out;
    }

    // For every visible pixel: how soon it burns (distance in from the visible edge, roughened).
    function prepare(img, w, h) {
      const key = img.src && `${img.src}@${w}x${h}`; // snapshots of plain pills have no src: not cached
      if (key && fields.has(key)) return fields.get(key);
      const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
      ctx.canvas.width = w;
      ctx.canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);
      const src = ctx.getImageData(0, 0, w, h).data; // throws on file:// (tainted canvas)

      // two-pass chamfer distance to the nearest transparent pixel (outside the image counts too)
      const dist = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) dist[i] = src[i * 4 + 3] > 40 ? 1e9 : 0;
      const at = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : dist[y * w + x]);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          if (dist[i]) dist[i] = Math.min(dist[i], at(x - 1, y) + 1, at(x, y - 1) + 1, at(x - 1, y - 1) + 1.4, at(x + 1, y - 1) + 1.4);
        }
      }
      for (let y = h - 1; y >= 0; y--) {
        for (let x = w - 1; x >= 0; x--) {
          const i = y * w + x;
          if (dist[i]) dist[i] = Math.min(dist[i], at(x + 1, y) + 1, at(x, y + 1) + 1, at(x + 1, y + 1) + 1.4, at(x - 1, y + 1) + 1.4);
        }
      }

      const D = DEPTH * Math.min(w, h);
      const n = noise(w, h, D * 1.3);
      const v = new Float32Array(w * h);
      for (let i = 0; i < w * h; i++) v[i] = dist[i] + (n[i] - 0.5) * D * 1.1;
      // non-empty pixels ordered by burn value: repaints only touch the edge band, and flames
      // can be spawned right on the burning lip
      const visible = [];
      for (let i = 0; i < w * h; i++) if (src[i * 4 + 3]) visible.push(i);
      const order = Uint32Array.from(visible.sort((p, q) => v[p] - v[q]));
      const field = { w, h, src, v, D, order, deepest: order.length ? v[order[order.length - 1]] : 0 };
      if (key) fields.set(key, field);
      return field;
    }

    // First index in f.order whose burn value is >= val.
    function upto(f, val) {
      const { order, v } = f;
      let a = 0, b = order.length;
      while (a < b) { const m = (a + b) >> 1; if (v[order[m]] < val) a = m + 1; else b = m; }
      return a;
    }

    // Paint the burn at progress t (0..1) into out (ImageData). After one `full` pass, only the
    // band the fire has reached changes, so later passes walk just that part of f.order.
    // `gone` (0..1) burns on from there right through to the middle. Returns how far in the
    // edge has burnt away, so flames can rise from it.
    function paint(f, out, t, flicker, full, gone = 0) {
      const { src, v, D, order } = f, px = out.data;
      let front = D * (1 - (1 - t) ** 3); // fast at first, then dies down
      // the blackening fades in (t = 0 leaves the image untouched) instead of appearing at once
      const fin = Math.min(1, t / 0.4);
      let fade = fin * fin * (3 - 2 * fin);
      let lost = front * LOST - D * 0.6 * (1 - fade); // anything nearer the edge than this has burnt away
      let heat = (1 - t) ** 1.5 * flicker * fade; // ember glow fades as the fire goes out
      if (gone) {
        // the front races to the middle with the burnt-away edge close behind; it flares, then dies
        const band = D * (1 - LOST);
        front += (f.deepest + band - front) * (1 - (1 - gone) ** 2);
        lost += (f.deepest + 1 - lost) * gone ** 1.4;
        fade = Math.max(fade, Math.min(1, gone * 8));
        heat = flicker * Math.min(1, gone * 6) * (1 - gone ** 3);
      }
      const emberW = D * EMBER, charW = Math.max(front - lost, 1e-3), scorchW = D * SCORCH;
      const n = full ? v.length : upto(f, front + scorchW + 1);
      for (let k = 0; k < n; k++) {
        const i = full ? k : order[k], j = i * 4;
        const a = src[j + 3];
        let r = src[j], g = src[j + 1], b = src[j + 2], alpha = a;
        const s = v[i];
        if (!a || s < lost) {
          alpha = 0;
        } else if (s < front) {
          // char: black at the burnt lip, easing to dark brown toward the front
          const k = (s - lost) / charW; // 0 at the lip .. 1 at the front
          const c = (0.95 - 0.35 * k) * fade;
          r = r * (1 - c) + 22 * c;
          g = g * (1 - c) + 13 * c;
          b = b * (1 - c) + 8 * c;
          // glowing edge right where it's burning
          const e = heat * Math.max(0, 1 - (s - lost) / emberW);
          r += (255 - r) * e;
          g += (130 - g) * e;
          b += (30 - b) * e * 0.6;
          alpha = a * (0.85 + 0.15 * k);
        } else if (s < front + scorchW) {
          // scorch: brown heat stain fading back into the print
          const k = (1 - (s - front) / scorchW) * 0.6 * fade;
          r = r * (1 - k) + 92 * k;
          g = g * (1 - k) + 58 * k;
          b = b * (1 - k) + 26 * k;
        }
        px[j] = r;
        px[j + 1] = g;
        px[j + 2] = b;
        px[j + 3] = alpha;
      }
      return lost;
    }

    /* flames: soft additive particles rising from the whole outline, so the fire reads as one
       continuous ring hugging the object, spreading round it as it catches */

    const SPREAD = 2.2; // s for the fire to run all the way round an outline
    const GROW = 0.5; // s for the fire to build up at a spot once it gets there
    const SPACING = 14; // css px between spots on the outline that feed the fire

    let sprites = null;
    function blob(r, g, b) {
      const c = document.createElement('canvas');
      c.width = c.height = 64;
      const x = c.getContext('2d');
      const grd = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, `rgba(${r},${g},${b},1)`);
      grd.addColorStop(0.45, `rgba(${r},${g},${b},.45)`);
      grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
      x.fillStyle = grd;
      x.fillRect(0, 0, 64, 64);
      return c;
    }

    // Outer outline of every sizeable shape in the cutout, as closed point loops (canvas px).
    // Moore-neighbour tracing on a half-resolution mask.
    function outlines(f, step) {
      if (f.loops) return f.loops;
      const W = Math.ceil(f.w / step), H = Math.ceil(f.h / step);
      const m = new Uint8Array(W * H);
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) m[y * W + x] = f.src[((y * step) * f.w + x * step) * 4 + 3] > 40 ? 1 : 0;
      }
      const fg = (x, y) => x >= 0 && y >= 0 && x < W && y < H && m[y * W + x];
      const DX = [1, 1, 0, -1, -1, -1, 0, 1], DY = [0, 1, 1, 1, 0, -1, -1, -1]; // clockwise from east
      const dirOf = (dx, dy) => DX.findIndex((v, k) => v === dx && DY[k] === dy);
      const seen = new Uint8Array(W * H);
      const loops = [];
      for (let i = 0; i < W * H; i++) {
        if (!m[i] || seen[i]) continue;
        // mark the whole shape so it's traced once
        let size = 0;
        const stack = [i];
        seen[i] = 1;
        while (stack.length) {
          const j = stack.pop(), x = j % W, y = (j / W) | 0;
          size++;
          for (let d = 0; d < 8; d += 2) {
            const nx = x + DX[d], ny = y + DY[d], nj = ny * W + nx;
            if (fg(nx, ny) && !seen[nj]) { seen[nj] = 1; stack.push(nj); }
          }
        }
        if (size < 60) continue; // specks
        // walk the boundary clockwise from its top-left pixel (scan order guarantees west is empty)
        let px = i % W, py = (i / W) | 0, back = 4;
        const sx = px, sy = py, pts = [];
        for (let guard = 0; guard < 8 * (W + H) * 4; guard++) {
          pts.push({ x: (px + 0.5) * step, y: (py + 0.5) * step });
          let moved = false;
          for (let k = 1; k <= 8; k++) {
            const d = (back + k) % 8;
            if (!fg(px + DX[d], py + DY[d])) continue;
            const prev = (back + k - 1) % 8;
            const qx = px + DX[prev], qy = py + DY[prev];
            px += DX[d];
            py += DY[d];
            back = dirOf(qx - px, qy - py);
            moved = true;
            break;
          }
          if (!moved || (px === sx && py === sy && pts.length > 2)) break;
        }
        if (pts.length < 12) continue;
        // smooth out pixel stair-steps, then measure along the loop
        const n = pts.length, sm = pts.map((_, k) => {
          let x = 0, y = 0;
          for (let o = -3; o <= 3; o++) { const q = pts[(k + o + n) % n]; x += q.x; y += q.y; }
          return { x: x / 7, y: y / 7 };
        });
        const len = [0];
        for (let k = 1; k <= n; k++) len.push(len[k - 1] + Math.hypot(sm[k % n].x - sm[k - 1].x, sm[k % n].y - sm[k - 1].y));
        loops.push({ pts: sm, len, total: len[n], size });
      }
      loops.sort((a, b) => b.size - a.size);
      f.loops = loops;
      return loops;
    }

    // Point at distance d along a loop.
    function along(loop, d) {
      const { pts, len, total } = loop;
      d = ((d % total) + total) % total;
      let a = 0, b = len.length - 1;
      while (a < b - 1) { const mid = (a + b) >> 1; if (len[mid] <= d) a = mid; else b = mid; }
      const p = pts[a % pts.length], q = pts[(a + 1) % pts.length], k = (d - len[a]) / ((len[a + 1] - len[a]) || 1);
      return { x: p.x + (q.x - p.x) * k, y: p.y + (q.y - p.y) * k };
    }

    // [image canvas, flame canvas, burnOut]: img (css size w x h) catches fire — the fire spreads round its
    // outline as one continuous, flickering wall while the edges char — or is already burnt if
    // `done`. The fire stays lit for as long as it's in the tin. burnOut(ms) burns it away completely
    // and resolves once the last flames have died. Falls back to the plain image where pixels
    // can't be read (opening the file directly).
    // With `scrub` (the landing's stickers) nothing burns on a timer: a 4th item, hover(on),
    // sets it alight and burns it on while on, then runs the burn back until it's untouched.
    function create(img, w, h, done, scrub = false) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
      let field;
      try {
        field = prepare(img, cw, ch);
      } catch (_) {
        const plain = document.createElement('img');
        plain.src = img.src;
        return [plain];
      }

      const canvas = document.createElement('canvas');
      canvas.width = cw;
      canvas.height = ch;
      const ctx = canvas.getContext('2d');
      const out = ctx.createImageData(cw, ch);
      let painted = false;
      let lostAt = 0; // how far in the edge has burnt away, as of the last paint
      const draw = (t, gone) => {
        // running backwards un-chars pixels behind the front, so scrubbing repaints them all
        lostAt = paint(field, out, t, 0.8 + Math.random() * 0.2, !painted || scrub, gone);
        painted = true;
        ctx.putImageData(out, 0, 0);
      };

      sprites ||= { core: blob(255, 232, 160), mid: blob(255, 165, 70), tip: blob(255, 120, 70), smoke: blob(60, 55, 50) };

      // flame layer: overhangs the image, mostly above it, since flames rise
      const M = { side: 36, top: 110, bottom: 12 }; // headroom for flames a short way above the object
      const FW = w + 2 * M.side, FH = h + M.top + M.bottom; // css px
      const flames = document.createElement('canvas');
      flames.className = 'pill__flames';
      flames.width = Math.round(FW * dpr);
      flames.height = Math.round(FH * dpr);
      Object.assign(flames.style, { left: `${-M.side}px`, top: `${-M.top}px`, width: `${FW}px`, height: `${FH}px` });
      const fx = flames.getContext('2d');
      const ox = M.side * dpr, oy = M.top * dpr;

      // evenly spaced spots round each outline; each starts feeding fire when the spread reaches it
      const spread = done ? SPREAD * 0.3 : SPREAD;
      const spots = [];
      outlines(field, Math.max(1, Math.round(dpr))).forEach((loop, li) => {
        const stepPx = SPACING * dpr;
        const n = Math.max(8, Math.round(loop.total / stepPx));
        const origin = Math.random() * loop.total;
        const delay = li ? 0.2 + Math.random() * 0.6 : 0; // smaller shapes catch a moment later
        const phase = Math.random() * 6.3;
        for (let k = 0; k < n; k++) {
          const d = (k / n) * loop.total;
          const p = along(loop, d), q = along(loop, d + stepPx);
          const tl = Math.hypot(q.x - p.x, q.y - p.y) || 1;
          const up = (q.x - p.x) / tl; // outward normal's upward part (clockwise loop, y down)
          const fromOrigin = Math.min(Math.abs(d - origin), loop.total - Math.abs(d - origin));
          spots.push({
            x: p.x + ox, y: p.y + oy,
            u: d / (32 * dpr) + phase, // position along the edge; nearby spots rise and sway alike
            climb: Math.min(1, Math.max(0.35, 0.6 + 0.5 * up)), // tallest off top edges, low underneath
            at: delay + (fromOrigin / (loop.total / 2)) * spread,
          });
        }
      });
      const parts = [];

      // timeline: lands in the tin -> catches fire FIRE_DELAY later -> edges blacken CHAR_DELAY after that
      const made = performance.now();
      let lit = scrub ? Infinity : made + FIRE_DELAY;
      let ending = null; // { at, ms } once it's burning right through
      let held = false, scrubbed = 0, fire = 0, idle = false; // scrub: hovered?, how far burnt (0..1), flame strength
      const start = done ? made - DURATION : lit + CHAR_DELAY;
      let t = done ? 1 : 0;
      draw(t);
      let last = made;
      let frame = 0;

      function tick(now) {
        if (!canvas.isConnected && now - made > 100) return; // replaced or removed
        requestAnimationFrame(tick);
        if (canvas.closest('[hidden]')) return; // screen hidden: idle (no layout read)
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        if (scrub && !held && !scrubbed && !fire && !parts.length) { // whole and cold: idle
          if (!idle) fx.clearRect(0, 0, flames.width, flames.height);
          idle = true;
          return;
        }
        idle = false;
        let gone = ending ? Math.min(1, Math.max(1e-3, (now - ending.at) / ending.ms)) : 0;
        if (scrub) {
          // forward while hovered, backward after; the fire burns whenever it's partly burnt
          const was = scrubbed;
          scrubbed = Math.min(1, Math.max(0, scrubbed + ((held ? 1 : -1) * dt * 1000) / SCRUB));
          const alight = scrubbed > 0.02 && scrubbed < 1;
          fire = Math.min(1, Math.max(0, fire + (alight ? dt : -dt) / 0.4));
          t = Math.min(1, scrubbed / SCRUB_CHAR);
          gone = Math.max(0, (scrubbed - SCRUB_CHAR) / (1 - SCRUB_CHAR));
          if (scrubbed !== was && (++frame % 2 === 0 || scrubbed === 0 || scrubbed === 1)) draw(t, gone);
        } else if (ending) {
          if (ending.left) draw(t, gone);
          if (gone === 1) ending.left = false; // burnt through: nothing left to repaint
        } else if (t < 1) {
          t = Math.min(1, Math.max(0, (now - start) / DURATION));
          if (t > 0 && (++frame % 2 === 0 || t === 1)) draw(t); // char creeps slowly; 30fps is plenty
        }

        // every lit spot keeps feeding the fire, so the ring stays continuous; burning through,
        // the outline is soon gone and the fire moves in with the burning edge instead
        const time = (now - lit) / 1000;
        const heat = 1 - t;
        const rim = (gone ? Math.max(0, 1 - gone * 2.5) : 1) * (scrub ? fire : 1);
        for (const s of spots) {
          const g = Math.min(1, Math.max(0, (time - s.at) / GROW)) * rim;
          if (!g || Math.random() > (18 + heat * 8) * g * dt) continue; // steady, dense feed keeps each sheet unbroken
          // how far the fire reaches here: swells and dips slowly, and smoothly from spot to spot
          const swell = (0.5 + 0.5 * Math.sin(time * 1.1 + s.u * 1.3)) * (0.6 + 0.4 * Math.sin(time * 0.7 - s.u * 0.8 + 2));
          const reach = s.climb * (0.35 + 0.65 * swell) * (0.85 + heat * 0.3) * g;
          parts.push({
            x0: s.x + (Math.random() - 0.5) * SPACING * dpr, x: s.x, y: s.y,
            vy: -(35 + Math.random() * 15) * dpr,
            age: 0, life: (0.3 + 0.5 * reach) * (0.9 + Math.random() * 0.2),
            size: (11 + Math.random() * 5) * dpr * (0.6 + 0.5 * reach), u: s.u,
            smoke: Math.random() < 0.04,
          });
        }
        if (gone > 0 && gone < 1) {
          // flames along the burning edge as it eats inward, thinning to smoke as it dies
          const from = upto(field, lostAt), to = upto(field, lostAt + field.D * 0.5);
          const n = (to - from) && spots.length * 12 * Math.min(1, gone * 6) * (1 - gone ** 2) * dt * (scrub ? fire : 1);
          for (let k = Math.floor(n + Math.random()); k > 0; k--) {
            const i = field.order[from + Math.floor(Math.random() * (to - from))];
            const x = (i % field.w) + ox, y = Math.floor(i / field.w) + oy;
            parts.push({
              x0: x, x, y,
              vy: -(35 + Math.random() * 15) * dpr,
              age: 0, life: (0.45 + Math.random() * 0.35) * (1 - gone * 0.4),
              size: (10 + Math.random() * 6) * dpr, u: x / (32 * dpr),
              smoke: Math.random() < 0.05 + gone * 0.3,
            });
          }
        }

        fx.clearRect(0, 0, flames.width, flames.height);
        for (let k = parts.length - 1; k >= 0; k--) {
          const q = parts[k];
          q.age += dt;
          if (q.age >= q.life) { parts.splice(k, 1); continue; }
          q.vy -= 50 * dpr * dt; // flames lift a little as they rise, but stay low
          q.y += q.vy * dt;
          // the whole sheet waves together, more the higher it climbs, so it bends rather than breaks
          const climbed = q.age / q.life;
          q.x = q.x0 + Math.sin(time * 2.1 + q.u - q.age * 1.6) * 8 * dpr * climbed + Math.sin(time * 5.3 + q.u * 2) * 3 * dpr;
        }
        // now and then a small tongue breaks off a flame's tip and floats up on its own; never more than 3 at once
        if (Math.random() < 3 * dt && parts.filter((q) => q.wisp).length < 3) {
          const tips = parts.filter((q) => !q.smoke && !q.wisp && q.age / q.life > 0.6);
          const q = tips[Math.floor(Math.random() * tips.length)];
          if (q) {
            const k = q.age / q.life, s = q.size * (1 - k * 0.6);
            parts.push({
              x0: q.x, x: q.x, y: q.y - s * 2.6, // just clear of the tip it came from
              vy: -(55 + Math.random() * 25) * dpr,
              age: 0, life: 0.35 + Math.random() * 0.25,
              size: q.size * 0.3, u: q.u, wisp: true,
            });
          }
        }
        // smoke first (normal blend), then fire on top (additive)
        fx.globalCompositeOperation = 'source-over';
        for (const q of parts) {
          if (!q.smoke) continue;
          const k = q.age / q.life, s = q.size * (1 + k * 1.5);
          fx.globalAlpha = 0.18 * (1 - k);
          fx.drawImage(sprites.smoke, q.x - s, q.y - s * 1.5, s * 2, s * 2);
        }
        fx.globalCompositeOperation = 'lighter';
        for (const q of parts) {
          if (q.smoke) continue;
          const k = q.age / q.life, s = q.size * (1 - k * 0.6); // tapers toward the tip
          const spr = q.wisp ? sprites.mid : k < 0.18 ? sprites.core : k < 0.55 ? sprites.mid : sprites.tip;
          // the sheet thins out gradually so its tip melts away; broken-off bits stay bright enough to see
          fx.globalAlpha = q.wisp ? 0.7 * (1 - k) : 0.45 * (1 - k) ** 1.3;
          fx.drawImage(spr, q.x - s * 0.8, q.y - s * 2.2, s * 1.6, s * 4); // tall, narrow streaks
        }
        fx.globalAlpha = 1;
        fx.globalCompositeOperation = 'source-over';
      }
      requestAnimationFrame(tick);

      const burnOut = (ms) => new Promise((resolve) => {
        const now = performance.now();
        lit = Math.min(lit, now); // not alight yet: catches at once
        ending = { at: now, ms, left: true };
        setTimeout(resolve, ms + 700); // the last flames take a moment to die down
      });
      const hover = (on) => {
        if (on && !scrubbed && !fire) lit = performance.now(); // catches afresh, spreading round again
        held = on;
      };
      return [canvas, flames, burnOut, hover];
    }

    return { create };
  })();

  /* ---------- screens ---------- */

  const screens = [...document.querySelectorAll('.screen')];

  let screenNow = 'intro';
  let submitted = false; // answers sent: the form can't be reached again until Return to home
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  // Debugging mode (the red switch in the header row, remembered in this browser): Continue with
  // fewer than five picks (one at least: a response needs one), and the required questions may
  // be left blank. Otherwise both are enforced.
  // Off for now: the switch is hidden and debugging stays off, even in a browser that
  // remembered it on. To bring it back, set this to true and remove `hidden` from the switch in index.html.
  const DEBUG_AVAILABLE = false;
  const DEBUG_KEY = 'afterlife-survey-debug';
  const debugSwitch = $('#debug-mode');
  let debug = false;
  if (DEBUG_AVAILABLE) {
    try { debug = localStorage.getItem(DEBUG_KEY) === '1'; } catch (_) { /* storage unavailable */ }
  }
  debugSwitch.checked = debug;
  const picksNeeded = () => (debug ? 1 : MAX_PICKS);
  const picksReady = () => picker.picks().length >= picksNeeded();
  debugSwitch.addEventListener('change', () => {
    debug = debugSwitch.checked;
    try { localStorage.setItem(DEBUG_KEY, debug ? '1' : '0'); } catch (_) { /* storage unavailable */ }
    picker.refresh(); // Continue's state
    details.syncNext();
    syncForm();
  });

  // Every step has its own address after the # (so it works on any static host, and reload,
  // back and forward all land on the right step): no hash = intro, #/pick,
  // #/details (a card for each pick), #/about/1 (the four required questions and the afterlife one),
  // #/about/2 (sharing choices and last thoughts, with Submit), #/thanks.
  // #/details has no section of its own: it's the pick screen with the tin aside and the cards up.
  // #/start (the results page's "Take the survey") is a fresh start: it lands on #/pick and plays
  // the same entrance as the intro's Start.
  const SCREENS = [...screens.map((s) => s.dataset.screen), 'details'];
  const sectionOf = (name) => (name === 'details' ? 'pick' : name);
  function urlFor(name, step) {
    if (name === 'intro') return location.pathname + location.search;
    return name === 'about' ? `#/about/${step || 1}` : `#/${name}`;
  }
  const here = () => (location.hash ? location.hash : location.pathname + location.search);

  // Go to a step: a new history entry, then show it.
  function go(name, step) {
    const url = urlFor(name, step);
    if (here() !== url) history.pushState(null, '', url);
    route();
  }

  // Show what the address says, after moving it back to the furthest step you can be on:
  // nothing picked yet -> pick; a question left blank -> that question; already sent -> thanks.
  function route({ initial = false } = {}) {
    const [, want, n] = location.hash.match(/^#\/?([^/]*)\/?(\d*)/) || [];
    const fresh = want === 'start';
    let name = fresh ? 'pick' : SCREENS.includes(want) ? want : 'intro';
    let step = parseInt(n, 10) || 1;
    if (name === 'about' && submitted) name = 'thanks';
    if (name === 'thanks' && !submitted) name = 'about';
    if ((name === 'details' || name === 'about') && !picksReady()) name = 'pick';
    if (name === 'about') step = clampStep(step);
    const url = urlFor(name, step);
    if (here() !== url) history.replaceState(null, '', url);
    show(name, step, initial, fresh);
  }
  window.addEventListener('popstate', () => route());

  function show(name, step, initial, fresh = false) {
    if (name === 'about') showStep(step);
    if (name === screenNow && !initial) return;
    const from = screenNow;
    screenNow = name;
    if (from === 'pick' && name === 'intro') picker.reset(); // Back from the pick screen starts the picks over
    const entering = name === 'pick' && from === 'intro' && (!initial || fresh) && !calm.matches;
    const title = $('[data-screen="pick"] .headline');
    if (entering) {
      $('[data-screen="pick"]').classList.add('is-entering'); // before it shows: no flash
      if (initial) title.style.opacity = '0'; // hidden until the web fonts are in (below)
    }
    const tin = entering && !initial ? liftTin() : null; // before the intro hides
    screens.forEach((s) => { s.hidden = s.dataset.screen !== sectionOf(name); });
    window.scrollTo(0, 0);
    if (name === 'intro') intro.start();
    else intro.stop();
    if (sectionOf(name) === 'pick') picker.start();
    else picker.stop();
    picker.review(name === 'details');
    if (name === 'details') details.show(from === 'about');
    else details.hide();
    // Straight from another page, the title is measured once its web font has loaded, so it
    // floats from (and lands on) the right spot.
    if (entering && initial) (document.fonts?.ready || Promise.resolve()).then(() => pickEntrance(null));
    else if (entering) pickEntrance(tin);
  }

  // The landing's tin, copied out of the intro onto the page exactly as it looks right now
  // (Start's hover may have it enlarged), so it stays put while the screens swap.
  function liftTin() {
    const src = $('.intro__tin');
    if (!src || typeof gsap !== 'object') return null;
    const r = src.getBoundingClientRect();
    if (!r.width || r.bottom < 0 || r.top > innerHeight) return null; // not on screen
    const tin = src.cloneNode(true);
    tin.removeAttribute('style');
    tin.classList.add('tin-ghost');
    Object.assign(tin.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px` });
    document.body.append(tin);
    return tin;
  }

  // Start -> the question alone, floating in the middle of the screen; it then rises to its
  // place and the rest of the pick screen comes in around it (pills fly in from the edges).
  // The landing's tin (if lifted) wiggles as the question appears, then sinks away just as
  // the top-down tin rises into place.
  function pickEntrance(tin) {
    if (tin) {
      gsap.to(tin, {
        keyframes: {
          rotation: [0, -5, 4, -3, 2, -1, 0],
          x: [0, -6, 5, -4, 3, -1, 0],
          y: [0, -5, 0, -3, 0, -1, 0],
          easeEach: 'sine.inOut',
        },
        transformOrigin: '50% 100%',
        duration: 0.9,
        delay: 0.3,
      });
    }
    const screen = $('[data-screen="pick"]');
    const title = screen.querySelector('.headline');
    // centre the title's text (not its full-width box) across the screen, in its upper part
    title.style.transition = 'none';
    title.style.transform = '';
    const range = document.createRange();
    range.selectNodeContents(title);
    const rs = [...range.getClientRects()];
    const left = Math.min(...rs.map((r) => r.left)), right = Math.max(...rs.map((r) => r.right));
    const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
    const dx = innerWidth / 2 - (left + right) / 2;
    let dy = innerHeight * 0.36 - (top + bottom) / 2; // its middle at 36% down the screen
    // The landing can is still on screen: sit the question a little above it, not on it.
    if (tin) {
      const tr = tin.getBoundingClientRect();
      if (tr.height) dy = Math.min(dy, tr.top - 18 - bottom);
    }
    const navBottom = screen.querySelector('.topbar').getBoundingClientRect().bottom;
    dy = Math.max(navBottom + 8 - top, dy);
    title.style.transform = `translate(${dx}px, ${dy}px)`;
    title.style.opacity = '0';
    title.getBoundingClientRect(); // commit the start state before animating
    title.style.transition = 'opacity .7s ease';
    title.style.opacity = '1';

    setTimeout(() => {
      title.style.transition = 'transform 1s cubic-bezier(.65, 0, .25, 1)';
      title.style.transform = '';
      // on the same clock as the title, so the old tin is gone just as the new one rises
      if (tin) {
        gsap.to(tin, {
          rotation: 0, x: 0, y: 160, autoAlpha: 0,
          duration: 0.7, ease: 'power2.in', overwrite: true,
          onComplete: () => tin.remove(),
        });
      }
      setTimeout(() => {
        screen.classList.remove('is-entering'); // nav, tin and controls fade in (CSS)
        picker.flyIn();
      }, 600);
      setTimeout(() => {
        title.style.transition = '';
        title.style.opacity = '';
      }, 1100);
    }, 1400);
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-go]');
    if (btn && !btn.disabled) go(btn.dataset.go);
  });

  /* ---------- 1. intro (snapped full-screen paragraphs) ---------- */

  const intro = (() => {
    const root = $('#intro');
    const startBtn = $('.intro__start');
    const hasGsap = typeof gsap === 'object' && typeof ScrollTrigger === 'function';
    if (hasGsap) gsap.registerPlugin(ScrollTrigger);
    let ctx = null;
    let stickersPlayed = false; // the last panel's stickers bounce in once per visit

    // "下滑以继续 Scroll to continue" in the header row: fades in after 5s on the first panel,
    // fades out as you scroll on, and doesn't come back once you've scrolled past (this visit).
    const scrollTip = $('#scroll-tip');
    setText(scrollTip, `${t('intro.scrollTip', 'zh')} ${t('intro.scrollTip', 'en')}`);
    const TIP_DELAY = 5000;
    let tipTimer = null;
    let tipRetired = false;
    function syncTip() {
      const onFirst = window.scrollY < window.innerHeight / 2;
      if (onFirst && !tipRetired) {
        if (!tipTimer && !scrollTip.classList.contains('is-shown')) {
          tipTimer = setTimeout(() => { tipTimer = null; scrollTip.classList.add('is-shown'); }, TIP_DELAY);
        }
        return;
      }
      clearTimeout(tipTimer);
      tipTimer = null;
      scrollTip.classList.remove('is-shown');
      if (!onFirst) tipRetired = true;
    }
    function stopTip() {
      window.removeEventListener('scroll', syncTip);
      clearTimeout(tipTimer);
      tipTimer = null;
      scrollTip.classList.remove('is-shown');
    }

    // Start sits on the side-view tin, below the last prompt. The file is a square with empty
    // space around the can; CSS crops it to the metal.
    const launch = document.createElement('div');
    launch.className = 'intro__launch';
    const tin = document.createElement('span');
    tin.className = 'intro__tin';
    tin.setAttribute('aria-hidden', 'true');
    const tinImg = document.createElement('img');
    tinImg.alt = '';
    tinImg.draggable = false;
    tinImg.src = new URL('../assets/tin can side view.png', document.baseURI).href;
    tin.append(tinImg);
    // under the tin: a quiet way to the public results without taking the survey
    const resultsLink = document.createElement('a');
    resultsLink.className = 'link intro__results';
    resultsLink.href = 'results.html';
    resultsLink.dataset.t = 'thanks.results';
    fill(resultsLink, 'thanks.results');
    launch.append(tin, resultsLink);

    function expandTin() {
      const open = startBtn.matches(':hover') || startBtn.matches(':focus-visible');
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce || !hasGsap) {
        tin.style.transformOrigin = 'center';
        tin.style.transform = open ? 'scale(1.05)' : '';
        return;
      }
      gsap.to(tin, {
        scale: open ? 1.05 : 1,
        duration: open ? 0.55 : 0.4,
        ease: open ? 'back.out(1.7)' : 'power2.inOut',
        transformOrigin: '50% 50%',
        overwrite: 'auto',
      });
    }
    startBtn.addEventListener('pointerenter', expandTin);
    startBtn.addEventListener('pointerleave', expandTin);
    startBtn.addEventListener('focus', expandTin);
    startBtn.addEventListener('blur', expandTin);

    // Ten random cutouts in a row near the bottom of the first panel, scrolling sideways forever.
    // Picked once per visit (a language switch keeps the same ones). The set is laid out
    // three times so the track can slide by exactly one set's width and loop without a seam,
    // even on screens wider than one set.
    const reel = (() => {
      const box = document.createElement('div');
      box.className = 'intro__reel';
      box.setAttribute('aria-hidden', 'true');
      const files = Object.keys((window.SURVEY_IMAGES || {}).files || {}).map(cutoutUrl).filter(Boolean);
      for (let i = files.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [files[i], files[j]] = [files[j], files[i]];
      }
      const track = document.createElement('div');
      track.className = 'intro__reel-track';
      for (let copy = 0; copy < 3; copy++) {
        files.slice(0, 10).forEach((file) => {
          const img = document.createElement('img');
          img.alt = '';
          img.draggable = false;
          img.src = file;
          track.append(img);
        });
      }
      box.append(track);
      return box;
    })();

    // A handful of cutouts scattered around the last panel, like stickers.
    function stickers() {
      const files = Object.keys((window.SURVEY_IMAGES || {}).files || {}).map(cutoutUrl).filter(Boolean);
      const layer = document.createElement('div');
      layer.className = 'intro__stickers';
      layer.setAttribute('aria-hidden', 'true');
      if (!files.length) return layer;
      const count = Math.min(files.length, 5); // five, like the five things you'd take
      const pool = files.slice();
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const slots = [[13, 22], [86, 20], [9, 50], [91, 48], [15, 82], [84, 80]];
      for (let i = slots.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [slots[i], slots[j]] = [slots[j], slots[i]];
      }
      pool.slice(0, count).forEach((file, i) => {
        const spot = document.createElement('span');
        spot.className = 'intro__sticker';
        const [x, y] = slots[i];
        spot.style.setProperty('--x', `${x + (Math.random() * 4 - 2)}%`);
        spot.style.setProperty('--y', `${y + (Math.random() * 4 - 2)}%`);
        spot.style.setProperty('--rot', `${Math.round(Math.random() * 30 - 15)}deg`);
        spot.style.setProperty('--size', `${Math.round(150 + Math.random() * 30)}px`); // 150–180px
        const float = document.createElement('span');
        float.className = 'intro__sticker-float';
        const pop = document.createElement('span');
        pop.className = 'intro__sticker-pop';
        const img = document.createElement('img');
        img.alt = '';
        img.draggable = false;
        img.src = file;
        pop.append(img);
        float.append(pop);
        spot.append(float);
        bindStickerHover(spot, pop);
        bindStickerBurn(spot, pop, img);
        layer.append(spot);
      });
      return layer;
    }

    // Hover grows and tips the cutout. The bob is a separate transform,
    // so the two don't fight, and the hit target stays put so the hover doesn't flicker.
    function bindStickerHover(spot, pop) {
      const play = (open) => {
        const base = parseFloat(spot.style.getPropertyValue('--rot')) || 0;
        const tilt = base >= 0 ? 12 : -12;
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (reduce || !hasGsap) {
          pop.style.transform = open ? `scale(1.2) rotate(${tilt}deg)` : '';
          return;
        }
        gsap.to(pop, {
          scale: open ? 1.2 : 1,
          rotation: open ? tilt : 0,
          duration: open ? 0.5 : 0.4,
          ease: open ? 'back.out(1.7)' : 'power2.inOut',
          transformOrigin: '50% 50%',
          overwrite: 'auto',
        });
      };
      spot.addEventListener('pointerenter', () => play(true));
      spot.addEventListener('pointerleave', () => play(false));
    }

    // Hovering a sticker sets it alight and it burns on, right through if you stay;
    // leaving runs the burn back until it's whole again. The burn is drawn on a canvas laid
    // exactly over the cutout (made on first hover, or again if the cutout has been resized).
    function bindStickerBurn(spot, pop, img) {
      let layer = null, hover = null, size = '';
      const ignite = (on) => {
        if (on && img.naturalWidth && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          const w = img.offsetWidth, h = img.offsetHeight;
          if (!hover || size !== `${w}x${h}`) {
            const [canvas, flames, , control] = burn.create(img, w, h, false, true);
            if (!control) return; // pixels can't be read (file://): it just stays as it is
            layer?.remove();
            layer = document.createElement('span');
            layer.className = 'intro__burn';
            Object.assign(layer.style, { left: `${img.offsetLeft}px`, top: `${img.offsetTop}px`, width: `${w}px`, height: `${h}px` });
            canvas.className = 'intro__burn-img';
            layer.append(canvas, flames);
            pop.append(layer);
            img.style.visibility = 'hidden';
            hover = control;
            size = `${w}x${h}`;
          }
        }
        hover?.(on);
      };
      spot.addEventListener('pointerenter', () => ignite(true));
      spot.addEventListener('pointerleave', () => ignite(false));
    }

    // A slow bob and a little sway, each sticker on its own loop.
    function levitateStickers() {
      const small = window.matchMedia('(max-width: 900px)').matches;
      root.querySelectorAll('.intro__sticker').forEach((spot) => {
        const float = spot.querySelector('.intro__sticker-float');
        if (!float) return;
        const base = parseFloat(spot.style.getPropertyValue('--rot')) || 0;
        const driftY = gsap.utils.random(small ? 6 : 9, small ? 11 : 16);
        const driftX = gsap.utils.random(small ? 2 : 3, small ? 5 : 7);
        const wobble = gsap.utils.random(3, 6);
        const xSign = Math.random() < 0.5 ? -1 : 1;
        const rSign = Math.random() < 0.5 ? -1 : 1;
        const step = gsap.utils.random(1.7, 2.4);
        gsap.set(float, { rotation: base, transformOrigin: '50% 50%' });
        gsap.timeline({ repeat: -1, delay: gsap.utils.random(0, 1.8) })
          .to(float, {
            y: -driftY,
            x: driftX * xSign,
            rotation: base + wobble * rSign,
            duration: step,
            ease: 'sine.inOut',
          })
          .to(float, {
            y: -driftY * 0.4,
            x: -driftX * 0.65 * xSign,
            rotation: base - wobble * 0.45 * rSign,
            duration: step,
            ease: 'sine.inOut',
          })
          .to(float, {
            y: 0,
            x: 0,
            rotation: base,
            duration: step * 0.95,
            ease: 'sine.inOut',
          });
      });
    }

    // The altar illustration opens the landing, above the first paragraph.
    const altar = document.createElement('img');
    altar.className = 'intro__altar';
    altar.alt = '';
    altar.draggable = false;
    altar.src = new URL('../assets/altar-v3 (web).webp', document.baseURI).href;

    // Over the third paragraph: the dotted ∞ (infinity.js)
    const infinity = window.makeInfinity('intro__infinity');

    // One panel per paragraph (English with the Chinese under it); Start rides with the last.
    function render() {
      const [en, zh] = pair('intro.paragraphs');
      const panels = en.map((text, i) => {
        const panel = document.createElement('div');
        panel.className = 'intro__panel';
        const inner = document.createElement('div');
        inner.className = 'intro__inner';
        const para = document.createElement('p');
        fillPair(para, text, zh?.[i]);
        inner.append(para);
        panel.append(inner);
        return panel;
      });
      panels[0].firstChild.prepend(altar);
      panels[2]?.firstChild.prepend(infinity);
      panels[0].append(reel); // pinned near the bottom of the panel, clear of the centred text
      const last = panels[panels.length - 1];
      launch.prepend(startBtn);
      last.firstChild.append(launch);
      last.append(stickers());
      root.replaceChildren(...panels);
      start(); // no-op while the intro is hidden
    }

    // Snapping is native CSS scroll-snap (smooth with trackpad momentum);
    // GSAP fades each panel's text in as it arrives.
    function start() {
      stop();
      if (root.closest('.screen').hidden) return;
      document.documentElement.classList.add('is-snapping');
      window.addEventListener('scroll', syncTip, { passive: true });
      syncTip();
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!hasGsap || reduce) return;
      ctx = gsap.context(() => {
        gsap.utils.toArray('.intro__panel', root).forEach((panel) => {
          const text = panel.querySelector('.intro__inner');
          if (!text) return;
          // The tin scales on Start hover; leave it out of this transform tween.
          const lines = [...text.children].filter((el) => !el.classList.contains('intro__tin'));
          gsap.from(lines, {
            autoAlpha: 0,
            y: 40,
            duration: 0.8,
            stagger: 0.12,
            ease: 'power3.out',
            scrollTrigger: { trigger: panel, start: 'top 65%', end: 'bottom 35%', toggleActions: 'play reverse play reverse' },
          });
        });
        levitateStickers();
        const stickerImgs = root.querySelectorAll('.intro__sticker img');
        const last = root.querySelector('.intro__stickers')?.parentElement;
        if (!stickerImgs.length || !last || stickersPlayed) return;
        gsap.from(stickerImgs, {
          scale: 0,
          duration: 0.85,
          stagger: { each: 0.08, from: 'random' },
          ease: 'back.out(2.2)',
          scrollTrigger: { trigger: last, start: 'top 72%', once: true },
          onStart() { stickersPlayed = true; },
        });
      });
    }

    function stop() {
      stopTip();
      document.documentElement.classList.remove('is-snapping');
      if (ctx) ctx.revert();
      ctx = null;
    }

    return { render, start, stop };
  })();

  /* ---------- 2. pick five (physics) ---------- */

  const picker = (() => {
    const stage = $('#stage');
    const ring = $('#inventory');
    const hint = $('#inventory-hint');
    const toast = $('#toast');
    const continueBtn = $('#pick-continue');
    const backBtn = $('#pick-back');
    const BURN_OUT = 2200; // ms for a pick to burn right through once its card is filled in

    // Outer pills bump into each other, the walls and the solid inventory disk.
    // Inner pills bump into each other and the inside of the ring.
    // A dragged pill pushes everything; a pill in transit passes through everything.
    const CAT = { OUT: 0x1, IN: 0x2, DISK: 0x4, RING: 0x8, WALL: 0x10, MOVE: 0x20 };
    const FILTER = {
      out: { category: CAT.OUT, mask: CAT.OUT | CAT.DISK | CAT.WALL | CAT.MOVE },
      in: { category: CAT.IN, mask: CAT.IN | CAT.RING | CAT.MOVE },
      drag: { category: CAT.MOVE, mask: CAT.OUT | CAT.IN | CAT.WALL },
      transit: { category: CAT.MOVE, mask: 0 },
      drop: { category: CAT.OUT, mask: CAT.OUT | CAT.DISK | CAT.MOVE }, // falling in from above: no walls until it's on screen
      exit: { category: CAT.MOVE, mask: 0 }, // a category's items leaving: they fall through everything, floor too
    };
    const PULL = { out: 0.0001, in: 0.00008 }; // gentle attraction toward the center
    const GAP = 6; // visual breathing room between pills and the dashed line
    const GRAVITY = 0.002, DROP_AIR = 0.02, AIR = 0.06; // dropped items fall; everything else drifts

    const engine = Engine.create();
    engine.gravity.x = 0;
    engine.gravity.y = 0;
    engine.positionIterations = 20; // firmer stacking so pressed pills don't sink into each other
    engine.velocityIterations = 10;
    const world = engine.world;

    let pills = [];
    let picks = [];
    let statics = [];
    let W = 0, H = 0, cx = 0, cy = 0, R = 0;
    let built = false, running = false, raf = 0, toastTimer = 0;
    let stale = false; // labels changed while hidden; re-measure on next start
    let burning = false; // the cards are up (or the tin is on its way out): hands off
    let reviewing = false; // the cards screen
    const pickScreen = $('[data-screen="pick"]');

    const rand = (a, b) => a + Math.random() * (b - a);
    const distTo = (pos, x, y) => Math.hypot(pos.x - x, pos.y - y);
    const TIN_INNER = 0.86; // picked items stay inside the tin's lip, not its outer rim
    const innerR = () => R * TIN_INNER;
    const insideRing = (pos) => distTo(pos, cx, cy) < R;
    const fullyInside = (p) => distTo(p.body.position, cx, cy) + Math.max(p.w, p.h) / 2 < innerR() - GAP;
    const RING_CLEAR = 20; // margin between loose pills and the category ring (the pile presses ~10px of it away)
    // Loose pills stay this far from the tin's centre: just past its rim, or past the category ring when it's up.
    const keepOut = () => (catMode ? ringBand().outer + RING_CLEAR : R + GAP);

    function setMode(p, mode) {
      p.mode = mode;
      Object.assign(p.body.collisionFilter, FILTER[mode]);
    }

    function makeBody(p, x, y) {
      const opts = {
        frictionAir: p.falling ? DROP_AIR : AIR,
        friction: 0.02,
        restitution: 0.3,
        density: 0.0015,
        collisionFilter: { group: 0, ...FILTER[p.mode] },
      };
      const radius = p.asImage || p.thumb ? Math.min(p.w, p.h) * 0.15 : Math.min(p.w, p.h) / 2 - 1;
      return Bodies.rectangle(x, y, p.w, p.h, { ...opts, chamfer: { radius } });
    }

    // "Other" is an ordinary pill filled with the same drifting noise as the search list's
    // "Add …" thumbnail (shown only while it's the spare one: CSS hides it in the tin).
    function paintOther(p) {
      if (!p.other || p.el.querySelector('.pill__noise')) return;
      const c = noiseThumb();
      c.className = 'pill__noise';
      c.setAttribute('aria-hidden', 'true');
      p.el.prepend(c);
    }

    // Once in the inventory, an item with a cutout drops the pill and becomes just the image.
    function setAsImage(p, img) {
      p.asImage = !!img;
      p.img = img || null;
      p.el.classList.toggle('as-image', p.asImage);
      p.el.querySelectorAll('.pill__img, .pill__flames').forEach((el) => el.remove());
      if (img) {
        const w = p.imgW || Math.round(R * 0.66); // a custom item keeps its capsule's width
        const h = Math.round((w * img.naturalHeight) / img.naturalWidth);
        // it catches fire the first time it goes in; after that it's already charred (still flickering)
        const [el, flames, burnOut] = burn.create(img, w, h, p.burned);
        p.burned = true;
        p.burnOut = burnOut || null;
        el.className = 'pill__img';
        el.draggable = false;
        el.style.width = `${w}px`;
        el.style.height = `${h}px`;
        p.el.prepend(el);
        if (flames) p.el.append(flames);
      }
      if (running) fitBody(p);
      else stale = true;
    }

    // Greedy word wrap (CJK breaks anywhere), close enough to how the pill laid its text out.
    function wrapLines(ctx, text, maxW) {
      const tokens = text.match(/[\u2e80-\u9fff\uff00-\uffef]|[^\s\u2e80-\u9fff\uff00-\uffef]+|\s+/g) || [];
      const lines = [];
      let line = '';
      for (const tok of tokens) {
        if (line.trim() && tok.trim() && ctx.measureText((line + tok).trim()).width > maxW + 0.5) {
          lines.push(line.trim());
          line = tok;
        } else {
          line += tok;
        }
      }
      if (line.trim()) lines.push(line.trim());
      return lines;
    }

    // A plain pill drawn onto a canvas, so it can burn away like a cutout.
    function snapshot(el) {
      const w = el.offsetWidth, h = el.offsetHeight;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement('canvas');
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
      const x = c.getContext('2d');
      x.scale(dpr, dpr);
      const cs = getComputedStyle(el), bw = parseFloat(cs.borderTopWidth) || 0;
      x.beginPath();
      x.roundRect(bw / 2, bw / 2, w - bw, h - bw, h / 2);
      x.fillStyle = cs.backgroundColor;
      x.fill();
      if (bw) {
        x.lineWidth = bw;
        x.strokeStyle = cs.borderTopColor;
        x.stroke();
      }
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      for (const span of el.querySelectorAll('.pill__en, .pill__zh')) {
        const s = getComputedStyle(span), lh = parseFloat(s.lineHeight);
        x.font = `${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
        x.fillStyle = s.color;
        x.globalAlpha = Number(s.opacity);
        // offsets are measured from inside the pill's border
        const mid = bw + span.offsetLeft + span.offsetWidth / 2;
        wrapLines(x, span.textContent, span.offsetWidth).forEach((line, i) => {
          x.fillText(line, mid, bw + span.offsetTop + lh * (i + 0.5));
        });
      }
      return c;
    }

    // A pick burns right away in the tin, once its card is filled in (cards screen).
    function burnOne(p) {
      if (p.ashed || !picks.includes(p)) return Promise.resolve();
      p.ashed = true;
      const gone = () => p.el.classList.add('is-leaving');
      if (calm.matches) return Promise.resolve(gone());
      if (p.asImage) {
        if (p.burnOut) return p.burnOut(BURN_OUT).then(gone);
        gone(); // cutout couldn't be read (file://): just fade
        return new Promise((r) => setTimeout(r, 400));
      }
      const w = p.el.offsetWidth, h = p.el.offsetHeight;
      const [el, flames, burnOut] = burn.create(snapshot(p.el), w, h, false);
      el.className = 'pill__img pill__img--snapshot';
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      p.el.classList.add('as-image');
      p.el.prepend(el);
      p.el.append(flames);
      return burnOut(BURN_OUT).then(gone);
    }

    // Back to picking: anything that burnt is there again, as it was.
    function restore() {
      for (const p of picks) {
        if (!p.ashed) continue;
        p.ashed = false;
        p.el.classList.remove('is-leaving');
        if (p.asImage) {
          setAsImage(p, p.img); // already burnt once, so it comes back charred
        } else {
          p.el.querySelectorAll('.pill__img, .pill__flames').forEach((el) => el.remove());
          p.el.classList.remove('as-image');
        }
      }
    }

    // Continue asks first: are these the picks? Back to picking closes it (so do Escape and
    // a click outside it).
    const confirmBox = $('#pick-confirm');
    continueBtn.addEventListener('click', () => {
      if (burning || picks.length < picksNeeded()) return;
      confirmBox.showModal();
    });
    $('#pick-confirm-back').addEventListener('click', () => confirmBox.close());
    $('#pick-confirm-go').addEventListener('click', () => {
      confirmBox.close();
      go('details');
    });
    confirmBox.addEventListener('click', (e) => { if (e.target === confirmBox) confirmBox.close(); }); // the backdrop

    // The cards screen: everything but the tin and what's in it steps back, and it's hands off
    // the tin until Back. Leaving for good (the questions) keeps whatever burnt, burnt.
    function review(on) {
      if (on === reviewing) return;
      reviewing = on;
      burning = on;
      pickScreen.classList.toggle('is-reviewing', on);
      if (on) {
        closeSearch(false);
        openSettings(false);
        hidePreview();
        if (catMode) setHover(null);
      } else if (screenNow === 'pick') {
        restore();
      }
      refresh();
    }

    function spawnPoint(w, h) {
      for (let i = 0; i < 60; i++) {
        const x = rand(w / 2 + 4, W - w / 2 - 4);
        const y = rand(h / 2 + 4, H - h / 2 - 4);
        if (distTo({ x, y }, cx, cy) > keepOut() + w / 2) return { x, y };
      }
      return { x: rand(w / 2, W - w / 2), y: h };
    }

    function createPill({ id = null, other = false } = {}) {
      const el = document.createElement('div');
      el.className = 'pill' + (other ? ' pill--other' : '');
      el.tabIndex = 0;
      el.setAttribute('role', 'button');
      stage.appendChild(el);

      const p = { id, el, other, mode: 'out', customName: '', variation: '', reason: '', cat: catOf.get(id) || null };
      renderNames(el, p, 'pill');
      paintOther(p);
      p.w = el.offsetWidth;
      p.h = el.offsetHeight;
      const pos = spawnPoint(p.w, p.h);
      p.body = makeBody(p, pos.x, pos.y);
      el._pill = p;
      Composite.add(world, p.body);
      pills.push(p);
      if ((searchMode && !wanted(p)) || (selectedCat && p.cat !== selectedCat && !other)) filterOut(p);
      if (showImages) applyThumb(p);
      return p;
    }

    function removePill(p) {
      Composite.remove(world, p.body);
      pills = pills.filter((q) => q !== p);
      p.el.classList.add('is-leaving');
      setTimeout(() => p.el.remove(), 300);
    }

    // Swap in a body matching the element's current size.
    function fitBody(p) {
      const w = p.el.offsetWidth, h = p.el.offsetHeight;
      if (!w || !h) return; // hidden by a filter: measured again when it's shown
      if (w === p.w && h === p.h) return;
      const { x, y } = p.body.position;
      if (!p.filtered) Composite.remove(world, p.body);
      p.w = w;
      p.h = h;
      p.body = makeBody(p, x, y);
      if (!p.filtered) Composite.add(world, p.body);
      if (p.mode === 'in' && !fullyInside(p)) sendIn(p);
    }

    function relabel(p) {
      renderNames(p.el, p, 'pill');
      paintOther(p);
      if (running) fitBody(p);
      else stale = true; // hidden elements measure 0
    }

    function buildStatics() {
      Composite.remove(world, statics);
      const T = 400;
      const wallFilter = { group: 0, category: CAT.WALL, mask: CAT.OUT | CAT.MOVE };
      const wall = (x, y, w, h) => Bodies.rectangle(x, y, w, h, { isStatic: true, collisionFilter: wallFilter });
      statics = [
        wall(W / 2, -T / 2, W + 2 * T, T),
        wall(W / 2, H + T / 2, W + 2 * T, T),
        wall(-T / 2, H / 2, T, H + 2 * T),
        wall(W + T / 2, H / 2, T, H + 2 * T),
        // solid disk that keeps unselected pills outside the inventory
        Bodies.circle(cx, cy, keepOut(), {
          isStatic: true,
          collisionFilter: { group: 0, category: CAT.DISK, mask: CAT.OUT },
        }, 64),
      ];
      // ring of segments that keeps selected items inside the inventory
      const N = 48, thick = 80, r = innerR() + thick / 2;
      const len = (2 * Math.PI * r / N) * 1.2;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        statics.push(Bodies.rectangle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, len, thick, {
          isStatic: true,
          angle: a + Math.PI / 2,
          collisionFilter: { group: 0, category: CAT.RING, mask: CAT.IN },
        }));
      }
      Composite.add(world, statics);
    }

    // Pull the question up when it would meet the can. The base lift lives in CSS;
    // this only adds more, and never tucks the text into the nav.
    function liftTitle(canTop) {
      const title = document.querySelector('.screen--pick .headline');
      if (!title || title.style.transform) return;
      title.style.setProperty('--title-lift', '0px');
      const range = document.createRange();
      range.selectNodeContents(title);
      const rs = [...range.getClientRects()];
      if (!rs.length) return;
      const textTop = Math.min(...rs.map((r) => r.top));
      const textBottom = Math.max(...rs.map((r) => r.bottom));
      const need = textBottom + 28 - canTop;
      if (need <= 0) return;
      const nav = document.querySelector('.screen--pick .topbar');
      const room = textTop - (nav ? nav.getBoundingClientRect().bottom : 0) - 8;
      const lift = Math.min(need, Math.max(0, room));
      if (lift > 0) title.style.setProperty('--title-lift', `${Math.ceil(lift)}px`);
    }

    // Room for the tin: the screen's middle (the stage stops short at the bottom bar, so that
    // isn't simply H / 2), the highest its top may go (clear of the question) and the lowest its
    // bottom may go (clear of the bottom, or the search field). Tall phone layouts: whole stage.
    const TIN_DROP = 20; // px the tin sits below where it would just clear the question (room permitting)
    function tinRoom() {
      if (H > window.innerHeight) return { mid: H / 2, top: 8, floor: H - 8 };
      const stageTop = stage.getBoundingClientRect().top;
      // bottom of the question's last line of text (not its box), without any lift or the entrance's slide
      const title = document.querySelector('.screen--pick .headline');
      const lift = parseFloat(title.style.getPropertyValue('--title-lift')) || 0;
      const slide = new DOMMatrixReadOnly(getComputedStyle(title).transform).m42;
      const range = document.createRange();
      range.selectNodeContents(title);
      const rects = [...range.getClientRects()];
      const textBottom = rects.length ? Math.max(...rects.map((r) => r.bottom)) - slide + lift - stageTop : 0;
      return {
        mid: window.innerHeight / 2 - stageTop,
        top: Math.max(8, textBottom + 24),
        floor: searchMode ? H - 24 - searchField.offsetHeight : H - 8,
      };
    }

    function layout() {
      const rect = stage.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const was = { x: cx, y: cy };
      W = rect.width;
      H = rect.height;
      // centred on the screen, dropping (and, if it must, shrinking) to clear the question
      const room = tinRoom();
      R = Math.max(90, Math.min(Math.min(W, H) * 0.3, 230, (room.floor - room.top) / 2));
      cx = W / 2;
      cy = Math.min(Math.max(room.mid, room.top + R) + TIN_DROP, room.floor - R);
      const dx = cx - was.x, dy = cy - was.y;

      Object.assign(ring.style, {
        width: `${2 * R}px`, height: `${2 * R}px`,
        left: `${cx - R}px`, top: `${cy - R}px`,
      });
      liftTitle(rect.top + cy - R);
      buildStatics();
      drawWedges();
      placeSearch();

      placeTips();
      if (!built) return;
      refitPills();
      for (const p of pills) {
        if (p.asImage) setAsImage(p, p.img);
      }
      for (const p of pills) {
        const b = p.body;
        if (p.mode === 'transit') {
          p.target.x += dx;
          p.target.y += dy;
        } else if (p.mode === 'in') {
          Body.translate(b, { x: dx, y: dy });
          sendIn(p);
        } else if (p.mode !== 'drop' && p.mode !== 'exit') {
          const x = Math.min(Math.max(b.position.x, p.w / 2), W - p.w / 2);
          const y = Math.min(Math.max(b.position.y, p.h / 2), H - p.h / 2);
          Body.setPosition(b, { x, y });
          if (distTo(b.position, cx, cy) < keepOut()) sendOut(p);
        }
      }
    }

    // Glide a pill (ignoring collisions) into the ring / out past its edge.
    function sendIn(p) {
      land(p);
      p.goal = 'in';
      p.target = { x: cx + rand(-0.25, 0.25) * R, y: cy + rand(-0.25, 0.25) * R };
      setMode(p, 'transit');
    }

    function sendOut(p) {
      const { x, y } = p.body.position;
      let a = Math.atan2(y - cy, x - cx);
      if (distTo(p.body.position, cx, cy) < 4) a = rand(0, Math.PI * 2);
      const r = keepOut() + Math.max(p.w, p.h) / 2 + 12;
      p.goal = 'out';
      p.target = freeSpot(p, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      setMode(p, 'transit');
    }

    // Nearest spot to (x, y) where pill p fits clear of the walls, the tin, the detail
    // panel, other pills, and spots already promised to pills that are still moving.
    function freeSpot(p, x, y) {
      const m = 3;
      const others = pills.filter((q) => q !== p && !q.filtered && !['in', 'transit', 'exit'].includes(q.mode)).map((q) => q.body);
      const blockers = [...others, searchWall].filter(Boolean);
      const claimed = pills.filter((q) => q !== p && q.mode === 'transit' && q.goal === 'out').map((q) => ({
        min: { x: q.target.x - q.w / 2, y: q.target.y - q.h / 2 },
        max: { x: q.target.x + q.w / 2, y: q.target.y + q.h / 2 },
      }));
      const hit = (a, b) => a.min.x < b.max.x && a.max.x > b.min.x && a.min.y < b.max.y && a.max.y > b.min.y;
      const fits = (px, py) => {
        if (px - p.w / 2 < 4 || px + p.w / 2 > W - 4 || py - p.h / 2 < 4 || py + p.h / 2 > H - 4) return false;
        if (distTo({ x: px, y: py }, cx, cy) < keepOut() + Math.max(p.w, p.h) / 2) return false;
        const box = { min: { x: px - p.w / 2 - m, y: py - p.h / 2 - m }, max: { x: px + p.w / 2 + m, y: py + p.h / 2 + m } };
        return !claimed.some((c) => hit(c, box)) && Query.region(blockers, box).length === 0;
      };
      // spiral outward in 12px rings
      for (let r = 0; r < Math.min(Math.max(W, H), 700); r += 12) {
        const steps = r ? Math.ceil((2 * Math.PI * r) / 20) : 1;
        const start = rand(0, Math.PI * 2);
        for (let i = 0; i < steps; i++) {
          const a = start + (i / steps) * Math.PI * 2;
          const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
          if (fits(px, py)) return { x: px, y: py };
        }
      }
      return { x, y }; // screen is full: let collisions sort it out
    }

    function arrived(p) {
      if (distTo(p.body.position, p.target.x, p.target.y) < 4) return true;
      return p.goal === 'in' && fullyInside(p);
    }

    Events.on(engine, 'beforeUpdate', () => {
      for (const p of pills) {
        if (p.filtered) continue; // hidden by a category filter
        const b = p.body;
        // wobble back to upright
        Body.setAngularVelocity(b, b.angularVelocity * 0.9 - b.angle * 0.02);

        if (p.mode === 'transit') {
          if (p.wait > 0) { // staggered start: hold still (off screen) until it's this pill's turn
            p.wait--;
            Body.setVelocity(b, { x: 0, y: 0 });
            continue;
          }
          if (arrived(p)) {
            setMode(p, p.goal);
            continue;
          }
          const vx = (p.target.x - b.position.x) * 0.12;
          const vy = (p.target.y - b.position.y) * 0.12;
          const s = Math.hypot(vx, vy), max = 22;
          Body.setVelocity(b, s > max ? { x: vx / s * max, y: vy / s * max } : { x: vx, y: vy });
        } else if (p.mode === 'exit') {
          Body.applyForce(b, b.position, { x: 0, y: GRAVITY * b.mass });
        } else if (p.falling && (p.mode === 'drop' || p.mode === 'out')) {
          if (p.mode === 'drop' && b.position.y - p.h / 2 > 2) setMode(p, 'out'); // on screen: the walls hold it now
          // on tall phone layouts, stop pulling once it's well past the tin, so nothing sinks out of sight
          if (H <= window.innerHeight || b.position.y < cy + R + 240) Body.applyForce(b, b.position, { x: 0, y: GRAVITY * b.mass });
        } else if (p.mode === 'in' && distTo(b.position, cx, cy) > innerR()) {
          // knocked through the tin's wall (a fast drag can shove a pick past the thin ring):
          // still a pick, so it glides back in rather than drifting off on its own
          sendIn(p);
        } else if (p.mode === 'out' || p.mode === 'in') {
          const dx = cx - b.position.x, dy = cy - b.position.y;
          const d = Math.hypot(dx, dy) || 1;
          // narrow stages pile pills into tall columns, so pull softer there
          const f = PULL[p.mode] * b.mass * Math.min(1, W / 900);
          Body.applyForce(b, b.position, { x: (dx / d) * f, y: (dy / d) * f });
        }
      }
    });

    /* image preview: one shared <img> that floats above the hovered / dragged pill */

    const IMAGES = window.SURVEY_IMAGES || { base: '', files: {} };
    const preview = document.createElement('img');
    preview.className = 'pill-preview';
    preview.alt = '';
    stage.appendChild(preview);
    const imageLoads = new Map(); // src -> Promise<HTMLImageElement|null>, so each file is fetched once
    let previewFor = null;

    if (IMAGES.inventory) {
      ring.classList.add('has-image');
      ring.style.backgroundImage = `url("${new URL(IMAGES.inventory, document.baseURI).href}")`;
    }

    const imageSrc = (p) => (p.other ? null : cutoutUrl(p.id));

    // Every item in a category shares its colour (content/images.js).
    const colorFor = (p) => (IMAGES.colors || {})[p.cat] || '';

    function loadImage(src) {
      if (!imageLoads.has(src)) {
        imageLoads.set(src, new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        }));
      }
      return imageLoads.get(src);
    }

    function showPreview(p) {
      const src = !p.asImage && !p.thumb && imageSrc(p); // already showing as its image
      previewFor = src ? p : null;
      if (!src) {
        preview.classList.remove('is-on');
        return;
      }
      loadImage(src).then((img) => {
        if (previewFor !== p || !img) return;
        if (preview.src !== src) preview.src = src;
        placePreview();
        preview.classList.add('is-on');
      });
    }

    function hidePreview(p) {
      if (p && previewFor !== p) return;
      if (drag?.moved && drag.p === previewFor) return; // keep it while dragging
      previewFor = null;
      preview.classList.remove('is-on');
    }

    // Above the pill, or below it if there's no room at the top of the screen.
    function placePreview() {
      const p = previewFor;
      if (!p) return;
      const { x, y } = p.body.position;
      const ih = preview.offsetHeight, iw = preview.offsetWidth, gap = 6;
      let top = y - p.h / 2 - gap - ih;
      if (top < 0) top = y + p.h / 2 + gap;
      preview.style.transform = `translate(${x - iw / 2}px, ${top}px)`;
    }

    // Resting on the headline's text for 2s lifts it above the capsules with a white outline;
    // moving off drops it again. It stays click-through, so capsules underneath can still be grabbed.
    const RAISE_DELAY = 2000;
    const headline = $('.screen--pick .headline');
    const headlineRange = document.createRange();
    let raiseTimer = 0;
    function overHeadline(e) {
      headlineRange.selectNodeContents(headline);
      return [...headlineRange.getClientRects()].some((r) => (
        e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom
      ));
    }
    function lowerHeadline() {
      clearTimeout(raiseTimer);
      raiseTimer = 0;
      headline.classList.remove('is-raised');
    }
    stage.addEventListener('pointermove', (e) => {
      if (drag?.moved || !overHeadline(e)) {
        lowerHeadline();
        return;
      }
      if (!raiseTimer && !headline.classList.contains('is-raised')) {
        raiseTimer = setTimeout(() => {
          raiseTimer = 0;
          headline.classList.add('is-raised');
        }, RAISE_DELAY);
      }
    });
    stage.addEventListener('pointerleave', lowerHeadline);

    stage.addEventListener('pointerover', (e) => {
      const el = e.target.closest('.pill');
      if (el && !drag && !onRing(local(e))) showPreview(el._pill);
    });
    stage.addEventListener('pointerout', (e) => {
      const el = e.target.closest('.pill');
      if (el && !el.contains(e.relatedTarget)) hidePreview(el._pill);
    });

    function frame() {
      Engine.update(engine, 1000 / 60);
      // fallen fully out of sight (on tall phone layouts, past the bottom of the screen): gone
      const leaving = pills.filter((p) => p.mode === 'exit' && !p.filtered);
      if (leaving.length) {
        const seen = Math.min(H, window.innerHeight - stage.getBoundingClientRect().top);
        leaving.forEach((p) => {
          if (p.body.position.y - p.h / 2 <= seen) return;
          if (p.customName) removePill(p); // a typed-in item: gone for good
          else filterOut(p);
        });
      }
      syncClear();
      for (const p of pills) {
        const { x, y } = p.body.position;
        p.el.style.transform = `translate(${x - p.w / 2}px, ${y - p.h / 2}px) rotate(${p.body.angle}rad)`;
      }
      placePreview();
      raf = requestAnimationFrame(frame);
    }

    /* selection */

    function showToast(path) {
      fill(toast, path);
      toast.classList.add('is-on');
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove('is-on'), 2200);
    }

    // Tips beside the tin, each shown once: pick.customTip, for the first custom item (an item
    // from the list going in gets none). They stack, and stay until their × is clicked.
    const tips = $('#pick-tips');
    const tipsShown = new Set();
    function showTip(key) {
      if (tipsShown.has(key)) return;
      tipsShown.add(key);
      const el = document.createElement('div');
      el.className = 'pick-tip';
      el.setAttribute('role', 'status');
      const text = document.createElement('p');
      text.className = 'pick-tip__text';
      fill(text, `pick.${key}`);
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'pick-tip__close';
      close.textContent = '×';
      close.setAttribute('aria-label', joined('ui.close'));
      close.addEventListener('click', () => {
        el.remove();
        placeTips();
      });
      el.append(text, close);
      tips.append(el);
      placeTips();
      requestAnimationFrame(() => el.classList.add('is-on'));
    }
    // to the tin's right, level with its middle; above it when there's no room there
    function placeTips() {
      if (!tips.children.length) return;
      const side = cx + R + 20 + tips.offsetWidth <= W - 16;
      tips.classList.toggle('is-side', side);
      tips.classList.toggle('is-above', !side);
      tips.style.left = `${side ? cx + R + 20 : cx}px`;
      tips.style.top = `${side ? cy : cy - R - 14}px`;
    }

    function refresh() {
      fill(continueBtn, 'ui.continue', { n: picks.length, max: MAX_PICKS });
      continueBtn.disabled = burning || picks.length < picksNeeded(); // all five (fewer while debugging)
      hint.hidden = picks.length > 0;
      // searching, nothing's on the board until a category is chosen or something typed: point at the field
      fill(hint, searchMode && !searchStarted ? 'pick.searchHint' : 'pick.hint');
    }

    // Keep exactly one unpicked "Other" pill on the board.
    function ensureOther() {
      if (pills.some((p) => p.other && !p.customName && !picks.includes(p))) return;
      createPill({ other: true });
    }

    function pick(p) {
      if (picks.length >= MAX_PICKS) {
        showToast('pick.full');
        sendOut(p);
        return;
      }
      // a custom item has no cutout: a picture of its capsule, as it looks out here, burns instead
      const shot = p.other && p.customName ? snapshot(p.el) : null;
      if (shot) p.imgW = Math.min(p.el.offsetWidth, Math.round(R * 0.9));
      cast = cast.filter((q) => q !== p);
      p.el.classList.remove('is-cast');
      picks.push(p);
      if (p.other) showTip('customTip'); // no tip for an item from the list
      p.el.classList.add('is-picked');
      applyThumb(p); // in the tin it becomes the burning cutout instead
      sendIn(p);
      const src = imageSrc(p);
      if (src) {
        hidePreview(p);
        loadImage(src).then((img) => {
          if (img && picks.includes(p)) setAsImage(p, img);
        });
      } else if (shot) {
        const img = new Image();
        img.src = shot.toDataURL();
        img.decode().then(() => { if (picks.includes(p)) setAsImage(p, img); }, () => {});
      }
      if (p.other) ensureOther();
      refresh();
      details.add(p);
    }

    function unpick(p) {
      picks = picks.filter((q) => q !== p);
      p.el.classList.remove('is-picked');
      if (p.asImage) setAsImage(p, null);
      details.remove(p);
      p.variation = p.reason = '';
      if (p.other && searchMode && p.customName) {
        // searching: a typed-in item lingers outside the tin under its name, like any other item
        p.el.classList.add('is-cast');
        fitBody(p);
      } else if (p.other) {
        p.customName = '';
        // a spare "Other" is already waiting outside
        if (pills.some((q) => q.other && !q.customName && q !== p && !picks.includes(q))) {
          removePill(p);
          refresh();
          return;
        }
        relabel(p);
      }
      applyThumb(p);
      sendOut(p);
      if (selectedCat && p.cat !== selectedCat && !p.other) filterOut(p); // back out, but outside the shown category ("Other" goes with every one)
      if (searchMode) castOut(p);
      refresh();
    }

    // Chosen from the search list: it pops up just outside the tin (as its cutout, names
    // under it, when it has one) and waits there to be dragged in.
    async function place(p) {
      p.searched = true;
      p.el.getAnimations().forEach((a) => a.cancel()); // e.g. halfway through popping out of view
      p.el.classList.remove('is-filtered-out');
      await applyThumb(p);
      fitBody(p); // re-measure: it may have changed (name, cutout) while it was hidden
      const a = rand(0, Math.PI * 2), r = keepOut() + Math.max(p.w, p.h) / 2 + 16;
      const { x, y } = freeSpot(p, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      Body.setPosition(p.body, { x, y });
      Body.setVelocity(p.body, { x: 0, y: 0 });
      Body.setAngle(p.body, 0);
      p.el.style.transform = `translate(${x - p.w / 2}px, ${y - p.h / 2}px)`;
      if (p.filtered) {
        p.filtered = false;
        Composite.add(world, p.body);
      }
      setMode(p, 'out');
      popIn(p);
    }

    const POP = 'cubic-bezier(.34, 1.56, .64, 1)'; // overshoots a little, then settles
    function popIn(p) {
      if (calm.matches) return;
      p.el.animate([{ scale: 0 }, { scale: 1 }], { duration: 550, easing: POP });
    }

    function popOut(p) {
      const hide = () => { if (searchMode && !wanted(p) && !picks.includes(p)) filterOut(p); };
      if (calm.matches) return hide();
      if (p.el.getAnimations().some((a) => a.id === 'pop-out')) return; // already on its way out
      p.el.animate([{ scale: 1, opacity: 1 }, { scale: 0, opacity: 0 }], { id: 'pop-out', duration: 220, easing: 'ease-in' }).finished.then(hide, () => {}); // cancelled: shown again
    }

    // Clicked: picked, if it isn't already. Its card waits for the next screen.
    function activate(p) {
      if (!picks.includes(p)) pick(p);
    }

    /* pointer: click to pick / open, drag to move */

    let drag = null;
    const local = (e) => {
      const r = stage.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };

    stage.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('.pill');
      if (!el || e.button > 0 || drag || burning || onRing(local(e))) return; // the category ring is a safe zone
      const p = el._pill;
      if (!p || p.mode === 'exit') return; // on its way out of sight
      if (p.mode === 'transit') {
        if (p.goal !== 'out') return; // gliding into the tin
        setMode(p, 'out'); // being nudged aside: let it be grabbed mid-move
      }
      e.preventDefault();
      el.focus({ preventScroll: true });
      try { stage.setPointerCapture(e.pointerId); } catch (_) { /* synthetic pointer */ }
      drag = { p, id: e.pointerId, start: local(e), moved: false, prev: p.mode, c: null };
    });

    stage.addEventListener('pointermove', (e) => {
      if (!drag || e.pointerId !== drag.id) return;
      const pt = local(e);
      if (!drag.moved) {
        if (Math.hypot(pt.x - drag.start.x, pt.y - drag.start.y) < 5) return;
        const b = drag.p.body;
        drag.moved = true;
        setMode(drag.p, 'drag');
        drag.p.el.classList.add('is-dragging');
        showPreview(drag.p);
        drag.c = Constraint.create({
          pointA: { ...pt },
          bodyB: b,
          pointB: { x: drag.start.x - b.position.x, y: drag.start.y - b.position.y },
          stiffness: 0.15,
          damping: 0.1,
          length: 0,
        });
        Composite.add(world, drag.c);
      }
      drag.c.pointA.x = pt.x;
      drag.c.pointA.y = pt.y;
      ring.classList.toggle('is-target', drag.prev === 'out' && insideRing(pt));
    });

    function endDrag(e, cancelled) {
      if (!drag || e.pointerId !== drag.id) return;
      const { p, moved, prev, c } = drag;
      drag = null;
      ring.classList.remove('is-target');
      if (!moved) {
        if (!cancelled) activate(p);
        return;
      }
      Composite.remove(world, c);
      p.el.classList.remove('is-dragging');
      hidePreview(p);
      justDragged = true;
      setTimeout(() => { justDragged = false; }, 0);
      const inside = insideRing(local(e));
      if (prev === 'in') {
        if (!inside) unpick(p);
        else if (fullyInside(p)) setMode(p, 'in');
        else sendIn(p);
      } else if (inside) {
        pick(p);
      } else {
        setMode(p, 'out');
      }
    }
    stage.addEventListener('pointerup', (e) => endDrag(e, false));
    stage.addEventListener('pointercancel', (e) => endDrag(e, true));

    stage.addEventListener('keydown', (e) => {
      const el = e.target.closest('.pill');
      if (!el || burning || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      activate(el._pill);
    });


    /* categorization mode: categories fan out from the tin as wedges. Hover a wedge to pick
       out its items; click it to clear everything else off the screen (undo with the chip). */

    const wedgesEl = $('#wedges');
    const tagsEl = $('#wedge-tags');
    const chips = $('#tools-chips');
    const modeSearch = $('#mode-search');
    const modeAll = $('#mode-all');
    const textToggle = $('#toggle-text');
    // the settings' single choice follows whichever mode is on
    const syncModes = () => {
      modeSearch.checked = searchMode;
      modeAll.checked = catMode;
    };
    const WEDGE_START = (-111 * Math.PI) / 180; // first wedge's edge: up and to the left, as in the mock-up
    let catMode = false, showImages = true, hoverCat = null, selectedCat = null, justDragged = false, searchMode = false;

    // The white ring the category names sit on, just outside the tin's rim.
    function ringBand() {
      const FS = 13, LINE = FS + 4, r0 = R + 16; // text size, line spacing, inner line's radius
      const rc = r0 + LINE / 2, bandW = LINE + FS + 9; // the ring's centre radius and width
      return { FS, LINE, r0, rc, bandW, outer: rc + bandW / 2 };
    }
    const onRing = (pt) => catMode && distTo(pt, cx, cy) >= R && distTo(pt, cx, cy) <= ringBand().outer;

    const wedgeStep = () => (2 * Math.PI) / Math.max(1, CATS.length);
    const wedgeMid = (i) => WEDGE_START - (i + 0.5) * wedgeStep(); // wedges run anticlockwise
    // which wedge a stage point falls in (null inside the tin)
    function wedgeAt(pt) {
      const dx = pt.x - cx, dy = pt.y - cy;
      if (Math.hypot(dx, dy) < R) return null;
      const turn = ((WEDGE_START - Math.atan2(dy, dx)) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      return CATS[Math.floor(turn / wedgeStep())]?.id ?? null;
    }

    const SVGNS = 'http://www.w3.org/2000/svg';
    const svg = (tag, attrs = {}) => {
      const el = document.createElementNS(SVGNS, tag);
      for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
      return el;
    };

    function drawWedges() {
      // SVG elements have no .hidden property, so toggle the attribute
      wedgesEl.toggleAttribute('hidden', !catMode);
      tagsEl.toggleAttribute('hidden', !catMode);
      if (!catMode || !W) return;

      // wedges: invisible (no outline, no fill); they only map the stage into categories
      wedgesEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
      const far = Math.hypot(W, H);
      wedgesEl.innerHTML = CATS.map((c, i) => {
        const a0 = WEDGE_START - i * wedgeStep(), a1 = a0 - wedgeStep();
        let d = `M${cx},${cy}`;
        for (let k = 0; k <= 16; k++) {
          const a = a0 + (a1 - a0) * (k / 16);
          d += `L${cx + Math.cos(a) * far},${cy + Math.sin(a) * far}`;
        }
        const cls = ['wedge', c.id === hoverCat ? 'is-hover' : '', c.id === selectedCat ? 'is-selected' : ''].join(' ');
        return `<path class="${cls}" d="${d}Z"/>`;
      }).join('');

      // headers: curved round the tin's rim, centred on each wedge, on one white ring;
      // two lines each, Chinese read first: outside the English on the top half, inside it below
      tagsEl.setAttribute('viewBox', `0 0 ${W} ${H}`);
      tagsEl.replaceChildren();
      const { FS, LINE, r0, rc, bandW } = ringBand(), pad = 8; // pad: each side of the selected name
      const at = (ang, r) => `${cx + Math.cos(ang) * r},${cy + Math.sin(ang) * r}`;
      tagsEl.append(svg('circle', { class: 'wedge-ring', cx, cy, r: rc, 'stroke-width': bandW }));
      CATS.forEach((c, i) => {
        const a = wedgeMid(i);
        const upper = Math.sin(a) < 0; // lower half runs the other way so text isn't upside down
        const span = Math.PI * 0.9; // room to centre the text on; only the text and its band show
        const from = upper ? a - span / 2 : a + span / 2, to = upper ? a + span / 2 : a - span / 2;
        const g = svg('g', { class: ['wedge-tag', c.id === hoverCat ? 'is-hover' : '', c.id === selectedCat ? 'is-selected' : ''].join(' ') });
        const band = svg('path', { class: 'wedge-tag__band', 'stroke-width': bandW });
        g.append(band);
        tagsEl.append(g);
        let longest = 0;
        catName(c.id).reverse().forEach((name, k) => {
          const line = upper ? 1 - k : k; // 0 = nearer the tin; on top, letters point outward, so the outer line reads first
          const rb = r0 + line * LINE + (upper ? -1 : 1) * FS * 0.35; // baseline that centres the letters on their line
          const id = `cat-arc-${c.id}-${k}`;
          const guide = svg('path', { id, d: `M${at(from, rb)} A${rb},${rb} 0 0 ${upper ? 1 : 0} ${at(to, rb)}`, fill: 'none' });
          const text = svg('text', { class: 'wedge-tag__text', lang: k ? 'en' : 'zh-CN' });
          const run = svg('textPath', { href: `#${id}`, startOffset: '50%', 'text-anchor': 'middle' });
          run.textContent = name;
          text.append(run);
          g.append(guide, text);
          longest = Math.max(longest, text.getComputedTextLength());
        });
        // band (shown only on the selected name): exactly as long as the longer line plus padding, square ends
        const half = (longest / 2 + pad) / rc;
        band.setAttribute('d', `M${at(a - half, rc)} A${rc},${rc} 0 0 1 ${at(a + half, rc)}`);
      });
    }

    function setHover(cat) {
      if (cat === hoverCat) return;
      hoverCat = cat;
      for (const p of pills) {
        const dim = !!cat && !selectedCat && !picks.includes(p) && p.cat !== cat && !p.other; // "Other" belongs to every category
        p.el.classList.toggle('is-dim', dim);
      }
      drawWedges();
    }

    function filterOut(p) {
      if (p.filtered) return;
      land(p);
      p.filtered = true;
      p.el.classList.add('is-filtered-out');
      Composite.remove(world, p.body);
    }
    function filterIn(p) {
      if (!p.filtered) return;
      p.el.classList.remove('is-filtered-out');
      fitBody(p); // still marked filtered, so this only re-measures
      p.filtered = false;
      const { x, y } = spawnPoint(p.w, p.h);
      Body.setPosition(p.body, { x, y });
      Body.setVelocity(p.body, { x: 0, y: 0 });
      setMode(p, 'out');
      Composite.add(world, p.body);
    }

    function selectCategory(cat) {
      selectedCat = cat;
      for (const p of pills) {
        if (picks.includes(p)) continue; // what's in the tin always stays
        if (cat && p.cat !== cat && !p.other) filterOut(p); // "Other" stays out for every category
        else filterIn(p);
      }
      setHover(null);
      renderChips();
      drawWedges();
    }

    function renderChips() {
      chips.replaceChildren();
      if (!selectedCat) return;
      const chip = document.createElement('span');
      chip.className = 'cat-chip';
      fillPair(chip, ...catName(selectedCat));
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'cat-chip__close';
      close.textContent = '×';
      close.setAttribute('aria-label', joined('pick.showAll'));
      close.addEventListener('click', () => selectCategory(null));
      chip.append(close);
      chips.append(chip);
    }

    function setCatMode(on) {
      catMode = on;
      syncModes();
      if (!on) {
        hoverCat = null;
        selectCategory(null);
        pills.forEach((p) => p.el.classList.remove('is-dim'));
      }
      drawWedges();
      if (!W) return;
      buildStatics();
      if (!on) return;
      for (const p of pills) {
        if (!p.filtered && p.mode === 'out' && distTo(p.body.position, cx, cy) < keepOut() + Math.max(p.w, p.h) / 2) sendOut(p);
      }
    }

    stage.addEventListener('pointermove', (e) => {
      if (catMode && !drag?.moved) setHover(wedgeAt(local(e)));
    });
    stage.addEventListener('pointerleave', () => setHover(null));
    stage.addEventListener('click', (e) => {
      if (!catMode || justDragged || burning || e.target.closest('#tools, .pick-tips') || (e.target.closest('.pill') && !onRing(local(e)))) return;
      const cat = wedgeAt(local(e));
      if (cat) selectCategory(cat === selectedCat ? null : cat);
    });
    modeAll.addEventListener('change', () => {
      if (!modeAll.checked) return;
      setSearchMode(false);
      setCatMode(true);
    });

    // "Show image not text": loose items with a cutout show it instead of their name.
    // Items chosen from the search list always do, with their names ringed round it.
    // Resolves once the cutout is on (or straight away when there's nothing to add).
    function applyThumb(p) {
      const want = (showImages || p.searched) && !picks.includes(p) && !!imageSrc(p);
      if (!want) {
        if (!p.thumb) return Promise.resolve();
        p.thumb.remove();
        p.thumb = null;
        p.el.classList.remove('as-thumb');
        if (running) fitBody(p);
        else stale = true;
        return Promise.resolve();
      }
      if (p.thumb) return Promise.resolve();
      return loadImage(imageSrc(p)).then((img) => {
        if (!img || p.thumb || !(showImages || p.searched) || picks.includes(p)) return;
        const el = document.createElement('img');
        el.className = 'pill__thumb';
        el.alt = '';
        el.draggable = false;
        el.src = img.src;
        p.thumb = el;
        p.thumbImg = img;
        sizeThumb(p);
        p.el.prepend(el);
        p.el.classList.add('as-thumb');
        if (running) fitBody(p);
        else stale = true;
      });
    }
    // Fit inside a square box, so tall cutouts (the cane) don't tower over the rest. A little
    // larger while searching, where the box follows the screen's width.
    const thumbBox = () => Math.round(searchMode ? Math.min(150, Math.max(90, W * 0.095)) : Math.min(110, R * 0.5));
    function sizeThumb(p) {
      const img = p.thumbImg;
      if (!p.thumb || !img) return;
      const scale = thumbBox() / Math.max(img.naturalWidth, img.naturalHeight);
      p.thumb.style.width = `${Math.round(img.naturalWidth * scale)}px`;
      p.thumb.style.height = `${Math.round(img.naturalHeight * scale)}px`;
    }
    // after the mode or the screen size changes: every loose item at its size for it
    function refitPills() {
      for (const p of pills) {
        if (picks.includes(p)) continue;
        sizeThumb(p);
        fitBody(p);
      }
    }

    function setShowImages(on) {
      showImages = on;
      textToggle.checked = !on;
      pills.forEach(applyThumb);
    }
    textToggle.addEventListener('change', () => setShowImages(!textToggle.checked));


    /* search mode: the capsules stay hidden. A field near the bottom lists the categories, with
       the items matching what's typed under them, plus "Add …" for anything that isn't there.
       Picking an item pops it up beside the tin; picking a category makes it the one active
       category, and its items drop in from the top of the screen. */

    const searchEl = $('#search');
    const searchList = $('#search-list');
    const searchField = $('#search-field');
    let dropCat = null; // the active category: its loose items are on screen
    let searchStarted = false; // a category chosen or something typed, at least once
    function startSearching() {
      if (searchStarted) return;
      searchStarted = true;
      refresh();
    }

    const norm = (text) => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
    const matches = (p, q) => norm(itemName(p.id, 'en')).includes(q) || norm(itemNames.zh?.get(p.id) || '').includes(q);
    const spareOther = () => pills.find((p) => p.other && !p.customName && !picks.includes(p));

    // Chosen from the list, or taken back out of the tin, while searching: these stay on
    // screen, newest last. Past ten, the oldest leaves (a typed-in one for good).
    const CAST_MAX = 10;
    let cast = [];
    function castOut(p) {
      cast = cast.filter((q) => q !== p);
      cast.push(p);
      while (cast.length > CAST_MAX) {
        const old = cast.shift();
        if (picks.includes(old)) continue;
        if (old.other) removePill(old);
        else popOut(old);
      }
    }

    // While searching, only the loose items in the active category or matching what's typed, plus
    // the ones chosen from the list or taken back out of the tin, are on screen.
    function wanted(p) {
      if (cast.includes(p)) return true;
      if (dropCat && p.cat === dropCat) return true;
      const q = norm(searchField.value);
      return !p.other && !!q && matches(p, q);
    }

    // Items that stop matching leave at once; new matches wait for a pause in the typing.
    const MATCH_DELAY = 2000;
    let matchTimer = 0;
    function showMatches({ reveal = true } = {}) {
      clearTimeout(matchTimer);
      if (!searchMode) return;
      if (!reveal) matchTimer = setTimeout(showMatches, MATCH_DELAY);
      for (const p of pills) {
        if (picks.includes(p)) continue;
        if (wanted(p) && p.filtered) {
          if (!reveal) continue;
          filterIn(p);
          popIn(p);
        } else if (!wanted(p) && !p.filtered && p.mode !== 'exit') {
          popOut(p);
        }
      }
    }

    // The field sits near the bottom, a little wider than the tin (on tall phone layouts, just
    // under the tin), with the × (Clear screen) just right of it. A wall keeps the capsules
    // from hiding behind them while search is open.
    const ROW_PAD = 30;
    const CLEAR_GAP = 8; // px between the field and the ×, as in style.css
    let searchWall = null;
    const wallOpts = { isStatic: true, collisionFilter: { group: 0, category: CAT.DISK, mask: CAT.OUT } };
    function placeSearch() {
      if (searchWall) Composite.remove(world, searchWall);
      searchWall = null;
      if (!W) return;
      const fieldH = searchField.offsetHeight || 68;
      const side = CLEAR_GAP + fieldH; // the × is square, as tall as the field
      let width = Math.min(W - 32 - side, Math.max(300, Math.round(2.2 * R)));
      let left = cx - width / 2; // the field stays centred under the tin; the × hangs off its right
      if (left < 16) left = 16;
      if (left + width + side > W - 16) { width = W - 32 - side; left = 16; }
      const bottom = H > window.innerHeight ? Math.min(H - ROW_PAD, cy + R + 32 + fieldH) : H - ROW_PAD;
      Object.assign(searchEl.style, { width: `${width}px`, left: `${left}px`, bottom: `${H - bottom}px` });
      if (!searchMode) return;
      const stageRect = stage.getBoundingClientRect();
      const fieldRect = searchField.getBoundingClientRect();
      const wallW = fieldRect.width + side; // the field and the ×
      searchWall = Bodies.rectangle(
        fieldRect.left - stageRect.left + wallW / 2,
        fieldRect.top - stageRect.top + fieldRect.height / 2,
        wallW + 2 * GAP,
        fieldRect.height + 2 * GAP,
        wallOpts,
      );
      Composite.add(world, searchWall);
      searchList.style.maxHeight = `${Math.round(Math.max(140, Math.min(bottom - fieldH - 70, H * 0.62, window.innerHeight * 0.6)))}px`;
      stage.style.setProperty('--search-clear', `${Math.round(H - bottom + fieldH + 12)}px`); // toasts sit above the field
    }

    // Falls from just above the top of the screen, a little after the ones before it.
    function dropIn(p, i) {
      p.el.getAnimations().forEach((a) => a.cancel()); // e.g. halfway through popping out of view
      p.el.classList.remove('is-filtered-out');
      p.falling = true;
      fitBody(p); // still marked filtered, so this only re-measures
      p.filtered = false;
      p.body.frictionAir = DROP_AIR;
      const x = rand(p.w / 2 + 4, W - p.w / 2 - 4);
      Body.setPosition(p.body, { x, y: -p.h / 2 - 20 - i * rand(45, 75) });
      Body.setVelocity(p.body, { x: 0, y: 0 });
      Body.setAngle(p.body, rand(-0.3, 0.3));
      setMode(p, 'drop');
      Composite.add(world, p.body);
    }

    function land(p) {
      if (!p.falling) return;
      p.falling = false;
      p.body.frictionAir = AIR;
    }

    // One category at a time: the last one's loose items leave (what's in the tin, or was
    // taken back out of it, stays) and this one's fall in.
    function dropCategory(cat) {
      const was = dropCat;
      dropCat = cat;
      if (cat) startSearching();
      // the last category's loose items drop out through the floor (unless something else keeps them)
      for (const p of pills) {
        if (was && p.cat === was && !p.filtered && !picks.includes(p) && !wanted(p) && p.mode !== 'exit') fallOut(p);
      }
      pills.filter((p) => cat && p.cat === cat && (p.filtered || p.mode === 'exit') && !picks.includes(p))
        .sort(() => Math.random() - 0.5)
        .forEach((p, i) => {
          filterOut(p); // still falling out from before: start it over from the top
          dropIn(p, i);
        });
      showMatches(); // after the drop, or this would pop them in beside the tin instead
    }

    // "Clear screen", the × right of the field: shown while anything loose is on screen. Everything
    // loose drops out through the floor (what's in the tin stays), and the board starts empty again.
    const clearBtn = $('#search-clear');
    function syncClear() {
      const any = searchMode && !burning && pills.some((p) => !p.filtered && !picks.includes(p) && p.mode !== 'exit');
      if (clearBtn.hidden === any) clearBtn.hidden = !any;
      if (any && !clearBtn.title) clearBtn.title = clearBtn.getAttribute('aria-label') || ''; // "清空屏幕 / Clear screen" on hover
    }
    clearBtn.addEventListener('click', () => {
      dropCat = null;
      cast = [];
      searchField.value = '';
      closeSearch(false);
      for (const p of pills) {
        if (!p.filtered && !picks.includes(p) && p.mode !== 'exit') fallOut(p);
      }
      showMatches();
    });

    function fallOut(p) {
      p.el.getAnimations().forEach((a) => a.cancel());
      hidePreview(p);
      p.falling = true;
      p.body.frictionAir = DROP_AIR;
      setMode(p, 'exit');
    }

    function setSearchMode(on) {
      if (on === searchMode) return;
      searchMode = on;
      dropCat = null;
      syncModes();
      refresh(); // the tin's hint
      searchEl.hidden = !on;
      stage.classList.toggle('is-searching', on);
      if (built) refitPills(); // loose items are a little larger while searching
      if (on) {
        if (catMode) setCatMode(false);
        hidePreview();
        pills.forEach((p) => { if (!picks.includes(p) && !wanted(p)) filterOut(p); });
      } else {
        closeSearch(true);
        pills.forEach((p) => {
          if (p.mode === 'exit') filterOut(p); // halfway out of sight: back like the rest
          land(p);
          if (!picks.includes(p)) filterIn(p);
        });
      }
      if (running) layout(); // the tin may need to sit higher for the field; places (or drops) the field and its wall
      else placeSearch();
    }

    // The list (the drawer over the field) slides up into place as it opens and fades away
    // as it closes. While it fades it counts as closed.
    let drawerAnim = null, drawerClosing = false;
    const drawerOpen = () => !searchList.hidden && !drawerClosing;

    function openSearch() {
      const was = drawerOpen();
      if (drawerClosing) { // caught fading out: back it comes
        drawerAnim?.cancel();
        drawerAnim = null;
        drawerClosing = false;
      }
      searchList.hidden = false;
      renderSearch();
      if (was || searchList.hidden || calm.matches) return;
      drawerAnim = searchList.animate(
        [{ transform: 'translateY(32px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 380, easing: 'cubic-bezier(.2, .8, .2, 1)' },
      );
    }

    function closeSearch(clear) {
      if (drawerOpen()) {
        drawerAnim?.cancel();
        if (calm.matches) searchList.hidden = true;
        else {
          drawerClosing = true;
          const anim = searchList.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' });
          drawerAnim = anim;
          anim.finished.then(() => {
            if (drawerAnim !== anim) return; // reopened meanwhile
            searchList.hidden = true;
            drawerClosing = false;
            anim.cancel();
            drawerAnim = null;
          }, () => {});
        }
      }
      if (!clear) return;
      searchField.value = '';
      searchField.blur();
      showMatches();
    }

    function row(cls) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = `search__row ${cls || ''}`.trim();
      const thumb = document.createElement('span');
      thumb.className = 'search__thumb';
      const names = document.createElement('span');
      names.className = 'search__names';
      el.append(thumb, names);
      return [el, thumb, names];
    }

    // A category's names in the list: a deeper, more saturated shade of its colour.
    function deepen(hex) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
      const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
      const hue = !d ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      return `hsl(${Math.round(hue * 60 + 360) % 360} ${Math.round(Math.min(1, sat * 1.15 + 0.1) * 100)}% ${Math.round(l * 52)}%)`;
    }

    function cutoutImg(src) {
      const img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.draggable = false;
      img.src = src;
      return img;
    }

    // Each category's tile shows one of its items, picked at random (and kept while it's listed).
    const coverOf = new Map();
    function cover(cat, items) {
      const choices = items.filter(imageSrc);
      let p = coverOf.get(cat);
      if (!choices.includes(p)) {
        p = choices[Math.floor(Math.random() * choices.length)];
        coverOf.set(cat, p);
      }
      return p;
    }

    function catTile(c, items, active) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'search__cat' + (active ? ' is-active' : '');
      el.dataset.cat = c.id;
      el.setAttribute('aria-pressed', String(active));
      const color = (IMAGES.colors || {})[c.id] || '#000000';
      el.style.setProperty('--cat', color);
      el.style.setProperty('--cat-deep', deepen(color));
      const box = document.createElement('span');
      box.className = 'search__cat-img';
      const p = cover(c.id, items);
      if (p) box.append(cutoutImg(imageSrc(p)));
      const name = document.createElement('span');
      name.className = 'search__cat-name';
      fillPair(name, ...catName(c.id));
      // numbered in en.js order (so a search doesn't renumber them), on the first line
      const n = CATS.indexOf(c) + 1;
      name.firstElementChild.prepend(`${n}. `);
      el.append(box, name);
      return el;
    }

    function itemCell(p) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'search__item' + (picks.includes(p) ? ' is-picked' : '');
      el.dataset.id = p.id;
      el.style.setProperty('--cat', (IMAGES.colors || {})[p.cat] || '#000000');
      const box = document.createElement('span');
      box.className = 'search__item-img';
      const src = imageSrc(p);
      if (src) box.append(cutoutImg(src));
      const caption = document.createElement('span');
      caption.className = 'search__caption';
      // Chinese over English, as in the mock-up
      const zh = itemNames.zh?.get(p.id), en = itemName(p.id, 'en');
      [[zh, 'zh'], [en, 'en']].forEach(([text, l]) => {
        if (!text) return;
        const span = document.createElement('span');
        span.className = `search__${l}`;
        setText(span, text);
        if (l === 'zh') span.lang = 'zh-CN';
        caption.append(span);
      });
      el.append(box, caption);
      return el;
    }

    // One grid of equal blocks: the category tiles, or while something's typed, just the matching
    // items (category by category, each marked with its category's colour).
    function renderSearch({ keepScroll = false } = {}) {
      if (!searchMode || !drawerOpen()) return; // closed, or fading out: leave it as it was
      const scroll = searchList.scrollTop;
      const typed = searchField.value.trim();
      const q = norm(typed);
      const grid = document.createElement('div');
      grid.className = 'search__grid';
      const shown = CATS.map((c) => ({ c, items: pills.filter((p) => !p.other && p.cat === c.id && (!q || matches(p, q))) }))
        .filter(({ items }) => items.length);
      for (const { c, items } of shown) grid.append(...(q ? items.map(itemCell) : [catTile(c, items, c.id === dropCat)]));
      const head = document.createElement('p');
      head.className = 'search__head';
      const found = shown.reduce((n, { items }) => n + items.length, 0);
      if (q) fill(head, 'pick.results', { n: found, total: pills.filter((p) => !p.other).length });
      else {
        fill(head, 'pick.categories');
        head.classList.add('search__head--stack'); // English on its own line
      }
      const parts = [];
      if (shown.length) parts.push(head); // no matches: no "Results 0" line, just the Add one
      if (shown.length) parts.push(grid);
      if (typed) {
        const foot = document.createElement('div');
        foot.className = 'search__foot';
        const addHead = document.createElement('p');
        addHead.className = 'search__head';
        fill(addHead, 'pick.addHead');
        const [el, thumb, names] = row('search__add');
        thumb.append(noiseThumb());
        const label = document.createElement('span');
        label.className = 'search__en';
        label.textContent = `${t('pick.add', 'zh')} ${t('pick.add', 'en')} “${typed}”`;
        names.append(label);
        const icon = document.createElement('span');
        icon.className = 'search__add-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '+';
        el.append(icon);
        foot.append(addHead, el);
        parts.push(foot);
      }
      searchList.replaceChildren(...parts);
      searchList.hidden = !parts.length;
      if (keepScroll) searchList.scrollTop = scroll;
      else if (q) searchList.scrollTop = searchList.scrollHeight; // closest to the field: the "Add" line
    }

    function choose(p) {
      if (!p || burning) return;
      if (picks.includes(p)) {
        closeSearch(true);
        return;
      }
      castOut(p); // first, so clearing the field doesn't send it away
      closeSearch(true);
      place(p);
    }

    // "Add …": the typed name goes on a new capsule (the job "Other" does on the board),
    // waiting outside the tin like anything else chosen from the list.
    function addTyped() {
      const name = searchField.value.trim();
      if (!name || burning) return;
      const p = spareOther() || createPill({ other: true });
      p.customName = name;
      p.el.classList.add('is-cast');
      relabel(p);
      ensureOther();
      castOut(p);
      closeSearch(true);
      place(p);
      showTip('customTip');
    }

    searchList.addEventListener('click', (e) => {
      const tile = e.target.closest('.search__cat');
      if (tile) {
        if (burning) return;
        dropCategory(tile.dataset.cat === dropCat ? null : tile.dataset.cat); // the active one again: none
        closeSearch(false); // out of the way of the drop
        return;
      }
      const el = e.target.closest('.search__item, .search__add');
      if (!el) return;
      if (el.classList.contains('search__add')) addTyped();
      else choose(pills.find((p) => p.id === el.dataset.id));
    });
    searchField.addEventListener('focus', openSearch);
    searchField.addEventListener('input', () => {
      if (searchField.value.trim()) startSearching();
      openSearch();
      showMatches({ reveal: false });
    });
    searchField.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeSearch(false);
        searchField.blur();
      } else if (e.key === 'Enter') {
        // first match, or "Add" when nothing matches
        e.preventDefault();
        if (!searchField.value.trim()) return;
        if (!drawerOpen()) openSearch();
        searchList.querySelector('.search__item, .search__add')?.click();
      }
    });
    // clicking anywhere else folds the list away (the field keeps what was typed)
    document.addEventListener('pointerdown', (e) => {
      if (searchMode && drawerOpen() && !searchEl.contains(e.target)) closeSearch(false);
    });
    // In search mode the tin itself is a way into the search: clicking it (not an item in it)
    // does what clicking the field does.
    stage.addEventListener('click', (e) => {
      if (!searchMode || justDragged || burning || !running || e.target.closest('.pill, #tools, .pick-tips, #search')) return;
      if (!insideRing(local(e))) return;
      searchField.focus({ preventScroll: true });
      openSearch(); // the field may already have focus, so no focus event to open it
    });
    modeSearch.addEventListener('change', () => { if (modeSearch.checked) setSearchMode(true); });

    // Settings: the switches open under the button; a click anywhere else or Escape shuts them.
    const tools = $('#tools');
    const settingsBtn = $('#settings-btn');
    const settings = $('#settings');
    function placeSettingsPanel() {
      const r = settingsBtn.getBoundingClientRect();
      settings.style.top = `${Math.round(r.bottom + 8)}px`;
      settings.style.right = `${Math.round(window.innerWidth - r.right)}px`;
    }
    function openSettings(open) {
      if (open) placeSettingsPanel();
      settings.hidden = !open;
      settingsBtn.setAttribute('aria-expanded', String(open));
    }
    settingsBtn.addEventListener('click', () => openSettings(settings.hidden));
    addEventListener('resize', () => { if (!settings.hidden) placeSettingsPanel(); });
    document.addEventListener('pointerdown', (e) => {
      if (!settings.hidden && !tools.contains(e.target) && !settings.contains(e.target)) openSettings(false);
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !settings.hidden) openSettings(false);
    });

    // Thumbnail for "Add …": the soft noise field from noise.js, drifting.
    const noiseCanvases = new Set();
    let noiseRaf = 0;
    const NOISE_PX = window.SURVEY_NOISE.PX;
    const drawNoise = (canvas, time) => window.SURVEY_NOISE.draw(canvas, time);
    function tickNoise(time) {
      for (const c of noiseCanvases) {
        if (c.isConnected) drawNoise(c, time);
        else noiseCanvases.delete(c);
      }
      noiseRaf = noiseCanvases.size && !calm.matches ? requestAnimationFrame(tickNoise) : 0;
    }
    function noiseThumb() {
      const c = document.createElement('canvas');
      c.width = c.height = NOISE_PX;
      c.className = 'search__noise';
      drawNoise(c, performance.now());
      noiseCanvases.add(c);
      if (!noiseRaf && !calm.matches) noiseRaf = requestAnimationFrame(tickNoise);
      return c;
    }

    new ResizeObserver(() => { if (running) layout(); }).observe(stage);

    return {
      start() {
        if (running) return;
        running = true;
        layout();
        if (!built) {
          CONTENT.en.items.forEach((item) => createPill({ id: item.id }));
          createPill({ other: true });
          built = true;
          stale = false;
          refresh();
          setSearchMode(true); // search is the default way in
        }
        if (stale) {
          pills.forEach(fitBody);
          stale = false;
        }
        raf = requestAnimationFrame(frame);
      },
      stop() {
        running = false;
        cancelAnimationFrame(raf);
        hidePreview();
        lowerHeadline();
      },
      reset() {
        this.stop();
        details.clear();
        setSearchMode(false);
        searchStarted = false;
        cast = [];
        setCatMode(false);
        showImages = true;
        textToggle.checked = false;
        pills.forEach((p) => p.el.remove());
        Composite.clear(world, false);
        pills = [];
        picks = [];
        statics = [];
        built = false;
        tipsShown.clear();
        tips.replaceChildren();
        refresh();
      },
      // Loose pills sweep in from beyond the screen edges to where they'd settled.
      flyIn() {
        const far = Math.hypot(W, H) * 0.65;
        for (const p of pills) {
          if (p.filtered || p.mode !== 'out') continue;
          const { x, y } = p.body.position;
          const a = Math.atan2(y - cy, x - cx);
          p.goal = 'out';
          p.target = { x, y };
          p.wait = Math.floor(Math.random() * 36); // up to ~0.6s apart
          Body.setPosition(p.body, { x: cx + Math.cos(a) * far, y: cy + Math.sin(a) * far });
          setMode(p, 'transit');
        }
      },
      relabelAll() {
        pills.forEach(relabel);
        refresh();
        drawWedges();
        renderChips();
        renderSearch();
      },
      // Picks saved before a reload, put straight back in the tin with their answers (no tips,
      // no glide). The ones that had burnt are burnt again, without the flames.
      restorePicks(saved) {
        for (const s of saved) {
          if (picks.length >= MAX_PICKS) break;
          let p;
          if (s.other) {
            p = spareOther() || createPill({ other: true });
            p.customName = s.customName || '';
            p.el.classList.toggle('is-cast', !!p.customName); // a typed-in item's look, for its snapshot
            relabel(p);
          } else {
            p = pills.find((q) => q.id === s.id && !q.other);
          }
          if (!p || picks.includes(p)) continue;
          if (p.filtered) {
            p.el.classList.remove('is-filtered-out');
            fitBody(p);
            p.filtered = false;
            Composite.add(world, p.body);
          }
          p.variation = s.variation || '';
          p.reason = s.reason || '';
          tipsShown.add(p.other ? 'customTip' : 'tip');
          pick(p);
          Body.setPosition(p.body, p.target);
          Body.setVelocity(p.body, { x: 0, y: 0 });
          setMode(p, 'in');
          if (s.ashed) {
            p.ashed = true;
            p.el.classList.add('is-leaving');
          }
        }
        if (picks.length) searchStarted = true;
        refresh();
      },
      unpick,
      relabel,
      refresh,
      imageSrc,
      colorFor,
      burnOne,
      review,
      tin: () => ({ cx, cy, R, W, H }),
      picks: () => picks,
    };
  })();

  /* ---------- detail cards: one per picked item, made as it's picked. On the cards screen
     (#/details) the tin slides aside and they stack beside it, one card at a time: Continue
     moves to the next (both answers optional; an unnamed "Other" needs its name), Back to the one
     before. Each pick burns away in the tin once its card is filled in, or on Continue. ---------- */

  const details = (() => {
    const column = $('#picks');
    const root = $('#details');
    const stage = $('#stage');
    const pickScreen = $('[data-screen="pick"]');
    const stack = $('#details-stack');
    const template = $('#card-template');
    const finePointer = matchMedia('(pointer: fine)');
    const cards = new Map(); // pill -> card element
    let order = []; // pills in the order they were picked
    let active = 0;

    // Inputs write straight to the pill's data, so nothing needs saving.
    function build(p) {
      const card = template.content.firstElementChild.cloneNode(true);
      applyText(card);
      // a named "Other" still shows as Other here; its name is in the field below
      renderNames(card.querySelector('.card__item'), p.other ? { other: true, customName: '' } : p, 'card__item');
      card.querySelector('.card__other').hidden = !p.other;
      card.querySelector('[name="other"]').value = p.customName;
      const variation = card.querySelector('[name="variation"]');
      variation.closest('.field').hidden = p.other; // a custom item is already exactly what they named
      variation.value = p.variation;
      // each item's own example, e.g. 例如 e.g.：北京烤鸭 Peking duck (the generic one otherwise)
      const example = (l) => (CONTENT[l]?.items || []).find((it) => it.id === p.id)?.example;
      if (!p.other && example('en')) {
        const eg = (l) => lookup(CONTENT[l] || {}, 'details.eg') || lookup(CONTENT.en, 'details.eg');
        variation.placeholder = `${eg('zh')} ${eg('en')}：${[example('zh'), example('en')].filter(Boolean).join(' ')}`;
      }
      card.querySelector('[name="reason"]').value = p.reason;
      card.addEventListener('input', (e) => {
        if (e.target.matches('.card__input')) fit(e.target);
        const { name, value } = e.target;
        if (name === 'variation' || name === 'reason') p[name] = value;
        if (name === 'other') {
          p.customName = value.trim();
          picker.relabel(p);
        }
        syncNext();
      });
      const src = picker.imageSrc(p);
      if (src) {
        const thumb = card.querySelector('.card__thumb');
        thumb.hidden = false;
        thumb.style.background = picker.colorFor(p);
        thumb.querySelector('img').src = src;
      }
      // Enter moves on to the next answer (or leaves the last) instead of starting a new line;
      // not while an input method is still composing, where Enter confirms the characters
      card.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.shiftKey || e.isComposing || !e.target.matches('.card__input')) return;
        e.preventDefault();
        const inputs = [...card.querySelectorAll('.card__input')].filter((el) => el.offsetParent);
        const next = inputs[inputs.indexOf(e.target) + 1];
        if (next) next.focus();
        else e.target.blur();
      });
      // the last answer given (Enter, or clicking away): this one's done
      card.querySelector('[name="reason"]').addEventListener('change', () => { if (filled(p)) picker.burnOne(p); });
      return card;
    }

    const filled = (p) => !!(p.variation.trim() || p.reason.trim() || (p.other && p.customName));
    // required on a card: only what it is, for an unnamed "Other" (the why is optional); not while debugging
    const ready = (p) => debug || !p.other || !!p.customName;

    // An answer's height fits its text, or its placeholder while it's empty.
    function fit(el) {
      el.style.height = 'auto';
      const empty = !el.value;
      if (empty) el.value = el.placeholder;
      el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`; // plus the underline
      if (empty) el.value = '';
    }

    // Front card on top; the rest sit behind it, each nudged slightly down-right.
    function render() {
      const n = order.length;
      order.forEach((p, i) => {
        const card = cards.get(p);
        card.querySelectorAll('.card__input').forEach(fit);
        const depth = (i - active + n) % n;
        card.style.setProperty('--depth', Math.min(depth, 3));
        card.style.zIndex = n - depth;
        card.classList.toggle('is-front', depth === 0);
        card.classList.toggle('is-buried', depth > 3);
        card.inert = depth !== 0;
        card.querySelector('.card__count').textContent = `${i + 1} / ${n}`;
      });
      syncNext();
    }

    const nextBtn = $('#details-next');
    function syncNext() {
      const p = order[active];
      nextBtn.disabled = leaving || !p || !ready(p);
    }

    function focusFront() {
      if (!finePointer.matches) return; // don't pop the keyboard up on phones
      const p = order[active];
      cards.get(p)?.querySelector(p.other ? '[name="other"]' : '[name="variation"]').focus({ preventScroll: true });
    }

    function add(p) {
      if (cards.has(p)) return;
      const card = build(p);
      cards.set(p, card);
      stack.append(card);
      order.push(p);
    }

    function remove(p) {
      const i = order.indexOf(p);
      if (i < 0) return;
      cards.get(p).remove();
      cards.delete(p);
      order.splice(i, 1);
      if (i < active) active--;
      else if (active >= order.length) active = Math.max(0, order.length - 1);
    }

    // Continue: the next card (this one's pick burns now, if it hasn't yet, answered or not); after the last, on.
    function next() {
      const p = order[active];
      if (leaving || !p || !ready(p)) return;
      picker.burnOne(p);
      if (active < order.length - 1) {
        active++;
        render();
        focusFront();
      } else {
        finish();
      }
    }
    // Back: the card before; from the first, back to picking.
    function back() {
      if (leaving) return;
      if (active > 0) {
        active--;
        render();
        focusFront();
      } else {
        go('pick');
      }
    }

    // Tin and cards side by side, centred together; on narrow screens the cards go under the tin.
    const SIDE_GAP = 56;
    function place() {
      if (column.hidden) return;
      const { cx, cy, R, W } = picker.tin();
      const colW = column.offsetWidth, colH = column.offsetHeight;
      const total = 2 * R + SIDE_GAP + colW;
      const beside = total <= W - 32;
      column.classList.toggle('is-below', !beside);
      if (beside) {
        const left = (W - total) / 2;
        pickScreen.style.setProperty('--tin-shift', `${left + R - cx}px`);
        column.style.left = `${left + 2 * R + SIDE_GAP}px`;
        column.style.top = `${Math.max(72, cy - colH / 2)}px`;
      } else {
        pickScreen.style.setProperty('--tin-shift', '0px');
        column.style.left = '';
        column.style.top = `${cy + R + 24}px`;
      }
    }

    // The cards screen opens on the first pick (on the last, coming back from the questions).
    let resumeAt = null; // the card that was up before a reload
    function show(atEnd = false) {
      column.hidden = false;
      active = resumeAt ?? (atEnd ? Math.max(0, order.length - 1) : 0);
      active = Math.min(active, Math.max(0, order.length - 1));
      resumeAt = null;
      render();
      place();
      if (column.classList.contains('is-below')) { // tall phone layout: bring the tin into view, cards under it
        const { cy, R } = picker.tin();
        window.scrollTo(0, pickScreen.getBoundingClientRect().top + window.scrollY + cy - R - 72);
      }
      focusFront();
    }

    function hide() {
      column.hidden = true;
      pickScreen.style.removeProperty('--tin-shift');
    }

    // Continue: the stack shrinks down into the tin, then tin and cards slide off together.
    let leaving = false;
    async function finish() {
      if (leaving) return;
      leaving = true;
      syncNext();
      const moved = [];
      if (!calm.matches) {
        const t = $('#inventory').getBoundingClientRect(), s = root.getBoundingClientRect();
        const k = (t.width * 0.3) / s.width;
        const dx = t.left + t.width / 2 - (s.left + s.width / 2), dy = t.top + t.height / 2 - (s.top + s.height / 2);
        const rest = [...column.children].filter((el) => el !== root);
        rest.forEach((el) => moved.push(el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' })));
        const shrink = root.animate([
          { transform: 'none' },
          { transform: `translate(${dx}px, ${dy}px) scale(${k})` },
        ], { duration: 750, easing: 'cubic-bezier(.55, 0, .25, 1)', fill: 'forwards' });
        moved.push(shrink);
        await shrink.finished;
        const off = `${-(t.right + 60)}px 0`; // far enough that the tin's right edge clears the screen
        const slides = [stage, root].map((el) => el.animate([{ translate: '0 0' }, { translate: off }], {
          duration: 700, easing: 'cubic-bezier(.6, 0, .35, 1)', fill: 'forwards',
        }));
        moved.push(...slides);
        await Promise.all(slides.map((a) => a.finished));
      }
      go('about');
      moved.forEach((a) => a.cancel()); // ready for Back, behind the next screen
      leaving = false;
      syncNext();
    }

    addEventListener('resize', () => requestAnimationFrame(() => {
      if (!column.hidden) render(); // answers refit to the new width
      place();
    }));

    function clear() {
      cards.forEach((card) => card.remove());
      cards.clear();
      order = [];
      active = 0;
    }

    $('#details-back').addEventListener('click', back);
    nextBtn.addEventListener('click', next);

    return {
      add, remove, clear, show, hide, syncNext,
      at: () => active,
      resume(i) { resumeAt = Number.isInteger(i) ? i : null; },
    };
  })();

  /* ---------- 3. about you (one question at a time) ---------- */

  const form = $('#demo-form');
  const steps = [...form.querySelectorAll('.demo__step')];
  const LAST_STEP = steps.length; // sharing choices and any last thoughts; Submit is here
  const shareCustom = $('#share-custom');
  const hasCustom = () => picker.picks().some((p) => p.other);
  const nextBtn = $('#demo-next');
  const countryField = $('#country-field');
  const country = form.elements.country;
  const abroad = form.querySelector('input[name="residence"][value="overseas"]');
  const formMsg = $('#demo-msg');
  let step = 1;
  let saving = false;

  const anyChecked = (name) => [...form.querySelectorAll(`input[name="${name}"]`)].some((input) => input.checked);

  // Is question n answered? The optional step always is.
  function answered(n) {
    if (debug) return true; // debugging: blanks are let through
    switch (n) {
      case 1: return !!form.elements.age.value // the four required questions, all on page 1 (the afterlife one is optional)
        && anyChecked('heritage')
        && anyChecked('residence') && (!abroad.checked || !!country.value.trim())
        && anyChecked('burning');
      default: return true;
    }
  }

  // No skipping ahead past a blank question.
  function clampStep(n) {
    let open = 1;
    while (open < LAST_STEP && answered(open)) open++;
    return Math.max(1, Math.min(n, open));
  }

  function showStep(n) {
    if (n !== step) formMsg.textContent = '';
    step = n;
    steps.forEach((el, i) => { el.hidden = i + 1 !== step; });
    shareCustom.hidden = !hasCustom(); // only asked about when there are some
    syncForm();
  }

  $('#demo-back').addEventListener('click', () => {
    if (step > 1) go('about', step - 1);
    else go('details');
  });

  function syncForm() {
    // living abroad: which country, asked right under it
    countryField.hidden = !abroad.checked;
    country.disabled = !abroad.checked;
    country.required = abroad.checked;
    const last = step === LAST_STEP;
    fill(nextBtn, saving ? 'ui.sending' : last ? 'ui.submit' : 'about.next');
    nextBtn.disabled = saving || !answered(step) || (last && !debug && !form.checkValidity());
  }
  form.addEventListener('input', syncForm);
  form.addEventListener('change', syncForm);

  // Saved to Supabase (see db.js). On failure the answers stay put so Submit can be pressed again.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (saving || !answered(step)) return;
    if (step < LAST_STEP) { go('about', step + 1); return; } // Continue (or Enter) on a question
    if (!debug && !form.checkValidity()) return;
    const data = new FormData(form);
    const text = (name) => (data.get(name) || '').trim() || null;
    // The picks are public: kept private, the reasons move out of them into their own column.
    const showReasons = data.get('showReasons') === 'on';
    const all = picker.picks().map((p) => ({
      id: p.other ? 'other' : p.id,
      en: p.other ? undefined : itemName(p.id, 'en'),
      zh: p.other ? undefined : itemName(p.id, 'zh'),
      custom: p.other ? p.customName : undefined,
      variation: p.variation.trim(),
      reason: p.reason.trim(),
    }));
    const row = {
      id: window.SURVEY_DB.newId(),
      lang: qLang, // the language the questions were answered in (their switch)
      picks: showReasons ? all : all.map(({ reason, ...pick }) => pick),
      reasons: showReasons ? null : all.map((pick) => pick.reason), // private, in pick order
      show_reasons: showReasons,
      age: data.get('age'),
      heritage: data.getAll('heritage'), // one choice, kept as a list like older responses
      residence: data.get('residence'),
      country: abroad.checked ? text('country') : null,
      burning: data.get('burning'),
      afterlife: text('afterlife'), // private, like the rest of page 1
      nickname: text('nickname'), // shown in the gallery
      publish: data.get('publish') === 'on',
      share_custom: hasCustom() ? data.get('shareCustom') === 'on' : null,
      thoughts: text('thoughts'),
    };
    saving = true;
    syncForm();
    formMsg.textContent = '';
    try {
      if (debug) console.info('[survey] debugging mode: not saved', row); // a test run: nothing is sent
      else await window.SURVEY_DB.save(row);
      submitted = true;
      go('thanks');
    } catch (err) {
      console.error('[survey] could not save response', err);
      fill(formMsg, 'about.saveError');
      formMsg.dataset.msg = 'about.saveError'; // said again on a language switch, while it's up
      formMsg.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    saving = false;
    syncForm();
  });

  /* ---------- 4. thanks ---------- */

  $('#see-results').addEventListener('click', () => {
    window.location.href = 'results.html';
  });

  // Clear everything and go back to the landing.
  function startOver() {
    picker.reset();
    form.reset();
    formMsg.textContent = '';
    syncForm();
    submitted = false;
    forgetProgress();
    go('intro');
  }

  $('#restart').addEventListener('click', startOver);

  /* ---------- the logo: back to the landing ---------- */

  // Mid-survey (something picked, nothing sent yet) it asks first, since nothing is saved
  // until Submit. On the landing it scrolls back to the top; after sending it just starts over.
  const leaveDialog = $('#leave-dialog');

  document.querySelectorAll('.brand').forEach((a) => a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return; // new tab/window: let it be
    e.preventDefault();
    if (screenNow === 'intro') window.scrollTo({ top: 0, behavior: calm.matches ? 'auto' : 'smooth' });
    else if (submitted || !picker.picks().length) startOver();
    else leaveDialog.showModal();
  }));

  leaveDialog.addEventListener('close', () => {
    if (leaveDialog.returnValue === 'leave') startOver();
    leaveDialog.returnValue = '';
  });
  // a click on the dimmed backdrop (outside the box) = Keep going
  leaveDialog.addEventListener('click', (e) => {
    if (e.target === leaveDialog) leaveDialog.close('stay');
  });

  /* ---------- progress: kept through a reload ---------- */

  // The picks (with their card answers), the card that was up, the survey answers and whether
  // they were sent, saved in this tab whenever the page is put away or reloaded. Closing the
  // tab, or starting over, forgets them; nothing here leaves the browser.
  const PROGRESS_KEY = 'afterlife-survey-progress';

  function forgetProgress() {
    try { sessionStorage.removeItem(PROGRESS_KEY); } catch (_) { /* storage unavailable */ }
  }

  function saveProgress() {
    const picks = picker.picks();
    if (!picks.length && !submitted) return forgetProgress();
    const fields = {};
    for (const el of form.elements) {
      if (!el.name) continue;
      if (el.type === 'checkbox' || el.type === 'radio') {
        fields[el.name] ||= [];
        if (el.checked) fields[el.name].push(el.value);
      } else if (el.type !== 'submit' && el.type !== 'button') {
        fields[el.name] = el.value;
      }
    }
    const progress = {
      picks: picks.map((p) => ({
        id: p.id, other: p.other, customName: p.customName, variation: p.variation, reason: p.reason, ashed: !!p.ashed,
      })),
      card: details.at(),
      fields,
      submitted,
    };
    try { sessionStorage.setItem(PROGRESS_KEY, JSON.stringify(progress)); } catch (_) { /* storage unavailable */ }
  }
  addEventListener('pagehide', saveProgress);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // each screen sets its own scroll
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveProgress(); });

  function loadProgress() {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(PROGRESS_KEY)); } catch (_) { /* storage unavailable or garbled */ }
    // back on the landing, or "Take the survey" from the results page: a fresh start
    if (!saved || !location.hash || /^#\/?start\b/.test(location.hash)) return forgetProgress();
    submitted = !!saved.submitted;
    for (const el of form.elements) {
      const value = saved.fields?.[el.name];
      if (value === undefined) continue; // a question added since: its default
      if (el.type === 'checkbox' || el.type === 'radio') el.checked = value.includes(el.value);
      else if (el.type !== 'submit' && el.type !== 'button') el.value = value;
    }
    if (saved.picks?.length) {
      // the pills are measured as they're made, so the pick screen shows for a moment (unpainted)
      const pickScreen = $('[data-screen="pick"]');
      screens.forEach((s) => { s.hidden = s !== pickScreen; });
      picker.start();
      picker.restorePicks(saved.picks);
      picker.stop();
      if (location.hash.startsWith('#/details')) details.resume(saved.card);
    }
  }

  /* ---------- text ---------- */

  // Fill data-t / data-t-placeholder / data-t-aria under root (cloned cards call this too).
  // <option>s can only hold plain text, so they get "English / 中文".
  function applyText(root) {
    root.querySelectorAll('[data-t]').forEach((el) => {
      if (el.tagName === 'OPTION') el.textContent = oneLang(el) ? t(el.dataset.t, qLang) : joined(el.dataset.t);
      else fill(el, el.dataset.t);
    });
    root.querySelectorAll('[data-t-placeholder]').forEach((el) => {
      const path = el.dataset.tPlaceholder;
      // The search field reads as one line: Chinese, then English, with no slash.
      el.placeholder = path === 'pick.searchPlaceholder'
        ? `${t(path, 'zh')} ${t(path, 'en')}`
        : joined(path);
    });
    root.querySelectorAll('[data-t-aria]').forEach((el) => { el.setAttribute('aria-label', joined(el.dataset.tAria)); });
  }

  // The questions' language switch, 中文 / EN in their top bar: the one in use is marked.
  const questions = $('[data-screen="about"] .demo');
  const langBtns = [...document.querySelectorAll('#lang-switch [data-lang]')];
  function applyQLang() {
    questions.lang = qLang === 'zh' ? 'zh-CN' : 'en';
    langBtns.forEach((btn) => btn.setAttribute('aria-pressed', String(btn.dataset.lang === qLang)));
  }
  langBtns.forEach((btn) => btn.addEventListener('click', () => {
    if (btn.dataset.lang === qLang) return;
    qLang = btn.dataset.lang;
    try { localStorage.setItem(QLANG_KEY, qLang); } catch (_) { /* storage unavailable */ }
    applyQLang();
    applyText(questions); // answers stay as they are; only the words around them change
    if (formMsg.textContent && formMsg.dataset.msg) fill(formMsg, formMsg.dataset.msg);
  }));
  applyQLang();

  document.title = joined('meta.title');
  applyText(document);
  intro.render();
  picker.relabelAll();
  loadProgress();
  syncForm();
  route({ initial: true });
})();
