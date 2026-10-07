// 타로 카드 이미지 생성 검증(모의 R2·KV·fetch):  node tests/tarot-art-sim.js
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(__dirname, '..', f)).href);
(async () => {
  const T = await imp('functions/_tarotart.js'), A = await imp('functions/api/tarot-art.js');
  console.log('1. 카드·프롬프트');
  ok(T.CARDS.length === 78 && new Set(T.CARDS.map(c => c.id)).size === 78, '카드 78장, id 중복 없음');
  ok(T.CARDS.every(c => /^(M\d{1,2}|[WCSP]\d{1,2})$/.test(c.id) && c.scene && c.nameKo && c.nameEn), '모든 id 가 free-content 의 카드 id 형식이고 장면 설명이 있음');
  ok(T.CARD_BY_ID.M13.nameKo === '죽음' && T.CARD_BY_ID.W1.nameEn === 'Ace of Wands' && T.CARD_BY_ID.P14.nameKo === '펜타클 킹', '이름이 shared-core 와 같은 체계');
  let pr = T.tarotPrompt('M17', {}); ok(/The Star/.test(pr) && /글자·숫자·로고는 절대/.test(pr) && /타로 카드 디자인/.test(pr), '기본 프롬프트: 카드명·글자 금지·카드 틀');
  pr = T.tarotPrompt('M0', { label: 'ko', frame: 'full', art: 'webtoon', feel: 'cinematic', world: 'eastFantasy' }); ok(/'바보'/.test(pr) && !/글자·숫자·로고는 절대/.test(pr) && /꽉 채운다/.test(pr) && /웹툰 스타일/.test(pr) && /영화 같은 감성/.test(pr) && /동양 판타지/.test(pr), '한글 카드명·틀 없음·웹툰+영화 감성+동양 판타지 조합');
  ok(/참고한다/.test(T.tarotPrompt('M0', { refs: ['/api/clipfile?k=a.png'] }, true)) && !/참고한다/.test(T.tarotPrompt('M0', {})), '레퍼런스가 있을 때만 참고 문장');
  const cd = T.cleanTarotDir({ art: 'zzz', refs: ['/api/clipfile?k=a.png', 'https://evil/x.png', '/api/clipfile?k=b.png', '/api/clipfile?k=c.png', '/api/clipfile?k=d.png'], refUse: 'close' });
  ok(cd.art === 'tarotClassic' && cd.refs.length === 3 && !cd.refs.some(x => /evil/.test(x)) && cd.refUse === 'close', '디렉션 정리: 모르는 값 기본, 레퍼런스는 내 업로드 3장까지');

  console.log('2. API 흐름');
  const png = Buffer.from('abc').toString('base64'), seen = []; let gptDown = false;
  globalThis.fetch = async (u, o) => { const multi = o && o.body instanceof FormData; seen.push({ u: String(u), n: multi ? o.body.getAll('image[]').length : 0, body: o && typeof o.body === 'string' ? o.body : '' });
    if (/openai/.test(u)) return gptDown ? new Response('x', { status: 500 }) : new Response(JSON.stringify({ data: [{ b64_json: png }] })); return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: png } }] } }] })); };
  const kv = new Map(), r2 = new Map(); r2.set('ref1.png', Buffer.from('r1')); r2.set('ref2.png', Buffer.from('r2')); r2.set('mine.png', Buffer.from('m'));
  const env = { ADMIN_PASSWORD: 'x', OPENAI_API_KEY: 'k', GEMINI_API_KEY: 'g', GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
    CLIPS_R2: { put: async (k, v) => { r2.set(k, Buffer.from(v)); }, delete: async k => { r2.delete(k); }, get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).buffer.slice(r2.get(k).byteOffset, r2.get(k).byteOffset + r2.get(k).length), httpMetadata: { contentType: 'image/png' } } : null) } };
  const H = { authorization: 'Bearer x', 'content-type': 'application/json' };
  const post = async b => { const r = await A.onRequestPost({ request: new Request('http://x/a', { method: 'POST', headers: H, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const put = async b => { const r = await A.onRequestPut({ request: new Request('http://x/a', { method: 'PUT', headers: H, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  const get = async () => (await A.onRequestGet({ request: new Request('http://x/a', { headers: H }), env })).json();
  let g = await get(); ok(g.cards.length === 78 && g.cards[0].url === '' && g.options.frame && g.refUse.style, 'GET: 78장·선택지');
  let r = await post({ card: 'M5', preview: true }); ok(r.s === 200 && /^tarotprev-/.test(r.d.preview) && seen.at(-1).u.includes('/images/generations') && /"size":"1024x1536"/.test(seen.at(-1).body), '미리 만들기: GPT 생성(2:3 크기), 임시 파일');
  ok(!kv.get('free:content'), '미리 만들기는 타로 화면 데이터를 바꾸지 않는다');
  const pk = r.d.preview; r = await post({ card: 'M5', accept: pk }); ok(r.s === 200 && /tarotai-M5-/.test(r.d.url) && !r2.has(pk), '확정: tarotai- 파일로 저장, 임시 파일 삭제');
  const fc = JSON.parse(kv.get('free:content')); ok(fc.tarot.images.M5 === r.d.url && fc.version, '확정하면 free:content 의 tarot.images 에 들어간다');
  kv.set('free:content', JSON.stringify({ ...fc, daily: { keep: ['x'] }, tarot: { ...fc.tarot, cards: { M1: { up: {} } } } }));
  const old = r.d.url.split('k=')[1];
  await put({ direction: { art: 'webtoon', feel: 'cinematic', refs: ['/api/clipfile?k=ref1.png', '/api/clipfile?k=ref2.png'], refUse: 'style' } });
  r = await post({ card: 'M5', preview: true, refs: ['/api/clipfile?k=mine.png'] });
  ok(seen.at(-1).u.includes('/images/edits') && seen.at(-1).n === 3, '전체 레퍼런스 2장 + 카드 전용 1장이 모두 참고 이미지로 전송: ' + seen.at(-1).n);
  r = await post({ card: 'M5', preview: true, useGlobalRefs: false }); ok(seen.at(-1).u.includes('/images/generations'), '전체 레퍼런스를 끄면 일반 생성');
  r = await post({ card: 'M5', preview: true, fromCurrent: true, extra: '별을 크게' }); ok(seen.at(-1).u.includes('/images/edits') && seen.at(-1).n === 3, '현재 이미지 바탕 수정: 현재 이미지 + 레퍼런스 2장');
  gptDown = true; r = await post({ card: 'M5', preview: true }); ok(r.s === 200 && r.d.provider === 'gemini' && /"aspectRatio":"2:3"/.test(seen.at(-1).body), 'GPT 실패 → Gemini 폴백(2:3, 레퍼런스 포함)');
  const k2 = r.d.preview; gptDown = false; r = await post({ card: 'M5', accept: k2 }); ok(r.s === 200 && !r2.has(old), '교체하면 옛 AI 파일 삭제');
  const fc2 = JSON.parse(kv.get('free:content')); ok(fc2.daily && fc2.daily.keep && fc2.tarot.cards.M1, '다른 무료 콘텐츠(운세·문장 조각)는 그대로 유지');
  r2.set('manual.png', Buffer.from('u')); kv.set('free:content', JSON.stringify({ tarot: { images: { M9: '/api/clipfile?k=manual.png' } } }));
  r = await post({ card: 'M9' }); ok(r.s === 200 && r2.has('manual.png'), '직접 올린 파일은 지우지 않는다');
  r = await post({ card: 'ZZ' }); ok(r.s === 400, '없는 카드 거부');
  r = await post({ discard: 'tarotai-M5-x.png' }); ok(r.s === 400, '확정된 파일은 discard 로 못 지운다');
  if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('\n타로 카드 이미지 검증 모두 통과');
})();
