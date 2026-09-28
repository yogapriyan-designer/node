/* Smart Room Finder UI. Everything rendered from DATA + engine.js */
const $ = s => document.querySelector(s);
const V = { page: 'dash', floor: 'all', tt: { day: null, floor: 'all', room: 'all', sec: 'all' }, av: { floor: 'all', st: 'all', q: '', sec: 'all' }, ai: { q: '', res: null }, modal: null };
const ST = { free: ['Available', 'free', '🟢'], soon: ['Available Soon', 'soon', '🟡'], occupied: ['Occupied', 'occ', '🔴'] };
const badge = s => `<span class="badge ${ST[s][1]}">${ST[s][2]} ${ST[s][0]}</span>`;
const all = () => rooms().map(r => ({ r, s: state(r) }));
const byId = id => DATA.rooms.find(r => r.id === id);
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const secLabel = id => secOf(id).label;
const workDay = () => { const d = dayName(now()); return DAYS.includes(d) ? d : 'Mon'; };

function squadUrl(r, from, until) {
  const t = nowMin(now());
  const head = from <= t + 1 ? `📍 Room ${r.displayName} is available now!` : `📍 Room ${r.displayName} is available from ${fmt(from)}!`;
  const msg = `${head}\n\n🏢 ${floorLabel(r)}\n⏰ ${until == null ? 'Free for the rest of the scheduled day' : 'Available until ' + fmt(until)}\n\nCome fast! 🚀`;
  return 'https://wa.me/?text=' + encodeURIComponent(msg);
}
const squadBtn = (r, from, until) => `<a class="btn wa" target="_blank" rel="noopener" href="${squadUrl(r, from, until)}">📣 Call the Squad</a>`;
const cd = end => `<span class="cd" data-end="${end}">--:--:--</span>`;

function tileText(x) {
  const s = x.s;
  if (s.status !== 'free') return `Ends ${fmt(s.freeAt)}`;
  if (s.noClasses) return 'No classes today';
  return s.next ? `Free ${dur(s.freeFor)}` : 'Free – no more classes';
}
const tile = x => `<button class="tile ${ST[x.s.status][1]}" data-room="${x.r.id}"><b>${esc(x.r.displayName)}</b><small>${x.r.roomTypeHint}</small><span>${tileText(x)}</span></button>`;

