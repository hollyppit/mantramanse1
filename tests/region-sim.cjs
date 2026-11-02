// 지역 데이터 모듈(region-data.js) 검증: 자료 부족 처리·방위 기준·원국 불변·단정 표현 금지
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
const M = globalThis.Manse, R = require(path.join(root, 'region-data.js')), LI = require(path.join(root, 'luck-interpret.js'));
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const BAN = /반드시|확실히|무조건|보장합니다|재물운이 (좋아집니다|올라갑니다)/;
// 1 구조
ok(R.REGIONS.length >= 15 && new Set(R.REGIONS.map(r => r.id)).size === R.REGIONS.length, '지역 id 중복/부족');
R.REGIONS.forEach(r => { ok(r.lat > 33 && r.lat < 39 && r.lon > 125 && r.lon < 130.5, '좌표 범위 ' + r.id); ok(r.tz === 'Asia/Seoul' && r.country === 'KR', '국가/시간대 ' + r.id); ok(R.FACT_KEYS.every(k => k in r.facts), '항목 누락 ' + r.id); });
// 2 데이터 없음 → 임의 생성 금지, 자료 부족 표기
R.REGIONS.forEach(r => { ok(R.facts(r).every(f => f.value === null && f.status === '자료 부족'), '임의 값 ' + r.id); ok(R.dataCoverage(r).have === 0, '커버리지 ' + r.id); });
const cmp = R.compare(R.get('seoul'), R.get('busan'));
ok(cmp.rows.every(x => x.status === '자료 부족'), '비교 자료 부족 처리'); ok(cmp.distanceKm > 300 && cmp.distanceKm < 340, '서울-부산 거리 ' + cmp.distanceKm);
// 3 방위 기준·분리
const exp = { seoul: '북', busan: '남동', jeju: '남', gangneung: '북동', gwangju: '남', daejeon: '중앙' };
Object.keys(exp).forEach(id => { const t = R.tradition(R.get(id)); ok(t.direction === exp[id], `방위 ${id}: ${t.direction}`); ok(t.refPoint && t.kind === 'symbolic' && /합산되지 않|더해지지 않/.test(t.note), '기준점/상징/합산 금지 문구 ' + id); });
// 4 원국 불변: 지역 함수를 써도 원국·운 계산이 같다
const inp = { year: 1990, month: 3, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
const h = () => JSON.stringify([M.compute(inp).pillars, M.compute(inp).weights, M.compute(inp).yong]);
const before = h(); R.REGIONS.forEach(r => { R.tradition(r); R.compare(r, R.get('jeju')); }); ok(h() === before, '원국 변경됨');
// 5 운세 주제 연결 문장
const ch = M.compute(inp), x = M.seunRange(ch, 2026, 2026)[0], r = LI.build(M, ch, x, 'seun', { daeun: x.daeun });
const lk = R.link(R.get('seoul'), r.topAreas, '이 해');
ok(lk.length === r.topAreas.length && lk.every(l => /자료 부족/.test(l.text)), '연결 문장'); lk.forEach(l => ok(!BAN.test(l.text) && /니다\.?$/.test(l.text.trim()), '연결 문장 형식'));
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과 · 지역 ' + R.REGIONS.length + '곳 · 통계 항목은 출처 확인 전까지 모두 자료 부족');
