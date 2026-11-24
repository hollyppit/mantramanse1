// 결제·로그인 중에 이미 요청 중이던 장(2026-11-24): 잠금 해제(unlock)가 요청 중에 오고, 그 요청의 답이 잠금(402)이면
// 잠금 안내로 남지 않고 바로 다시 요청해 문안을 받는다. 요청 중이 아닌 장은 예전처럼 다시 요청 대상이 된다.
// 합성 fetch 만 쓴다(HTTP·운영 요청 없음).
const assert = require('assert/strict'), fs = require('fs'), vm = require('vm');
const source = fs.readFileSync('report/v2/full-reading.js', 'utf8'), tick = () => new Promise(r => setTimeout(r, 0));
function fixture(ids) {
  const calls = [], gates = [], ready = [], answered = {};
  const ctx = { AbortController, Response, Map, Set, Promise, console, setTimeout, clearTimeout,
    fetch: async (url, init) => {
      const id = JSON.parse(init.body).chapter.id; calls.push(id);
      await new Promise(resolve => gates.push({ id, resolve }));
      const n = answered[id] = (answered[id] || 0) + 1;
      // 첫 답은 잠금(구매 전 서버 판정), 두 번째부터는 문안
      if (n === 1) return new Response(JSON.stringify({ ok: false, error: 'locked', locked: { world: 'w1', reason: 'purchase' } }), { status: 402 });
      return new Response(JSON.stringify({ ok: true, provider: 'reviewed-library', aiSkipped: true, providerCallCount: 0, result: { paragraphs: [{ id: '0', text: '구매 뒤 다시 받은 검수 문안이 잠금 안내 대신 화면에 올라오는지 확인하는 충분한 길이의 합성 문장입니다. ' + id }] } }), { status: 200 });
    } };
  vm.runInNewContext(source, ctx);
  const rep = { readingPrefetch: false, chapters: ids.map(id => ({ id, editorialTopicId: 'self', scenes: [{ body: '기존 문안 내용과 근거를 그대로 유지하면서 잠금 해제 뒤 다시 받기를 확인하는 합성 입력 문단입니다.' }] })) };
  ctx.ReportV2.FullReading.prepare(rep, {}, '', c => ready.push(c.id));
  return { api: ctx.ReportV2.FullReading, rep, calls, gates, ready };
}
const release = async (f, id) => { const g = f.gates.find(x => x.id === id && !x.done); assert.ok(g, id + ' 요청 대기 중'); g.done = true; g.resolve(); await tick(); await tick(); };
(async () => {
  // 1) 요청 중에 잠금 해제가 오고, 그 답이 잠금이면 → 바로 다시 요청 → 문안
  const f = fixture(['c0', 'c1', 'c2']);
  f.api.prioritize('c0'); await tick();
  assert.deepEqual(f.calls, ['c0'], '첫 요청');
  f.api.unlock(['c0'], 'c0');   // 결제 완료로 잠금이 풀림(요청은 아직 진행 중)
  await release(f, 'c0');        // 진행 중이던 요청의 답: 잠금(402)
  assert.equal(f.calls.filter(x => x === 'c0').length, 2, '잠금 답 뒤 바로 다시 요청');
  const c0 = f.rep.chapters[0];
  assert.equal(c0.readingLocked, null, '잠금 표시가 남지 않음');
  await release(f, 'c0');        // 다시 요청한 답: 문안
  assert.ok(f.ready.includes('c0'), '문안이 화면으로 올라감');
  assert.ok(Array.isArray(c0.readingParagraphs) && c0.readingParagraphs.length, '문안 문단');
  // 2) 잠금 해제가 없으면 잠금 답은 그대로 잠금 안내(예전 동작 유지)
  const g = fixture(['d0', 'd1']);
  g.api.prioritize('d0'); await tick(); await release(g, 'd0');
  assert.ok(g.rep.chapters[0].readingLocked, '잠금 해제가 없으면 잠금 유지');
  assert.equal(g.calls.filter(x => x === 'd0').length, 1, '다시 요청하지 않음');
  console.log('PASS reading-unlock-recheck-sim: 결제 중 요청하던 장은 잠금 답 대신 다시 받아 문안 표시, 잠금 해제 없으면 잠금 유지');
})().catch(e => { console.error(e); process.exitCode = 1; });
