// 온보딩·슬라이드 툰·개인화 홈 검증:  node tests/onboard-sim.js
// ① 호칭(귀인) 일관성 ② 사례 랜덤·가중치·미검증 차단·직전 반복 방지 ③ 설정 병합(필수 입력 보호) ④ 날짜 검증(양력·음력·윤달)
// ⑤ 입력 → 엔진 계산 → 일간·일주 ⑥ /api/onboarding(공개 필터·관리자 저장·집계) ⑦ 라우트·금지 호칭·타로 AI 미사용 ⑧ 분석 이벤트에 출생정보 없음
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };

vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
const M = globalThis.Manse, O = require(path.join(root, 'report', 'hub', 'onboard-data.js'));
const seeded = (s) => () => (s = (s * 16807) % 2147483647) / 2147483647;

/* ① 호칭 */
ok(O.honorific() === '님', '기본 호칭은 귀인');
ok(O.addr('', null) === '방문자' && O.addr('백진우') === '백진우 님', '이름 전 "귀인", 이름 후 "[이름] 귀인"');
ok(O.addr('  ') === '방문자', '공백 이름은 귀인');
ok(O.honorific({ honorific: '대공' }) === '님' && O.honorific({ honorific: '소협' }) === '님', '금지 호칭은 귀인으로 되돌린다');
ok(O.honorific({ honorific: '벗님' }) === '벗님', '공통 설정으로 호칭을 바꿀 수 있다');
ok(O.fill('{이름귀인}, 안녕하옵니까! {귀인}!', '가') === '가 님, 안녕하옵니까! 가 님!', '템플릿 치환');
// 호칭은 성별에 따라 달라지지 않는다(시그니처에 성별이 없다)
ok(O.addr.length <= 2, '호칭 함수는 성별을 받지 않는다');
const allText = JSON.stringify({ s: O.SCENES, i: O.INTRO, r: O.REVEAL_LINES, c: O.CASES });
['대공', '소협', '대협'].forEach(w => ok(!allText.includes(w), '기본 문구에 금지 호칭 없음: ' + w));
ok(O.SCENES.every(s => s.lines.every(l => /\{귀인\}|\{이름귀인\}|[^{]/.test(l))), '대사 형식');
ok(O.SCENES.filter(s => s.field === 'name').length === 1 && O.SCENES.length === 6, '장면 6개, 이름 장면 1개');
ok(O.SCENES.map(s => s.field).join() === 'name,date,time,place,gender,confirm', '장면 순서(이름→날짜→시각→지역→성별→확인)');
// 입력 UI 문구는 현대 한국어: 안내 문구에 사극체 어미가 없다
ok(O.SCENES.every(s => !/(옵니다|사옵|하옵|이옵)/.test((s.hint || '') + (s.button || ''))), '입력 안내·버튼은 일반 한국어');

/* ② 사례 */
const cfg = O.merge(O.DEFAULTS, null);
const pub = O.publicCases(cfg.cases);
ok(pub.length >= 4 && pub.every(c => c.status === 'published' && (c.source.doi || c.source.url)), '공개 사례는 출처가 있다');
ok(cfg.cases.some(c => c.status === 'review') && !pub.some(c => c.status === 'review'), '검토 중 사례는 공개 풀에서 제외');
const unverified = { id: 'x', type: 'research', status: 'draft', title: 't', body: ['b'], source: { url: 'https://x' } };
ok(O.publicCases([unverified]).length === 0, '초안은 공개되지 않는다');
ok(O.publicCases([Object.assign({}, unverified, { status: 'published', source: {} })]).length === 0, '출처 없는 사례는 공개 상태여도 노출 안 됨');
let n = { research: 0, celebrity: 0 }; const rnd = seeded(11);
for (let i = 0; i < 4000; i++) n[O.pickCase(cfg, { rnd }).type]++;
ok(n.research / 4000 > 0.52 && n.research / 4000 < 0.68, '연구 가중치 약 60%: ' + n.research / 4000);
ok(n.celebrity > 0, '유명인 사례도 노출');
const w2 = O.merge(cfg, { weights: { research: 0, celebrity: 100 } }); let allC = true; for (let i = 0; i < 50; i++) if (O.pickCase(w2, { rnd }).type !== 'celebrity') allC = false;
ok(allC, '가중치 변경이 반영된다');
let rep = 0; const rr = seeded(5); let prev = null;
for (let i = 0; i < 300; i++) { const c = O.pickCase(cfg, { rnd: rr, recent: prev ? [prev] : [] }); if (prev && c.id === prev) rep++; prev = c.id; }
ok(rep === 0, '직전 사례가 연속으로 나오지 않는다: ' + rep);
ok(O.pickCase({ cases: [], weights: cfg.weights }) === null, '공개 사례가 없으면 null(후킹 없이 소개로)');
const story0 = cfg.cases.filter(c => c.group !== 'birth' && O.publicCases([c]).length)[0];
ok(O.pickCase({ cases: [story0], weights: cfg.weights }, { recent: [story0.id] }).id === story0.id, '사례가 하나뿐이면 반복을 허용');
// 연구 표현: 예측력 입증처럼 쓰지 않는다
const BAN = /(사주.*입증|명리.*과학적|예측.*입증|반드시|확정|100%|무조건)/;
ok(!BAN.test(JSON.stringify(pub.filter(c => c.group !== 'birth'))), '공개 사례에 과장·입증 표현 없음(출생 시기 연구 카드는 부정형 문구가 있어 아래 별도 검사)');
ok(pub.filter(c => c.type === 'research').every(c => c.caveat), '연구 사례에는 한계 문구가 있다');
ok(pub.filter(c => /^10\./.test(c.source.doi || '')).length >= 4, '연구 사례 DOI 기록');

/* ③ 설정 병합: 필수 입력 보호 */
const m = O.merge(O.DEFAULTS, { scenes: [{ id: 'day', field: 'hacked', enabled: false, title: '날짜 바꿈', lines: ['새 대사 {귀인}'] }, { id: 'gender', enabled: false }], honorific: '대공', intro: [{ id: 'two', title: '바뀐 제목' }] });
ok(m.scenes.find(s => s.id === 'day').field === 'date', '관리자가 입력 종류(field)를 바꿀 수 없다');
ok(m.scenes.find(s => s.id === 'day').enabled === true && m.scenes.find(s => s.id === 'gender').enabled === true, '필수 장면은 끌 수 없다');
ok(m.scenes.find(s => s.id === 'day').title === '날짜 바꿈' && m.scenes.find(s => s.id === 'day').lines[0] === '새 대사 {귀인}', '문구는 바꿀 수 있다');
ok(m.honorific === '님', '금지 호칭 저장 시도 → 귀인');
ok(m.intro.find(s => s.id === 'two').title === '바뀐 제목' && m.intro.length === 3, '소개 문구 변경');
ok(O.merge(O.DEFAULTS, { weights: { research: -5, celebrity: 0 } }).weights.research === 60, '잘못된 가중치는 무시');

/* ④ 날짜 검증 */
const v = (o) => O.validateDate(M, Object.assign({ calendar: 'solar', leap: false }, o));
ok(v({ year: 1990, month: 3, day: 15 }).ok, '정상 양력');
ok(!v({ year: 1990, month: 2, day: 30 }).ok && /없습니다/.test(v({ year: 1990, month: 2, day: 30 }).msg), '2월 30일 거부');
ok(!v({ year: 1991, month: 2, day: 29 }).ok && v({ year: 1992, month: 2, day: 29 }).ok, '윤년 처리');
ok(!v({ year: 1990, month: 4, day: 31 }).ok, '4월 31일 거부');
ok(!v({ year: '', month: 1, day: 1 }).ok, '빈 값');
ok(!v({ year: 1850, month: 1, day: 1 }).ok, '범위 밖 연도');
ok(!v({ year: new Date().getFullYear() + 1, month: 1, day: 1 }).ok, '미래 날짜 거부');
// 음력·윤달: 2020년 윤4월 존재 / 2021년 윤달 없음
const lv = (y, mo, d, leap) => v({ calendar: 'lunar', year: y, month: mo, day: d, leap });
ok(lv(2020, 4, 10, true).ok, '음력 2020 윤4월 허용');
ok(!lv(2021, 4, 10, true).ok && /윤4월이 없습니다/.test(lv(2021, 4, 10, true).msg), '윤달 없는 해 거부');
ok(!lv(2020, 4, 31, false).ok, '음력 31일(없는 날) 거부');
const conv = lv(2020, 1, 1, false); ok(conv.ok && conv.solar.y === 2020 && conv.solar.m === 1 && conv.solar.d === 25, '음력 2020-1-1 = 양력 2020-1-25: ' + JSON.stringify(conv.solar));
ok(O.validateTime({ hourUnknown: true }).ok && O.validateTime({ hour: 14, minute: 30 }).ok, '시각 정상·미상');
ok(!O.validateTime({ hour: 25, minute: 0 }).ok && !O.validateTime({ hour: 3, minute: 75 }).ok && !O.validateTime({ hour: '', minute: '' }).ok, '시각 범위');

/* ⑤ 입력 → 엔진 → 일간·일주 (엔진 값 그대로) */
const place = O.PLACES.find(p => p.name === '부산');
const prof = O.toProfile({ name: '백진우', gender: 'M', calendar: 'solar', year: 1990, month: 3, day: 15, hour: 14, minute: 30, hourUnknown: false, country: 'KR' }, place);
ok(prof.city === '부산' && Math.abs(prof.lon - 129.08) < 0.01 && prof.hourUnknown === false && prof.hour === 14, '프로필 변환');
const inp = { year: prof.year, month: prof.month, day: prof.day, hour: prof.hourUnknown ? null : prof.hour, minute: prof.minute, calendar: prof.calendar, leap: prof.leap, gender: prof.gender, lon: prof.lon, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
const ch = M.compute(inp);
ok(ch.pillars.day && M.gzName(ch.pillars.day) && M.gzNameK(ch.pillars.day).length === 2, '일주 계산');
const refDay = M.compute(Object.assign({}, inp, { lon: 126.98 })).pillars.day; ok(refDay.i != null, '경도 보정 비교용 계산');
const unk = O.toProfile({ name: '', gender: 'F', calendar: 'solar', year: 1985, month: 7, day: 1, hour: '', minute: '', hourUnknown: true, country: 'KR' }, O.PLACES[0]);
ok(unk.hourUnknown && unk.hour === 12 && unk.minute === 0, '시각 미상은 임의 시각을 만들지 않고 hourUnknown 으로 표시(저장 형태는 기존 입력 화면과 동일)');
const chU = M.compute({ year: 1985, month: 7, day: 1, hour: null, minute: 0, calendar: 'solar', leap: false, gender: 'F', lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
ok(chU.hourKnown === false && chU.pillars.day, '시각 미상: 엔진이 시주 없이 계산');
// 음력 입력도 같은 날의 양력 입력과 같은 일주
const chL = M.compute(Object.assign({}, inp, { year: 2020, month: 1, day: 1, calendar: 'lunar', leap: false })), chS = M.compute(Object.assign({}, inp, { year: 2020, month: 1, day: 25, calendar: 'solar' }));
ok(M.gzName(chL.pillars.day) === M.gzName(chS.pillars.day), '음력·양력 환산 일주 일치');
// 대운 목록(현재 대운 표시용)이 있고 시작 시각이 오름차순
ok(Array.isArray(ch.daeun.list) && ch.daeun.list.length >= 8 && ch.daeun.list.every((x, i, a) => !i || a[i - 1].startMs < x.startMs), '대운 목록');

ok(fs.readFileSync(path.join(root, 'report', 'hub', 'hub-quest.js'), 'utf8').includes("H.route('begin'"), '공통 begin 라우트는 quest dispatcher가 등록');

/* ⑥ API */
(async () => {
  const mod = await import('file:///' + path.join(root, 'functions', 'api', 'onboarding.js').replace(/\\/g, '/'));
  const store = new Map(), kv = { get: async (k, t) => (store.has(k) ? (t === 'json' ? JSON.parse(store.get(k)) : store.get(k)) : null), put: async (k, v) => { store.set(k, v); }, delete: async k => store.delete(k) };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' };
  const req = (method, u, body, admin) => new Request('https://x.test' + u, { method, headers: Object.assign({ 'content-type': 'application/json' }, admin ? { authorization: 'Bearer pw' } : {}), body: body ? JSON.stringify(body) : undefined });
  const call = async (fn, r) => { const res = await fn({ request: r, env }); return { s: res.status, j: await res.json() }; };
  let r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
  ok(r.s === 200 && r.j.config === null, '저장 전에는 config null(코드 기본값 사용)');
  r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { honorific: '귀인' }, false)); ok(r.s === 401, '관리자 인증 없이 저장 불가');
  const body = { honorific: '대공', weights: { research: 70, celebrity: 30 }, cases: [
    { id: 'a-1', type: 'research', status: 'published', title: '공개 사례', body: ['가'], source: { label: 'L', doi: '10.1/x' } },
    { id: 'a-2', type: 'celebrity', status: 'published', title: '출처 없는 공개', body: ['나'], source: {} },
    { id: 'a-3', type: 'research', status: 'review', title: '검토 중', body: ['다'], source: { url: 'https://example.com' } },
    { id: 'BAD ID', type: 'research', status: 'published', title: 'x', body: ['x'], source: { url: 'https://x' } },
    { id: 'a-4', type: 'research', status: 'published', title: 'js', body: ['x'], source: { url: 'javascript:alert(1)' }, image: 'javascript:alert(1)' }],
    scenes: [{ id: 'day', title: '날짜', lines: ['대사'], hint: '안내', image: 'https://cdn.example.com/a.png', field: 'x' }] };
  r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', body, true)); ok(r.s === 200 && r.j.version, '관리자 저장');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
  ok(r.j.config === null, '초안 저장만으로는 방문자 화면(공개본)이 바뀌지 않는다');
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=publish', null, false)); ok(r.s === 401, '게시는 관리자만');
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=publish', null, true)); ok(r.s === 200 && r.j.version, '게시');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
  const pubIds = (r.j.config.cases || []).map(c => c.id).sort().join();
  ok(pubIds === 'a-1', '공개 응답에는 승인(published)+출처 있는 사례만: ' + pubIds);
  ok(r.j.config.honorific === '님', '서버도 금지 호칭을 거른다');
  ok(!JSON.stringify(r.j).includes('javascript:'), '위험 URL 제거');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding', null, true));
  const admIds = r.j.config.cases.map(c => c.id).sort().join();
  ok(admIds === 'a-1,a-2,a-3,a-4' && r.j.config.cases.find(c => c.id === 'a-2').status === 'verified', '관리자 응답은 전체, 출처 없는 공개는 verified 로 낮춤: ' + admIds);
  ok(r.j.config.scenes[0].field === undefined, '장면 field 는 서버에 저장하지 않는다');
  // 집계
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=onboarding_view', { case: 'a-1' })); ok(r.j.ok, '집계 기록');
  await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=onboarding_cta_click', { case: 'a-1' }));
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=evil_event', {})); ok(r.s === 400, '허용되지 않은 이벤트 거부');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding?stats=1')); ok(r.s === 401, '통계는 관리자만');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding?stats=1', null, true));
  ok(r.j.stats.total.onboarding_view === 1 && r.j.stats.byCase['a-1'].onboarding_cta_click === 1, '통계 값');
  ok(!/birth|year|name|gender/i.test(JSON.stringify(r.j.stats)), '집계에 출생정보 필드 없음');

  /* ⑦ 화면 코드 점검 */
  const src = fs.readFileSync(path.join(root, 'report', 'hub', 'hub-onboard.js'), 'utf8');
  for (const rt of ["'welcome'", "'reveal'", "H.route('',", "'me'", "'input'"]) ok(src.includes('H.route(' + rt.replace(/^H\.route\(/, '')) || src.includes(rt), '라우트 ' + rt);
  ok(!/대공|소협|대협/.test(src), '화면 코드에 금지 호칭 없음');
  ok(!/(Ob\.track|H\.track)\([^)]*(birth|year|month|day|name)\s*:/.test(src.replace(/birth_input_[a-z_]+/g, '')), '분석 이벤트 속성에 출생정보·이름 없음');
  ok(/touchstart/.test(src) && /prefers-reduced-motion/.test(fs.readFileSync(path.join(root, 'report', 'hub', 'onboard.css'), 'utf8')), '스와이프·애니메이션 감소');
  ok(/localStorage/.test(src) && /DRAFT/.test(src), '입력 초안 저장');
  const tarot = ['hub-tarot.js', 'free-core.js'].map(f => fs.readFileSync(path.join(root, 'report', 'hub', f), 'utf8')).join('\n');
  ok(!/\/api\/(ai|life-ai|compose|reading-answer)|anthropic|openai/i.test(tarot + fs.readFileSync(path.join(root, 'shared-core.js'), 'utf8')), '타로 코드에 AI 호출 없음');
  const html = fs.readFileSync(path.join(root, 'report', 'hub', 'index.html'), 'utf8');
  ok(html.indexOf('onboard-data.js') > html.indexOf('hub-saju.js') && html.indexOf('hub-onboard.js') > html.indexOf('onboard-data.js'), '스크립트 로드 순서');

  console.log(fails.length ? 'FAIL ' + fails.length + '\n' + fails.map(f => ' - ' + f).join('\n') : 'onboard-sim OK');
  if (fails.length) process.exitCode = 1; // (뒤따르는 추가 검사가 끝날 때까지 기다린다)
})();
// (추가) 개발 단계 강제 온보딩 기본값 · 스크롤 구성 · 일러스트
{
  const O2 = require(path.join(root, 'report', 'hub', 'onboard-data.js'));
  const ok2 = (c, m) => { if (!c) { console.log('FAIL: ' + m); process.exitCode = 1; } };
  ok2(O2.DEFAULTS.forceOnboarding === true && O2.merge(O2.DEFAULTS, { forceOnboarding: false }).forceOnboarding === false, 'forceOnboarding 기본 true, 관리자가 끌 수 있다');
  const art = fs.readFileSync(path.join(root, 'report', 'hub', 'onboard-art.js'), 'utf8');
  for (const k of ['bell', 'streak', 'worlds', 'steps', 'door', 'mask', 'eye', 'time', 'pillars', 'two', 'end']) ok2(art.indexOf(' ' + k + ': function') >= 0, '일러스트 ' + k);
  const src2 = fs.readFileSync(path.join(root, 'report', 'hub', 'hub-onboard.js'), 'utf8');
  ok2(/cn-sec/.test(src2) && /mt_onb_shown/.test(src2) && /forceOnboarding/.test(src2), '스크롤식 섹션·세션당 1회 강제 온보딩');
}
// (추가) 순서: 연구 → 유명인 → 명리학, 서사 원고, 랜딩 임베드 연결
{
  const O3 = require(path.join(root, 'report', 'hub', 'onboard-data.js')), c3 = O3.merge(O3.DEFAULTS, null);
  const bad = (m) => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const pubs = O3.publicCases(c3.cases).filter(c => c.group !== 'birth');
  if (!pubs.every(c => c.story && c.story.length >= 3 && c.takeaway)) bad('공개 사례는 서사(3문단 이상)와 한 줄 결론을 가진다');
  if (!pubs.every(c => c.story.every(p => (p.match(/[.!?]|니다\./g) || []).length <= 3))) bad('문단은 짧게(문장 3개 이하)');
  if (!/반드시|무조건|100%|보장|확정/.test(JSON.stringify(pubs.map(c => [c.story, c.takeaway])) ) === true) { /* 단정 표현 없음 */ } else bad('서사에 단정 표현');
  const r = O3.pickCase(c3, { type: 'research' }), c = O3.pickCase(c3, { type: 'celebrity' });
  if (!r || r.type !== 'research' || !c || c.type !== 'celebrity') bad('유형 지정 선택');
  const src = fs.readFileSync(path.join(root, 'report', 'hub', 'hub-onboard.js'), 'utf8');
  const iR = src.indexOf("cur.research) h +="), iC = src.indexOf("cur.celebrity) h +=");
  if (!(iR > 0 && iR < iC)) bad('예전 후킹(story 섹션) 안의 순서 연구 → 유명인');
  if (O3.DEFAULTS.sections.map(s => s.type).join() !== 'research,myeongri,service,story,final') bad('기본 섹션 순서 연구 → 명리학 → 서비스 → (후킹) → 최종');
  const st = fs.readFileSync(path.join(root, 'report', 'story', 'story.js'), 'utf8');
  if (!/hub-onboard\.js/.test(st) && !/onboard-data\.js/.test(st)) bad('랜딩(story.js)이 온보딩 스크립트를 불러와야 한다');
  if (!/onboard\.css/.test(st)) bad('랜딩이 온보딩 CSS 를 불러와야 한다');
}

// (추가) 랜딩·관리자 개편: 출생 시기 연구 카드 · 검증/공개 분리 · 섹션·서비스·주제 · 초안/게시/이력
{
  const O4 = require(path.join(root, 'report', 'hub', 'onboard-data.js'));
  const bad = (m) => { console.log('FAIL: ' + m); process.exitCode = 1; };
  const c4 = O4.merge(O4.DEFAULTS, null), bc = O4.birthCards(c4.cases);
  if (bc.map(c => c.id).join() !== 'r-boland-2015,r-coury-2023') bad('출생 시기 연구 카드 2건(컬럼비아 2015 → 2023 메타분석): ' + bc.map(c => c.id));
  bc.forEach(c => {
    if (!/^10\.\d{4,}\//.test(c.study.doi) || !c.study.limits || !c.study.scope || !c.study.sample) bad('연구 카드 필수 항목(DOI·한계·범위·규모): ' + c.id);
    if (c.study.relation !== 'birth_correlation') bad('관련성은 출생 시기 연관성 연구로 표시: ' + c.id);
    if (!c.verification.reviewedAt || !c.verification.basis) bad('검토일·근거 기록: ' + c.id);
  });
  const txt = JSON.stringify(bc);
  if (/(사주.{0,6}(입증|증명|맞)|명리.{0,6}(입증|증명)|반드시|무조건|100%)/.test(txt.replace(/입증하지 않는다/g, ''))) bad('연구 카드에 과장·입증 표현');
  if (!/1,688/.test(txt) || !/55개/.test(txt) || !/OR 1\.05/.test(txt) || !/440,039/.test(txt)) bad('원문 대조 수치 유지');
  // 검증/공개 분리
  const n1 = O4.normalizeCase({ id: 'a', type: 'research', status: 'published', title: 't', body: ['b'], source: { url: 'https://x' }, verifiedNote: '2026-10-11 확인' });
  if (!(n1.visible && n1.verification.state === 'verified' && n1.verification.reviewedAt === '2026-10-11')) bad('옛 published → 검증 완료 + 공개 + 검토일 마이그레이션');
  const n2 = O4.normalizeCase({ id: 'b', type: 'celebrity', status: 'review', title: 't', body: ['b'] });
  if (!(n2.visible === false && n2.verification.state === 'review' && n2.kind === 'celebrity')) bad('옛 review 마이그레이션');
  const hid = O4.publicCases([{ id: 'c', kind: 'study', verification: { state: 'verified', reviewedAt: '2026-10-11', basis: 'x' }, visible: false, title: 't', body: ['b'], source: { url: 'https://x' } },
    { id: 'd', kind: 'study', verification: { state: 'hold' }, visible: true, title: 't', body: ['b'], source: { url: 'https://x' } }]);
  if (hid.length) bad('검증 완료 + 공개 켬 일 때만 방문자 풀에 들어간다');
  // 섹션·서비스·주제
  const secs = c4.sections.map(s => s.type);
  if (secs.join() !== 'research,myeongri,service,story,final') bad('기본 섹션 순서: ' + secs);
  const m4 = O4.merge(O4.DEFAULTS, { sections: [{ id: 'final', type: 'final' }, { id: 'research', type: 'research', enabled: false }, { id: 'evil', type: 'script' }] });
  if (m4.sections[0].type !== 'final' || m4.sections.some(s => s.type === 'script') || m4.sections.filter(s => s.type === 'myeongri').length !== 1) bad('섹션 순서 반영·알 수 없는 type 제거·빠진 섹션 보충');
  if (m4.sections.find(s => s.type === 'research').enabled !== false) bad('섹션 비활성화');
  if (c4.services.length !== 8 || !c4.services.every(s => s.status === 'live' || s.status === 'soon')) bad('서비스 소개 8종');
  if (c4.topics.filter(t => t.enabled).length < 5) bad('명리학 주제 5개 이상 기본 노출');
  if (!c4.topics.some(t => t.nature === 'limit')) bad('명리학의 활용과 한계 주제');
  const tt = JSON.stringify(c4.topics) + JSON.stringify(c4.sections);
  if (/(반드시 맞|과학적으로 입증된 명리|100%)/.test(tt)) bad('주제·섹션 문구에 단정 표현');
  if (!/당신/.test(O4.fill(c4.sections.find(s => s.type === 'final').title, '', c4))) bad('최종 섹션 호칭 귀인');
  const css = fs.readFileSync(path.join(root, 'report', 'hub', 'onboard.css'), 'utf8'), src4 = fs.readFileSync(path.join(root, 'report', 'hub', 'hub-onboard.js'), 'utf8');
  if (/typewriter|typing/i.test(css + src4)) bad('본문 타이핑 효과 금지');
  if (!/mt-onb-preview/.test(src4) || !/e\.origin !== location\.origin/.test(src4)) bad('미리보기는 같은 출처 postMessage 만');
  // 모의 KV: 초안 → 게시 → 이력 → 복원 → 공개 중지
  (async () => {
    const mod = await import('file:///' + path.join(root, 'functions', 'api', 'onboarding.js').replace(/\\/g, '/'));
    const store = new Map(), kv = { get: async (k, t) => (store.has(k) ? (t === 'json' ? JSON.parse(store.get(k)) : store.get(k)) : null), put: async (k, v) => { store.set(k, v); }, delete: async k => store.delete(k) };
    const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' };
    const req = (method, u, body, admin) => new Request('https://x.test' + u, { method, headers: Object.assign({ 'content-type': 'application/json' }, admin ? { authorization: 'Bearer pw' } : {}), body: body ? JSON.stringify(body) : undefined });
    const call = async (fn, r) => { const res = await fn({ request: r, env }); return { s: res.status, j: await res.json() }; };
    store.set('free:onboard', JSON.stringify({ version: 'old', cases: [{ id: 'old-1', type: 'research', status: 'published', title: '기존', body: ['b'], source: { url: 'https://x' } }] }));
    let r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
    if (r.j.config.cases.length !== 1) bad('배포 직후: 기존 공개 사례가 그대로 보인다');
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding?draft=1', null, true));
    if (r.j.hasDraft || r.j.config.cases[0].id !== 'old-1') bad('초안이 없으면 공개본이 편집 시작점');
    r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { cases: [r.j.config.cases[0], { id: 'new-1', kind: 'study', verification: { state: 'review' }, visible: true, title: '새', body: ['b'], source: { url: 'https://y' } }] }, true));
    if (!r.j.notes.some(n => /new-1/.test(n))) bad('검증 전 공개 시도는 서버가 비공개로 내리고 알린다');
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
    if (r.j.version !== 'old') bad('초안 저장은 공개본을 바꾸지 않는다');
    r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=publish', null, true));
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding?hist=1', null, true));
    if (r.j.hist.length !== 1) bad('게시하면 직전 공개본이 이력에 남는다');
    const hid2 = r.j.hist[0].id;
    r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=restore&id=' + hid2, null, true));
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding?draft=1', null, true));
    if (!r.j.dirty || r.j.config.cases.length !== 1) bad('이력 복원은 초안으로(공개본 즉시 변경 없음)');
    r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=unpublish', null, true));
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
    if (r.j.config !== null) bad('공개 중지 → 방문자는 기본 문구');
    await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=landing_view&d=m', { case: 's-final' }));
    await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=research_source_click&d=d', { case: 'r-boland-2015' }));
    r = await call(mod.onRequestGet, req('GET', '/api/onboarding?stats=1', null, true));
    if (!(r.j.stats.byDev.m.landing_view === 1 && r.j.stats.byDev.d.research_source_click === 1)) bad('기기별(모바일·PC) 집계');
    if (/birth|year|name|gender/i.test(JSON.stringify(r.j.stats))) bad('집계에 출생정보 필드 없음');
    // 최종 CTA 대표 이미지·영상(기본 도형 대체): 서버 정리 → 방문자 설정 병합까지 유지, 위험 URL 은 제거
    {
      const sec = O.DEFAULTS.sections.map(x => ({ ...x }));
      const fin = sec.filter(x => x.type === 'final')[0]; fin.art = '/api/clipfile?k=abc123.jpg'; fin.artVideo = 'javascript:alert(1)';
      r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { sections: sec }, true));
      r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=publish', null, true));
      r = await call(mod.onRequestGet, req('GET', '/api/onboarding'));
      const pf = (r.j.config.sections || []).filter(x => x.type === 'final')[0] || {};
      if (pf.art !== '/api/clipfile?k=abc123.jpg') bad('최종 CTA 대표 이미지가 저장·공개 응답에 유지된다');
      if (pf.artVideo) bad('최종 CTA 대표 영상의 위험 URL 은 제거된다');
      const mf = (O.merge(O.DEFAULTS, r.j.config).sections || []).filter(x => x.type === 'final')[0] || {};
      if (mf.art !== '/api/clipfile?k=abc123.jpg') bad('방문자 설정 병합(merge) 뒤에도 대표 이미지가 유지된다');
    }
    console.log('onboard-sim(추가): 완료');
  })();
}

{ const legacy = O.merge(O.DEFAULTS, { scenes:[{id:'day',lines:['강호에 강림하신 날은 언제이옵니까?'],image:'https://example.com/kept.webp'}], revealLines:['완성되었사옵니다!'] }); ok(!/강호|이옵/.test(legacy.scenes.find(x=>x.id==='day').lines.join(' ')), '이전 공개본 무협 말투 제거'); ok(legacy.scenes.find(x=>x.id==='day').image === 'https://example.com/kept.webp', '대사 호환 시 미디어 보존'); ok(!/사옵/.test(legacy.revealLines.join(' ')), '이전 공개본 공개 대사 호환'); }
