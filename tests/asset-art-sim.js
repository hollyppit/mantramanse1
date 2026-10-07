// 풀이 이미지 슬롯(자동차·직업·배우자·전생) 검증:  node tests/asset-art-sim.js
// ① 뷰어가 쓰는 모든 슬롯 id 가 서버 슬롯 목록에 있는지(여러 사주로) ② 프롬프트 ③ 생성 API(미리보기→확정→공개 목록) ④ 비주얼 디렉션 공유
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const imp = f => import(require('url').pathToFileURL(path.join(root, f)).href);
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' }); globalThis.window = globalThis;
['saju-data', 'deep', 'deep-life', 'deep-time'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
(async () => {
  const A = await imp('functions/_assetart.js'), API = await imp('functions/api/asset-art.js'), PUB = await imp('functions/api/assets.js'), M = globalThis.Manse, R = globalThis.ReportV2, now = Date.UTC(2026, 9, 8);
  console.log('1. 슬롯 목록');
  const sl = A.slots(); ok(sl.length === 71 && new Set(sl.map(s => s.id)).size === 71, '슬롯 71개(자동차10·직업12·배우자24·전생25): ' + sl.length);
  ok(sl.every(s => A.promptOf(s.id, {}).length > 80 && /글자·숫자/.test(A.promptOf(s.id, {}))), '모든 슬롯에 프롬프트(글자 금지 포함)');
  ok(sl.every(s => /^[\w.-]+$/.test(A.keyOf(s.id))) && new Set(sl.map(s => A.keyOf(s.id))).size === 71, 'R2 키는 영문·숫자만, 슬롯마다 유일');
  console.log('2. 뷰어 슬롯이 서버 목록에 있다');
  const ids = new Set(sl.map(s => s.id)), used = new Set(); let n = 0;
  for (let y = 1950; y <= 2005; y += 3) for (const g of ['M', 'F']) { n++; const ch = M.compute({ year: y, month: 1 + (y % 12), day: 1 + (y % 27), hour: y % 24, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), sd = R.SajuData.build(ch, { now }), H = { M, ch, sd, now, name: '', assets: {} };
    ['deep_car', 'deep_jobs', 'deep_spouse', 'deep_past'].forEach(k => { const html = R.Deep.SECTIONS[k](H).scenes.map(s => s.html).join(''); (html.match(/data-slot="([^"]+)"/g) || []).forEach(m => used.add(m.slice(11, -1))); }); }
  ok(used.size >= 30, '여러 사주에서 쓰이는 슬롯 ' + used.size + '종(' + n + '명)'); [...used].forEach(u => ok(ids.has(u), '서버 목록에 없는 슬롯: ' + u));
  console.log('3. 비주얼 디렉션 공유');
  const P = await imp('functions/_panelart.js');
  const pw = A.promptOf('career:creative', P.cleanDirection({ art: 'webtoon', feel: 'cinematic', world: 'eastFantasy' }));
  ok(/웹툰 스타일/.test(pw) && /영화 같은 감성/.test(pw) && /동양 판타지/.test(pw), '패널 이미지와 같은 화풍·감성·세계관 설정이 들어간다');
  ok(/사람은 그리지 않는다/.test(A.promptOf('car:경', {})) && /얼굴|표정/.test(A.promptOf('spouse:오:F', {})), '자동차는 사람 없이, 배우자는 얼굴이 보이게');
  console.log('4. 생성 API');
  const png = Buffer.from('abc').toString('base64'); globalThis.fetch = async () => new Response(JSON.stringify({ data: [{ b64_json: png }] }));
  const kv = new Map(), r2 = new Map(), env = { ADMIN_PASSWORD: 'x', OPENAI_API_KEY: 'k', GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } },
    CLIPS_R2: { put: async (k, v) => { r2.set(k, Buffer.from(v)); }, delete: async k => { r2.delete(k); }, get: async k => (r2.has(k) ? { arrayBuffer: async () => r2.get(k).buffer.slice(r2.get(k).byteOffset, r2.get(k).byteOffset + r2.get(k).length), httpMetadata: { contentType: 'image/webp' } } : null) } };
  const H = { authorization: 'Bearer x', 'content-type': 'application/json' }, post = async b => { const r = await API.onRequestPost({ request: new Request('http://x/a', { method: 'POST', headers: H, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };
  let r = await post({ slot: 'car:경', preview: true, extra: '더 어둡게' }); ok(r.s === 200 && /^assetprev-/.test(r.d.preview), '미리 만들기');
  ok(!kv.get('assets:map'), '미리 만들기는 공개 목록을 바꾸지 않는다');
  const k1 = r.d.preview; r = await post({ slot: 'car:경', accept: k1 }); ok(r.s === 200 && /^\/api\/clipfile\?k=asset-car_/.test(r.d.url) && !r2.has(k1), '확정: asset- 파일 저장·임시 파일 삭제');
  const pub = await (await PUB.onRequestGet({ env })).json(); ok(pub.assets['car:경'] === r.d.url, '공개 GET /api/assets 에 슬롯 주소가 나온다');
  const old = r.d.url.split('k=')[1]; r = await post({ slot: 'car:경' }); ok(r.s === 200 && !r2.has(old), '바로 생성(전체 만들기용): 옛 파일은 삭제되고 새 주소로 교체');
  r = await post({ slot: 'spouse:오:F', fromCurrent: true }); ok(r.s === 400, '현재 이미지가 없으면 바탕 수정은 거부');
  r = await post({ slot: 'zzz:1' }); ok(r.s === 400, '없는 슬롯 거부'); r = await post({ discard: 'asset-car_x.webp' }); ok(r.s === 400, '확정된 파일은 discard 로 못 지운다');
  const lst = await (await API.onRequestGet({ request: new Request('http://x/a', { headers: H }), env })).json(); ok(lst.slots.length === 71 && lst.slots.find(s => s.id === 'car:경').url && lst.groups.car, '관리자 GET: 슬롯 목록·현재 이미지');
  if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('\n풀이 이미지 슬롯 검증 모두 통과');
})();
