// POST /api/admin — 관리자 비밀번호 확인
import { json, isAdmin, configError } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) {
    await new Promise(r => setTimeout(r, 800)); // 무차별 대입 속도 늦추기
    return json({ error: '비밀번호가 맞지 않습니다' }, 401);
  }
  return json({ ok: true });
}
