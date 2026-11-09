import { deleteDerivedFile, putDerivedFile } from '../_original-assets.js';
// 시네마틱 온보딩 장면 이미지·영상 생성 (관리자 전용) — 패널 이미지 탭에서 쓴다. 비주얼 디렉션·그림체 레퍼런스는 /api/panel-art 설정(panel:direction)을 같이 쓴다.
// 이 API 는 파일만 만든다. 장면 슬롯(image·imageMobile·video·videoMobile)에 연결하는 것은 관리자 화면이 온보딩 초안(PUT /api/onboarding { renewal })으로 하고, 방문자 반영은 기존 [게시]로 한다.
// GET    /api/onboard-art                          — { providers, kling, models, tasks:[{ id, scene, orient, createdAt }] }
// POST   /api/onboard-art { scene:{id,title,lines,index}, orient:'pc'|'mobile', promptOnly? , prompt?, extra?, provider?, useRefs? } — 이미지 생성 → { url, key, prompt }
// POST   /api/onboard-art { scene, brief:'ai' } — 독백으로 장면 연출(PC·모바일) 짜기(Claude → 없으면 OpenAI) · { scene, brief:'save', core, pc, mobile, motion } — 관리자가 고친 연출 저장
//        연출은 KV onb:briefs[장면id] = { src(문구 지문), core, pc, mobile, motion, by, at }. 이미지 생성 때 연출이 없거나 문구가 바뀌었으면 AI 키가 있을 때 먼저 새로 짠다.
// POST   /api/onboard-art { video:true, scene, orient, startKey, prompt?, extra?, negativeExtra?, mode?, duration? } — Kling 이미지→영상 제출(시작 프레임은 관리자 화면이 JPEG 로 올린 키)
// GET    /api/onboard-art?task=<장면id>.<pc|mobile> — 영상 작업 조회: processing | failed | done({ url, key })
// DELETE /api/onboard-art?task=…                  — 진행 중 기록 지우기 · DELETE ?k=<onbart-/onbvid- 키> — 연결하지 않을 생성 파일 지우기
// 필요: GLOSSARY_KV · CLIPS_R2 · ADMIN_PASSWORD · (OPENAI_API_KEY 또는 GEMINI_API_KEY) · 영상은 KLING_API_KEY(또는 KLING_ACCESS_KEY+KLING_SECRET_KEY)
import { json, isAdmin, configError } from '../_lib.js';
import { generate, cleanDirection, REF_USE, REF_OK } from '../_panelart.js';
import { ORIENT, orientOf, cleanScene, scenePrompt, sceneMotion, srcOf, cleanBrief, BRIEF_SYSTEM, briefUser, parseBrief } from '../_onboardart.js';
import { aiFetch } from '../_ai-cost.js';
import { klingEnabled, KLING_ENV_HELP, klingSubmit, klingQuery, toB64 } from '../_kling.js';

const BKEY = 'onb:briefs', DKEY = 'panel:direction', TP = 'onb:vt:', FK = /^[\w.-]{1,120}$/, OWN = /^onb(art|vid)-[\w.-]{1,110}$/, TASK = /^([a-z0-9_-]{2,60})\.(pc|mobile)$/;
const MAX_START = 10 * 1024 * 1024, MAX_VIDEO = 80 * 1024 * 1024, MAX_AGE = 3 * 3600 * 1000, TYPE_OF = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => x.toString(16).padStart(2, '0')).join('');
const loadDir = async env => cleanDirection(await env.GLOSSARY_KV.get(DKEY, 'json'));
const getTask = async (env, id) => { const t = await env.GLOSSARY_KV.get(TP + id, 'json'); if (t && Date.now() - (t.createdAt || 0) > MAX_AGE) { await env.GLOSSARY_KV.delete(TP + id); return null; } return t || null; };
const delFile = async (env, k) => { if (k) { try { await deleteDerivedFile(env, k); } catch { /* 정리 실패 무시 */ } } };
async function refsOf(env, dir) { // 비주얼 디렉션의 그림체 레퍼런스(최대 3장)
  const out = []; for (const u of dir.refs || []) { const m = REF_OK.exec(u || ''), o = m && await env.CLIPS_R2.get(m[1]); if (o) out.push({ bytes: await o.arrayBuffer(), mime: (o.httpMetadata && o.httpMetadata.contentType) || TYPE_OF[(m[1].split('.').pop() || '').toLowerCase()] || 'image/png' }); }
  return out;
}

