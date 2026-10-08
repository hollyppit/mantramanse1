// 무빙툰 컷 영상 생성(Kling 이미지 → 영상) — 칸에 있는 이미지를 시작 프레임으로 영상을 만들어 그 칸의 영상으로 저장한다 (관리자 전용)
// GET    /api/panel-video             — { enabled(Kling 키 설정 여부), tasks:[진행 중 작업] }
// POST   /api/panel-video { kind, element, theme, startKey, prompt?, negative?, mode? } — 시작 프레임(관리자 화면이 JPEG 로 변환해 /api/clipfile 로 올린 키)으로 Kling 작업 제출
// GET    /api/panel-video?id=<칸 id> — 작업 조회: processing | failed | done(영상을 R2 에 저장하고 칸의 panelVideo 로 교체)
// DELETE /api/panel-video?id=<칸 id> — 진행 중 기록 지우기(Kling 쪽 작업은 계속되며 크레딧은 이미 쓰였다)
// 필요: GLOSSARY_KV · CLIPS_R2 · ADMIN_PASSWORD · KLING_ACCESS_KEY · KLING_SECRET_KEY
import { json, isAdmin, configError } from '../_lib.js';
import { ELEMENTS, THEMES, presetId, mediaItem, kindOf } from '../_panelart.js';
import { kling as klingPrompt } from '../_panelprompts.js';
import { klingEnabled, KLING_ENV_HELP, klingSubmit, klingQuery, toB64 } from '../_kling.js';

