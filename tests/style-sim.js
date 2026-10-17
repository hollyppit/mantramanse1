// 풀이 문체·단정성(신중형·직설형·단정형) 검증. 실행: node tests/style-sim.js
// 1) 순수 로직(설정 정리·문체 결정·지시문·사후 검사)  2) API(저장·버전·롤백·공개 응답·권한)  3) 생성 파이프라인(IK 합성기·무빙툰 본문·후속 답변·편집기)에 실제로 적용되는지
// 4) 같은 사주로 세 문체를 비교해도 계산·근거가 같은지  5) 근거가 없으면 지어내지 않는지  6) 이미 만들어진 저장본이 유지되는지
const fs = require('fs'), vm = require('vm'), path = require('path'), { pathToFileURL } = require('url');
globalThis.window = globalThis; for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), { filename: f });
const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✓ ' : '  ✗ ') + m); if (!c) fails++; };

// 가짜 AI(Anthropic): 받은 system·user 를 기록한다. 응답은 입력 패키지의 Section·근거 id 로 문장을 만든다.
const seen = []; let reply = null;
const realFetch = global.fetch;
global.fetch = async (u, o = {}) => {
  if (!String(u).includes('api.anthropic.com')) return realFetch(u, o);
  const b = JSON.parse(o.body), user = b.messages[0].content; seen.push({ system: b.system, user });
  if (reply) return new Response(JSON.stringify({ content: [{ type: 'text', text: reply(b) }] }), { status: 200 });
  let pkg = {}; try { pkg = JSON.parse(user.slice(user.indexOf('{'))); } catch { }
  const sections = {};
  for (const sec of pkg.sections || []) { if (sec.status !== 'ok') continue; const ref = (sec.items && sec.items[0] && sec.items[0].id) || ''; sections[sec.id] = [{ kind: 'conclusion', text: '이 사주의 핵심은 독립성과 실행력입니다.', refs: [ref] }, { kind: 'basis', text: '근거는 일간의 힘과 식상의 배치입니다.', refs: [ref] }]; }
  return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ sections }) }] }), { status: 200 });
};
const mem = new Map();
const kv = { get: async (k, t) => { const v = mem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { mem.set(k, String(v)); }, delete: async k => { mem.delete(k); }, list: async () => ({ keys: [] }) };
const env = { INTERPRETATION_ENGINE_MODE: 'legacy', ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv, ANTHROPIC_API_KEY: 'x', IK_DEEP_AI_WAIT_MS: '2000', IK_DEEP_HOURLY_LIMIT: '999', MOVINGTOON_HOURLY_LIMIT: '999' };
const M = globalThis.Manse, SD = globalThis.ReportV2.SajuData;
const callApi = async (file, qs, body, admin, method) => { const mod = await imp('functions/' + file); const get = method === 'GET' || body == null; const res = await (mod.onRequest || mod.onRequestPost)({ env, waitUntil: p => p, request: new Request('http://x/api/' + qs, { method: get ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(admin ? { authorization: 'Bearer pw' } : {}), 'cf-connecting-ip': '5.5.5.5' }, ...(get ? {} : { body: JSON.stringify(body) }) }) }); return { s: res.status, d: await res.json() }; };
const sdOf = (y, mo, d, g) => { const ch = M.compute({ year: y, month: mo, day: d, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: g || 'M', city: '서울' }), sd = SD.build(ch, { now: Date.UTC(2026, 9, 6) }); delete sd.birth; const Y = sd.nowYear; return { sd, ext: { future: M.seunRange(ch, Y, Y + 4).map((x, i) => ({ year: Y + i, season: SD.seasonOf(x.ev) })) } }; };

