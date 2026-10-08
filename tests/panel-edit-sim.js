// 패널 세부 수정 흐름 검증(모의 R2·KV·fetch):  node tests/panel-edit-sim.js
// 미리 만들기 → 현재 이미지 바탕 수정 → 확정(교체·옛 파일 삭제·프롬프트 저장) → 버리기 / GPT 실패 시 Gemini 폴백
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const A = await import(require('url').pathToFileURL(path.join(__dirname, '../functions/api/panel-art.js')).href);
  const png = Buffer.from('abc').toString('base64'), seen = []; let gptDown = false;
  globalThis.fetch = async (u, o) => { seen.push(String(u) + (o && o.body instanceof FormData ? ' [multipart]' : '')); if (/openai/.test(u)) return gptDown ? new Response('x', { status: 500 }) : new Response(JSON.stringify({ data: [{ b64_json: png }] })); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }] })); };
  const kv = new Map(), r2 = new Map(), env = { ADMIN_PASSWORD: 'x', OPENAI_API_KEY: 'k', GEMINI_API_KEY: 'g',
    GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
    CLIPS_R2: { head: async k => (r2.has(k) ? { size: r2.get(k).length, httpMetadata: { contentType: /[.](mp4|webm)$/.test(k) ? 'video/mp4' : 'image/png' } } : null), put: async (k, v) => { r2.set(k, Buffer.from(v)); }, delete: async k => { r2.delete(k); }, get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).buffer.slice(0), httpMetadata: { contentType: 'image/webp' } } : null) } };
  const post = async b => { const r = await A.onRequestPost({ request: new Request('http://x/api/panel-art', { method: 'POST', headers: { authorization: 'Bearer x', 'content-type': 'application/json' }, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const base = { element: 'wood', theme: 'love' };
  let r = await post({ ...base, preview: true, prompt: '내 프롬프트', extra: '달을 크게' });
  ok(r.s === 200 && /^panelprev-/.test(r.d.preview) && r.d.provider === 'openai' && seen.at(-1).includes('/images/generations'), '미리 만들기는 GPT 로, 임시 파일(panelprev-)로 저장');
  ok(!(kv.get('media:index')), '미리 만들기는 라이브러리를 바꾸지 않는다');
  const k1 = r.d.preview; r = await post({ ...base, accept: k1, by: 'openai:gpt-image-2', prompt: '내 프롬프트', });
  ok(r.s === 200 && /^\/api\/clipfile\?k=panel-wood-love-/.test(r.d.url) && !r2.has(k1), '확정하면 칸에 등록되고 임시 파일은 지워진다');
  ok(JSON.parse(kv.get('panel:prompts'))['panel-wood-love'] === '내 프롬프트', '바뀐 프롬프트는 그 칸의 기본으로 저장');
  const oldKey = r.d.url.split('k=')[1];
  r = await post({ ...base, preview: true, fromCurrent: true, extra: '더 어둡게' });
  ok(r.s === 200 && seen.at(-1).includes('/images/edits [multipart]'), '현재 이미지를 바탕으로 수정하면 GPT edits(multipart)');
  gptDown = true; r = await post({ ...base, preview: true, fromCurrent: true, extra: '더 어둡게' });
  ok(r.s === 200 && r.d.provider === 'gemini', 'GPT 가 실패하면 Gemini 로 폴백(참조 이미지 포함)');
  const k2 = r.d.preview; r = await post({ ...base, accept: k2, by: 'gemini' });
  ok(r.s === 200 && !r2.has(oldKey), '교체하면 옛 이미지 파일이 삭제된다');
  const k3 = (await post({ ...base, preview: true })).d.preview; r = await post({ discard: k3 }); ok(r.s === 200 && !r2.has(k3), '버리면 임시 파일 삭제');
  r = await post({ discard: 'panel-wood-love-aaaa.webp' }); ok(r.s === 400, '확정된 컷은 discard 로 지울 수 없다');
  r = await post({ ...base, accept: '../x' }); ok(r.s === 400, '잘못된 키는 거부');
  // 비주얼 디렉션
  const P = await import(require('url').pathToFileURL(path.join(__dirname, '../functions/_panelart.js')).href);
  const put = async b => { const r = await A.onRequestPut({ request: new Request('http://x/api/panel-art', { method: 'PUT', headers: { authorization: 'Bearer x', 'content-type': 'application/json' }, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const get = async () => (await A.onRequestGet({ request: new Request('http://x/api/panel-art', { headers: { authorization: 'Bearer x' } }), env })).json();
  ok(/웹툰/.test((await get()).presets[0].defaultPrompt), '기본 디렉션은 기존 웹툰+동양화 감성');
  r = await put({ direction: { art: 'webtoon', feel: 'cinematic', world: 'modern', mood: 'lonely', people: 'none', extra: '비 오는 밤 위주', bogus: 1 } });
  ok(r.s === 200 && r.d.direction.art === 'webtoon' && r.d.direction.feel === 'cinematic' && r.d.direction.world === 'modern', '디렉션 저장');
  const g2 = await get(); ok(/한국 웹툰 스타일의 일러스트\. 또렷한/.test(g2.presets[0].defaultPrompt) && /영화 같은 감성/.test(g2.presets[0].defaultPrompt) && /현대 한국/.test(g2.presets[0].defaultPrompt) && /비 오는 밤 위주/.test(g2.presets[0].defaultPrompt) && !/동양화풍/.test(g2.presets[0].defaultPrompt), '웹툰 화풍 + 영화 감성이 함께 반영(동양화 문구는 빠짐)');
  ok(/글자·숫자/.test(g2.presets[0].defaultPrompt), '디렉션을 바꿔도 글자 금지는 유지');
  r = await put({ direction: { art: 'zzz', world: 'eastFantasy' } }); ok(r.d.direction.art === 'webtoonInk' && r.d.direction.world === 'eastFantasy', '모르는 값은 기본으로');
  ok(/동양 판타지/.test(P.slotPrompt({ scene: ['mist'] }, 't', r.d.direction)), '클립 소스 칸 프롬프트에도 적용');
  r = await put({ direction: { look: 'photo' } }); ok(r.d.direction.art === 'realistic' && r.d.direction.feel === 'documentary', '예전 look 저장값은 화풍·감성으로 변환');
  r = await put({ direction: { art: 'webtoon', feel: 'noir' } }); ok(/또렷한/.test(P.styleOf(r.d.direction)) && /느와르 감성/.test(P.styleOf(r.d.direction)), '화풍과 감성은 서로 독립적으로 조합');
  // 모두 다시 만들기(직접 생성 + 칸별 프롬프트 초기화)
  await put({ direction: {} }); kv.set('panel:prompts', JSON.stringify({ 'panel-wood-love': '낡은 프롬프트' }));
  const before = [...r2.keys()].filter(k => /^panel-wood-love-/.test(k));
  r = await post({ ...base, useDefault: true }); gptDown = false;
  ok(r.s === 200 && !JSON.parse(kv.get('panel:prompts'))['panel-wood-love'], '모두 다시 만들기: 칸별 프롬프트 초기화');
  ok(before.every(k => !r2.has(k)) && [...r2.keys()].filter(k => /^panel-wood-love-/.test(k)).length === 1, '다시 만들면 옛 파일은 지워지고 새 파일 하나만 남는다');
  // 직접 올린 이미지·영상으로 칸 교체(Leonardo · Kling) — 본문 컷과 배경은 서로 다른 칸
  r2.set('a1b2c3d4e5f6a7b8c9.png', Buffer.from('img1')); r2.set('0f1e2d3c4b5a69788.mp4', Buffer.from('vid1')); r2.set('b2b2b2b2b2b2b2b2b2.png', Buffer.from('img2'));
  r = await post({ element: 'fire', theme: 'career', uploadImage: 'a1b2c3d4e5f6a7b8c9.png' });
  let idx = JSON.parse(kv.get('media:index')); ok(r.s === 200 && r.d.url === '/api/clipfile?k=a1b2c3d4e5f6a7b8c9.png' && idx.some(m => m.id === 'panel-fire-career' && m.url === r.d.url), '내 이미지 업로드: 본문 컷 칸(panel-)이 올린 이미지로 교체');
  r = await post({ element: 'fire', theme: 'career', kind: 'bg', uploadImage: 'b2b2b2b2b2b2b2b2b2.png' });
  idx = JSON.parse(kv.get('media:index')); ok(r.s === 200 && idx.some(m => m.id === 'panelbg-fire-career') && idx.some(m => m.id === 'panel-fire-career' && /a1b2c3/.test(m.url)), '배경 칸(panelbg-)에 올려도 본문 컷 칸은 그대로');
  r = await post({ element: 'fire', theme: 'career', uploadVideo: '0f1e2d3c4b5a69788.mp4' });
  ok(r.s === 200 && r.d.video === '/api/clipfile?k=0f1e2d3c4b5a69788.mp4', '영상 업로드가 통과한다(영상 키 검사 정규식 수정 확인)');
  r2.set('c3c3c3c3c3c3c3c3c3.png', Buffer.from('img3')); r = await post({ element: 'fire', theme: 'career', uploadImage: 'c3c3c3c3c3c3c3c3c3.png' });
  idx = JSON.parse(kv.get('media:index')); ok(r.s === 200 && idx.find(m => m.id === 'panel-fire-career').panelVideo === '/api/clipfile?k=0f1e2d3c4b5a69788.mp4' && !r2.has('a1b2c3d4e5f6a7b8c9.png'), '영상이 있는 칸에 이미지를 올리면 영상은 유지되고 옛 이미지 파일만 지워진다');
  r = await post({ element: 'fire', theme: 'career', uploadImage: '0f1e2d3c4b5a69788.mp4' }); ok(r.s === 400, '이미지가 아닌 파일은 거부');
  r = await post({ element: 'fire', theme: 'career', uploadImage: '../etc/x' }); ok(r.s === 400, '잘못된 키는 거부');
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('패널 세부 수정 검증 모두 통과');
})();
