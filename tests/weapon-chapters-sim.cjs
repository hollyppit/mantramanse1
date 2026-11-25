// 주무기 상세풀이 블록(report/v2/weapon-chapters.js) 검증:  node tests/weapon-chapters-sim.cjs [--write]
//  표본: 감사 dev 300 생성식 + 같은 300을 시간 모름으로. 블록 조립은 실제 경로(reading-feature.js build)와 주제별 미리보기(preview) 둘 다 본다.
//  1 모든 주제가 같은 주무기 판정(MantraWeapon.analyze)을 참조  2 주제별 해석 방향이 다름(주제마다 고유 소제목)  3 주제 사이 문장 중복 없음
//  4 대운·세운·월운 연결(지금 대운 간지·세운 연도가 timeline 과 일치)  5 활성도·유리도 분리(유리도 = 엔진 등급)  6 주무기 없음·미확정 → 종합만 안내, 나머지 생략
//  7 시간 모름 → 시주 근거 없음  8 기존 장 블록: 스위치 끔이면 모듈 없을 때와 같은 결과  9 결제·잠금 코드 미참조  10 관리자 설정: 서버 검증·질문별 끄기·데이터 항목 끄기
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' }); globalThis.window = globalThis;
['luck-grade', 'gyeok-structure', 'wealth-career-data', 'wealth-career-data-2', 'wealth-career-data-3', 'wealth-career-jobs', 'wealth-career', 'element-strategy', 'aptitude-data', 'aptitude'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), { filename: f }));
['ilju-data', 'saju-data', 'deep', 'deep-life', 'deep-time', 'deep-wealth', 'deep-love', 'reading-feature-data-1', 'reading-feature-data-2', 'reading-feature', 'reading-text', 'aptitude-chapters-data', 'aptitude-chapters'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f }));
const M = globalThis.Manse, R = globalThis.ReportV2, FEAT = R.ReadingFeature, now = Date.UTC(2026, 10, 26);
const wf = (c, H) => { Object.defineProperty(c, 'readingFeature', { value: H, writable: true, configurable: true, enumerable: false }); return c; };
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const EL_K = ['목', '화', '토', '금', '수'];
const txt = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const sentences = h => txt(h).split(/(?<=[.!?요])\s+/).map(s => s.trim()).filter(s => s.length >= 18);
let fails = 0; const T = (n, f) => { try { f(); } catch (e) { fails++; if (fails < 25) console.log('✗', n, '—', e.message.split('\n')[0]); } };

// ── 8. 기존 장: 모듈을 올리기 전 build 결과 ──
const IDS = ['timeline_self_25', 'timeline_wealth_02', 'timeline_career_04', 'timeline_love_04', 'timeline_self_37', 'timeline_wealth_14', 'timeline_career_01', 'timeline_self_26'];
const SAMPLE8 = dev.slice(0, 40);
const buildAll = () => SAMPLE8.map(inp => { const ch = M.compute(inp), sd = R.SajuData.build(ch, { now }); return IDS.map(id => { const o = FEAT.build(wf({ id, editorialContractId: id }, { M, ch, sd, now, name: '', assets: {}, videos: {} })); return (o ? (o.lead || '') + (o.rest || '') : '').replace(/data-sc="dp_x_\d+"/g, ''); }); });   // data-sc 번호는 기존 블록의 호출 순번이라 지운다
const before = JSON.stringify(buildAll());
['weapon-data', 'weapon'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, f + '.js'), 'utf8'), { filename: f }));
['weapon-chapters-data', 'weapon-chapters'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f }));
const WC = R.WeaponChapters, W = globalThis.MantraWeapon;
T('8 스위치 끔 = 모듈 없을 때', () => { WC.on = false; const a = JSON.stringify(buildAll()); if (a !== before) { let k = 0; while (a[k] === before[k]) k++; throw Error('다름 @' + k + ' ' + before.slice(k - 60, k + 60) + ' ⇄ ' + a.slice(k - 60, k + 60)); } });
T('SPEC 에 wp 조각 연결', () => { Object.keys(WC.DEFAULT_ROWS).forEach(id => assert.ok(FEAT.SPEC[id].parts.some(p => p.custom === 'wp:' + id), id)); });