(async () => {
  const S = await imp('functions/_style.js'), IK = await imp('functions/_ik.js'), MT = await imp('functions/_movingtoon-reading.js'), RA = await imp('functions/_reading-answer.js'), CP = await imp('functions/_compose.js');

  console.log('1. 설정 정리 · 문체 결정');
  const d0 = S.cleanConfig(null);
  ok(d0.defaultStyle === 'direct', '기본 문체는 직설형 심층 감정');
  ok(S.STYLE_IDS.every(i => d0.prompts[i] && d0.prompts[i].length > 30), '세 유형 모두 기본 프롬프트가 있음');
  const c1 = S.cleanConfig({ defaultStyle: 'nope', chapters: { MONEY: 'cautious', '<bad key>': 'direct', LOVE: 'weird' }, prompts: { direct: '  ', assertive: '내가 쓴 단정형 지시' }, story: { address: '', voice: 'x'.repeat(2000) }, characters: { 도령: '말투', '': 'x' } });
  ok(c1.defaultStyle === 'direct' && c1.chapters.MONEY === 'cautious' && !c1.chapters['<bad key>'] && !c1.chapters.LOVE, '알 수 없는 문체·키는 버려짐');
  ok(c1.prompts.direct === S.DEFAULT_PROMPTS.direct && c1.prompts.assertive === '내가 쓴 단정형 지시', '빈 프롬프트는 기본값 · 입력한 프롬프트는 유지');
  ok(c1.story.address === '귀인' && c1.story.voice.length === 800 && c1.characters['도령'] && !c1.characters[''], '호칭 기본 "귀인" · 길이 제한 · 캐릭터 정리');
  ok(S.resolveStyle(c1, ['MONEY']) === 'cautious' && S.resolveStyle(c1, ['ch-x', 'MONEY']) === 'cautious' && S.resolveStyle(c1, ['LOVE']) === 'direct', '챕터 키 → 기본 문체 순으로 결정');
  ok(S.softer('assertive') === 'direct' && S.softer('direct') === 'cautious' && S.softer('cautious') === 'cautious', '근거가 얇을 때 한 단계 낮춤');

  console.log('2. 지시문');
  const dA = S.directive(d0, 'assertive', { structure: true }), dC = S.directive(d0, 'cautious', { structure: true }), dD = S.directive(d0, 'direct');
  ok(/풀이 문체: 단정형/.test(dA) && /풀이 문체: 신중형/.test(dC) && /풀이 문체: 직설형/.test(dD), '유형 이름이 지시문에 들어감');
  ok(/반복해서 쓰지 않을 표현/.test(dA) && !/반복해서 쓰지 않을 표현/.test(dC), '단정형·직설형만 완곡 표현을 줄이도록 지시');
  ok([dA, dC, dD].every(t => /사망|질병|파산|외도/.test(t) && /입력에 없는 사주 정보/.test(t)), '모든 문체에 한계(사건 확정 금지 · 근거 날조 금지)가 붙음');
  ok(/kind="conclusion"/.test(dA) && /kind="action"/.test(dA) && !/kind="conclusion"/.test(dD), '6단 구조는 요청할 때만 포함');
  ok(!/반드시 그렇지는 않습니다.*모든 문장/.test(dA) && !/모든 문장.*가능성/.test(dA), '단정형 지시문에 "모든 문장에 완곡 표현" 같은 강제가 없음');
  ok(/귀인/.test(S.storyDirective(d0)) && /연출/.test(S.storyDirective(d0)), '캐릭터 대사 지시는 풀이 문체와 분리되어 "귀인"을 씀');
  ok(S.sig(dA) !== S.sig(dC) && S.sig(dA) === S.sig(dA), '지시문 서명은 내용에 따라 다르고 결정적');

  console.log('3. 사후 검사');
  const hedgy = '성격이 강할 수 있습니다. 재물운이 좋을 가능성이 있습니다. 대인관계가 넓은 경향이 있습니다. 직장에서 인정받을 수 있습니다. 노력하면 길이 열릴 수 있습니다.';
  const firm = '당신은 독립성이 강한 사람입니다. 이 사주의 핵심은 실행력입니다. 재물 관리에서 가장 큰 문제는 지출 구조입니다. 조직의 안정성보다 역량을 발휘하는 환경에 강점이 있습니다. 올해는 전환의 기운이 강하게 작용하는 시기입니다.';
  const h1 = S.styleCheck(hedgy, 'assertive', d0), h2 = S.styleCheck(firm, 'assertive', d0);
  ok(h1.status === 'WARNING' && h1.ratio >= 0.8, '완곡 표현 위주의 글은 단정형 검사에서 경고 (' + Math.round(h1.ratio * 100) + '%)');
  ok(h2.status === 'PASS' && h2.ratio === 0, '단정적 서술과 "전환의 기운이 강하게 작용하는 시기"는 통과');
  ok(S.styleCheck(hedgy, 'cautious', d0).status === 'PASS', '신중형은 완곡 표현을 문제 삼지 않음');
  for (const bad of ['2027년에 결혼합니다.', '당신은 사기꾼입니다.', '배우자가 외도를 합니다.', '올해 파산하게 됩니다.', '2028년에 임신할 것입니다.', '질병에 걸립니다.', '2030년 사망합니다.', '곧 이혼하게 됩니다.']) ok(S.styleCheck(bad, 'assertive', d0).status === 'FAIL', '확정 예언 차단: ' + bad);
  ok(S.styleCheck('결혼에 대한 관심이 커지는 시기입니다. 변화의 기운이 강합니다.', 'assertive', d0).status === 'PASS', '시기의 성격 서술은 허용');

  console.log('4. API — 저장 · 버전 · 롤백 · 권한');
  let r = await callApi('api/style.js', 'style?a=cfg', null, false); ok(r.s === 401, '관리자 인증 없이 설정 조회 불가');
  r = await callApi('api/style.js', 'style?a=active', null, false); ok(r.s === 200 && r.d.defaultStyle === 'direct' && r.d.ver === 0 && r.d.prompts === undefined && r.d.address === '귀인', '공개 active: 기본 직설형 · 프롬프트 본문은 내보내지 않음');
  r = await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'direct', chapters: { MONEY: 'cautious' } } }, false); ok(r.s === 401, '인증 없이 저장 불가');
  r = await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'direct', chapters: { MONEY: 'cautious' } }, note: '직설형으로' }, true);
  ok(r.s === 200 && r.d.active.ver === 1 && r.d.active.config.defaultStyle === 'direct', 'v1 저장');
  r = await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'assertive' }, note: '다시 단정형' }, true); ok(r.d.active.ver === 2, 'v2 저장');
  r = await callApi('api/style.js', 'style?a=cfg', null, true);
  ok(r.d.active.ver === 2 && r.d.hist.length === 3 && r.d.hist[0].ver === 2 && r.d.hist.some(h => h.ver === 0), '이력: v2 · v1 · 기본값(저장 전)이 남음');
  r = await callApi('api/style.js', 'style?a=rollback', { ver: 1 }, true);
  ok(r.s === 200 && r.d.active.ver === 3 && r.d.active.config.defaultStyle === 'direct' && r.d.active.config.chapters.MONEY === 'cautious', '롤백은 v1 설정을 새 버전 v3 으로 다시 저장');
  r = await callApi('api/style.js', 'style?a=cfg', null, true); ok(r.d.hist[0].rolledBackFrom === 1 && r.d.hist.length === 4, '롤백 출처가 이력에 남고 기존 이력은 지워지지 않음');
  r = await callApi('api/style.js', 'style?a=rollback', { ver: 99 }, true); ok(r.s === 404, '없는 버전 롤백은 404');
  r = await callApi('api/style.js', 'style?a=active', null, false); ok(r.d.ver === 3 && r.d.defaultStyle === 'direct' && r.d.chapters.MONEY === 'cautious', '공개 active 가 새 버전을 반영');

  console.log('5. 같은 사주 · 세 문체 비교(미리보기)');
  await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'assertive' }, note: '기본으로' }, true); // v4
  const A = sdOf(1990, 5, 15);
  for (const [id, dom, sub] of [['MONEY-0001', 'MONEY', 'moneyStructure'], ['MONEY-0002', 'MONEY', 'earningStyle']]) {
    r = await callApi('api/ik.js', 'ik?a=save', { isNew: true, item: { id, domain: dom, subDomain: sub, title: '재물 구조 ' + id, interpretation: 'DB 원문 문장입니다. ' + id, principle: '식상이 재성을 만든다', stance: 'neutral', priority: 10, conditions: {}, reviewed: true, status: 'published', sourceType: 'book', confidence: 'high', evidence: [{ docId: 'DOC-1', title: '적천수 해설', pageStart: 3, pageEnd: 4 }] } }, true);
    if (r.s !== 200) console.log('   (지식 저장 응답)', r.s, JSON.stringify(r.d).slice(0, 200));
  }
  seen.length = 0; reply = null;
  r = await callApi('api/style.js', 'style?a=preview', { sd: A.sd, ext: A.ext, domain: 'MONEY' }, true);
  ok(r.s === 200 && r.d.ok, '미리보기 성공 ' + (r.d.error || ''));
  const P = r.d;
  ok(Object.keys(P.styles).join() === 'cautious,direct,assertive', '세 문체 결과가 모두 있음');
  ok(seen.length === 3, 'AI 를 문체마다 한 번씩 호출 (' + seen.length + '회)');
  const sys = seen.map(x => x.system), usr = seen.map(x => x.user);
  ok(new Set(usr).size === 1, '세 번 모두 같은 입력(계산값·근거 패키지)을 전달 — 문체가 근거를 바꾸지 않음');
  ok(/풀이 문체: 신중형/.test(sys[0]) && /풀이 문체: 직설형/.test(sys[1]) && /풀이 문체: 단정형/.test(sys[2]) && new Set(sys).size === 3, '시스템 프롬프트만 문체별로 다름');
  ok(typeof P.factsHash === 'string' && P.factsHash.length === 8 && P.knowledge.length >= 1 && P.knowledge[0].version >= 1 && P.knowledge[0].sources[0].title === '적천수 해설', '근거 서명 · 근거 자료 출처·버전 반환');
  ok(P.styles.assertive.check && P.styles.assertive.check.status === 'PASS', '단정형 결과가 사후 검사를 통과');
  ok(Object.values(P.styles.assertive.composed).flat().every(p => ['conclusion', 'basis', 'reality', 'strengthWeak', 'luck', 'action'].includes(p.kind)), '문단 kind 가 6단 구조 값으로 정리됨');
  r = await callApi('api/style.js', 'style?a=preview', { sd: A.sd, ext: A.ext, domain: 'MONEY', compose: 'plain' }, true); ok(r.d.factsHash === P.factsHash, '다시 계산해도 근거 서명이 같음(결정적)');

  console.log('6. 생성 파이프라인에 실제로 적용');
  // 6-1 IK 심화(서비스): 활성 문체가 시스템 프롬프트에 들어가고, 문체가 바뀌면 캐시가 다르다
  await callApi('api/ik.js', 'ik?a=rules', { rules: { serviceAi: true } }, true);
  seen.length = 0;
  const deep = async () => (await callApi('api/ik.js', 'ik?a=deep', { sd: A.sd, ext: A.ext, domains: ['MONEY'] }, false)).d;
  let dp = await deep();
  ok(dp.ok && seen.length === 1 && /풀이 문체: 단정형/.test(seen[0].system), '서비스 심화 풀이가 활성 문체(단정형 v4)로 생성됨');
  ok(dp.style && dp.style.ver === 4 && dp.style.byDomain.MONEY.id === 'assertive', '응답에 적용된 문체 버전이 실림');
  const sec0 = dp.domains.MONEY.sections[0];
  ok(sec0.why && sec0.why.applied !== undefined && Array.isArray(sec0.why.sources) && sec0.why.sources.includes('적천수 해설') && !/MONEY-\d/.test(JSON.stringify(sec0.why)), '"왜 이런 풀이?" 근거 요약이 실리고 개발용 id 는 없음');
  const keysBefore = [...mem.keys()].filter(k => k.startsWith('ik:pkg:'));
  ok(keysBefore.length === 1, '합성 결과가 저장됨');
  await deep(); ok(seen.length === 1, '같은 문체 버전이면 저장본 재사용(AI 추가 호출 없음)');
  await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'cautious' }, note: '신중형으로' }, true); // v5
  dp = await deep();
  ok(seen.length === 2 && /풀이 문체: 신중형/.test(seen[1].system) && dp.style.ver === 5, '문체를 바꾸면 새로 생성되고 신중형이 적용됨');
  const keysAfter = [...mem.keys()].filter(k => k.startsWith('ik:pkg:'));
  ok(keysAfter.length === 2 && keysBefore.every(k => keysAfter.includes(k)), '이전 저장본은 그대로 남음(기존 결과 유지)');
  await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'assertive', chapters: { MONEY: 'direct' } }, note: '재물만 직설형' }, true); // v6
  seen.length = 0; await deep(); ok(seen.length === 1 && /풀이 문체: 직설형/.test(seen[0].system), '챕터(분야)별 문체가 기본 문체보다 우선');
  await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'assertive' }, note: '기본 단정형' }, true); // v7

  // 6-2 근거 없는 분야: AI 가 쓰지 않고 지어내지 않는다
  seen.length = 0; r = await callApi('api/ik.js', 'ik?a=deep', { sd: A.sd, ext: A.ext, domains: ['TIMING'] }, false);
  ok(r.d.ok && !r.d.domains.TIMING && seen.length === 0, '검수된 풀이 DB 가 없는 분야는 AI 호출·본문 생성 없이 비움');

  // 6-3 위험 표현은 문체와 무관하게 버림
  reply = () => JSON.stringify({ sections: { moneyStructure: [{ kind: 'conclusion', text: '2027년에 파산하게 됩니다.', refs: ['MONEY-0001'] }] } });
  await callApi('api/style.js', 'style?a=save', { config: { defaultStyle: 'assertive', note: 'x' } }, true); // v8 — 캐시 키를 바꿔 AI 를 다시 부르게 한다
  seen.length = 0; dp = await deep();
  ok(seen.length === 1 && dp.domains.MONEY && /DB 원문/.test(JSON.stringify(dp.domains.MONEY)) && !/파산/.test(JSON.stringify(dp.domains)), '확정 예언 응답은 버리고 DB 문장을 그대로 씀');
  reply = null;

  // 6-4 무빙툰 본문 · 편집기 · 후속 답변 프롬프트
  const sd = A.sd, ps = [{ id: 'p1', text: '재물 구조에 대한 초안 문단입니다. 수입과 지출의 균형을 살펴봅니다.', kind: 'reading' }, { id: 'p2', text: '주인공은 시장 골목에서 장부를 펼쳤다.', kind: 'episode' }];
  const clean = MT.validate({ sd, chapter: { id: 'wealth', title: '재물운', paragraphs: ps }, outline: [] });
  ok(clean && MT.domainsFor(clean.chapter)[0] === 'MONEY', '무빙툰 챕터 → 분야 매핑');
  ok(/생활밀착형 UX 라이팅/.test(MT.systemFor(null)) && /풀이 문체: 직설형/.test(MT.systemFor({ directive: S.directive(d0, 'direct'), story: S.storyDirective(d0) })), 'systemFor: 문체 지시를 붙이고 없어도 기본 UX 정책 적용');
  ok(/kind=episode/.test(MT.systemFor({ directive: 'x', story: 'y' })) && /귀인|캐릭터/.test(S.storyDirective(d0)), '연출(episode)과 풀이(reading) 층이 분리된다고 지시');
  ok(/풀이 문체: 신중형/.test(RA.systemFor({ directive: S.directive(d0, 'cautious') })) && RA.systemFor(null) === RA.SYSTEM, '후속 답변도 문체 지시를 받음');
  ok(/풀이 문체: 단정형/.test(CP.systemFor({ directive: S.directive(d0, 'assertive') })) && CP.systemFor(null) === CP.SYSTEM, '편집기(compose)도 문체 지시를 받음');
  ok(!/모든 문장에 가능성|~할 수 있는 흐름/.test(IK.composerSystem(IK.DEFAULT_RULES, 'MONEY')) && /풀이 문체: 직설형 심층 감정/.test(IK.composerSystem(IK.DEFAULT_RULES, 'MONEY')), 'IK 합성기 기본 프롬프트: 근거 중심 직설형 심층 감정');
  ok((await CP.cacheKey({ chapters: [] }, 'aaa')) !== (await CP.cacheKey({ chapters: [] }, 'bbb')), '편집기 캐시 키에 문체 서명이 들어감');
  ok((await RA.cacheKey({ a: 1 }, 'aaa')) !== (await RA.cacheKey({ a: 1 }, 'bbb')), '후속 답변 캐시 키에 문체 서명이 들어감');

  // 무빙툰 API: 가짜 AI → 문체 적용 · layer 구분 · 확정 예언 거부
  const dayStem = sd.dayMaster, nat = JSON.stringify({ n: 1 });
  const goodText = '재물을 다루는 방식에서 가장 중요한 문제는 수입이 아니라 지출 구조입니다. 이 사주는 안정적인 월급보다 자기 역량을 발휘하는 환경에서 돈의 흐름이 커집니다.';
  reply = () => JSON.stringify({ paragraphs: [{ id: 'p1', text: goodText, refs: ['natal', 'draft'] }, { id: 'p2', text: '가정의 장면입니다. 장부를 펼쳐 기록을 맞추는 동안 놓쳤던 지출 항목을 확인할 수 있습니다.', refs: ['draft'] }] });
  seen.length = 0;
  r = await callApi('api/movingtoon-reading.js', 'movingtoon-reading', { sd, chapter: { id: 'wealth', title: '재물운', paragraphs: ps }, outline: [] }, false);
  ok(r.s === 200 && r.d.ok, '무빙툰 본문 생성 응답 ' + (r.d.error || ''));
  if (r.d.ok) {
    ok(seen.length >= 1 && /풀이 문체: 단정형/.test(seen[0].system) && /귀인/.test(seen[0].system), '본문 생성 프롬프트에 활성 문체와 연출 지침이 들어감');
    ok(r.d.style && r.d.style.id === 'assertive' && r.d.result.paragraphs[0].layer === 'reading' && r.d.result.paragraphs[1].layer === 'story', '응답에 문체 버전과 문단별 층(reading/story)이 실림');
  }
  reply = () => JSON.stringify({ paragraphs: [{ id: 'p1', text: '재물 구조는 좋습니다. 내년에 반드시 큰돈이 들어옵니다. 그리고 안정적입니다.', refs: ['natal'] }, { id: 'p2', text: '귀인은 낡은 장부를 펼치며 한 줄씩 숫자를 맞추기 시작했다. 장터가 멀어졌다.', refs: ['draft'] }] });
  r = await callApi('api/movingtoon-reading.js', 'movingtoon-reading', { sd, chapter: { id: 'wealth2', title: '재물운 둘째', paragraphs: ps }, outline: [] }, false);
  ok(!r.d.ok, '"반드시" 확정 표현이 있는 본문은 문체와 무관하게 거부');
  reply = null;

  console.log('7. 하위 호환');
  ok(typeof IK.deepView === 'function' && IK.deepView({ order: [], sections: {}, domainName: 'x', conflicts: [] }, {}).sections.length === 0, 'deepView 빈 입력 처리');
  const legacy = IK.sanitizeComposed(JSON.stringify({ sections: { moneyStructure: [{ text: 'kind 없는 옛 응답', refs: [] }] } }), { order: ['moneyStructure'], sections: { moneyStructure: { status: 'ok', items: [{ id: 'MONEY-0001' }] } } });
  ok(legacy && legacy.moneyStructure[0].kind === 'ai', 'kind 없는 옛 AI 응답도 그대로 처리');

  console.log('\n' + (fails ? '실패 ' + fails + '건' : '전부 통과')); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
