// 소원 성취 명당(wish-spots.js) 점수·순위 검증 — 장소는 전부 가짜 fixture(실제 장소 아님)
//   node tests/wish-spots-sim.cjs [차트 수=400]
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
const M = globalThis.Manse; let netCalls = 0; globalThis.fetch = () => { netCalls++; throw new Error('network call'); };
for (const f of ['region-gu-data.js', 'region-data.js', 'region-reading-data.js', 'region-reading.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const src = fs.readFileSync(path.join(root, 'wish-spots.js'), 'utf8'); vm.runInThisContext(src, { filename: 'wish-spots.js' });
const WS = globalThis.MantraWishSpots, RG = globalThis.MantraRegion, RR = globalThis.MantraRegionReading;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const EL = ['목', '화', '토', '금', '수'];
const rnd = (() => { let s = 24680; return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296; })();
const mk = () => { for (;;) { try { return M.compute({ year: 1900 + Math.floor(rnd() * 140), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { } } };
const SRC = { name: '테스트 출처', url: 'https://example.com/test', checked: '2026-11-03' };
// 가짜 장소 40곳: 17개 도시 주변 + 외곽 격자, 유형·태그 순환
const wishIds = WS.WISH.map(w => w.id), typeIds = Object.keys(WS.TYPES), spots = [];
RG.REGIONS.forEach((r, i) => { spots.push({ id: 'test-' + r.id, name: '테스트 장소 ' + r.name, lat: r.lat + 0.12, lon: r.lon + 0.1, type: typeIds[i % typeIds.length], tags: [wishIds[i % 6], wishIds[(i + 2) % 6]], source: SRC, note: '', on: true }); });
for (let i = 0; i < 23; i++) spots.push({ id: 'test-g' + i, name: '테스트 격자 ' + i, lat: 34 + (i % 6) * 0.8, lon: 126 + Math.floor(i / 6) * 1.1 + (i % 3) * 0.2, type: typeIds[i % typeIds.length], tags: i % 5 === 0 ? ['general'] : [wishIds[i % 6]], source: SRC, on: true });
ok(spots.length === 40, '가짜 장소 40곳');
spots.forEach(s => ok(!WS.validateSpot(s, true).error, 'fixture 검증 ' + s.id + ': ' + (WS.validateSpot(s, true).error || '')));

// ───────── 입력 검증 ─────────
const bad = [['출처 없음', { ...spots[0], source: undefined }], ['http 주소', { ...spots[0], source: { ...SRC, url: 'http://x.com' } }], ['날짜 형식', { ...spots[0], source: { ...SRC, checked: '2026/11/03' } }], ['없는 날짜', { ...spots[0], source: { ...SRC, checked: '2026-13-45' } }], ['위도 범위', { ...spots[0], lat: 50 }], ['경도 범위', { ...spots[0], lon: 100 }], ['유형', { ...spots[0], type: 'x' }], ['태그 없음', { ...spots[0], tags: [] }], ['알 수 없는 태그', { ...spots[0], tags: ['zzz'] }], ['이름', { ...spots[0], name: ' ' }], ['비고 길이', { ...spots[0], note: 'a'.repeat(201) }]];
bad.forEach(([m, s]) => ok(!!WS.validateSpot(s, true).error, `${m}가 거부되지 않음`));
ok(!WS.validateSpot({ ...spots[0], note: '반드시 이루어지는 곳' }, true).error, '금지 표현 검사는 하지 않는다');

// ───────── 점수·순위 ─────────
const N = +process.argv[2] || 400, charts = []; while (charts.length < N) charts.push(mk());
const snaps = charts.slice(0, 20).map(c => JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]));
const base = { lat: RG.get('jeonju').lat, lon: RG.get('jeonju').lon, name: '전주(테스트 기준)' };
const wsum = WS.WEIGHTS.dir + WS.WEIGHTS.wish + WS.WEIGHTS.tag + WS.WEIGHTS.dist; ok(wsum === 100, '가중치 합 100');
const tops = {}, allTops = {}; let diffWish = 0;
charts.forEach((c, ci) => {
  const r = WS.rank(M, c, spots, base, 'wealth');
  ok(r.items.length === 40, '장소 수'); ok(r.items.every((x, i) => x.rank === i + 1 && (i === 0 || r.items[i - 1].score >= x.score)), '점수 내림차순·순위 번호');
  r.items.forEach(x => { ok(Number.isInteger(x.score) && x.score >= 0 && x.score <= 100, '점수 범위 ' + x.score); Object.values(x.parts).forEach(p => ok(p >= 0 && p <= 100, '세부 점수 범위')); const calc = Math.round((40 * x.parts.dir + 30 * x.parts.wish + 20 * x.parts.tag + 10 * x.parts.dist) / 100); ok(calc === x.score, '총점이 가중 평균과 다름'); ok(x.reasons.length === 4 && x.reasons.every(t => typeof t === 'string' && !/undefined|NaN/.test(t)), '근거 문장'); });
  tops[r.items[0].id] = (tops[r.items[0].id] || 0) + 1;
  // 독립 재계산: 소원 오행·역할 계수·거리·태그
  const dEl = M.stemEl(c.pillars.day.s), eg = (dEl + 2) % 5; ok(r.wish.element === EL[eg], '재물 소원 오행은 재성');
  const x = r.items[Math.floor(rnd() * 40)], dr = RG.directionFrom(base, x), E = EL.indexOf(dr.element);
  const rel = E === eg ? 100 : (E + 1) % 5 === eg ? 85 : (eg + 1) % 5 === E ? 55 : (eg + 2) % 5 === E ? 40 : 20;
  const V = { 용신: 2, 희신: 1, 한신: 0, 구신: -1, 기신: -2 }, re = c.yongAll.eokbu.roles[eg], jo = c.yongAll.johu, rj = jo && jo.applicable !== false && jo.roles ? jo.roles[eg] : null;
  const avg = (V[re] + (rj ? V[rj] : V[re])) / (rj ? 2 : 1) / (rj ? 1 : 1); const vals = rj ? (V[re] + V[rj]) / 2 : V[re]; const f = Math.min(1, Math.max(0.4, 0.7 + 0.15 * vals));
  ok(x.parts.wish === Math.round(rel * f), `소원 점수 재계산 불일치 ${x.parts.wish} vs ${Math.round(rel * f)}`);
  ok(x.distKm === dr.distKm && x.parts.dist === (dr.distKm <= 30 ? 100 : dr.distKm >= 300 ? 20 : Math.round(100 - (dr.distKm - 30) * 80 / 270)), '거리 점수');
  WS.WISH.forEach(w => { allTops[w.id + ':' + WS.rank(M, c, spots, base, w.id).items[0].id] = 1; });
  const w2 = WS.rank(M, c, spots, base, 'study'); if (w2.items[0].id !== r.items[0].id) diffWish++;
  ok(w2.wish.element === EL[(dEl + 4) % 5], '학업 소원 오행은 인성');
  const lv = WS.rank(M, c, spots, base, 'love'); ok(lv.wish.element === EL[(dEl + (c.gender === 'F' ? 3 : 2)) % 5], '인연 소원 오행은 성별에 따라 재성/관성');
  const gn = WS.rank(M, c, spots, base, 'general'); ok(gn.items.every(y => y.parts.wish === y.parts.dir), '종합은 방위 점수를 그대로 따름'); ok(gn.wish.element === null, '종합은 소원 오행 없음');
  const hl = WS.rank(M, c, spots, base, 'health'); ok(hl.wish.element === EL[c.yongAll.eokbu.yong], '건강 소원 오행은 억부 용신');
});
console.log(`소원 분야별 1위가 달라지는 사주 ${(diffWish / N * 100).toFixed(0)}% · 재물 1위 장소 종류 ${Object.keys(tops).length}가지`);
ok(Object.keys(tops).length >= 4, '사주가 달라도 1위가 거의 같음(' + Object.keys(tops).length + ')'); ok(Object.keys(allTops).length >= 10, '소원 분야·사주를 합쳐도 1위 조합이 너무 적음(' + Object.keys(allTops).length + ')'); ok(diffWish / N > 0.2, '소원 분야를 바꿔도 순위가 거의 안 바뀜');
// 태그 효과: 같은 장소에서 태그만 바꾸면 (100-25)*0.2 = 15점 차이
{ const c = charts[0], a = WS.rank(M, c, [{ ...spots[0], tags: ['wealth'] }], base, 'wealth').items[0], b = WS.rank(M, c, [{ ...spots[0], tags: ['study'] }], base, 'wealth').items[0]; ok(a.score - b.score === 15 || Math.abs(a.score - b.score - 15) <= 1, '태그 일치 효과 ' + (a.score - b.score)); ok(a.parts.tag === 100 && b.parts.tag === 25, '태그 점수'); const g = WS.rank(M, c, [{ ...spots[0], tags: ['general'] }], base, 'wealth').items[0]; ok(g.parts.tag === 65, '종합 태그 점수'); }
// 거리 효과: 같은 방향의 더 가까운 장소가 거리 점수가 높다
{ const c = charts[1], near = { ...spots[1], id: 'near', lat: base.lat + 0.1, lon: base.lon }, far = { ...spots[1], id: 'far', lat: base.lat + 2, lon: base.lon }, r = WS.rank(M, c, [near, far], base, 'general'); const n = r.items.find(x => x.id === 'near'), f = r.items.find(x => x.id === 'far'); ok(n.parts.dist > f.parts.dist && n.direction === f.direction, '가까운 장소의 거리 점수가 더 높아야 함'); }
// 비활성 장소 제외·빈 목록
{ const c = charts[2], r = WS.rank(M, c, spots.map((s, i) => ({ ...s, on: i % 2 === 0 })), base, 'wealth'); ok(r.items.length === 20, '비활성 장소 제외'); ok(WS.rank(M, c, [], base, 'wealth').items.length === 0, '빈 목록'); ok(WS.rank(M, c, spots, base, 'zzz').wish.id === 'general', '알 수 없는 소원 분야는 종합'); }
// 거주지 후보 순위: 점수 = round((80*방위 + 20*거리)/100), 내림차순, 후보를 만들지 않음, 원국 불변
{ const c = charts[3], b2 = RG.get('jeonju'), sg = RG.suggestBasis(b2, c.yongAll.eokbu.roles, null, 'eokbu'); const cands = sg ? sg.groups.reduce((x, g) => x.concat(g.list), []) : [];
  const r = WS.rankCandidates(M, c, cands.concat(cands.slice(0, 3)), { mode: 'eokbu' });
  ok(r.items.length === new Set(cands.map(x => x.id)).size, '후보 중복 제거·개수'); ok(r.weights.dir + r.weights.dist === 100, '거주지 가중치 합');
  r.items.forEach((x, i) => { ok(x.rank === i + 1 && (i === 0 || r.items[i - 1].score >= x.score), '거주지 순위 정렬'); ok(Math.round((80 * x.parts.dir + 20 * x.parts.dist) / 100) === x.score, '거주지 총점 계산'); ok(cands.some(y => y.id === x.id), '새 후보가 생김'); });
  ok(WS.rankCandidates(M, c, [], {}).items.length === 0, '빈 후보'); }
// 불변식
charts.slice(0, 20).forEach((c, i) => ok(JSON.stringify([c.pillars, c.weights, c.yongAll, c.strength]) === snaps[i], '명당 분석이 원국을 바꿈'));
ok(JSON.stringify(WS.rank(M, charts[0], spots, base, 'wealth')) === JSON.stringify(WS.rank(M, charts[0], spots, base, 'wealth')), '같은 입력 다른 결과'); ok(netCalls === 0, 'AI·네트워크 호출 ' + netCalls);
ok(!/luck|daeun|seun|wolun|ilun|대운|세운/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '').replace(/'[^']*'/g, "''")), '명당 계산이 운 데이터를 참조함');
ok(!/BAN|금지|반드시|무조건/.test(src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')), '금지 표현 검사 코드가 남아 있음');
console.log(fails.length ? `\n실패 ${fails.length}건\n - ` + [...new Set(fails)].slice(0, 30).join('\n - ') : '\n모든 검증 통과');
process.exit(fails.length ? 1 : 0);