const KEY = 'media:index', TKEY = 'panel:vtasks', FK = /^[\w.-]{1,120}$/, ID_OK = /^panel(bg)?-[a-z]+-[a-z]+(-[FM])?$/, KEY_OK = /^\/api\/clipfile\?k=([\w.-]{1,120})$/;
const MAX_START = 10 * 1024 * 1024, MAX_VIDEO = 80 * 1024 * 1024, MAX_AGE = 3 * 3600 * 1000;
const fileKey = u => { const m = KEY_OK.exec(u || ''); return m ? m[1] : ''; };
const loadTasks = async env => { const t = (await env.GLOSSARY_KV.get(TKEY, 'json')) || {}, now = Date.now(); for (const k of Object.keys(t)) if (now - (t[k].createdAt || 0) > MAX_AGE) delete t[k]; return t; }; // 3시간 넘은 기록은 버린다
const saveTasks = (env, t) => env.GLOSSARY_KV.put(TKEY, JSON.stringify(t));
const delFile = async (env, k) => { if (k) { try { await env.CLIPS_R2.delete(k); } catch { /* 정리 실패 무시 */ } } };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const id = new URL(request.url).searchParams.get('id') || '', tasks = await loadTasks(env);
  if (!id) return json({ enabled: klingEnabled(env), tasks: Object.keys(tasks).map(k => ({ id: k, kind: tasks[k].kind, element: tasks[k].element, theme: tasks[k].theme, createdAt: tasks[k].createdAt })) });
  if (!klingEnabled(env)) return json({ error: KLING_ENV_HELP }, 501);
  if (!ID_OK.test(id) || !tasks[id]) return json({ error: '진행 중인 영상 작업이 없습니다(이미 끝났거나 오래되어 지워졌습니다)' }, 404);
  const t = tasks[id]; let q; try { q = await klingQuery(env, t.taskId); } catch (e) { return json({ error: e.message }, 502); }
  if (q.status === 'processing') return json({ status: 'processing' });
  const finish = async () => { delete tasks[id]; await saveTasks(env, tasks); await delFile(env, t.startKey); };
  if (q.status === 'failed') { await finish(); return json({ status: 'failed', error: q.msg }); }
  // 완료: 영상을 내려받아 R2 에 저장하고 칸의 영상으로 교체(정지 이미지는 포스터로 그대로)
  if (!/^https:\/\//.test(q.url)) return json({ error: '영상 주소가 올바르지 않습니다' }, 502);
  let buf; try { const vr = await fetch(q.url, { signal: AbortSignal.timeout(110000) }); if (!vr.ok) return json({ error: '영상을 내려받지 못했습니다(' + vr.status + '). 잠시 뒤 다시 확인해 주세요' }, 502); buf = await vr.arrayBuffer(); } catch (e) { return json({ error: '영상을 내려받지 못했습니다: ' + e.message }, 502); }
  if (!buf.byteLength || buf.byteLength > MAX_VIDEO) return json({ error: '영상 크기가 올바르지 않습니다' }, 502);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === id);
  if (!old || !old.url) { await finish(); return json({ status: 'failed', error: '그 사이 칸의 이미지가 없어져 영상을 붙이지 못했습니다' }); }
  const key = id + '-k-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('') + '.mp4';
  await env.CLIPS_R2.put(key, buf, { httpMetadata: { contentType: 'video/mp4' } });
  const item = mediaItem(t.element, t.theme, old.url, buf.byteLength, 'Kling', '/api/clipfile?k=' + key, t.kind);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== id).concat(item)));
  await delFile(env, fileKey(old.panelVideo)); await finish();
  return json({ status: 'done', id, url: old.url, video: item.panelVideo });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (!klingEnabled(env)) return json({ error: KLING_ENV_HELP }, 501);
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 영상을 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!ELEMENTS[b.element] || !THEMES[b.theme]) return json({ error: '오행·주제 값이 올바르지 않습니다' }, 400);
  if (!FK.test(b.startKey || '')) return json({ error: '시작 프레임 키가 올바르지 않습니다' }, 400);
  const kind = kindOf(b.kind), id = presetId(b.element, b.theme, kind), tasks = await loadTasks(env);
  if (tasks[id]) return json({ error: '이 칸은 이미 영상을 만드는 중입니다' }, 409);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], cell = list.find(m => m.id === id);
  if (!cell || !cell.url) return json({ error: '이 칸에 이미지가 없습니다. 먼저 이미지를 만들거나 올려 주세요' }, 400);
  const h = await env.CLIPS_R2.head(b.startKey); if (!h) return json({ error: '시작 프레임 파일을 찾을 수 없습니다. 다시 시도해 주세요' }, 410);
  if (!/^image\/(jpeg|png)$/.test((h.httpMetadata && h.httpMetadata.contentType) || '')) return json({ error: '시작 프레임은 JPG 또는 PNG 여야 합니다' }, 400);
  if (h.size > MAX_START) return json({ error: '시작 프레임이 10MB 를 넘습니다' }, 400);
  const obj = await env.CLIPS_R2.get(b.startKey); if (!obj) return json({ error: '시작 프레임 파일을 읽지 못했습니다' }, 410);
  const dflt = klingPrompt(b.element, b.theme, kind), prompt = typeof b.prompt === 'string' && b.prompt.trim() ? b.prompt.trim() : dflt.prompt, negative = typeof b.negative === 'string' && b.negative.trim() ? b.negative.trim() : dflt.negative;
  // 신형 API 는 이미지 URL 을 받는다(시작 프레임은 /api/clipfile 로 공개돼 있고 키는 추측 불가). https 가 아니면(로컬 등) base64 로 보낸다.
  const here = new URL(request.url), imageUrl = here.protocol === 'https:' ? here.origin + '/api/clipfile?k=' + encodeURIComponent(b.startKey) : '';
  let taskId; try { taskId = await klingSubmit(env, { imageUrl, b64: async () => toB64(new Uint8Array(await obj.arrayBuffer())), prompt, negative, mode: b.mode, duration: b.duration }); } catch (e) { await delFile(env, b.startKey); return json({ error: e.message }, 502); }
  tasks[id] = { taskId, startKey: b.startKey, kind, element: b.element, theme: b.theme, createdAt: Date.now() }; await saveTasks(env, tasks);
  return json({ ok: true, id, taskId });
}

export async function onRequestDelete({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const id = new URL(request.url).searchParams.get('id') || '', tasks = await loadTasks(env);
  if (ID_OK.test(id) && tasks[id]) { const t = tasks[id]; delete tasks[id]; await saveTasks(env, tasks); await delFile(env, t.startKey); }
  return json({ ok: true });
}
