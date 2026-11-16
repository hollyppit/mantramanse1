// 9단계 기능별 독립 스위치. 공용: functions/_features.js
// GET               → { features:{ plaza, records, match, chat }, labels, at, by }   관리자 비밀번호·운영자 열쇠(보기)
// PUT { features }  → 켜기·끄기(관리자 비밀번호만). 끄는 쪽은 바로, 다시 켜기도 바로. 감사 로그
import { json, readBody } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { need, staffOf, actorOf } from '../../_staff.js';
import { FEATURES, FEATURES_KEY, readFeatures, cleanFeatures } from '../../_features.js';

export async function onRequestGet({ request, env }) {
  const s = await staffOf(request, env); if (!s) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const f = await readFeatures(env);
  return json({ features: cleanFeatures(f), labels: FEATURES, at: f.at, by: f.by });
}

export async function onRequestPut({ request, env }) {
  const g = await need(request, env, 'staff'); if (g.res) return g.res;   // 관리자 비밀번호만
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b || !b.features || typeof b.features !== 'object') return json({ error: '기능 값(features)을 보내 주세요' }, 400);
  if (Object.keys(b.features).some(k => !FEATURES[k] || typeof b.features[k] !== 'boolean')) return json({ error: '모르는 기능이거나 켜짐/꺼짐 값이 아닙니다' }, 400);
  const before = cleanFeatures(await readFeatures(env)), next = { ...before, ...b.features }, by = actorOf(g.staff);
  const changed = Object.keys(next).filter(k => next[k] !== before[k]);
  await env.GLOSSARY_KV.put(FEATURES_KEY, JSON.stringify({ ...next, at: new Date().toISOString(), by }));
  await audit(env, by, 'community.features', null, { changed: Object.fromEntries(changed.map(k => [k, next[k]])) });
  return json({ ok: true, features: next, changed });
}
