// node tests/reading-answer-sim.js — 실제 API의 폴백·검증·캐시·한도와 UI 요청 경쟁 검증
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict'), { pathToFileURL } = require('url');
const root = path.join(__dirname, '..'); globalThis.window = globalThis;
for (const f of ['story-composer', 'reading-answer']) vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'));
const A = ReportV2.ReadingAnswer;
const sd = { name: '전송하지 않을 이름', birth: { year: 1990, month: 5, day: 15 }, dominantGroup: '인성', groups: { 비겁: 15, 식상: 10, 재성: 20, 관성: 20, 인성: 35 }, strength: { band: '신약' }, usefulElements: { yong: '수', fallback: false } };
const reply = { meaning: '준비가 길어 실행이 늦어졌다면, 생각을 행동의 기준으로 바꾸는 상황부터 살펴볼 수 있습니다.', tradeoff: '신중함은 실수를 줄이는 힘이지만, 확인할 내용을 계속 늘리면 결정이 늦어질 수 있습니다.', solution: '배운 것을 작은 결과물로 꺼내는 관점에서, 더 익힐 내용과 지금 확인할 내용을 나누는 것이 보완 방향입니다.', action: '이미 익힌 내용을 작은 초안으로 공유해 보세요. 받은 의견 중 실제로 고칠 한 가지를 확인합니다.', basis: ['dominantGroup', 'strength', 'source'] };
const mem = () => { const m = new Map(); return { get: async (k, t) => m.has(k) ? t === 'json' ? JSON.parse(m.get(k)) : m.get(k) : null, put: async (k, v) => m.set(k, v) }; };
function panel(topic) {
  const els = Object.fromEntries(['.rd-answer-status', '.rd-answer-result', '[data-answer-retry]', '[data-answer-continue]', '[data-answer-skip]'].map(k => [k, { hidden: true, textContent: '', innerHTML: '' }]));
  const choices = A.KEYS.map(k => ({ dataset: { answerChoice: k }, setAttribute: function (a, v) { this[a] = v; } }));
  return { dataset: { answerTopic: topic, completed: '0' }, isConnected: true, querySelector: k => els[k], querySelectorAll: () => choices, setAttribute: function (k, v) { this[k] = v; }, els };
}
function button(p, key) { return { dataset: {}, hasAttribute: a => a === key, closest: s => s === '.rd-answer' ? p : button(p, key) }; }
(async () => {
  const core = await import(pathToFileURL(path.join(root, 'functions/_reading-answer.js')).href), api = await import(pathToFileURL(path.join(root, 'functions/api/reading-answer.js')).href);
  const clean = A.payload('self', 'risk', sd);
  for (const topic of Object.keys(A.TOPICS)) for (const choice of A.KEYS) {
    const data = A.payload(topic, choice, sd); assert.ok(core.validate(data)); assert.equal(/전송하지|birth|1990/.test(JSON.stringify(data)), false);
    assert.equal((A.card(topic).match(/data-answer-choice=/g) || []).length, 4);
  }
  assert.equal(core.validate({ ...clean, topic: '__proto__' }), null);
  assert.equal(core.validate({ ...clean, choice: 'constructor' }), null);
  assert.equal(core.validate({ ...clean, facts: { ...clean.facts, strength: '모름' } }), null);
  assert.equal(core.sanitize(JSON.stringify({ ...reply, solution: '용신은 모르지만 이 사람은 2030년에 결혼을 합니다.' }), clean), null);
  assert.equal(core.sanitize(JSON.stringify({ ...reply, meaning: '<script>alert(1)</script>이 문장은 화면에 넣으면 안 됩니다.' }), clean), null);
  assert.equal(core.sanitize(JSON.stringify({ ...reply, meaning: '모든 일에서 성과를 내는 데 어려움이 없어요.' }), clean), null);
  assert.equal(core.sanitize(JSON.stringify({ ...reply, basis: ['birth'] }), clean), null);
  assert.ok(core.sanitize(JSON.stringify(reply), clean));
  const call = async (env, b = clean) => { const r = await api.onRequestPost({ env, request: new Request('https://test/api/reading-answer', { method: 'POST', body: JSON.stringify(b) }) }); return { status: r.status, d: await r.json() }; };
  const realFetch = global.fetch; let mode = 'ok', calls = [];
  global.fetch = async (u, o) => {
    const p = u.includes('openai.com') ? 'openai' : 'anthropic'; calls.push(p);
    if (p === 'openai' && mode === 'network') throw new Error('network down');
    if (mode === 'all-fail' || p === 'openai' && mode === 'http') return new Response('{}', { status: 503 });
    const text = p === 'openai' && mode === 'invalid' ? '{}' : JSON.stringify(reply);
    return new Response(JSON.stringify(p === 'openai' ? { output: [{ content: [{ type: 'output_text', text }] }] } : { content: [{ type: 'text', text }] }));
  };
  const env = { OPENAI_API_KEY: 'mock', ANTHROPIC_API_KEY: 'mock' };
  for (const m of ['ok', 'http', 'network', 'invalid', 'all-fail']) {
    mode = m; calls = []; const r = await call(env);
    assert.deepEqual(calls, m === 'ok' ? ['openai'] : ['openai', 'anthropic']);
    assert.equal(r.d.ok, m !== 'all-fail'); assert.equal(r.status, m === 'all-fail' ? 502 : 200);
  }
  mode = 'ok'; calls = []; assert.equal((await call({ ANTHROPIC_API_KEY: 'mock' })).d.provider, 'anthropic'); assert.deepEqual(calls, ['anthropic']);
  assert.equal((await call({})).status, 503);
  assert.equal((await call(env, { ...clean, choice: 'other' })).status, 400);
  calls = []; const cachedEnv = { ...env, GLOSSARY_KV: mem() };
  assert.equal((await call(cachedEnv)).d.cached, false); assert.equal((await call(cachedEnv)).d.cached, true); assert.equal(calls.length, 1);
  calls = []; const limited = { ...env, GLOSSARY_KV: mem(), READING_ANSWER_HOURLY_LIMIT: 1 };
  assert.equal((await call(limited)).status, 200); assert.equal((await call(limited, { ...clean, choice: 'action' })).status, 429); assert.equal(calls.length, 1);
  const down = { ...env, GLOSSARY_KV: { get: async () => { throw Error('store down'); } } }; calls = []; assert.equal((await call(down)).status, 503); assert.equal(calls.length, 0);
  global.fetch = realFetch;
  // 답변이 도착해도 자동으로 넘기지 않는다. 계속 버튼을 눌러야 이어간다.
  const p = panel('money'); let paused = 0, resumed = 0;
  const opts = { sd, onPause: () => paused++, onContinue: () => resumed++, fetch: async () => new Response(JSON.stringify({ ok: true, result: reply })) };
  const pending = A.ask(p, 'action', opts); assert.equal(p['aria-busy'], 'true'); assert.equal(p.els['[data-answer-continue]'].hidden, true);
  await pending; assert.equal(paused, 1); assert.equal(resumed, 0); assert.equal(p.els['[data-answer-continue]'].hidden, false); assert.ok(p.els['.rd-answer-result'].innerHTML.includes('명리적 보완 방향'));
  A.handleClick(button(p, 'data-answer-continue'), opts); assert.equal(resumed, 1); assert.equal(p.dataset.completed, '1');
  // 빠르게 다른 선택지를 누르면 먼저 요청한 답변이 나중에 와도 덮어쓰지 않는다.
  const q = panel('love'), jobs = []; const race = { sd, fetch: () => new Promise(resolve => jobs.push(resolve)) };
  const first = A.ask(q, 'risk', race), last = A.ask(q, 'different', race);
  jobs[1](new Response(JSON.stringify({ ok: true, result: { ...reply, meaning: '현재 경험이 다르다면 그 경험을 우선하고 이 풀이의 적용 범위를 제한해서 읽을 수 있습니다.' } }))); await last;
  jobs[0](new Response(JSON.stringify({ ok: true, result: reply }))); await first;
  assert.ok(q.els['.rd-answer-result'].innerHTML.includes('현재 경험이 다르다면'));
  const r = panel('relation'); await A.ask(r, 'risk', { sd, fetch: async () => new Response(JSON.stringify({ ok: false, error: 'ai-unavailable' }), { status: 502 }) });
  assert.equal(r.els['[data-answer-retry]'].hidden, false); assert.equal(r.els['[data-answer-skip]'].hidden, false); assert.equal(r['aria-busy'], 'false');
  const t = panel('career'); let done; const wait = A.ask(t, 'risk', { sd, fetch: () => new Promise(resolve => done = resolve) }); A.handleClick(button(t, 'data-answer-skip'), { sd }); done(new Response(JSON.stringify({ ok: true, result: reply }))); await wait; assert.equal(t.els['.rd-answer-result'].hidden, true); assert.equal(t.dataset.completed, '1');
  assert.ok(A.render({ ...reply, meaning: '<img src=x onerror=alert(1)>' }).includes('&lt;img'));
  console.log('PASS: 24 topic/choice contracts; provider fallback, validation, cache, rate limits, failure recovery and request races');
})().catch(e => { console.error(e); process.exitCode = 1; });