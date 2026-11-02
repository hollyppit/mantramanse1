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
// 9 방향 후보(suggest): 기준 지역에서 본 방위·용신/희신만·거리순·본인 구 제외·원국 불변
{
  const GU = globalThis.MantraRegionGu.GU, code = n => GU.find(g => g[1] === n)[0];
  const EL = ['목', '화', '토', '금', '수'], inp2 = { ...inp }, chA = M.compute(inp2), rolesA = chA.yong.roles;
  // 알려진 지리: 서울 종로구에서 해운대구는 남동, 제주시는 남, 강릉시는 동 / 부산 해운대구에서 종로구는 북서 — 해당 오행이 용신·희신인 역할표를 만들어 방향이 후보에 들어오는지 본다
  const allGood = { 0: '용신', 1: '용신', 2: '희신', 3: '희신', 4: '희신' };   // 모든 오행이 후보가 되는 가짜 역할표(방위 계산만 검증)
  const from = (n, roles) => R.suggest(R.get('gu:' + code(n)), roles), dirTo = (n, t) => { const x = from(n, allGood).list.find(c => c.id === 'gu:' + code(t)); return x && x.direction; };
  ok(dirTo('종로구', '해운대구') === '남동' && dirTo('종로구', '제주시') === '남' && dirTo('종로구', '강릉시') === '동' && dirTo('해운대구', '종로구') === '북서', '기준 지역에서 본 방위');
  const sg = from('종로구', allGood);
  ok(sg.list.length === 249 && !sg.list.some(c => c.id === 'gu:' + code('종로구')), '본인 시·군·구 제외/나머지 249곳');
  ok(sg.list.every((c, i, a) => !i || a[i - 1].distKm <= c.distKm), '거리순 정렬');
  ok(sg.list.every(c => c.sameProv === (c.id.slice(3, 5) === '11')), '같은 시·도 구분');
  // 실제 사주: 용신·희신 방향만, 한신·기신·구신 방향은 없다
  const sA = R.suggest(R.get('gu:' + code('종로구')), rolesA), goodEl = new Set(EL.filter((e, i) => ['용신', '희신'].includes(rolesA[i])));
  ok(sA.list.length > 0 && sA.list.every(c => goodEl.has(c.element) && (c.role === '용신' || c.role === '희신') && c.role === rolesA[EL.indexOf(c.element)]), '용신·희신 방향만');
  ok(sA.dirs['용신'].length > 0, '방향 안내');
  const noGood = { 0: '기신', 1: '구신', 2: '한신', 3: '기신', 4: '구신' }; ok(R.suggest(R.get('gu:' + code('종로구')), noGood).list.length === 0, '맞는 방향이 없으면 빈 목록');
  ok(R.suggest(null, rolesA) === null && R.suggest(R.get('gu:' + code('종로구')), null) === null, '입력 없음');
  // 읍·면·동·시·도 단계 기준도 가능, 같은 구에 속한 동이면 그 구를 제외
  const dng = R.dongList(code('강남구'))[0], sD = R.suggest(R.get(dng.id), allGood); ok(sD.list.length === 249 && !sD.list.some(c => c.id === 'gu:' + code('강남구')), '동 기준: 소속 구 제외');
  ok(R.suggest(R.get('prov:11'), allGood).list.length === 250, '시·도 기준');
  const ch5 = M.compute(inp2), snap5 = JSON.stringify([ch5.pillars, ch5.weights, ch5.yong]); R.suggest(R.get('gu:' + code('종로구')), ch5.yong.roles); ok(JSON.stringify([ch5.pillars, ch5.weights, ch5.yong]) === snap5, '후보 계산이 원국을 바꿈');
  const html2 = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); ok(/큰 결정의 근거로 쓰지 마세요/.test(html2) && /점수나 순위가 아니라/.test(html2), '후보 안내 문구');
}
// 10 사주 입력 폼의 거주지: 신기능이 켜졌을 때만 보이고, 사주 계산 입력(S.inp)·저장값과 분리되어 있다
{
  const html3 = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ok(html3.includes('${regFormBlock()}') && html3.includes("MANTRA_FLAGS.region !== true) return ''"), '폼의 거주지 블록은 region 스위치가 켜졌을 때만');
  ok(html3.includes('function regCascade(side, v, label)') && (html3.match(/regCascade\(/g) || []).length >= 4, '카드와 폼이 같은 선택 함수 공유');
  ok(html3.includes('REG[t.dataset.reg] = t.value; regSave(); readForm(); render();'), '지역 선택 시 입력 중이던 폼 값을 먼저 읽어 둠');
  const body = html3.slice(html3.indexOf('function readForm()'), html3.indexOf('function validate()'));
  ok(body.length > 200 && !/REG|prov:|gu:|dong:|home/.test(body), 'readForm(사주 입력 읽기)이 거주지를 읽지 않음');
  ok(!/S\.inp\.(home|residence)|inp\.region/.test(html3), '사주 입력(S.inp)에 거주지 필드 없음');
}
// 11 기준별(억부·조후·병행) 후보와 방위 해석
{
  const chB = M.compute({ year: 1992, month: 6, day: 23, hour: 1, minute: 45, calendar: 'solar', leap: false, gender: 'M', lon: 127.15, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
  const rE = chB.yongAll.eokbu.roles, rJ = chB.yongAll.johu.roles, GU2 = globalThis.MantraRegionGu.GU;
  const home = R.get('gu:' + GU2.find(g => g[1] === '전주시완산구')[0]);
  ok(chB.yongAll.johu.applicable !== false && rJ, '샘플 사주는 조후가 해당됨');
  const sE = R.suggestBasis(home, rE, rJ, 'eokbu'), sJ = R.suggestBasis(home, rE, rJ, 'johu'), sB = R.suggestBasis(home, rE, rJ, 'both');
  const ids = g => new Set(g.list.map(c => c.id)), all = s2 => new Set(s2.groups.flatMap(g => g.list.map(c => c.id)));
  ok(sE.mode === 'eokbu' && JSON.stringify([...all(sE)].sort()) === JSON.stringify(R.suggest(home, rE).list.map(c => c.id).sort()), '억부 기준 = 기존 방향 후보');
  ok(sJ.mode === 'johu' && JSON.stringify([...all(sJ)].sort()) === JSON.stringify(R.suggest(home, rJ).list.map(c => c.id).sort()), '조후 기준 = 조후 역할표 후보');
  const gBoth = sB.groups.find(g => g.key === 'both'), gE = sB.groups.find(g => g.key === 'onlyE'), gJ = sB.groups.find(g => g.key === 'onlyJ');
  ok(sB.mode === 'both' && gBoth && gBoth.elements.join('') === '금' && !gBoth.collapsed && gE && gE.collapsed && gJ && gJ.collapsed, '병행: 둘 다 맞는 방향(금)이 먼저, 한쪽만 맞는 방향은 접힘');
  const eIds = new Set(R.suggest(home, rE).list.map(c => c.id)), jIds = new Set(R.suggest(home, rJ).list.map(c => c.id));
  ok([...ids(gBoth)].every(x => eIds.has(x) && jIds.has(x)) && [...ids(gE)].every(x => eIds.has(x) && !jIds.has(x)) && [...ids(gJ)].every(x => jIds.has(x) && !eIds.has(x)), '병행 그룹의 집합 관계(교집합·차집합)');
  ok(ids(gBoth).size + ids(gE).size === eIds.size && ids(gBoth).size + ids(gJ).size === jIds.size, '병행 그룹이 빠짐없이 나뉨');
  ok(gE.list.every(c => c.otherRole && !['용신', '희신'].includes(c.otherRole)) && gJ.list.every(c => c.otherRole && !['용신', '희신'].includes(c.otherRole)), '한쪽만 맞는 후보의 다른 기준 역할은 용신·희신이 아님');
  ok(R.suggestBasis(home, rE, null, 'both').mode === 'eokbu' && R.suggestBasis(home, rE, null, 'johu').mode === 'eokbu', '조후가 해당 없으면 억부로 처리');
  ok(R.suggestBasis(null, rE, rJ, 'both') === null, '기준 지역 없음');
  const EL6 = ['목', '화', '토', '금', '수'];
  EL6.forEach((e, i) => { const f = R.fitBasis(e, rE, rJ), ge = ['용신', '희신'].includes(rE[i]), gj = ['용신', '희신'].includes(rJ[i]); ok(/(니다|세요)\.$/.test(f.text) && !BAN.test(f.text) && f.text.includes('억부 기준') && f.text.includes('조후 기준'), '병행 해석 문장 ' + e); ok((ge && gj) === (f.tone === 'good' && /두 기준 모두/.test(f.text)), '병행 tone ' + e); if (ge !== gj && (rE[i] === '기신' || rE[i] === '구신' || rJ[i] === '기신' || rJ[i] === '구신')) ok(/엇갈려/.test(f.text), '엇갈림 표시 ' + e); });
  const snap6 = JSON.stringify([chB.pillars, chB.weights, chB.yong, chB.yongAll]); R.suggestBasis(home, rE, rJ, 'both'); ok(JSON.stringify([chB.pillars, chB.weights, chB.yong, chB.yongAll]) === snap6, '기준별 계산이 원국·용신을 바꾸지 않음');
  const html4 = fs.readFileSync(path.join(root, 'index.html'), 'utf8'); ok(html4.includes('data-reg-basis') && html4.includes("adv.verdict === '병행' ? 'both'") && html4.includes('RG.suggestBasis(baseReg, rolesE, rolesJ, mode)'), '화면: 기준 선택·자동(이 사주 권장)·후보 연결');
}
if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
console.log('모든 검증 통과 · 지역 ' + R.REGIONS.length + '곳 · 통계 항목은 출처 확인 전까지 모두 자료 부족');
