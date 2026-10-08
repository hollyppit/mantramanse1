// 컷 영상 생성(Kling 이미지→영상) 검증(모의 Kling · R2 · KV):  node tests/panel-video-sim.js
// JWT(HS256) 서명 · 제출/조회 요청 모양 · 완료 시 영상 저장·칸 교체 · 실패·중복·키 없음·잘못된 시작 프레임
const path = require('path'), crypto = require('crypto'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(__dirname, '..', f)).href);
(async () => {
  const V = await imp('functions/api/panel-video.js'), K = await imp('functions/_kling.js');
  const kv = new Map(), r2 = new Map(), calls = [];
  const env = { ADMIN_PASSWORD: 'x', KLING_ACCESS_KEY: 'AK123', KLING_SECRET_KEY: 'SK456',
    GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
    CLIPS_R2: { head: async k => (r2.has(k) ? { size: r2.get(k).data.length, httpMetadata: { contentType: r2.get(k).type } } : null), get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).data.buffer.slice(r2.get(k).data.byteOffset, r2.get(k).data.byteOffset + r2.get(k).data.length) } : null), put: async (k, v, o) => { r2.set(k, { data: Buffer.from(v), type: (o && o.httpMetadata && o.httpMetadata.contentType) || '' }); }, delete: async k => { r2.delete(k); } } };
  let state = 'processing', failMsg = 'boom', submitCode = 0;
  globalThis.fetch = async (u, o) => {
    u = String(u); calls.push({ u, o });
    if (/image2video$/.test(u) && o.method === 'POST') return new Response(JSON.stringify(submitCode ? { code: submitCode, message: 'balance not enough' } : { code: 0, data: { task_id: 'task-1', task_status: 'submitted' } }), { status: submitCode ? 400 : 200 });
    if (/image2video\/task-1$/.test(u)) return new Response(JSON.stringify({ code: 0, data: { task_id: 'task-1', task_status: state, task_status_msg: failMsg, task_result: state === 'succeed' ? { videos: [{ id: 'v', url: 'https://cdn.example.com/out.mp4', duration: '5' }] } : undefined } }));
    if (u === 'https://cdn.example.com/out.mp4') return new Response(Buffer.from('FAKE-MP4-BYTES'), { status: 200 });
    return new Response('no', { status: 404 });
  };
  const req = (method, url, body, auth = true) => new Request('http://x/api/panel-video' + url, { method, headers: auth ? { authorization: 'Bearer x', 'content-type': 'application/json' } : { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const POST = async b => { const r = await V.onRequestPost({ request: req('POST', '', b), env }); return { s: r.status, d: await r.json() }; };
  const GET = async (q = '', e = env) => { const r = await V.onRequestGet({ request: req('GET', q), env: e }); return { s: r.status, d: await r.json() }; };

  console.log('1. JWT');
  const t = await K.klingJwt(env, 1700000000), [h, p, s] = t.split('.'), dec = x => JSON.parse(Buffer.from(x.split('-').join('+').split('_').join('/'), 'base64').toString());
  ok(dec(h).alg === 'HS256' && dec(p).iss === 'AK123' && dec(p).exp === 1700001800 && dec(p).nbf === 1699999995, 'JWT 헤더·클레임(iss=AK, exp=+30분, nbf)');
  ok(s === crypto.createHmac('sha256', 'SK456').update(h + '.' + p).digest('base64').split('+').join('-').split('/').join('_').split('=').join(''), 'JWT 서명이 HMAC-SHA256(SecretKey) 와 같다');

  console.log('2. 키 없음 · 인증');
  ok((await GET('', { ...env, KLING_ACCESS_KEY: '' })).d.enabled === false && (await GET()).d.enabled === true, '키가 없으면 enabled=false(관리자 화면이 안내 표시)');
  let r = await V.onRequestPost({ request: req('POST', '', {}, false), env }); ok(r.status === 401, '관리자가 아니면 거부');
  r = await V.onRequestPost({ request: req('POST', '', { element: 'wood', theme: 'love', startKey: 'a.jpg' }), env: { ...env, KLING_SECRET_KEY: '' } }); ok(r.status === 501 && /KLING_ACCESS_KEY/.test((await r.json()).error), '키가 없으면 501 + 설정 안내');

  console.log('3. 제출');
  const kvIdx = [{ id: 'panel-wood-love-F', url: '/api/clipfile?k=cell.webp', panelVideo: '/api/clipfile?k=oldvid.mp4', type: 'image' }]; kv.set('media:index', JSON.stringify(kvIdx));
  r2.set('cell.webp', { data: Buffer.from('img'), type: 'image/webp' }); r2.set('oldvid.mp4', { data: Buffer.from('old'), type: 'video/mp4' });
  r2.set('start1.jpg', { data: Buffer.from('JPEGBYTES'), type: 'image/jpeg' }); r2.set('start2.webp', { data: Buffer.from('x'), type: 'image/webp' });
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelM', startKey: 'start1.jpg' }); ok(r.s === 400 && /이미지가 없습니다/.test(r.d.error), '이미지가 없는 칸은 거부');
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start2.webp' }); ok(r.s === 400 && /JPG 또는 PNG/.test(r.d.error), 'webp 시작 프레임은 거부');
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: '../x' }); ok(r.s === 400, '잘못된 키 거부');
  submitCode = 1102; r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start1.jpg' }); ok(r.s === 502 && /balance/.test(r.d.error) && !r2.has('start1.jpg'), 'Kling 오류(크레딧 부족 등)는 메시지를 돌려주고 임시 시작 프레임을 지운다'); submitCode = 0;
  r2.set('start1.jpg', { data: Buffer.from('JPEGBYTES'), type: 'image/jpeg' });
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start1.jpg', prompt: '내가 쓴 프롬프트', mode: 'pro' });
  const sub = calls.filter(c => /image2video$/.test(c.u)).at(-1), body = JSON.parse(sub.o.body);
  ok(r.s === 200 && r.d.id === 'panel-wood-love-F' && /^https:\/\/api\.klingai\.com\/v1\/videos\/image2video$/.test(sub.u), '제출: POST /v1/videos/image2video');
  ok(/^Bearer [\w-]+\.[\w-]+\.[\w-]+$/.test(sub.o.headers.authorization), 'Authorization: Bearer <JWT>');
  ok(body.image === Buffer.from('JPEGBYTES').toString('base64') && !/^data:/.test(body.image) && body.mode === 'pro' && body.duration === '5' && body.model_name === 'kling-v1-6' && body.prompt === '내가 쓴 프롬프트' && /face morphing/.test(body.negative_prompt) && body.cfg_scale === 0.5, '본문: base64 이미지(접두사 없음) · mode pro · 5초 · 프롬프트/네거티브');
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start1.jpg' }); ok(r.s === 409, '같은 칸을 두 번 제출하면 거부');
  ok((await GET()).d.tasks.some(x => x.id === 'panel-wood-love-F'), '진행 중 작업 목록에 나온다(새로고침해도 이어서 확인)');

  console.log('4. 조회 · 완료');
  state = 'processing'; r = await GET('?id=panel-wood-love-F'); ok(r.s === 200 && r.d.status === 'processing', '처리 중');
  state = 'succeed'; r = await GET('?id=panel-wood-love-F');
  const idx = JSON.parse(kv.get('media:index')), it = idx.find(m => m.id === 'panel-wood-love-F'), vk = it && /k=([\w.-]+)$/.exec(it.panelVideo || '');
  ok(r.s === 200 && r.d.status === 'done' && vk && r2.has(vk[1]) && r2.get(vk[1]).data.toString() === 'FAKE-MP4-BYTES' && r2.get(vk[1]).type === 'video/mp4', '완료: 영상을 R2 에 저장하고 칸의 영상으로 교체');
  ok(it.url === '/api/clipfile?k=cell.webp' && !r2.has('oldvid.mp4') && !r2.has('start1.jpg'), '정지 이미지는 포스터로 그대로, 옛 영상·임시 시작 프레임은 삭제');
  ok(!(await GET()).d.tasks.length && (await GET('?id=panel-wood-love-F')).s === 404, '완료된 작업 기록은 지워진다');

  console.log('5. 실패 · 취소');
  state = 'processing'; r2.set('start3.jpg', { data: Buffer.from('J'), type: 'image/png' });
  r = await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start3.jpg' }); ok(r.s === 200, '다시 제출');
  state = 'failed'; failMsg = 'content policy'; r = await GET('?id=panel-wood-love-F'); ok(r.d.status === 'failed' && /content policy/.test(r.d.error) && !r2.has('start3.jpg'), '실패: Kling 메시지를 돌려주고 기록·시작 프레임 정리');
  state = 'processing'; r2.set('start4.jpg', { data: Buffer.from('J'), type: 'image/jpeg' }); await POST({ element: 'wood', theme: 'love', kind: 'panelF', startKey: 'start4.jpg' });
  r = await V.onRequestDelete({ request: req('DELETE', '?id=panel-wood-love-F'), env }); ok(r.status === 200 && !(await GET()).d.tasks.length && !r2.has('start4.jpg'), '진행 중 기록 지우기(취소)');

  if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('\n컷 영상 생성(Kling) 검증 모두 통과');
})();
