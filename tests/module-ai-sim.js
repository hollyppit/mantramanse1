// 해석 모듈 AI 작성(촌철살인 + 풀이 지식 DB 참고) 검증(모의 KV·fetch):  node tests/module-ai-sim.js
// 관리자 인증 → 카테고리·조건에 맞는 IK 항목만 프롬프트에 들어감 → 조건 어긋난 항목·미검수 AI 초안·보관 항목은 제외 → 결과 JSON 파싱 → DB 비어 있어도 동작
const path = require('path'), fails = [], ok = (c, m) => { if (!c) fails.push(m); };
(async () => {
  const A = await import(require('url').pathToFileURL(path.join(__dirname, '../functions/api/ai.js')).href);
  const kv = new Map(), sent = [], calls = [];
  const item = (id, o) => Object.assign({ id, title: id + ' 제목', domain: 'MONEY', subDomain: 'earningStyle', status: 'published', reviewed: true, priority: 50, stance: 'neutral', conditions: {}, principle: id + ' 원리', interpretation: id + ' 풀이 본문', strengths: [], risks: [], behaviorPatterns: [], actions: [], tags: [], sourceType: 'expert' }, o);
  kv.set('ik:d:MONEY', JSON.stringify([
    item('MONEY-0001', { conditions: { dayMaster: ['경'], strength: ['신약'] }, risks: ['돈이 들어오자마자 새는 구조'] }),
    item('MONEY-0002', { conditions: { dayMaster: ['갑'] } }), // 일간 불일치 → 제외
    item('MONEY-0003', { status: 'archived' }), // 보관 → 제외
    item('MONEY-0004', { sourceType: 'AI_DRAFT', reviewed: false, status: 'draft' }), // 미검수 AI 초안 → 제외
    item('MONEY-0005', { conditions: {} }), // 조건 없는 일반 항목 → 포함 가능
  ]));
  const env = { ADMIN_PASSWORD: 'x', OPENAI_API_KEY: 'k', ANTHROPIC_API_KEY: 'a', GLOSSARY_KV: { get: async k => (kv.has(k) ? JSON.parse(kv.get(k)) : null), put: async (k, v) => { kv.set(k, v); } } };
  globalThis.fetch = async (u, o) => {
    const body = JSON.parse(o.body); sent.push(body); calls.push(String(u));
    if (/anthropic/.test(String(u))) { const user = String(body.messages[0].content); const bad = /반드시/.test(user); return new Response(JSON.stringify({ model: 'c', content: [{ type: 'text', text: JSON.stringify(bad ? { verdict: 'pass', issues: [], revised: null } : { verdict: 'revise', issues: [{ type: 'barnum', quote: '균형', why: '빈말', fix: '구체적 장면으로' }], revised: { headline: '고친 한 줄', summary: '고친 요약', detail: '고친 상세' } }) }] }), { status: 200, headers: { 'content-type': 'application/json' } }); }
    if (!/촌철살인/.test(String(body.instructions))) return new Response(JSON.stringify({ model: 'm', output_text: '{"lines":["다듬은 한 줄"]}' }), { status: 200, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify({ model: 'm', output_text: '```json\n{"headline":"돈은 들어오는 날 이미 반쯤 나가 있다","summary":"요약 문장입니다.","detail":"상세 문장입니다."}\n```' }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const post = async (b, auth = 'Bearer x') => { const r = await A.onRequestPost({ request: new Request('http://x/api/ai', { method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(b) }), env }); return { s: r.status, d: await r.json() }; };

  let r = await post({ task: 'module', category: 'wealth', conds: { dayMasterStem: ['경'], strength: ['신약'] }, conditions: '재물 / 일간 경 · 신약', headline: '재물운이 좋습니다', summary: '균형 잡힌 재물운', mode: 'rewrite' }, 'Bearer no');
  ok(r.s === 401, '관리자 인증이 없으면 401');

  r = await post({ task: 'module', category: 'wealth', conds: { dayMasterStem: ['경'], strength: ['신약'] }, conditions: '재물 / 일간 경 · 신약', headline: '재물운이 좋습니다', summary: '균형 잡힌 재물운', mode: 'rewrite', tone: '더 독하게' });
  const prompt = String(sent.at(-1).input || ''), sys = String(sent.at(-1).instructions || '');
  ok(r.s === 200 && r.d.module && r.d.module.headline.startsWith('돈은') && r.d.module.summary && r.d.module.detail, '결과 JSON(코드블록 포함)에서 headline·summary·detail 을 꺼낸다');
  ok(/촌철살인/.test(sys) && /참고 DB 자료/.test(sys), '시스템 프롬프트에 촌철살인과 DB 우선 규칙이 있다');
  ok(prompt.includes('MONEY-0001') && prompt.includes('돈이 들어오자마자 새는 구조'), '조건이 맞는 DB 항목(위험·약점 포함)이 프롬프트에 들어간다');
  ok(!prompt.includes('MONEY-0002') && !prompt.includes('MONEY-0003') && !prompt.includes('MONEY-0004'), '조건이 어긋난 항목·보관·미검수 AI 초안은 근거에서 빠진다');
  ok(/더 독하게/.test(prompt) && /재물운이 좋습니다/.test(prompt), '방향과 현재 글이 프롬프트에 들어간다');
  ok(Array.isArray(r.d.refs) && r.d.refs[0] && r.d.refs[0].id === 'MONEY-0001' && !r.d.refs.some(x => x.id === 'MONEY-0002'), '응답에 참고한 DB 항목 목록(refs)이 온다');

  // 자체 검증: 다른 AI(Claude)가 먼저 점검, 규칙 검사가 AI 통과를 뒤집는다
  calls.length = 0;
  r = await post({ task: 'verify', category: 'wealth', conds: { dayMasterStem: ['경'], strength: ['신약'] }, conditions: '재물 / 일간 경 · 신약', headline: '균형 잡힌 재물운', summary: '요약', detail: '상세' });
  ok(r.s === 200 && r.d.verdict === 'revise' && r.d.issues.some(x => x.type === 'barnum') && r.d.revised && r.d.revised.headline === '고친 한 줄', '검증: 빈말을 지적하고 고친 문장을 제안한다');
  ok(/anthropic/.test(calls[0]) && String(sent.at(-1).messages[0].content).includes('MONEY-0001'), '검증은 작성과 다른 모델(Claude)을 먼저 쓰고 DB 근거를 함께 준다');
  r = await post({ task: 'verify', category: 'wealth', conds: {}, headline: '이 사람은 반드시 부자가 됩니다', summary: '{없는변수} 요약', detail: '상세' });
  ok(r.s === 200 && r.d.verdict === 'fail' && r.d.issues.some(x => x.type === 'overclaim') && r.d.issues.some(x => x.type === 'grounding' && /없는변수/.test(x.quote)) && r.d.revised === null, '규칙 검사: AI 가 통과시켜도 확정 표현·미지원 {…} 자리는 fail');
  r = await post({ task: 'verify', category: 'wealth', conds: {}, headline: '', summary: '', detail: '' });
  ok(r.s === 400, '빈 풀이는 검증하지 않는다');

  // 일괄 규칙 검사: AI 호출·한도 없이 동작한다
  const nBefore = sent.length;
  r = await post({ task: 'verify-rules', items: [
    { id: 'a', headline: '돈은 들어오는 날 이미 반쯤 나가 있다', summary: '월급날 통장을 보면 이미 카드값이 줄을 서 있고, 남는 돈은 늘 이번 달이 아니라 다음 달 몫입니다.', detail: '상세' },
    { id: 'b', headline: '이 사람은 반드시 부자가 됩니다', summary: '요약이 충분히 길게 이어지는 문장입니다 여기는.', detail: '' },
    { id: 'c', headline: '다양한 가능성과 균형이 중요한 사람', summary: '노력하면 잠재력이 발휘됩니다 그리고 그렇습니다.', detail: '' },
    { id: 'd', headline: '', summary: '', detail: '' },
  ] });
  const by = Object.fromEntries((r.d.results || []).map(x => [x.id, x]));
  ok(r.s === 200 && by.a.verdict === 'pass' && by.b.verdict === 'fail' && by.c.verdict === 'revise' && by.c.issues.some(x => x.type === 'barnum') && by.d.verdict === 'revise', '일괄 규칙 검사: 통과/단정=수정 필요/빈말=고치면 좋음/빈 칸=고치면 좋음');
  ok(sent.length === nBefore, '일괄 규칙 검사는 AI 를 호출하지 않는다');
  ok((await post({ task: 'verify-rules', items: [] }, 'Bearer no')).s === 401, '일괄 규칙 검사도 관리자 인증이 필요하다');

  kv.clear();
  r = await post({ task: 'module', category: 'wealth', conds: {}, mode: 'new' });
  ok(r.s === 200 && r.d.refs.length === 0 && /참고할 DB 자료가 없습니다/.test(String(sent.at(-1).input)), 'DB 가 비어 있어도 동작하고, 근거가 없다고 프롬프트에 알린다');

  r = await post({ task: 'module', category: 'wealth', conds: {}, mode: 'new' });
  r = await post({ task: 'polish', lines: ['한 줄'] });
  ok(r.s === 200 && Array.isArray(r.d.lines), '기존 자막 작업(polish)은 그대로 동작한다');

  console.log(fails.length ? '실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '모듈 AI(촌철살인 · DB 참고) 검증 모두 통과');
  process.exit(fails.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
