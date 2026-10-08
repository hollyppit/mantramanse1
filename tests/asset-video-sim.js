// 풀이 화면 이미지 슬롯의 영상(Kling) 검증(모의 Kling · R2 · KV):  node tests/asset-video-sim.js
// 슬롯 영상 제출 → 완료 시 미리보기로만 저장 → 확정(uploadVideo) → 공개 /api/assets 의 videos → 영상 빼기
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(__dirname, '..', f)).href);
(async () => {
  const V = await imp('functions/api/panel-video.js'), A = await imp('functions/api/asset-art.js'), PUB = await imp('functions/api/assets.js'), AA = await imp('functions/_assetart.js');
  const kv = new Map(), r2 = new Map(); let state = 'processing';
  const env = { ADMIN_PASSWORD: 'x', KLING_API_KEY: 'NEWKEY',
    GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async o => ({ keys: [...kv.keys()].filter(k => k.startsWith((o && o.prefix) || '')).map(name => ({ name })) }) },
    CLIPS_R2: { head: async k => (r2.has(k) ? { size: r2.get(k).data.length, httpMetadata: { contentType: r2.get(k).type } } : null), get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).data.buffer.slice(r2.get(k).data.byteOffset, r2.get(k).data.byteOffset + r2.get(k).data.length), httpMetadata: { contentType: r2.get(k).type } } : null), put: async (k, d, o) => { r2.set(k, { data: Buffer.from(d), type: (o && o.httpMetadata && o.httpMetadata.contentType) || '' }); }, delete: async k => { r2.delete(k); } } };
  globalThis.fetch = async (u, o) => {
    u = String(u);
    if (/\/image-to-video\//.test(u) && o.method === 'POST') return new Response(JSON.stringify({ code: 0, data: { id: 'kid-1', status: 'submitted' } }), { status: 200 });
    if (/\/tasks\?external_task_ids=/.test(u)) return new Response(JSON.stringify({ code: 0, data: [{ id: 'kid-1', status: state, outputs: state === 'succeeded' ? [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] : [] }] }), { status: 200 });
    if (u === 'https://cdn.example.com/a.mp4') return new Response(Buffer.from('ASSET-MP4'), { status: 200 });
    return new Response('no', { status: 404 });
  };
  const hdr = { authorization: 'Bearer x', 'content-type': 'application/json' };
  const vpost = async b => { const r = await V.onRequestPost({ request: new Request('http://x/api/panel-video', { method: 'POST', headers: hdr, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const vget = async q => { const r = await V.onRequestGet({ request: new Request('http://x/api/panel-video' + q, { headers: hdr }), env }); return { s: r.status, d: await r.json() }; };
  const apost = async b => { const r = await A.onRequestPost({ request: new Request('http://x/api/asset-art', { method: 'POST', headers: hdr, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const pub = async () => (await (await PUB.onRequestGet({ env })).json());
  const SLOT = 'car:을'; r2.set('start.jpg', { data: Buffer.from('JPG'), type: 'image/jpeg' });

  console.log('1. 이미지가 없으면 거부');
  let r = await vpost({ slot: SLOT, startKey: 'start.jpg' }); ok(r.s === 400 && /이미지가 없/.test(r.d.error), '슬롯 이미지가 없으면 영상 생성 거부');
  r = await vpost({ slot: 'nope:x', startKey: 'start.jpg' }); ok(r.s === 400, '없는 슬롯 id 거부');
  r = await apost({ slot: SLOT, uploadVideo: 'v.mp4' }); ok(r.s === 400, '이미지 없는 슬롯에 영상 확정 거부');

  console.log('2. 제출 · 미리보기');
  kv.set('assets:map', JSON.stringify({ [SLOT]: '/api/clipfile?k=asset-car.webp' })); r2.set('asset-car.webp', { data: Buffer.from('IMG'), type: 'image/webp' });
  r = await vpost({ slot: SLOT, startKey: 'start.jpg', prompt: 'p', mode: 'pro', duration: 10 }); ok(r.s === 200 && r.d.ok, '슬롯 영상 제출');
  ok((await vget('')).d.tasks.some(t => t.id === SLOT), '진행 중 작업 목록에 슬롯이 보인다');
  state = 'processing'; r = await vget('?id=' + encodeURIComponent(SLOT)); ok(r.d.status === 'processing', '처리 중');
  state = 'succeeded'; r = await vget('?id=' + encodeURIComponent(SLOT));
  ok(r.d.status === 'done' && r.d.preview && r2.get(r.d.preview) && r2.get(r.d.preview).data.toString() === 'ASSET-MP4', '완료: 영상을 R2 에 미리보기로 저장');
  ok(!(await pub()).videos[SLOT], '확정 전에는 공개 목록(videos)에 없다'); const pk = r.d.preview;

  console.log('3. 확정 · 공개 · 빼기');
  r = await apost({ slot: SLOT, uploadVideo: pk }); ok(r.s === 200 && r.d.video === '/api/clipfile?k=' + pk, '확정');
  let p = await pub(); ok(p.videos[SLOT] === '/api/clipfile?k=' + pk && p.assets[SLOT] === '/api/clipfile?k=asset-car.webp', '공개 /api/assets 에 이미지 + 영상');
  r2.set('v2.mp4', { data: Buffer.from('V2'), type: 'video/mp4' }); r = await apost({ slot: SLOT, uploadVideo: 'v2.mp4' }); ok(r.s === 200 && !r2.has(pk), '새 영상으로 교체하면 옛 영상 파일 삭제');
  const g = await (await A.onRequestGet({ request: new Request('http://x/api/asset-art', { headers: hdr }), env })).json(), sl = g.slots.find(x => x.id === SLOT); ok(sl.video === '/api/clipfile?k=v2.mp4' && sl.tools && /first-frame/.test(sl.tools.prompt), '목록에 현재 영상 · Kling 프롬프트');
  r = await apost({ slot: SLOT, clearVideo: true }); ok(r.s === 200 && !r2.has('v2.mp4') && !(await pub()).videos[SLOT] && (await pub()).assets[SLOT], '영상 빼기: 파일 삭제, 이미지는 그대로');
  ok(AA.slots().every(s => AA.klingOf(s.id) && /Gentle/.test(AA.klingOf(s.id).prompt)), '모든 슬롯에 Kling 프롬프트가 있다');
  console.log(fails.length ? '실패 ' + fails.length + '건' : '풀이 슬롯 영상 검증 모두 통과'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
