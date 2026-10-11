// 뷰어 오류 수집 — 순수 로직(외부 import 없음 → Node 테스트 가능). 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 설계: report/v2/ERROR_LOG_DESIGN.md. 원칙: 개인정보가 들어올 수 없게 "받는 필드를 허용 목록으로 제한하고, 문자열은 스크러버로 정리"한다.
// 저장은 원문 로그가 아니라 하루 단위 서명 집계다(하루 서명 MAX_SIGS 종 상한).
export const KINDS = ['error', 'rejection', 'caught', 'asset'];
export const FLOWS = ['explore', 'classic', 'preview'];
export const BROWSERS = ['safari', 'chrome', 'edge', 'firefox', 'other'];
export const MAX_BODY = 2048, MAX_SIGS = 200, MAX_MSG = 160, TTL_DAYS = 14, MAX_CH = 30, MAX_VER = 10;
const TOKEN = /^[\w.-]{1,40}$/;

// 메시지에서 개인정보가 될 수 있는 모양을 지운다. 클라이언트(report/v2/errlog.js)의 scrub 와 같은 규칙이며 tests/errlog-sim.js 가 두 구현의 일치를 확인한다.
export function scrub(s, max) {
  let t = String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]+/g, ' ');
  t = t.replace(/https?:\/\/[^\s)"']+/gi, '<url>');
  t = t.replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '<email>');
  t = t.replace(/\d{4}\s*[-./년]\s*\d{1,2}\s*[-./월]\s*\d{1,2}(?:\s*일)?/g, '#');
  t = t.replace(/\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?/g, '#'); // 시각(출생 시각이 섞일 수 있다)
  t = t.replace(/\d{4,}/g, '#');
  t = t.replace(/(["'“‘「])([^"'”’」]{13,})(["'”’」])/g, function (m, a, b, c) { return a + b.slice(0, 12) + '…' + c; });
  t = t.replace(/[ㄱ-ㆎ가-힣一-鿿]+/g, '<ko>'); // 한글·한자 연속은 지운다: 이름 같은 사용자 값은 문장 속에서 모양으로 가려낼 수 없다(위치는 src:line·where 로 알 수 있다)
  t = t.replace(/\s+/g, ' ').trim();
  return t.length > (max || MAX_MSG) ? t.slice(0, max || MAX_MSG) : t;
}
const tok = v => (typeof v === 'string' && TOKEN.test(v) ? v : '');
const basename = v => { const s = String(v == null ? '' : v).split('?')[0].split('#')[0].split('/').pop().split('\\').pop(); return TOKEN.test(s) ? s : ''; };

// 클라이언트 본문 → 저장 가능한 보고 한 건. 알 수 없는 필드는 버리고, 필수(kind·where)가 틀리면 null.
export function cleanReport(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return null;
  if (!KINDS.includes(b.kind)) return null;
  const where = tok(b.where); if (!where) return null;
  const e = b.env && typeof b.env === 'object' ? b.env : {};
  return {
    kind: b.kind, where,
    msg: b.kind === 'caught' || b.kind === 'asset' ? '' : scrub(b.msg), // 잡아서 처리한 오류·에셋 실패는 메시지를 받지 않는다(사용자 값이 섞일 수 있음)
    src: basename(b.src), line: Math.max(0, Math.min(99999, Math.round(+b.line) || 0)),
    ch: tok(b.ch), world: tok(b.world), flow: FLOWS.includes(b.flow) ? b.flow : '', v: /^[\w.+-]{1,40}$/.test(b.v || '') ? b.v : '',
    env: { mobile: !!e.mobile, br: BROWSERS.includes(e.br) ? e.br : 'other', saveData: !!e.saveData },
  };
}

// FNV-1a 32bit — 같은 종류·기능·파일·줄·메시지 앞부분이면 같은 서명
export function signature(r) {
  const s = [r.kind, r.where, r.src, r.line, String(r.msg || '').slice(0, 80)].join('|');
  let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return ('00000000' + h.toString(16)).slice(-8);
}

export const dayOf = ts => new Date(ts).toISOString().slice(0, 10);
export const dayKey = day => 'err:day:' + day;
export const emptyDay = () => ({ total: 0, dropped: 0, sigs: {} });
const bump = (o, k, cap) => { if (o[k] != null || Object.keys(o).length < cap) o[k] = (o[k] || 0) + 1; };

// 하루 집계에 한 건을 합친다. 서명이 MAX_SIGS 종을 넘으면 새 서명은 dropped 로만 센다. 새 객체를 돌려준다.
export function merge(day, r, ts) {
  const d = day && typeof day === 'object' ? JSON.parse(JSON.stringify(day)) : emptyDay();
  d.sigs = d.sigs || {}; d.total = (d.total || 0) + 1; d.dropped = d.dropped || 0;
  const k = signature(r); let s = d.sigs[k];
  if (!s) {
    if (Object.keys(d.sigs).length >= MAX_SIGS) { d.dropped++; return d; }
    s = d.sigs[k] = { n: 0, first: ts, last: ts, kind: r.kind, where: r.where, msg: r.msg, src: r.src, line: r.line, ch: {}, env: { mobile: 0, desktop: 0, br: {} }, v: {} };
  }
  s.n++; s.last = ts;
  if (r.ch) bump(s.ch, r.ch, MAX_CH);
  s.env[r.env.mobile ? 'mobile' : 'desktop']++; bump(s.env.br, r.env.br, 5);
  if (r.v) bump(s.v, r.v, MAX_VER);
  return d;
}

// 관리자 화면용 요약: 여러 날 집계 → 합계·서명별 상위·종류별·버전별
export function summarize(days, top) {
  const out = { total: 0, dropped: 0, kinds: {}, versions: {}, sigs: [] }, by = {};
  (days || []).forEach(d => {
    if (!d) return; out.total += d.total || 0; out.dropped += d.dropped || 0;
    Object.keys(d.sigs || {}).forEach(k => {
      const s = d.sigs[k]; out.kinds[s.kind] = (out.kinds[s.kind] || 0) + s.n;
      Object.keys(s.v || {}).forEach(v => { out.versions[v] = (out.versions[v] || 0) + s.v[v]; });
      const a = by[k] || (by[k] = { sig: k, n: 0, kind: s.kind, where: s.where, msg: s.msg, src: s.src, line: s.line, first: s.first, last: s.last, ch: {}, mobile: 0, desktop: 0 });
      a.n += s.n; a.first = Math.min(a.first, s.first); a.last = Math.max(a.last, s.last); a.mobile += s.env.mobile || 0; a.desktop += s.env.desktop || 0;
      Object.keys(s.ch || {}).forEach(c => { a.ch[c] = (a.ch[c] || 0) + s.ch[c]; });
    });
  });
  out.sigs = Object.keys(by).map(k => by[k]).sort((a, b) => b.n - a.n).slice(0, top || 20);
  return out;
}
