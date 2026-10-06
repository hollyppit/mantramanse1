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
  ok(IK.qualityCheck(pkg, { moneyStructure: [] }, IK.DEFAULT_RULES).issues.some(i => /빈 Section/.test(i.msg)), '빈 Section 감지');
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

  console.log(fails.length ? '\n실패 ' + fails.length + '건' : '\n전부 통과');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
