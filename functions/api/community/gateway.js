// 통합 첫 화면(/gate/) 열기·숨기기. 공용: functions/_gateway.js
// GET               → { open, at, by }   관리자 비밀번호·운영자 열쇠
// PUT { open, confirm? } → 관리자 비밀번호만. 열 때는 confirm:'처음 화면 열기' 를 함께 보낸다(방문자 첫 화면이 바뀌므로). 감사 로그
import { json, readBody } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { need, staffOf, actorOf } from '../../_staff.js';
import { GATEWAY_KEY, readGateway } from '../../_gateway.js';

export async function onRequestGet({ request, env }) {
  if (!(await staffOf(request, env))) return json({ error: '관리자 인증이 필요합니다' }, 401);
  return json(await readGateway(env));
}

export async function onRequestPut({ request, env }) {
  const g = await need(request, env, 'staff'); if (g.res) return g.res;   // 관리자 비밀번호만
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b || typeof b.open !== 'boolean') return json({ error: '열기·숨기기 값(open)을 보내 주세요' }, 400);
  const before = await readGateway(env);
  if (b.open && !before.open && b.confirm !== '처음 화면 열기') return json({ error: '처음 화면을 열려면 확인 문구 "처음 화면 열기"를 함께 보내 주세요' }, 400);
  const by = actorOf(g.staff), at = new Date().toISOString();
  await env.GLOSSARY_KV.put(GATEWAY_KEY, JSON.stringify({ open: b.open, at, by }));
  await audit(env, by, 'community.gateway', null, { from: before.open, to: b.open });
  return json({ ok: true, open: b.open, at, by });
}
