/* Availability engine + rule-based natural-language parser. No DOM access here. */
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], WD = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FLOOR_NAMES = ['Ground', 'First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth'];
const SOON_MIN = 15; // "available soon" = class ends within this many minutes
const S = { base: null, at: 0, stale: false }; // simulated clock + include-2024-25-sheet toggle

function now() { return S.base ? new Date(S.base + (Date.now() - S.at)) : new Date(); }
const dayName = d => WD[d.getDay()];
const toMin = t => { const p = t.split(':'); return +p[0] * 60 + +p[1]; };
const nowMin = d => d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
const fmt = m => { m = Math.round(m); let h = Math.floor(m / 60), mm = m % 60, ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return h + ':' + String(mm).padStart(2, '0') + ' ' + ap; };
const dur = m => { m = Math.round(m); const h = Math.floor(m / 60), r = m % 60; return h ? (r ? h + 'h ' + r + 'm' : h + 'h') : r + 'm'; };
const hms = s => [Math.floor(s / 3600), Math.floor(s % 3600 / 60), s % 60].map(v => String(v).padStart(2, '0')).join(':');
const secOf = id => DATA.sections.find(s => s.id === id);
const isAct = s => S.stale || s.status === 'active';

let IDX = {};
function index() {
  IDX = {};
  DATA.sessions.filter(isAct).forEach(s => s.rooms.forEach(r => (IDX[r] = IDX[r] || []).push(s)));
  Object.values(IDX).forEach(a => a.sort((x, y) => toMin(x.start) - toMin(y.start)));
}
const sessOf = (id, day) => (IDX[id] || []).filter(s => s.day === day);
const rooms = () => DATA.rooms.filter(r => (IDX[r.id] || []).length || r.homeFor.some(h => { const s = secOf(h.section); return S.stale || s.status === 'active'; }));
const floorIdx = r => r.floorInferred == null ? null : r.floorInferred - 1; // 1xx = Ground (assumption)
const floorLabel = r => { const i = floorIdx(r); return i == null ? 'Unknown floor' : (FLOOR_NAMES[i] || 'Floor ' + i) + ' Floor'; };

/* status of one room at a moment */
function state(room, date) {
  date = date || now();
  const day = dayName(date), t = nowMin(date), list = sessOf(room.id, day);
  const cur = list.find(s => toMin(s.start) <= t && t < toMin(s.end));
  if (cur) {
    let end = toMin(cur.end), ch = true;
    while (ch) { ch = false; for (const s of list) if (toMin(s.start) <= end && toMin(s.end) > end) { end = toMin(s.end); ch = true; } }
    const next = list.find(s => toMin(s.start) >= end), rem = end - t;
    return { status: rem <= SOON_MIN ? 'soon' : 'occupied', cur, freeAt: end, rem, next, freeFor: next ? toMin(next.start) - end : null, list };
  }
  const next = list.find(s => toMin(s.start) > t), prev = [...list].reverse().find(s => toMin(s.end) <= t);
  return { status: 'free', cur: null, freeFrom: prev ? toMin(prev.end) : null, next, freeFor: next ? toMin(next.start) - t : null, noClasses: !list.length, list };
}
const isFree = (id, day, a, b) => !sessOf(id, day).some(s => toMin(s.start) < b && a < toMin(s.end));
const nextStart = (id, day, a) => { const n = sessOf(id, day).find(s => toMin(s.start) >= a); return n ? toMin(n.start) : null; };

