// /api/wealth-career 검증: 인증 · 입력 검증(금지 표현·존댓말·조건 문법·직업 오행) · 초안→게시→취소→되돌리기 · 공개 스위치 · 직접 추가/삭제 · 게시본의 엔진 적용 · 다른 KV 키 불간섭
const fs = require('fs'), path = require('path'), url = require('url'), vm = require('vm');
const root = path.join(__dirname, '..');
(async () => {
  const html = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = html.indexOf('var MANSE_DATA'), b0 = html.indexOf('})(typeof window', a0);
  vm.runInThisContext(html.slice(a0, html.indexOf('\n', b0)));
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/wealth-career.js')).href);
  const W = globalThis.MantraWealthCareer, D = globalThis.MantraWealthCareerData, M = globalThis.Manse;
  const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), async get(k, t) { const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  kv.m.set('overrides', '{"keep":1}');   // 기존 키는 건드리지 않아야 한다
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', u = 'https://x/api/wealth-career') => new Request(u, { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth), env }); return { s: r.status, j: await r.json() }; };
  const pub = async () => await (await mod.onRequestGet({ request: rq('GET', null, ''), env })).json();
  const ch = M.compute({ year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' });
  const R0 = W.build(M, ch, {}), pid = R0.s1.primary.head[0].id, base = R0.s1.primary.head[0].text;

  ok((await put({ kind: 'phrase', id: pid, action: 'save', fields: { text: '좋습니다.' } }, 'bad')).s === 401, '인증 없이 변경됨');
  ok((await mod.onRequestGet({ request: rq('GET', null, 'bad', 'https://x/api/wealth-career?all=1'), env })).status === 401, '전체 조회 인증');
  let p0 = await pub(); ok(p0.enabled === false && p0.pub === null, '처음에는 꺼져 있고 게시본이 노출되지 않아야 함');
  ok((await put({ kind: 'phrase', id: 'S1.없는.id', action: 'save', fields: { text: '가능합니다.' } })).s === 404, '없는 ID');
  ok((await put({ kind: 'x', id: pid, action: 'save' })).s === 400, '알 수 없는 kind');
  // 거부 규칙
  for (const [m, f] of [['단정', { text: '반드시 수익이 늘어납니다.' }], ['과장', { text: '돈이 보장됩니다.' }], ['가난', { text: '재성이 없어 가난합니다.' }], ['존댓말 아님', { text: '수익이 늘어난다.' }], ['빈값', { text: ' ' }], ['길이', { text: '가'.repeat(400) + '입니다.' }], ['자리표시자', { text: '{evil}은 좋습니다.' }],
    ['조건 키', { when: ['foo.bar=1'] }], ['조건 형식', { when: ['st.salin'] }], ['우선순위', { pri: 99 }], ['tag', { tag: '$$' }]]) {
    const r = await put({ kind: 'phrase', id: pid, action: 'save', fields: f }); ok(r.s === 400, `${m} 입력이 거부되지 않음(${r.s})`);
  }
  // 초안 → 게시
  const t2 = '관리자가 다듬은 문구입니다. 결과물이 곧 명함이 되는 쪽입니다.';
  let r = await put({ kind: 'phrase', id: pid, action: 'save', fields: { text: t2, pri: 5 } }); ok(r.s === 200 && r.j.item.status === 'draft' && r.j.item.version === 2, '수정 저장');
  ok((await pub()).pub === null, '초안이 공개됨');
  r = await put({ kind: 'phrase', id: pid, action: 'approve_publish' }); ok(r.s === 200 && r.j.item.status === 'published', '게시');
  ok((await pub()).pub === null, '공개 스위치가 꺼진 상태에서 게시본이 노출됨');
  r = await put({ kind: 'flag', enabled: true }); ok(r.s === 200 && r.j.enabled === true, '스위치 켜기');
  ok((await put({ kind: 'flag', enabled: 'yes' })).s === 400, '스위치 값 검증');
  p0 = await pub(); ok(p0.enabled && p0.pub.phrases[pid] && p0.pub.phrases[pid].text === t2 && p0.pub.phrases[pid].pri === 5, '게시본이 공개 응답에 없음');
  ok(W.applyPublished(p0.pub) === true && W.build(M, ch, {}).s1.primary.head[0].text === t2.replace('{who}', ''), '게시 문구가 엔진에 적용되지 않음');
  // 수정 → 게시본에서 즉시 빠짐 → 재게시
  r = await put({ kind: 'phrase', id: pid, action: 'save', fields: { text: '다시 수정한 문구입니다.' } }); ok(r.s === 200, '재수정');
  p0 = await pub(); ok(!p0.pub.phrases[pid], '수정 후에도 이전 게시본이 남음');
  ok((await put({ kind: 'phrase', id: pid, action: 'unpublish' })).s === 400, '미게시 항목 게시 취소가 허용됨');
  await put({ kind: 'phrase', id: pid, action: 'approve_publish' }); r = await put({ kind: 'phrase', id: pid, action: 'unpublish' }); ok(r.s === 200 && !(await pub()).pub.phrases[pid], '게시 취소');
  // 이력 되돌리기
  const hist = r.j.item.history, first = hist.find(h => h.fields && h.fields.text === t2);
  r = await put({ kind: 'phrase', id: pid, action: 'restore', v: first.v }); ok(r.s === 200 && r.j.item.fields.text === t2 && r.j.item.status === 'draft', '이력 되돌리기');
  ok((await put({ kind: 'phrase', id: pid, action: 'restore', v: 999 })).s === 404, '없는 이력');
  // 비활성화
  await put({ kind: 'phrase', id: pid, action: 'save', fields: { on: false } }); await put({ kind: 'phrase', id: pid, action: 'approve_publish' });
  W.applyPublished((await pub()).pub); ok(W.build(M, ch, {}).s1.primary.head.length === 0, '비활성 문구가 계속 쓰임');
  W.applyPublished(null);
  // 직접 추가 · 삭제
  const cid = 'S2.cohere.note.custom1';
  ok((await put({ kind: 'phrase', id: 'a', action: 'create', fields: {} })).s === 400, 'ID 형식 검증');
  ok((await put({ kind: 'phrase', id: cid, action: 'create', fields: { sec: 'S9', cx: 'cohere', role: 'note', text: '문구입니다.' } })).s === 400, 'sec 검증');
  r = await put({ kind: 'phrase', id: cid, action: 'create', fields: { sec: 'S2', cx: 'cohere', role: 'note', text: '관리자가 추가한 맥락 설명입니다.', when: ['type.primary=tech'], pri: 4 } }); ok(r.s === 200 && r.j.item.custom, '문구 직접 추가');
  ok((await put({ kind: 'phrase', id: cid, action: 'create', fields: { sec: 'S2', cx: 'cohere', role: 'note', text: '중복입니다.' } })).s === 400, '중복 ID');
  await put({ kind: 'phrase', id: cid, action: 'approve_publish' }); W.applyPublished((await pub()).pub);
  ok(W.build(M, ch, {}).s2.cohere.some(c => c.id === cid), '직접 추가한 문구가 조건에 맞을 때 쓰이지 않음');
  r = await put({ kind: 'phrase', id: cid, action: 'delete' }); ok(r.s === 200, '직접 추가한 문구 삭제'); ok((await put({ kind: 'phrase', id: pid, action: 'delete' })).s === 400, '기본 문구 삭제가 허용됨');
  W.applyPublished((await pub()).pub); ok(!W.build(M, ch, {}).s2.cohere.some(c => c.id === cid), '삭제한 문구가 계속 쓰임');
  // 직업
  ok((await put({ kind: 'job', id: 'electric', action: 'save', fields: { els: { 화: 1 } } })).s === 400, '오행 하나로 직업을 고정할 수 있음');
  ok((await put({ kind: 'job', id: 'electric', action: 'save', fields: { types: { zzz: 1 } } })).s === 400, '없는 수익 유형 연결');
  ok((await put({ kind: 'job', id: 'electric', action: 'save', fields: { barrier: 'x' } })).s === 400, 'barrier 검증');
  ok((await put({ kind: 'job', id: 'electric', action: 'save', fields: { how: '반드시 돈을 법니다.' } })).s === 400, '직업 문구 금지 표현');
  r = await put({ kind: 'job', id: 'electric', action: 'save', fields: { on: false } }); ok(r.s === 200, '직업 비활성화 저장');
  await put({ kind: 'job', id: 'electric', action: 'approve_publish' }); W.applyPublished((await pub()).pub); ok(!W.jobs().find(j => j.id === 'electric').on === true || W.jobs().find(j => j.id === 'electric').on === false, '직업 비활성 반영');
  ok(!W.build(M, ch, {}).s3.jobs.some(j => j.id === 'electric'), '비활성 직업이 추천됨');
  ok((await put({ kind: 'job', id: 'myjob', action: 'create', fields: { name: '새 직업' } })).s === 400, '필수 항목 없는 새 직업');
  r = await put({ kind: 'job', id: 'myjob', action: 'create', fields: { name: '시스템 점검 전문가', grp: 'tech', types: { tech: 1, org: 0.5 }, cats: { technical: 1, research: 0.4 }, els: { 금: 0.5, 수: 0.5 }, how: '시스템을 점검하고 원인을 찾아 개선합니다.', income: '점검 용역과 유지보수 계약으로 수익을 만듭니다.', caution: '장애 대응 책임이 따릅니다.', barrier: 'experience' } });
  ok(r.s === 200, '새 직업 추가 ' + JSON.stringify(r.j)); await put({ kind: 'job', id: 'myjob', action: 'approve_publish' });
  W.applyPublished((await pub()).pub); ok(W.jobs().some(j => j.id === 'myjob' && j.custom), '새 직업이 엔진에 반영되지 않음');
  // 유형 · 취약점
  ok((await put({ kind: 'type', id: 'tech', action: 'save', fields: { on: 'no' } })).s === 400, '유형 on 검증');
  await put({ kind: 'type', id: 'tech', action: 'save', fields: { on: false } }); await put({ kind: 'type', id: 'tech', action: 'approve_publish' });
  W.applyPublished((await pub()).pub); { const x = W.build(M, ch, {}); ok(!x.s1.primary || x.s1.primary.id !== 'tech', '비활성 유형이 대표로 나옴'); ok(!x.s1.rows.some(rw => rw.id === 'tech'), '비활성 유형이 후보 표에 남음'); }
  await put({ kind: 'weak', id: 'pricing', action: 'save', fields: { on: false } }); await put({ kind: 'weak', id: 'pricing', action: 'approve_publish' });
  W.applyPublished((await pub()).pub); ok(!W.build(M, ch, {}).s4.items.some(i => i.id === 'pricing'), '비활성 취약점이 선택됨');
  // 일괄 게시
  const ids = ['S1.org.head', 'S1.biz.head', 'S1.zzz.head'];
  r = await put({ kind: 'phrase', action: 'bulk', ids: ids.slice(0, 2), op: 'publish' }); ok(r.s === 400 || r.j.done === 0, '내용이 같은 항목을 일괄 게시하면 실패로 표시되어야 함');
  await put({ kind: 'phrase', id: 'S1.org.head', action: 'save', fields: { text: '조직 안에서 전문성을 키우는 방식을 먼저 살펴볼 만합니다.' } }); await put({ kind: 'phrase', id: 'S1.biz.head', action: 'save', fields: { text: '거래와 유통으로 수익을 만드는 방식을 먼저 살펴볼 만합니다.' } });
  r = await put({ kind: 'phrase', action: 'bulk', ids, op: 'publish' }); ok(r.s === 200 && r.j.done === 2 && r.j.failed.length === 1, '일괄 게시 결과 ' + JSON.stringify(r.j));
  r = await put({ kind: 'phrase', action: 'bulk', ids: ['S1.org.head'], op: 'unpublish' }); ok(r.s === 200 && r.j.done === 1, '일괄 게시 취소');
  ok((await put({ kind: 'phrase', action: 'bulk', ids: [], op: 'publish' })).s === 400, '빈 일괄 요청');
  // 스위치 끄기 → 게시본 비공개
  await put({ kind: 'flag', enabled: false }); ok((await pub()).pub === null, '스위치를 끄면 게시본이 비공개여야 함');
  // 관리자 조회
  const adm = await (await mod.onRequestGet({ request: rq('GET', null, 'pw-test', 'https://x/api/wealth-career?all=1'), env })).json();
  ok(adm.base.phrases.length === D.PH.length && adm.base.jobs.length === D.JOBS.length && adm.base.factKeys.length > 5, '관리자 전체 조회');
  ok(adm.doc.phrases[pid] && adm.doc.phrases[pid].history.length >= 3, '이력이 저장되지 않음');
  // 다른 KV 키 불간섭
  ok(JSON.stringify([...kv.m.keys()].sort()) === JSON.stringify(['overrides', 'wealthcareer:doc']), '이 API가 다른 KV 키를 썼음: ' + [...kv.m.keys()]); ok(kv.m.get('overrides') === '{"keep":1}', '기존 키 값이 바뀜');
  W.applyPublished(null);
  console.log(fails.length ? `실패 ${fails.length}건\n - ` + fails.join('\n - ') : '모든 검증 통과');
  process.exit(fails.length ? 1 : 0);
})();
