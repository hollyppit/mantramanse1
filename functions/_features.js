// 9단계: 인연의 광장 기능별 독립 스위치. 공개 단계(community:stage)와 별개로 기능 하나씩 끄고 켠다(예: 정식 공개는 하되 인연 찾기는 법률 검토 뒤에).
// 저장: KV 'community:features' = { plaza, records, match, chat, at, by } — 값이 없거나 읽기 실패면 모두 켜짐(지금까지와 같은 동작).
// 꺼진 기능의 API 는 403 { need:'feature-off', feature } 를 돌려주고, 화면(community/cm.js)은 그 탭을 숨긴다.
// 관리자 비밀번호·운영자 열쇠 요청은 스위치와 상관없이 통과한다(운영·점검용).
import { json } from './_lib.js';
import { staffOf } from './_staff.js';

export const FEATURES_KEY = 'community:features';
export const FEATURES = {
  plaza: '광장(글·댓글·공감)',
  records: '오늘의 운테크·운명의 기록',
  match: '인연 찾기(오늘의 인연·인연 잇기·본인확인)',
  chat: '1:1 대화',
};
export const DEFAULT_FEATURES = Object.fromEntries(Object.keys(FEATURES).map(k => [k, true]));
export function cleanFeatures(d) { const out = {}; for (const k of Object.keys(FEATURES)) out[k] = !(d && d[k] === false); return out; }
export async function readFeatures(env) {
  let d = null; try { d = env && env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(FEATURES_KEY, 'json') : null; } catch { d = null; }
  return { ...cleanFeatures(d), at: d && d.at || null, by: d && d.by || null };
}
// API 첫 줄에서: 꺼져 있으면 Response, 켜져 있으면 null
export async function featureGate(request, env, name) {
  const f = await readFeatures(env);
  if (f[name] !== false) return null;
  if (/^Bearer /.test(request.headers.get('authorization') || '') && await staffOf(request, env)) return null;   // 관리자·유효한 운영자 열쇠만(가짜 열쇠는 DB 에서 확인)
  return json({ error: '지금은 잠시 쉬고 있는 기능이에요. 조금 뒤에 다시 찾아 주세요', need: 'feature-off', feature: name }, 403);
}
