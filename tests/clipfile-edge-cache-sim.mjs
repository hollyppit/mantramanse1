// 2026-11-12: /api/clipfile 엣지 보관·긴 브라우저 보관 검사(실제 네트워크·R2 없이).
import assert from 'node:assert/strict';
const mod = await import(new URL('../functions/api/clipfile.js', import.meta.url));
const bytes = new TextEncoder().encode('0123456789abcdefghij');
let r2Gets = 0;
const env = { CLIPS_R2: {
  head: async k => k === 'a1b2.mp4' ? { size: bytes.length, httpMetadata: { contentType: 'video/mp4' } } : null,
  get: async (k, o) => { r2Gets++; if (k !== 'a1b2.mp4') return null; const s = o?.range ? bytes.slice(o.range.offset, o.range.offset + o.range.length) : bytes; return { body: new Response(s).body, size: bytes.length, httpMetadata: { contentType: 'video/mp4' } }; },
} };
const store = new Map();
globalThis.caches = { default: {
  match: async req => { const v = store.get(req.url); if (!v) return undefined; const range = req.headers.get('range'); const m = range && /bytes=(\d+)-(\d*)/.exec(range);
    if (m) { const st = +m[1], en = m[2] ? +m[2] : v.body.length - 1; return new Response(v.body.slice(st, en + 1), { status: 206, headers: { ...v.headers, 'content-range': `bytes ${st}-${en}/${v.body.length}` } }); }
    return new Response(v.body, { headers: v.headers }); },
  put: async (req, res) => { store.set(req.url, { body: new Uint8Array(await res.arrayBuffer()), headers: Object.fromEntries(res.headers) }); },
  delete: async req => store.delete(req.url),
} };
const waits = []; const ctx = (req) => ({ request: req, env, waitUntil: p => waits.push(p) });
const U = 'https://mantrafortune.com/api/clipfile?k=a1b2.mp4';
const settle = async () => { await Promise.all(waits.splice(0)); };

// 1) Range 요청(영상 첫 요청) — R2 에서 잘라 주고, 뒤에서 전체를 엣지에 보관
let res = await mod.onRequestGet(ctx(new Request(U, { headers: { range: 'bytes=0-4' } })));
assert.equal(res.status, 206); assert.equal(await res.text(), '01234'); assert.equal(res.headers.get('cache-control'), mod.CLIP_CC);
await settle(); assert.ok(store.has(U), 'Range 요청 뒤 전체 파일이 엣지에 보관된다');
// 2) 다음 Range 요청은 엣지 보관본에서(R2 안 감)
const before = r2Gets;
res = await mod.onRequestGet(ctx(new Request(U, { headers: { range: 'bytes=5-9' } })));
assert.equal(res.status, 206); assert.equal(await res.text(), '56789'); assert.equal(res.headers.get('x-clip-cache'), 'hit'); assert.equal(r2Gets, before);
// 3) 전체 GET 도 보관본에서, 브라우저 30일 보관
res = await mod.onRequestGet(ctx(new Request(U)));
assert.equal(await res.text(), '0123456789abcdefghij'); assert.equal(res.headers.get('x-clip-cache'), 'hit'); assert.match(res.headers.get('cache-control'), /max-age=2592000/);
// 4) 보관본이 없을 때 전체 GET: 내려 주면서 동시에 보관
store.clear(); res = await mod.onRequestGet(ctx(new Request(U)));
assert.equal(await res.text(), '0123456789abcdefghij'); await settle(); assert.ok(store.has(U));
// 5) 없는 키는 404, Cache API 없는 곳도 동작
assert.equal((await mod.onRequestGet(ctx(new Request('https://x/api/clipfile?k=none.mp4')))).status, 404);
delete globalThis.caches; res = await mod.onRequestGet(ctx(new Request(U, { headers: { range: 'bytes=0-1' } })));
assert.equal(await res.text(), '01');
console.log('PASS clipfile-edge-cache-sim 5항목');
