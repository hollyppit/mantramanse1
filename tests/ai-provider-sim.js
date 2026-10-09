// node tests/ai-provider-sim.js — 네트워크 없이 실제 공급자 선택과 폴백 검증
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..');
function load(file, fetch) {
  const ctx = vm.createContext({ Response, Request, AbortSignal, fetch, console,
    json: (d, s = 200) => new Response(JSON.stringify(d), { status: s }),
    isAdmin: () => true, kvOf: () => null,
    runCompose: async (body, deps) => ({ ok: true, result: JSON.parse(await deps.llm('system', 'user')) }),
    validate: x => x, cacheKey: async () => 'test', buildUser: () => 'user', SYSTEM: 'system',
    sanitize: x => { try { return JSON.parse(x); } catch { return null; } }
  });
  const source = fs.readFileSync(path.join(root, file), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/\bexport /g, '');
  vm.runInContext(source, ctx, { filename: file });
  return ctx;
}
(async () => {
  let checks = 0;
  for (const file of ['functions/api/ai.js', 'functions/api/compose.js', 'functions/api/life-ai.js', 'functions/_ikstore.js']) {
    for (const mode of ['success', 'http-error', 'network-error', 'claude-only', 'all-fail']) {
      const calls = [];
      const text = JSON.stringify({ lines: ['테스트 풀이'], chapters: [], relation: [], marriage: [] });
      const ctx = load(file, async url => {
        const provider = url.includes('openai.com') ? 'openai' : 'anthropic'; calls.push(provider);
        if (provider === 'openai' && mode === 'network-error') throw new Error('network down');
        if ((provider === 'openai' && mode === 'http-error') || mode === 'all-fail') return new Response('{}', { status: 503 });
        return new Response(JSON.stringify(provider === 'openai' ? { output: [{ content: [{ type: 'output_text', text }] }] } : { content: [{ type: 'text', text }] }));
      });
      const env = { ANTHROPIC_API_KEY: 'mock', ...(mode === 'claude-only' ? {} : { OPENAI_API_KEY: 'mock' }) };
      let result, thrown;
      try {
        result = file.endsWith('_ikstore.js') ? await ctx.llm(env, 'system', 'user') : await (await ctx.onRequestPost({ env, request: new Request('https://test/api', { method: 'POST', body: JSON.stringify({ task: 'script' }) }) })).json();
      } catch (e) { thrown = e; }
      assert.deepEqual(calls, mode === 'success' ? ['openai'] : mode === 'claude-only' ? ['anthropic'] : ['openai', 'anthropic'], file + ' ' + mode);
      if (mode === 'all-fail') assert.ok(thrown || result.ok === false || result.error, file + ' must fail');
      else assert.ok(result && !result.error, file + ' must succeed');
      checks++;
    }
  }
  console.log('PASS: ' + checks + ' provider priority/fallback scenarios');
})().catch(e => { console.error(e); process.exitCode = 1; });