/* ---------- rule-based natural language parser (swap parse() for an LLM call later) ---------- */
function parse(q) {
  const t = ' ' + q.toLowerCase() + ' ', r = { raw: q, unsupported: [] };
  const N = { ground: 1, first: 2, second: 3, third: 4, fourth: 5, fifth: 6, sixth: 7 };
  let m = t.match(/\b(ground|first|second|third|fourth|fifth|sixth)\s+floor/) || t.match(/\bfloor\s+(ground|first|second|third|fourth|fifth|sixth)\b/);
  if (m) r.floor = N[m[1]]; else if ((m = t.match(/\b(\d)(?:st|nd|rd|th)\s+floor/))) r.floor = +m[1] + 1;
  const hm = (h, mi, ap, o) => { h = +h; ap = ap || o; if (ap === 'pm' && h < 12) h += 12; if (ap === 'am' && h === 12) h = 0; if (!ap && h < 8) h += 12; return h * 60 + (+mi || 0); };
  const tm = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|-|–|until|till)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (tm && (tm[3] || tm[6])) {
    const a = hm(tm[1], tm[2], tm[3], tm[6]), b = hm(tm[4], tm[5], tm[6], tm[3]);
    if (b > a) { r.start = a; r.end = b; r.dur = b - a; }
  } else if ((m = t.match(/\b(?:at|from|after|starting)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/))) r.start = hm(m[1], m[2], m[3]);
  if (r.dur == null) {
    if ((m = t.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/))) r.dur = Math.round(+m[1] * 60);
    else if ((m = t.match(/(\d+)\s*(?:minutes?|mins?)\b/))) r.dur = +m[1];
    else if (/half (an )?hour/.test(t)) r.dur = 30;
    else if (/\b(an|one|next|1) hour\b/.test(t)) r.dur = 60;
  }
  if (/\b(ac|a\/c|air.?condition\w*)\b/.test(t)) r.unsupported.push('AC');
  if ((m = t.match(/(\d+)\s*(?:students|people|persons|seats|members|pax)/))) r.unsupported.push('capacity of ' + m[1]);
  ['projector', 'whiteboard', 'wifi', 'wi-fi', 'smart board', 'mic'].forEach(f => { if (t.includes(f)) r.unsupported.push(f); });
  r.lab = /\blab(oratory)?\b/.test(t);
  r.valid = r.floor != null || r.start != null || r.dur != null || r.lab || r.unsupported.length > 0 || /\b(room|rooms|free|available|classroom|hall|team|squad|study)\b/.test(t);
  return r;
}

function search(q) {
  const r = parse(q);
  if (!r.valid) return { req: r, invalid: true };
  const d = now(), day = dayName(d), t = nowMin(d);
  const a = r.start != null ? r.start : Math.ceil(t), b = r.end != null ? r.end : a + (r.dur || 1);
  const mk = (room, note) => {
    const until = nextStart(room.id, day, a);
    return { room, from: a, until, len: until == null ? 1e4 : until - a, note, state: state(room) };
  };
  const pool = rooms().filter(x => !r.lab || x.roomTypeHint === 'lab');
  const floorOk = x => r.floor == null || x.floorInferred === r.floor;
  let exact = [], alts = [];
  if (!r.unsupported.length) exact = pool.filter(x => floorOk(x) && isFree(x.id, day, a, b)).map(x => mk(x));
  if (!exact.length) {
    const seen = new Set();
    const push = (x, n) => { if (!seen.has(x.room.id)) { seen.add(x.room.id); alts.push(x); x.note = n; } };
    pool.filter(x => isFree(x.id, day, a, b) && (r.unsupported.length ? floorOk(x) : true)).map(x => mk(x))
      .forEach(x => push(x, r.unsupported.length ? 'Free for your time window, but ' + r.unsupported.join(', ') + ' cannot be verified' : 'Free for your time window on a different floor'));
    pool.filter(x => floorOk(x) && !isFree(x.id, day, a, b) && isFree(x.id, day, a, a + 1)).map(x => mk(x))
      .forEach(x => push(x, 'Only free for ' + dur(x.len) + ' from your start time'));
    alts = alts.slice(0, 8);
  }
  const rank = (x, y) => (y.len - x.len) || x.room.id.localeCompare(y.room.id);
  return { req: r, day, a, b, exact: exact.sort(rank), alts: alts.sort(rank), weekend: !DAYS.includes(day) };
}

index();
