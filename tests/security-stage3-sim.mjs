// 보안 3차(2026-11-26) 검증 — node tests/security-stage3-sim.mjs
//   · DB 원자 횟수(rate_add·rate_reserve)를 흉내 낸 가짜 Supabase 로: 광장 하루 한도·관리자 비밀번호 대입·AI 깊이 읽기 하루 횟수
//   · 동시에 몰려온 요청도 정확히 센다(예전 KV 는 같은 숫자를 읽어 한 번만 셈) · DB 가 안 되면 예전 KV 로 계속
//   · 마이그레이션: 탈퇴 직전 보관 트리거·재인증 복원 트리거·권한 회수·매시간 정리
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { rateAdd, rateReserve } from '../functions/_rate.js';
import { overLimit } from '../functions/_plaza.js';
import { authThrottle } from '../functions/_community.js';
import { reserve, commit, release } from '../functions/_deep-quota.js';

// 가짜 KV: get/put 사이에 한 박자 쉬어 동시 요청이 같은 값을 읽게 만든다(실제 KV 와 같은 '읽고 쓰기' 경쟁)
function slowKv() { const m = new Map(); return { m, async get(k, t) { await new Promise(r => setTimeout(r, 5)); const v = m.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, async put(k, v) { await new Promise(r => setTimeout(r, 5)); m.set(k, String(v)); }, async delete(k) { m.delete(k); } }; }
// 가짜 DB: 한 문장으로 더하기(원자). down=true 면 오류
const db = { n: new Map(), down: false, calls: [] };
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url); db.calls.push(u);
  if (!u.includes('/rest/v1/rpc/rate_')) return realFetch(url, init);
  if (db.down) return new Response('down', { status: 503 });
  const b = JSON.parse(init.body);
  const add = (k, a) => { const v = Math.max(0, (db.n.get(k) || 0) + a); db.n.set(k, v); return v; };
  if (u.endsWith('/rate_add')) return Response.json(add(b.p_key, b.p_add));
  if (u.endsWith('/rate_reserve')) {
    const before = b.p_keys.map(k => db.n.get(k) || 0);
    for (let i = 0; i < b.p_keys.length; i++) if (add(b.p_keys[i], 1) > b.p_max[i]) { b.p_keys.forEach((k, j) => db.n.set(k, before[j])); return Response.json(i + 1); }
    return Response.json(0);
  }
  return new Response('?', { status: 404 });
};
const env = (kv = slowKv()) => ({ SUPABASE_URL: 'https://fake.supabase.co', SUPABASE_SERVICE_KEY: 'svc', GLOSSARY_KV: kv, ADMIN_PASSWORD: 'right-password-123' });
let n = 0; const ok = (c, m) => { n++; assert.ok(c, m); };

// ① _rate.js
ok(await rateAdd(env(), 'k1', 1, 60) === 1 && await rateAdd(env(), 'k1', 1, 60) === 2 && await rateAdd(env(), 'k1', -5, 60) === 0, 'rateAdd 더하기·0 아래로 안 내려감');
ok(await rateReserve(env(), ['a', 'b'], [5, 1], 60) === 0 && await rateReserve(env(), ['a', 'b'], [5, 1], 60) === 2 && db.n.get('a') === 1, 'rateReserve 하나라도 넘으면 모두 되돌림');
db.down = true; ok(await rateAdd(env(), 'k1', 1, 60) === null && await rateReserve(env(), ['a'], [1], 60) === null, 'DB 오류면 null');
ok(await rateAdd({}, 'k', 1, 60) === null, 'Supabase 설정 없으면 null'); db.down = false;

// ② 광장 하루 한도: 동시에 50번 보내도 한도 10번만 통과
{ const e = env(); const r = await Promise.all(Array.from({ length: 50 }, () => overLimit(e, 'post:u1', 10)));
  ok(r.filter(x => !x).length === 10, '광장 한도: 동시 50번 중 정확히 10번 통과(DB) — ' + r.filter(x => !x).length);
  db.down = true; const e2 = env(); const r2 = []; for (let i = 0; i < 4; i++) r2.push(await overLimit(e2, 'post:u2', 3)); db.down = false;
  ok(r2.join() === 'false,false,false,true', 'DB 가 안 되면 예전 KV 방식으로 계속 셈'); }

