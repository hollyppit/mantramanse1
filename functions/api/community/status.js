// GET /api/community/status — { stage, label, inside } 공개. inside = 이 브라우저의 입장 쿠키가 지금 단계에서 유효한지(게이트웨이 카드 표시용)
// PUT /api/community/status — { stage: 'dev'|'beta'|'public' } 관리자. 정식 공개는 { stage:'public', confirm:'정식 공개' } 를 함께 보내야 한다.
// 저장: KV 'community:stage' = { stage, version, at, by, history:[최근 20건] }. 바꿀 때마다 감사 로그(admin_audit_log)에 남긴다.
import { json, isAdmin, readStage, readCookie, roleAllowed, STAGES, STAGE_LABEL, STAGE_KEY, audit, reviewerOf } from '../../_community.js';

export async function onRequestGet({ request, env }) {
  const { stage } = await readStage(env);
  const c = await readCookie(request, env);
  return json({ stage, label: STAGE_LABEL[stage], inside: stage === 'public' || !!(c && roleAllowed(c.role, stage)) });
}

export async function onRequestPut({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩(GLOSSARY_KV)이 설정되지 않았습니다' }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const next = body && body.stage;
  if (!STAGES.includes(next)) return json({ error: "stage 는 'dev'·'beta'·'public' 중 하나여야 합니다" }, 400);
  if (next === 'public' && body.confirm !== '정식 공개') return json({ error: "정식 공개는 confirm: '정식 공개' 확인이 필요합니다" }, 400);
  const { stage: prev, doc } = await readStage(env);
  const by = reviewerOf(request) || '관리자', at = new Date().toISOString();
  const history = [{ from: prev, to: next, at, by }].concat(Array.isArray(doc && doc.history) ? doc.history : []).slice(0, 20);
  const out = { stage: next, version: ((doc && Number.isInteger(doc.version)) ? doc.version : 0) + 1, at, by, history };
  await env.GLOSSARY_KV.put(STAGE_KEY, JSON.stringify(out));
  const logged = await audit(env, by, 'community.stage', next, { from: prev, to: next });
  return json({ ok: true, stage: next, label: STAGE_LABEL[next], version: out.version, history, audited: logged });
}
