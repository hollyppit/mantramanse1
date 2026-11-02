// /api/luck-phrases 검증: 승인→게시 순서·수정 시 게시본에서 즉시 빠짐·중복/단정/존댓말 거부·이력 되돌리기·게시 문구 적용
const path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
(async () => {
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/luck-phrases.js')).href);
  const LI = globalThis.MantraLuckInterpret;
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', u = 'https://x/api/luck-phrases') => new Request(u, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const pub = async () => (await (await mod.onRequestGet({ request: rq('GET', null, ''), env })).json());
  const id = 'tg.편관.scene.work', id2 = 'tg.정관.scene.work', base = LI.PHRASES.find(p => p.id === id).text;

  ok((await put({ id, action: 'approve' }, 'bad')).s === 401, '인증 없이 변경됨');
  ok((await put({ id: 'tg.없음.core', action: 'approve' })).s === 404, '없는 ID');
  ok((await put({ id, action: 'publish' })).s === 400, '승인 전 게시됨');
  ok(Object.keys((await pub()).published).length === 0, '게시 전 공개 노출');
  // 거부 규칙
  for (const [m, t] of [['단정', '반드시 좋아지는 시기입니다.'], ['존댓말 아님', '책임이 늘어난다.'], ['빈값', ' '], ['길이', '가'.repeat(201)], ['중복', LI.PHRASES.find(p => p.id === id2).text]]) ok((await put({ id, action: 'save', text: t })).s === 400, m + ' 거부 안 됨');
  // 기본 문구 승인 → 게시
  let r = await put({ id, action: 'approve' }); ok(r.s === 200 && r.j.item.status === 'reviewed', '승인');
  ok(Object.keys((await pub()).published).length === 0, '승인만으로 공개 노출');
  r = await put({ id, action: 'publish' }); ok(r.s === 200 && (await pub()).published[id] === base, '게시');
  // 수정 → 게시본에서 즉시 빠짐
  const t2 = '책임과 평가가 부각되는 기운이 들어오는 시기입니다.';
  r = await put({ id, action: 'save', text: t2 }); ok(r.s === 200 && r.j.item.status === 'draft' && r.j.item.version === 2 && !(id in (await pub()).published), '수정 후에도 게시본에 남음');
  ok((await put({ id, action: 'publish' })).s === 400, '수정본이 승인 없이 게시됨');
  await put({ id, action: 'approve' }); await put({ id, action: 'publish' }); ok((await pub()).published[id] === t2, '재게시');
  // 게시 취소·되돌리기
  r = await put({ id, action: 'unpublish' }); ok(r.s === 200 && !(id in (await pub()).published), '게시 취소');
  const hist = r.j.item.history; const first = hist.find(h => h.text === base);
  r = await put({ id, action: 'restore', v: first.v }); ok(r.s === 200 && r.j.item.text === base && r.j.item.status === 'draft', '이력 되돌리기');
  ok((await put({ id, action: 'restore', v: 999 })).s === 404, '없는 이력');
  const adm = await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/luck-phrases?all=1'), env })).json(); ok(adm.items[id] && adm.phrases.length === LI.PHRASES.length, '관리자 전체 조회');
  ok((await mod.onRequestGet({ request: rq('GET', null, 'bad', 'https://x/api/luck-phrases?all=1'), env })).status === 401, '전체 조회 인증');
  // 적용: 게시 문구만 교체, 모르는 ID/비문자열 무시
  const n = LI.applyPublished({ [id]: t2, 'tg.없음.core': 'x', [id2]: 123 });
  ok(n === 1 && LI.PHRASES.find(p => p.id === id).text === t2 && LI.PHRASES.find(p => p.id === id2).review === 'draft', '게시 문구 적용');
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
  console.log('모든 검증 통과 · 승인→게시 순서 · 수정 시 게시본 제외 · 중복/단정/존댓말 거부 · 이력 복구');
})();
