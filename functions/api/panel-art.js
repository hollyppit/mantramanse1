// 무빙툰 패널 이미지 생성 (관리자 전용)
// GET  /api/panel-art                       — 프리셋 50개(오행 5 × 주제 10) + 이미 만들어진 것 + 사용 가능한 모델
// POST /api/panel-art { element, theme, provider? } — 한 장 생성 → R2 저장 → 미디어 라이브러리(media:index)에 태그와 함께 등록(같은 프리셋이면 교체)
// POST /api/panel-art { slot:{ chapterId, title, tags:{element,state,emotion,scene,theme,action} }, provider? } — 조합 테스트의 "필요한 클립 소스" 칸 하나에 맞는 이미지를 만들어 그 챕터 전용으로 등록
// 필요: GLOSSARY_KV · CLIPS_R2 · ADMIN_PASSWORD · OPENAI_API_KEY(gpt-image-2) 및/또는 GEMINI_API_KEY. 한 번에 한 장씩 부른다(화면이 "빈 것만 모두 만들기"로 반복 호출).
import { json, isAdmin, configError } from '../_lib.js';
import { toolsFor } from '../_panelprompts.js';
import { ELEMENTS, THEMES, presets, promptFor, presetId, mediaItem, slotPrompt, slotItem, generate, DIRECTION_OPTIONS, cleanDirection, kindOf } from '../_panelart.js';

