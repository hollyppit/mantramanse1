// 무빙툰 패널 이미지 생성 (관리자 전용)
// GET  /api/panel-art                       — 프리셋 50개(오행 5 × 주제 10) + 이미 만들어진 것 + 사용 가능한 모델
// POST /api/panel-art { element, theme, provider? } — 한 장 생성 → R2 저장 → 미디어 라이브러리(media:index)에 태그와 함께 등록(같은 프리셋이면 교체)
// POST /api/panel-art { slot:{ chapterId, title, tags:{element,state,emotion,scene,theme,action} }, provider? } — 조합 테스트의 "필요한 클립 소스" 칸 하나에 맞는 이미지를 만들어 그 챕터 전용으로 등록
// 필요: GLOSSARY_KV · CLIPS_R2 · ADMIN_PASSWORD · OPENAI_API_KEY(gpt-image-2) 및/또는 GEMINI_API_KEY. 한 번에 한 장씩 부른다(화면이 "빈 것만 모두 만들기"로 반복 호출).
import { json, isAdmin, configError } from '../_lib.js';
import { ELEMENTS, THEMES, presets, promptFor, presetId, mediaItem, slotPrompt, slotItem, generate } from '../_panelart.js';

const KEY = 'media:index';
const KEY_OK = /^\/api\/clipfile\?k=([\w.-]{1,120})$/;

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], by = new Map(list.map(m => [m.id, m]));
  return json({ presets: presets().map(p => ({ ...p, url: (by.get(p.id) || {}).url || '' })), providers: { openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY }, r2: !!env.CLIPS_R2,
    models: { openai: env.PANEL_IMAGE_MODEL || 'gpt-image-2', gemini: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' } });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 이미지를 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const only0 = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '';
  if (b.slot && typeof b.slot === 'object') {
    const sl = b.slot; let g; try { g = await generate(env, slotPrompt(sl.tags, sl.title), only0); } catch (e) { return json({ error: e.message }, 502); }
    const key = 'ai-' + Array.from(crypto.getRandomValues(new Uint8Array(8)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
    await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
    const url = '/api/clipfile?k=' + key, item = slotItem(sl.chapterId, sl.title, sl.tags, url, g.bytes.length, g.provider + ':' + g.model);
    const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [];
    await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.concat(item)));
    return json({ ok: true, media: item, provider: g.provider, model: g.model });
  }
  if (!ELEMENTS[b.element] || !THEMES[b.theme]) return json({ error: '오행·주제 값이 올바르지 않습니다' }, 400);
  const only = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '';
  let g; try { g = await generate(env, promptFor(b.element, b.theme), only); } catch (e) { return json({ error: e.message }, 502); }
  const key = presetId(b.element, b.theme) + '-' + Array.from(crypto.getRandomValues(new Uint8Array(4)), x => x.toString(16).padStart(2, '0')).join('') + '.' + g.ext;
  await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
  const url = '/api/clipfile?k=' + key, item = mediaItem(b.element, b.theme, url, g.bytes.length, g.provider + ':' + g.model);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [], old = list.find(m => m.id === item.id);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify(list.filter(m => m.id !== item.id).concat(item)));
  const mm = old && KEY_OK.exec(old.url || ''); if (mm) { try { await env.CLIPS_R2.delete(mm[1]); } catch { /* 옛 파일 정리 실패는 무시 */ } }
  return json({ ok: true, id: item.id, url, provider: g.provider, model: g.model });
}
