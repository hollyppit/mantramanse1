// /api/region-reading 검증: 인증 · 입력 검증(금지 표현·존댓말·조건 문법·자리표시자·규칙 범위) · 초안→게시→취소→되돌리기 · 공개 스위치 · 직접 추가/삭제 · 게시본의 엔진 적용 · 다른 KV 키 불간섭
const fs = require('fs'), path = require('path'), url = require('url'), vm = require('vm');
const root = path.join(__dirname, '..');
(async () => {
  const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
  vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
  vm.runInThisContext(fs.readFileSync(path.join(root, 'region-data.js'), 'utf8'));
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/region-reading.js')).href);
  const M = globalThis.Manse, RR = globalThis.MantraRegionReading, RG = globalThis.MantraRegion, D = globalThis.MantraRegionReadingData;
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  kv.m.set('overrides', '{"keep":1}');
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', u = 'https://x/api/region-reading') => new Request(u, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const pub = async () => await (await mod.onRequestGet({ request: rq('GET', null, ''), env })).json();
  const ch = M.compute({ year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' });
  const tr = RG.tradition(RG.get('busan')), base = RR.read(M, ch, tr, { region: '부산' }), hid = base.headline.id, baseTone = base.tone;

  ok((await put({ kind: 'phrase', id: hid, action: 'save', fields: { text: '좋습니다.' } }, 'bad')).s === 401, '인증 없이 변경됨');
  ok((await mod.onRequestGet({ request: rq('GET', null, 'bad', 'https://x/api/region-reading?all=1'), env })).status === 401, '전체 조회 인증');
  let p0 = await pub(); ok(p0.enabled === false && p0.pub === null, '처음에는 꺼져 있고 게시본이 노출되지 않아야 함');
  ok((await put({ kind: 'phrase', id: 'R.nope', action: 'save', fields: { text: '가능합니다.' } })).s === 404, '없는 ID'); ok((await put({ kind: 'x', id: hid, action: 'save' })).s === 400, '알 수 없는 kind');
  for (const [m, f] of [['단정', { text: '반드시 좋아집니다.' }], ['보장', { text: '이 방향은 운이 보장됩니다.' }], ['존댓말 아님', { text: '이 방향은 좋다.' }], ['빈값', { text: ' ' }], ['길이', { text: '가'.repeat(400) + '입니다.' }], ['자리표시자', { text: '{evil} 기운은 좋습니다.' }], ['조건 키', { when: ['foo=1'] }], ['조건 형식', { when: ['el'] }], ['잘못된 비교', { when: ['el>=수'] }], ['우선순위', { pri: 99 }], ['tag', { tag: '$$' }]]) {
    const r = await put({ kind: 'phrase', id: hid, action: 'save', fields: f }); ok(r.s === 400, `${m} 입력이 거부되지 않음(${r.s})`);
  }
  ok((await put({ kind: 'phrase', id: hid, action: 'save', fields: { text: '괄호로 끝나는 문장도 허용됩니다(예시).' } })).s === 200, '괄호로 끝나는 존댓말 문장 허용');
  // 초안 → 게시 → 공개 스위치
  const t2 = '관리자가 다듬은 제목입니다.';
  let r = await put({ kind: 'phrase', id: hid, action: 'save', fields: { text: t2, pri: 5 } }); ok(r.s === 200 && r.j.item.status === 'draft', '수정 저장'); ok((await pub()).pub === null, '초안이 공개됨');
  r = await put({ kind: 'phrase', id: hid, action: 'approve_publish' }); ok(r.s === 200 && r.j.item.status === 'published', '게시'); ok((await pub()).pub === null, '스위치가 꺼진 상태에서 게시본이 노출됨');
  ok((await put({ kind: 'flag', enabled: 'yes' })).s === 400, '스위치 값 검증'); r = await put({ kind: 'flag', enabled: true }); ok(r.s === 200 && r.j.enabled === true, '스위치 켜기');
  p0 = await pub(); ok(p0.enabled && p0.pub.phrases[hid].text === t2, '게시본이 공개 응답에 없음');
  ok(RR.applyPublished(p0.pub) && RR.read(M, ch, tr, { region: '부산' }).headline.text === t2, '게시 문구가 엔진에 적용되지 않음');
  r = await put({ kind: 'phrase', id: hid, action: 'save', fields: { text: '다시 수정한 제목입니다.' } }); ok(!(await pub()).pub.phrases[hid], '수정 후에도 이전 게시본이 남음');
  ok((await put({ kind: 'phrase', id: hid, action: 'unpublish' })).s === 400, '미게시 항목 게시 취소가 허용됨');
  await put({ kind: 'phrase', id: hid, action: 'approve_publish' }); r = await put({ kind: 'phrase', id: hid, action: 'unpublish' }); ok(r.s === 200 && !(await pub()).pub.phrases[hid], '게시 취소');
  const first = r.j.item.history.find(h => h.fields && h.fields.text === t2); r = await put({ kind: 'phrase', id: hid, action: 'restore', v: first.v }); ok(r.s === 200 && r.j.item.fields.text === t2 && r.j.item.status === 'draft', '이력 되돌리기'); ok((await put({ kind: 'phrase', id: hid, action: 'restore', v: 999 })).s === 404, '없는 이력');
  // 직접 추가/삭제
  const cid = 'R.pro.custom1';
  ok((await put({ kind: 'phrase', id: 'x', action: 'create', fields: {} })).s === 400, 'ID 형식'); ok((await put({ kind: 'phrase', id: cid, action: 'create', fields: { role: 'zzz', text: '문구입니다.' } })).s === 400, '역할 검증');
  r = await put({ kind: 'phrase', id: cid, action: 'create', fields: { role: 'pro', text: '관리자가 추가한 유리한 점입니다.', when: ['el=수'], pri: 5 } }); ok(r.s === 200 && r.j.item.custom, '문구 직접 추가');
  ok((await put({ kind: 'phrase', id: cid, action: 'create', fields: { role: 'pro', text: '중복입니다.' } })).s === 400, '중복 ID');
  await put({ kind: 'phrase', id: cid, action: 'approve_publish' }); RR.applyPublished((await pub()).pub); ok(RR.read(M, ch, RG.tradition(RG.get('seoul')), {}).pros.some(x => x.id === cid), '직접 추가한 문구가 조건에 맞을 때 쓰이지 않음');
  ok(!RR.read(M, ch, tr, {}).pros.some(x => x.id === cid), '조건(el=수)에 맞지 않는 방위에서 쓰임');
  ok((await put({ kind: 'phrase', id: cid, action: 'delete' })).s === 200, '삭제'); ok((await put({ kind: 'phrase', id: hid, action: 'delete' })).s === 400, '기본 문구 삭제가 허용됨');
  // 규칙(수치)
  ok((await put({ kind: 'rule', id: 'toneGood', action: 'save', fields: { value: 99 } })).s === 400, '범위 밖 규칙 값'); ok((await put({ kind: 'rule', id: 'toneGood', action: 'save', fields: { value: 'a' } })).s === 400, '숫자 아님');
  ok((await put({ kind: 'rule', id: 'nope', action: 'save', fields: { value: 1 } })).s === 404, '없는 규칙');
  r = await put({ kind: 'rule', id: 'toneGood', action: 'save', fields: { value: 2.4 } }); ok(r.s === 200, '규칙 저장'); ok((await pub()).pub.rules.toneGood === undefined, '미게시 규칙이 공개됨');
  await put({ kind: 'rule', id: 'toneGood', action: 'approve_publish' }); p0 = await pub(); ok(p0.pub.rules.toneGood === 2.4, '게시된 규칙이 공개 응답에 없음');
  RR.applyPublished(p0.pub); ok(RR.read(M, ch, tr, { region: '부산' }).tone !== 'caution' || baseTone !== 'caution', '규칙 변경이 엔진에 반영되지 않음');
  ok(RR.rules().find(x => x.id === 'toneGood').cur === 2.4, '엔진 규칙 값');
  await put({ kind: 'rule', id: 'toneGood', action: 'unpublish' }); RR.applyPublished((await pub()).pub); ok(RR.rules().find(x => x.id === 'toneGood').cur === 1.2, '규칙 게시 취소 시 기본값 복귀');
  // 일괄 게시
  await put({ kind: 'phrase', id: 'R.headline.good', action: 'save', fields: { text: '이 사주에는 잘 맞는 방향입니다' + '.' } }); await put({ kind: 'phrase', id: 'R.headline.caution', action: 'save', fields: { text: '이 사주에는 조심해서 볼 방향입니다.' } });
  r = await put({ kind: 'phrase', action: 'bulk', ids: ['R.headline.good', 'R.headline.caution', 'R.zzz'], op: 'publish' }); ok(r.s === 200 && r.j.done === 2 && r.j.failed.length === 1, '일괄 게시 ' + JSON.stringify(r.j));
  r = await put({ kind: 'phrase', action: 'bulk', ids: ['R.headline.good'], op: 'unpublish' }); ok(r.s === 200 && r.j.done === 1, '일괄 게시 취소'); ok((await put({ kind: 'phrase', action: 'bulk', ids: [], op: 'publish' })).s === 400, '빈 일괄 요청');
  await put({ kind: 'flag', enabled: false }); ok((await pub()).pub === null, '스위치를 끄면 비공개');
  const adm = await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/region-reading?all=1'), env })).json();
  ok(adm.base.phrases.length === D.PH.length && adm.base.rules.length === D.RULES.length && adm.base.factKeys.length > 10 && adm.doc.phrases[hid].history.length >= 3, '관리자 전체 조회·이력');
  ok(JSON.stringify([...kv.m.keys()].sort()) === JSON.stringify(['overrides', 'regionreading:doc']), '이 API가 다른 KV 키를 썼음: ' + [...kv.m.keys()]); ok(kv.m.get('overrides') === '{"keep":1}', '기존 키 값이 바뀜');
  RR.applyPublished(null);
  console.log(fails.length ? `실패 ${fails.length}건\n - ` + fails.join('\n - ') : '모든 검증 통과');
  process.exit(fails.length ? 1 : 0);
})();
