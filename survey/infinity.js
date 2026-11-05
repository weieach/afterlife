// Shared by the landing (app.js, over the third paragraph) and the results page (results.js,
// over the title). makeInfinity(className) returns the box to place; size it with font-size.
// A big ∞ made of dots, like Scatterplot's letters, whose dots
// drift apart across the page and gather again on a loop (Scatterplot's own Random axis
// does this to its letters, but the font has no ∞). The ∞ is a lemniscate, with the dots
// spaced evenly along it from the crossing out, so it's symmetrical both ways.
(() => {
  'use strict';
  const calm = matchMedia('(prefers-reduced-motion: reduce)');

  window.makeInfinity = function makeInfinity(className) {
    const box = document.createElement('div');
    box.className = className;
    box.setAttribute('role', 'img');
    box.setAttribute('aria-label', '∞');
    const canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    box.append(canvas);

    const WIDE = 1.38; // the ∞'s width, em (the dots stay DOT whatever this is)
    const TALL = 1.12; // its loops a little rounder than the plain curve
    const GAP = 0.068; // dot spacing, em: a little under a dot's width, so the dots touch and the ∞ reads as one line
    const DOT = 0.045; // dot radius, em
    const SPREAD = 0.34; // how far a dot can wander at full scatter, em
    const JITTER = 1; // px: each dot sits up to this far off the curve, so the ∞ isn't too perfect
    const PERIOD = 7000; // ms, apart and back together
    const HOLD = 3000; // ms it rests as a clean ∞ before scattering again
    const W = 2.4, H = 1.4; // canvas size in em: room to scatter beyond the 1.5 × 0.6em mark

    let dots = null, raf = 0, seen = false, em = 0;

    // Dots for the ∞, in em from its centre, each with its own wander direction.
    function trace() {
      // lemniscate of Bernoulli, half-width a: t = 0 is the right end, t = π/2 the crossing
      const a = WIDE / 2;
      const at = (t) => {
        const q = 1 + Math.sin(t) ** 2;
        return [(a * Math.cos(t)) / q, (TALL * a * Math.sin(t) * Math.cos(t)) / q];
      };
      // its length, measured finely from the crossing all the way round
      const STEPS = 4000, t0 = Math.PI / 2;
      const len = [0];
      let [px, py] = at(t0);
      for (let i = 1; i <= STEPS; i++) {
        const [x, y] = at(t0 + (i / STEPS) * Math.PI * 2);
        len.push(len[i - 1] + Math.hypot(x - px, y - py));
        px = x; py = y;
      }
      const L = len[STEPS];
      // a multiple of 4, so the crossing and both far ends each land on a dot and every
      // quarter matches the others
      const n = Math.max(8, Math.round(L / GAP / 4) * 4);
      const pts = [];
      for (let k = 0, i = 0; k < n; k++) {
        if (k === n / 2) continue; // the curve passes the crossing twice: one dot there
        const want = (k / n) * L;
        while (len[i + 1] < want) i++;
        const f = (want - len[i]) / (len[i + 1] - len[i] || 1);
        pts.push(at(t0 + ((i + f) / STEPS) * Math.PI * 2));
      }
      return pts.map(([x, y]) => {
        const ang = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * SPREAD;
        return {
          x, y,
          dx: Math.cos(ang) * r, dy: Math.sin(ang) * r, // where it heads at full scatter, flat on the page
          phase: Math.random() * Math.PI * 2, // a little wobble of its own on the way
          jx: (Math.random() * 2 - 1) * JITTER, jy: (Math.random() * 2 - 1) * JITTER, // px
        };
      });
    }

    function size() {
      em = parseFloat(getComputedStyle(box).fontSize);
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(W * em * dpr);
      canvas.height = Math.round(H * em * dpr);
      canvas.style.width = `${W * em}px`;
      canvas.style.height = `${H * em}px`;
    }

    function draw(now) {
      if (!dots) dots = trace();
      if (!em || canvas.width !== Math.round(W * parseFloat(getComputedStyle(box).fontSize) * (window.devicePixelRatio || 1))) size();
      const g = canvas.getContext('2d');
      const k = canvas.width / W; // canvas px per em
      // a clean ∞ for HOLD, then 0 -> 1 -> 0 over PERIOD, easing in and out at both ends
      const t = Math.max(0, (now % (HOLD + PERIOD)) - HOLD);
      const amt = calm.matches ? 0.35 : (1 - Math.cos((t / PERIOD) * Math.PI * 2)) / 2;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, canvas.width, canvas.height);
      g.setTransform(k, 0, 0, k, canvas.width / 2, canvas.height / 2);
      g.fillStyle = getComputedStyle(box).color;
      g.beginPath();
      for (const p of dots) {
        const w = Math.sin(now / 900 + p.phase) * 0.12 * amt; // drift, so it isn't a plain zoom
        const x = p.x + p.dx * (amt + w) + p.jx / em;
        const y = p.y + p.dy * (amt - w) + p.jy / em;
        g.moveTo(x + DOT, y);
        g.arc(x, y, DOT, 0, Math.PI * 2); // every dot the same size, scattered or not
      }
      g.fill();
    }

    function loop(now) {
      draw(now);
      raf = seen && !calm.matches ? requestAnimationFrame(loop) : 0;
    }

    // only animate while it's on screen
    new IntersectionObserver(([e]) => {
      seen = e.isIntersecting;
      if (seen && !raf) loop(performance.now()); // first frame straight away
    }).observe(box);
    addEventListener('resize', () => { if (dots) { size(); draw(performance.now()); } });

    return box;
  };
})();
