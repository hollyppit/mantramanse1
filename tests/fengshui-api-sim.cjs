// /api/fengshui 검증: 인증 · 입력 검증 · 초안→게시→취소→되돌리기 · 공개 스위치 · 엔진 반영 · 다른 KV 키 불간섭
const fs = require('fs'), path = require('path'), url = require('url');
const root = path.join(__dirname, '..');
(async () => {
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/fengshui.js')).href);
  const F = globalThis.MantraFengshui;
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  kv.m.set('overrides', '{"keep":1}');
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', u = 'https://x/api/fengshui') => new Request(u, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const pub = async () => await (await mod.onRequestGet({ request: rq('GET', null, ''), env })).json();
  const id = 'star.8.hyang.wang', base = F.listTexts().find(t => t.id === id).text;

  ok((await put({ kind: 'text', id, action: 'save', fields: { text: '좋습니다 좋습니다.' } }, 'bad')).s === 401, '인증 없이 변경됨');
  ok((await mod.onRequestGet({ request: rq('GET', null, 'bad', 'https://x/api/fengshui?all=1'), env })).status === 401, '전체 조회 인증');
  let p0 = await pub(); ok(p0.enabled === false && p0.pub === null, '처음에는 꺼져 있음');
  ok((await put({ kind: 'text', id: 'star.x', action: 'save', fields: { text: '가능합니다 가능합니다.' } })).s === 404, '없는 ID');
  for (const [m, f] of [['단정', { text: '반드시 재물이 들어옵니다.' }], ['존댓말 아님', { text: '이 자리는 재물이 들어오는 좋은 자리다.' }], ['짧음', { text: '좋아요.' }], ['태그', { text: '<b>재물이 모이는 자리입니다.</b>' }]]) {
    const r = await put({ kind: 'text', id, action: 'save', fields: f }); ok(r.s === 400, `${m} 입력이 거부되지 않음(${r.s})`);
  }
  const t2 = '재물과 저축의 흐름이 차분하게 쌓이는 자리라 금고나 통장을 두기 좋습니다.';
  let r = await put({ kind: 'text', id, action: 'save', fields: { text: t2 } }); ok(r.s === 200 && r.j.item.status === 'draft', '수정 저장');
  ok((await pub()).pub === null, '초안이 공개됨');
  ok((await put({ kind: 'flag', enabled: 'yes' })).s === 400, '스위치 형식');
  ok((await put({ kind: 'flag', enabled: true })).s === 200, '스위치 켜기');
  ok(Object.keys((await pub()).pub.texts).length === 0, '게시 전에는 비어 있음');
  r = await put({ kind: 'text', id, action: 'approve_publish' }); ok(r.s === 200 && r.j.item.status === 'published', '게시');
  ok((await put({ kind: 'text', id, action: 'approve_publish' })).s === 400, '중복 게시');
  let p = await pub(); ok(p.pub.texts[id] === t2, '게시본 노출');
  // 엔진 반영
  F.applyPublished(p.pub);
  const xk = F.xuankong({ facingDeg: 180, builtYear: 2010, evalYear: 2010 });
  ok(xk.palaces.some(pl => pl.xiangText === t2), '엔진에 게시 문구 반영');
  F.applyPublished(null); ok(F.listTexts().find(t => t.id === id).text === base, '기본값 복원');
  // 규칙
  ok((await put({ kind: 'rule', id: 'kimThreshold', action: 'save', fields: { value: 99 } })).s === 400, '규칙 범위');
  ok((await put({ kind: 'rule', id: 'kimThreshold', action: 'save', fields: { value: 3 } })).s === 200, '규칙 저장');
  await put({ kind: 'rule', id: 'kimThreshold', action: 'approve_publish' });
  p = await pub(); F.applyPublished(p.pub);
  ok(F.mountainAt(4).kim, '겸향 기준 3° 반영(4° 벗어남)'); F.applyPublished(null); ok(!F.mountainAt(4).kim, '규칙 기본값 복원');
  // 되돌리기·취소
  await put({ kind: 'text', id, action: 'unpublish' }); ok(!(await pub()).pub.texts[id], '게시 취소');
  r = await put({ kind: 'text', id, action: 'restore', v: 1 }); ok(r.s === 404 || r.s === 200, '이력 되돌리기 응답');
  ok((await put({ kind: 'flag', enabled: false })).s === 200 && (await pub()).pub === null, '스위치 끄면 숨김');
  ok(kv.m.get('overrides') === '{"keep":1}', '다른 KV 키 불간섭');
  const all = await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/fengshui?all=1'), env })).json();
  ok(all.base.texts.length >= 100 && all.base.rules.length === 2, '관리자 조회 구성');
  console.log(`API 검증 실패 ${fails.length}건`); if (fails.length) { console.log(fails.join('\n')); process.exit(1); } console.log('통과');
})();
