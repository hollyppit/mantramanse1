// 인연 매칭·대화·성인 본인확인 검증(5단계):  node tests/match-sim.js
// 가짜 Supabase(메모리 표 + PostgREST 거르기 일부)·가짜 KV·가짜 포트원으로 실제 functions 코드를 돌린다. 네트워크 없음.
const path = require('path'), url = require('url'), fs = require('fs');
const fails = []; let n = 0; const ok = (c, m) => { n++; if (!c) fails.push(m); };
const imp = p => import(url.pathToFileURL(path.join(__dirname, '..', p)).href);
const read = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const B = 'https://mantramanse.pages.dev';
const U = c => c.repeat(8) + '-' + c.repeat(4) + '-4' + c.repeat(3) + '-8' + c.repeat(3) + '-' + c.repeat(12);
const USERS = { 'tok-a': { id: U('a'), email: 'a@example.com' }, 'tok-b': { id: U('b'), email: 'b@example.com' }, 'tok-c': { id: U('c'), email: 'c@example.com' }, 'tok-d': { id: U('d'), email: 'd@example.com' }, 'tok-e': { id: U('e'), email: 'e@example.com' }, 'tok-m': { id: U('f'), email: 'minor@example.com' } };
const consent = id => ['terms', 'privacy'].map(kind => ({ user_id: id, kind, agreed: true, version: '2026-11-10', granted_at: '2026-11-16T00:00:00Z' }));
const prof = (id, nickname, ilju) => ({ user_id: id, nickname, ilju, ilgan: ilju[0], show_ilju: false, show_ilgan: false, avatar_path: null, poster_gender: null });
const T = {
  member_consents: Object.values(USERS).flatMap(u => consent(u.id)),
  member_profiles: [prof(U('a'), '달빛', '갑자'), prof(U('b'), '별빛', '기축'), prof(U('c'), '꽃길', '병오'), prof(U('d'), '바람', '임신'), prof(U('e'), '노을', '경인'), prof(U('f'), '새싹', '을묘')],
  adult_verifications: [], cm_match_profiles: [], cm_daily_picks: [], cm_likes: [], cm_rooms: [], cm_messages: [], cm_blocks: [], cm_sanctions: [], cm_reports: [], admin_audit_log: [], cm_posts: [], cm_comments: [], launch_alerts: [], commerce_orders: [],
};
let seq = 1;
const splitTop = s => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(cur); cur = ''; } else cur += ch; } if (cur) o.push(cur); return o; };
function test(row, col, op, v) {
  const val = row[col];
  switch (op) {
    case 'eq': return String(val) === v; case 'neq': return String(val) !== v; case 'gt': return +val > +v; case 'lt': return +val < +v; case 'gte': return /^\d+$/.test(v) ? +val >= +v : String(val) >= v; case 'lte': return /^\d+$/.test(v) ? +val <= +v : String(val) <= v;
    case 'is': return v === 'null' ? val == null : v === 'true' ? val === true : val === false;
    case 'in': return v.replace(/^\(|\)$/g, '').split(',').includes(String(val));
  }
  throw Error('op ' + op);
}
const cond = (row, e) => { if (/^or\(/.test(e)) return splitTop(e.slice(3, -1)).some(x => cond(row, x)); const m = e.match(/^(\w+)\.(\w+)\.(.*)$/s); return test(row, m[1], m[2], m[3]); };
const filt = (tbl, qs) => tbl.filter(r => qs.every(([k, v]) => { if (['select', 'order', 'limit', 'offset', 'on_conflict'].includes(k)) return true; if (k === 'or') return cond(r, 'or' + v); const m = v.match(/^(\w+)\.(.*)$/s); return test(r, k, m[1], m[2]); }));
const pick = (sel, r) => { if (!sel || sel === '*') return { ...r }; const o = {}; sel.split(',').forEach(f => { const [a, c] = f.includes(':') ? f.split(':') : [f, f]; o[a] = r[c]; }); return o; };
let portone = {};
global.fetch = async (u, o = {}) => {
  u = String(u); const m = o.method || 'GET', body = o.body ? JSON.parse(o.body) : null, res = (d, s = 200) => new Response(d == null ? null : JSON.stringify(d), { status: s });
  if (u.endsWith('/auth/v1/user')) { const t = (o.headers.authorization || '').slice(7), x = USERS[t]; return x ? res(x) : res({}, 401); }
  if (u.includes('/auth/v1/admin/users/') && m === 'DELETE') { const id = u.split('/').pop(); for (const [tn, cols] of Object.entries({ cm_messages: ['sender_id'], cm_rooms: ['a_id', 'b_id'] })) T[tn].forEach(r => cols.forEach(c => { if (r[c] === id) r[c] = null; })); for (const tn of ['cm_match_profiles', 'adult_verifications', 'cm_likes', 'member_profiles']) T[tn] = T[tn].filter(r => r.user_id !== id && r.from_id !== id && r.to_id !== id); return res({}); }
  if (u.startsWith('https://api.portone.io/identity-verifications/')) { const id = decodeURIComponent(u.split('/').pop().split('?')[0]); return portone[id] ? res(portone[id]) : res({ type: 'NOT_FOUND' }, 404); }
  if (u.startsWith('https://api.resend.com/')) return res({ id: 'm' });
  if (u.includes('/rest/v1/rpc/community_user_by_email')) { const x = Object.values(USERS).find(z => z.email === body.p_email); return res(x ? x.id : null); }
  // 크레딧 함수 흉내(supabase/migrations/20261116_credits_stage6.sql 와 같은 규칙)
  const bal = uid => T.cm_credit_ledger.filter(r => r.user_id === uid).reduce((a, r) => a + r.delta, 0);
  if (u.includes('/rest/v1/rpc/cm_credit_balance')) return res(bal(body.p_user));
  if (u.includes('/rest/v1/rpc/cm_credit_spend')) { const b = body; if (!(b.p_amount > 0 && b.p_amount <= 1000)) return res({ ok: false, error: 'bad-amount' }); if (!['more_picks', 'extra_like', 'adjust'].includes(b.p_reason)) return res({ ok: false, error: 'bad-reason' }); if (T.cm_credit_ledger.some(r => r.idem_key === b.p_idem)) return res({ ok: true, dup: true, balance: bal(b.p_user) }); const cur = bal(b.p_user); if (cur < b.p_amount) return res({ ok: false, error: 'insufficient', balance: cur }); T.cm_credit_ledger.push({ id: seq++, user_id: b.p_user, delta: -b.p_amount, reason: b.p_reason, ref: b.p_ref, idem_key: b.p_idem, created_at: new Date().toISOString() }); return res({ ok: true, dup: false, balance: cur - b.p_amount }); }
  if (u.includes('/rest/v1/rpc/cm_credit_grant')) { const b = body; if (!T.cm_credit_ledger.some(r => r.idem_key === b.p_idem)) T.cm_credit_ledger.push({ id: seq++, user_id: b.p_user, delta: b.p_amount, reason: b.p_reason, ref: b.p_ref, idem_key: b.p_idem, by_actor: b.p_by, created_at: new Date().toISOString() }); return res({ ok: true, balance: bal(b.p_user) }); }
  const mm = u.match(/\/rest\/v1\/(\w+)(?:\?(.*))?$/); if (!mm) throw Error('unexpected fetch ' + u);
  const name = mm[1], tbl = T[name]; if (!tbl) return res({ message: 'no table ' + name }, 404);
  const qs = [...new URLSearchParams(mm[2] || '')], sel = (qs.find(q => q[0] === 'select') || [])[1];
  if (m === 'GET') { let rows = filt(tbl, qs); const ord = (qs.find(q => q[0] === 'order') || [])[1]; if (ord) { const [k, d] = ord.split(',')[0].split('.'); rows = rows.slice().sort((a, b) => (a[k] < b[k] ? -1 : a[k] > b[k] ? 1 : 0) * (d === 'desc' ? -1 : 1)); } const lim = (qs.find(q => q[0] === 'limit') || [])[1]; if (lim) rows = rows.slice(0, +lim); return res(rows.map(r => pick(sel, r))); }
  if (m === 'POST') {
    const list = Array.isArray(body) ? body : [body], oc = (qs.find(q => q[0] === 'on_conflict') || [])[1], made = [];
    for (const b of list) {
      if (name === 'adult_verifications' && b.ci_hash && tbl.some(r => r.ci_hash === b.ci_hash && r.user_id !== b.user_id)) return res({ code: '23505' }, 409);
      const keys = oc ? oc.split(',') : null, i = keys ? tbl.findIndex(r => keys.every(k => String(r[k]) === String(b[k]))) : -1;
      if (i >= 0) { if (!/ignore-duplicates/.test(o.headers.prefer || '')) Object.assign(tbl[i], b); made.push(tbl[i]); continue; }
      const row = { ...(name === 'cm_rooms' ? { status: 'open', a_read: 0, b_read: 0, last_id: 0 } : name === 'cm_reports' ? { status: 'open' } : name === 'cm_sanctions' ? { lifted_at: null, until: null } : {}), id: seq++, created_at: new Date(Date.now() + seq * 1000).toISOString(), ...b }; tbl.push(row); made.push(row);
    }
    return /return=representation/.test(o.headers.prefer || '') ? res(made.map(r => pick(sel, r)), 201) : res(null, 201);
  }
  if (m === 'PATCH') { filt(tbl, qs).forEach(r => Object.assign(r, body)); return res(null, 204); }
  if (m === 'DELETE') { filt(tbl, qs).forEach(r => tbl.splice(tbl.indexOf(r), 1)); return res(null, 204); }
};
const kv = new Map();
const ENV = { ADMIN_PASSWORD: 'adm-pw', COMMUNITY_SECRET: 'secret-0123456789', SUPABASE_URL: 'https://sb.local', SUPABASE_SERVICE_KEY: 'svc', SUPABASE_ANON_KEY: 'anon', PORTONE_STORE_ID: 'store-1', PORTONE_API_SECRET: 'ps',
  GLOSSARY_KV: { get: async (k, t) => { const v = kv.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { kv.set(k, String(v)); }, delete: async k => kv.delete(k), list: async () => ({ keys: [], list_complete: true }) } };

(async () => {
  const M = await imp('functions/_match.js'), verify = await imp('functions/api/community/verify.js'), match = await imp('functions/api/community/match.js'), chat = await imp('functions/api/community/chat.js'), mod = await imp('functions/api/community/mod.js'), mw = await imp('functions/_middleware.js'), acc = await imp('functions/_account.js');
  const call = async (modl, method, tok, q = '', body, hdr = {}) => { const r = await modl['onRequest' + method[0] + method.slice(1).toLowerCase()]({ request: new Request(B + '/api/community/x' + q, { method, headers: { 'content-type': 'application/json', ...(tok ? { 'x-member-token': tok } : {}), ...hdr }, body: body ? JSON.stringify(body) : undefined }), env: ENV }); return { s: r.status, d: await r.json() }; };
  const admin = { authorization: 'Bearer adm-pw', 'x-reviewer': encodeURIComponent('운영자') };
  const Y = M.thisYear(); let x;

  // 1) 규칙(순수 함수)
  ok(M.isAdultYear(Y - 19) && !M.isAdultYear(Y - 18), '성인 = 연 나이 19세 이상(청소년보호법)');
  ok(M.ageBand(27) === '20대 후반' && M.ageBand(31) === '30대 초반', '나이대 표시');
  let c = M.compat('갑자', '기축'); ok(c.ready && c.good.some(s => /천간합/.test(s)) && c.good.some(s => /육합/.test(s)), '갑자×기축: 천간합·일지 육합');
  c = M.compat('갑자', '경오'); ok(c.care.some(s => /누르는/.test(s)) && c.care.some(s => /충/.test(s)), '갑자×경오: 금극목·자오충은 조심할 점');
  ok(!JSON.stringify(M.compat('갑자', '병인')).match(/확률|%|점/), '궁합에 확률·점수 표현 없음');
  ok(M.flagOf('카톡 아이디 알려줘') === 'contact' && M.flagOf('010-1234-5678') === 'contact' && M.flagOf('코인 투자 같이 해요') === 'money' && M.flagOf('안녕하세요') === null, '대화 경고 감지');
  const P = (o) => ({ active: true, purposes: ['chat'], want_gender: [], want_age_min: 19, want_age_max: 99, want_region: 'any', region: '서울', interests: [], ...o });
  const V = (y, g) => ({ birth_year: y, gender: g });
  ok(M.eligible(P({ purposes: ['love'], want_gender: ['M'] }), V(Y - 28, 'F'), P({ purposes: ['love'], want_gender: ['F'] }), V(Y - 30, 'M')), '연애: 서로 원하는 성별이면 OK');
  ok(!M.eligible(P({ purposes: ['love'], want_gender: ['M'] }), V(Y - 28, 'F'), P({ purposes: ['love'], want_gender: ['M'] }), V(Y - 30, 'M')), '연애: 한쪽만 원하면 제외');
  ok(M.eligible(P({ purposes: ['love', 'chat'], want_gender: ['M'] }), V(Y - 28, 'F'), P({ purposes: ['chat'] }), V(Y - 28, 'F')), '대화 목적이 겹치면 성별 무관');
  ok(!M.eligible(P({ want_age_max: 30 }), V(Y - 28, 'F'), P({}), V(Y - 40, 'M')), '나이 범위 밖 제외');
  ok(!M.eligible(P({ want_region: 'same' }), V(Y - 28, 'F'), P({ region: '부산' }), V(Y - 28, 'M')), '같은 지역만 원하면 다른 지역 제외');
  ok(!M.eligible(P({}), V(Y - 28, 'F'), P({ active: false }), V(Y - 28, 'M')), '꺼진 프로필 제외');
  ok((await M.handleOf(ENV, U('a'), U('b'))) !== (await M.handleOf(ENV, U('c'), U('b'))), '상대 표시값은 보는 사람마다 다름');

  // 2) 잠금: 개발 중에는 매칭·대화·본인확인 API 막힘
  kv.set('community:stage', JSON.stringify({ stage: 'dev' }));
  for (const p of ['match', 'chat', 'verify']) { const r = await mw.onRequest({ request: new Request(B + '/api/community/' + p), env: ENV, next: () => new Response('own') }); ok(r.status === 403, '개발 중 잠김: ' + p); }

  // 3) 성인 본인확인(포트원)
  x = await call(verify, 'GET', 'tok-a'); ok(x.d.verified === false && x.d.configured === false, '처음: 확인 전·채널 미설정');
  x = await call(verify, 'POST', 'tok-a', '', { action: 'start' }); ok(x.s === 503 && x.d.configured === false, '본인인증 채널 없으면 시작 안 됨');
  ENV.PORTONE_IDV_CHANNEL_KEY = 'channel-idv';
  x = await call(verify, 'POST', 'tok-a', '', { action: 'start' }); const idA = x.d.identityVerificationId;
  ok(x.s === 200 && /^idv-[0-9a-f]{24}$/.test(idA) && x.d.channelKey === 'channel-idv' && kv.get('cm:idv:' + idA) === U('a'), '시작: 인증 id 를 이 회원 것으로 기억');
  x = await call(verify, 'POST', 'tok-b', '', { action: 'confirm', id: idA }); ok(x.s === 409, '다른 회원의 인증 id 로 확인 불가');
  portone[idA] = { status: 'READY' }; x = await call(verify, 'POST', 'tok-a', '', { action: 'confirm', id: idA }); ok(x.s === 400, '완료되지 않은 인증은 거절');
  portone[idA] = { status: 'VERIFIED', verifiedCustomer: { name: '홍길동', phoneNumber: '01012345678', birthDate: (Y - 28) + '-05-01', gender: 'FEMALE', ci: 'CI-AAA', di: 'DI' } };
  x = await call(verify, 'POST', 'tok-a', '', { action: 'confirm', id: idA }); const va = T.adult_verifications.find(v => v.user_id === U('a'));
  ok(x.s === 200 && va && va.birth_year === Y - 28 && va.gender === 'F' && va.provider === 'portone', '확인: 출생 연도·성별 저장');
  ok(!JSON.stringify(T.adult_verifications).match(/홍길동|01012345678|CI-AAA|05-01/) && /^[0-9a-f]{64}$/.test(va.ci_hash), '이름·전화·생일·CI 원문은 저장 안 함(CI 해시만)');
  ok(!kv.has('cm:idv:' + idA), '확인 후 인증 id 지움');
  x = await call(verify, 'POST', 'tok-m', '', { action: 'start' }); const idM = x.d.identityVerificationId;
  portone[idM] = { status: 'VERIFIED', verifiedCustomer: { birthDate: (Y - 17) + '-01-01', gender: 'MALE', ci: 'CI-MINOR' } };
  x = await call(verify, 'POST', 'tok-m', '', { action: 'confirm', id: idM }); ok(x.s === 403 && x.d.reason === 'minor' && !T.adult_verifications.some(v => v.user_id === U('f')), '미성년은 확인 거절·저장 없음');
  x = await call(verify, 'POST', 'tok-b', '', { action: 'start' }); const idB = x.d.identityVerificationId;
  portone[idB] = { status: 'VERIFIED', verifiedCustomer: { birthDate: (Y - 30) + '-02-02', gender: 'MALE', ci: 'CI-AAA' } };
  x = await call(verify, 'POST', 'tok-b', '', { action: 'confirm', id: idB }); ok(x.s === 409 && x.d.reason === 'duplicate', '같은 사람(CI)이 두 번째 계정으로 인증 불가');
  portone[idB].verifiedCustomer.ci = 'CI-BBB'; x = await call(verify, 'POST', 'tok-b', '', { action: 'start' }); const idB2 = x.d.identityVerificationId; portone[idB2] = portone[idB];
  x = await call(verify, 'POST', 'tok-b', '', { action: 'confirm', id: idB2 }); ok(x.s === 200, 'B 본인확인');
  x = await call(verify, 'POST', 'tok-c', '', { action: 'manual', email: 'c@example.com', birthYear: Y - 26, gender: 'M' }); ok(x.s === 401, '수동 확인은 관리자만');
  x = await call(verify, 'POST', null, '', { action: 'manual', email: 'c@example.com', birthYear: Y - 17, gender: 'M' }, admin); ok(x.s === 400, '수동 확인도 미성년 연도 거절');
  for (const [e, y, g] of [['c@example.com', Y - 26, 'M'], ['d@example.com', Y - 29, 'F'], ['e@example.com', Y - 45, 'M']]) await call(verify, 'POST', null, '', { action: 'manual', email: e, birthYear: y, gender: g }, admin);
  ok(T.adult_verifications.length === 5 && T.admin_audit_log.filter(l => l.action === 'community.verify.manual').length === 3, '관리자 수동 확인 3명(감사 로그)');

  // 4) 인연 프로필
  x = await call(match, 'POST', 'tok-m', '', { action: 'profile', active: true, purposes: ['chat'], region: '서울' }); ok(x.s === 403 && x.d.need === 'verify', '본인확인 전에는 인연 찾기 켜기 불가');
  x = await call(match, 'POST', 'tok-a', '', { action: 'profile', active: true, purposes: [], region: '서울' }); ok(x.s === 400, '목적 없이 켜기 불가');
  x = await call(match, 'POST', 'tok-a', '', { action: 'profile', active: true, purposes: ['love', 'chat'], region: '서울' }); ok(x.s === 400, '연애 목적이면 원하는 성별 필수');
  x = await call(match, 'POST', 'tok-a', '', { action: 'profile', active: true, purposes: ['love', 'chat', 'hack'], region: '서울', intro: '연락 010-1111-2222' , wantGender: ['M'] }); ok(x.s === 400, '소개에 전화번호 거절');
  x = await call(match, 'POST', 'tok-a', '', { action: 'profile', active: true, purposes: ['love', 'chat', 'hack'], region: '서울', intro: '사주 이야기 좋아해요', interests: ['saju', 'travel', 'bad'], wantGender: ['M'], wantAgeMin: 40, wantAgeMax: 25 });
  const mpA = T.cm_match_profiles.find(p => p.user_id === U('a'));
  ok(x.s === 200 && JSON.stringify(mpA.purposes) === '["love","chat"]' && JSON.stringify(mpA.interests) === '["saju","travel"]' && mpA.want_age_min === 25 && mpA.want_age_max === 40, '프로필 저장(잘못된 값 제거·나이 범위 정렬)');
  await call(match, 'POST', 'tok-b', '', { action: 'profile', active: true, purposes: ['love'], region: '서울', interests: ['saju'], wantGender: ['F'] });
  await call(match, 'POST', 'tok-c', '', { action: 'profile', active: true, purposes: ['chat'], region: '부산', interests: ['travel'] });
  await call(match, 'POST', 'tok-d', '', { action: 'profile', active: true, purposes: ['love'], region: '서울', wantGender: ['F'] });
  await call(match, 'POST', 'tok-e', '', { action: 'profile', active: true, purposes: ['chat'], region: '서울' });   // 45세 → A 의 나이 범위(25~40) 밖
  x = await call(match, 'GET', 'tok-a', '?view=profile'); ok(x.d.verified && x.d.profile.active && x.d.verification.age === '20대 후반' && !('birthYear' in x.d.verification), '내 인연 프로필(나이대만)');

  // 5) 오늘의 인연
  x = await call(match, 'GET', 'tok-a', '?view=today'); const names = x.d.cards.map(c => c.name).sort();
  ok(x.s === 200 && JSON.stringify(names) === '["꽃길","별빛"]', 'A 의 오늘의 인연 = 서로 조건이 맞는 B·C(D 성별 불일치·E 나이 범위 밖 제외)');
  const cardB = x.d.cards.find(c => c.name === '별빛');
  ok(cardB.ilju === '기축' && cardB.age === '30대 초반' && cardB.compat.good.some(s => /천간합/.test(s)) && cardB.life.sameRegion && cardB.life.interests.includes('사주·명리'), '카드: 일주·나이대·명리 지표·생활 지표');
  ok(!JSON.stringify(x.d).includes(U('b')) && !JSON.stringify(x.d).includes('b@example.com') && !JSON.stringify(x.d).includes('birth_year'), '카드에 회원 id·이메일·출생 연도 없음');
  const again = await call(match, 'GET', 'tok-a', '?view=today'); ok(JSON.stringify(again.d.cards.map(c => c.handle).sort()) === JSON.stringify(x.d.cards.map(c => c.handle).sort()), '같은 날은 같은 인연(하루 고정)');
  x = await call(match, 'GET', 'tok-m', '?view=today'); ok(x.s === 403, '본인확인 전 오늘의 인연 불가');

  // 6) 인연 잇기 → 서로 이으면 대화방
  x = await call(match, 'POST', 'tok-a', '', { action: 'like', handle: 'f'.repeat(24) }); ok(x.s === 404, '모르는 상대에게는 잇기 불가');
  x = await call(match, 'POST', 'tok-a', '', { action: 'like', handle: cardB.handle, note: '같이 사주 이야기해요' }); ok(x.s === 200 && x.d.matched === false && T.cm_likes.some(l => l.from_id === U('a') && l.to_id === U('b') && l.status === 'pending'), 'A → B 인연 잇기(기다림)');
  x = await call(match, 'GET', 'tok-b', '?view=inbox'); const fromA = x.d.received.find(c => c.name === '달빛');
  ok(fromA && fromA.note === '같이 사주 이야기해요' && fromA.compat.ready, 'B 의 인연함에 A(첫 인사 포함)');
  x = await call(match, 'POST', 'tok-b', '', { action: 'like', handle: fromA.handle }); const room = x.d.room;
  ok(x.s === 200 && x.d.matched && room && T.cm_likes.filter(l => l.status === 'matched').length === 2, 'B 도 이으면 matched + 대화방');
  x = await call(match, 'GET', 'tok-a', '?view=inbox'); ok(x.d.matches.length === 1 && x.d.matches[0].room === room && x.d.sent.length === 0, 'A 의 이어진 인연');
  const cardC = (await call(match, 'GET', 'tok-a', '?view=today')).d.cards.find(c => c.name === '꽃길');
  x = await call(match, 'POST', 'tok-a', '', { action: 'pass', handle: cardC.handle }); ok(x.s === 200 && T.cm_likes.some(l => l.from_id === U('a') && l.to_id === U('c') && l.status === 'passed'), '넘기기(조용히 기록)');
  x = await call(match, 'GET', 'tok-c', '?view=inbox'); ok(x.d.received.length === 0, '넘긴 것은 상대에게 알리지 않음');

  // 7) 대화
  x = await call(chat, 'GET', 'tok-c', '?room=' + room); ok(x.s === 404, '방 사람이 아니면 대화 못 봄');
  x = await call(chat, 'POST', 'tok-a', '', { action: 'send', room, body: '안녕하세요 반가워요' }); const m1 = x.d.message; ok(x.s === 200 && m1.mine && !x.d.tip, '메시지 보내기');
  x = await call(chat, 'POST', 'tok-a', '', { action: 'send', room, body: '카톡 아이디 알려 주실래요?' }); ok(x.s === 200 && x.d.message.flagged === 'contact' && /사기/.test(x.d.tip), '연락처 유도는 보내되 경고');
  x = await call(chat, 'GET', 'tok-b', '?view=rooms'); ok(x.d.rooms.length === 1 && x.d.rooms[0].unread && x.d.rooms[0].name === '달빛', 'B: 새 메시지 표시');
  x = await call(chat, 'GET', 'tok-b', '?room=' + room); ok(x.d.messages.length === 2 && !x.d.messages[0].mine && x.d.messages[1].flagged === 'contact' && x.d.tips.contact, 'B: 메시지·경고 문구');
  ok(!JSON.stringify(x.d).includes(U('a')), '대화 응답에 상대 회원 id 없음');
  x = await call(chat, 'GET', 'tok-b', '?view=rooms'); ok(!x.d.rooms[0].unread, '읽으면 새 메시지 표시 사라짐');
  x = await call(chat, 'GET', 'tok-b', '?room=' + room + '&after=' + m1.id); ok(x.d.messages.length === 1, '이어 받기(after)');
  x = await call(chat, 'POST', 'tok-b', '', { action: 'report', room, reason: 'scam', detail: '연락처 요구' }); const rep = T.cm_reports.find(r => r.target_type === 'message');
  ok(x.s === 200 && rep && rep.target_author === U('a'), '대화 신고(상대의 마지막 메시지)');
  x = await call(mod, 'GET', null, '?view=reports', null, admin); const g = x.d.items.find(i => i.type === 'message');
  ok(g && g.who === '달빛' && g.context.length >= 2 && g.context.some(m => m.reported), '관리자: 대화 신고 + 앞뒤 대화');
  x = await call(mod, 'POST', null, '', { action: 'hide', type: 'message', id: g.id }, admin); ok(x.s === 400, '대화는 숨김 대신 기각·제재만');
  x = await call(mod, 'POST', null, '', { action: 'sanction', type: 'message', id: g.id, kind: 'mute', days: 3, reason: '연락처 요구' }, admin); ok(x.s === 200 && T.cm_sanctions.some(s => s.user_id === U('a')), '대화 신고로 제재');
  x = await call(chat, 'POST', 'tok-a', '', { action: 'send', room, body: '또 보내요' }); ok(x.s === 403, '제재 중 메시지 불가');
  x = await call(match, 'GET', 'tok-a', '?view=today'); ok(x.s === 403 && x.d.need === 'sanction', '제재 중 인연 찾기 불가');
  T.cm_sanctions = [];
  x = await call(chat, 'POST', 'tok-b', '', { action: 'block', room }); ok(x.s === 200 && T.cm_rooms.find(r => r.id === room).status === 'closed' && T.cm_blocks.some(b => b.blocker_id === U('b')), '차단하고 끝내기');
  x = await call(chat, 'POST', 'tok-a', '', { action: 'send', room, body: '여보세요' }); ok(x.s === 409, '끝난 대화에는 못 보냄');
  x = await call(match, 'GET', 'tok-b', '?view=inbox'); ok(x.d.matches.length === 0, '끝난 대화는 이어진 인연에서 빠짐');

  // 8) 탈퇴
  await acc.withdraw(ENV, U('a'), { unlinkKakao: false }).catch(() => null);
  ok(!T.cm_match_profiles.some(p => p.user_id === U('a')) && !T.adult_verifications.some(v => v.user_id === U('a')) && T.cm_messages.every(m => m.sender_id !== U('a')), '탈퇴: 인연 프로필·본인확인 삭제, 메시지는 보낸 사람 비움');
  x = await call(chat, 'GET', 'tok-b', '?view=rooms'); ok(x.d.rooms[0].name === '떠난 회원' && !x.d.rooms[0].open, '상대가 떠나면 "떠난 회원"');

  // 9) 크레딧(6단계): 유료 스위치 기본 꺼짐 · 원자적 차감 · 멱등 · 더 볼 사람 없으면 차감 안 함
  T.cm_credit_ledger = [];
  const credits = await imp('functions/api/community/credits.js');
  for (const [k, c2, nick, ilju] of [['tok-g', '7', '하늘', '정해'], ['tok-h', '8', '구름', '무진'], ['tok-i', '9', '이슬', '신유']]) { USERS[k] = { id: U(c2), email: k.slice(4) + '@example.com' }; T.member_profiles.push(prof(U(c2), nick, ilju)); T.member_consents.push(...consent(U(c2))); }
  for (const [e, y, g2] of [['g@example.com', Y - 25, 'F'], ['h@example.com', Y - 27, 'M'], ['i@example.com', Y - 24, 'F']]) await call(verify, 'POST', null, '', { action: 'manual', email: e, birthYear: y, gender: g2 }, admin);
  await call(match, 'POST', 'tok-g', '', { action: 'profile', active: true, purposes: ['chat'], region: '서울', wantAgeMax: 30 });
  await call(match, 'POST', 'tok-h', '', { action: 'profile', active: true, purposes: ['chat'], region: '서울' });
  x = await call(credits, 'GET', 'tok-g'); ok(x.s === 200 && x.d.enabled === false && !('balance' in x.d), '유료 스위치 기본 꺼짐(잔액도 안 보임)');
  x = await call(credits, 'POST', 'tok-g', '', { action: 'more-picks', req: 'r'.repeat(16) }); ok(x.s === 403 && x.d.need === 'premium-off', '꺼져 있으면 더 보기 거절');
  x = await call(credits, 'PUT', null, '', { enabled: true }, admin); ok(x.s === 400, '켜려면 확인 문구 필요');
  x = await call(credits, 'PUT', 'tok-g', '', { enabled: true, confirm: '유료 켜기' }); ok(x.s === 401, '유료 설정은 관리자만');
  x = await call(credits, 'PUT', null, '', { enabled: true, confirm: '유료 켜기', prices: { morePicks: 3, extraLike: 999 } }, admin);
  ok(x.s === 200 && x.d.config.enabled && x.d.config.prices.extraLike === 1 && T.admin_audit_log.some(l => l.action === 'community.premium.config'), '유료 켜기(이상한 가격은 기본값)·감사 로그');
  x = await call(match, 'GET', 'tok-g', '?view=today'); const gToday = x.d.cards.map(c2 => c2.name).sort(); ok(JSON.stringify(gToday) === '["구름","꽃길"]', 'G 의 오늘의 인연(H·C)');
  x = await call(credits, 'POST', 'tok-g', '', { action: 'more-picks', req: 'a'.repeat(16) }); ok(x.s === 409 && x.d.added === 0 && T.cm_credit_ledger.length === 0, '더 볼 사람이 없으면 크레딧을 쓰지 않음');
  await call(match, 'POST', 'tok-i', '', { action: 'profile', active: true, purposes: ['chat'], region: '서울' });
  x = await call(credits, 'POST', 'tok-g', '', { action: 'more-picks', req: 'b'.repeat(16) }); ok(x.s === 402 && x.d.need === 'credit-buy' && x.d.balance === 0, '잔액 부족 → 402');
  x = await call(credits, 'POST', 'tok-g', '', { action: 'grant', email: 'g@example.com', amount: 5 }); ok(x.s === 401, '지급은 관리자만');
  x = await call(credits, 'POST', null, '', { action: 'grant', email: 'g@example.com', amount: 5, note: '테스트' }, admin); ok(x.s === 200 && x.d.balance === 5 && T.admin_audit_log.some(l => l.action === 'community.credit.grant'), '관리자 지급(감사 로그)');
  x = await call(credits, 'POST', 'tok-g', '', { action: 'more-picks', req: 'c'.repeat(16) }); ok(x.s === 200 && x.d.added === 1 && x.d.balance === 2, '더 보기: 새 인연 1명·크레딧 3 차감');
  x = await call(credits, 'POST', 'tok-g', '', { action: 'more-picks', req: 'c'.repeat(16) }); ok(x.d.balance === 2 && T.cm_credit_ledger.filter(r => r.reason === 'more_picks').length === 1, '같은 요청을 다시 보내도 한 번만 차감');
  x = await call(match, 'GET', 'tok-g', '?view=today'); ok(x.d.cards.some(c2 => c2.name === '이슬'), '더 본 인연이 오늘의 인연에 붙음');
  x = await call(credits, 'GET', 'tok-g'); ok(x.d.enabled && x.d.balance === 2 && x.d.history.length === 2 && x.d.history[0].label === '오늘의 인연 더 보기', '내 잔액·이력');
  // 하루 잇기 한도 → 크레딧으로 잇기
  kv.set('cm:rate:like:' + U('7') + ':' + new Date().toISOString().slice(0, 10), '10');   // 하루 한도 카운터(서버 overLimit 은 UTC 날짜 키)
  const hCard = (await call(match, 'GET', 'tok-g', '?view=today')).d.cards.find(c2 => c2.name === '구름');
  x = await call(match, 'POST', 'tok-g', '', { action: 'like', handle: hCard.handle }); ok(x.s === 429 && x.d.need === 'credit' && x.d.price === 1, '한도를 넘으면 크레딧 잇기 안내');
  x = await call(match, 'POST', 'tok-g', '', { action: 'like', handle: hCard.handle, useCredit: true, req: 'd'.repeat(16) }); ok(x.s === 200 && T.cm_credit_ledger.some(r => r.reason === 'extra_like') && (await call(credits, 'GET', 'tok-g')).d.balance === 1, '크레딧 1로 잇기');
  T.cm_credit_ledger.push({ id: seq++, user_id: U('7'), delta: -1, reason: 'adjust', idem_key: 'x', created_at: '' });
  const iCard = (await call(match, 'GET', 'tok-g', '?view=today')).d.cards.find(c2 => c2.name === '이슬');
  x = await call(match, 'POST', 'tok-g', '', { action: 'like', handle: iCard.handle, useCredit: true, req: 'e'.repeat(16) }); ok(x.s === 402 && !T.cm_likes.some(l => l.from_id === U('7') && l.to_id === U('9')), '잔액 0 이면 잇지 않음');
  await call(credits, 'PUT', null, '', { enabled: false }, admin);
  x = await call(match, 'POST', 'tok-g', '', { action: 'like', handle: iCard.handle, useCredit: true, req: 'f'.repeat(16) }); ok(x.s === 429 && !x.d.need, '유료를 끄면 크레딧 잇기 안내도 사라짐');
  const sql6 = read('supabase/migrations/20261116_credits_stage6.sql');
  ok(/pg_advisory_xact_lock/.test(sql6) && /idem_key   text not null unique/.test(sql6) && /if bal < p_amount then/.test(sql6), '원장: 회원별 잠금·멱등 키·잔액 확인');
  ok(/revoke all on public\.cm_credit_ledger from anon, authenticated/.test(sql6) && /grant execute on function public\.cm_credit_balance\(uuid\), public\.cm_credit_spend/.test(sql6) && !/commerce_/.test(sql6.replace(/--.*$/gm, '')), '원장: 브라우저 권한 회수·심층 분석 결제 표 안 건드림');

  // 10) 파일
  const sql = read('supabase/migrations/20261116_match_stage5.sql');
  const tbls = ['adult_verifications', 'cm_match_profiles', 'cm_daily_picks', 'cm_likes', 'cm_rooms', 'cm_messages'];
  ok(tbls.every(t => new RegExp('alter table public\\.' + t + '\\s+enable row level security').test(sql)) && /revoke all on public\.adult_verifications, public\.cm_match_profiles, public\.cm_daily_picks, public\.cm_likes, public\.cm_rooms, public\.cm_messages from anon, authenticated/.test(sql), '새 표 6개 RLS·권한 회수');
  ok(!/name|phone/.test(sql.split('adult_verifications (')[1].split(');')[0]), '본인확인 표에 이름·전화 칸 없음');
  ok(/elsif new\.target_type = 'comment'/.test(sql), '신고 수 트리거: 메시지 신고가 댓글 행을 세지 않음');
  const cm = read('community/cm.js'), html = read('community/index.html');
  ok(/data-tab="match"/.test(html) && /data-tab="chat"/.test(html) && /href="#\/plaza"/.test(html), '하단 탭: 인연·대화·광장');
  ok(/requestIdentityVerification/.test(cm) && /cdn\.portone\.io\/v2\/browser-sdk\.js/.test(cm) && /identityVerificationId/.test(cm), '화면: 포트원 본인인증(모바일 돌아오기 포함)');
  ok(/관계의 성패를 예측하지 않아요/.test(cm) && !/성공 확률/.test(cm), '화면: 확률 표현 없음·참고용 안내');
  ok(/setTimeout\(tick, 4000\)/.test(cm) && /stopPoll\(\)/.test(cm), '대화: 열려 있을 때만 4초 확인, 화면 나가면 멈춤');

  if (fails.length) { console.error('match-sim 실패 ' + fails.length + '/' + n + ':\n - ' + fails.join('\n - ')); process.exit(1); }
  console.log('match-sim OK: ' + n + '항목(성인 기준·궁합·조건·본인확인·인연 프로필·오늘의 인연·잇기/매칭·대화·신고/제재·차단·탈퇴·파일)');
})().catch(e => { console.error(e); process.exit(1); });
