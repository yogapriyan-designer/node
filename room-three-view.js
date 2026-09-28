/* 3D building: one persistent WebGL canvas, re-attached to whatever page shows #stage. */
const B3 = { auto: true, sig: '', mats: {}, boxes: [], pulse: [] };
const COL = { free: 0x22c55e, soon: 0xf59e0b, occupied: 0xef4444 };
const b3ctl = `<div class="b3bar"><button class="btn ghost" data-b3="rot">⟳ Auto-rotate</button><button class="btn ghost" data-b3="reset">⌂ Reset</button><button class="btn ghost" data-b3="top">⬒ Top view</button><button class="btn ghost" data-b3="front">▮ Front</button></div>`;
const stageHtml = extra => `<div class="stage" id="stage"><div class="ov"><span>🟢 Available</span><span>🟡 Soon</span><span>🔴 Occupied</span></div><div class="ov2">Drag to rotate 360° · Scroll to zoom · Click a room</div>${extra || ''}</div>`;

function b3label(text, size, color) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64;
  const x = c.getContext('2d'); x.font = 'bold 34px system-ui,sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 6; x.strokeStyle = 'rgba(15,23,42,.85)'; x.strokeText(text, 128, 34); x.fillStyle = color || '#fff'; x.fillText(text, 128, 34);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  s.scale.set(size * 4, size, 1); return s;
}
function b3hit(e) {
  const r = B3.r.domElement.getBoundingClientRect();
  B3.m.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  B3.ray.setFromCamera(B3.m, B3.cam);
  const h = B3.ray.intersectObjects(B3.boxes.filter(b => b.userData.pick), false)[0];
  return h && h.object;
}
function b3init() {
  const r = new THREE.WebGLRenderer({ antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio, 2));
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(42, 1, .1, 300);
  sc.add(new THREE.HemisphereLight(0xffffff, 0x475569, 1)); const dl = new THREE.DirectionalLight(0xffffff, .9); dl.position.set(12, 25, 14); sc.add(dl);
  const ctl = new THREE.OrbitControls(cam, r.domElement);
  Object.assign(ctl, { enableDamping: true, dampingFactor: .08, autoRotate: true, autoRotateSpeed: 1.6, minDistance: 6, maxDistance: 60 });
  Object.assign(B3, { r, sc, cam, ctl, ray: new THREE.Raycaster(), m: new THREE.Vector2(), clock: new THREE.Clock() });
  const pts = new Float32Array(900); for (let i = 0; i < 900; i += 3) { const a = Math.random() * 6.28, rr = 8 + Math.random() * 18; pts[i] = Math.cos(a) * rr; pts[i + 1] = Math.random() * 14 - 2; pts[i + 2] = Math.sin(a) * rr; }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pts, 3));
  B3.dust = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0x93c5fd, size: .12, transparent: true, opacity: .8 })); sc.add(B3.dust);
  b3reset();
  ctl.addEventListener('start', () => ctl.autoRotate = false);
  ctl.addEventListener('end', () => setTimeout(() => ctl.autoRotate = B3.auto, 3500));
  let d0; const el = r.domElement;
  el.addEventListener('pointerdown', e => d0 = [e.clientX, e.clientY]);
  el.addEventListener('pointerup', e => { if (d0 && Math.hypot(e.clientX - d0[0], e.clientY - d0[1]) < 5) { const o = b3hit(e); if (o) { V.modal = o.userData.id; render(); } } d0 = null; });
  el.addEventListener('pointermove', e => {
    const o = b3hit(e), t = B3.tip; el.style.cursor = o ? 'pointer' : 'grab'; if (!t) return;
    if (o) { const rm = byId(o.userData.id), x = { r: rm, s: state(rm) }; t.innerHTML = `<b>${rm.displayName}</b> ${badge(x.s.status)}<br>${tileText(x)}`; const b = el.getBoundingClientRect(); t.style.cssText = `display:block;left:${e.clientX - b.left + 14}px;top:${e.clientY - b.top + 14}px`; } else t.style.display = 'none';
  });
  addEventListener('resize', b3size);
  (function loop() {
    requestAnimationFrame(loop);
    if (!B3.el || !document.body.contains(B3.el)) return;
    ctl.update(); const t = B3.clock.getElapsedTime();
    B3.pulse.forEach(m => m.emissiveIntensity = .35 + .35 * Math.sin(t * 4));
    if (B3.prism) { B3.prism.rotation.y = t * .9; B3.prism.position.y = B3.prismY + Math.sin(t * 1.5) * .25; }
    if (B3.dust) B3.dust.rotation.y = t * .05;
    r.render(sc, cam);
  })();
}
function b3reset(v) {
  const n = B3.floors || 4, h = (n - 1) * .95;
  const P = { top: [0, 34, .01], front: [0, h + 1, 26] }[v] || [17, h + 9, 19];
  B3.cam.position.set(...P); B3.ctl.target.set(0, h, 0); B3.ctl.update();
}
function b3size() { const el = B3.el; if (!el || !B3.r) return; const w = el.clientWidth, h = el.clientHeight; B3.r.setSize(w, h); B3.cam.aspect = w / h; B3.cam.updateProjectionMatrix(); }
function b3build() {
  const focus = V.page === 'map' ? V.floor : 'all', rs = rooms(), sig = rs.map(r => r.id).join() + focus;
  if (sig === B3.sig) return; B3.sig = sig;
  if (B3.group) B3.sc.remove(B3.group);
  const g = new THREE.Group(), fl = {}; rs.forEach(r => (fl[floorLabel(r)] = fl[floorLabel(r)] || []).push(r));
  const keys = Object.keys(fl).sort((a, b) => (a.startsWith('Unknown') - b.startsWith('Unknown')) || FLOOR_NAMES.indexOf(a.split(' ')[0]) - FLOOR_NAMES.indexOf(b.split(' ')[0]));
  const COLS = 4, CW = 2.5, CD = 2.1, maxRows = Math.max(...keys.map(k => Math.ceil(fl[k].length / COLS))), W = COLS * CW + 1, D = maxRows * CD + 1;
  B3.floors = keys.length; B3.boxes = []; B3.mats = {};
  const base = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(W, D) * .95, Math.max(W, D) * .95, .12, 64), new THREE.MeshStandardMaterial({ color: 0x1e293b, transparent: true, opacity: .55 }));
  base.position.y = -.6; g.add(base); const grid = new THREE.GridHelper(Math.max(W, D) * 1.9, 24, 0x3b82f6, 0x334155); grid.position.y = -.53; grid.material.transparent = true; grid.material.opacity = .35; g.add(grid);
  keys.forEach((k, i) => {
    const dim = focus !== 'all' && focus !== k, y = i * 1.9, list = fl[k].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    const slab = new THREE.Mesh(new THREE.BoxGeometry(W, .16, D), new THREE.MeshStandardMaterial({ color: 0x94a3b8, transparent: true, opacity: dim ? .06 : .32 }));
    slab.position.y = y; g.add(slab);
    if (!dim) { const t = b3label(k.replace(' Floor', '').toUpperCase(), .55, '#93c5fd'); t.position.set(-W / 2 - 1.6, y + .3, 0); g.add(t); }
    const rows = Math.ceil(list.length / COLS);
    list.forEach((r, j) => {
      const c = j % COLS, rw = Math.floor(j / COLS), cols = Math.min(COLS, list.length - rw * COLS);
      const mat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: .3, roughness: .45, transparent: true, opacity: dim ? .1 : .96 });
      const m = new THREE.Mesh(new THREE.BoxGeometry(2, .7, 1.6), mat);
      m.position.set((c - (cols - 1) / 2) * CW, y + .45, (rw - (rows - 1) / 2) * CD); m.userData = { id: r.id, pick: !dim };
      m.add(new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x0f172a, transparent: true, opacity: dim ? .1 : .6 })));
      g.add(m); B3.boxes.push(m); B3.mats[r.id] = mat;
      if (!dim) { const l = b3label(r.displayName.replace('IST ', ''), .42); l.position.set(m.position.x, y + 1.15, m.position.z); g.add(l); }
    });
  });
  const pr = new THREE.Mesh(new THREE.OctahedronGeometry(1.2), new THREE.MeshStandardMaterial({ color: 0x93c5fd, transparent: true, opacity: .5, metalness: .7, roughness: .1, emissive: 0x60a5fa, emissiveIntensity: .5 }));
  pr.scale.y = 1.6; B3.prismY = (keys.length - 1) * 1.9 + 2.6; pr.position.y = B3.prismY; pr.add(new THREE.LineSegments(new THREE.EdgesGeometry(pr.geometry), new THREE.LineBasicMaterial({ color: 0xffffff }))); g.add(pr); B3.prism = pr;
  B3.group = g; B3.sc.add(g);
  const h = focus === 'all' ? (keys.length - 1) * .95 : Math.max(0, keys.indexOf(focus)) * 1.9; B3.ctl.target.set(0, h, 0);
}
function b3update() {
  if (!B3.r) return; B3.pulse = [];
  Object.keys(B3.mats).forEach(id => { const s = state(byId(id)).status, m = B3.mats[id]; m.color.setHex(COL[s]); m.emissive.setHex(COL[s]); if (s === 'soon') B3.pulse.push(m); else m.emissiveIntensity = .3; });
}
function b3mount(el) {
  if (!window.THREE || !THREE.OrbitControls) { el.insertAdjacentHTML('beforeend', '<div class="empty">3D engine not loaded (check three.min.js and OrbitControls.js)</div>'); return; }
  try {
    if (!B3.r) b3init();
    B3.el = el; el.prepend(B3.r.domElement); B3.tip = document.createElement('div'); B3.tip.className = 'tip'; el.appendChild(B3.tip);
    b3size(); b3build(); b3update();
  } catch (err) { el.insertAdjacentHTML('beforeend', '<div class="empty">3D view unavailable (WebGL disabled?): ' + err.message + '</div>'); }
}

function b3fly() {
  if (!B3.r) return; const c = B3.cam, to = c.position.clone(), from = to.clone().multiplyScalar(2.4).add(new THREE.Vector3(0, 12, 0)), Y = new THREE.Vector3(0, 1, 0), t0 = performance.now();
  B3.ctl.autoRotate = false;
  (function s() { const k = Math.min(1, (performance.now() - t0) / 2800), e = 1 - Math.pow(1 - k, 3); c.position.lerpVectors(from, to, e).applyAxisAngle(Y, (1 - e) * 5); if (k < 1) requestAnimationFrame(s); else B3.ctl.autoRotate = B3.auto; })();
}
