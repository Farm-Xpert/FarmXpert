'use client';

// ============================================================
// FILE: src/components/auth/AuthMeshArt.jsx
//
// Procedural low-poly mesh for the auth card's diagonal art panel.
// Same algorithm as the reference (seeded 10x10 jittered grid split
// into triangles, hover lift, pointer parallax), recoloured to the
// Aaurawell palette: deep forest to leaf green, with a few gold
// facets catching the light. The seed is fixed, so the art is the
// same on every visit and between server and client.
// ============================================================

import { useEffect, useRef } from 'react';

function mulberry32(seed) {
  return function next() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

export default function AuthMeshArt() {
  const host = useRef(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    el.innerHTML = '';
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const rand = mulberry32(2026);

    // Deep emerald to rich forest, no flat lime: a narrow, jewel-toned range.
    // `side` alternates the two triangles of each cell a little lighter and
    // darker, so neighbours always read as two facets, never as one.
    function facetColor(cx, cy, w, h, side) {
      const t = clamp((cx / w) * 0.55 + (cy / h) * 0.75, 0, 1);
      let hue = lerp(152, 132, t) + (rand() - 0.5) * 4;
      const sat = lerp(56, 46, t);
      let light = lerp(9, 27, t) + (rand() - 0.5) * 6 + (side ? 3.2 : -3.2);
      const roll = rand();
      if (roll > 0.985) {
        // a rare antique-gold facet catching the light
        return [lerp(38, 43, rand()), lerp(46, 54, rand()), lerp(34, 42, rand())];
      }
      if (roll > 0.955) light += 6;                      // a soft highlight, not a bright patch
      else if (roll < 0.05) light -= 5;
      hue = clamp(hue, 128, 156);
      return [hue, sat, clamp(light, 6, 34)];
    }
    const hsl = (h, s2, l) => `hsl(${h.toFixed(1)} ${s2.toFixed(0)}% ${clamp(l, 3, 70).toFixed(0)}%)`;

    const W = 1000;
    const H = 1000;
    const cols = 10;
    const rows = 10;
    const cellW = W / cols;
    const cellH = H / rows;
    const jitter = Math.min(cellW, cellH) * 0.3;

    const pts = [];
    for (let r = 0; r <= rows; r += 1) {
      pts[r] = [];
      for (let c = 0; c <= cols; c += 1) {
        const edge = r === 0 || r === rows || c === 0 || c === cols;
        pts[r][c] = [c * cellW + (edge ? 0 : (rand() - 0.5) * jitter), r * cellH + (edge ? 0 : (rand() - 0.5) * jitter)];
      }
    }

    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    const frag = document.createDocumentFragment();
    const defs = document.createElementNS(ns, 'defs');
    svg.appendChild(defs);

    for (let ri = 0; ri < rows; ri += 1) {
      for (let ci = 0; ci < cols; ci += 1) {
        const a = pts[ri][ci];
        const b = pts[ri][ci + 1];
        const d = pts[ri + 1][ci];
        const e = pts[ri + 1][ci + 1];
        const flip = rand() > 0.5;
        (flip ? [[a, b, d], [b, e, d]] : [[a, b, e], [a, e, d]]).forEach((tri, side) => {
          const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3;
          const cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3;
          const poly = document.createElementNS(ns, 'polygon');
          poly.setAttribute('points', tri.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' '));
          // each facet is lit from the top-left and shaded to the bottom-right,
          // so the mesh reads like cut glass rather than flat paper
          const [fh, fs, fl] = facetColor(cx, cy, W, H, side);
          const gid = `fxf${ri}-${ci}-${frag.childNodes.length}`;
          const grad = document.createElementNS(ns, 'linearGradient');
          grad.setAttribute('id', gid);
          const ang = rand() * 0.3;
          grad.setAttribute('x1', String(0.1 + ang)); grad.setAttribute('y1', '0');
          grad.setAttribute('x2', String(0.9 - ang)); grad.setAttribute('y2', '1');
          [[0, hsl(fh - 2, fs + 4, fl + 9)], [0.55, hsl(fh, fs, fl)], [1, hsl(fh + 3, fs - 4, fl - 7)]].forEach(([o, c]) => {
            const st = document.createElementNS(ns, 'stop');
            st.setAttribute('offset', String(o)); st.setAttribute('stop-color', c);
            grad.appendChild(st);
          });
          defs.appendChild(grad);
          poly.setAttribute('fill', `url(#${gid})`);
          const xs = tri.map((p) => p[0]);
          const ys = tri.map((p) => p[1]);
          poly._box = [Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
          poly.classList.add('facet-poly-auth');
          if (!reduceMotion) poly.style.animationDelay = `${(rand() * 0.5).toFixed(2)}s`;
          // Drop the entrance animation once it has played, so it can never
          // restart or pin the facet's transform.
          poly.addEventListener('animationend', () => { poly.style.animation = 'none'; }, { once: true });
          // Hover lifts a copy of the facet above the mesh (see lift below);
          // each copy rises and settles on its own, so a sweep leaves ripples.
          poly.addEventListener('mouseenter', () => lift(poly, true));
          poly.addEventListener('mouseleave', () => lift(poly, false));
          frag.appendChild(poly);
        });
      }
    }
    svg.appendChild(frag);
    el.appendChild(svg);

    // Lifted facets live in an HTML layer over the mesh: each is a small SVG
    // in its own box, moved with a CSS transform on the graphics card and
    // given a real shadow. Animating inside the big SVG repainted the whole
    // mesh every frame, which is what made the rise and fall stutter.
    const layer = document.createElement('div');
    layer.className = 'art-lift-layer-auth';
    el.appendChild(layer);

    function place(box) {                                // viewBox units -> layer pixels (xMidYMid slice)
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const k = Math.max(cw / W, ch / H);
      const ox = (cw - W * k) / 2;
      const oy = (ch - H * k) / 2;
      return { left: ox + box[0] * k, top: oy + box[1] * k, width: box[2] * k, height: box[3] * k };
    }

    function lift(poly, up) {
      poly._want = up;                                   // the latest wish wins (enter + leave in one frame)
      let copy = poly._lift;
      if (up) {
        if (!copy) {
          const [bx, by, bw, bh] = poly._box;
          const r = place(poly._box);
          copy = document.createElement('div');
          copy.className = 'facet-lift-auth';
          Object.assign(copy.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
          const mini = document.createElementNS(ns, 'svg');
          mini.setAttribute('viewBox', `${bx} ${by} ${bw} ${bh}`);
          mini.setAttribute('preserveAspectRatio', 'none');
          const shape = poly.cloneNode(false);           // same points and gradient as the facet
          shape.removeAttribute('style');
          shape.removeAttribute('class');
          mini.appendChild(shape);
          copy.appendChild(mini);
          copy.addEventListener('transitionend', (ev) => {
            if (ev.propertyName === 'transform' && !copy.classList.contains('is-up')) {
              copy.remove();
              if (poly._lift === copy) poly._lift = null;
            }
          });
          poly._lift = copy;
        }
        layer.appendChild(copy);                         // the newest lift sits on top
        requestAnimationFrame(() => {
          if (poly._want) copy.classList.add('is-up');
          else if (!copy.classList.contains('is-up')) { copy.remove(); if (poly._lift === copy) poly._lift = null; }
        });
      } else if (copy) {
        copy.classList.remove('is-up');                  // settles back, then removes itself
      }
    }

    // Gentle parallax with the pointer.
    const panel = el.closest('.panel-art-auth');
    let raf = 0;
    const move = (ev) => {
      const rect = panel.getBoundingClientRect();
      const nx = (ev.clientX - rect.left) / rect.width - 0.5;
      const ny = (ev.clientY - rect.top) / rect.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const tf = `translate(${(nx * -14).toFixed(1)}px, ${(ny * -10).toFixed(1)}px) scale(1.03)`;
        svg.style.transform = tf;
        layer.style.transform = tf;                      // lifted facets move with the mesh
      });
    };
    const leave = () => {
      svg.style.transform = 'translate(0,0) scale(1)';
      layer.style.transform = svg.style.transform;
    };
    const fine = window.matchMedia('(pointer: fine)').matches;
    if (panel && !reduceMotion && fine) {
      panel.addEventListener('mousemove', move);
      panel.addEventListener('mouseleave', leave);
    }
    return () => {
      cancelAnimationFrame(raf);
      if (panel) {
        panel.removeEventListener('mousemove', move);
        panel.removeEventListener('mouseleave', leave);
      }
    };
  }, []);

  return (
    <>
      <div className="art-mesh-auth" ref={host} />
      <div className="art-shade-auth" />
    </>
  );
}
