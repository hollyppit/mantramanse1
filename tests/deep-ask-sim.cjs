// 주제별 풀이 끝 "마지막 질문"(타로·주역) + 깊이 읽기 AI 검증(가짜 AI — 실제 호출·비용 없음):  node tests/deep-ask-sim.cjs
// 서버: 기본 꺼짐, 동의, 카드 입력 검증, 서버가 다시 계산한 카드만 근거, 출력 검증(규칙·뽑지 않은 카드·개수)과 1회 재시도,
//       타로·주역 합산 기기당 하루 2회(받은 풀이만 차감), 상태 API. 화면: 노출 조건, 탭, 기본 결과, 깊이 읽기 버튼·남은 횟수, 이스케이프.
const assert = require('assert/strict'), path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
  const TD = await imp('functions/_tarot-deep.js'), API = await imp('functions/api/deep-ai.js'), REV = await imp('functions/api/iching-review.js'), IAI = await imp('functions/_iching-ai.js'), { Ic } = await imp('functions/_iching-runtime.js');
  const T = globalThis.MantraCore.Tarot, A = globalThis.TarotDeepAi;
  const mem = new Map(); let putLog = [];
  const kv = { get: async (k, t) => (mem.has(k) ? (t === 'json' ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => { putLog.push(k); mem.set(k, v); }, delete: async k => { mem.delete(k); }, list: async ({ prefix }) => ({ keys: [...mem.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
  const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv }, E = { ...env, ANTHROPIC_API_KEY: 'k' };
  const adm = async (qs, body) => { const r = await REV.onRequestPost({ request: new Request('http://x/api/iching-review?' + qs, { method: 'POST', headers: { authorization: 'Bearer pw' }, body: JSON.stringify(body) }), env }); return { s: r.status, b: await r.json() }; };
  const status = async (e, dev) => (await API.onRequestGet({ request: new Request('http://x/api/deep-ai?a=status&device=' + (dev || '')), env: e })).json();

  const picks = [{ id: T.cards[0].id, rev: false }, { id: T.cards[30].id, rev: true }, { id: T.cards[50].id, rev: false }];
  const names = picks.map(p => T.byId[p.id].nameKo);
  const body = (o = {}) => ({ mode: 'money', spread: 'three', picks, question: '지금 큰 지출을 해도 괜찮을까요?', consent: true, device: 'd'.repeat(20), ...o });
  const GOOD = { answer: '지금은 큰 지출을 서두르기보다 여력을 먼저 확인하는 편이 현실적입니다. 카드는 흐름이 바뀌는 중이라고 말합니다. 지출의 크기를 한 번 더 줄여 보십시오.', cards: ['과거 자리의 카드는 그동안 무리해서 버텨 온 부분을 보여 줍니다.', '현재 자리의 카드는 정리가 덜 된 상태를 짚습니다.', '미래 자리의 카드는 차분하게 정리하면 가벼워진다고 말합니다.'], saju_note: null, steps: ['이번 달 고정 지출을 숫자로 적어 보십시오.', '큰 지출은 일주일 뒤에 다시 판단하십시오.', '비상금 기준을 먼저 정하십시오.'], caution: '한 번에 큰돈을 쓰는 결정은 미루는 편이 좋습니다.' };
  let calls = 0, outputs = [], last = null;
  const gen = async (e, provider, payload, system, settings) => { calls++; last = { payload, system, settings }; const o = outputs.shift(); if (o instanceof Error) throw o; return { text: typeof o === 'string' ? o : JSON.stringify(o) }; };
  const resetQ = () => { for (const k of [...mem.keys()]) if (k.startsWith('rl:deep-ai:')) mem.delete(k); };

  // ── 기본 꺼짐 · 상태 ──
  assert.equal((await TD.tarotDetail(kv, E, body(), { generate: gen })).error, 'ai-off'); assert.equal(calls, 0);
  assert.deepEqual(await status(E, 'd'.repeat(20)), { tarot: { enabled: false }, iching: { ai: false }, left: 2, limit: 2 });
  assert.equal((await adm('a=ai', { enabled: true, tarotEnabled: true, perDevice: 2, perIpLimit: 6, dailyLimit: 100, maxOutputTokens: 1000 })).s, 200);
  assert.deepEqual(await status(env), { tarot: { enabled: false }, iching: { ai: false }, left: 2, limit: 2 }, 'AI 키가 없으면 꺼진 것으로 보인다');
  assert.deepEqual((await status(E)).tarot, { enabled: true });
  assert.equal((await TD.tarotDetail(kv, env, body(), { generate: gen })).error, 'ai-unavailable');

  // ── 동의 · 입력 검증 ──
  assert.equal((await TD.tarotDetail(kv, E, body({ consent: false }), { generate: gen })).error, 'consent-required');
  assert.equal((await TD.tarotDetail(kv, E, body({ picks: [picks[0], picks[0], picks[1]] }), { generate: gen })).error, 'invalid-cards', '같은 카드 두 번');
  assert.equal((await TD.tarotDetail(kv, E, body({ picks: picks.slice(0, 2) }), { generate: gen })).error, 'invalid-cards', '장수가 배열과 다름');
  assert.equal((await TD.tarotDetail(kv, E, body({ picks: [{ id: 'nope', rev: false }, picks[1], picks[2]] }), { generate: gen })).error, 'invalid-cards');
  assert.equal((await TD.tarotDetail(kv, E, body({ mode: 'yesno' }), { generate: gen })).error, 'invalid-spread');
  assert.equal(calls, 0);

  // ── 정상: 서버가 다시 계산한 카드만 AI 에 보낸다. 개인정보 없음, 저장은 카운터뿐 ──
  outputs = [GOOD]; putLog = [];
  let r = await TD.tarotDetail(kv, E, body({ name: '홍길동', birth: '1990-01-01', reading: '클라이언트 해석' }), { generate: gen, ip: '1.1.1.1' });
  assert.equal(r.ok, true, JSON.stringify(r)); assert.deepEqual(r.quota, { left: 1, limit: 2 }); assert.equal(last.settings.telemetryPurpose, 'tarot-deep');
  const sent = JSON.parse(last.payload); assert.deepEqual(sent.cards.map(c => c.name), names); assert.equal(sent.cards[1].direction, '역방향'); assert.equal(sent.topic, '재물'); assert.ok(sent.overall.band && sent.overall.advice); assert.equal(sent.saju, null);
  assert.ok(!last.payload.includes('홍길동') && !last.payload.includes('1990') && !last.payload.includes('클라이언트'), '이름·생년월일·클라이언트 해석을 보내지 않는다');
  assert.ok(putLog.every(k => k.startsWith('rl:deep-ai:')), putLog.join()); assert.ok(![...mem.values()].some(v => String(v).includes('큰 지출') || String(v).includes('1.1.1.1')), '질문·IP 원문을 저장하지 않는다');

  // ── 사주 요약: 형식이 맞으면 현재 대운만 골라 보내고, 이상하면 버린다 ──
  const saju = { dayMaster: { stem: '경', el: '금' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2013, endYear: 2022, ganzhi: '무인', season: '기회기' }, { startYear: 2023, endYear: 2032, ganzhi: '정축', season: '축적기' }] };
  assert.deepEqual(A.cleanSaju(saju), { day_master: '경(금)', strength: '신약', current_10y: { ganzhi: '정축', years: '2023~2032', period: '축적기' }, topic_band: null });
  assert.equal(A.cleanSaju({ dayMaster: { stem: '경' }, strength: { band: '<b>' } }), null); assert.equal(A.cleanSaju('x'), null);

  // ── 출력 검증 + 1회 재시도(실패는 사람 횟수를 깎지 않는다) ──
  const other = T.cards.map(c => c.nameKo).find(n => n.length >= 3 && !names.includes(n));
  const bads = [[{ ...GOOD, answer: '성공 확률은 80% 입니다. 지금 쓰십시오.' }, /퍼센트/], [{ ...GOOD, cards: GOOD.cards.slice(0, 2) }, /cards/], [{ ...GOOD, caution: other + ' 카드처럼 조심하십시오.' }, /뽑지 않은 카드/], [{ ...GOOD, saju_note: '사주 이야기입니다.' }, /saju_note/], [{ ...GOOD, steps: GOOD.steps.slice(0, 2) }, /steps/]];
  for (const [bad, rx] of bads) { resetQ(); calls = 0; outputs = [bad, bad]; r = await TD.tarotDetail(kv, E, body(), { generate: gen, ip: 'v' }); assert.equal(r.error, 'ai-invalid'); assert.equal(calls, 2); assert.match(last.system, rx); }
  resetQ(); outputs = [{ ...GOOD, answer: '반드시 됩니다. 쓰십시오.' }, GOOD]; r = await TD.tarotDetail(kv, E, body(), { generate: gen, ip: 'w' }); assert.equal(r.ok, true); assert.equal(r.attempts, 2); assert.equal(r.quota.left, 1, '실패한 첫 시도는 차감하지 않았다');
  resetQ(); outputs = [new Error('down: secret')]; r = await TD.tarotDetail(kv, E, body(), { generate: gen, ip: 'p' }); assert.equal(r.error, 'ai-failed'); assert.ok(!JSON.stringify(r).includes('secret'));
  assert.equal((await status(E, 'd'.repeat(20))).left, 2, '실패만 있었으면 2회가 그대로');

  // ── 타로·주역 합산: 같은 기기는 하루 2회 ──
  await adm('a=review', { action: 'approve', keys: Ic().Content.allKeys() }); await adm('a=publish', { expectReleaseVersion: 0 }); await adm('a=flags', { enabled: true, categories: ['general', 'wealth', 'career', 'love'] });
  const IGOOD = { answer: '지금 당장 쓰기보다 여력을 먼저 확인하는 편이 현실적입니다. 이 점괘는 서두를수록 부담이 커진다고 말합니다. 지출의 크기를 줄여 보십시오.', reading: ['본괘는 때를 기다리는 모습을 그립니다.', '변효는 조급함이 손해를 키운다는 신호입니다.'], saju_note: null, steps: ['이번 달 지출을 숫자로 적어 보십시오.', '큰 결정은 일주일 뒤로 미루십시오.', '비상금 기준을 먼저 정하십시오.'], ask_yourself: ['이 지출이 없으면 정말 곤란한가요?', '석 달 뒤에도 같은 선택을 할까요?', '여력은 얼마나 남나요?'], caution: '한 번에 큰돈을 쓰는 결정은 미루는 편이 좋습니다.' };
  resetQ(); outputs = [GOOD, IGOOD];
  assert.equal((await TD.tarotDetail(kv, E, body(), { generate: gen, ip: 'S' })).quota.left, 1);
  const ib = { question: '지금 큰 지출을 해도 될까요?', category: 'wealth', values: [7, 7, 9, 8, 7, 8], consent: true, device: 'd'.repeat(20) };
  const ir = await IAI.detail(kv, E, ib, { generate: gen, ip: 'S' }); assert.equal(ir.ok, true, JSON.stringify(ir).slice(0, 300) + ' ' + (calls)); assert.equal(ir.quota.left, 0, '주역 깊이 읽기도 같은 횟수를 쓴다');
  assert.equal((await TD.tarotDetail(kv, E, body(), { generate: gen, ip: 'S' })).error, 'device-limit');
  assert.equal((await status(E, 'd'.repeat(20))).left, 0);
  // 공개 라우트
  const post = async (qs, b) => (await API.onRequestPost({ request: new Request('http://x/api/deep-ai?' + qs, { method: 'POST', body: JSON.stringify(b) }), env: E })).status;
  assert.equal(await post('a=tarot', body({ consent: false })), 400); assert.equal(await post('a=other', body()), 400);

  // ── 화면: 마지막 질문 카드 ──
  globalThis.window = globalThis; const ls = new Map();
  globalThis.localStorage = { getItem: k => (ls.has(k) ? ls.get(k) : null), setItem: (k, v) => ls.set(k, String(v)) };
  require('../report/v2/iching-card.js'); const DK = require('../report/v2/deep-ask.js'), IC = globalThis.ReportV2.IchingCard;
  assert.equal(DK.offered('w2'), false, '상태를 모르면 넣지 않는다');
  assert.equal(DK.anchorFor([3, 6, 9]), 9, '세계의 마지막 장 뒤'); assert.equal(DK.anchorFor([]), -1);
  DK._setStatus({ tarot: { enabled: true }, iching: { ai: true }, left: 2, limit: 2 });
  assert.equal(DK.offered('w2'), true); assert.equal(DK.offered('w5'), false, '대상이 아닌 세계(전생 등)는 없다');
  let h = DK.html('w2'); assert.match(h, /class="rd-answer rd-deep"/); assert.match(h, /data-completed="0"/); assert.match(h, /마지막 질문 하나/); assert.ok(!/data-dk-tab/.test(h), '주역이 닫혀 있으면 탭 없이 타로만');
  assert.match(h, /카드 세 장 뽑기/); assert.match(h, /data-dk-skip/); assert.match(h, /class="vd rd-answer-choices"/);
  globalThis.Iching = {}; IC._setStatus({ open: true, categories: ['wealth'], ai: { enabled: true } });
  h = DK.html('w2'); assert.match(h, /data-dk-tab="tarot"/); assert.match(h, /data-dk-tab="iching"/); assert.match(h, /data-ic-panel="w2"/); assert.match(h, /data-dk-pane="iching" hidden/);
  DK._setStatus({ tarot: { enabled: false }, iching: { ai: true }, left: 2, limit: 2 }); h = DK.html('w2'); assert.ok(!/data-dk-tarot/.test(h) && /data-ic-panel/.test(h), '타로가 꺼져 있으면 주역만');
  // 결과: 기본 풀이 + 깊이 읽기 버튼(남은 횟수), 0회면 안내
  DK._setStatus({ tarot: { enabled: true }, iching: { ai: true }, left: 1, limit: 2 });
  DK._state.w7 = { phase: 'result', picks, q: '"><img src=x>', ai: null };
  h = DK.html('w7'); names.forEach(n => assert.ok(h.includes(n), n)); assert.match(h, /역방향/); assert.match(h, /카드가 말하는 흐름/); assert.match(h, /오늘 남은 1\/2/); assert.match(h, /data-dk-ai/); assert.ok(!h.includes('<img src=x'), '질문 이스케이프');
  DK._setStatus({ tarot: { enabled: true }, iching: { ai: true }, left: 0, limit: 2 }); h = DK.html('w7'); assert.ok(!/data-dk-ai/.test(h)); assert.match(h, /모두 썼어요/);
  DK._state.w7.ai = { phase: 'done', detail: { ...GOOD, answer: '<b>x</b>' } }; h = DK.html('w7'); assert.match(h, /AI 작성/); assert.match(h, /&lt;b&gt;x/); assert.match(h, /카드 기본 풀이 보기/);
  // 기기 ID 는 한 번 만들어 계속 쓴다
  const d1 = DK.device(); assert.match(d1, /^[a-f0-9]{24}$/); assert.equal(DK.device(), d1);
  console.log('PASS deep-ask-sim: 기본 꺼짐·상태, 동의·카드 검증, 서버 계산 카드만 근거·개인정보 미전송·저장 없음, 출력 검증과 재시도, 실패 미차감, 타로·주역 합산 기기당 2회, 마지막 질문 카드 노출·탭·결과·남은 횟수·이스케이프');
})().catch(e => { console.error(e); process.exit(1); });