const hasAI = env => !!(env.ANTHROPIC_API_KEY || env.OPENAI_API_KEY);
async function askBrief(env, scene, dir) { // 독백 → 장면 연출 JSON
  const errs = [], user = briefUser(scene, dir);
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await aiFetch(env, 'onboard-brief', 'https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 1200, system: BRIEF_SYSTEM, messages: [{ role: 'user', content: user }] }) });
      if (r.ok) { const d = await r.json(); return parseBrief((d.content || []).filter(x => x.type === 'text').map(x => x.text).join('')); }
      errs.push('anthropic ' + r.status);
    } catch (e) { errs.push('anthropic ' + ((e && e.message) || e)); }
  }
  if (env.OPENAI_API_KEY) {
    try {
      const r = await aiFetch(env, 'onboard-brief', 'https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
        body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: BRIEF_SYSTEM, input: user }) });
      if (r.ok) { const d = await r.json(); return parseBrief(typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join('')); }
      errs.push('openai ' + r.status);
    } catch (e) { errs.push('openai ' + ((e && e.message) || e)); }
  }
  throw new Error(errs.length ? '연출을 짜지 못했습니다: ' + errs.join(' / ') : 'AI 키가 없습니다(ANTHROPIC_API_KEY 또는 OPENAI_API_KEY) — 연출을 직접 적어 저장해 주세요');
}
const loadBriefs = async env => (await env.GLOSSARY_KV.get(BKEY, 'json')) || {};
async function saveBrief(env, scene, b, by) { const all = await loadBriefs(env); all[scene.id] = { ...cleanBrief(b), src: srcOf(scene), by, at: new Date().toISOString() }; await env.GLOSSARY_KV.put(BKEY, JSON.stringify(all)); return all[scene.id]; }
const briefView = (b, scene) => (b ? { ...cleanBrief(b), by: b.by || '', at: b.at || '', stale: b.src !== srcOf(scene) } : null);

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const task = new URL(request.url).searchParams.get('task') || '';
  if (!task) {
    const l = await env.GLOSSARY_KV.list({ prefix: TP }), tasks = [];
    for (const k of (l && l.keys) || []) { const id = k.name.slice(TP.length), t = await getTask(env, id), m = TASK.exec(id); if (t && m) tasks.push({ id, scene: m[1], orient: m[2], createdAt: t.createdAt }); }
    return json({ providers: { openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY }, kling: klingEnabled(env), r2: !!env.CLIPS_R2, models: { openai: env.PANEL_IMAGE_MODEL || 'gpt-image-2', gemini: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' }, orient: ORIENT, tasks });
  }
  if (!TASK.test(task)) return json({ error: '작업 id 가 올바르지 않습니다' }, 400);
  if (!klingEnabled(env)) return json({ error: KLING_ENV_HELP }, 501);
  const t = await getTask(env, task); if (!t) return json({ error: '진행 중인 영상 작업이 없습니다(이미 끝났거나 오래되어 지워졌습니다)' }, 404);
  let q; try { q = await klingQuery(env, t.taskId); } catch (e) { return json({ error: e.message }, 502); }
  if (q.status === 'processing') return json({ status: 'processing' });
  const finish = async () => { await env.GLOSSARY_KV.delete(TP + task); await delFile(env, t.startKey); };
  if (q.status === 'failed') { await finish(); return json({ status: 'failed', error: q.msg }); }
  if (!/^https:\/\//.test(q.url || '')) return json({ error: '영상 주소가 올바르지 않습니다' }, 502);
  let buf; try { const vr = await fetch(q.url, { signal: AbortSignal.timeout(110000) }); if (!vr.ok) return json({ error: '영상을 내려받지 못했습니다(' + vr.status + '). 잠시 뒤 다시 확인해 주세요' }, 502); buf = await vr.arrayBuffer(); } catch (e) { return json({ error: '영상을 내려받지 못했습니다: ' + e.message }, 502); }
  if (!buf.byteLength || buf.byteLength > MAX_VIDEO) return json({ error: '영상 크기가 올바르지 않습니다' }, 502);
  const m = TASK.exec(task), key = 'onbvid-' + m[1] + '-' + m[2] + '-' + rnd(4) + '.mp4';
  await putDerivedFile(env, key, buf, { httpMetadata: { contentType: 'video/mp4' } }); await finish();
  return json({ status: 'done', id: task, key, url: '/api/clipfile?k=' + key });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const scene = cleanScene(b && b.scene), orient = orientOf(b && b.orient), dir = await loadDir(env);
  if (!scene.id) return json({ error: '장면 id 가 올바르지 않습니다' }, 400);
  let brief = (await loadBriefs(env))[scene.id] || null;
  if (b.brief === 'ai') { let nb; try { nb = await askBrief(env, scene, dir); } catch (e) { return json({ error: e.message }, 502); } brief = await saveBrief(env, scene, nb, 'ai'); return json({ ok: true, brief: briefView(brief, scene) }); }
  if (b.brief === 'save') { const nb = cleanBrief(b); if (!nb.pc && !nb.mobile) return json({ error: 'PC 또는 모바일 연출을 적어 주세요' }, 400); brief = await saveBrief(env, scene, nb, 'admin'); return json({ ok: true, brief: briefView(brief, scene) }); }
  const fresh = brief && brief.src === srcOf(scene) ? brief : null;
  if (b.promptOnly) return json({ ok: true, prompt: scenePrompt(scene, dir, orient, fresh), motion: sceneMotion(scene, orient, fresh), brief: briefView(brief, scene), ai: hasAI(env), refs: dir.refs.length });
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 파일을 저장할 수 없습니다' }, 501);

  if (b.video) {
    if (!klingEnabled(env)) return json({ error: KLING_ENV_HELP }, 501);
    if (!FK.test(b.startKey || '')) return json({ error: '시작 프레임 키가 올바르지 않습니다' }, 400);
    const id = scene.id + '.' + orient; if (await getTask(env, id)) return json({ error: '이 장면(' + ORIENT[orient].label + ')은 이미 영상을 만드는 중입니다' }, 409);
    const h = await env.CLIPS_R2.head(b.startKey); if (!h) return json({ error: '시작 프레임 파일을 찾을 수 없습니다. 다시 시도해 주세요' }, 410);
    if (!/^image\/(jpeg|png)$/.test((h.httpMetadata && h.httpMetadata.contentType) || '')) return json({ error: '시작 프레임은 JPG 또는 PNG 여야 합니다' }, 400);
    if (h.size > MAX_START) return json({ error: '시작 프레임이 10MB 를 넘습니다' }, 400);
    const obj = await env.CLIPS_R2.get(b.startKey); if (!obj) return json({ error: '시작 프레임 파일을 읽지 못했습니다' }, 410);
    const d = sceneMotion(scene, orient, fresh), prompt = (typeof b.prompt === 'string' && b.prompt.trim() ? b.prompt.trim().slice(0, 2000) : d.prompt) + (typeof b.extra === 'string' && b.extra.trim() ? ' Additional direction: ' + b.extra.trim().slice(0, 600) : ''),
      negative = d.negative + (typeof b.negativeExtra === 'string' && b.negativeExtra.trim() ? ', ' + b.negativeExtra.trim().slice(0, 300) : '');
    const here = new URL(request.url), imageUrl = here.protocol === 'https:' ? here.origin + '/api/clipfile?k=' + encodeURIComponent(b.startKey) : '';
    let taskId; try { taskId = await klingSubmit(env, { imageUrl, b64: async () => toB64(new Uint8Array(await obj.arrayBuffer())), prompt, negative, mode: b.mode, duration: b.duration }); } catch (e) { await delFile(env, b.startKey); return json({ error: e.message }, 502); }
    await env.GLOSSARY_KV.put(TP + id, JSON.stringify({ taskId, startKey: b.startKey, createdAt: Date.now() }), { expirationTtl: 86400 });
    return json({ ok: true, id, taskId });
  }

  const only = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '', custom = typeof b.prompt === 'string' && b.prompt.trim();
  let use = fresh, auto = false; if (!custom && !use && hasAI(env)) { try { use = await saveBrief(env, scene, await askBrief(env, scene, dir), 'ai'); auto = true; } catch { use = null; } } // 연출이 없거나 문구가 바뀌었으면 먼저 짠다(실패하면 독백만으로)
  let prompt = custom ? b.prompt.trim().slice(0, 3000) : scenePrompt(scene, dir, orient, use);
  if (typeof b.extra === 'string' && b.extra.trim()) prompt += '\n추가 요청: ' + b.extra.trim().slice(0, 500);
  const refs = b.useRefs === false ? [] : await refsOf(env, dir); if (refs.length) prompt = REF_USE[dir.refUse][1] + '\n' + prompt;
  let g; try { g = await generate(env, prompt, only, refs.length ? refs : null, { size: ORIENT[orient].size, aspect: ORIENT[orient].aspect }); } catch (e) { return json({ error: e.message }, 502); }
  const key = 'onbart-' + scene.id + '-' + orient + '-' + rnd(4) + '.' + g.ext;
  await putDerivedFile(env, key, g.bytes, { httpMetadata: { contentType: g.mime } });
  return json({ ok: true, key, url: '/api/clipfile?k=' + key, orient, field: ORIENT[orient].field, provider: g.provider, model: g.model, refs: refs.length, briefUsed: !!use && !custom, autoBrief: auto, brief: briefView(use, scene) });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const sp = new URL(request.url).searchParams, task = sp.get('task') || '', k = sp.get('k') || '';
  if (task) { if (!TASK.test(task)) return json({ error: '작업 id 가 올바르지 않습니다' }, 400); const t = await getTask(env, task); if (t) { await env.GLOSSARY_KV.delete(TP + task); await delFile(env, t.startKey); } return json({ ok: true }); }
  if (!OWN.test(k)) return json({ error: '이 화면에서 만든 파일만 지울 수 있습니다' }, 400);
  await delFile(env, k); return json({ ok: true });
}
