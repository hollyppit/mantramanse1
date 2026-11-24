// 토정비결 말투 검사 — node tests/tojeong-classical-sim.cjs (2026-11-25 사용자 요청)
//  · 원문 해석(월별 gist: 원문 바로 아래 한 줄)은 고전 반말(예언체 ~리라·~니라·~하라·~마라). 존댓말(~요·~습니다·~세요) 0건
//  · 상세풀이(총평·좋은 점·조심할 점, 월별 심화 칸)는 존댓말(해요체) 그대로
//  · 신년운세 조합(compose)·만세력 보조선 API(/api/newyear/months)에 실제로 그 문장이 나간다
//  · 고전체로 바뀐 단정 예언(망하리라·죽으리라 …)도 품질 검사에 걸린다
const assert = require('assert/strict');
const path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
require(path.join(root, 'report', 'newyear', 'node-loader.js'));
const M = globalThis.TojeongModern, Q = require(path.join(root, 'report', 'newyear', 'quality.js'));
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };

const POLITE = /요(?=$|[\s.,!?…)\]"'」』·])|니다|세요|십시오|으시|하시/;
const CLASSIC_END = /(?:리라|니라|하라|마라|[가-힣]라|로다|도다|느냐)\.$/;

// 1) 원문 해석 1,680줄
const gists = [];
for (const g of Object.keys(M)) for (const [m, v] of Object.entries(M[g].months || {})) if (v.gist) gists.push({ g, m, t: v.gist });
ok(gists.length >= 1680, '원문 해석 수 ' + gists.length);
const polite = gists.filter(x => POLITE.test(x.t));
ok(!polite.length, '원문 해석 존댓말 ' + polite.length + '건: ' + polite.slice(0, 3).map(x => x.g + '.' + x.m + ' ' + x.t).join(' | '));
const notClassic = gists.filter(x => !CLASSIC_END.test(x.t.trim()));
ok(!notClassic.length, '고전체 끝맺음 아님 ' + notClassic.length + '건: ' + notClassic.slice(0, 3).map(x => x.g + '.' + x.m + ' ' + x.t).join(' | '));
const banned = gists.filter(x => Q.checkText(x.t, 'tojeong').length);
ok(!banned.length, '금지 표현 ' + banned.length + '건: ' + banned.slice(0, 3).map(x => x.g + '.' + x.m + ' ' + x.t).join(' | '));

// 2) 상세풀이는 존댓말 그대로
const detail = [];
for (const g of Object.keys(M)) for (const k of ['overview', 'good', 'caution']) (M[g][k] || []).forEach(t => detail.push({ g, k, t }));
const notPolite = detail.filter(x => !/요[.!?]?(?:\([^)]*\)\.?)?$/.test(x.t.trim()));
ok(!notPolite.length, '상세풀이가 존댓말이 아님 ' + notPolite.length + '건: ' + notPolite.slice(0, 3).map(x => x.g + x.k + ' ' + x.t).join(' | '));
const deep = (globalThis.TojeongMonthDeep || {}).DEEP || {};
let deepN = 0, deepBad = [];
for (const [g, d] of Object.entries(deep)) for (const [m, v] of Object.entries((d && d.months) || {})) for (const k of ['life', 'do', 'avoid']) if (v[k]) { deepN++; if (!/요[.!?]?$/.test(v[k].trim())) deepBad.push(g + '.' + m + '.' + k + ' ' + v[k]); }
ok(!deepBad.length, '월별 심화가 존댓말이 아님 ' + deepBad.length + '건: ' + deepBad.slice(0, 3).join(' | '));

// 3) 고전체 단정 예언은 품질 검사가 막는다
for (const s of ['올해는 집안이 망하리라.', '물가에 가면 죽으리라.', '이달엔 사고가 나리라.', '재물을 잃으리라.']) ok(Q.checkText(s, 'tojeong').some(p => p === '단정 예언'), '단정 예언 검출: ' + s);

(async () => {
  // 4) 만세력 보조선 API: 검수한 괘의 달 선택 풀이 = 고전체 원문 해석
  await import(url.pathToFileURL(path.join(root, 'functions/_newyear-runtime.js')).href);
  const api = await import(url.pathToFileURL(path.join(root, 'functions/api/newyear/months.js')).href);
  const store = new Map();
  const KV = { async get(k, t) { const v = store.has(k) ? store.get(k) : null; return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { store.set(k, v); } };
  const env = { GLOSSARY_KV: KV, ADMIN_PASSWORD: 'adm' };
  const call = async b => { const r = await api.onRequestPost({ env, request: new Request('http://x/api/newyear/months', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(b) }) }); return r.json(); };
  const birth = { year: 1988, month: 3, day: 14, hour: 9, minute: 0, calendar: 'solar', leap: false, gender: 'F' };
  const G = (await call({ birth, year: 2027 })).gua;
  store.set('newyear:content', JSON.stringify({ rev: 1, modern: { [G]: { status: 'reviewed' } }, blocks: {}, history: [] }));
  const d = await call({ birth, year: 2027 }), ms = d.reading.chapters[0].months;
  const gl = ms.map(m => m.paras.find(p => !/^토정비결 \d+월/.test(p.text))).filter(Boolean);
  ok(gl.length && gl.every(p => !POLITE.test(p.text) && CLASSIC_END.test(p.text)), 'API 달 풀이 고전체(' + G + '괘 ' + gl.length + '달)');

  // 5) 신년운세 조합: 원문 해석 줄(tojeong)은 고전체, 그 밖 상세풀이 문단은 존댓말
  const C = globalThis.NewyearCompose;
  if (C && typeof C.compose === 'function') {
    const r = C.compose({ birth, targetYear: 2027, mode: 'preview' });
    const paras = []; (r.chapters || []).forEach(ch => { (ch.paras || []).forEach(p => paras.push(p)); (ch.months || []).forEach(mm => (mm.paras || []).forEach(p => paras.push(p))); });
    const tj = paras.filter(p => p.role === 'tojeong' && !/^(토정비결 \d+월|괘의 첫 글귀)/.test(p.text));
    ok(tj.every(p => !POLITE.test(p.text)), '조합 원문 해석 줄 존댓말 0');
    const exp = paras.filter(p => ['situation', 'advice', 'life', 'do', 'avoid', 'next', 'note'].includes(p.role));
    ok(exp.length && exp.every(p => !/(?:리라|니라)\.$/.test(p.text)), '조합 상세풀이는 고전체로 바뀌지 않음');
  }
  console.log('tojeong-classical-sim: ' + n + '항목 통과 (원문 해석 ' + gists.length + '줄 · 상세풀이 ' + detail.length + '줄 · 월별 심화 ' + deepN + '칸)');
})().catch(e => { console.error(e.message); process.exit(1); });
