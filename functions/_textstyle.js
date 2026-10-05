// 글자 스타일 서버 검증(순수 함수, import 없음). 규칙은 report/v2/textstyle.js 의 clean() 과 같아야 한다.
const FONT_KEYS = ['serif', 'sans', 'nanummj', 'gowunb', 'hahmlet', 'songmyung', 'gowund', 'blackhan', 'dohyeon', 'jua', 'pen', 'dokdo', 'gamja', 'cinzel', 'cormorant'];
const IN = ['fade', 'rise', 'drop', 'blur', 'zoom', 'wipe', 'letters'], OUT = ['fade', 'rise', 'drop', 'blur', 'zoom', 'wipe'], LOOP = ['float', 'glow', 'pulse', 'sway', 'shimmer'];
const WEIGHTS = ['300', '400', '500', '600', '700', '900'], ALIGN = ['left', 'center', 'right'];
const ROLE_RE = /^[a-z]{2,10}\.[a-z]{2,10}$/, CID_RE = /^[\w.\-가-힣]{1,80}$/, HEX = /^#[0-9a-f]{6}$/i;
const num = (v, lo, hi) => { v = v === '' || v == null ? NaN : +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : undefined; };

export function cleanStyle(s) {
  s = s && typeof s === 'object' ? s : {}; const o = {}; let n;
  if (FONT_KEYS.includes(s.font)) o.font = s.font;
  if ((n = num(s.size, 8, 160)) !== undefined) o.size = n; if ((n = num(s.sizeM, 8, 160)) !== undefined) o.sizeM = n;
  if (WEIGHTS.includes(String(s.weight))) o.weight = String(s.weight);
  if (typeof s.color === 'string' && HEX.test(s.color)) o.color = s.color;
  if (ALIGN.includes(s.align)) o.align = s.align;
  if ((n = num(s.spacing, -3, 30)) !== undefined) o.spacing = n; if ((n = num(s.line, 0.8, 3)) !== undefined) o.line = n;
  if ((n = num(s.x, -80, 80)) !== undefined) o.x = n; if ((n = num(s.y, -80, 80)) !== undefined) o.y = n;
  if (IN.includes(s.in)) o.in = s.in; if ((n = num(s.inSpeed, 0.2, 6)) !== undefined) o.inSpeed = n; if ((n = num(s.inDelay, 0, 30)) !== undefined) o.inDelay = n;
  if ((n = num(s.hold, 0, 120)) !== undefined && n > 0) o.hold = n;
  if (OUT.includes(s.out)) o.out = s.out; if ((n = num(s.outSpeed, 0.2, 6)) !== undefined) o.outSpeed = n;
  if (LOOP.includes(s.loop)) o.loop = s.loop; if ((n = num(s.loopSpeed, 1, 30)) !== undefined) o.loopSpeed = n;
  return o;
}
const cleanMap = (m, maxRoles) => { const o = {}; if (m && typeof m === 'object') for (const r of Object.keys(m).slice(0, maxRoles)) if (ROLE_RE.test(r)) { const c = cleanStyle(m[r]); if (Object.keys(c).length) o[r] = c; } return o; };
export function cleanTextStyles(ts) {
  const out = { all: {}, chapters: {} }; if (!ts || typeof ts !== 'object') return out;
  out.all = cleanMap(ts.all, 40);
  if (ts.chapters && typeof ts.chapters === 'object') for (const cid of Object.keys(ts.chapters).slice(0, 80)) if (CID_RE.test(cid)) { const m = cleanMap(ts.chapters[cid], 40); if (Object.keys(m).length) out.chapters[cid] = m; }
  return out;
}
