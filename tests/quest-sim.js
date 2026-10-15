// 인터랙티브 스토리 온보딩 + 운명의 타임라인 검증:  node tests/quest-sim.js
// ① 단계 정의(필수 입력 보호·계절 선택 없음·갈림길 없음) ② 대사(안내자별·호칭) ③ 월→계절 ④ 윤달·일수(엔진) ⑤ 입력 → 실제 엔진 계산(음력·윤달·시각 미상)
// ⑥ 설정 병합 안전성 ⑦ 서버 정제(/api/onboarding: 필수 단계 고정·이미지 주소 검증·잘못된 값 거부) ⑧ 화면 코드 정책(TTS·효과음·콘솔 개인정보·기존 온보딩 보존) ⑨ 타임라인 데이터 = 엔진 값
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
const M = globalThis.Manse, O = require(path.join(root, 'report/hub/onboard-data.js')), Q = require(path.join(root, 'report/hub/quest-data.js'));
const cfg0 = O.merge(O.DEFAULTS, null);

/* ① 단계 정의 */
const ids = Q.STEPS.map(s => s.id);
ok(ids.join() === 'seal,guide,name,gender,calendar,year,month,day,time,place,confirm', '단계 순서: ' + ids.join());
ok(!ids.includes('season') && !JSON.stringify(Q.STEPS).includes('갈림길') && !/수면|갈대밭/.test(JSON.stringify(Q.STEPS.map(s => s.lines))), '계절 선택 단계·갈림길 선택 없음');
ok(Q.STEPS.filter(s => s.required).map(s => s.id).join() === 'name,gender,calendar,year,month,day,time,place,confirm', '필수 단계 = 계산에 필요한 입력 전부');
ok(Q.STEPS.every(s => !s.required || s.field), '필수 단계는 입력 종류(field)를 가진다');
Q.STEPS.filter(s => s.kind === 'input' || s.kind === 'confirm').forEach(s => ok(s.lines.male.length && s.lines.female.length, '안내자별 대사 존재: ' + s.id));
ok(Q.ASSET_KEYS.length === 12 && Q.ASSET_KEYS.every(k => fs.existsSync(path.join(root, 'report/hub/quest', k + '.webp'))), '기본 에셋 12종 파일 존재');
ok(Q.STEPS.every(s => Q.ASSET_KEYS.includes(s.asset)), '모든 장면 배경이 등록된 에셋');
ok(Q.STEPS.filter(s => s.id !== 'seal' && s.id !== 'guide').every(s => !/갈림길|문 중에|어느 문/.test(JSON.stringify(s))), '장면 문구에 갈림길 선택 없음');

/* ② 대사·호칭: 사용자 호칭은 '귀인', 이름 입력 후에는 이름 사용 */
const allLines = JSON.stringify(Q.STEPS.map(s => [s.lines, s.unknownLines, s.head, s.desc, s.hint, s.button]));
['대공', '소협', '대협'].forEach(w => ok(!allLines.includes(w), '금지 호칭 없음: ' + w));
ok(Q.fill('{귀인}', {}, cfg0) === '당신' && Q.fill('{이름귀인}', { name: '백진우' }, cfg0) === '백진우 님' && Q.fill('{이름귀인}', {}, cfg0) === '당신', '이름 전 귀인 / 이름 후 이름 귀인');
ok(Q.fill('{year}년 {month}월', { year: 1992, month: 6 }, cfg0) === '1992년 6월', '날짜 치환');
ok(Q.linesOf(Q.STEPS[8], 'male', true)[0] !== Q.linesOf(Q.STEPS[8], 'male', false)[0], '시각 미상 대사가 따로 있다');
ok(JSON.stringify(Q.linesOf(Q.STEPS[2], 'male')) !== JSON.stringify(Q.linesOf(Q.STEPS[2], 'female')), '안내자별 말투가 다르다');
ok(Q.linesOf(Q.STEPS[2], 'male')[0] === '어떤 이름으로 기록해 줄까?', '남자 안내자는 반말');
ok(Q.linesOf(Q.STEPS[2], 'female')[0] === '어떤 이름으로 기록해 드릴까요?', '여자 안내자는 존댓말');
ok(Q.speech('기록을 펼치는 중입니다. 잠시만요.', 'male') === '기록을 펼치고 있어. 잠깐만 기다려줘.', '계산 중 남자 대사도 반말');
ok(Q.speech('당신을 어떤 이름으로 기록해 드리면 될까요?', 'male') === '어떤 이름으로 기록해 줄까?', '운영 저장된 이름 대사도 반말');
ok(Q.speech('{name}, 한 가지만 더 여쭙겠습니다.', 'male') === '{이름}, 한 가지만 더 물을게.', '운영 name 변수와 기본 호칭 차이 처리');
ok(Q.speech('새 기록을 확인하겠습니다.', 'male') === '새 기록을 확인할게.', '저장 문구의 수정된 문장도 반말');
ok(Q.speech('당신을 어떤 이름으로 기록해 드리면 될까요?', 'female') === '당신을 어떤 이름으로 기록해 드리면 될까요?', '여자 존댓말은 유지');
ok(!/(옵니다|사옵|하옵|이옵)/.test(allLines.replace(/없습니다|있습니다/g, '')), '입력 안내는 일반 한국어(사극체 없음)');
ok(Q.GUIDES.male.name !== Q.GUIDES.female.name, '안내자 이름 구분');