const KEY = 'media:index', PKEY = 'panel:prompts', DKEY = 'panel:direction';
const loadDir = async env => cleanDirection(await env.GLOSSARY_KV.get(DKEY, 'json'));
const PREV_KEY = /^panelprev-[\w.-]{1,100}$/, TYPE_OF = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };
const KEY_OK = /^\/api\/clipfile\?k=([\w.-]{1,120})$/;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], by = new Map(list.map(m => [m.id, m]));
  const saved = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, dir = await loadDir(env);
  return json({ presets: presets('panel').concat(presets('panelF'), presets('panelM'), presets('bg')).map(p => ({ ...p, url: (by.get(p.id) || {}).url || '', video: (by.get(p.id) || {}).panelVideo || '', prompt: saved[p.id] || promptFor(p.element, p.theme, dir, p.kind), custom: !!saved[p.id], defaultPrompt: promptFor(p.element, p.theme, dir, p.kind), tools: toolsFor(p.element, p.theme, dir, p.kind) })), direction: dir, directionOptions: Object.fromEntries(Object.entries(DIRECTION_OPTIONS).map(([k, v]) => [k, { label: v.label, items: Object.fromEntries(Object.entries(v.items).map(([i, x]) => [i, x[0]])) }])), providers: { openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY }, r2: !!env.CLIPS_R2,
    models: { openai: env.PANEL_IMAGE_MODEL || 'gpt-image-2', gemini: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' } });
}

// PUT /api/panel-art { direction:{look,world,mood,people,extra} } — 비주얼 디렉션 저장(이미 만든 이미지는 그대로, 새로 만들 때부터 적용)
export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const d = cleanDirection(b.direction); await env.GLOSSARY_KV.put(DKEY, JSON.stringify(d)); return json({ ok: true, direction: d });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 이미지를 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const only0 = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '';
  if (b.slot && typeof b.slot === 'object') {
    const sl = b.slot; let g; try { g = await generate(env, slotPrompt(sl.tags, sl.title, await loadDir(env)), only0); } catch (e) { return json({ error: e.message }, 502); }
    const key = 'ai-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
    await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
    const url = '/api/clipfile?k=' + key, item = slotItem(sl.chapterId, sl.title, sl.tags, url, g.bytes.length, g.provider + ':' + g.model);
    const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [];
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.concat(item)));
    return json({ ok: true, media: item, provider: g.provider, model: g.model });
  }
  if (b.uploadImage) { // 직접 만든 이미지(Leonardo 등)로 이 칸을 교체. 칸에 영상이 있으면 영상은 그대로 두고 정지 이미지(포스터)만 바뀐다.
    if (!ELEMENTS[b.element] || !THEMES[b.theme]) return json({ error: '오행·주제 값이 올바르지 않습니다' }, 400);
    if (!/^[\w.-]{1,120}$/.test(b.uploadImage)) return json({ error: '키가 올바르지 않습니다' }, 400);
    const kind = kindOf(b.kind), pid = presetId(b.element, b.theme, kind), h = await env.CLIPS_R2.head(b.uploadImage);
    if (!h) return json({ error: '올린 이미지를 찾을 수 없습니다. 다시 올려 주세요' }, 410);
    if (!/^image\//.test((h.httpMetadata && h.httpMetadata.contentType) || '')) return json({ error: '이미지 파일(jpg·png·webp)만 올릴 수 있습니다' }, 400);
    const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === pid), url = '/api/clipfile?k=' + b.uploadImage;
    const item = mediaItem(b.element, b.theme, url, h.size, '직접 업로드', (old && old.panelVideo) || '', kind);
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== pid).concat(item)));
    const mm = old && KEY_OK.exec(old.url || ''); if (mm && mm[1] !== b.uploadImage) { try { await env.CLIPS_R2.delete(mm[1]); } catch { /* 옛 파일 정리 실패는 무시 */ } }
    return json({ ok: true, id: pid, url, video: item.panelVideo });
  }
  if (b.uploadVideo || b.clearVideo) { // 올려 둔 영상(또는 영상 제거)으로 이 칸을 교체: 정지 이미지(포스터)는 그대로 두거나 함께 올린 것으로 바꾼다
    if (!ELEMENTS[b.element] || !THEMES[b.theme]) return json({ error: '오행·주제 값이 올바르지 않습니다' }, 400);
    const kind = kindOf(b.kind), pid = presetId(b.element, b.theme, kind), list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === pid), fileKey = u => { const m = KEY_OK.exec(u || ''); return m ? m[1] : ''; };
    const FK = /^[\w.-]{1,120}$/, delFile = async k => { if (k) { try { await env.CLIPS_R2.delete(k); } catch { /* 무시 */ } } };
    if (b.clearVideo) { if (!old || !old.panelVideo) return json({ ok: true, id: pid, url: (old && old.url) || '', video: '' }); const item = { ...old, panelVideo: '' }; await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.map(m => (m.id === pid ? item : m)))); await delFile(fileKey(old.panelVideo)); return json({ ok: true, id: pid, url: item.url, video: '' }); }
    if (!FK.test(b.uploadVideo) || (b.uploadPoster && !FK.test(b.uploadPoster))) return json({ error: '키가 올바르지 않습니다' }, 400);
    const vh = await env.CLIPS_R2.head(b.uploadVideo); if (!vh) return json({ error: '올린 영상을 찾을 수 없습니다. 다시 올려 주세요' }, 410);
    let posterUrl = b.uploadPoster ? '/api/clipfile?k=' + b.uploadPoster : (old && old.url) || '';
    if (!posterUrl) return json({ error: '정지 이미지(포스터)가 필요합니다. 이 칸에 이미지를 먼저 만들거나 포스터를 함께 올려 주세요' }, 400);
    const item = mediaItem(b.element, b.theme, posterUrl, vh.size, '영상 업로드', '/api/clipfile?k=' + b.uploadVideo, kind);
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== pid).concat(item)));
    if (old) { await delFile(fileKey(old.panelVideo)); if (b.uploadPoster && old.url !== posterUrl) await delFile(fileKey(old.url)); }
    return json({ ok: true, id: pid, url: posterUrl, video: item.panelVideo });
  }
  if (b.discard) { if (!PREV_KEY.test(b.discard)) return json({ error: '키가 올바르지 않습니다' }, 400); try { await env.CLIPS_R2.delete(b.discard); } catch { /* 이미 없음 */ } return json({ ok: true }); }
  if (!ELEMENTS[b.element] || !THEMES[b.theme]) return json({ error: '오행·주제 값이 올바르지 않습니다' }, 400);
  const only = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '', kind = kindOf(b.kind), id = presetId(b.element, b.theme, kind);
  const prompts = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, dir = await loadDir(env);
  if (b.accept) { // 미리 만든 결과를 이 칸의 컷으로 확정(옛 파일은 지운다). 프롬프트를 고쳤으면 이 칸의 기본 프롬프트로 저장한다.
    if (!PREV_KEY.test(b.accept)) return json({ error: '키가 올바르지 않습니다' }, 400);
    const obj = await env.CLIPS_R2.get(b.accept); if (!obj) return json({ error: '미리보기 파일이 만료되었습니다. 다시 만들어 주세요' }, 410);
    const ext = b.accept.split('.').pop() || 'webp', key = id + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('') + '.' + ext, buf = await obj.arrayBuffer();
    await env.CLIPS_R2.put(key, buf, { httpMetadata: { contentType: TYPE_OF[ext] || 'image/webp' } }); try { await env.CLIPS_R2.delete(b.accept); } catch { /* 정리 실패 무시 */ }
    const url = '/api/clipfile?k=' + key, item = mediaItem(b.element, b.theme, url, buf.byteLength, String(b.by || 'ai').slice(0, 40), '', kind), list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === item.id);
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== item.id).concat(item)));
    const mm = old && KEY_OK.exec(old.url || ''); if (mm) { try { await env.CLIPS_R2.delete(mm[1]); } catch { /* 무시 */ } }
    if (typeof b.prompt === 'string' && b.prompt.trim() && b.prompt.trim() !== promptFor(b.element, b.theme, dir, kind)) { prompts[id] = b.prompt.trim().slice(0, 2000); await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
    else if (b.resetPrompt && prompts[id]) { delete prompts[id]; await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
    return json({ ok: true, id, url });
  }
  if (b.useDefault && prompts[id]) { delete prompts[id]; await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); } // 칸별로 고친 프롬프트를 버리고 현재 비주얼 디렉션으로
  let prompt = typeof b.prompt === 'string' && b.prompt.trim() ? b.prompt.trim().slice(0, 2000) : (prompts[id] || promptFor(b.element, b.theme, dir, kind));
  let ref = null;
  if (b.fromCurrent) { // 지금 컷을 바탕으로 수정(추가 요청 = 무엇을 바꿀지)
    const cur = ((await env.GLOSSARY_KV.get(KEY, 'json')) || []).find(m => m.id === id), mk = cur && KEY_OK.exec(cur.url || ''), o = mk && await env.CLIPS_R2.get(mk[1]);
    if (!o) return json({ error: '바탕으로 쓸 현재 이미지가 없습니다' }, 400);
    ref = { bytes: await o.arrayBuffer(), mime: (o.httpMetadata && o.httpMetadata.contentType) || 'image/webp' };
    prompt = '첨부한 이미지를 바탕으로, 같은 구도와 그림체를 유지하면서 아래 요청만 반영해 다시 그린다. 화면 안에 글자·숫자·로고는 넣지 않는다.\n수정 요청: ' + (String(b.extra || '').trim().slice(0, 500) || '전체적으로 조금 더 선명하게');
  } else if (typeof b.extra === 'string' && b.extra.trim()) prompt += '\n추가 요청: ' + b.extra.trim().slice(0, 500);
  let g; try { g = await generate(env, prompt, only, ref); } catch (e) { return json({ error: e.message }, 502); }
  if (b.preview) { // 미리보기: 칸을 바꾸지 않고 임시 파일로 돌려준다(확정은 accept)
    const pk = 'panelprev-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
    await env.CLIPS_R2.put(pk, g.bytes, { httpMetadata: { contentType: g.mime } });
    return json({ ok: true, preview: pk, url: '/api/clipfile?k=' + pk, provider: g.provider, model: g.model });
  }
  const key = id + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
  await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
  const url = '/api/clipfile?k=' + key, item = mediaItem(b.element, b.theme, url, g.bytes.length, g.provider + ':' + g.model, '', kind);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === item.id);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== item.id).concat(item)));
  const mm = old && KEY_OK.exec(old.url || ''); if (mm) { try { await env.CLIPS_R2.delete(mm[1]); } catch { /* 옛 파일 정리 실패는 무시 */ } }
  return json({ ok: true, id: item.id, url, provider: g.provider, model: g.model });
}
