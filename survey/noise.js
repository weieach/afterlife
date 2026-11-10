// The soft noise field behind typed-in ("Other") items: drawn small and stretched, so it comes
// out as a gradient drifting through all the category colours; the field is warped by more
// noise, so it swirls rather than shimmers. Shared by the survey (app.js, drifting) and the
// results page (results.js, flowing at half the pace, a different variant for every write-in on each load).
window.SURVEY_NOISE = (() => {
  'use strict';

  const PX = 40; // canvas size; CSS stretches it
  const COLORS = Object.values(window.SURVEY_IMAGES?.colors || {});
  const BASE = (COLORS.length ? COLORS : ['#4C9D62', '#DB5C93', '#3F8BD6'])
    .map((hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)));

  const hash = (x, y, z) => {
    const v = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
    return v - Math.floor(v);
  };
  const ease = (v) => v * v * (3 - 2 * v);
  const mix = (a, b, v) => a + (b - a) * v;
  function valueNoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const u = ease(x - xi), v = ease(y - yi), w = ease(z - zi);
    const at = (i, j, k) => hash(xi + i, yi + j, zi + k);
    return mix(
      mix(mix(at(0, 0, 0), at(1, 0, 0), u), mix(at(0, 1, 0), at(1, 1, 0), u), v),
      mix(mix(at(0, 0, 1), at(1, 0, 1), u), mix(at(0, 1, 1), at(1, 1, 1), u), v),
      w,
    );
  }

  const PLAIN = { x: 0, y: 0, z: 0, angle: 0, cols: BASE }; // the survey's own field

  // A different patch of the field, turned, with the colours in another order. Each call
  // gives a new one, so every write-in looks different and a reload deals them out afresh.
  function variant() {
    const shift = Math.floor(Math.random() * BASE.length);
    const cols = [...BASE.slice(shift), ...BASE.slice(0, shift)];
    if (Math.random() < 0.5) cols.reverse();
    return {
      x: Math.random() * 1000,
      y: Math.random() * 1000,
      z: Math.random() * 1000,
      angle: Math.random() * Math.PI * 2,
      cols,
    };
  }

  function draw(canvas, time = 0, look = PLAIN) {
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(PX, PX);
    const cols = look.cols, last = cols.length - 1;
    const z = time * 0.00015 + look.z;
    const cos = Math.cos(look.angle), sin = Math.sin(look.angle);
    for (let y = 0; y < PX; y++) {
      for (let x = 0; x < PX; x++) {
        // 0..1 across the thumbnail, turned about its centre, then moved to this look's patch
        const cu = x / PX - 0.5, cv = y / PX - 0.5;
        const u = cu * cos - cv * sin + 0.5 + look.x, v = cu * sin + cv * cos + 0.5 + look.y;
        const wu = u + 0.6 * valueNoise(u * 0.7 + 5, v * 0.7, z * 0.7);
        const wv = v + 0.6 * valueNoise(u * 0.7, v * 0.7 + 11, z * 0.7);
        const n = 0.8 * valueNoise(wu * 0.9, wv * 0.9, z) + 0.2 * valueNoise(wu * 1.8 + 9, wv * 1.8, z * 1.3);
        const pos = Math.min(Math.max((n - 0.22) / 0.56, 0), 1) * last;
        const i = Math.min(Math.floor(pos), last - 1), f = pos - i;
        const a = cols[Math.max(i, 0)], b = cols[Math.min(i + 1, last)];
        const o = (y * PX + x) * 4;
        img.data[o] = mix(a[0], b[0], f);
        img.data[o + 1] = mix(a[1], b[1], f);
        img.data[o + 2] = mix(a[2], b[2], f);
        img.data[o + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }

  return { PX, draw, variant };
})();