function floorBlocks(list, compact) {
  if (!list.length) return `<div class="empty">No rooms match.</div>`;
  const g = {};
  list.forEach(x => (g[floorLabel(x.r)] = g[floorLabel(x.r)] || []).push(x));
  return Object.keys(g).sort((a, b) => (a.startsWith('Unknown') - b.startsWith('Unknown')) || FLOOR_NAMES.indexOf(a.split(' ')[0]) - FLOOR_NAMES.indexOf(b.split(' ')[0]))
    .map(k => `<section class="floor ${compact ? '' : 'plan'}"><h3>${k.toUpperCase()}</h3><div class="tiles">${g[k].sort((a, b) => a.r.id.localeCompare(b.r.id, undefined, { numeric: true })).map(tile).join('')}</div>${compact ? '' : '<div class="corridor">corridor</div>'}</section>`).join('');
}
const legend = `<div class="legend"><span>🟢 Available</span><span>🔴 Occupied</span><span>🟡 Available Soon (ends ≤ ${SOON_MIN} min)</span></div>`;
const floorOpts = () => [['all', 'All floors'], ...[...new Set(rooms().map(floorLabel))].sort().map(f => [f, f])];
const sel = (path, opts, val) => `<select data-f="${path}">${opts.map(o => `<option value="${esc(o[0])}" ${o[0] === val ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;

/* ---------------- pages ---------------- */
function pDash() {
  const a = all(), c = k => a.filter(x => x.s.status === k).length, d = now();
  const soon = a.filter(x => x.s.status === 'soon');
  const wk = !DAYS.includes(dayName(d));
  return `<div class="hero">${stageHtml()}<div class="heroTxt"><h1>Find a free classroom<br>in seconds.</h1><p>Live 3D view of every room, calculated from your timetables. Drag the building to spin it 360°, click any room.</p>${b3ctl}<button class="btn" data-p="ai">✨ Ask the AI Room Finder</button></div></div><div class="cards">
    <div class="card"><label>TOTAL ROOMS</label><h2>${a.length}</h2></div>
    <div class="card g"><label>AVAILABLE NOW</label><h2>${c('free')}</h2></div>
    <div class="card r"><label>OCCUPIED NOW</label><h2>${c('occupied')}</h2></div>
    <div class="card y"><label>AVAILABLE SOON</label><h2>${c('soon')}</h2></div></div>
  <div class="cards"><div class="card b"><label>DATE</label><h3>${d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</h3></div>
    <div class="card b"><label>TIME</label><h3 id="dtime">${d.toLocaleTimeString()}</h3></div>
    <div class="card b"><label>DAY</label><h3>${d.toLocaleDateString(undefined, { weekday: 'long' })}</h3></div></div>
  ${wk ? `<div class="note">📅 No classes are scheduled on weekends, so every room shows as available. Use “Simulate time” in the header to demo a weekday.</div>` : ''}
  <div class="note info">ℹ️ “Available” means <b>not booked in the uploaded timetables</b> (${DATA.sections.filter(isAct).length} sections). Other departments may still use these rooms.</div>
  <h2 class="sec">Becoming available soon</h2>
  <div class="tiles">${soon.length ? soon.map(x => `<button class="tile soon" data-room="${x.r.id}"><b>${esc(x.r.displayName)}</b><small>${esc(x.s.cur.subjectName)}</small><span>Free in ${cd(x.s.freeAt)}</span></button>`).join('') : '<div class="empty">No room frees up in the next ' + SOON_MIN + ' minutes.</div>'}</div>
  <h2 class="sec">Floor grid</h2>${legend}${floorBlocks(a, true)}`;
}
function pMap() {
  const a = all().filter(x => V.floor === 'all' || floorLabel(x.r) === V.floor);
  return `<div class="bar">${sel('floor', floorOpts(), V.floor)}${b3ctl}</div>${stageHtml()}<div class="hint">Pick a floor to isolate it. The 2D grid below shows the same rooms.</div>${legend}${floorBlocks(a, false)}`;
}
function pAI() {
  const ex = ['I need a room on the ground floor for the next 2 hours', 'Find me a free room on the second floor', 'I need a room available from 2 PM to 4 PM', 'I need a lab for the next one hour', 'I need an AC room on the ground floor for the next 2 hours'];
  return `<div class="ai"><h2>✨ AI Room Finder</h2>
  <textarea id="aiq" rows="2" placeholder="e.g. I need a room on the ground floor for the next 2 hours">${esc(V.ai.q)}</textarea>
  <div class="row"><button class="btn" id="aigo">Find rooms</button>${ex.map(e => `<button class="chip" data-ex="${esc(e)}">${esc(e)}</button>`).join('')}</div></div><div id="aires">${aiResults()}</div>`;
}
function aiCard(x, alt) {
  const r = x.room, s = x.state;
  return `<div class="rc ${alt ? 'alt' : ''}"><div class="rh"><h3>ROOM ${esc(r.displayName)}</h3>${badge(s.status)}</div>
  <p>${floorLabel(r)} · ${r.roomTypeHint} · AC: <i>not in data</i></p>
  <p><b>Available:</b> ${fmt(x.from)} – ${x.until == null ? 'end of scheduled classes' : fmt(x.until)} · <b>Duration:</b> ${x.until == null ? 'until further schedule' : dur(x.until - x.from)}</p>
  <p>${s.status !== 'free' ? 'Now: ' + esc(s.cur.subjectName) + ' (' + esc(secLabel(s.cur.sectionId)) + ')' : s.next ? 'Next: ' + esc(s.next.subjectName) + ' (' + esc(secLabel(s.next.sectionId)) + ') at ' + fmt(toMin(s.next.start)) : 'No upcoming class today'}</p>
  ${alt ? `<p class="altn">Alternative – ${esc(x.note)}</p>` : ''}
  <div class="row"><button class="btn ghost" data-room="${r.id}">View Room</button>${squadBtn(r, x.from, x.until)}</div></div>`;
}
function aiResults() {
  const res = V.ai.res;
  if (!res) return '<div class="empty">Type a request above. Results come only from the uploaded timetables.</div>';
  if (res.invalid) return '<div class="note">🤔 I couldn’t find a requirement in that. Try “a free room on the second floor for 1 hour” or “room from 2 PM to 4 PM”.</div>';
  const q = res.req, chips = [];
  if (q.floor != null) chips.push('Floor: ' + (FLOOR_NAMES[q.floor - 1] || q.floor));
  chips.push(q.start != null ? 'From ' + fmt(res.a) : 'From now (' + fmt(res.a) + ')');
  chips.push(q.end != null ? 'Until ' + fmt(res.b) : q.dur ? 'Duration ' + dur(q.dur) : 'Free right now');
  if (q.lab) chips.push('Lab'); q.unsupported.forEach(u => chips.push('⚠ ' + u));
  let h = `<div class="chips">${chips.map(c => `<span>${esc(c)}</span>`).join('')}</div>`;
  if (res.weekend) h += `<div class="note">📅 Today has no scheduled classes, so timetable-wise everything is free.</div>`;
  if (q.unsupported.length) h += `<div class="note">The timetables don’t contain ${esc(q.unsupported.join(', '))} information, so I can’t confirm it for any room.</div>`;
  h += res.exact.length ? `<h2 class="sec">AI ROOM MATCHES (${res.exact.length})</h2><div class="rgrid">${res.exact.map(x => aiCard(x)).join('')}</div>`
    : `<div class="note bad"><b>No exact room matches your requirements.</b></div>` + (res.alts.length ? `<h2 class="sec">Possible alternatives</h2><div class="rgrid">${res.alts.map(x => aiCard(x, 1)).join('')}</div>` : '<div class="empty">No alternatives found either.</div>');
  return h;
}
function ttTable() {
  const T = V.tt, day = T.day || workDay(), P = DATA.meta.periods['2026-27'];
  let rs = rooms().filter(r => (T.floor === 'all' || floorLabel(r) === T.floor) && (T.room === 'all' || r.id === T.room));
  if (T.sec !== 'all') rs = rs.filter(r => sessOf(r.id, day).some(s => s.sectionId === T.sec));
  if (!rs.length) return '<div class="empty">No rooms have classes for this filter.</div>';
  rs = rs.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
  let h = `<div class="scroll"><table><tr><th>TIME</th>${rs.map(r => `<th>${esc(r.displayName)}</th>`).join('')}</tr>`;
  for (let p = 1; p <= 9; p++) {
    const a = toMin(P[p][0]), b = toMin(P[p][1]);
    h += `<tr class="${p === 5 ? 'lunch' : ''}"><th>${P[p][0]}–${P[p][1]}${p === 5 ? '<br>Lunch' : ''}</th>` + rs.map(r => {
      const m = sessOf(r.id, day).filter(s => (T.sec === 'all' || s.sectionId === T.sec) && toMin(s.start) < b && a < toMin(s.end));
      return `<td class="${m.length ? 'busy' : ''}">${m.map(s => `<b>${esc(secLabel(s.sectionId))}</b><br>${esc(s.subjectName)}`).join('<hr>')}</td>`;
    }).join('') + '</tr>';
  }
  return h + '</table></div>';
}
function pTT() {
  const T = V.tt, day = T.day || workDay();
  return `<div class="bar">${sel('tt.day', DAYS.map(d => [d, d]), day)}${sel('tt.floor', floorOpts(), T.floor)}${sel('tt.room', [['all', 'All rooms'], ...rooms().map(r => [r.id, r.displayName])], T.room)}${sel('tt.sec', [['all', 'All sections'], ...DATA.sections.filter(isAct).map(s => [s.id, s.label])], T.sec)}</div><div id="ttres">${ttTable()}</div>`;
}
function avList() {
  const A = V.av, q = A.q.toLowerCase();
  let a = all().filter(x => (A.floor === 'all' || floorLabel(x.r) === A.floor) && (A.st === 'all' || (A.st === 'free' ? x.s.status !== 'occupied' : x.s.status === A.st)) &&
    (A.sec === 'all' || x.r.sections.includes(A.sec)) && (!q || (x.r.displayName + ' ' + x.r.roomTypeHint).toLowerCase().includes(q)));
  const o = { free: 0, soon: 1, occupied: 2 };
  a.sort((x, y) => o[x.s.status] - o[y.s.status]);
  if (!a.length) return '<div class="empty">No rooms match these filters.</div>';
  return `<div class="rgrid">${a.map(x => { const s = x.s; return `<div class="rc"><div class="rh"><h3>ROOM ${esc(x.r.displayName)}</h3>${badge(s.status)}</div><p>${floorLabel(x.r)} · ${x.r.roomTypeHint}</p>
    <p>${s.status === 'free' ? (s.next ? `Free for ${dur(s.freeFor)} (next: ${fmt(toMin(s.next.start))})` : s.noClasses ? 'No classes today' : 'Free for the rest of the day') : `${esc(s.cur.subjectName)} · ends in ${cd(s.freeAt)}`}</p>
    <div class="row"><button class="btn ghost" data-room="${x.r.id}">Details</button>${s.status === 'free' ? squadBtn(x.r, nowMin(now()), s.next ? toMin(s.next.start) : null) : ''}</div></div>`; }).join('')}</div>`;
}
function pAv() {
  const A = V.av;
  return `<div class="bar"><input data-f="av.q" placeholder="Search room…" value="${esc(A.q)}">${sel('av.floor', floorOpts(), A.floor)}${sel('av.st', [['all', 'Any status'], ['free', 'Available (incl. soon)'], ['soon', 'Available soon'], ['occupied', 'Occupied']], A.st)}${sel('av.sec', [['all', 'Any section'], ...DATA.sections.filter(isAct).map(s => [s.id, s.label])], A.sec)}</div><div id="avres">${avList()}</div>`;
}
function pData() {
  const q = DATA.dataQuality, live = DATA.conflicts.filter(c => c.category === 'live_conflict'), st = DATA.conflicts.filter(c => c.category !== 'live_conflict');
  return `<div class="note info"><label><input type="checkbox" id="stale" ${S.stale ? 'checked' : ''}> Include the 2024-25 sheet (file 10) in live availability</label> — off by default because it is from another academic year and clashes with II BME in IST 602.</div>
  <h2 class="sec">Timetable files (${DATA.sections.length})</h2><div class="scroll"><table><tr><th>File</th><th>Section</th><th>Venue</th><th>Year</th><th>Sessions</th><th>Status</th></tr>${DATA.sections.map(s => `<tr><td>${s.sourceFile}</td><td>${esc(s.label)}</td><td>${esc(s.venueRaw)}</td><td>${s.academicYear}</td><td>${DATA.sessions.filter(x => x.sectionId === s.id).length}</td><td>${s.status === 'active' ? '✅ active' : '⚠️ needs confirmation'}</td></tr>`).join('')}</table></div>
  <h2 class="sec">Conflicts</h2>${live.map(c => `<div class="note bad">🔴 <b>${c.room}</b> ${c.day} ${c.window}: ${c.sections.join(' vs ')} (${c.labels.join(' / ')}). ${esc(c.note)}</div>`).join('') || '<div class="empty">None</div>'}
  <details><summary>${st.length} overlaps involving the 2024-25 sheet</summary>${st.map(c => `<p>${c.room} ${c.day} ${c.window} — ${c.sections.join(' vs ')}</p>`).join('')}</details>
  <h2 class="sec">Data quality notes</h2><ul>${q.map(x => `<li>${x.section ? '<b>' + x.section + ':</b> ' : ''}${esc(x.msg)}</li>`).join('')}</ul>
  <h2 class="sec">${rooms().length} rooms</h2><p>${rooms().map(r => `${r.displayName} (${floorLabel(r)})`).join(' · ')}</p>`;
}
const PAGES = { dash: pDash, map: pMap, ai: pAI, tt: pTT, av: pAv, data: pData };

/* ---------------- modal ---------------- */
function roomModal() {
  const r = byId(V.modal), s = state(r), t = nowMin(now()), day = dayName(now()), sc = x => x ? secLabel(x.sectionId) : '';
  let body;
  if (s.status !== 'free') {
    body = `<p class="big">Currently occupied</p><p><b>${esc(s.cur.subjectName)}</b><br>Section: ${esc(sc(s.cur))}${s.cur.faculty ? '<br>Faculty: ' + esc(s.cur.faculty) : ''}<br>${fmt(toMin(s.cur.start))} – ${fmt(toMin(s.cur.end))}</p>
    <p>Ends in:</p><div class="timer">${cd(s.freeAt)}</div><p>Next available: <b>${fmt(s.freeAt)}</b><br>${s.next ? 'Available for: <b>' + dur(s.freeFor) + '</b>' : 'Available until further schedule'}</p>`;
  } else body = `<p>Current time: <b>${fmt(t)}</b></p><p>Available from: <b>${s.freeFrom != null ? fmt(s.freeFrom) : 'start of day'}</b><br>Available until: <b>${s.next ? fmt(toMin(s.next.start)) : 'end of scheduled classes'}</b><br>Available duration: <b>${s.next ? dur(s.freeFor) : 'Available until further schedule'}</b>${s.noClasses ? '<br><i>No class scheduled today.</i>' : ''}</p>`;
  if (s.next) body += `<p>Next class: <b>${esc(s.next.subjectName)}</b><br>${fmt(toMin(s.next.start))} – ${fmt(toMin(s.next.end))}<br>Section: ${esc(sc(s.next))}</p>`;
  const today = s.list.map(x => `<li>${fmt(toMin(x.start))}–${fmt(toMin(x.end))} · ${esc(x.subjectName)} <small>(${esc(sc(x))})</small></li>`).join('');
  return `<div class="mb" data-close><div class="mc"><button class="x" data-close>✕</button><div class="rh"><h2>ROOM ${esc(r.displayName)}</h2>${badge(s.status)}</div>
  <p>${floorLabel(r)} · ${r.roomTypeHint} · ${r.floorConfirmed ? '' : '<small>floor inferred from room number</small>'}</p>${body}
  <p><small>Facilities: not provided in timetable data. Used by: ${r.sections.map(secLabel).join(', ') || '–'}</small></p>
  <details><summary>${day} schedule (${s.list.length} classes)</summary><ul>${today || '<li>No classes</li>'}</ul></details>
  <div class="row">${s.status === 'free' ? squadBtn(r, t, s.next ? toMin(s.next.start) : null) : ''}<button class="btn ghost" data-tt="${r.id}">View Timetable</button><button class="btn ghost" data-close>Back</button></div></div></div>`;
}

/* ---------------- render + events ---------------- */
function render() {
  if (!window.DATA) return;
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.p === V.page));
  const view = $('#view'); view.innerHTML = PAGES[V.page]();
  view.classList.toggle('enter', !!V.enter);
  if (V.enter) { [...view.querySelectorAll('.cards>*,.tiles>*,.rgrid>*,.floor,.hero>*')].forEach((e, i) => e.style.animationDelay = Math.min(i, 24) * 45 + 'ms'); if (V.page === 'dash') countUp(); }
  V.enter = false;
  $('#modal').innerHTML = V.modal ? roomModal() : '';
  const mc = $('.mc'); if (mc && V.modal !== V.mLast) mc.classList.add('fresh'); V.mLast = V.modal;
  const st = $('#stage'); if (st) b3mount(st);
  tick();
}
function tick() {
  const d = now(); $('#clock').textContent = d.toLocaleDateString(undefined, { weekday: 'short' }) + ' ' + d.toLocaleTimeString();
  const dt = $('#dtime'); if (dt) dt.textContent = d.toLocaleTimeString();
  const s = nowMin(d) * 60; let over = false;
  document.querySelectorAll('.cd').forEach(el => { const left = Math.floor(el.dataset.end * 60 - s); if (left <= 0) over = true; else el.textContent = hms(left); });
  if (over) render(); else if (typeof b3update === 'function' && $('#stage')) b3update();
}
function countUp() {
  document.querySelectorAll('.card h2').forEach(el => { const n = +el.textContent; if (!(n > 0)) return; const t0 = performance.now();
    (function f() { const k = Math.min(1, (performance.now() - t0) / 900); el.textContent = Math.round(n * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(f); })(); });
}
function setF(path, val) { const p = path.split('.'); if (p.length === 2) V[p[0]][p[1]] = val; else V[p[0]] = val; }
document.addEventListener('click', e => {
  const t = e.target.closest('[data-room],[data-close],[data-p],[data-ex],[data-tt],[data-b3],#aigo,.x'); if (!t) return;
  if (t.dataset.b3) { const v = t.dataset.b3; if (v === 'rot') { B3.auto = !B3.auto; B3.ctl.autoRotate = B3.auto; } else { B3.auto = v === 'reset'; B3.ctl.autoRotate = B3.auto; b3reset(v === 'reset' ? undefined : v); } return; }
  if (t.dataset.p) { V.enter = true; V.page = t.dataset.p; V.modal = null; location.hash = V.page; render(); }
  else if (t.dataset.tt) { V.tt = { day: workDay(), floor: 'all', room: t.dataset.tt, sec: 'all' }; V.modal = null; V.page = 'tt'; render(); }
  else if (t.dataset.room) { V.modal = t.dataset.room; render(); }
  else if (t.hasAttribute('data-close')) { if (e.target === t || e.target.closest('.x') || e.target.closest('.btn[data-close]')) { V.modal = null; render(); } }
  else if (t.dataset.ex) { V.ai.q = t.dataset.ex; V.ai.res = search(V.ai.q); render(); }
  else if (t.id === 'aigo') { V.ai.q = $('#aiq').value; V.ai.res = search(V.ai.q); render(); }
});
document.addEventListener('change', e => {
  if (e.target.id === 'stale') { S.stale = e.target.checked; index(); return render(); }
  if (e.target.id === 'sim') { if (e.target.value) { S.base = new Date(e.target.value).getTime(); S.at = Date.now(); } render(); return; }
  if (e.target.dataset.f) { setF(e.target.dataset.f, e.target.value); render(); }
});
document.addEventListener('input', e => {
  if (e.target.dataset.f === 'av.q') { V.av.q = e.target.value; $('#avres').innerHTML = avList(); tick(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'aiq' && !e.shiftKey) { e.preventDefault(); $('#aigo').click(); } if (e.key === 'Escape' && V.modal) { V.modal = null; render(); } });
$('#live').onclick = () => { S.base = null; $('#sim').value = ''; render(); };
setInterval(tick, 1000);
setInterval(() => { if (V.page !== 'ai' && !document.activeElement.matches('input,textarea')) render(); }, 30000);
(function splash() {
  const sp = $('#splash'), tt = $('#stitle'); if (!sp) return;
  let n = 0; 'SMART ROOM SYSTEM'.split(' ').forEach((w, wi) => { if (wi) { const s = document.createElement('span'); s.className = 'sp'; s.style.setProperty('--i', n++); tt.appendChild(s); } const b = document.createElement('b'); b.className = 'w'; w.split('').forEach(c => { const e = document.createElement('span'); e.style.setProperty('--i', n++); e.textContent = c; b.appendChild(e); }); tt.appendChild(b); });
  let done = false; const end = () => { if (done) return; done = true; sp.classList.add('out'); V.enter = true; render(); setTimeout(() => { sp.remove(); window.b3fly && b3fly(); }, 350); };
  setTimeout(end, matchMedia('(prefers-reduced-motion:reduce)').matches ? 300 : 4800); sp.addEventListener('click', end);
})();
(function boot() {
  if (!window.DATA) { $('#view').innerHTML = '<div class="empty">Could not load room-data.js</div>'; return; }
  const h = location.hash.slice(1); if (PAGES[h]) V.page = h;
  V.enter = true; render();
})();
