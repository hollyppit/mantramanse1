// 주역 검수·승인·게시 API 검증: 인증, 상태 전환, 수정→승인 무효, 게시 스냅샷·롤백, 동시 수정 충돌, 서비스 개방 점검, 미리보기. 가짜 KV 를 쓰며 운영 저장소는 건드리지 않는다.
const assert = require('assert/strict'), path = require('path'), fs = require('fs'), { pathToFileURL } = require('url');
(async () => {
  const imp = f => import(pathToFileURL(path.join(__dirname, '..', f)).href);
  const API = await imp('functions/api/iching-review.js');
  const { Ic } = await imp('functions/_iching-runtime.js');

  // 런타임 import 목록이 데이터 폴더와 같은지(새 파일을 추가하고 import 를 빠뜨리는 실수 방지)
  const rt = fs.readFileSync(path.join(__dirname, '../functions/_iching-runtime.js'), 'utf8');
  fs.readdirSync(path.join(__dirname, '../report/iching/texts')).filter(f => f.endsWith('.js')).forEach(f => assert.ok(rt.includes("texts/" + f), f + ' 가 _iching-runtime.js 에 없습니다'));

  const mem = new Map();
  const kv = { get: async (k, t) => (mem.has(k) ? (t === 'json' ? JSON.parse(mem.get(k)) : mem.get(k)) : null), put: async (k, v) => { mem.set(k, v); }, delete: async k => { mem.delete(k); }, list: async ({ prefix }) => ({ keys: [...mem.keys()].filter(k => k.startsWith(prefix)).map(name => ({ name })) }) };
  const env = { ADMIN_PASSWORD: 'pw', GLOSSARY_KV: kv };
  const req = (m, qs, body, pw = 'pw', rv) => new Request('http://x/api/iching-review?' + qs, { method: m, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', ...(rv ? { 'x-reviewer': encodeURIComponent(rv) } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const GET = async (qs, pw) => { const r = await API.onRequestGet({ request: req('GET', qs, null, pw), env }); return { s: r.status, b: await r.json() }; };
  const POST = async (qs, body, pw, rv) => { const r = await API.onRequestPost({ request: req('POST', qs, body, pw, rv), env }); return { s: r.status, b: await r.json() }; };

  // ── 인증 ──
  assert.equal((await GET('a=state', 'bad')).s, 401);
  assert.equal((await POST('a=review', { action: 'approve', keys: ['modern:5'] }, 'bad')).s, 401);
  assert.equal((await API.onRequestGet({ request: new Request('http://x/api/iching-review?a=state'), env })).status, 401, '헤더 없음');

  // ── 초기 상태: 승인·게시 0, 서비스 개방 불가 ──
  let st = (await GET('a=state')).b;
  assert.equal(st.summary.total, 768); assert.equal(st.summary.released, 0); assert.equal(st.release, null); assert.equal(st.readiness.ready, false);
  assert.equal(st.flags.enabled, false);
  assert.equal(st.summary.byType.classics['source-imported'], 64); assert.equal(st.summary.byType.modern.draft, 64);

  // ── 목록·검색·상세 ──
  let l = (await GET('a=items&type=pack&hex=5&limit=10')).b; assert.equal(l.total, 4 + 0); // 5괘의 분야 해석 4개
  assert.ok(l.items.every(i => i.num === 5 && i.type === 'pack'));
  assert.equal((await GET('a=items&q=' + encodeURIComponent('수(需)'))).b.items.length > 0, true);
  const d = (await GET('a=item&key=pack:5:wealth')).b; assert.equal(d.item.status, 'draft'); assert.equal(d.validation.errors.length, 0); assert.equal(d.hash.length > 5, true);
  assert.equal((await GET('a=item&key=nope:1')).s, 404);
  const dc = (await GET('a=item&key=classics:29')).b; assert.ok(dc.source && dc.source.source.license, '원문은 출처·저작권을 함께 보여 준다');

  // ── 승인: 반려 사유 필수, 알 수 없는 작업·없는 항목 거부 ──
  assert.equal((await POST('a=review', { action: 'reject', keys: ['modern:5'] })).s, 422, '반려는 사유가 필요');
  assert.equal((await POST('a=review', { action: 'zzz', keys: ['modern:5'] })).s, 422);
  const bad = await POST('a=review', { action: 'approve', keys: ['modern:999'] }); assert.equal(bad.s, 422); assert.equal(bad.b.errors[0].reason, '없는 항목');
  // 5괘 관련 항목 전부 승인(원문·현대어·4분야·효 6) → 검수자 이름이 이력에 남는다
  const five = ['classics:5', 'modern:5', 'pack:5:general', 'pack:5:wealth', 'pack:5:career', 'pack:5:love'].concat([1, 2, 3, 4, 5, 6].map(p => 'pack:5:line:' + p));
  let a1 = await POST('a=review', { action: 'approve', keys: five, expectVersion: 0, note: '5괘 1차 검수' }, 'pw', '검수자A');
  assert.equal(a1.s, 200); assert.equal(a1.b.changed, 12); assert.equal(a1.b.version, 1);
  // 같은 version 으로 다시 보내면 충돌
  let cf = await POST('a=review', { action: 'approve', keys: ['modern:1'], expectVersion: 0 }); assert.equal(cf.s, 409); assert.equal(cf.b.error, 'version-conflict'); assert.equal(cf.b.current, 1);
  // 승인한 항목은 reviewed 이지만 아직 게시 전 → released=false
  const it = (await GET('a=item&key=pack:5:wealth')).b; assert.equal(it.item.status, 'reviewed'); assert.equal(it.item.released, false); assert.equal(it.item.reviewedBy, 'admin:검수자A');
  assert.ok(it.history.some(h => h.action === 'approve' && h.by === 'admin:검수자A' && h.note === '5괘 1차 검수'));

  // ── 게시 전에는 사용자 모드 미리보기에 문장이 나오지 않는다(승인 ≠ 게시) ──
  const vals = '7,7,9,8,7,8';
  let pv = (await GET('a=preview&hex=5&cat=wealth&values=' + vals + '&mode=public')).b;
  assert.equal(pv.result.publishable, false); assert.equal(pv.result.conclusion.summary, null);
  // 관리자 미리보기는 초안/승인 문구를 모두 보여 주고 규칙 검사 결과를 함께 준다
  pv = (await GET('a=preview&hex=5&cat=wealth&values=' + vals + '&mode=preview&saju=1')).b;
  assert.equal(pv.ok, true); assert.ok(pv.result.conclusion.summary); assert.equal(pv.validation.ok, true); assert.deepEqual(pv.quality.errors, []); assert.equal(pv.result.saju_cross_analysis.status, 'ok');
  assert.equal((await GET('a=preview&values=1,2,3')).s, 400);

  // ── 게시 점검(dryRun) → 게시 ──
  let dry = await POST('a=publish', { dryRun: true, expectReleaseVersion: 0 }); assert.equal(dry.s, 200); assert.equal(dry.b.dryRun, true); assert.equal(dry.b.count, 12); assert.equal(dry.b.diff.added, 12);
  assert.equal((await GET('a=state')).b.release, null, 'dryRun 은 저장하지 않는다');
  const pub = await POST('a=publish', { expectReleaseVersion: 0, expectReviewVersion: 1, note: '5괘 게시' }); assert.equal(pub.s, 200); assert.equal(pub.b.version, 1);
  assert.equal((await POST('a=publish', { expectReleaseVersion: 0 })).b.error, 'release-conflict');
  assert.equal((await POST('a=publish', { expectReleaseVersion: 1 })).b.error, 'nothing-to-publish', '바뀐 것이 없으면 새 버전을 만들지 않는다');
  // 5괘 변효 3의 결과(변괘 60)에는 60괘 원문·현대어가 필요하므로 아직 사용자에게는 일부 누락
  pv = (await GET('a=preview&hex=5&cat=wealth&values=' + vals + '&mode=public')).b;
  assert.equal(pv.result.publishable, false); assert.ok(pv.result.missing.includes('modern:60'));
  assert.equal(pv.result.conclusion.summary !== null, true, '게시된 5괘 문구는 보인다');
  assert.equal(pv.result.content_version, 'release-1');
  // 변효가 없는 5괘 결과는 5괘 항목만 있으면 완전하게 나온다
  pv = (await GET('a=preview&hex=5&cat=wealth&values=7,7,7,8,7,8&mode=public')).b; assert.equal(pv.result.publishable, true, pv.result.missing.join()); assert.deepEqual(pv.quality.errors, []);

  // ── 수정 → 승인 무효(stale) → 게시본에서 즉시 빠짐 ──
  const cur = (await GET('a=item&key=pack:5:wealth')).b.content;
  const edited = JSON.parse(JSON.stringify(cur)); edited.final = '돈은 오를 때를 기다리지 말고 잃어도 되는 금액을 먼저 정하십시오.';
  const v1 = (await GET('a=state')).b.reviewVersion;
  let e1 = await POST('a=edit', { key: 'pack:5:wealth', content: edited, expectVersion: v1, note: '문장 다듬기' }, 'pw', '검수자B'); assert.equal(e1.s, 200);
  let it2 = (await GET('a=item&key=pack:5:wealth')).b; assert.equal(it2.item.status, 'draft'); assert.equal(it2.item.released, false, '수정하면 게시본에서도 즉시 빠진다'); assert.equal(it2.item.edited, true);
  assert.equal(it2.content.final, edited.final); assert.equal(it2.builtin.final === edited.final, false); assert.equal(it2.override.by, 'admin:검수자B');
  pv = (await GET('a=preview&hex=5&cat=wealth&values=7,7,7,8,7,8&mode=public')).b; assert.equal(pv.result.conclusion.summary, null, '수정된 항목은 재승인·재게시 전까지 사용자에게 안 나온다'); assert.ok(pv.result.missing.includes('pack:5:wealth'));
  // 규칙을 어기는 수정은 저장되지 않는다(확률·반말·지양 표현·구조 오류)
  const v2 = (await GET('a=state')).b.reviewVersion;
  for (const [mut, rx] of [[c => { c.final = '성공 확률은 80% 입니다.'; }, /퍼센트/], [c => { c.final = '반드시 오를 것입니다.'; }, /확정/], [c => { c.final = '지금은 기다려야 한다.'; }, /존댓말/], [c => { c.summary = '좋은 기운이 들어오고 있습니다.'; }, /지양/], [c => { c.do.pop(); }, /3개/], [c => { c.direction = '대박'; }, /방향/], [c => { c.final = c.issue; }, /반복/]]) {
    const c = JSON.parse(JSON.stringify(edited)); mut(c); const r = await POST('a=edit', { key: 'pack:5:wealth', content: c, expectVersion: v2 }); assert.equal(r.s, 422); assert.ok(rx.test(JSON.stringify(r.b.errors)), JSON.stringify(r.b.errors));
  }
  assert.equal((await GET('a=state')).b.reviewVersion, v2, '거부된 수정은 버전을 올리지 않는다');
  // 재승인 → 재게시 → 다시 노출
  assert.equal((await POST('a=review', { action: 'approve', keys: ['pack:5:wealth'], expectVersion: v2 })).b.changed, 1);
  const pub2 = await POST('a=publish', { expectReleaseVersion: 1 }); assert.equal(pub2.s, 200); assert.equal(pub2.b.version, 2); assert.equal(pub2.b.diff.added + pub2.b.diff.changed, 1);
  pv = (await GET('a=preview&hex=5&cat=wealth&values=7,7,7,8,7,8&mode=public')).b; assert.equal(pv.result.final_message.text, edited.final); assert.equal(pv.result.publishable, true);
  // 수정본 되돌리기 → 코드의 초안으로(다시 draft)
  const v3 = (await GET('a=state')).b.reviewVersion; assert.equal((await POST('a=revert', { key: 'pack:5:wealth', expectVersion: v3 })).s, 200);
  assert.equal((await GET('a=item&key=pack:5:wealth')).b.item.edited, false); assert.equal((await POST('a=revert', { key: 'pack:5:wealth' })).s, 422);

  // ── 반려: 사유 기록, 반려 항목은 승인할 수 없고 미리보기에도 문장이 없다 ──
  const v4 = (await GET('a=state')).b.reviewVersion;
  assert.equal((await POST('a=review', { action: 'reject', keys: ['pack:5:love'], note: '표현이 모호함', expectVersion: v4 })).b.changed, 1);
  assert.equal((await GET('a=item&key=pack:5:love')).b.item.status, 'rejected');
  const re = await POST('a=review', { action: 'approve', keys: ['pack:5:love'] }); assert.equal(re.s, 422); assert.match(re.b.errors[0].reason, /반려/);
  assert.equal((await GET('a=preview&hex=5&cat=love&values=7,7,7,8,7,8&mode=preview')).b.result.conclusion.summary, null);
  assert.equal((await POST('a=review', { action: 'reset', keys: ['pack:5:love'] })).b.changed, 1);
  assert.equal((await GET('a=item&key=pack:5:love')).b.item.status, 'draft');

  // ── 롤백: 이전 게시본으로 새 버전을 만든다(이력 보존) ──
  const rel = (await GET('a=releases')).b.releases; assert.deepEqual(rel.map(r => r.version), [2, 1]);
  const rb = await POST('a=rollback', { toVersion: 1, expectReleaseVersion: 2, note: '문장 수정 되돌림' }); assert.equal(rb.s, 200); assert.equal(rb.b.version, 3); assert.equal(rb.b.restoredFrom, 1);
  st = (await GET('a=state')).b; assert.equal(st.release.version, 3); assert.equal(st.release.restoredFrom, 1);
  assert.equal((await POST('a=rollback', { toVersion: 99, expectReleaseVersion: 3 })).s, 404);
  // v1 은 수정 전 해시를 담고 있어 지금(수정본 되돌림으로 원래 내용) 내용과 같으면 노출, 다르면 자동 제외 — 여기서는 되돌렸으므로 노출
  pv = (await GET('a=preview&hex=5&cat=wealth&values=7,7,7,8,7,8&mode=public')).b; assert.equal(pv.result.content_version, 'release-3'); assert.equal(pv.result.publishable, true);

  // ── 서비스 개방 플래그: 64괘 전체가 게시되기 전에는 켤 수 없다 ──
  const on = await POST('a=flags', { enabled: true, categories: ['wealth'] }); assert.equal(on.s, 409); assert.equal(on.b.error, 'not-ready'); assert.ok(on.b.missing > 100);
  assert.equal((await POST('a=flags', { enabled: true, categories: [] })).s, 422);
  assert.equal((await POST('a=flags', { enabled: false, categories: ['wealth'] })).s, 200);
  assert.equal((await GET('a=state')).b.flags.enabled, false);
  // 64괘 전체를 승인·게시하면 점검 통과(마지막에 변경 없이 플래그 확인)
  const all = Ic().Content.allKeys(); const ver = (await GET('a=state')).b.reviewVersion;
  const big = await POST('a=review', { action: 'approve', keys: all.slice(0, 1000), expectVersion: ver, note: '전체 승인(테스트)' }); assert.equal(big.s, 200); assert.equal(big.b.errors.length, 0, JSON.stringify(big.b.errors.slice(0, 3)));
  const pubAll = await POST('a=publish', { expectReleaseVersion: 3, note: '전체 게시(테스트)' }); assert.equal(pubAll.s, 200); assert.equal(pubAll.b.count, 768);
  const on2 = await POST('a=flags', { enabled: true, categories: ['general', 'wealth', 'career', 'love'] }); assert.equal(on2.s, 200); assert.equal(on2.b.flags.enabled, true);
  st = (await GET('a=state')).b; assert.equal(st.readiness.ready, true); assert.equal(st.summary.released, 768);
  // 모든 변효 조합이 사용자 모드에서 누락 없이 나온다
  for (const vv of ['9,9,9,9,9,9', '6,6,6,6,6,6', '7,8,9,6,7,8', '9,7,7,8,9,8']) for (const cat of ['general', 'love']) { const r = (await GET('a=preview&cat=' + cat + '&values=' + vv + '&mode=public')).b; assert.equal(r.result.publishable, true, vv + cat + ' ' + r.result.missing.join()); assert.deepEqual(r.quality.errors, []); }
  // 게시 뒤 한 항목을 수정하면 그 항목만 사용자 화면에서 빠지고 플래그 점검은 실패로 돌아간다
  const w = (await GET('a=item&key=pack:7:career')).b.content, w2 = JSON.parse(JSON.stringify(w)); w2.final = '팀을 모으는 힘은 기준을 지키는 힘에서 나옵니다. 오늘 팀의 기준 한 가지를 글로 남기십시오.';
  assert.equal((await POST('a=edit', { key: 'pack:7:career', content: w2 })).s, 200);
  assert.equal((await GET('a=state')).b.readiness.ready, false);
  // 이력: 최신순, 항목 키로 필터
  const lg = (await GET('a=log&limit=200')).b.log; assert.ok(lg.length >= 8); assert.ok(['edit', 'publish', 'approve', 'rollback', 'flags', 'revert', 'reject', 'reset'].every(a => lg.some(x => x.action === a)), '모든 작업이 이력에 남는다');
  const lk = (await GET('a=log&key=pack:5:wealth')).b.log; assert.ok(lk.length >= 3 && lk.every(x => x.keys.includes('pack:5:wealth')));
  // 운영 데이터 보호: 코드의 원본 초안은 수정 요청으로 바뀌지 않는다
  assert.equal(Ic().Content.builtin('pack:5:wealth').final === edited.final, false);
  console.log('PASS: 인증, 승인·반려·되돌리기, 수정 시 승인 무효, 규칙 위반 수정 거부, 게시 점검(dryRun)·게시·롤백, 동시 수정 충돌, 서비스 개방 점검, 미리보기, 이력');
})().catch(e => { console.error(e); process.exit(1); });
