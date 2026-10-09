// POST /api/admin — 관리자 비밀번호 확인
// 같은 IP에서 5번 틀리면 15분간 잠근다(KV에 실패 횟수 저장). 맞게 입력하면 횟수를 지운다.
import { json, isAdmin, configError } from '../_lib.js';

const MAX_FAILS = 5, LOCK_SEC = 900;

export async function onRequestPost({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  const ip = request.headers.get('cf-connecting-ip') || 'unknown', key = 'adminfail:' + ip;
  let fails = 0;
  try { fails = parseInt(await env.GLOSSARY_KV.get(key), 10) || 0; } catch { /* KV 오류면 잠금 없이 진행 */ }
  if (fails >= MAX_FAILS) return json({ error: '시도 횟수를 넘었습니다. 15분 뒤에 다시 시도하세요' }, 429);
  if (!isAdmin(request, env)) {
    try { await env.GLOSSARY_KV.put(key, String(fails + 1), { expirationTtl: LOCK_SEC }); } catch { }
    await new Promise(r => setTimeout(r, 800)); // 무차별 대입 속도 늦추기
    return json({ error: '비밀번호가 맞지 않습니다' }, 401);
  }
  if (fails) { try { await env.GLOSSARY_KV.delete(key); } catch { } }
  return json({ ok: true });
}
