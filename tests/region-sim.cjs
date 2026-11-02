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
// 6 용신 역할 연결(fit): 엔진의 역할표를 그대로 읽고, 상생·상극을 새로 계산하지 않으며, 원국은 바뀌지 않는다
{
  const ch2 = M.compute(inp), roles = ch2.yong.roles, EL = ['목', '화', '토', '금', '수'];
  const snap = JSON.stringify([ch2.pillars, ch2.weights, ch2.yong]);
  EL.forEach((e, i) => { const f = R.fit(e, roles); ok(f.role === roles[i], 'fit 역할 불일치 ' + e); ok(/(니다|세요).$/.test(f.text) && !BAN.test(f.text), 'fit 문장 ' + e); ok((f.tone === 'good') === (roles[i] === '용신' || roles[i] === '희신') && (f.tone === 'bad') === (roles[i] === '기신' || roles[i] === '구신'), 'fit tone ' + e); });
  ok(R.fit('수', null).tone === 'none' && R.fit('x', roles).tone === 'none', 'fit 정보 없음 처리');
  R.REGIONS.forEach(r => R.fit(R.tradition(r).element, roles));
  ok(JSON.stringify([ch2.pillars, ch2.weights, ch2.yong]) === snap, 'fit이 원국을 바꿈');
}
// 7 시·군·구: 데이터 정합성·시·도 면적 중심 기준 방위·경계/중앙 표시·원국 불변
{
  const GD = require(path.join(root, 'region-gu-data.js')); globalThis.MantraRegionGu = GD;
  ok(GD.GU.length === 250 && GD.PROVINCES.length === 17 && new Set(GD.GU.map(g => g[0])).size === 250, '시·군·구 250/시·도 17/코드 중복');
  ok(GD.GU.every(g => g[2] > 33 && g[2] < 39 && g[3] > 124.5 && g[3] < 131.0 && GD.PROVINCES.some(p => p[0] === g[0].slice(0, 2))), '좌표 범위·시·도 코드');
  ok(R.provinces().length === 17 && R.guList('11').length === 25 && R.guList('31').length === 42, '시·도별 구 개수(서울 25·경기 42)');
  // 알려진 지리와 대조: 서울 안에서 강남은 남동, 종로는 북, 부산에서 해운대는 동, 제주에서 서귀포는 남쪽(남 또는 경계), 제주시는 북쪽
  const dir = c => R.tradition(R.get('gu:' + c));
  ok(dir('11230').direction === '남동' && dir('11010').direction === '북' && dir('21090').direction === '동', '서울·부산 구 방위');
  ok(['남'].includes(dir('39020').direction) && dir('39010').direction === '북', '제주 방위');
  ok(dir('29010').direction === '중앙', '세종(단일 구)은 중앙');
  let near = 0, mid = 0; GD.GU.forEach(g => { const t = dir(g[0]); ok(t.kind === 'symbolic' && /면적 중심/.test(t.refPoint) && /더해지지 않/.test(t.note) && ['목', '화', '토', '금', '수'].includes(t.element), '구 해석 형식 ' + g[1]); if (t.near) { near++; ok(t.basis.includes('경계'), '경계 문구 ' + g[1]); } if (t.direction === '중앙') mid++; });
  ok(near > 0 && near < 125 && mid > 0, '경계 ' + near + '·중앙 ' + mid);
  ok(R.get('gu:00000') === null && R.get('seoul').id === 'seoul', '없는 코드/기존 도시');
  const ch3 = M.compute(inp), snap3 = JSON.stringify([ch3.pillars, ch3.weights, ch3.yong]); GD.GU.forEach(g => R.fit(dir(g[0]).element, ch3.yong.roles)); ok(JSON.stringify([ch3.pillars, ch3.weights, ch3.yong]) === snap3, '구 단위 연결이 원국을 바꿈');
}
// 8 읍·면·동 / 시·도 단계: 데이터 정합성·한 단계 위 기준 방위·지연 로드·원국 불변
{
  const DD = require(path.join(root, 'region-dong-data.js')); globalThis.MantraRegionDong = DD;
  const GD = globalThis.MantraRegionGu, guSet = new Set(GD.GU.map(g => g[0]));
  ok(DD.DONG.length === 3504 && new Set(DD.DONG.map(d => d[0])).size === 3504, '읍·면·동 3504/코드 중복');
  ok(DD.DONG.every(d => d[0].length === 7 && guSet.has(d[0].slice(0, 5)) && d[2] > 33 && d[2] < 39 && d[3] > 124.5 && d[3] < 131.0), '읍·면·동 코드·시·군·구 연결·좌표');
  ok(GD.GU.every(g => R.dongList(g[0]).length > 0) && DD.GUREF.length === 250, '모든 시·군·구에 동이 있음/기준점 250');
  ok(R.dongReady() === true, 'dongReady');
  const dn = (gu, name) => { const d = R.dongList(gu).find(x => x.name === name); return d && R.get(d.id); };
  // 알려진 지리(강남구 안): 압구정동은 북서, 일원1동은 동쪽, 개포1동은 남쪽, 삼성1동은 북쪽
  const dd = (gu, name) => R.tradition(dn(gu, name)).direction;
  ok(dd('11230', '압구정동') === '북서' && dd('11230', '일원1동') === '동' && dd('11230', '개포1동') === '남' && dd('11230', '삼성1동') === '북', '강남구 안 동 방위');
  ok(R.tradition(dn('11230', '압구정동')).refPoint === '서울 강남구 면적 중심', '동의 기준점은 소속 시·군·구');
  let near = 0, mid = 0; DD.DONG.forEach(d => { const r = R.get('dong:' + d[0]), t = R.tradition(r); ok(r && t.kind === 'symbolic' && /면적 중심/.test(t.refPoint) && /더해지지 않/.test(t.note) && ['목', '화', '토', '금', '수'].includes(t.element), '동 해석 형식 ' + d[0]); if (t.near) { near++; ok(t.basis.includes('경계'), '동 경계 문구 ' + d[0]); } if (t.direction === '중앙') mid++; });
  ok(near > 100 && near < 1800 && mid > 100, '동 경계 ' + near + '·중앙 ' + mid);
  // 시·도 단계: 전국 기준점(대전)에서 본 방위, 시·군·구 단계와 같은 규칙
  ok(R.tradition(R.get('prov:11')).direction === '북' && R.tradition(R.get('prov:39')).direction === '남' && R.tradition(R.get('prov:11')).refPoint.indexOf('대전') >= 0, '시·도 단계 방위');
  ok(R.nearestGu(35.8242, 127.1480).startsWith('gu:35') && R.nearestGu(33.4996, 126.5312).startsWith('gu:39'), '도시 점 → 가까운 시·군·구');
  ok(R.get('dong:0000000') === null && R.get('prov:99') === null, '없는 코드');
  // 지연 로드: 동 데이터는 화면 첫 로드에 포함되지 않고 필요할 때만 불러온다
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ok(!/<script[^>]+region-dong-data\.js/.test(html) && /regEnsureDong/.test(html) && /region-gu-data\.js/.test(html), '동 데이터 지연 로드');
  const ch4 = M.compute(inp), snap4 = JSON.stringify([ch4.pillars, ch4.weights, ch4.yong]); DD.DONG.forEach(d => R.fit(R.tradition(R.get('dong:' + d[0])).element, ch4.yong.roles)); ok(JSON.stringify([ch4.pillars, ch4.weights, ch4.yong]) === snap4, '동 단위 연결이 원국을 바꿈');
}
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과 · 지역 ' + R.REGIONS.length + '곳 · 통계 항목은 출처 확인 전까지 모두 자료 부족');
