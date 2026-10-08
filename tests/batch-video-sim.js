// 영상 일괄 만들기(서버 쪽) 검증: 여러 칸을 동시에 제출해도 작업 기록이 서로 덮어쓰이지 않고, 칸마다 따로 조회·완료·삭제된다.  node tests/batch-video-sim.js
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(__dirname, '..', f)).href);
(async () => {
  const V = await imp('functions/api/panel-video.js');
  const kv = new Map(), r2 = new Map(); let n = 0, state = 'processing';
  const env = { ADMIN_PASSWORD: 'x', KLING_API_KEY: 'K',
    GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { await new Promise(r => setTimeout(r, Math.random() * 20)); kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async o => ({ keys: [...kv.keys()].filter(k => k.startsWith((o && o.prefix) || '')).map(name => ({ name })) }) },
    CLIPS_R2: { head: async k => (r2.has(k) ? { size: 3, httpMetadata: { contentType: 'image/jpeg' } } : null), get: async k => (r2.has(k) ? { arrayBuffer: async () => Buffer.from('JPG').buffer } : null), put: async (k, d) => { r2.set(k, Buffer.from(d)); }, delete: async k => { r2.delete(k); } } };
  const sent = [];
  globalThis.fetch = async (u, o) => { u = String(u);
    if (/\/image-to-video\//.test(u) && o.method === 'POST') { const b = JSON.parse(o.body); sent.push(b); return new Response(JSON.stringify({ code: 0, data: { id: 'k' + (++n), status: 'submitted' } }), { status: 200 }); }
    if (/\/tasks\?external_task_ids=/.test(u)) return new Response(JSON.stringify({ code: 0, data: [{ status: state, outputs: state === 'succeeded' ? [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] : [] }] }), { status: 200 });
    if (u === 'https://cdn.example.com/a.mp4') return new Response(Buffer.from('MP4'), { status: 200 });
    return new Response('no', { status: 404 }); };
  const hdr = { authorization: 'Bearer x', 'content-type': 'application/json' };
  const post = async b => { const r = await V.onRequestPost({ request: new Request('http://x/api/panel-video', { method: 'POST', headers: hdr, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const get = async q => { const r = await V.onRequestGet({ request: new Request('http://x/api/panel-video' + q, { headers: hdr }), env }); return { s: r.status, d: await r.json() }; };
  const themes = ['identity', 'talent', 'career', 'wealth', 'love'], ids = themes.map(t => 'panel-wood-' + t + '-F');
  kv.set('media:index', JSON.stringify(themes.map(t => ({ id: 'panel-wood-' + t + '-F', url: '/api/clipfile?k=img-' + t + '.webp', panelVideo: '' }))));
  themes.forEach(t => r2.set('s-' + t + '.jpg', Buffer.from('JPG')));
  console.log('1. 5칸을 동시에 제출');
  const rs = await Promise.all(themes.map(t => post({ kind: 'panelF', element: 'wood', theme: t, startKey: 's-' + t + '.jpg', mode: 'std', duration: 5, extra: 'slower camera' })));
  ok(rs.every(r => r.s === 200 && r.d.ok), '5개 모두 제출 성공: ' + rs.map(r => r.s).join());
  const lst = (await get('')).d.tasks.map(t => t.id).sort(); ok(JSON.stringify(lst) === JSON.stringify(ids.slice().sort()), '진행 중 작업 5개가 모두 기록된다(덮어쓰기 없음): ' + lst.length);
  ok(sent.length === 5 && sent.every(b => /Additional direction: slower camera/.test(b.contents[0].text)), '추가 요청이 프롬프트에 덧붙는다');
  ok((await post({ kind: 'panelF', element: 'wood', theme: 'identity', startKey: 's-identity.jpg' })).s === 409, '같은 칸 중복 제출은 409');
  console.log('2. 칸마다 따로 조회 · 완료');
  state = 'processing'; ok((await get('?id=' + ids[0])).d.status === 'processing', '처리 중');
  state = 'succeeded'; const done = await get('?id=' + ids[0]); ok(done.d.status === 'done' && done.d.preview, '한 칸 완료 → 미리보기 키');
  const rest = (await get('')).d.tasks.map(t => t.id); ok(rest.length === 4 && !rest.includes(ids[0]), '완료된 칸의 기록만 지워지고 나머지 4개는 그대로');
  ok((await get('?id=' + ids[0])).s === 404, '이미 끝난 칸 조회는 404');
  console.log('3. 취소(삭제)');
  const del = await V.onRequestDelete({ request: new Request('http://x/api/panel-video?id=' + ids[1], { method: 'DELETE', headers: hdr }), env }); ok(del.status === 200 && (await get('')).d.tasks.length === 3, '한 칸 기록만 삭제');
  console.log(fails.length ? '실패 ' + fails.length + '건' : '영상 일괄 만들기(서버) 검증 모두 통과'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
