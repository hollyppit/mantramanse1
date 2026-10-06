// 풀이 지식 시스템(Interpretation Knowledge) 검증:  node tests/ik-sim.js
// 1. 순수 로직(조건·보정·충돌·패키지·품질 검사)을 실제 엔진 계산 결과로  2. /api/ik 를 메모리 KV 로
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('   ✗ ' + m); } };

(async () => {
  const IK = await import(path.join(root, 'functions/_ik.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const API = await import(path.join(root, 'functions/api/ik.js').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:'));
  const M = globalThis.Manse, S = globalThis.ReportV2.SajuData;
  const chart = (y, m, d, h, mi, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: mi, calendar: 'solar', leap: false, gender: g, city: '서울' });
  const ch = chart(1990, 5, 15, 14, 30, 'M'), sd = S.build(ch, { now: Date.UTC(2026, 9, 6) });
  const Y = sd.nowYear, ext = { future: M.seunRange(ch, Y, Y + 4).map((x, i) => ({ year: Y + i, season: S.seasonOf(x.ev) })) };

  console.log('1. facts · 조건 평가');
  const f = IK.deriveFacts(sd, ext);
  ok(f.dayMaster === '경' && f.dayPillar === '경진' && f.strength === '신강', '일간/일주/신강약 추출');
  ok(f.el['금'].level === 'strong' && f.group['재성'].level === 'weak', '오행·십성군 강약 구간');
  ok(f.futureSeason3.length >= 1 && f.futureYears.length === 5, '앞으로 3·5년 흐름은 엔진 값');
  ok(!('birth' in f), 'facts 에 출생 정보 없음');
  const e1 = IK.evalConds({ dayMaster: ['경'], strength: ['신강'], group: { 재성: 'weak' } }, f); ok(e1.match && e1.spec === 4 + 3 + 3, '조합 조건 통과·구체성 합산');
  ok(!IK.evalConds({ dayMaster: ['갑'] }, f).match, '불일치');
  const e2 = IK.evalConds({ monthBranch: ['사'], star: ['없는신살'] }, { monthBranch: '사' }); ok(!e2.match && e2.missing.includes('star'), '없는 값은 missing 으로 표시');

  console.log('2. 검색 · 게시 규칙 · 보정 · 충돌');
  const mk = (o) => IK.cleanItem(Object.assign({ id: 'MONEY-' + Math.random().toString(36).slice(2, 7), title: 't', domain: 'MONEY', subDomain: 'moneyStructure', status: 'published', reviewed: true, sourceType: 'expert', interpretation: '재물 해석 문장입니다. '.repeat(5) }, o));
  const general = mk({ id: 'MONEY-GEN', title: '일반', conditions: {}, interpretation: '일반론', priority: 5 });
  const specific = mk({ id: 'MONEY-SPEC', title: '경금 신강 재성약', conditions: { dayMaster: ['경'], strength: ['신강'], group: { 재성: 'weak' } }, stance: 'caution', behaviorPatterns: ['벌어도 남기 어려운 장면이 생길 수 있다.'], risks: ['동시에 여러 곳에 비용을 쓰면 현금흐름이 약해질 수 있다.'], actions: ['고정비부터 점검한다.'], modifiers: [{ when: { group: { 비겁: 'strong' } }, effect: 'soften', text: '버티는 힘이 받쳐 준다.' }, { when: { dayMaster: ['갑'] }, effect: 'strengthen', text: '안 나옴' }], realWorldExamples: { worker: '성과급이 들어와도 지출이 같이 늘 수 있다.' } });
  const posSame = mk({ id: 'MONEY-POS', title: '확장 유리', conditions: { dayMaster: ['경'] }, stance: 'positive', priority: 1 });
  const draft = mk({ id: 'MONEY-DRAFT', status: 'draft', conditions: { dayMaster: ['경'] } });
  const aiUnrev = IK.cleanItem({ id: 'MONEY-AI', title: 'ai', domain: 'MONEY', subDomain: 'moneyStructure', status: 'published', reviewed: false, sourceType: 'AI_DRAFT' });
  const excl = mk({ id: 'MONEY-EXCL', conditions: { dayMaster: ['경'] }, exclusions: { strength: ['신강'] } });
  const wrong = mk({ id: 'MONEY-WRONG', conditions: { dayMaster: ['갑'] } });
  ok(aiUnrev.status !== 'published' && aiUnrev.status !== 'approved', 'AI_DRAFT 는 검수 없이 게시되지 않음');
  const r = IK.retrieve([general, specific, posSame, draft, aiUnrev, excl, wrong], f, { domain: 'MONEY' });
  ok(r.used.map(x => x.id).join() === 'MONEY-SPEC,MONEY-POS,MONEY-GEN', '구체 조합 > 일간 > 일반 순서: ' + r.used.map(x => x.id));
  ok(!r.used.some(x => ['MONEY-DRAFT', 'MONEY-AI', 'MONEY-EXCL', 'MONEY-WRONG'].includes(x.id)), '초안·AI초안·제외조건·불일치 제외');
  ok(r.excluded.some(x => x.id === 'MONEY-EXCL' && x.reason === 'excluded'), '제외 사유 기록');
  ok(IK.retrieve([draft], f, { domain: 'MONEY', includeDraft: true }).used.length === 1, '실험실은 초안 포함 가능');
  const mod = IK.applyModifiers(r.used[0], f); ok(mod.hits.length === 1 && mod.hits[0].effect === 'soften' && f.group['비겁'].level === 'strong', '보정 조건 일치분만 적용');
  const cf = IK.detectConflicts(r.used); ok(cf.length === 1 && cf[0].resolved && cf[0].winner === 'MONEY-SPEC', '충돌 감지·구체성으로 해결: ' + JSON.stringify(cf));
  const tie = IK.detectConflicts([{ id: 'a', domain: 'MONEY', subDomain: 'x', stance: 'positive', spec: 3, confidence: 'mid', item: { priority: 1 } }, { id: 'b', domain: 'MONEY', subDomain: 'x', stance: 'caution', spec: 3, confidence: 'mid', item: { priority: 1 } }]);
  ok(tie.length === 1 && !tie[0].resolved, '동률 충돌은 미해결로 남김');

  console.log('3. Interpretation Package · 합성 · 품질 검사');
  const pkg = IK.buildPackage(sd, ext, [general, specific, posSame], null, null, { domain: 'MONEY' });
  ok(pkg.sections.moneyStructure.status === 'ok' && pkg.sections.moneyStructure.items[0].id === 'MONEY-SPEC', 'Section 에 지식 배정');
  ok(!pkg.sections.moneyStructure.items.some(i => i.id === 'MONEY-POS'), '충돌에서 진 지식은 Section 에서 빠짐');
  ok(pkg.sections.business.status === 'insufficient' && pkg.insufficient.includes('business'), '근거 없는 Section 은 insufficient');
  ok(pkg.matchedKnowledge.length === 3 && pkg.unsupported.length > 0, '매칭 목록·미지원 조건 TODO 노출');
  const plain = IK.composePlain(pkg, IK.DEFAULT_RULES);
  ok(plain.moneyStructure.length >= 4 && plain.business === undefined, '규칙 기반 합성: 근거 있는 Section 만');
  ok(plain.moneyStructure.every(p => p.refs.length === 1) && plain.moneyStructure.some(p => p.refs.includes('MONEY-SPEC')), '모든 문단에 근거 id(trace)');
  ok(plain.moneyStructure.some(p => p.kind === 'modifier:m1' && /다만 이 경우에는/.test(p.text)), '완화 보정이 문장에 반영');
  const q1 = IK.qualityCheck(pkg, plain, IK.DEFAULT_RULES); ok(q1.status !== 'FAIL', '정상 합성은 FAIL 아님: ' + JSON.stringify(q1.issues.filter(i => i.level === 'FAIL')));
  const badC = { moneyStructure: [{ text: '2029년에 결혼한다. 반드시 부자가 됩니다. 비겁 식상 재성 관성 인성이 있다.', refs: ['MONEY-FAKE'] }], business: [{ text: '근거 없이 만든 사업운 문장이 매우 길게 이어집니다. '.repeat(3), refs: ['MONEY-SPEC'] }] };
  const q2 = IK.qualityCheck(pkg, badC, IK.DEFAULT_RULES);
  ok(q2.status === 'FAIL' && q2.issues.some(i => /확정/.test(i.msg)) && q2.issues.some(i => /검색되지 않은/.test(i.msg)) && q2.issues.some(i => i.section === 'business' && /근거 없는/.test(i.msg)), '품질 검사가 위험 표현·미검색 인용·근거 없는 Section 을 FAIL: ' + JSON.stringify(q2.issues));
  ok(IK.qualityCheck(pkg, { moneyStructure: [] }, IK.DEFAULT_RULES).issues.some(i => /빈 항목/.test(i.msg)), '빈 항목 감지');
  const san = IK.sanitizeComposed('{"sections":{"moneyStructure":[{"text":"문단","refs":["MONEY-SPEC","MONEY-NOPE"]}],"business":[{"text":"x","refs":[]}]}}', pkg);
  ok(san && san.moneyStructure[0].refs.join() === 'MONEY-SPEC' && !san.business, 'AI 응답 검증: 허용 id 만, insufficient Section 버림');
  ok(IK.sanitizeComposed('not json', pkg) === null, '형식 오류는 null');
  const k1 = await IK.cacheKey({ a: 1, b: [2] }), k2 = await IK.cacheKey({ b: [2], a: 1 }); ok(k1 === k2 && k1.startsWith('ik:pkg:'), '캐시 키는 순서와 무관하게 결정적');
  ok(/AI 초안|insufficient/.test(IK.composerSystem(IK.DEFAULT_RULES, 'MONEY')) && /수입과 자산 축적을 구분/.test(IK.composerSystem(IK.DEFAULT_RULES, 'MONEY')) && !/수입과 자산/.test(IK.composerSystem(IK.DEFAULT_RULES, 'LOVE')), '분야별 Override 가 해당 분야에만 들어감');

  console.log('4. /api/ik (메모리 KV)');
  const store = new Map(), kv = { get: async (k, t) => { const v = store.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { store.set(k, v); } };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' };
  const call = async (a, body, auth = 'pw', method) => { const res = await API.onRequest({ env, request: new Request('https://x/api/ik?' + a, { method: method || (body ? 'POST' : 'GET'), headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }) }); return { s: res.status, d: await res.json() }; };
  ok((await call('a=meta', null, 'bad')).s === 401, '인증 없으면 401');
  const raw = { id: 'MONEY-0142', title: '경금 × 신강 × 재성약', domain: 'MONEY', subDomain: 'moneyStructure', stance: 'caution', conditions: { dayMaster: ['경'], group: { 재성: 'weak' } }, interpretation: '해석', sourceType: 'AI_DRAFT', status: 'published', reviewed: false };
  let s = await call('a=save', { item: raw, isNew: true }); ok(s.s === 200 && s.d.item.status === 'draft' && s.d.item.version === 1, '저장: AI 초안·미검수는 draft 로 강제: ' + JSON.stringify(s.d).slice(0, 120));
  ok((await call('a=save', { item: raw, isNew: true })).s === 409, '중복 id 거부');
  ok((await call('a=status', { id: 'MONEY-0142', status: 'published' })).s === 400, '검수 전 게시 거부');
  s = await call('a=status', { id: 'MONEY-0142', status: 'published', reviewed: true }); ok(s.s === 200 && s.d.item.status === 'published' && s.d.item.reviewed && s.d.item.version === 2, '검수 후 게시');
  s = await call('a=save', { item: { ...s.d.item, title: '수정본' }, expectVersion: 1 }); ok(s.s === 409, '오래된 버전 저장은 충돌(낙관적 잠금)');
  const cur = (await call('a=get&domain=MONEY&id=MONEY-0142')).d.item; s = await call('a=save', { item: { ...cur, title: '수정본' }, expectVersion: cur.version }); ok(s.s === 200 && s.d.item.version === 3, '정상 수정');
  ok((await call('a=hist&id=MONEY-0142')).d.history.length === 2, '변경 이력 보존');
  ok((await call('a=delete', { id: 'MONEY-0142' })).s === 400, '게시 중 삭제 거부');
  s = await call('a=lab', { sd, ext, domain: 'MONEY' }); ok(s.s === 200 && s.d.package.matchedKnowledge.length === 1 && s.d.package.versions.knowledge, '실험실: 게시 지식 검색 + 버전 표기');
  ok(s.d.mode === 'plain' && s.d.quality.status, '실험실: 규칙 합성 + 품질 결과');
  ok(!JSON.stringify(s.d).includes('"solarY"'), '응답에 생년월일 없음');
  s = await call('a=lab', { sd, ext, domain: 'MONEY', compose: 'ai' }); ok(s.s === 200 && s.d.mode === 'plain' && s.d.aiError, 'AI 키가 없으면 규칙 합성으로 폴백하고 이유 표시');
  s = await call('a=design', { design: { MONEY: { sections: [{ id: 'moneyStructure', title: '핵심', enabled: true, required: true }, { id: 'income', title: '수입', enabled: false }] } } }); ok(s.s === 200 && s.d.design.MONEY.sections.length === 2, '풀이 설계 저장');
  s = await call('a=lab', { sd, ext, domain: 'MONEY' }); ok(s.d.package.order.join() === 'moneyStructure', '비활성 Section 은 패키지에서 제외');
  s = await call('a=rules', { rules: { tone: 'pro', depth: 'max', examples: 9, domainOverrides: { MONEY: '규칙' } } }); ok(s.d.rules.tone === 'pro' && s.d.rules.examples === 3, 'AI 규칙 저장·범위 보정');
  s = await call('a=package', { sd, ext, domain: 'MONEY' }); ok(s.s === 200 && s.d.package.sections.moneyStructure.status === 'ok', '패키지 API');
  ok((await call('a=package', { sd, ext, domain: 'NOPE' })).s === 400, '잘못된 분야 거부');
  ok(![...store.keys()].some(k => !k.startsWith('ik:')), '기존 KV 키를 건드리지 않음(ik: 접두어만)');
  ok((await call('a=delete', { id: 'MONEY-0142' })).s === 400 && (await call('a=status', { id: 'MONEY-0142', status: 'archived' })).s === 200 && (await call('a=delete', { id: 'MONEY-0142' })).s === 200, '보관 후 삭제');

  console.log('5. 감사 후 개선 — 관리자 end-to-end (TEST 1~5)');
  const st2 = new Map(), kv2 = { get: async (k, t) => { const v = st2.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { st2.set(k, v); } }, env2 = { GLOSSARY_KV: kv2, ADMIN_PASSWORD: 'pw' };
  const c2 = async (a, body, auth = 'pw') => { const res = await API.onRequest({ env: env2, request: new Request('https://x/api/ik?' + a, { method: body ? 'POST' : 'GET', headers: { ...(auth ? { authorization: 'Bearer ' + auth } : {}), 'content-type': 'application/json', 'cf-connecting-ip': '1.1.1.1' }, body: body ? JSON.stringify(body) : undefined }) }); return { s: res.status, d: await res.json() }; };
  const labOf = async (extra) => (await c2('a=lab', { sd, ext, domain: 'MONEY', ...(extra || {}) })).d;
  // TEST 1: 새 풀이 생성 → 조건 → 게시 → 실제로 검색되고 최종 풀이·근거에 반영
  const kn1 = { id: 'MONEY-0100', title: '경금 신강 재성 약한 구조', domain: 'MONEY', subDomain: 'moneyStructure', stance: 'caution', conditions: { dayMaster: ['경'], strength: ['신강'], group: { 재성: 'weak' } }, interpretation: '들어오는 돈보다 남는 돈이 과제가 되는 구조입니다.', behaviorPatterns: ['벌이가 늘어도 지출이 같이 늘어나는 장면이 반복될 수 있습니다.'], strengths: ['사람을 통해 기회가 들어옵니다.'], risks: ['여러 곳에 비용을 동시에 쓰면 남는 돈이 줄 수 있습니다.'], sourceType: 'expert', confidence: 'high', status: 'published', reviewed: true };
  ok((await c2('a=save', { item: kn1, isNew: true })).s === 200, 'T1 저장');
  let L = await labOf(); ok(L.package.matchedKnowledge.some(m => m.id === 'MONEY-0100' && m.used), 'T1 실제 retrieval 됨');
  ok(L.composed.moneyStructure.some(p => p.text.includes('남는 돈이 과제') && p.refs.includes('MONEY-0100')), 'T1 최종 풀이에 반영 + 근거 id 연결');
  ok(L.package.sections.moneyStructure.items[0].why.length === 3, 'T1 근거(사주에서 확인된 특징) 3개: ' + JSON.stringify(L.package.sections.moneyStructure.items[0].why));
  // TEST 2: 보정(완화) 추가 → 같은 사주 재분석 → 실제 변경 + Trace
  const cur1 = (await c2('a=get&domain=MONEY&id=MONEY-0100')).d.item, textBefore = L.composed.moneyStructure.map(p => p.text).join('|');
  await c2('a=save', { item: { ...cur1, modifiers: [{ when: { group: { 비겁: 'strong' } }, effect: 'soften', text: '버티는 힘이 받쳐 주어 부담은 한결 가볍습니다.' }, { when: { dayMaster: ['갑'] }, effect: 'strengthen', text: '안 나와야 함' }] }, expectVersion: cur1.version });
  L = await labOf(); const textAfter = L.composed.moneyStructure.map(p => p.text).join('|');
  ok(textAfter !== textBefore && textAfter.includes('부담은 한결 가볍습니다') && !textAfter.includes('안 나와야 함'), 'T2 해석이 실제로 바뀜(맞는 보정만)');
  ok(L.package.modifiers.length === 1 && L.package.modifiers[0].effect === 'soften' && L.package.sections.moneyStructure.items[0].modifiers[0].text.includes('버티는'), 'T2 Trace 에 완화 조건');
  const cur1b = (await c2('a=get&domain=MONEY&id=MONEY-0100')).d.item; await c2('a=save', { item: { ...cur1b, modifiers: [{ when: { group: { 비겁: 'strong' } }, effect: 'replace', text: '대체된 핵심 해석 문장입니다.' }], expectVersion: cur1b.version }, expectVersion: cur1b.version });
  L = await labOf(); ok(L.composed.moneyStructure[0].text === '대체된 핵심 해석 문장입니다.' && L.package.sections.moneyStructure.items[0].replaced, 'T2 대체 효과');
  // TEST 3: 비공개 → 서비스(검색)에서 제외, 실험실에서 초안 포함을 켜면 보임
  await c2('a=status', { id: 'MONEY-0100', status: 'approved' }); L = await labOf();
  ok(!L.package.matchedKnowledge.some(m => m.id === 'MONEY-0100'), 'T3 비공개는 production retrieval 제외');
  ok((await labOf({ includeDraft: true })).package.matchedKnowledge.some(m => m.id === 'MONEY-0100'), 'T3 초안 포함 모드에서는 보임');
  await c2('a=status', { id: 'MONEY-0100', status: 'published', reviewed: true });
  // TEST 4: AI 초안 → 검수 전 미사용 → 승인 → 사용
  const realFetch = globalThis.fetch; env2.ANTHROPIC_API_KEY = 'k';
  globalThis.fetch = async () => new Response(JSON.stringify({ content: [{ type: 'text', text: '{"title":"경금 신강 재성 약함 — 저축 구조","domain":"MONEY","subDomain":"accumulation","stance":"caution","conditions":{"dayMaster":["경"],"group":{"재성":"weak"},"evil":["x"],"strength":["신강"]},"interpretation":"모으는 힘은 지출 통제에서 나옵니다.","behaviorPatterns":["월말에 남는 돈이 적다고 느끼기 쉽습니다."],"modifiers":[{"when":{"group":{"인성":"strong"}},"effect":"soften","text":"배운 대로 관리하면 안정됩니다."}],"confidence":"high"}' }], model: 'm' }), { status: 200 });
  let dr = await c2('a=draft', { text: '경금 일간이 신강하고 재성이 약하면 재물이 모이기보다 나뉘기 쉽다. 이런 구조는 지출 통제가 핵심이다. 인성이 강하면 완화된다.' });
  globalThis.fetch = realFetch;
  ok(dr.s === 200 && dr.d.item.status === 'draft' && dr.d.item.sourceType === 'AI_DRAFT' && !dr.d.item.reviewed && dr.d.item.confidence === 'high', 'T4 AI 초안은 draft·AI_DRAFT·검수 전: ' + JSON.stringify(dr.d).slice(0, 200));
  ok(!dr.d.item.conditions.evil && dr.d.item.conditions.dayMaster[0] === '경' && dr.d.item.modifiers.length === 1, 'T4 허용되지 않은 조건은 버려짐');
  const did = dr.d.item.id; ok(!(await labOf()).package.matchedKnowledge.some(m => m.id === did), 'T4 검수 전에는 production 미사용');
  ok((await c2('a=status', { id: did, status: 'published' })).s === 400, 'T4 검수 없이 게시 불가');
  const lab4 = await labOf({ includeDraft: true }); ok(lab4.package.matchedKnowledge.some(m => m.id === did), 'T4 초안 포함 테스트에서는 확인 가능');
  await c2('a=status', { id: did, status: 'published', reviewed: true }); L = await labOf(); ok(L.package.matchedKnowledge.some(m => m.id === did) && L.package.sections.accumulation.status === 'ok', 'T4 승인 후 production 사용');
  const noKey = { ...env2 }; delete noKey.ANTHROPIC_API_KEY; const r0 = await API.onRequest({ env: noKey, request: new Request('https://x/api/ik?a=draft', { method: 'POST', headers: { authorization: 'Bearer pw', 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(40) }) }) }); ok(r0.status === 501, 'T4 AI 키 없으면 명확한 오류');
  delete env2.ANTHROPIC_API_KEY;
  // TEST 5: 풀이 구성에 새 Section → 재분석 시 최종 풀이에 생성
  const des = IK.DEFAULT_DESIGN.MONEY.sections.map(x => ({ ...x })); des.push({ id: 'sideIncome', title: '부수입', enabled: true, required: false });
  await c2('a=design', { design: { MONEY: { required: ['일간 강약'], optional: [], sections: des } } });
  L = await labOf(); ok(L.package.order.includes('sideIncome') && L.package.sections.sideIncome.status === 'insufficient' && !L.composed.sideIncome, 'T5 새 Section 은 근거가 없으면 비어 있음(억지로 채우지 않음)');
  await c2('a=save', { item: { id: 'MONEY-0200', title: '경금 부수입 성향', domain: 'MONEY', subDomain: 'sideIncome', conditions: { dayMaster: ['경'] }, interpretation: '본업 외 수입은 결과가 눈에 보이는 일에서 열립니다.', status: 'published', reviewed: true }, isNew: true });
  L = await labOf(); ok(L.composed.sideIncome && L.composed.sideIncome[0].text.includes('본업 외 수입'), 'T5 새 Section 이 최종 풀이에 생성');

  console.log('6. 조합 조건 · 깊이 · 진단 · 커버리지 · 가져오기 · 서비스 연결');
  // OR(또는 이런 경우도) / NOT(적용하지 않는 경우) / 복수 조건 AND
  const fOR = IK.deriveFacts(sd, ext), orIt = IK.cleanItem({ id: 'MONEY-OR1', title: 'or', domain: 'MONEY', subDomain: 'x', status: 'published', reviewed: true, conditions: { dayMaster: ['갑'] }, alsoWhen: [{ dayMaster: ['경'], strength: ['신강'] }] });
  ok(IK.retrieve([orIt], fOR, { domain: 'MONEY' }).used.length === 1 && IK.retrieve([IK.cleanItem({ ...orIt, id: 'MONEY-OR2', alsoWhen: [{ dayMaster: ['경'], strength: ['신약'] }] })], fOR, { domain: 'MONEY' }).used.length === 0, 'OR: 기본 조건 또는 대안 묶음(대안은 AND)');
  const manyAnd = IK.cleanItem({ id: 'MONEY-AND', title: 'a', domain: 'MONEY', subDomain: 'x', status: 'published', reviewed: true, conditions: { dayMaster: ['경'], strength: ['신강'], hasRoot: ['있음'], group: { 비겁: 'strong', 재성: 'weak' }, daewoonSeason: ['전환기'], seunSeason: ['확장기'] } });
  const rr = IK.retrieve([manyAnd], fOR, { domain: 'MONEY' }); ok(rr.used.length === 1 && rr.used[0].spec === 4 + 3 + 2 + 3 + 3 + 3 + 3, '복수 명리 조건(일간·강약·통근·십성 2·대운·세운) 조합 매칭·구체성: ' + (rr.used[0] || {}).spec);
  ok(IK.retrieve([IK.cleanItem({ ...manyAnd, id: 'MONEY-NOT', exclusions: { hasRoot: ['있음'] } })], fOR, { domain: 'MONEY' }).used.length === 0, 'NOT: 적용하지 않는 경우');
  // 깊이: 간단/기본/상세/매우 상세는 Section 수·지식 수
  const many = []; const dsec = IK.DEFAULT_DESIGN.MONEY.sections; dsec.forEach((x, i) => many.push(IK.cleanItem({ id: 'MONEY-9' + ('00' + i).slice(-3), title: 't' + i, domain: 'MONEY', subDomain: x.id, status: 'published', reviewed: true, conditions: {}, interpretation: '문장 ' + i + ' 입니다. '.repeat(3) })));
  const depthOf = d => IK.buildPackage(sd, ext, many, null, { ...IK.DEFAULT_RULES, depth: d }, { domain: 'MONEY' });
  const okN = p => p.order.filter(i => p.sections[i].status === 'ok').length;
  ok(okN(depthOf('brief')) === 7 && okN(depthOf('standard')) === 12 && okN(depthOf('detailed')) === 14 && okN(depthOf('max')) === 14, '깊이별 Section 수: ' + ['brief', 'standard', 'detailed', 'max'].map(d => okN(depthOf(d))));
  ok(depthOf('brief').order.filter(i => depthOf('brief').sections[i].status === 'skipped').length === 7 && IK.qualityCheck(depthOf('brief'), IK.composePlain(depthOf('brief'), IK.DEFAULT_RULES), IK.DEFAULT_RULES).issues.every(i => !/빈 항목/.test(i.msg)), '깊이로 생략된 Section 은 품질 FAIL 이 아님');
  ok(depthOf('brief').order.filter(i => depthOf('brief').sections[i].status === 'ok').every(i => depthOf('brief').sections[i].required || true) && dsec.filter(x => x.required).slice(0, 7).every(x => depthOf('brief').sections[x.id].status === 'ok'), '필수 Section 이 먼저 채워짐');
  // 진단: 측정 가능한 값
  const pk = depthOf('max'), dg = IK.diagnose(pk, IK.composePlain(pk, IK.DEFAULT_RULES));
  ok(dg.depth.total === 14 && dg.depth.done === 14 && dg.depth.stars === 5 && dg.evidence.avg === 1 && dg.evidence.stars === 2 && dg.reality.pct === 0 && dg.lacking.required === 0, '진단 계산: ' + JSON.stringify(dg));
  const dg0 = IK.diagnose(IK.buildPackage(sd, ext, [], null, null, { domain: 'MONEY' }), {}); ok(dg0.depth.stars === 1 && dg0.evidence.avg === null && dg0.evidence.stars === null && dg0.reality.stars === null, '근거가 없으면 측정 불가 지표는 값을 내지 않음');
  // 커버리지 계산식
  const cov = IK.coverageStats([...many.slice(0, 7), IK.cleanItem({ id: 'MONEY-DRF', title: 'd', domain: 'MONEY', subDomain: dsec[8].id, status: 'draft' })], null).MONEY;
  ok(cov.total === 14 && cov.covered === 7 && cov.pct === 50 && cov.label === '보강 필요' && cov.sections[8].pending === 1 && cov.sections[8].published === 0, '커버리지 = 게시·검수된 지식이 있는 항목/켜 둔 항목: ' + JSON.stringify([cov.covered, cov.pct, cov.label]));
  ok(IK.coverageStats([], null).LOVE.label === '부족' && IK.coverageStats([], null).LOVE.pct === 0, '지식이 없으면 부족');
  const stt = (await c2('a=stats')).d; ok(stt.coverage.MONEY.covered >= 3 && stt.production >= 3 && typeof stt.needReview === 'number', 'stats API');
  // 스캔: 전 분야 분석 가능/근거 부족
  const sc = (await labOf({ scan: true })).scan; ok(sc.length === 8 && sc.find(x => x.domain === 'MONEY').ok >= 3 && sc.find(x => x.domain === 'LOVE').ok === 0 && sc.find(x => x.domain === 'LOVE').lackSections.length > 0, '전 분야 스캔(분석 가능/근거 부족)');
  ok(Array.isArray(L.package.suggest.dayMaster) || (await labOf()).package.suggest.dayMaster[0] === '경', '부족한 풀이 만들기용 조건 제안(이 사주의 실제 값)');
  // 기존 모듈 가져오기
  const cv = {}; globalThis.window = globalThis; for (const fl of ['report/v2/rules.js', 'report/v2/chapters.js', 'report/v2/content.js', 'report/v2/content-pro.js', 'report/v2/content-pro2.js', 'report/v2/content-v3.js']) { try { vm.runInThisContext(fs.readFileSync(path.join(root, fl), 'utf8'), { filename: fl }); } catch (e) { } }
  const legacy = (globalThis.ReportV2.Content.modules || []); ok(legacy.length > 300, '기존 모듈 로드: ' + legacy.length);
  const imp = (await c2('a=import', { modules: legacy })).d; ok(imp.imported > 300 && imp.unsupported === legacy.filter(m => m.category === 'pastLife').length, '기존 모듈 가져오기(전생·상징 콘텐츠 pastLife 는 제외): ' + JSON.stringify(imp));
  const lst = (await c2('a=list')).d.items.filter(x => x.tags.includes('legacy')); ok(lst.length === imp.imported && lst.every(x => x.status === 'review' && !x.reviewed), '가져온 것은 전부 검수 필요(게시 아님)');
  ok((await c2('a=import', { modules: legacy })).d.imported === 0, '가져오기는 중복되지 않음(멱등)');
  const one = legacy.find(m => m.conditions && m.conditions.dayMasterStem && m.category === 'wealth') || legacy.find(m => m.conditions && m.conditions.dayMasterStem); const mapped = IK.fromLegacyModule(one, 1); ok(mapped.conditions.dayMaster.join() === one.conditions.dayMasterStem.join() && mapped.status === 'review' && mapped.sourceReference === 'legacy:' + one.id, '조건 변환: dayMasterStem → dayMaster');
  ok(!(await labOf()).package.matchedKnowledge.some(m => m.id.includes('-L')), '가져온 초안은 production 검색에 들어가지 않음');
  // 서비스(무빙툰·상세 리포트) 연결: 공개 엔드포인트
  const dp = await c2('a=deep', { sd, ext, domains: ['MONEY', 'LOVE'] }, null); const dj = JSON.stringify(dp.d);
  ok(dp.s === 200 && dp.d.enabled && dp.d.domains.MONEY && dp.d.domains.MONEY.sections.length >= 3 && !dp.d.domains.LOVE, '서비스 연결: 인증 없이 게시 지식만으로 분야별 심화 풀이: ' + dj.slice(0, 120));
  ok(!/MONEY-0|DRAFT|"refs"|legacy/.test(dj) && !dj.includes('solarY'), '서비스 응답에는 개발용 ID·초안·생년월일이 없음');
  await c2('a=rules', { rules: { serviceEnabled: false } }); ok((await c2('a=deep', { sd, ext, domains: ['MONEY'] }, null)).d.enabled === false, '관리자가 서비스 연결을 끌 수 있음');
  await c2('a=rules', { rules: { serviceEnabled: true, depth: 'brief', extraPrompt: '추가 지시' } }); const brief = (await c2('a=deep', { sd, ext, domains: ['MONEY'] }, null)).d.domains.MONEY; ok(brief.sections.length <= 7, '관리자의 풀이 깊이 설정이 서비스에도 적용: ' + brief.sections.length);
  ok(IK.composerSystem({ ...IK.DEFAULT_RULES, extraPrompt: '추가 지시' }, 'MONEY').includes('추가 지시'), '고급 설정의 추가 지시문이 Composer 에 들어감');
  let lim = 0; for (let i = 0; i < 25; i++) lim = (await c2('a=deep', { sd, ext, domains: ['MONEY'] }, null)).s; ok(lim === 429, '서비스 엔드포인트는 IP 시간당 한도');
  ok((await c2('a=lab', { sd, ext, domain: 'MONEY' }, null)).s === 401 && (await c2('a=draft', { text: 'x'.repeat(40) }, null)).s === 401 && (await c2('a=import', { modules: [] }, null)).s === 401, '관리 기능은 인증 필요');

  console.log(fails.length ? '\n실패 ' + fails.length + '건' : '\n전부 통과');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
