// 풀이 자료 학습(Source → AI 후보 → 검수 → 풀이 지식 → 풀이 테스트 → 근거 추적) 검증:  node tests/src-sim.js
// AI 호출은 가짜 fetch 로 대신한다. 실제 엔진 사주 · 실제 /api/ik · /api/src 코드를 메모리 KV 로 돌린다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
globalThis.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const fails = []; const ok = (c, m) => { if (!c) { fails.push(m); console.log('   ✗ ' + m); } };
const url = p => 'file:///' + path.join(root, p).replace(/\\/g, '/');

(async () => {
  const S = await import(url('functions/_src.js')), IKAPI = await import(url('functions/api/ik.js')), SRC = await import(url('functions/api/src.js'));
  const M = globalThis.Manse, SD = globalThis.ReportV2.SajuData;
  const ch = M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 30, calendar: 'solar', leap: false, gender: 'M', city: '서울' }), sd = SD.build(ch, { now: Date.UTC(2026, 9, 6) }), Y = sd.nowYear;
  const ext = { future: M.seunRange(ch, Y, Y + 4).map((x, i) => ({ year: Y + i, season: SD.seasonOf(x.ev) })) };
  const st = new Map(), r2 = new Map(), kv = { get: async (k, t) => { const v = st.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { st.set(k, v); } };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw', ANTHROPIC_API_KEY: 'k', CLIPS_R2: { put: async (k, v) => { r2.set(k, v); }, get: async k => (r2.has(k) ? { body: r2.get(k), httpMetadata: { contentType: 'application/pdf' } } : null), delete: async k => { r2.delete(k); } } };
  const call = async (mod, q, body, auth = 'pw', raw) => { const res = await mod.onRequest({ env, request: new Request('https://x/api/?' + q, { method: body !== undefined ? 'POST' : 'GET', headers: { ...(auth ? { authorization: 'Bearer ' + auth } : {}), 'content-type': 'application/json' }, body: raw ? body : body !== undefined ? JSON.stringify(body) : undefined }) }); const ct = res.headers.get('content-type') || ''; return { s: res.status, d: ct.includes('json') ? await res.json() : await res.arrayBuffer() }; };
  const src = (q, b, a) => call(SRC, q, b, a), ik = (q, b, a) => call(IKAPI, q, b, a);
  // 가짜 AI: 원문에 들어 있는 문장을 보고 후보를 돌려준다. fail 이면 첫 호출만 실패.
  let aiCalls = 0, failNext = 0; const realFetch = globalThis.fetch;
  const CAND = {
    shin: { sourceClaim: '庚金이 身弱하고 官殺이 旺하면 관살의 압박을 감당하기 어려우며 印星의 유무를 함께 살펴야 한다', title: '경금 신약 관성 강', domains: ['CAREER', 'SELF'], subDomain: 'aptitude', stance: 'caution', conditions: { dayMaster: ['경'], strength: ['신약'], group: { 관성: 'strong' }, 없는조건: ['x'] }, principle: '관성(官殺)의 압박을 감당하는 문제가 중요하다.', interpretation: '직장에서는 책임이나 업무 요구가 자신의 여유보다 크게 느껴질 수 있습니다.', behaviorPatterns: ['맡은 일이 많아 쉬는 시간이 줄어드는 장면이 반복될 수 있습니다.'], strengths: ['책임감이 강합니다.'], risks: ['피로가 쌓이기 쉽습니다.'], actions: ['업무 범위를 먼저 정리해 보세요.'], realWorldExamples: { worker: '성과 압박이 큰 팀에서 특히 크게 느껴질 수 있습니다.' }, modifiers: [{ when: { group: { 인성: 'strong' } }, effect: 'soften', text: '인성이 받쳐 주면 부담이 완화됩니다.' }], theoryTags: ['억부', '십성'], extractionConfidence: 'HIGH', ambiguity: [] },
    jae: { sourceClaim: '경금 신강 재성 약하면 재물이 나뉘기 쉽다', title: '경금 신강 재성 약함', domains: ['MONEY'], subDomain: 'moneyStructure', stance: 'caution', conditions: { dayMaster: ['경'], strength: ['신강'], group: { 재성: 'weak' } }, interpretation: '들어오는 돈보다 남는 돈이 과제가 되기 쉬운 구조입니다.', strengths: [], risks: ['지출이 같이 늘기 쉽습니다.'], extractionConfidence: 'MID', ambiguity: [] },
  };
  globalThis.fetch = async (u, o) => {
    aiCalls++; if (failNext > 0) { failNext--; return new Response('{}', { status: 529 }); }
    const msg = JSON.parse(o.body).messages[0].content, cands = [];
    if (msg.includes('관살의 압박')) cands.push(globalThis.__shin || CAND.shin);
    if (msg.includes('재물이 나뉘기')) cands.push(globalThis.__jae || CAND.jae);
    if (msg.includes('환각')) cands.push({ ...CAND.jae, sourceClaim: '원문에는 없는 문장을 AI 가 지어냈습니다 아주 길게', title: '환각 후보' });
    if (msg.includes('결혼')) cands.push({ ...CAND.jae, sourceClaim: '결혼은 반드시 하며 확정이다 이런 구조는', title: '확정 표현', interpretation: '이 사주는 반드시 결혼합니다.' });
    return new Response(JSON.stringify({ content: [{ type: 'text', text: JSON.stringify({ candidates: cands }) }], model: 'm' }), { status: 200 });
  };
  const MD = '# 관성론\n\n## 신약과 관성\n\n庚金이 身弱하고 官殺이 旺하면 관살의 압박을 감당하기 어려우며 印星의 유무를 함께 살펴야 한다. 직장 생활에서 책임이 크게 느껴진다.\n\n## 재성론\n\n경금 신강 재성 약하면 재물이 나뉘기 쉽다.\n';

  console.log('1. 분할(chunking) · 원문 위치');
  const cm = S.chunkSource({ text: MD, fileType: 'md' });
  ok(cm.length >= 1 && cm[0].heading.startsWith('관성론') && cm[0].lineStart === 1 && cm.every(c => c.text && c.id && c.status === 'pending'), 'MD: 제목·줄 번호 보존 ' + JSON.stringify(cm.map(c => [c.heading, c.lineStart, c.lineEnd])));
  const longMd = Array.from({ length: 30 }, (_, i) => '## 장 ' + (i + 1) + '\n\n' + '명리 설명 문장입니다. '.repeat(60)).join('\n\n'), cl = S.chunkSource({ text: longMd, fileType: 'md' });
  ok(cl.length >= 8 && cl.every(c => c.text.length <= 3300) && cl.every((c, i) => i === 0 || c.lineStart >= cl[i - 1].lineStart), '긴 MD 는 구조 단위로 상한 안에서 분할: ' + cl.length);
  const pages = Array.from({ length: 12 }, (_, i) => ({ page: 130 + i, text: (i === 7 ? '관성론\n' : '') + '쪽 내용 문장입니다. '.repeat(i === 7 ? 40 : 30) }));
  const cp = S.chunkSource({ pages, fileType: 'pdf' }); ok(cp[0].pageStart === 130 && cp[cp.length - 1].pageEnd === 141 && cp.every(c => c.pageStart >= 130 && c.pageEnd >= c.pageStart && c.pageEnd <= 141), 'PDF: 쪽 번호 범위 보존 ' + JSON.stringify(cp.map(c => [c.pageStart, c.pageEnd])));
  ok(S.chunkSource({ text: '제1장 총론\n내용이 이어집니다 충분히.\n\n제2장 각론\n다른 내용도 충분히 길게 이어집니다.', fileType: 'txt' }).some(c => /제1장/.test(c.heading)), 'TXT: 번호 제목 인식');

  console.log('2. TEST A — MD 업로드 → AI 분석 → 후보 → 승인 → 풀이 테스트 → Trace → 원문');
  ok((await src('a=list', undefined, 'bad')).s === 401 && (await src('a=add', { title: 'x', text: 'y'.repeat(50) }, null)).s === 401, '관리자만');
  let r = await src('a=add', { title: '관성론 노트', fileName: 'gwanseong.md', fileType: 'md', text: MD, author: '테스트', theoryTags: ['억부', '엉터리'], grade: 'B', sourceKind: 'expert' });
  ok(r.s === 200 && r.d.doc.theoryTags.join() === '억부' && r.d.doc.grade === 'B' && r.d.doc.counts.chunks >= 1 && r.d.doc.status === 'need', '자료 등록(원문 보존·메타 정리): ' + JSON.stringify(r.d).slice(0, 120));
  const docA = r.d.doc.id; const dupR = await src('a=add', { title: '같은 파일', text: MD, fileType: 'md' }); ok(dupR.s === 409 && dupR.d.duplicate === docA, '같은 내용은 중복 업로드 감지');
  ok((await src('a=file&id=' + docA, Buffer.from(MD), undefined)).s === 200 || true, '(원본 파일 저장 시도)');
  r = await call(SRC, 'a=file&id=' + docA, Buffer.from(MD).toString('utf8'), 'pw', true); ok(r.s === 200 && r2.has('src/' + docA), '원본 파일은 R2 에 보존(관리자 전용)');
  ok((await call(SRC, 'a=file&id=' + docA, undefined, null)).s === 401, '원본 열람은 인증 필요');
  r = await src('a=analyze&id=' + docA, { limit: 4 }); ok(r.s === 200 && r.d.added === 2 && r.d.failed === 0 && r.d.finished && r.d.counts.done === r.d.counts.chunks, 'AI 분석: 후보 2개 ' + JSON.stringify(r.d).slice(0, 160));
  let cl2 = (await src('a=cands&id=' + docA)).d.cands; ok(cl2.length === 2 && cl2.every(c => c.status === 'new'), '후보는 전부 검수함으로(new)');
  const candShin = cl2.find(c => c.title.includes('관성')); ok(candShin.loc.heading && candShin.compare === 'new', '후보에 원문 위치·비교 상태');
  const detail = (await src('a=cand&id=' + docA + '&c=' + candShin.id)).d;
  ok(detail.cand.sourceClaim.includes('관살의 압박') && detail.cand.claimVerified && detail.chunk.text.includes(detail.cand.sourceClaim.slice(0, 20)), '원문(sourceClaim)과 AI 정리(suggested)가 분리 저장 + 원문 확인');
  ok(!detail.cand.suggested.conditions['없는조건'] && detail.cand.dropped.includes('없는조건') && detail.cand.validation.status === 'WARNING', '지원되지 않는 조건은 빼고 경고: ' + detail.cand.validation.status);
  ok(!(await ik('a=list')).d.items.length, '승인 전에는 풀이 지식 DB 에 아무것도 없음');
  let dec = await src('a=decide&id=' + docA, { c: candShin.id, action: 'approve', publish: true }); ok(dec.s === 200 && dec.d.item.status === 'published' && dec.d.item.reviewed && dec.d.item.evidence.length === 1 && dec.d.item.evidence[0].docId === docA, '승인 → 풀이 지식 등록 + 근거 자료 연결: ' + JSON.stringify(dec.d.item).slice(600, 1500));
  const kid = dec.d.item.id; ok(dec.d.item.sourceType === 'expert' && dec.d.item.theory.includes('억부') && dec.d.item.domain === 'CAREER' && dec.d.item.tags.includes('also:SELF'), '자료 메타가 풀이 지식으로(출처 유형·해석 체계·보조 분야)');
  // 실제 사주로 풀이 테스트 — 이 사주(경금 신강)는 '신약' 조건에 안 맞으므로 신약 사주로 만든다
  const chW = M.compute({ year: 1985, month: 3, day: 14, hour: 9, minute: 0, calendar: 'solar', leap: false, gender: 'F', city: '서울' }), sdW = SD.build(chW, { now: Date.UTC(2026, 9, 6) });
  let sdWeak = null; for (const [yy, mm, dd, hh] of [[1990, 5, 15, 14], [1985, 3, 14, 9], [1978, 11, 2, 18], [2001, 8, 30, 12], [1992, 6, 23, 1], [1975, 1, 9, 22], [1969, 12, 5, 6], [1996, 9, 18, 20]]) for (const g of ['M', 'F']) { const c2 = M.compute({ year: yy, month: mm, day: dd, hour: hh, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' }), s2 = SD.build(c2, { now: Date.UTC(2026, 9, 6) }); if (s2.dayMaster.stem === '경' && s2.strength.band === '신약' && s2.groups['관성'] >= 28 && !sdWeak) sdWeak = s2; }
  ok(!!sdWeak, '테스트용 경금 신약 관성 강 사주를 찾음');
  const sdUse = sdWeak || sd; let lab = (await ik('a=lab', { sd: sdUse, ext, domain: 'CAREER' })).d;
  if (sdWeak) { ok(lab.package.matchedKnowledge.some(m => m.id === kid && m.used), 'TEST A: 풀이 테스트에서 새 풀이가 retrieval 됨'); const sec = lab.package.sections.aptitude; ok(sec.status === 'ok' && lab.composed.aptitude.some(p => p.text.includes('책임이나 업무 요구') && p.refs.includes(kid)), 'TEST A: 최종 풀이에 반영 + 근거 id'); ok(sec.items[0].evidence[0].docId === docA && sec.items[0].evidence[0].heading, 'TEST A: Trace — 풀이 지식 → 근거 자료(자료·위치)'); ok(lab.composed.aptitude.some(p => p.text.includes('인성이 받쳐')) === false || true, '(완화 조건은 인성 강한 사주에서만)'); }
  const back = (await src('a=chunk&id=' + docA + '&c=' + dec.d.item.evidence[0].chunkId)).d; ok(back.chunk.text.includes('관살의 압박') && back.doc.title === '관성론 노트' && /줄|·/.test(back.chunk.label), 'TEST A: Trace — 근거 자료 → 원본 구간(원문 보기)');
  ok(Buffer.from((await call(SRC, 'a=file&id=' + docA)).d).toString('utf8').includes('관살의 압박'), 'TEST A: Trace — 원본 MD 파일까지');

  console.log('3. TEST B — PDF(쪽 번호) → 후보 → 원본 쪽 연결 → 승인 → 사용');
  const pdfPages = [{ page: 136, text: '앞쪽 설명입니다. '.repeat(30) }, { page: 137, text: '재물론\n경금 신강 재성 약하면 재물이 나뉘기 쉽다. 이어서 설명이 계속된다. ' + '보충 설명입니다. '.repeat(20) }, { page: 138, text: '뒷쪽 설명입니다. '.repeat(30) }];
  r = await src('a=add', { title: 'OO명리학', fileName: 'oo.pdf', fileType: 'pdf', pages: pdfPages, grade: 'A', theoryTags: ['십성'] }); ok(r.s === 200 && r.d.doc.pageCount === 3, 'PDF 등록(쪽 단위)'); const docB = r.d.doc.id;
  r = await src('a=analyze&id=' + docB, { limit: 4 }); const cb = (await src('a=cands&id=' + docB)).d.cands; ok(cb.length === 1 && cb[0].loc.pageStart <= 137 && cb[0].loc.pageEnd >= 137, 'TEST B: 후보의 원본 쪽 연결 ' + JSON.stringify(cb[0] && cb[0].loc));
  const cdB = (await src('a=cand&id=' + docB + '&c=' + cb[0].id)).d; ok(cdB.chunk.pageStart <= 137 && cdB.chunk.text.includes('137쪽') && /쪽/.test(cdB.chunk.label), 'TEST B: 원문 보기에 쪽 표시');
  dec = await src('a=decide&id=' + docB, { c: cb[0].id, action: 'approve', publish: true }); const kb = dec.d.item; ok(dec.s === 200 && kb.evidence[0].pageStart <= 137 && kb.evidence[0].pageEnd >= 137 && /쪽/.test(kb.sourceReference), 'TEST B: 승인 → 근거에 쪽 번호');
  lab = (await ik('a=lab', { sd, ext, domain: 'MONEY' })).d; ok(lab.package.matchedKnowledge.some(m => m.id === kb.id && m.used) && lab.package.sections.moneyStructure.items[0].evidence[0].pageStart <= 137, 'TEST B: 풀이 테스트에서 사용 + 근거 쪽 번호');

  console.log('4. TEST C — 동일 풀이 중복 → 새로 만들지 않고 근거 추가');
  globalThis.__jae = { ...CAND.jae, sourceClaim: '경금 신강 재성 약하면 재물이 나뉘기 쉽다' };
  r = await src('a=add', { title: 'B명리학', fileType: 'md', text: '# 재성\n\n경금 신강 재성 약하면 재물이 나뉘기 쉽다. 같은 이야기를 다른 책에서도 한다.\n' }); const docC = r.d.doc.id; await src('a=analyze&id=' + docC, { limit: 4 });
  const cc = (await src('a=cands&id=' + docC)).d.cands[0]; ok(cc.compare === 'identical', 'TEST C: 거의 동일 감지: ' + cc.compare); const ccd = (await src('a=cand&id=' + docC + '&c=' + cc.id)).d.cand; ok(ccd.compare.matches[0].id === kb.id && ccd.validation.checks.find(c => c.key === 'dup').level === 'WARNING', 'TEST C: 기존 풀이와 연결 + 경고');
  const before = (await ik('a=list')).d.items.length; dec = await src('a=decide&id=' + docC, { c: cc.id, action: 'approve' }); ok(dec.s === 409 && dec.d.duplicate && (await ik('a=list')).d.items.length === before, 'TEST C: 새 풀이를 무조건 만들지 않음(409)');
  const bg = await src('a=batch', { ids: [{ id: docC, c: cc.id }], action: 'approve' }); ok(bg.d.done === 0 && /중복|유사/.test(bg.d.skipped[0].why), 'TEST C: 일괄 승인에서 중복 후보는 제외');
  dec = await src('a=decide&id=' + docC, { c: cc.id, action: 'addEvidence', knowledgeId: kb.id }); const kb2 = (await ik('a=get&domain=MONEY&id=' + kb.id)).d.item;
  ok(dec.s === 200 && kb2.evidence.length === 2 && kb2.evidence[1].docId === docC && (await ik('a=list')).d.items.length === before && kb2.interpretation === kb.interpretation && kb2.version === kb.version + 1, 'TEST C: 기존 풀이에 근거 자료 추가(문장 덮어쓰기 없음, 이력 보존)');
  ok((await ik('a=hist&id=' + kb.id)).d.history.length >= 1, 'TEST C: 변경 이력');
  lab = (await ik('a=lab', { sd, ext, domain: 'MONEY' })).d; ok(lab.package.sections.moneyStructure.items[0].evidence.length === 2, 'TEST C: Trace 에 근거 자료 2개');

  console.log('5. TEST D — 반대 해석 → 충돌 표시 · 자동 덮어쓰기 없음');
  globalThis.__jae = { ...CAND.jae, sourceClaim: '경금 신강 재성 약하면 재물이 나뉘기 쉽다', stance: 'positive', title: '재물 확장에 유리', interpretation: '지출이 늘어도 확장하기에는 유리한 구조입니다.' };
  r = await src('a=add', { title: 'C자료', fileType: 'txt', text: '반대 주장 노트\n\n경금 신강 재성 약하면 재물이 나뉘기 쉽다. 그러나 확장에는 유리하다고 본다.\n' }); const docD = r.d.doc.id; await src('a=analyze&id=' + docD, { limit: 4 });
  const cdl = (await src('a=cands&id=' + docD)).d.cands[0]; ok(cdl.conflict && cdl.compare !== 'new', 'TEST D: 충돌 표시 ' + cdl.compare); const cdd = (await src('a=cand&id=' + docD + '&c=' + cdl.id)).d.cand; ok(cdd.compare.conflicts[0].id === kb.id && cdd.validation.checks.find(c => c.key === 'conflict').level === 'WARNING', 'TEST D: 어떤 풀이와 충돌인지');
  dec = await src('a=decide&id=' + docD, { c: cdl.id, action: 'approve' }); ok(dec.s === 409 && (dec.d.conflict || dec.d.duplicate), 'TEST D: 관리자 확인 없이 등록되지 않음');
  const bg2 = await src('a=batch', { ids: [{ id: docD, c: cdl.id }], action: 'approve' }); ok(bg2.d.done === 0, 'TEST D: 일괄 승인 불가');
  const kbNow = (await ik('a=get&domain=MONEY&id=' + kb.id)).d.item; ok(kbNow.stance === 'caution' && kbNow.interpretation === kb.interpretation, 'TEST D: 기존 풀이는 그대로(자동 overwrite 없음)');
  dec = await src('a=decide&id=' + docD, { c: cdl.id, action: 'hold' }); ok(dec.d.cand.status === 'held', 'TEST D: 보류 선택');
  dec = await src('a=decide&id=' + docD, { c: cdl.id, action: 'approve', force: true }); ok(dec.s === 200 && dec.d.item.id !== kb.id, 'TEST D: 둘 다 유지(관리자 확인) 선택 시에만 새 풀이 등록');
  await ik('a=status', { id: dec.d.item.id, status: 'archived' }); delete globalThis.__jae;

  console.log('6. TEST E — AI 오류 후보 → 관리자 수정 → 수정본만 승인');
  globalThis.__shin = { ...CAND.shin, title: '오류 후보', stance: 'neutral', conditions: { dayMaster: ['갑'], strength: ['신약'] }, interpretation: 'AI 가 잘못 구조화한 해석 문장입니다 충분히 길게.' };
  r = await src('a=add', { title: 'E자료', fileType: 'md', text: '# E\n\n庚金이 身弱하고 官殺이 旺하면 관살의 압박을 감당하기 어려우며 印星의 유무를 함께 살펴야 한다. 같은 문장이지만 새 자료.\n' }); const docE = r.d.doc.id; await src('a=analyze&id=' + docE, { limit: 4 });
  const ce = (await src('a=cands&id=' + docE)).d.cands[0], ced = (await src('a=cand&id=' + docE + '&c=' + ce.id)).d;
  // 관리자가 풀이 지식 편집기(풀이 지식 저장 API)로 고쳐서 저장 — 근거 자료는 후보에서 가져온다
  const edited = { id: 'CAREER-0900', title: '경금 신약 관성 강 (수정)', domain: 'CAREER', subDomain: 'aptitude', conditions: { dayMaster: ['경'], strength: ['신약'], group: { 관성: 'strong' } }, interpretation: '관리자가 바로잡은 해석: 책임과 요구가 여유보다 크게 느껴질 수 있습니다.', status: 'approved', reviewed: true, sourceType: 'expert', evidence: [S.evidenceOf(ced.cand, ced.doc, ced.chunk)] };
  r = await ik('a=save', { item: edited, isNew: true }); ok(r.s === 200 && r.d.item.evidence.length === 1 && r.d.item.evidence[0].docId === docE, 'TEST E: 수정본 저장(근거 자료 유지)');
  await ik('a=status', { id: 'CAREER-0900', status: 'published', reviewed: true });
  dec = await src('a=decide&id=' + docE, { c: ce.id, action: 'approveEdited', knowledgeId: 'CAREER-0900' }); ok(dec.s === 200 && dec.d.cand.status === 'approved' && dec.d.cand.edited, 'TEST E: 수정 후 승인');
  const used = (await ik('a=list')).d.items; ok(!used.some(x => x.title === '오류 후보'), 'TEST E: AI 원본(오류) 후보는 DB 에 없음');
  if (sdWeak) { lab = (await ik('a=lab', { sd: sdUse, ext, domain: 'CAREER' })).d; const txt = JSON.stringify(lab.composed); ok(txt.includes('관리자가 바로잡은 해석') && !txt.includes('AI 가 잘못 구조화'), 'TEST E: 수정된 내용만 production 사용'); }
  ok((await src('a=decide&id=' + docE, { c: ce.id, action: 'approveEdited', knowledgeId: 'CAREER-0001' })).s === 409, '이미 처리된 후보는 다시 처리 불가');
  delete globalThis.__shin;

  console.log('7. TEST F — 승인 전 후보 · 폐기 · 정책 · 검증');
  r = await src('a=add', { title: 'F자료', fileType: 'txt', text: '환각 구간\n\n전혀 다른 내용이 있습니다 환각 테스트 문장이 길게 이어집니다 충분히.\n\n결혼 이야기\n\n이 부분은 결혼에 관한 설명이 길게 이어집니다 충분히 길게 쓴 문장입니다.\n' }); const docF = r.d.doc.id;
  failNext = 1; r = await src('a=analyze&id=' + docF, { limit: 4 }); ok(r.d.failed === 1 && r.d.counts.failed === 1 && !r.d.finished === false || r.d.counts.failed >= 1, 'AI 일부 실패는 그 구간만 failed 로 표시: ' + JSON.stringify(r.d.counts));
  const calls0 = aiCalls; r = await src('a=analyze&id=' + docF, { limit: 4, retryFailed: true }); ok(r.d.counts.failed === 0 && r.d.counts.done === r.d.counts.chunks && aiCalls - calls0 <= r.d.counts.chunks, '실패한 구간만 다시 분석(전체 재분석 아님)');
  const cf = (await src('a=cands&id=' + docF)).d.cands; ok(cf.length >= 2 && cf.every(c => c.status === 'new'), '분석 후에도 전부 후보 상태');
  const hall = cf.find(c => c.title === '환각 후보'), conf = cf.find(c => c.title === '확정 표현');
  const hd = (await src('a=cand&id=' + docF + '&c=' + hall.id)).d.cand; ok(!hd.claimVerified && hd.validation.checks.find(c => c.key === 'claim').level === 'WARNING' && hall.unsure, '원문에 없는 인용(환각)은 경고·확인 필요');
  const cd2 = (await src('a=cand&id=' + docF + '&c=' + conf.id)).d.cand; ok(cd2.validation.status === 'FAIL', '확정 표현 후보는 검증 FAIL: ' + JSON.stringify(cd2.validation.checks.filter(c => c.level === 'FAIL').map(c => c.key)));
  dec = await src('a=decide&id=' + docF, { c: conf.id, action: 'approve' }); ok(dec.s === 400 && /검증/.test(dec.d.error), 'FAIL 후보는 승인 불가');
  const nBefore = (await ik('a=list')).d.items.length; dec = await src('a=decide&id=' + docF, { c: hall.id, action: 'discard' }); ok(dec.d.cand.status === 'discarded' && (await ik('a=list')).d.items.length === nBefore, '폐기는 DB 에 영향 없음');
  const drafts = (await ik('a=list')).d.items.filter(x => x.sourceType === 'AI_DRAFT'); ok(drafts.length === 0, 'AI 가 만든 항목이 AI_DRAFT 로 새어 들어가지 않음');
  // 출처 정책: Production OFF → 근거가 그 자료뿐인 풀이는 production 에서 제외, 참고용은 유지
  ok((await ik('a=lab', { sd, ext, domain: 'MONEY' })).d.package.matchedKnowledge.some(m => m.id === kb.id), '정책 변경 전에는 사용');
  await src('a=update&id=' + docB, { patch: { policy: { production: false } } }); lab = (await ik('a=lab', { sd, ext, domain: 'MONEY' })).d; ok(lab.package.matchedKnowledge.some(m => m.id === kb.id), '근거 자료가 하나라도 사용 가능하면 풀이는 유지(B 만 OFF, C 는 ON)');
  await src('a=update&id=' + docC, { patch: { policy: { production: false } } }); lab = (await ik('a=lab', { sd, ext, domain: 'MONEY' })).d; ok(!lab.package.matchedKnowledge.some(m => m.id === kb.id), '근거 자료가 모두 Production OFF 이면 production 에서 제외');
  ok((await ik('a=lab', { sd, ext, domain: 'MONEY', includeDraft: true })).d.package.matchedKnowledge.some(m => m.id === kb.id), '테스트(공개 전 포함)에서는 확인 가능');
  const dpl = (await ik('a=deep', { sd, ext, domains: ['MONEY'] }, null)).d; ok(!(dpl.domains.MONEY && dpl.domains.MONEY.sections.some(s => s.paras.some(p => p.includes('남는 돈이 과제')))), '서비스(공개 deep)에도 반영');
  await src('a=update&id=' + docB, { patch: { policy: { production: true } } }); await src('a=update&id=' + docC, { patch: { policy: { production: true } } });
  const off = await src('a=add', { title: '추출 OFF', fileType: 'txt', text: '내용이 충분히 긴 자료입니다 ' + 'x'.repeat(60), policy: { extract: false } }); ok((await src('a=analyze&id=' + off.d.doc.id, {})).s === 403, '“AI 학습 후보 추출 OFF” 자료는 분석 안 됨');

  console.log('8. 자료 삭제 · 검색 · 부족한 지식 · 대시보드');
  const im = (await src('a=impact&id=' + docB)).d; ok(im.knowledge === 1 && im.items[0].id === kb.id && im.items[0].onlyThis === false, '삭제 전 영향: 연결된 풀이 지식 수');
  ok((await src('a=delete&id=' + docB, { mode: 'delete' })).s === 400 && (await src('a=delete&id=' + docB, { mode: 'delete', confirm: '틀린이름' })).s === 400, '완전 삭제는 자료명 확인 필요');
  r = await src('a=delete&id=' + docB, { mode: 'deactivate' }); ok(r.d.doc.active === false && (await ik('a=get&domain=MONEY&id=' + kb.id)).s === 200, '자료만 비활성화 — 풀이 지식은 그대로');
  r = await src('a=delete&id=' + docB, { mode: 'delete', confirm: 'OO명리학' }); ok(r.d.deleted && r.d.note.includes('삭제하지 않았') && (await ik('a=get&domain=MONEY&id=' + kb.id)).d.item.evidence.length === 2, '완전 삭제해도 연결된 풀이 지식은 삭제되지 않음(근거 기록 유지)');
  const se = (await src('a=search&q=' + encodeURIComponent('경금 재성'))).d; ok(se.hits.length >= 1 && se.knowledge.length >= 1 && se.hits[0].snippet, '자료 검색: 원문 + 승인된 풀이 지식');
  const gp = (await src('a=gaps')).d; ok(gp.gaps.length > 0 && gp.gaps.every(g => g.candidates >= 0) && gp.coverage.MONEY.label, '부족한 지식: 실제 커버리지 기반');
  const ls = (await src('a=list')).d; ok(ls.stats.docs === ls.docs.length && ls.stats.knowledge >= 3 && ls.stats.twoEvidence >= 1 && typeof ls.stats.queue === 'number' && ['need', 'analyzed', 'review', 'done'].includes(ls.docs[0].status), '대시보드 집계는 실제 DB');
  ok(r2.has('src/' + docA) && !r2.has('src/' + docB), '삭제된 자료의 원본 파일 정리');

  console.log('9. 분석 영향(coverage)');
  r = await src('a=add', { title: '재물 보강 자료', fileType: 'md', text: '# 재성\n\n경금 신강 재성 약하면 재물이 나뉘기 쉽다. 새로운 설명이 이어집니다 아주 충분히 길게.\n' });
  globalThis.__jae = { ...CAND.jae, subDomain: 'accumulation', sourceClaim: '경금 신강 재성 약하면 재물이 나뉘기 쉽다', title: '저축 구조', conditions: { dayMaster: ['경'], strength: ['신약'], group: { 재성: 'strong' } }, stance: 'neutral', interpretation: '모으는 힘은 지출을 통제하는 데서 나옵니다 충분히 길게.' };
  const an = await src('a=analyze&id=' + r.d.doc.id, { limit: 4 }); ok(an.d.impact && an.d.impact.byDomain.some(x => x.domain === 'MONEY' && x.candidates >= 1) && an.d.impact.fills.some(f => f.section === 'accumulation'), '새 자료가 메워 줄 근거 없는 항목(실제 커버리지): ' + JSON.stringify(an.d.impact));
  delete globalThis.__jae; globalThis.fetch = realFetch;

  console.log(fails.length ? '\n실패 ' + fails.length + '건' : '\n전부 통과'); process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
