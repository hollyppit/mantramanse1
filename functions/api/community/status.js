// GET /api/community/status — { stage, label, inside } 공개. inside = 이 브라우저의 입장 쿠키가 지금 단계에서 유효한지(게이트웨이 카드 표시용)
// PUT /api/community/status — { stage: 'dev'|'beta'|'public' } 관리자. 정식 공개는 { stage:'public', confirm:'정식 공개' } 를 함께 보내야 한다.
// 8단계: 정식 공개는 공개 조건 점검표(functions/_launch.js)를 모두 통과해야 한다. 미달이면 409 + failing.
//   그래도 열려면 { override:true, reason:'5자 이상 사유' } 를 함께 보낸다 → 감사 로그에 점검 결과·사유가 남는다.
// 저장: KV 'community:stage' = { stage, version, at, by, history:[최근 20건] }. 바꿀 때마다 감사 로그(admin_audit_log)에 남긴다.
import { json, isAdmin, readStage, readCookie, roleAllowed, STAGES, STAGE_LABEL, STAGE_KEY, audit, reviewerOf } from '../../_community.js';
import { checklist } from '../../_launch.js';
import { gatewayOpen } from '../../_gateway.js';

export async function onRequestGet({ request, env }) {
  const { stage } = await readStage(env);
  const c = await readCookie(request, env);
  return json({ stage, label: STAGE_LABEL[stage], inside: stage === 'public' || !!(c && roleAllowed(c.role, stage)), gateway: await gatewayOpen(env) });   // gateway: 통합 첫 화면이 열려 있는가(심층 분석의 '처음 화면' 링크 표시용)
}

export async function onRequestPut({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ error: 'KV 바인딩(GLOSSARY_KV)이 설정되지 않았습니다' }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const next = body && body.stage;
  if (!STAGES.includes(next)) return json({ error: "stage 는 'dev'·'beta'·'public' 중 하나여야 합니다" }, 400);
  if (next === 'public' && body.confirm !== '정식 공개') return json({ error: "정식 공개는 confirm: '정식 공개' 확인이 필요합니다" }, 400);
  const { stage: prev, doc } = await readStage(env);
  let gate = null;
  if (next === 'public' && prev !== 'public') {
    let c; try { c = await checklist(env); } catch { c = { ready: false, failing: ['점검표를 계산하지 못했습니다'] }; }
    gate = { ready: !!c.ready, failing: c.failing || [] };
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : '';
    if (!gate.ready) {
      if (body.override !== true) return json({ error: '정식 공개 조건을 아직 다 채우지 못했습니다', need: 'checklist', failing: gate.failing }, 409);
      if (reason.length < 5) return json({ error: '기준 미달 공개는 사유(5자 이상)를 적어 주세요', need: 'reason', failing: gate.failing }, 400);
      gate.override = true; gate.reason = reason;
    }
  }
  const by = reviewerOf(request) || '관리자', at = new Date().toISOString();
  const history = [{ from: prev, to: next, at, by }].concat(Array.isArray(doc && doc.history) ? doc.history : []).slice(0, 20);
  const out = { stage: next, version: ((doc && Number.isInteger(doc.version)) ? doc.version : 0) + 1, at, by, history };
  await env.GLOSSARY_KV.put(STAGE_KEY, JSON.stringify(out));
  const logged = await audit(env, by, 'community.stage', next, { from: prev, to: next, ...(gate ? { checklist: gate } : {}) });
  return json({ ok: true, stage: next, label: STAGE_LABEL[next], version: out.version, history, audited: logged, checklist: gate });
}
