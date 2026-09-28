/* Full-page splash motion: aurora ribbons, prism light rays, perspective grid + starfield.
   Draws on #fx (covers the whole viewport) and scales the CSS prism to fit any window. */
(function () {
  const sp = document.getElementById('splash'), cv = document.getElementById('fx');
  if (!sp || !cv) return;
  const g = cv.getContext('2d'), reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const RAINBOW = ['239,68,68', '245,158,11', '234,179,8', '34,197,94', '59,130,246', '139,92,246'];
  const stars = []; let W = 0, H = 0, mx = 0, my = 0, tx = 0, ty = 0;

  function size() {
    const d = Math.min(devicePixelRatio || 1, 2); W = sp.clientWidth; H = sp.clientHeight;
    cv.width = W * d; cv.height = H * d; g.setTransform(d, 0, 0, d, 0, 0);
    // scale the 240px CSS prism so it always fits the window (big on desktop, smaller on short/mobile screens)
    const k = Math.max(.5, Math.min((H - 300) / 240, W / 330, 2.6)); sp.style.setProperty('--k', k.toFixed(3));
    stars.length = 0; const n = Math.min(320, Math.round(W * H / 7000));
    for (let i = 0; i < n; i++) stars.push({ x: Math.random(), y: Math.random(), z: .25 + Math.random() * .75, p: Math.random() * 6.28 });
  }

  function aurora(t) {
    g.globalCompositeOperation = 'lighter';
    const L = [['59,130,246', .16, .30], ['168,85,247', .30, .26], ['236,72,153', .50, .22], ['34,197,94', .70, .18]];
    L.forEach((l, i) => {
      const base = H * l[1], amp = H * .07, thick = H * l[2], f1 = .0042 + i * .0011, f2 = .0091 - i * .0009;
      const y = x => base + Math.sin(x * f1 + t * (.5 + i * .13) + i) * amp + Math.sin(x * f2 - t * .8) * amp * .55;
      g.beginPath(); for (let x = 0; x <= W + 12; x += 12) x ? g.lineTo(x, y(x)) : g.moveTo(x, y(x));
      for (let x = W + 12; x >= 0; x -= 12) g.lineTo(x, y(x) + thick);
      g.closePath();
      const gr = g.createLinearGradient(0, base - amp, 0, base + thick + amp);
      gr.addColorStop(0, `rgba(${l[0]},0)`); gr.addColorStop(.45, `rgba(${l[0]},.22)`); gr.addColorStop(1, `rgba(${l[0]},0)`);
      g.fillStyle = gr; g.fill();
    });
  }

  function rays(t, cx, cy) {
    g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
    // white ray entering from the far left edge
    let gr = g.createLinearGradient(0, 0, cx, cy); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, 'rgba(255,255,255,.75)');
    g.strokeStyle = gr; g.lineWidth = 3; g.shadowColor = '#fff'; g.shadowBlur = 14;
    g.beginPath(); g.moveTo(0, cy + H * .1); g.lineTo(cx, cy); g.stroke();
    // rainbow spectrum fanning out to the far right edge
    const pulse = .75 + .25 * Math.sin(t * 2.2);
    RAINBOW.forEach((c, i) => {
      const a = -.16 + i * .062 + Math.sin(t * .8) * .025, ex = W + 40, ey = cy + Math.tan(a) * (ex - cx) * 1.0;
      const s = g.createLinearGradient(cx, cy, ex, ey); s.addColorStop(0, `rgba(${c},0)`); s.addColorStop(.25, `rgba(${c},${.55 * pulse})`); s.addColorStop(1, `rgba(${c},0)`);
      g.strokeStyle = s; g.shadowColor = `rgb(${c})`; g.shadowBlur = 16; g.lineWidth = Math.max(4, H * .012);
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(ex, ey); g.stroke();
    });
    g.shadowBlur = 0;
  }

  function grid(t) {
    g.globalCompositeOperation = 'lighter'; g.lineWidth = 1;
    [[.66, 1, .55, '96,165,250'], [.34, -1, .28, '244,114,182']].forEach(([hz, dir, alpha, col]) => {
      const hy = H * hz, span = dir > 0 ? H - hy : hy;
      for (let i = -24; i <= 24; i++) {                       // lines converging on the horizon
        const xb = W / 2 + i * W * .075, gr = g.createLinearGradient(0, hy, 0, dir > 0 ? H : 0);
        gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(1, `rgba(${col},${alpha})`);
        g.strokeStyle = gr; g.beginPath(); g.moveTo(W / 2, hy); g.lineTo(xb, dir > 0 ? H : 0); g.stroke();
      }
      for (let j = 0; j < 14; j++) {                          // rows that keep flowing toward the viewer
        const f = Math.pow(((j + (t * .35) % 1) / 14), 2.3), y = hy + dir * span * f;
        g.strokeStyle = `rgba(${col},${alpha * f})`; g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
      }
    });
  }

  function dust(t) {
    g.globalCompositeOperation = 'lighter';
    stars.forEach(s => {
      const x = ((s.x + t * .004 * s.z) % 1) * W + mx * s.z * -.6, y = ((s.y - t * .006 * s.z + 1) % 1) * H + my * s.z * -.6;
      g.fillStyle = `rgba(191,219,254,${(.25 + .55 * Math.abs(Math.sin(t * 1.3 + s.p))) * s.z})`;
      g.beginPath(); g.arc(x, y, .5 + s.z * 1.4, 0, 6.283); g.fill();
    });
  }

  function frame(now) {
    if (!document.body.contains(sp)) return;                  // splash removed -> stop
    const t = reduce ? 3 : now / 1000;
    mx += (tx - mx) * .06; my += (ty - my) * .06;
    sp.style.setProperty('--px', (mx * .25).toFixed(1)); sp.style.setProperty('--py', (my * .25).toFixed(1));
    g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, W, H);
    grid(t); aurora(t); rays(t, W / 2 + mx * .25, H * .46 + my * .25); dust(t);
    if (!reduce) requestAnimationFrame(frame);
  }

  addEventListener('resize', size);
  sp.addEventListener('pointermove', e => { tx = e.clientX - W / 2; ty = e.clientY - H / 2; });
  size(); requestAnimationFrame(frame);
})();
