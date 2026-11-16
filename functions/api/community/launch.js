// 8단계 정식 공개 조건 점검표. 공용: functions/_launch.js
// GET                                   → { items, ready, failing, cfg, day }   보기: 관리자 비밀번호·운영 매니저·분석 담당(권한 metrics)
// PUT  { targets:{…} }                  → 기준값 바꾸기(관리자 비밀번호만) · 감사 로그
// POST { action:'check', item, done, note } → 사람 확인 항목(운영·개인정보·보안·성능) 체크/해제(관리자 비밀번호만) · 감사 로그
// 정식 공개 전환 자체는 /api/community/status(점검표 미달이면 사유가 있어야 함)
import { json, readBody } from '../../_plaza.js';
import { audit } from '../../_community.js';
import { need, actorOf } from '../../_staff.js';
import { LAUNCH_KEY, MANUAL, cleanConfig, loadLaunch, checklist } from '../../_launch.js';

export async function onRequestGet({ request, env }) {
  const g = await need(request, env, 'metrics'); if (g.res) return g.res;
  const c = await checklist(env);
  return json({ ...c, manualLabels: MANUAL, role: g.staff.role });
}

export async function onRequestPut({ request, env }) {
  const g = await need(request, env, 'staff'); if (g.res) return g.res;   // 관리자 비밀번호만
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b || !b.targets || typeof b.targets !== 'object') return json({ error: '기준값(targets)을 보내 주세요' }, 400);
  const before = await loadLaunch(env), by = actorOf(g.staff);
  const next = cleanConfig({ ...before, targets: { ...before.targets, ...b.targets } });
  const changed = Object.keys(next.targets).filter(k => next.targets[k] !== before.targets[k]);
  const doc = { ...next, at: new Date().toISOString(), by };
  await env.GLOSSARY_KV.put(LAUNCH_KEY, JSON.stringify(doc));
  await audit(env, by, 'community.launch.targets', null, { changed: Object.fromEntries(changed.map(k => [k, [before.targets[k], next.targets[k]]])) });
  return json({ ok: true, targets: next.targets, changed });
}

export async function onRequestPost({ request, env }) {
  const g = await need(request, env, 'staff'); if (g.res) return g.res;
  if (!env.GLOSSARY_KV) return json({ error: 'KV 가 없습니다' }, 503);
  const b = await readBody(request); if (!b || b.action !== 'check' || !MANUAL[b.item]) return json({ error: '잘못된 요청입니다' }, 400);
  const note = String(b.note || '').trim().slice(0, 200);
  if (b.done === true && note.length < 2) return json({ error: '무엇을 확인했는지 메모를 남겨 주세요(2자 이상)' }, 400);
  const before = await loadLaunch(env), by = actorOf(g.staff), at = new Date().toISOString();
  const manual = { ...before.manual, [b.item]: b.done === true ? { done: true, by, at, note } : { done: false, by, at, note } };
  await env.GLOSSARY_KV.put(LAUNCH_KEY, JSON.stringify({ ...before, manual, at, by }));
  await audit(env, by, 'community.launch.check', b.item, { done: b.done === true, note });
  return json({ ok: true, item: b.item, manual: manual[b.item] });
}
