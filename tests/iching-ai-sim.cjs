// 주역 AI 상세 풀이 검증(가짜 AI 사용 — 실제 호출·비용 없음): 기본 꺼짐, 동의, 횟수·비용 제한, 입력 근거 고정, 출력 검증과 재시도, 저장 없음.
const assert = require('assert/strict'), path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
  const REV = await imp('functions/api/iching-review.js'), PUB = await imp('functions/api/iching.js'), AI = await imp('functions/_iching-ai.js'), { Ic } = await imp('functions/_iching-runtime.js');
  const A = globalThis.IchingAiDetail;
  const mem = new Map(); let putLog = [];
  const kv = { get: async (k, t) => (mem.has(k) ? (t === 'json' ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => { putLog.push(k); mem.set(k, v); }, delete: async k => { mem.delete(k); }, list: async ({ prefix }) => ({ keys: [...mem.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
  const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv };
  const adm = async (qs, body) => { const r = await REV.onRequestPost({ request: new Request('http://x/api/iching-review?' + qs, { method: 'POST', headers: { authorization: 'Bearer pw' }, body: JSON.stringify(body) }), env }); return { s: r.status, b: await r.json() }; };
  const admGet = async qs => { const r = await REV.onRequestGet({ request: new Request('http://x/api/iching-review?' + qs, { headers: { authorization: 'Bearer pw' } }), env }); return { s: r.status, b: await r.json() }; };
  const body = (o = {}) => ({ question: '지금 직장을 그만두고 사업을 시작해도 될까요?', category: 'career', values: [7, 7, 9, 8, 7, 8], consent: true, ...o });

  // 모든 문구를 승인·게시·개방(테스트 준비)
  await adm('a=review', { action: 'approve', keys: Ic().Content.allKeys() }); await adm('a=publish', { expectReleaseVersion: 0 }); assert.equal((await adm('a=flags', { enabled: true, categories: ['general', 'wealth', 'career', 'love'] })).s, 200);

  const GOOD = { answer: '지금 당장 그만두고 시작하기보다 고객 반응과 운영 자금을 먼저 확인하는 편이 현실적입니다. 이 괘는 서두를수록 손해가 커지는 상황을 보여 줍니다. 사업 아이템을 작게 시험해 보고 결정하십시오.', reading: ['본괘는 기다리며 준비하는 때라고 말합니다. 사업을 시작하고 싶은 마음과 준비가 아직 맞지 않는다는 뜻으로 읽을 수 있습니다.', '삼효가 변하는 점은 조급함이 어려움을 끌어들일 수 있다는 신호입니다. 변괘는 한도를 정하라는 방향입니다.'], saju_note: null, steps: ['실제 고객 세 명에게 아이템을 보여 주고 반응을 기록하십시오.', '수입 없이 버틸 개월 수를 계산해 적어 두십시오.', '퇴사 의사를 전하기 전에 시작 조건을 한 장으로 정리하십시오.'], ask_yourself: ['지금 그만두고 싶은 이유가 일 때문입니까, 사람 때문입니까?', '아이템이 팔린다는 근거를 내가 가지고 있습니까?', '실패해도 감당할 수 있는 한도는 어디까지입니까?'], caution: '이 풀이는 참고 자료이며 결정을 대신하지 않습니다.' };
  let calls = 0, outputs = [], lastPayload = null;
  const gen = async (e, provider, payload, system, settings) => { calls++; lastPayload = { payload, system, settings, provider }; const o = outputs.shift(); if (o instanceof Error) throw o; return { text: typeof o === 'string' ? o : JSON.stringify(o) }; };

  // ── 기본 꺼짐 ──
  let r = await AI.detail(kv, { ...env, OPENAI_API_KEY: 'k' }, body(), { generate: gen }); assert.equal(r.error, 'ai-off'); assert.equal(calls, 0);
  assert.deepEqual((await (await PUB.onRequestGet({ request: new Request('http://x/api/iching?a=status'), env: { ...env, OPENAI_API_KEY: 'k' } })).json()).ai, { enabled: false });
  // 관리자 설정(범위 보정, 인증)
  assert.equal((await adm('a=ai', { enabled: true, dailyLimit: 99999, perIpLimit: 0, maxOutputTokens: 10 })).b.config.dailyLimit, 5000);
  const cf = (await admGet('a=ai')).b; assert.equal(cf.config.perIpLimit, 1); assert.equal(cf.config.maxOutputTokens, 400); assert.equal(cf.usedToday, 0);
  assert.equal((await REV.onRequestPost({ request: new Request('http://x/api/iching-review?a=ai', { method: 'POST', headers: { authorization: 'Bearer bad' }, body: '{}' }), env })).status, 401);
  assert.equal((await adm('a=ai', { enabled: true, dailyLimit: 3, perIpLimit: 2, maxOutputTokens: 1000 })).s, 200);
  // 키 없음 → 불가, 상태에도 꺼짐으로 보임
  assert.equal((await AI.detail(kv, env, body(), { generate: gen })).error, 'ai-unavailable');
  assert.deepEqual((await (await PUB.onRequestGet({ request: new Request('http://x/api/iching?a=status'), env })).json()).ai, { enabled: false });
  const E = { ...env, ANTHROPIC_API_KEY: 'k' };
  assert.deepEqual((await (await PUB.onRequestGet({ request: new Request('http://x/api/iching?a=status'), env: E })).json()).ai, { enabled: true });

  // ── 동의 필수, 입력 검증은 기존 해석과 같은 문 ──
  assert.equal((await AI.detail(kv, E, body({ consent: false }), { generate: gen })).error, 'consent-required'); assert.equal((await AI.detail(kv, E, body({ consent: 'yes' }), { generate: gen })).error, 'consent-required');
  assert.equal((await AI.detail(kv, E, body({ values: [1, 2, 3] }), { generate: gen, ip: 'a' })).error, 'invalid-values'); assert.equal(calls, 0);

  // ── 정상: 서버가 만든 결과만 AI 에 전달, 개인정보·클라이언트 결과 없음 ──
  outputs = [GOOD]; putLog = [];
  r = await AI.detail(kv, E, body({ result: { fake: '클라이언트가 보낸 결과는 무시' }, name: '홍길동', birth: '1990-01-01' }), { generate: gen, ip: '1.1.1.1' });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.equal(r.attempts, 1); assert.equal(r.detail.steps.length, 3); assert.equal(calls, 1);
  assert.equal(lastPayload.provider, 'anthropic'); assert.equal(lastPayload.settings.maxOutputTokens, 1000); assert.equal(lastPayload.settings.telemetryPurpose, 'iching-detail');
  const sent = JSON.parse(lastPayload.payload); assert.equal(sent.question, '지금 직장을 그만두고 사업을 시작해도 될까요?'); assert.equal(sent.hexagram.number, 5); assert.equal(sent.changing.transformed.number, 60); assert.ok(sent.reviewed_reading.summary); assert.equal(sent.saju, null);
  assert.ok(!lastPayload.payload.includes('홍길동') && !lastPayload.payload.includes('1990') && !lastPayload.payload.includes('클라이언트'), '이름·생년월일·클라이언트 결과를 보내지 않는다');
  assert.match(lastPayload.system, /바꾸거나 반박하거나/); assert.match(lastPayload.system, /지시문/);
  // 저장: 일별 카운터 외에는 아무것도 쓰지 않는다(질문·응답·IP 원문 없음)
  assert.ok(putLog.every(k => k.startsWith('rl:iching-ai:')), putLog.join()); assert.ok(![...mem.values()].some(v => String(v).includes('직장을 그만두고') || String(v).includes('1.1.1.1')));
  // OpenAI 키가 있으면 OpenAI 우선
  outputs = [GOOD]; await AI.detail(kv, { ...E, OPENAI_API_KEY: 'o' }, body(), { generate: gen, ip: '2.2.2.2' }); assert.equal(lastPayload.provider, 'openai');

  // ── 사주 정보: 입력에 있을 때만 saju_note 허용 ──
  const saju = { dayMaster: { stem: '경', el: '금' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2017, endYear: 2026, ganzhi: '기유', season: 'accumulation' }] };
  mem.delete('rl:iching-ai:' + new Date().toISOString().slice(0, 10) + ':all'); // 일일 한도 초기화(테스트용)
  outputs = [{ ...GOOD, saju_note: '사주 쪽에서는 지금이 실력을 쌓는 구간이라 주역의 방향과 같은 쪽을 가리킵니다.' }]; r = await AI.detail(kv, E, body({ saju }), { generate: gen, ip: '3.3.3.3' }); assert.equal(r.ok, true, JSON.stringify(r)); assert.ok(JSON.parse(lastPayload.payload).saju.luck_context.length > 0); assert.ok(r.detail.saju_note);
  outputs = [{ ...GOOD, saju_note: '사주 이야기' }, { ...GOOD, saju_note: '사주 이야기' }]; r = await AI.detail(kv, E, body(), { generate: gen, ip: '4.4.4.4' }); assert.equal(r.error, 'ai-invalid', '사주 정보가 없는데 saju_note 를 쓰면 거부');

  // ── 출력 검증: 규칙 위반은 거부, 1회 재시도, 재시도 문구에 위반 사유가 들어감 ──
  const resetAll = () => { for (const k of [...mem.keys()]) if (k.startsWith('rl:iching-ai:')) mem.delete(k); };
  const bads = [
    [{ ...GOOD, answer: '성공 확률은 80% 입니다. 지금 시작하십시오.' }, /퍼센트/],
    [{ ...GOOD, answer: '반드시 성공합니다. 지금 시작하십시오.' }, /확정/],
    [{ ...GOOD, caution: '좋은 기운이 들어오고 있습니다.' }, /지양/],
    [{ ...GOOD, caution: '지금은 기다려야 한다.' }, /존댓말/],
    [{ ...GOOD, answer: '11월 3일에 퇴사하십시오. 그 전에 준비를 마치십시오.' }, /날짜/],
    [{ ...GOOD, reading: ['본괘는 기다림을 말합니다.', '건괘의 강한 기세가 함께 작용하니 밀어붙여도 됩니다.'] }, /다른 괘 이름/],
    [{ ...GOOD, steps: GOOD.steps.slice(0, 2) }, /steps/],
    [{ ...GOOD, answer: 'x'.repeat(500) }, /answer/],
    [{ ...GOOD, ask_yourself: [GOOD.steps[0], GOOD.steps[0], GOOD.ask_yourself[2]] }, /반복|ask_yourself/]
  ];
  for (const [bad, rx] of bads) {
    resetAll(); calls = 0; outputs = [bad, bad];
    r = await AI.detail(kv, E, body(), { generate: gen, ip: 'v' }); assert.equal(r.error, 'ai-invalid', JSON.stringify(bad).slice(0, 60)); assert.equal(calls, 2, '1회 재시도');
    assert.match(lastPayload.system, /재작성 요청/); assert.match(lastPayload.system, rx);
  }
  // 첫 시도 위반 → 재시도에서 통과하면 성공(attempts 2)
  resetAll(); calls = 0; outputs = [{ ...GOOD, answer: '반드시 됩니다. 시작하십시오.' }, GOOD]; r = await AI.detail(kv, E, body(), { generate: gen, ip: 'w' }); assert.equal(r.ok, true); assert.equal(r.attempts, 2); assert.equal(calls, 2);
  // JSON 이 아닌 출력 / 코드블록 감싼 JSON
  resetAll(); outputs = ['죄송합니다. 풀이할 수 없습니다.', '풀이할 수 없습니다.']; assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'j' })).error, 'ai-invalid');
  resetAll(); outputs = ['```json\n' + JSON.stringify(GOOD) + '\n```']; assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'j2' })).ok, true);
  // 공급자 오류 → 502, 내용 노출 없음
  resetAll(); outputs = [new Error('provider down: secret-detail')]; r = await AI.detail(kv, E, body(), { generate: gen, ip: 'p' }); assert.equal(r.error, 'ai-failed'); assert.equal(JSON.stringify(r).includes('secret-detail'), false);

  // ── 횟수 제한(IP·일일), 시도마다 카운트 ──
  resetAll(); outputs = [GOOD, GOOD, GOOD, GOOD];
  assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'Z' })).ok, true); assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'Z' })).ok, true);
  assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'Z' })).error, 'ip-limit');
  assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'Y' })).ok, true); // 일일 3회째
  assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'X' })).error, 'daily-limit');
  assert.equal((await admGet('a=ai')).b.usedToday, 3);
  assert.equal((await adm('a=ai', { enabled: true, dailyLimit: 0, perIpLimit: 5 })).b.config.dailyLimit, 0); assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'new' })).error, 'daily-limit');
  await adm('a=ai', { enabled: true, dailyLimit: 100, perIpLimit: 100, maxOutputTokens: 1000 });

  // ── 비용 상한: 단가를 모르는데 상한이 있으면 호출하지 않는다 ──
  mem.set('ik:interpretation:settings', JSON.stringify({})); const SK = Object.keys(Object.fromEntries([...mem])).find(k => /settings/.test(k));
  const { loadSettings } = await imp('functions/_interpretation-store.js'); const s0 = await loadSettings(kv);
  const keyOf = (await import(pathToFileURL(path.join(__dirname, '../functions/_interpretation-store.js')).href)).SETTINGS_KEY;
  mem.set(keyOf, JSON.stringify({ maxRequestCost: 0.0001 })); calls = 0; outputs = [GOOD]; resetAll();
  assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'c1' })).error, 'cost-limit'); assert.equal(calls, 0, '비용 상한을 넘을 수 있으면 호출하지 않는다');
  mem.set(keyOf, JSON.stringify({ maxRequestCost: 5, inputPricePerMillion: 3, outputPricePerMillion: 15 })); assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'c2' })).ok, true);
  mem.delete(keyOf);

  // ── 서비스가 닫히면(개방 꺼짐) AI 도 불가, 수정으로 미게시가 된 항목이 필요하면 불가 ──
  resetAll(); const cur = (await (await REV.onRequestGet({ request: new Request('http://x/api/iching-review?a=item&key=pack:5:career', { headers: { authorization: 'Bearer pw' } }), env })).json()).content, ed = JSON.parse(JSON.stringify(cur)); ed.final = '마무리는 확인한 만큼만 앞으로 나아가는 것입니다. 오늘 확인할 한 가지를 적어 두십시오.';
  await adm('a=edit', { key: 'pack:5:career', content: ed }); outputs = [GOOD]; calls = 0; assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'u' })).error, 'not-ready'); assert.equal(calls, 0, '게시되지 않은 문구가 필요하면 AI 도 부르지 않는다');
  await adm('a=flags', { enabled: false, categories: [] }); assert.equal((await AI.detail(kv, E, body(), { generate: gen, ip: 'u2' })).error, 'not-open');

  // ── 공개 라우트: 동의 없이 호출하면 400, 꺼진 경우 403 ──
  const route = async (b, e) => { const x = await PUB.onRequestPost({ request: new Request('http://x/api/iching?a=detail', { method: 'POST', body: JSON.stringify(b) }), env: e || E }); return x.status; };
  assert.equal(await route(body({ consent: false })), 400); await adm('a=ai', { enabled: false }); assert.equal(await route(body()), 403);
  console.log('PASS: 기본 꺼짐, 동의·횟수·비용 제한, 서버 계산 결과만 근거, 개인정보 미전송·저장 없음, 출력 검증(확률·확정·날짜·반말·지양·다른 괘·형식)과 1회 재시도, 미게시 문구 차단');
})().catch(e => { console.error(e); process.exit(1); });