/* ③ 월 → 계절(별도 선택 없이 배경 색조만) */
ok(Q.seasonOf('solar', 3) === 'spring' && Q.seasonOf('solar', 7) === 'summer' && Q.seasonOf('solar', 10) === 'autumn' && Q.seasonOf('solar', 12) === 'winter' && Q.seasonOf('solar', 1) === 'winter', '양력 월→계절');
ok(Q.seasonOf('lunar', 1) === 'spring' && Q.seasonOf('lunar', 4) === 'summer' && Q.seasonOf('lunar', 8) === 'autumn' && Q.seasonOf('lunar', 11) === 'winter', '음력 월→계절');
ok(Q.seasonOf('solar', '') === '' && Q.seasonOf('solar', 13) === '', '잘못된 월은 계절 없음');

/* ④ 윤달·일수 */
ok(Q.leapExists(M, 2020, 4) === true && Q.leapExists(M, 2020, 5) === false && Q.leapExists(M, 2021, 4) === false, '윤달이 있는 달에서만 윤달 질문 (2020 윤4월 있음 / 2021 없음)');
ok(Q.leapExists(null, 2020, 4) === null, '엔진이 없으면 판정 보류(null)');
ok(Q.daysIn(M, { calendar: 'solar', year: 2024, month: 2 }) === 29 && Q.daysIn(M, { calendar: 'solar', year: 2023, month: 2 }) === 28 && Q.daysIn(M, { calendar: 'solar', year: 1990, month: 4 }) === 30, '양력 일수(윤년 포함)');
const ld = Q.daysIn(M, { calendar: 'lunar', year: 2020, month: 1, leap: false }); ok(ld === 29 || ld === 30, '음력 일수 29/30: ' + ld);
for (let m = 1; m <= 12; m++) { const n = Q.daysIn(M, { calendar: 'lunar', year: 2019, month: m, leap: false }); ok(O.validateDate(M, { calendar: 'lunar', year: 2019, month: m, day: n, leap: false }).ok && !O.validateDate(M, { calendar: 'lunar', year: 2019, month: m, day: n + 1, leap: false }).ok, '음력 일수와 엔진 검증 일치 ' + m + '월'); }
const fd = new Date(); ok(Q.futureDay({ calendar: 'solar', year: fd.getFullYear() + 1, month: 1 }, 1) === true && Q.futureDay({ calendar: 'solar', year: 1990, month: 1 }, 1) === false, '미래 양력 날짜 비활성');

