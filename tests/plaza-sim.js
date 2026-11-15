// 운명의 광장 MVP 검증(통합 플랫폼 3단계):  node tests/plaza-sim.js
// 가짜 Supabase(메모리 표 + PostgREST 거르기 문법 일부 + 숫자 트리거 흉내)·가짜 KV 로 실제 functions 코드를 돌린다. 네트워크 없음.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const B = 'https://mantramanse.pages.dev';
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const U = id => id.repeat(8) + '-' + id.repeat(4) + '-4' + id.repeat(3) + '-8' + id.repeat(3) + '-' + id.repeat(12);
const USERS = { 'tok-a': { id: U('a'), email: 'a@example.com' }, 'tok-b': { id: U('b'), email: 'b@example.com' }, 'tok-c': { id: U('c'), email: 'c@example.com' }, 'tok-n': { id: U('d'), email: 'n@example.com' }, 'tok-x': { id: U('e'), email: 'x@example.com' } };
for (let i = 0; i < 6; i++) USERS['tok-r' + i] = { id: U(String(i)), email: 'r' + i + '@example.com' };
const consent = id => ['terms', 'privacy'].map(kind => ({ user_id: id, kind, agreed: true, version: '2026-11-10', granted_at: '2026-11-16T00:00:00Z' }));
const T = {
  member_consents: Object.values(USERS).filter(u => u.email !== 'x@example.com').flatMap(u => consent(u.id)),
  member_profiles: [{ user_id: U('a'), nickname: '달빛', ilju: '갑자', ilgan: '갑', show_ilju: true, show_ilgan: false }, { user_id: U('b'), nickname: '별빛', ilju: '을축', ilgan: '을', show_ilju: false, show_ilgan: true }, { user_id: U('c'), nickname: '꽃길' }, ...[0, 1, 2, 3, 4, 5].map(i => ({ user_id: U(String(i)), nickname: '신고자' + i }))],
  cm_posts: [], cm_comments: [], cm_reactions: [], cm_reports: [], cm_blocks: [], cm_sanctions: [], admin_audit_log: [], community_access: [], commerce_orders: [], launch_alerts: [],
};
let seq = 100;
const splitTop = s => { const out = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { out.push(cur); cur = ''; } else cur += ch; } if (cur) out.push(cur); return out; };
function cond(row, expr) {
  if (/^or\(/.test(expr)) return splitTop(expr.slice(3, -1)).some(e => cond(row, e));
  if (/^and\(/.test(expr)) return splitTop(expr.slice(4, -1)).every(e => cond(row, e));
  const m = expr.match(/^(\w+)\.(not\.in|\w+)\.(.*)$/s); if (!m) throw Error('bad expr ' + expr);
  return test(row, m[1], m[2], m[3]);
}
function test(row, col, op, v) {
  const val = row[col];
  switch (op) {
    case 'eq': return String(val) === v; case 'neq': return String(val) !== v; case 'lt': return +val < +v; case 'gte': return String(val) >= v;
    case 'is': return v === 'null' ? val == null : v === 'true' ? val === true : val === false;
    case 'in': return v.replace(/^\(|\)$/g, '').split(',').includes(String(val));
    case 'not.in': return !v.replace(/^\(|\)$/g, '').split(',').includes(String(val));
    case 'ilike': { const p = v.replace(/^\*|\*$/g, '').toLowerCase(); return String(val || '').toLowerCase().includes(p); }
    case 'like': return String(val || '').startsWith(v.replace(/\*$/, ''));
    case 'cs': { const want = v.replace(/^\{|\}$/g, '').split(',').filter(Boolean); return want.every(w => (val || []).includes(w)); }
  }
  throw Error('op ' + op);
}
function filterRows(tbl, qs) {
  return tbl.filter(r => qs.every(([k, v]) => {
    if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) return true;
    if (k === 'or') return cond(r, 'or' + v); if (k === 'and') return cond(r, 'and' + v);
    const m = v.match(/^(not\.in|\w+)\.(.*)$/s); return test(r, k, m[1], m[2]);
  }));
}
const TRIG = {
  cm_reactions: { ins: r => { if (r.kind === 'like') T.cm_posts.find(p => p.id === r.post_id).like_count++; }, del: r => { if (r.kind === 'like') { const p = T.cm_posts.find(p => p.id === r.post_id); p.like_count = Math.max(0, p.like_count - 1); } } },
  cm_comments: { ins: r => { if (r.status === 'visible') T.cm_posts.find(p => p.id === r.post_id).comment_count++; }, upd: (o, r) => { const p = T.cm_posts.find(p => p.id === r.post_id); if (o.status === 'visible' && r.status !== 'visible') p.comment_count--; if (o.status !== 'visible' && r.status === 'visible') p.comment_count++; } },
  cm_reports: { ins: r => { const t = (r.target_type === 'post' ? T.cm_posts : T.cm_comments).find(x => x.id === r.target_id); if (t) t.report_count++; } },
};
const DEF = { cm_posts: { status: 'visible', like_count: 0, comment_count: 0, report_count: 0, hashtags: [], edited_at: null, group_kind: null, group_key: null }, cm_comments: { status: 'visible', report_count: 0, parent_id: null }, cm_reports: { status: 'open' }, cm_sanctions: { lifted_at: null, until: null } };
global.fetch = async (u, o = {}) => {
  u = String(u); const m = o.method || 'GET', body = o.body ? JSON.parse(o.body) : null, res = (d, s = 200, h) => new Response(d == null ? null : JSON.stringify(d), { status: s, headers: h });
  if (u.endsWith('/auth/v1/user')) { const t = (o.headers.authorization || '').slice(7), x = USERS[t]; return x ? res(x) : res({}, 401); }
  if (u.startsWith('https://api.resend.com/')) return res({ id: 'm' });
  if (u.includes('/auth/v1/admin/users/') && m === 'DELETE') return res({});
  const mm = u.match(/\/rest\/v1\/(\w+)(?:\?(.*))?$/); if (!mm) throw Error('unexpected fetch ' + u);
  const name = mm[1], tbl = T[name]; if (!tbl) return res({ message: 'no table ' + name }, 404);
  const qs = [...new URLSearchParams(mm[2] || '')];
  const sel = (qs.find(q => q[0] === 'select') || [])[1], pick = r => (!sel || sel === '*') ? { ...r } : Object.fromEntries(sel.split(',').map(k => [k, r[k]]));
  if (m === 'HEAD') { const c = filterRows(tbl, qs).length; return new Response(null, { status: 200, headers: { 'content-range': '0-0/' + c } }); }
  if (m === 'GET') {
    let rows = filterRows(tbl, qs);
    const ord = (qs.find(q => q[0] === 'order') || [])[1];
    if (ord) { const keys = ord.split(',').map(x => x.split('.')); rows = rows.slice().sort((a, b) => { for (const [k, d] of keys) { const x = a[k], y = b[k]; if (x === y) continue; return (x < y ? -1 : 1) * (d === 'desc' ? -1 : 1); } return 0; }); }
    const off = +((qs.find(q => q[0] === 'offset') || [])[1] || 0), lim = (qs.find(q => q[0] === 'limit') || [])[1];
    rows = rows.slice(off, lim ? off + +lim : undefined);
    return res(rows.map(pick));
  }
  if (m === 'POST') {
    const list = Array.isArray(body) ? body : [body], oc = (qs.find(q => q[0] === 'on_conflict') || [])[1], made = [];
    for (const b of list) {
      if (name === 'member_profiles' && b.nickname && tbl.some(r => r.nickname === b.nickname && r.user_id !== b.user_id)) return res({ code: '23505' }, 409);
      const keys = oc ? oc.split(',') : null, i = keys ? tbl.findIndex(r => keys.every(k => String(r[k]) === String(b[k]))) : -1;
      if (i >= 0) { if (/ignore-duplicates/.test(o.headers.prefer || '')) continue; Object.assign(tbl[i], b); made.push(tbl[i]); continue; }
      if (name === 'cm_reports' && tbl.some(r => r.reporter_id === b.reporter_id && r.target_type === b.target_type && r.target_id === b.target_id)) return res({ code: '23505' }, 409);
      const row = { ...(DEF[name] || {}), id: seq++, created_at: new Date(Date.now() + seq).toISOString(), ...b }; tbl.push(row); made.push(row);
      if (TRIG[name] && TRIG[name].ins) TRIG[name].ins(row);
    }
    return /return=representation/.test(o.headers.prefer || '') ? res(made.map(pick), 201) : res(null, 201);
  }
  if (m === 'PATCH') { filterRows(tbl, qs).forEach(r => { const old = { ...r }; Object.assign(r, body); if (TRIG[name] && TRIG[name].upd) TRIG[name].upd(old, r); }); return res(null, 204); }
  if (m === 'DELETE') { const del = filterRows(tbl, qs); del.forEach(r => { tbl.splice(tbl.indexOf(r), 1); if (TRIG[name] && TRIG[name].del) TRIG[name].del(r); }); return res(null, 204); }
};
const kvMem = new Map();
const ENV = { ADMIN_PASSWORD: 'adm-pw', SUPABASE_URL: 'https://sb.local', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon',
  GLOSSARY_KV: { get: async (k, t) => { const v = kvMem.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kvMem.set(k, String(v)); }, delete: async k => kvMem.delete(k), list: async () => ({ keys: [], list_complete: true }) } };

(async () => {
  const M = {}; for (const f of ['posts', 'post', 'comments', 'react', 'report', 'block', 'me', 'mod']) M[f] = await imp('functions/api/community/' + f + '.js');
  const mw = await imp('functions/_middleware.js'), P = await imp('functions/_plaza.js'), acc = await imp('functions/_account.js');
  const call = async (mod, method, tok, q = '', body, hdr = {}) => {
    const fn = M[mod]['onRequest' + method[0] + method.slice(1).toLowerCase()];
    const r = await fn({ request: new Request(B + '/api/community/' + mod + q, { method, headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}), ...hdr }, body: body ? JSON.stringify(body) : undefined }), env: ENV });
    return { s: r.status, d: await r.json() };
  };
  const admin = { authorization: 'Bearer adm-pw', 'x-reviewer': encodeURIComponent('운영자김') };
  let x;

  // 0) 잠금: 개발 중에는 광장 API 전부 막힘(관리자 Bearer 만 통과)
  kvMem.set('community:stage', JSON.stringify({ stage: 'dev' }));
  for (const p of ['posts', 'post?id=1', 'comments?post=1', 'react', 'report', 'block', 'me', 'mod']) { const r = await mw.onRequest({ request: new Request(B + '/api/community/' + p), env: ENV, next: () => new Response('own') }); ok(r.status === 403, '개발 중 잠김: ' + p); }

  // 1) 일주 계산·내용 검사(순수 함수)
  ok(P.iljuOfBirth({ year: 2000, month: 1, day: 1 }).ilju === '무오', '2000-01-01 = 무오 일주');
  ok(P.iljuOfBirth({ year: 1899, month: 1, day: 1 }) === null && P.iljuOfBirth({ year: 2000, month: 13, day: 1 }) === null && P.iljuOfBirth(null) === null, '잘못된 생년월일은 계산하지 않음');
  ok(P.ILJU.length === 60 && new Set(P.ILJU).size === 60 && P.ILGAN.length === 10, '일주 60·일간 10');
  for (const [s, why] of [['연락 010-1234-5678', '전화'], ['메일 me@test.com', '이메일'], ['https://x.com 들어오세요', '링크'], ['오픈채팅 open.kakao.com/o/abc', '오픈채팅'], ['900101-1234567', '주민번호']]) ok(P.badText(s), '내용 거절: ' + why);
  ok(P.badText('오늘 대운이 바뀌는 느낌이에요 #대운') === null, '평범한 글 통과');
  ok(JSON.stringify(P.cleanTags(['#이직', 'bad tag!', '대운'], '본문 #재물 #이직')) === JSON.stringify(['이직', '대운', '재물']), '해시태그 정리(중복·잘못된 것 제거)');

  // 2) 글쓰기 조건
  x = await call('posts', 'POST', null, '', { title: '안녕', body: '내용', category: 'daily' }); ok(x.s === 401, '비로그인 글쓰기 401');
  x = await call('posts', 'POST', 'tok-x', '', { title: '안녕', body: '내용', category: 'daily' }); ok(x.s === 409 && x.d.need === 'consent', '필수 동의 전 글쓰기 409');
  x = await call('posts', 'POST', 'tok-n', '', { title: '안녕', body: '내용', category: 'daily' }); ok(x.s === 409 && x.d.need === 'profile', '닉네임 없으면 409');
  x = await call('posts', 'POST', 'tok-a', '', { title: '안녕', body: '내용', category: 'gossip' }); ok(x.s === 400, '없는 게시판 거절');
  x = await call('posts', 'POST', 'tok-a', '', { title: '전화', body: '010-1111-2222 로 연락', category: 'daily' }); ok(x.s === 400 && /전화번호/.test(x.d.error), '전화번호 글 거절');
  x = await call('posts', 'POST', 'tok-c', '', { title: '모임글', body: '모임에 올려요', category: 'daily', group: 'ilju' }); ok(x.s === 400 && x.d.need === 'ilju', '일주 확인 전 모임 글 거절');
  x = await call('posts', 'POST', 'tok-a', '', { title: '이직 고민', body: '갑자 일주인데 올해 이직 고민입니다 #이직', category: 'work', group: 'ilju' });
  ok(x.s === 200 && x.d.id, '모임 글 쓰기');
  const p1 = x.d.id, row1 = T.cm_posts.find(p => p.id === p1);
  ok(row1.group_kind === 'ilju' && row1.group_key === '갑자' && row1.hashtags.includes('이직') && row1.author_id === U('a'), '모임 = 내 일주(서버가 정함)·해시태그 저장');
  x = await call('posts', 'POST', 'tok-b', '', { title: '연애운', body: '요즘 인연이 보일까요', category: 'love' }); const p2 = x.d.id;
  x = await call('posts', 'POST', 'tok-c', '', { title: '재물 이야기', body: '돈 버는 방식이 바뀌는 시기', category: 'wealth' }); const p3 = x.d.id;

  // 3) 피드·검색·거르기
  x = await call('posts', 'GET', 'tok-a'); ok(x.s === 200 && x.d.items.length === 3 && x.d.items[0].id === p3, '최신 피드(최근 글 먼저)');
  const it1 = x.d.items.find(i => i.id === p1);
  ok(it1.author.name === '달빛' && it1.author.ilju === '갑자' && it1.author.ilgan === null && it1.author.mine, '작성자 표시: 공개 켠 일주만');
  ok(!JSON.stringify(x.d).includes(U('a')) && !JSON.stringify(x.d).includes('a@example.com'), '피드에 회원 id·이메일 없음');
  ok(x.d.items.find(i => i.id === p2).author.ilgan === '을목', '일간 공개 → 을목');
  x = await call('posts', 'GET', 'tok-a', '?cat=love'); ok(x.d.items.length === 1 && x.d.items[0].id === p2, '게시판 거르기');
  x = await call('posts', 'GET', 'tok-a', '?group=' + encodeURIComponent('ilju:갑자')); ok(x.d.items.length === 1 && x.d.items[0].id === p1, '일주 모임 거르기');
  x = await call('posts', 'GET', 'tok-a', '?group=' + encodeURIComponent('ilju:가나')); ok(x.d.items.length === 3, '없는 일주 이름은 무시');
  x = await call('posts', 'GET', 'tok-a', '?q=' + encodeURIComponent('인연')); ok(x.d.items.length === 1 && x.d.items[0].id === p2, '검색(본문)');
  x = await call('posts', 'GET', 'tok-a', '?q=' + encodeURIComponent('재물,title.eq.x')); ok(x.s === 200, '검색어의 문법 문자 제거(주입 방지)');
  x = await call('posts', 'GET', 'tok-a', '?tag=' + encodeURIComponent('이직')); ok(x.d.items.length === 1 && x.d.items[0].id === p1, '해시태그 거르기');
  x = await call('posts', 'GET', 'tok-a', '?mine=1'); ok(x.d.items.length === 1, '내가 쓴 글');
  x = await call('posts', 'GET', null, '?mine=1'); ok(x.s === 401, '비로그인 내 글 401');
  x = await call('posts', 'GET', null); ok(x.s === 200 && x.d.items.length === 3 && x.d.items.every(i => !i.liked), '관리자 쿠키만(회원 아님)으로도 읽기');

  // 4) 글 하나·고치기·지우기
  x = await call('post', 'GET', 'tok-b', '?id=' + p1); ok(x.s === 200 && x.d.post.body.includes('이직') && !x.d.post.author.mine, '글 읽기');
  x = await call('post', 'PATCH', 'tok-b', '', { id: p1, title: '남의 글', body: '바꿈', category: 'work' }); ok(x.s === 403, '남의 글 고치기 403');
  x = await call('post', 'PATCH', 'tok-a', '', { id: p1, title: '이직 고민(수정)', body: '내용을 고쳤어요', category: 'work' }); ok(x.s === 200 && row1.edited_at && row1.group_key === '갑자', '내 글 고치기(모임은 유지)');
  x = await call('post', 'DELETE', 'tok-b', '?id=' + p1); ok(x.s === 403, '남의 글 지우기 403');

  // 5) 좋아요·북마크
  x = await call('react', 'POST', 'tok-a', '', { post: p1, kind: 'like', on: true }); ok(x.s === 400, '내 글 좋아요 불가');
  x = await call('react', 'POST', 'tok-b', '', { post: p1, kind: 'like', on: true }); ok(x.s === 200 && x.d.likes === 1, '좋아요');
  x = await call('react', 'POST', 'tok-b', '', { post: p1, kind: 'like', on: true }); ok(x.d.likes === 1, '좋아요 두 번 눌러도 1');
  x = await call('react', 'POST', 'tok-c', '', { post: p1, kind: 'like', on: true }); ok(x.d.likes === 2, '다른 회원 좋아요 → 2');
  x = await call('react', 'POST', 'tok-c', '', { post: p1, kind: 'like', on: false }); ok(x.d.likes === 1, '좋아요 취소 → 1');
  x = await call('react', 'POST', 'tok-b', '', { post: p1, kind: 'bookmark', on: true }); ok(x.s === 200, '북마크');
  x = await call('posts', 'GET', 'tok-b', '?saved=1'); ok(x.d.items.length === 1 && x.d.items[0].saved && x.d.items[0].liked, '북마크 목록·내 반응 표시');
  x = await call('posts', 'GET', 'tok-a', '?tab=popular'); ok(x.d.items[0].id === p1, '인기 = 좋아요 많은 순');

  // 6) 댓글·답글
  x = await call('comments', 'POST', 'tok-b', '', { post: p1, body: '저도 같은 고민이에요' }); const c1 = x.d.id; ok(x.s === 200, '댓글');
  x = await call('comments', 'POST', 'tok-c', '', { post: p1, parent: c1, body: '응원합니다' }); const c2 = x.d.id;
  x = await call('comments', 'POST', 'tok-a', '', { post: p1, parent: c2, body: '감사해요' }); const c3 = x.d.id;
  ok(T.cm_comments.find(c => c.id === c3).parent_id === c1, '답글의 답글은 같은 댓글 아래(한 단계)');
  ok(row1.comment_count === 3, '댓글 수 3');
  x = await call('comments', 'POST', 'tok-b', '', { post: p1, body: 'www.spam.com' }); ok(x.s === 400, '댓글 링크 거절');
  x = await call('comments', 'DELETE', 'tok-c', '?id=' + c1); ok(x.s === 403, '남의 댓글 지우기 403');
  x = await call('comments', 'DELETE', 'tok-b', '?id=' + c1); ok(x.s === 200 && row1.comment_count === 2, '내 댓글 지우기 → 수 2');
  x = await call('comments', 'GET', 'tok-a', '?post=' + p1);
  ok(x.d.items.length === 3 && x.d.items[0].deleted && x.d.items[0].body === '삭제된 댓글입니다' && x.d.items[0].author.name === '', '답글 있는 지운 댓글은 자리만');

  // 7) 차단
  x = await call('block', 'POST', 'tok-a', '', { comment: c2 }); ok(x.s === 200 && T.cm_blocks.length === 1 && T.cm_blocks[0].blocked_id === U('c'), '댓글로 차단(회원 id 안 받음)');
  x = await call('block', 'POST', 'tok-a', '', { post: p1 }); ok(x.s === 400, '나 자신 차단 불가');
  x = await call('posts', 'GET', 'tok-a'); ok(!x.d.items.some(i => i.id === p3), '차단한 회원의 글은 피드에서 빠짐');
  x = await call('post', 'GET', 'tok-a', '?id=' + p3); ok(x.s === 404 && x.d.blocked, '차단한 회원의 글 열기 404');
  x = await call('comments', 'GET', 'tok-a', '?post=' + p1); ok(!x.d.items.some(c => c.id === c2) && x.d.items.length === 2, '차단한 회원의 답글은 보이지 않음');
  x = await call('comments', 'POST', 'tok-c', '', { post: p1, body: '또 댓글' }); ok(x.s === 403, '나를 차단한 글쓴이의 글에는 댓글 불가');
  x = await call('block', 'GET', 'tok-a'); ok(x.d.items.length === 1 && x.d.items[0].name === '꽃길' && !JSON.stringify(x.d).includes(U('c')), '차단 목록(회원 id 대신 handle)');
  x = await call('block', 'DELETE', 'tok-a', '?handle=' + x.d.items[0].handle); ok(T.cm_blocks.length === 0, '차단 풀기');

  // 8) 신고·자동 숨김
  x = await call('report', 'POST', 'tok-a', '', { type: 'post', id: p1, reason: 'spam' }); ok(x.s === 400, '내 글 신고 불가');
  x = await call('report', 'POST', 'tok-b', '', { type: 'post', id: p3, reason: 'nope' }); ok(x.s === 400, '없는 사유 거절');
  x = await call('report', 'POST', 'tok-b', '', { type: 'post', id: p3, reason: 'spam', detail: '도배' }); ok(x.s === 200, '신고');
  x = await call('report', 'POST', 'tok-b', '', { type: 'post', id: p3, reason: 'spam' }); ok(x.s === 200 && T.cm_reports.length === 1, '같은 사람 같은 글 신고는 한 건');
  for (let i = 0; i < 3; i++) await call('report', 'POST', 'tok-r' + i, '', { type: 'post', id: p3, reason: 'abuse' });
  ok(T.cm_posts.find(p => p.id === p3).status === 'visible', '신고 4명까지는 그대로');
  await call('report', 'POST', 'tok-r3', '', { type: 'post', id: p3, reason: 'abuse' });
  ok(T.cm_posts.find(p => p.id === p3).status === 'hidden' && T.cm_posts.find(p => p.id === p3).report_count === 5, '서로 다른 5명 신고 → 자동 숨김');
  x = await call('posts', 'GET', 'tok-a'); ok(!x.d.items.some(i => i.id === p3), '숨긴 글은 피드에 없음');
  x = await call('post', 'GET', 'tok-a', '?id=' + p3); ok(x.s === 404, '숨긴 글 열기 404');

  // 9) 관리자 운영: 신고 묶음·되살리기·제재·해제·감사 로그
  x = await call('mod', 'GET', 'tok-a'); ok(x.s === 401, '운영 API: 관리자만');
  x = await call('mod', 'GET', null, '?view=reports', null, admin);
  const g3 = x.d.items.find(g => g.type === 'post' && g.id === p3);
  ok(g3 && g3.count === 5 && g3.status === 'hidden' && g3.who === '꽃길' && g3.reasons['욕설·비방'] === 4, '신고를 대상별로 묶어 보기');
  x = await call('mod', 'POST', null, '', { action: 'restore', type: 'post', id: p3 }, admin);
  ok(x.s === 200 && T.cm_posts.find(p => p.id === p3).status === 'visible' && T.cm_reports.every(r => r.status === 'dismissed' && r.handled_by === '운영자김'), '되살리기 → 신고 기각 처리·작업자 기록');
  x = await call('mod', 'POST', null, '', { action: 'sanction', type: 'post', id: p3, kind: 'mute', days: 7 }, admin); ok(x.s === 400, '제재 사유 필수');
  x = await call('mod', 'POST', null, '', { action: 'sanction', type: 'post', id: p3, kind: 'mute', days: 7, reason: '도배' }, admin); ok(x.s === 200 && x.d.until, '7일 쓰기 정지');
  x = await call('posts', 'POST', 'tok-c', '', { title: '다시', body: '다시 써요', category: 'daily' }); ok(x.s === 403 && x.d.need === 'sanction' && /까지/.test(x.d.error), '정지 중 글쓰기 403(기한 안내)');
  x = await call('react', 'POST', 'tok-c', '', { post: p1, kind: 'bookmark', on: true }); ok(x.s === 200, '정지 중에도 북마크(나만 보임)는 됨');
  x = await call('me', 'GET', 'tok-c'); ok(x.d.sanction && x.d.sanction.kind === 'mute', '나 화면에 제재 표시');
  x = await call('mod', 'GET', null, '?view=sanctions', null, admin); const sid = x.d.items[0].id; ok(x.d.items[0].who === '꽃길' && x.d.items[0].by === '운영자김', '제재 목록');
  await call('mod', 'POST', null, '', { action: 'lift', sanctionId: sid }, admin);
  x = await call('posts', 'POST', 'tok-c', '', { title: '다시', body: '다시 써요', category: 'daily' }); ok(x.s === 200, '해제 후 글쓰기');
  x = await call('mod', 'POST', null, '', { action: 'hide', type: 'comment', id: c2 }, admin); ok(T.cm_comments.find(c => c.id === c2).status === 'hidden' && row1.comment_count === 1, '댓글 숨김 → 댓글 수 감소');
  ok(['community.mod.restore', 'community.sanction.mute', 'community.sanction.lift', 'community.mod.hide'].every(a => T.admin_audit_log.some(l => l.action === a && l.actor === '운영자김')), '운영 처리 모두 감사 로그');

  // 10) 나·일주 확인(출생 입력 저장 안 함)·모임 인원
  x = await call('me', 'GET', null); ok(x.d.member === false, '비회원 나 = member:false');
  x = await call('me', 'POST', 'tok-c', '', { action: 'ilju', birth: { year: 2000, month: 1, day: 1, calendar: 'solar' } });
  const pc = T.member_profiles.find(p => p.user_id === U('c'));
  ok(x.s === 200 && x.d.ilju === '무오' && pc.ilju === '무오' && pc.ilgan === '무' && !('birth' in pc) && !('year' in pc), '일주 확인: 일주·일간만 저장');
  x = await call('me', 'POST', 'tok-x', '', { action: 'ilju', birth: { year: 2000, month: 1, day: 1 } }); ok(x.s === 409, '동의 전 일주 확인 불가');
  x = await call('me', 'GET', 'tok-a'); ok(x.d.groups.ilju.key === '갑자' && x.d.groups.ilju.size === 1 && x.d.groups.ilju.gathering && x.d.groups.ilgan.label === '갑목', '모임 인원·모이는 중(5명 미만)');

  // 11) 지우기·탈퇴
  x = await call('post', 'DELETE', 'tok-a', '?id=' + p1); ok(x.s === 200 && row1.status === 'deleted', '내 글 지우기');
  x = await call('comments', 'GET', 'tok-b', '?post=' + p1); ok(x.s === 404, '지운 글의 댓글은 열리지 않음');
  const bPosts = T.cm_posts.filter(p => p.author_id === U('b'));
  await acc.withdraw(ENV, U('b'), { unlinkKakao: false }).catch(() => null);
  ok(bPosts.every(p => p.status === 'deleted') && T.cm_comments.filter(c => c.author_id === U('b')).every(c => c.status === 'deleted'), '탈퇴하면 그 회원의 글·댓글은 지운 상태로');

  // 12) 파일 점검
  const sql = read('supabase/migrations/20261116_plaza_stage3.sql');
  const tbls = ['cm_posts', 'cm_comments', 'cm_reactions', 'cm_reports', 'cm_blocks', 'cm_sanctions'];
  ok(tbls.every(t => new RegExp('alter table public\\.' + t + '\\s+enable row level security').test(sql)), '새 표 6개 RLS 켬');
  ok(/revoke all on public\.cm_posts, public\.cm_comments, public\.cm_reactions, public\.cm_reports, public\.cm_blocks, public\.cm_sanctions from anon, authenticated/.test(sql) && !/grant [^;]* to (anon|authenticated)/i.test(sql), '브라우저 권한 회수·부여 없음');
  ok(!/alter table public\.(commerce_|member_|launch_alerts|community_access|consent_)/.test(sql), '기존 표 변경 없음');
  const cm = read('community/cm.js'), html = read('community/index.html'), css = read('community/cm.css');
  ok(/prefers-reduced-motion/.test(cm) && /IntersectionObserver/.test(cm) && /visibilitychange/.test(cm), '벚꽃잎: 움직임 줄이기·화면 밖·탭 숨김 때 멈춤');
  ok(/id="petals"/.test(cm) && /class="tabbar"/.test(html) && /cm\.js\?v=/.test(html) && /noindex/.test(html), '광장 화면 파일 연결·검색 제외');
  ok(/--rice:/.test(css) && /--blush:/.test(css) && /--jade:/.test(css) && /--sumi:/.test(css), '디자인 토큰(미색·연분홍·옥색·먹색)');
  ok(!/innerHTML\s*=\s*[^;]*\b(p|c|x)\.(body|title|name)\b(?![^;]*esc\()/.test(cm), '화면에 글 내용을 넣을 때 esc() 사용');
  ok(/생년월일은 서버에 남기지 않습니다/.test(cm) && /운세는 참고용/.test(cm), '안내 문구(출생정보 미저장·참고용)');

  if (fails.length) { console.error('plaza-sim 실패 ' + fails.length + '/' + n + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('plaza-sim OK: ' + n + '항목(잠금·일주 계산·글쓰기 조건·피드/검색/모임·고치기/지우기·좋아요/북마크·댓글/답글·차단·신고/자동 숨김·운영/제재/감사 로그·탈퇴·파일)');
})().catch(e => { console.error(e); process.exit(1); });
