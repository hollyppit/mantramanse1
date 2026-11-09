// 시네마틱 온보딩 장면 이미지·영상 생성 검증(모의 OpenAI · Kling · R2 · KV):  node tests/onboard-art-sim.js
// 프롬프트(디렉션·가로/세로·독백) → 이미지 생성(크기) → Kling 제출·조회 → 파일 지우기 제한 → 초안 연결(PUT /api/onboarding { renewal })이 다른 설정을 지우지 않음
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(__dirname, '..', f)).href);
(async () => {
  const A = await imp('functions/api/onboard-art.js'), OB = await imp('functions/api/onboarding.js');
  const kv = new Map(), r2 = new Map(); let state = 'processing', lastImg = null;
  let briefCalls = 0, briefUser = '';
  const env = { ADMIN_PASSWORD: 'x', OPENAI_API_KEY: 'k', ANTHROPIC_API_KEY: 'a', KLING_API_KEY: 'NEWKEY',
    GLOSSARY_KV: { get: async (k, t) => (kv.has(k) ? (t === 'json' ? JSON.parse(kv.get(k)) : kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); }, delete: async k => { kv.delete(k); }, list: async o => ({ keys: [...kv.keys()].filter(k => k.startsWith((o && o.prefix) || '')).map(name => ({ name })) }) },
    CLIPS_R2: { head: async k => (r2.has(k) ? { size: r2.get(k).data.length, httpMetadata: { contentType: r2.get(k).type } } : null), get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).data.buffer.slice(r2.get(k).data.byteOffset, r2.get(k).data.byteOffset + r2.get(k).data.length), httpMetadata: { contentType: r2.get(k).type } } : null), put: async (k, d, o) => { r2.set(k, { data: Buffer.from(d), type: (o && o.httpMetadata && o.httpMetadata.contentType) || '' }); }, delete: async k => { r2.delete(k); } } };
  globalThis.fetch = async (u, o) => {
    u = String(u);
    if (/api\.openai\.com\/v1\/images/.test(u)) { lastImg = typeof o.body === 'string' ? JSON.parse(o.body) : { size: o.body.get('size'), prompt: o.body.get('prompt'), refs: o.body.getAll('image[]').length }; return new Response(JSON.stringify({ data: [{ b64_json: Buffer.from('IMG').toString('base64') }] }), { status: 200 }); }
    if (/api\.anthropic\.com/.test(u)) { const j = JSON.parse(o.body); briefCalls++; briefUser = j.messages[0].content; ok(/\[시네마틱 온보딩 장면 연출\]/.test(j.system), '연출 지시문 사용');
      return new Response(JSON.stringify({ content: [{ type: 'text', text: '연출입니다 {"core":"성공 뒤의 운을 묻는 밤","pc":"PC연출-시상식 뒤 빈 무대 위 금빛 조명","mobile":"MOB연출-트로피를 든 손 클로즈업","motion":"Confetti drifts slowly."}' }] }), { status: 200 }); }
    if (/\/image-to-video\//.test(u) && o.method === 'POST') return new Response(JSON.stringify({ code: 0, data: { id: 'kid-1' } }), { status: 200 });
    if (/\/tasks\?external_task_ids=/.test(u)) return new Response(JSON.stringify({ code: 0, data: [{ status: state, outputs: state === 'succeeded' ? [{ type: 'video', url: 'https://cdn.example.com/a.mp4' }] : [] }] }), { status: 200 });
    if (u === 'https://cdn.example.com/a.mp4') return new Response(Buffer.from('MP4'), { status: 200 });
    return new Response('no', { status: 404 });
  };
  const hdr = { authorization: 'Bearer x', 'content-type': 'application/json' };
  const call = async (fn, method, q, b) => { const r = await A['onRequest' + fn]({ request: new Request('http://x/api/onboard-art' + (q || ''), { method, headers: hdr, body: b ? JSON.stringify(b) : undefined }), env }); return { s: r.status, d: await r.json() }; };
  const SC = { id: 'cinema-luck', title: '운이라는 것', index: 0, lines: ['성공한 사람들이 종종 이런 말을 하잖아요.', '"운이 좋았을 뿐입니다."'] };

  console.log('1. 프롬프트');
  kv.set('panel:direction', JSON.stringify({ art: 'webtoon', extra: '실사 안 되게 주의' }));
  let r = await call('Post', 'POST', '', { scene: SC, orient: 'pc', promptOnly: true });
  ok(r.s === 200 && /가로 16:9/.test(r.d.prompt) && !/세로 구도, 아래쪽 30%/.test(r.d.prompt), 'PC 프롬프트는 가로 구도(세로 패널 문장 제거)');
  ok(/운이라는 것/.test(r.d.prompt) && /운이 좋았을 뿐/.test(r.d.prompt) && /실사 안 되게 주의/.test(r.d.prompt), '장면 제목·독백·비주얼 디렉션 추가 방향이 들어간다');
  r = await call('Post', 'POST', '', { scene: SC, orient: 'mobile', promptOnly: true }); ok(/세로 9:16/.test(r.d.prompt), '모바일 프롬프트는 세로 구도');
  r = await call('Post', 'POST', '', { scene: { id: 'X Y' }, orient: 'pc', promptOnly: true }); ok(r.s === 400, '잘못된 장면 id 거부');

  console.log('1b. 장면 연출(문구 → 화면별 그림)');
  r = await call('Post', 'POST', '', { scene: SC, orient: 'pc', promptOnly: true }); ok(r.d.brief === null && r.d.ai === true, '처음에는 연출 없음 · AI 사용 가능');
  r = await call('Post', 'POST', '', { scene: SC, brief: 'ai' });
  ok(r.s === 200 && r.d.brief.pc.startsWith('PC연출') && r.d.brief.stale === false && /운이 좋았을 뿐/.test(briefUser) && /비주얼 디렉션/.test(briefUser), 'AI 가 독백·비주얼 디렉션을 받아 연출을 짠다');
  r = await call('Post', 'POST', '', { scene: SC, orient: 'pc', promptOnly: true });
  ok(/PC연출-시상식/.test(r.d.prompt) && !/MOB연출/.test(r.d.prompt) && /성공 뒤의 운/.test(r.d.prompt) && /가운데 정렬/.test(r.d.prompt) && /Confetti/.test(r.d.motion.prompt), 'PC 프롬프트: PC 연출만 · 가운데 정렬 문구 자리 · 영상 움직임');
  r = await call('Post', 'POST', '', { scene: SC, orient: 'mobile', promptOnly: true });
  ok(/MOB연출-트로피/.test(r.d.prompt) && !/PC연출/.test(r.d.prompt) && /왼쪽 정렬/.test(r.d.prompt), '모바일 프롬프트: 모바일 연출만 · 왼쪽 정렬 문구 자리');
  r = await call('Post', 'POST', '', { scene: { ...SC, lines: SC.lines.concat('새 문장') }, orient: 'pc', promptOnly: true });
  ok(r.d.brief.stale === true && !/PC연출/.test(r.d.prompt), '문구가 바뀌면 옛 연출은 "다시 짜야 함"이고 프롬프트에 쓰지 않는다');
  r = await call('Post', 'POST', '', { scene: SC, brief: 'save', core: '고친 핵심', pc: '고친 PC', mobile: '고친 모바일' }); ok(r.d.brief.by === 'admin' && r.d.brief.pc === '고친 PC', '관리자가 고친 연출 저장');
  r = await call('Post', 'POST', '', { scene: SC, brief: 'save', core: 'x' }); ok(r.s === 400, '빈 연출 저장 거부');

  console.log('2. 이미지 생성');
  r = await call('Post', 'POST', '', { scene: SC, orient: 'pc' }); ok(r.s === 200 && /^onbart-cinema-luck-pc-/.test(r.d.key) && r2.has(r.d.key) && lastImg.size === '1536x1024' && /고친 PC/.test(lastImg.prompt) && r.d.briefUsed, 'PC 이미지 1536x1024 · 저장한 연출 반영');
  const before = briefCalls; let r9 = await call('Post', 'POST', '', { scene: { ...SC, id: 'cinema-two' }, orient: 'pc' });
  ok(briefCalls === before + 1 && r9.d.autoBrief && /PC연출/.test(lastImg.prompt), '연출이 없는 장면은 이미지 전에 연출을 먼저 짠다');
  const pcKey = r.d.key;
  r2.set('ref1.png', { data: Buffer.from('REF'), type: 'image/png' }); kv.set('panel:direction', JSON.stringify({ refs: ['/api/clipfile?k=ref1.png'], refUse: 'style' }));
  r = await call('Post', 'POST', '', { scene: SC, orient: 'mobile', extra: '촛불 하나' }); ok(r.s === 200 && r.d.field === 'imageMobile' && lastImg.size === '1024x1536' && lastImg.refs === 1 && r.d.refs === 1 && /촛불 하나/.test(lastImg.prompt), '모바일 1024x1536 · 그림체 레퍼런스 첨부 · 추가 요청');

  console.log('3. 영상');
  r2.set('start.jpg', { data: Buffer.from('JPG'), type: 'image/jpeg' });
  r = await call('Post', 'POST', '', { video: true, scene: SC, orient: 'pc', startKey: 'start.jpg', duration: 5 }); ok(r.s === 200 && r.d.id === 'cinema-luck.pc', '영상 제출');
  r = await call('Post', 'POST', '', { video: true, scene: SC, orient: 'pc', startKey: 'start.jpg' }); ok(r.s === 409, '같은 장면·방향 중복 제출 거부');
  ok((await call('Get', 'GET')).d.tasks.some(t => t.id === 'cinema-luck.pc' && t.orient === 'pc'), '진행 중 작업 목록');
  r = await call('Get', 'GET', '?task=cinema-luck.pc'); ok(r.d.status === 'processing', '처리 중');
  state = 'succeeded'; r = await call('Get', 'GET', '?task=cinema-luck.pc'); ok(r.d.status === 'done' && /^onbvid-cinema-luck-pc-/.test(r.d.key) && r2.get(r.d.key).data.toString() === 'MP4' && !r2.has('start.jpg') && !kv.has('onb:vt:cinema-luck.pc'), '완료: 영상 저장 · 첫 프레임·작업 기록 정리');

  console.log('4. 파일 지우기 제한');
  r2.set('asset-x.webp', { data: Buffer.from('A'), type: 'image/webp' });
  r = await call('Delete', 'DELETE', '?k=asset-x.webp'); ok(r.s === 400 && r2.has('asset-x.webp'), '이 화면이 만든 파일(onbart-/onbvid-)만 지울 수 있다');
  r = await call('Delete', 'DELETE', '?k=' + pcKey); ok(r.s === 200 && !r2.has(pcKey), '생성 파일 버리기');

  console.log('5. 초안 연결: renewal 만 보내도 다른 설정은 그대로');
  kv.set('free:onboard:draft', JSON.stringify({ resultDestination: 'test-dest', forceOnboarding: true, version: 'o1', renewal: { cinematic: { enabled: true, scenes: [{ id: 'cinema-luck', title: '운이라는 것', image: '', segments: [{ text: '독백', seconds: 0 }] }] } } }));
  const ren = JSON.parse(kv.get('free:onboard:draft')).renewal; ren.cinematic.scenes[0].image = '/api/clipfile?k=onbart-cinema-luck-pc-abcd.webp'; ren.cinematic.scenes[0].videoMobile = '/api/clipfile?k=onbvid-cinema-luck-mobile-abcd.mp4';
  const pr = await OB.onRequestPut({ request: new Request('http://x/api/onboarding', { method: 'PUT', headers: hdr, body: JSON.stringify({ renewal: ren }) }), env });
  const dr = JSON.parse(kv.get('free:onboard:draft')), s0 = dr.renewal.cinematic.scenes[0];
  ok(pr.status === 200 && s0.image === '/api/clipfile?k=onbart-cinema-luck-pc-abcd.webp' && s0.videoMobile === '/api/clipfile?k=onbvid-cinema-luck-mobile-abcd.mp4', '장면 슬롯에 생성 파일 주소가 초안으로 저장된다');
  ok(dr.resultDestination === 'test-dest' && dr.forceOnboarding === true, '초안의 다른 설정은 지워지지 않는다');
  ok(!kv.has('free:onboard'), '공개본은 바뀌지 않는다(게시 전)');

  console.log(fails.length ? '실패 ' + fails.length + '건' : '시네마틱 온보딩 이미지·영상 검증 모두 통과'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