/* ⑤ 입력 → 실제 엔진 계산 (스토리가 만드는 프로필과 같은 경로: toProfile → compute) */
const mk = d => { const place = O.PLACES.filter(p => p.name === d.place)[0]; const saved = O.toProfile(d, d.country === 'KR' ? place : null);
  return { saved, ch: M.compute({ year: +saved.year, month: +saved.month, day: +saved.day, hour: saved.hourUnknown ? null : saved.hour, minute: +saved.minute || 0, calendar: saved.calendar, leap: !!saved.leap, gender: saved.gender, lon: +saved.lon || 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' }) }; };
const base = Object.assign(Q.blank(), { name: '백진우', gender: 'M', calendar: 'solar', year: 1992, month: 6, day: 23, hour: 7, minute: 30, country: 'KR', place: '서울' });
const A = mk(base), B = mk(Object.assign({}, base, { hourUnknown: true, hour: '', minute: '' }));
ok(A.ch.hourKnown === true && A.ch.pillars.hour && A.saved.hourUnknown === false, '시각 입력 → 시주 계산');
ok(B.ch.hourKnown === false && !B.ch.pillars.hour && M.gzName(A.ch.pillars.day) === M.gzName(B.ch.pillars.day) && B.saved.hourUnknown === true, '시각 미상 → 엔진 정책(시주 제외, 일주는 같음)');
const Lp = mk(Object.assign({}, base, { calendar: 'lunar', leap: true, year: 2020, month: 4, day: 10 })), Ln = mk(Object.assign({}, base, { calendar: 'lunar', leap: false, year: 2020, month: 4, day: 10 }));
ok(Lp.saved.leap === true && Lp.ch.solar && (Lp.ch.solar.d !== Ln.ch.solar.d || Lp.ch.solar.m !== Ln.ch.solar.m), '윤달/평달은 다른 양력 날짜로 환산');
ok(O.toProfile(Object.assign({}, base, { calendar: 'solar', leap: true }), null).leap === false, '양력에서는 윤달 값을 버린다');
ok(mk(Object.assign({}, base, { gender: 'F' })).ch.daeun.forward !== A.ch.daeun.forward, '성별이 대운 방향에 영향(그래서 필수 입력)');
const sd = mk(Object.assign({}, base, { place: '부산' })); ok(sd.saved.lon === 129.08 && sd.saved.city === '부산', '출생지 경도 기존 표 사용');
const ot = mk(Object.assign({}, base, { country: 'OT', place: '' })); ok(ot.saved.country === 'OT' && ot.saved.lon === 126.98, '해외·기타: 한국 표준시 기준(서울 경도) — 기존 정책');
ok(!O.validateDate(M, Object.assign({}, base, { month: 2, day: 30 })).ok && !O.validateDate(M, Object.assign({}, base, { year: 2020, month: 5, day: 10, calendar: 'lunar', leap: true })).ok, '잘못된 날짜·없는 윤달 거부');

/* 초안(이탈 복원) */
const dr = Q.cleanDraft({ v: 2, step: 'month', guide: 'female', d: Object.assign({}, base, { gender: 'X', evil: '<script>' }) }, ids);
ok(dr && dr.step === 'month' && dr.guide === 'female' && dr.d.gender === '' && !('evil' in dr.d), '초안 정리: 모르는 값 제거·잘못된 성별 비움');
ok(Q.cleanDraft({ v: 1, step: 'name', d: {} }, ids) === null && Q.cleanDraft(null, ids) === null, '옛 버전·빈 초안은 버림');
ok(Q.cleanDraft({ v: 2, step: 'nope', d: {} }, ids).step === 'seal', '모르는 단계는 처음으로');

/* ⑥ 설정 병합 안전성 */
const m = O.merge(O.DEFAULTS, { quest: { steps: [{ id: 'name', enabled: false, field: 'hacked', required: false, title: '새 제목', lines: { male: ['대사 {귀인}'], female: [] }, asset: 'office', bg: 'javascript:alert(1)' }, { id: 'seal', enabled: false }, { id: 'confirm', enabled: false }], guides: { male: { name: '이름', image: 'http://insecure/x.png' } }, assets: { gate: { pc: '/report/hub/quest/letter.webp', focusPc: '10% 20%' }, evil: { pc: 'x' } }, fx: 'bad' }, timeline: { sections: [{ id: 'now', enabled: false }, { id: 'hack' }], graph: { ziwei: false, evil: true }} });
const sn = m.quest.steps.find(s => s.id === 'name'), sc = m.quest.steps.find(s => s.id === 'confirm');
ok(sn.enabled === true && sn.field === 'name' && sn.required === true, '관리자가 필수 단계를 끄거나 입력 종류를 바꿀 수 없다');
ok(sn.title === '새 제목' && sn.lines.male[0] === '대사 {귀인}' && sn.lines.female.length >= 1 && sn.asset === 'office', '문구·배경 에셋은 바꿀 수 있다(빈 대사는 기본값 유지)');
ok(sn.bg === '' && m.quest.guides.male.image === '' && m.quest.guides.male.name === '이름', '안전하지 않은 이미지 주소는 버린다(javascript:·http)');
ok(m.quest.steps.find(s => s.id === 'seal').enabled === false && sc.enabled === true, '연출 단계(오프닝)는 끌 수 있고 확인 단계는 못 끈다');
ok(m.quest.assets.gate.pc === '/report/hub/quest/letter.webp' && m.quest.assets.gate.focusPc === '10% 20%' && !m.quest.assets.evil, '에셋 교체·초점 허용, 모르는 키 거부');
ok(m.quest.fx === 'fade', '잘못된 전환 효과는 기본값');
ok(m.timeline.sections.length === 4 && m.timeline.sections[0].id === 'now' && m.timeline.sections[0].enabled === false && !m.timeline.sections.some(s => s.id === 'hack'), '타임라인 영역: 알려진 영역만, 순서·표시 반영');
ok(m.timeline.graph.ziwei === false && !('evil' in m.timeline.graph), '그래프 설정: 알려진 항목만');
ok(Q.order(m, ['guide']).length === 9, '건너뛰기 목록 반영(켜진 단계만)');
// 기존 설정(quest·timeline 없음)도 그대로 읽힌다: 기존 온보딩 데이터는 건드리지 않는다
const old = O.merge(O.DEFAULTS, { honorific: '귀인', sections: [{ id: 'research', type: 'research', title: '연구 제목' }], cases: O.DEFAULTS.cases });
ok(old.quest.enabled === true && old.timeline.enabled === true && old.sections.find(s => s.id === 'research').title === '연구 제목', '옛 저장본 호환(quest·timeline 기본값, 기존 섹션 유지)');
ok(cfg0.sections.find(s => s.type === 'final').cta.to === 'story', 'CTA 기본 연결: 인터랙티브 스토리');
ok(O.merge(O.DEFAULTS, { sections: [{ id: 'final', type: 'final', cta: { show: true, text: '확인', to: 'quick' } }] }).sections.find(s => s.type === 'final').cta.to === 'quick', 'CTA 연결 경로를 일반 입력으로 바꿀 수 있다');

/* ⑦ 서버 정제 */
(async () => {
  const mod = await import('file:///' + path.join(root, 'functions/api/onboarding.js').replace(/\\/g, '/'));
  const store = new Map(), kv = { get: async (k, t) => (store.has(k) ? (t === 'json' ? JSON.parse(store.get(k)) : store.get(k)) : null), put: async (k, v) => { store.set(k, v); }, delete: async k => store.delete(k) };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' };
  const req = (method, u, body, admin) => new Request('https://x.test' + u, { method, headers: Object.assign({ 'content-type': 'application/json' }, admin ? { authorization: 'Bearer pw' } : {}), body: body ? JSON.stringify(body) : undefined });
  const call = async (fn, r) => { const res = await fn({ request: r, env }); return { s: res.status, j: await res.json() }; };
  let r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { quest: { enabled: false } }, false)); ok(r.s === 401, '관리자 인증 없이 스토리 설정 저장 불가');
  const body = { quest: { enabled: true, fx: 'rise', steps: [{ id: 'name', enabled: false, title: '이름', lines: { male: ['가', '나'], female: [] }, asset: 'office', bg: 'https://x.test/a.webp', bgMobile: 'javascript:alert(1)' }, { id: 'seal', enabled: false }, { id: 'evil', enabled: true }, { id: 'confirm', enabled: false }],
    guides: { male: { name: '남', image: '/api/clipfile?k=abc.webp' } }, assets: { gate: { pc: '/report/hub/quest/letter.webp', focusPc: '40% 50%', focusMobile: 'bad' }, evil: { pc: 'x' } } },
    timeline: { sections: [{ id: 'flow', enabled: false, title: '흐름' }, { id: 'hack' }], graph: { daeun: false, evil: 1 } } };
  r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', body, true)); ok(r.s === 200, '관리자 스토리 설정 저장');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding?draft=1', null, true)); const q = r.j.config.quest, t = r.j.config.timeline;
  ok(q.steps.length === 3 && !q.steps.some(s => s.id === 'evil'), '서버: 모르는 단계 제거');
  ok(q.steps.find(s => s.id === 'name').enabled === true && q.steps.find(s => s.id === 'confirm').enabled === true && q.steps.find(s => s.id === 'seal').enabled === false, '서버: 필수 단계는 끌 수 없다');
  ok(q.steps.find(s => s.id === 'name').bgMobile === '' && q.steps.find(s => s.id === 'name').bg === 'https://x.test/a.webp', '서버: 안전하지 않은 이미지 주소 제거');
  ok(q.assets.gate.focusMobile === '' && q.assets.gate.focusPc === '40% 50%' && !q.assets.evil && q.guides.male.image === '/api/clipfile?k=abc.webp', '서버: 에셋·초점·안내자 이미지 정제');
  ok(t.sections.length === 1 && t.sections[0].id === 'flow' && t.graph.daeun === false && !('evil' in t.graph), '서버: 타임라인 영역·그래프 정제');
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?action=publish', null, true)); ok(r.s === 200, '게시');
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding')); ok(r.j.config.quest && r.j.config.quest.fx === 'rise' && r.j.config.timeline, '공개본에 스토리·타임라인 설정 포함');
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=quest_view', {})); ok(r.j.ok, '스토리 이벤트 집계 허용');
  r = await call(mod.onRequestPost, req('POST', '/api/onboarding?ev=saju_input_complete', {})); // 허브 전용 이벤트는 서버 목록에 없다(스토리는 보내지 않는다)
  ok(r.s === 400, '서버 허용 목록 밖 이벤트는 거부(스토리 코드는 이를 서버로 보내지 않는다)');
  const hist = await call(mod.onRequestGet, req('GET', '/api/onboarding?hist=1', null, true)); ok(Array.isArray(hist.j.hist), '이력 API 유지');
  // 옛 방식(quest 키 없이) 저장은 기존 키를 지우지 않는다
  r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { honorific: '귀인' }, true)); r = await call(mod.onRequestGet, req('GET', '/api/onboarding?draft=1', null, true));
  ok(r.j.config.quest && r.j.config.quest.fx === 'rise', 'quest 없이 저장해도 기존 스토리 설정 유지(부분 저장)');

  /* ⑧ 화면 코드 정책 */
  const read = f => fs.readFileSync(path.join(root, 'report/hub', f), 'utf8');
  const qj = read('hub-quest.js'), tj = read('hub-timeline.js'), ob = read('hub-onboard.js'), saju = read('hub-saju.js');
  ok(!/speechSynthesis|new Audio\(|AudioContext|<audio|\.mp3|\.ogg|\.wav/.test(qj + tj + read('quest.css')), 'TTS·효과음 없음');
  ok(!/console\.(log|info|debug|warn)/.test(qj + tj), '콘솔에 출력하지 않는다(개인정보 노출 방지)');
  ok(!/Ob\.track\([^)]*(name|year|month|day|hour|place|gender)\s*:/.test(qj + tj) && !/H\.track\([^)]*(name|year|month|day|hour|place)\s*:/.test(qj + tj), '분석 이벤트 속성에 이름·출생정보 없음');
  ok(!/fetch\(/.test(qj), '스토리 입력은 서버로 전송하지 않는다');
  ok(/prefers-reduced-motion/.test(read('quest.css')) && /H\.reduce/.test(qj), '동작 줄이기 대응');
  ok(!/typewriter|typing|setInterval\([^)]*char/.test(qj), '본문 글자 타이핑 연출 없음');
  ok(!/\bconfirm\(|\balert\(|\bprompt\(/.test(qj), '브라우저 기본 확인창 없음(윤달 등은 자체 대화 상자)');
  ok(!/운명의 서고/.test(qj + tj + read('quest-data.js') + read('timeline.css') + read('quest.css')), "'운명의 서고' 명칭 미사용");
  ok(/oldBegin/.test(qj) && /quest\.enabled === false/.test(qj), '스토리를 끄면 예전 슬라이드 툰으로 복귀');
  ok(/q\.classic \|\| q\.next/.test(ob), '빠른 진입(#/input?next=…)은 일반 입력으로 연결(스토리와 구분)');
  ok(/H\.route\('welcome'/.test(ob) && /researchSec/.test(ob) && /myeongriSec/.test(ob) && /serviceSec/.test(ob) && /finalSec/.test(ob), '기존 온보딩 섹션 코드 보존');
  ok(/to === 'timeline' \? '#\/timeline'/.test(saju), '일주 각성 → 운명의 타임라인 연결');
  ok(/#\/timeline/.test(ob) && /FATE TIMELINE/.test(ob) && /renderHome/.test(ob) && /<h2 class="hh-h">무료 콘텐츠/.test(ob) && /종합 무빙툰 리포트/.test(ob) && /tarot_start/.test(ob), '홈: 타임라인 진입 카드 추가 + 기존 홈 카드(무료 콘텐츠·타로·리포트) 유지');
  const html = read('index.html'); ok(html.indexOf('quest-data.js') > html.indexOf('onboard-data.js') && html.indexOf('hub-quest.js') > html.indexOf('hub-onboard.js') && html.indexOf('hub-timeline.js') > html.indexOf('hub-quest.js'), '스크립트 로드 순서');
  const story = fs.readFileSync(path.join(root, 'report/story/story.js'), 'utf8'); ok(/quest-data\.js/.test(story) && /hub-quest\.js/.test(story) && /timeline\.css/.test(story), '랜딩(/report/) 임베드에도 스토리·타임라인 로드');
  const adm = fs.readFileSync(path.join(root, 'report/admin/index.html'), 'utf8'); ok(adm.indexOf('quest-data.js') > adm.indexOf('onboard-data.js') && adm.indexOf('v2-quest.js') > adm.indexOf('v2-onboard.js'), '관리자 스크립트 로드 순서');

  /* ⑨ 타임라인 = 엔진 값(별도 계산 없음) */
  globalThis.window = globalThis;
  ['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'luck6', 'timeline'].forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
  const TL = globalThis.ReportV2.Timeline, now = Date.UTC(2026, 9, 11), dl = TL.daeun(M, A.ch, now).filter(x => !x.pre);
  ok(dl.length === A.ch.daeun.list.length && dl.every(x => x.scores.fit === Math.round(A.ch.daeun.list[x.idx].ev.fitScore)), '타임라인 대운 점수 = 엔진 값');
  ok(!/Math\.random|fitScore\s*=|\.fit\s*=/.test(tj), '타임라인 코드는 점수를 만들지 않는다');

  /* ⑩ 인생의 주요 주제 = 운명 세계(같은 데이터·같은 이름·같은 이미지, 누르면 그 세계로) */
  vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/explore.js'), 'utf8'), { filename: 'explore.js' });
  const EX = globalThis.ReportV2.Explore, defW = EX.mergeWorlds(null), savedW = EX.mergeWorlds([{ id: 'w2', name: '재물운', line: '직업 · 재물 · 성공', access: 'paid' }, { id: 'w5', enabled: false }]);
  ok(defW.length === 7 && defW.some(w => w.id === 'w7') && savedW.find(w => w.id === 'w2').name === '재물운', '세계 정의: 관리자 저장본이 기본값 위에 덮어쓴다');
  ok(defW.every(w => /\.webp$/.test(EX.artOf(w)) && fs.existsSync(path.join(root, EX.artOf(w).replace(/^\//, '')))), '세계 기본 이미지 = 존재하는 기본 에셋');
  ok(EX.artOf({ id: 'w2', bgImage: '/api/clipfile?k=x.webp' }) === '/api/clipfile?k=x.webp', '세계에 올린 배경이 기본 이미지보다 우선');
  ok(!('topics' in O.merge(O.DEFAULTS, null).timeline) && !('topics' in Q.TIMELINE), '타임라인 주제 목록을 따로 두지 않는다(운명 세계가 단일 출처)');
  const rv = fs.readFileSync(path.join(root, 'report/v2/viewer.js'), 'utf8'), hubjs = fs.readFileSync(path.join(root, 'report/hub/hub.js'), 'utf8');
  ok(/world=\(\[\\w-\]\{1,30\}\)/.test(rv) && rv.includes('x.world.id === WORLD'), '뷰어: ?world= 로 해당 세계를 바로 연다');
  ok(/'&world='/.test(hubjs) && /q\.world/.test(hubjs), '허브: #/go?world= → 뷰어 ?world=');
  ok(/R\.Explore\.artOf\(w\)/.test(tj) && /mergeWorlds/.test(tj) && /#\/go\?to=life&world=/.test(tj) && /\/api\/worlds/.test(tj), '타임라인 주제 타일은 세계 데이터·이미지·링크를 쓴다');

  /* ⑪ 글자 스타일(글씨체·크기·굵기·색) */
  const cs = O.cleanStyle;
  ok(JSON.stringify(cs({ font: 'blackhan', size: '40', sizeM: 28, weight: 700, color: '#FF0000' })) === JSON.stringify({ font: 'blackhan', size: 40, sizeM: 28, weight: '700', color: '#ff0000' }), '스타일 정리: 정상 값');
  ok(Object.keys(cs({ font: 'evil', size: 'abc', weight: 123, color: 'red', x: 1 })).length === 0, '스타일 정리: 알 수 없는 글씨체·숫자·색은 버림');
  ok(cs({ size: 1 }).size === 8 && cs({ size: 999 }).size === 120 && cs({ sizeM: 5000 }).sizeM === 120, '스타일 정리: 크기 범위 8~120');
  ok(O.FONT_KEYS.join() === 'serif,sans,nanummj,gowunb,hahmlet,songmyung,gowund,blackhan,dohyeon,jua,pen,dokdo,gamja,cinzel,cormorant', '글씨체 키가 서버(_textstyle)·fonts.js 와 같다');
  const fk = fs.readFileSync(path.join(root, 'report/story/fonts.js'), 'utf8'); ok(O.FONT_KEYS.every(k => new RegExp('\\b' + k + ': \\[').test(fk)), '모든 글씨체 키가 fonts.js 에 있다');
  const ms = O.merge(O.DEFAULTS, { sections: [{ id: 'research', type: 'research', sty: { title: { color: '#abcdef', size: 33 }, evil: { color: '#fff000' }, notice: { font: 'nope' } } }], intro: [{ id: O.DEFAULTS.intro[0].id, sty: { body: { weight: 600 } } }] });
  ok(ms.sections.find(s => s.id === 'research').sty.title.color === '#abcdef' && !ms.sections.find(s => s.id === 'research').sty.evil && !ms.sections.find(s => s.id === 'research').sty.notice, '섹션 스타일 병합: 알려진 역할만');
  ok(ms.intro[0].sty.body.weight === '600', '소개 장면 스타일 병합');
  const mq = O.merge(O.DEFAULTS, { quest: { steps: [{ id: 'name', sty: { say: { size: 22, color: '#112233' }, bad: { size: 9 } } }] } }); ok(mq.quest.steps.find(s => s.id === 'name').sty.say.size === 22 && !mq.quest.steps.find(s => s.id === 'name').sty.bad, '스토리 장면 스타일 병합');
  r = await call(mod.onRequestPut, req('PUT', '/api/onboarding', { sections: [{ id: 'research', type: 'research', title: 't', sty: { title: { font: 'jua', size: 500, color: '#00ff00', weight: '700', junk: 1 }, zzz: { size: 10 } } }], quest: { steps: [{ id: 'name', sty: { say: { size: 20, color: 'blue' } } }] } }, true));
  r = await call(mod.onRequestGet, req('GET', '/api/onboarding?draft=1', null, true)); const ss = r.j.config.sections[0].sty;
  ok(ss.title.font === 'jua' && ss.title.size === 120 && ss.title.color === '#00ff00' && ss.title.weight === '700' && !('junk' in ss.title) && !ss.zzz, '서버: 스타일 정제(크기 상한·알 수 없는 필드·역할 제거)');
  ok(r.j.config.quest.steps[0].sty.say && r.j.config.quest.steps[0].sty.say.size === 20 && !('color' in r.j.config.quest.steps[0].sty.say), '서버: 잘못된 색은 버리고 나머지는 유지');
  const stj = fs.readFileSync(path.join(root, 'report/hub/onboard-style.js'), 'utf8'); ok(/StoryFonts/.test(stj) && /--tsm/.test(stj), '스타일 적용: 구글 폰트 지연 로딩·모바일 크기 변수');
  ok((qj.match(/A\('/g) || []).length >= 8 && (ob.match(/SA\(/g) || []).length >= 12, '화면 코드에 스타일 적용 지점');
  const hubhtml = read('index.html'); ok(hubhtml.indexOf('onboard-style.js') > hubhtml.indexOf('onboard-data.js') && hubhtml.indexOf('onboard-style.js') < hubhtml.indexOf('hub-onboard.js') && hubhtml.includes('story/fonts.js'), '허브: 글꼴·스타일 스크립트 로드 순서');

  console.log(fails.length ? 'FAIL ' + fails.length + '\n' + fails.map(f => ' - ' + f).join('\n') : 'quest-sim OK');
  if (fails.length) process.exitCode = 1;
})();