// ── 본 검사 ──
WC.on = true;
const stat = { status: {}, topicShown: { self: 0, wealth: 0, career: 0, love: 0, remedy: 0 }, dupSentences: 0, dupExamples: [], buildShown: {}, avgChars: { self: 0, wealth: 0, career: 0, love: 0, remedy: 0 }, nohour: { selfNote: 0, others: 0 } };
const rows = WC.DEFAULT_ROWS, TOPIC_ID = {}; Object.keys(rows).forEach(id => { if (rows[id].view !== 'graph') TOPIC_ID[rows[id].topic] = id; });
const GRAPH_IDS = Object.keys(rows).filter(id => rows[id].view === 'graph');
const HEAD = { self: '나의 핵심 주무기', wealth: '경제활동의 주무기', career: '직업적 주무기', love: '관계에서의 주무기', remedy: '주무기로 운을 쓰는 법' };
const results = [];
function runOne(inp, i, tag) {
  const ch = M.compute(inp), H = { M, ch, now, name: '' }, A = W.analyze(M, ch);
  const out = {}; WC.TOPICS.forEach(t => { out[t] = WC.preview(H, t, rows[TOPIC_ID[t]].use); });
  const gout = {}; GRAPH_IDS.forEach(id => { gout[id] = WC.previewRow(H, rows[id]); });
  const sure = A.weapons.length && A.status !== 'undetermined' && A.status !== 'complex';
  // 6 없음·미확정
  // 발현 그래프: 무기가 확정이면 그래프·요약, 아니면 생략. 그래프는 점수 숫자 없이 단계 눈금만
  GRAPH_IDS.forEach(id => { const h = gout[id]; if (!sure) assert.equal(h, null, id + ' 그래프 생략'); else { assert.ok(h && /<svg/.test(h) && /주무기 발현 그래프/.test(h), id + ' 그래프'); const s = txt(h); assert.ok(!/undefined|NaN|\[object|null/.test(s), id + ' 빈 값'); assert.ok(!WC.BANNED.test(s), id + ' 금지 표현'); assert.ok(!/\d+점/.test(s), id + ' 점수 숫자'); stat.graphShown = (stat.graphShown || 0) + 1; } });
  if (!sure) { assert.ok(out.self && /주무기/.test(txt(out.self)), '종합 안내'); ['wealth', 'career', 'love', 'remedy'].forEach(t => assert.equal(out[t], null, t + ' 생략')); }
  else {
    const w = A.weapons[0];
    WC.TOPICS.forEach(t => {
      const h = out[t]; assert.ok(h, t + ' 블록'); const s = txt(h);
      assert.ok(s.includes(HEAD[t]), t + ' 고유 소제목');                                       // 2
      assert.ok(s.includes(EL_K[w.el]), t + ' 같은 주무기 오행');                                 // 1
      assert.ok(!/undefined|NaN|\[object|null/.test(s), t + ' 빈 값: ' + (s.match(/undefined|NaN|\[object|null/) || [])[0]);
      assert.ok(!WC.BANNED.test(s), t + ' 금지 표현: ' + (s.match(WC.BANNED) || [])[0]);
    });
    // 형성 근거는 종합에만
    ['wealth', 'career', 'love', 'remedy'].forEach(t => assert.ok(!/투간|통근\)/.test(txt(out[t])) || t === 'self', t + ' 형성 근거 반복'));
    // 3 주제 사이 문장 중복
    const seen = new Map(); [...WC.TOPICS.map(t => [t, out[t]]), ...GRAPH_IDS.map(id => [id, gout[id]])].forEach(([t, h]) => sentences(h).forEach(x => { if (seen.has(x) && seen.get(x) !== t) { stat.dupSentences++; if (stat.dupExamples.length < 8) stat.dupExamples.push(seen.get(x) + '/' + t + ': ' + x); } else seen.set(x, t); }));
    // 4·5 시기 연결과 두 축
    const tl = W.timeline(M, ch, { fromY: M.yearPillarAt(now).sajuYear, years: 10, wolY: M.yearPillarAt(now).sajuYear });
    let di = -1; tl.daeun.forEach((r, k) => { if (r.startMs <= now) di = k; });
    if (di >= 0) assert.ok(txt(out.self).includes(tl.daeun[di].gz), '종합: 지금 대운 간지');
    const re = /(\d{4})년 (\S\S) [^가-힣]*주무기 활성도 (\S+(?: \S+)?) · 활용 유리도 (좋음|무난|조심)/g; let m, n = 0;
    WC.TOPICS.forEach(t => { const s = txt(out[t]); while ((m = re.exec(s))) { const r = tl.seun.find(x => x.year === +m[1]); assert.ok(r, t + ' 세운 연도'); assert.equal(r.gz, m[2], t + ' 세운 간지'); assert.equal(r.favor.n, m[4], t + ' 유리도=엔진 등급'); assert.ok(m[3].startsWith(((r.acts && r.acts[0]) || r.best).levelK.split(' ')[0]), t + ' 활성도(1순위 주무기)'); n++; } });
    stat.linkedSeun = (stat.linkedSeun || 0) + n;
    WC.TOPICS.forEach(t => { stat.topicShown[t]++; stat.avgChars[t] += txt(out[t]).length; });
  }
  if (tag === 'nohour') { assert.ok(!/(시간|시지|시주) [一-鿿]/.test(WC.TOPICS.map(t => txt(out[t])).join(' ')), '7 시간 모름에 시주 근거(실제 시주 글자, 안내 문장 제외)'); if (!sure) stat.nohour.selfNote++; else stat.nohour.others++; }
  return { A, out };
}
dev.forEach((inp, i) => T('dev#' + i, () => { const { A, out } = runOne(inp, i, 'main'); stat.status[A.status] = (stat.status[A.status] || 0) + 1; results.push({ i, chart: `${inp.year}-${inp.month}-${inp.day} ${inp.hour}시 ${inp.gender}`, status: A.status, weapon: A.weapons.map(w => EL_K[w.el] + '(' + w.groupName + ')').join('·'), shown: Object.keys(out).filter(t => out[t]), chars: Object.fromEntries(Object.entries(out).map(([t, h]) => [t, txt(h).length])) }); }));
dev.forEach((inp, i) => T('nohour#' + i, () => runOne({ ...inp, hour: null }, i, 'nohour')));

// 실제 조립 경로(build)로 붙는지 — 장별 설정 끄기·데이터 항목 끄기 포함
T('build 경로', () => {
  dev.slice(0, 30).forEach(inp => {
    const ch = M.compute(inp), sd = R.SajuData.build(ch, { now }), A = W.analyze(M, ch), sure = A.weapons.length && A.status !== 'undetermined' && A.status !== 'complex';
    Object.keys(rows).forEach(id => { const o = FEAT.build(wf({ id, editorialContractId: id }, { M, ch, sd, now, name: '', assets: {}, videos: {} })), s = o ? (o.lead || '') + (o.rest || '') : ''; const has = /dp-wp/.test(s); if (has) stat.buildShown[id] = (stat.buildShown[id] || 0) + 1; if (rows[id].topic !== 'self' && !sure) assert.ok(!has, id + ' 무기 없음인데 블록'); });
  });
  assert.ok(Object.keys(stat.buildShown).length === Object.keys(rows).length, '다섯 장 모두 붙음: ' + JSON.stringify(stat.buildShown));
});
T('10 질문별 끄기·데이터 항목 끄기', () => {
  const inp = dev.find(x => { const A = W.analyze(M, M.compute(x)); return A.weapons.length === 2 && A.status === 'dual'; }), ch = M.compute(inp), sd = () => R.SajuData.build(ch, { now });
  const r2 = JSON.parse(JSON.stringify(rows)); r2.timeline_wealth_02.on = false; r2.timeline_self_25.use.second = false; r2.timeline_self_25.use.daeun = false; r2.timeline_self_25.use.seun = false;
  WC.setConfig({ version: 3, rows: r2 });
  const b = id => { const o = FEAT.build(wf({ id, editorialContractId: id }, { M, ch, sd: sd(), now, name: '', assets: {}, videos: {} })); return o ? (o.lead || '') + (o.rest || '') : ''; };
  assert.ok(!/dp-wp/.test(b('timeline_wealth_02')), '끈 질문');
  const s = txt(b('timeline_self_25')); assert.ok(/dp-wp/.test(b('timeline_self_25')), '종합 켜짐'); assert.ok(!s.includes('보조 주무기와의 결합'), '2순위 끔'); assert.ok(!s.includes('타고난 강점이 겉으로 부각되는 시기'), '운 데이터 끔');
  assert.equal(WC.sanitize({ rows: { timeline_self_35: { topic: 'self' }, timeline_creative_01: { topic: 'self' }, timeline_self_h2: { topic: 'self' } } }).rows && Object.keys(WC.sanitize({ rows: { timeline_self_35: { topic: 'self' } } }).rows).length, 0, '건강·전생 장 거부');
  WC.setConfig({ version: 0, rows: WC.DEFAULT_ROWS });
});
T('9 결제·잠금 코드 미참조', () => { const s = fs.readFileSync(path.join(root, 'report/v2/weapon-chapters.js'), 'utf8'); assert.ok(!/Paywall|chapterGate|readingLocked|commerce|ownedWorlds|price/.test(s)); });
T('문안 금지 표현', () => { const walk = o => typeof o === 'string' ? assert.ok(!WC.BANNED.test(o), o) : o && typeof o === 'object' && Object.values(o).forEach(walk); walk(R.WeaponChaptersData); });

(async () => {
  // 10 서버 API 검증(ESM)
  try {
    const api = await import('file://' + path.join(root, 'functions/api/weapon-links.js').replace(/\\/g, '/'));
    const ok = api.cleanRows({ timeline_wealth_06: { topic: 'wealth', on: true, use: { first: true, seun: true } } });
    assert.ok(ok.rows && ok.rows.timeline_wealth_06.use.seun === true && ok.rows.timeline_wealth_06.use.daeun === false);
    assert.ok(api.cleanRows({ timeline_self_35: { topic: 'self' } }).error, '건강 장 거부');
    assert.ok(api.cleanRows({ timeline_creative_02: { topic: 'self' } }).error, '전생 장 거부');
    assert.ok(api.cleanRows({ timeline_self_25: { topic: 'health' } }).error, '없는 주제 거부');
    assert.ok(api.cleanRows({ timeline_self_25: { topic: 'self', use: { hack: true } } }).error, '없는 항목 거부');
    assert.ok(api.cleanRows({ timeline_wealth_14: { topic: 'wealth', view: 'graph', scope: 'year' } }).error, '없는 그래프 범위 거부');
    assert.ok(api.cleanRows({ timeline_wealth_14: { topic: 'wealth', view: 'chart' } }).error, '없는 형태 거부');
    const gr = api.cleanRows({ timeline_wealth_14: { topic: 'wealth', view: 'graph', scope: 'seun', use: { activation: true } } }); assert.ok(gr.rows && gr.rows.timeline_wealth_14.view === 'graph' && gr.rows.timeline_wealth_14.scope === 'seun', '그래프 줄 저장');
    const store = {}, env = { ADMIN_PASSWORD: 'pw-test', GLOSSARY_KV: { get: async (k) => store[k] ? JSON.parse(store[k]) : null, put: async (k, v) => { store[k] = v; } } };
    const req = (m, body, auth) => new Request('https://x/api/weapon-links', { method: m, headers: { 'content-type': 'application/json', ...(auth ? { authorization: 'Bearer pw-test' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let r = await api.onRequestGet({ env }); let d = await r.json(); assert.equal(d.version, 0); assert.ok(!d.rows, '저장값 없으면 rows 없음');
    r = await api.onRequestPut({ request: req('PUT', { rows: WC.DEFAULT_ROWS }), env }); assert.equal(r.status, 401, '관리자만');
    r = await api.onRequestPut({ request: req('PUT', { rows: WC.DEFAULT_ROWS }, true), env }); d = await r.json(); assert.equal(r.status, 200); assert.equal(d.version, 1);
    r = await api.onRequestPut({ request: req('PUT', { rows: WC.DEFAULT_ROWS, expectVersion: 0 }, true), env }); assert.equal(r.status, 409, '버전 충돌');
    r = await api.onRequestGet({ env }); d = await r.json(); assert.equal(Object.keys(d.rows).length, Object.keys(WC.DEFAULT_ROWS).length); assert.deepEqual(WC.sanitize(d).rows, WC.sanitize({ rows: WC.DEFAULT_ROWS }).rows, '화면 설정과 서버 저장값 일치');
  } catch (e) { fails++; console.log('✗ 10 서버 API —', e.message); }
  Object.keys(stat.avgChars).forEach(t => stat.avgChars[t] = stat.topicShown[t] ? Math.round(stat.avgChars[t] / stat.topicShown[t]) : 0);
  console.log(JSON.stringify(stat));
  if (process.argv.includes('--write')) fs.writeFileSync(path.join(root, 'docs/weapon-analysis/paid-content-300.json'), JSON.stringify({ version: WC.VERSION, rows: WC.DEFAULT_ROWS, stat, results }, null, 1));
  console.log(fails ? `✗ ${fails}건 실패` : '✓ 주무기 상세풀이 블록 검증 통과 (300 + 시간 모름 300)');
  process.exit(fails ? 1 : 0);
})();