// ③ 관리자 비밀번호 대입: 한꺼번에 200번 틀려도 정확히 세서 그다음은 429
{ const kv = slowKv(), e = env(kv); const bad = i => new Request('https://mantrafortune.com/api/luck-flags', { headers: { authorization: 'Bearer guess-' + i, 'cf-connecting-ip': '203.0.113.9' } });
  await Promise.all(Array.from({ length: 200 }, (_, i) => authThrottle(bad(i), e)));
  const key = [...kv.m.keys()].find(k => k.startsWith('cm:authfail:'));
  ok(+kv.m.get(key) >= 200, 'KV 에 DB 가 센 정확한 숫자(' + kv.m.get(key) + ')');
  const next = await authThrottle(bad('x'), e); ok(next && next.status === 429, '동시 대입 뒤 바로 429');
  // 비교: DB 없이(예전 방식) 동시 200번이면 거의 1번으로 세진다 — 이번 수정이 막은 문제
  db.down = true; const kv2 = slowKv(), e2 = env(kv2); await Promise.all(Array.from({ length: 200 }, (_, i) => authThrottle(bad(i), e2))); db.down = false;
  const v2 = +[...kv2.m.values()][0]; ok(v2 < 20, '예전 KV 만 쓰면 동시 200번이 ' + v2 + '번으로 세짐(재현)');
  const good = await authThrottle(new Request('https://mantrafortune.com/api/luck-flags', { headers: { authorization: 'Bearer right-password-123', 'cf-connecting-ip': '198.51.100.1' } }), e);
  ok(good === null, '다른 IP 의 맞는 열쇠는 영향 없음'); }

// ④ AI 깊이 읽기 하루 횟수: 동시에 눌러도 기기당 2번, 실패하면 되돌림
{ const kv = slowKv(), cfg = { dailyLimit: 200, perIpLimit: 6, perDevice: 2 }, ctx = { ip: '1.2.3.4', device: 'abcdef0123456789abcd', env: env(kv) };
  const slots = await Promise.all(Array.from({ length: 10 }, () => reserve(kv, cfg, ctx)));
  ok(slots.filter(s => s.ok).length === 2 && slots.filter(s => !s.ok).every(s => s.error === 'device-limit'), '동시 10번 중 기기당 2번만 통과');
  const won = slots.filter(s => s.ok); await release(won[0]);
  ok((await reserve(kv, cfg, ctx)).ok, '실패한 풀이는 되돌려 다시 쓸 수 있음');
  const q = await commit(kv, cfg, won[1]); ok(q.left === 1 && q.limit === 2, '성공 뒤 화면 표시용 남은 횟수');
  db.down = true; const kv3 = slowKv(), c3 = { ...ctx, device: 'zzzzzz0123456789abcd', env: env(kv3) };
  const s3 = await reserve(kv3, cfg, c3); db.down = false; ok(s3.ok && !s3.db, 'DB 가 안 되면 예전 KV 방식'); await release(s3); }

// ⑤ 마이그레이션(운영 DB 에 적용할 SQL) — 구조 확인
{ const sql = fs.readFileSync(new URL('../supabase/migrations/20261126_security_stage3.sql', import.meta.url), 'utf8');
  ok(/before delete on auth\.users for each row execute function public\.cm_hold_on_user_delete/.test(sql), '탈퇴 직전(cascade 전) 보관 트리거');
  ok(/from public\.cm_sanctions s[\s\S]*lifted_at is null and s\.kind in \('mute','ban'\)/.test(sql) && /from public\.cm_blocks b where b\.blocked_id = old\.id/.test(sql), '남은 정지·남이 막은 차단만 보관');
  ok(/exception when others then\s+raise warning/.test(sql), '보관이 실패해도 탈퇴는 막지 않음');
  ok(/after insert or update of ci_hash on public\.adult_verifications/.test(sql) && /insert into public\.cm_sanctions[\s\S]*insert into public\.cm_blocks[\s\S]*delete from public\.cm_ci_holds where ci_hash = new\.ci_hash/.test(sql), '같은 CI 재인증 → 정지·차단 다시 걸고 보관 지움');
  ok(/coalesce\(s\.until, now\(\) \+ interval '3 years'\)/.test(sql) && /cron\.schedule\('sec-purge'/.test(sql), '보관 기간(기간 끝·3년)·매시간 정리');
  ok(!/create policy/i.test(sql) && (sql.match(/revoke all on (function )?public\./g) || []).length >= 9, '정책 없음·권한 회수');
  ok(/on conflict \(key\) do update set n = greatest\(0, c\.n \+ p_add\)/.test(sql), '한 문장 원자 더하기'); }

globalThis.fetch = realFetch;
console.log('security-stage3-sim OK: ' + n + '항목(원자 횟수·광장 한도·관리자 대입·AI 하루 횟수·DB 실패 시 KV·탈퇴 보관 SQL)');
