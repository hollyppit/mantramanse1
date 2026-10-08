// 풀이 화면 이미지(자동차·직업·배우자 인상·전생) 생성 (관리자 전용) — 비주얼 디렉션은 /api/panel-art 의 설정을 같이 쓴다.
// GET  /api/asset-art                              — 슬롯 71개(현재 이미지·프롬프트) + 그룹 이름 + 사용 가능한 모델
// POST /api/asset-art { slot, preview?, prompt?, extra?, fromCurrent?, provider?, useDefault? } — 생성. preview:true 면 임시 파일만(확정은 accept)
//      { slot, accept:키 } 확정(옛 파일 삭제) · { discard:키 } 임시 파일 삭제
// 확정한 주소는 KV 'assets:map' 에 저장되고 공개 GET /api/assets 로 뷰어에 전달된다. 이미지는 R2(CLIPS_R2).
import { json, isAdmin, configError } from '../_lib.js';
import { generate, cleanDirection } from '../_panelart.js';
import { GROUPS, slots, SLOT_BY_ID, keyOf, SLOT_KEY, promptOf, klingOf } from '../_assetart.js';

const TKEY = 'assets:trend', VKEY = 'assets:video', FK = /^[\w.-]{1,120}$/, fileOf = u => { const m = /^\/api\/clipfile\?k=([\w.-]{1,120})$/.exec(u || ''); return m ? m[1] : ''; }, MKEY = 'assets:map', PKEY = 'assets:prompts', DKEY = 'panel:direction', PREV = /^assetprev-[\w.-]{1,100}$/, TYPE_OF = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg' };
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => x.toString(16).padStart(2, '0')).join('');
const loadDir = async env => cleanDirection(await env.GLOSSARY_KV.get(DKEY, 'json'));
const refOf = async (env, url) => { const m = /^\/api\/clipfile\?k=([\w.-]{1,120})$/.exec(url || ''), o = m && await env.CLIPS_R2.get(m[1]); return o ? { bytes: await o.arrayBuffer(), mime: (o.httpMetadata && o.httpMetadata.contentType) || 'image/webp' } : null; };

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const vids = (await env.GLOSSARY_KV.get(VKEY, 'json')) || {}, map = (await env.GLOSSARY_KV.get(MKEY, 'json')) || {}, trend = (await env.GLOSSARY_KV.get(TKEY, 'json')) || '', saved = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, dir = await loadDir(env);
  return json({ trend: typeof trend === 'string' ? trend : '', groups: GROUPS, slots: slots().map(s => ({ ...s, url: map[s.id] || '', video: vids[s.id] || '', tools: klingOf(s.id), prompt: saved[s.id] || promptOf(s.id, dir, trend), custom: !!saved[s.id], defaultPrompt: promptOf(s.id, dir, trend) })),
    providers: { openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY }, r2: !!env.CLIPS_R2, models: { openai: env.PANEL_IMAGE_MODEL || 'gpt-image-2', gemini: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' } });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 이미지를 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (b.discard) { if (!PREV.test(b.discard)) return json({ error: '키가 올바르지 않습니다' }, 400); try { await env.CLIPS_R2.delete(b.discard); } catch { /* 이미 없음 */ } return json({ ok: true }); }
  if (typeof b.trend === 'string' && !b.slot) { const t = b.trend.trim().slice(0, 400); await env.GLOSSARY_KV.put(TKEY, JSON.stringify(t)); return json({ ok: true, trend: t }); } // 이번 시즌 트렌드 메모(패션 이미지 프롬프트에 들어간다)
  const slot = SLOT_BY_ID[b.slot]; if (!slot) return json({ error: '슬롯 id 가 올바르지 않습니다' }, 400);
  const id = slot.id, only = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '', dir = await loadDir(env), map = (await env.GLOSSARY_KV.get(MKEY, 'json')) || {}, prompts = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, trend = (await env.GLOSSARY_KV.get(TKEY, 'json')) || '';
  const delOld = async () => { const m = /^\/api\/clipfile\?k=(asset-[\w.-]+)$/.exec(map[id] || ''); if (m) { try { await env.CLIPS_R2.delete(m[1]); } catch { /* 무시 */ } } };
  const setUrl = async url => { map[id] = url; await env.GLOSSARY_KV.put(MKEY, JSON.stringify(map)); };
  if (b.uploadVideo || b.clearVideo) { // 올려 둔(또는 Kling 으로 만든) 영상으로 이 슬롯을 교체 / 영상 제거 — 정지 이미지는 그대로(포스터)
    const vids = (await env.GLOSSARY_KV.get(VKEY, 'json')) || {}, old = fileOf(vids[id]);
    if (b.clearVideo) { delete vids[id]; await env.GLOSSARY_KV.put(VKEY, JSON.stringify(vids)); if (old) { try { await env.CLIPS_R2.delete(old); } catch { /* 무시 */ } } return json({ ok: true, id, video: '' }); }
    if (!map[id]) return json({ error: '이 슬롯에 이미지가 먼저 있어야 합니다' }, 400);
    if (!FK.test(b.uploadVideo)) return json({ error: '키가 올바르지 않습니다' }, 400);
    if (!(await env.CLIPS_R2.head(b.uploadVideo))) return json({ error: '올린 영상을 찾을 수 없습니다. 다시 올려 주세요' }, 410);
    vids[id] = '/api/clipfile?k=' + b.uploadVideo; await env.GLOSSARY_KV.put(VKEY, JSON.stringify(vids));
    if (old && old !== b.uploadVideo) { try { await env.CLIPS_R2.delete(old); } catch { /* 무시 */ } }
    return json({ ok: true, id, url: map[id], video: vids[id] });
  }
  if (b.accept) {
    if (!PREV.test(b.accept)) return json({ error: '키가 올바르지 않습니다' }, 400);
    const o = await env.CLIPS_R2.get(b.accept); if (!o) return json({ error: '미리보기 파일이 만료되었습니다. 다시 만들어 주세요' }, 410);
    const ext = b.accept.split('.').pop() || 'webp', key = keyOf(id) + '-' + rnd(4) + '.' + ext, buf = await o.arrayBuffer();
    await env.CLIPS_R2.put(key, buf, { httpMetadata: { contentType: TYPE_OF[ext] || 'image/webp' } }); try { await env.CLIPS_R2.delete(b.accept); } catch { /* 무시 */ }
    await delOld(); await setUrl('/api/clipfile?k=' + key);
    if (typeof b.prompt === 'string' && b.prompt.trim() && b.prompt.trim() !== promptOf(id, dir, trend)) { prompts[id] = b.prompt.trim().slice(0, 2500); await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
    return json({ ok: true, id, url: '/api/clipfile?k=' + key });
  }
  if (b.useDefault && prompts[id]) { delete prompts[id]; await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
  let prompt = typeof b.prompt === 'string' && b.prompt.trim() ? b.prompt.trim().slice(0, 2500) : (prompts[id] || promptOf(id, dir, trend)), ref = null;
  if (b.fromCurrent) { ref = await refOf(env, map[id]); if (!ref) return json({ error: '바탕으로 쓸 현재 이미지가 없습니다' }, 400);
    prompt = '첨부한 이미지를 바탕으로, 같은 구도와 그림체를 유지하면서 아래 요청만 반영해 다시 그린다. 화면 안에 글자·숫자·로고는 넣지 않는다.\n수정 요청: ' + (String(b.extra || '').trim().slice(0, 500) || '전체적으로 조금 더 선명하게'); }
  else if (typeof b.extra === 'string' && b.extra.trim()) prompt += '\n추가 요청: ' + b.extra.trim().slice(0, 500);
  { const av = typeof b.avoid === 'string' ? b.avoid.trim().slice(0, 400) : ''; if (av) prompt += '
반드시 피할 것(화면에 넣지 말 것): ' + av; }
  let g; try { g = await generate(env, prompt, only, ref); } catch (e) { return json({ error: e.message }, 502); }
  if (b.preview) { const pk = 'assetprev-' + rnd(8) + '.' + g.ext; await env.CLIPS_R2.put(pk, g.bytes, { httpMetadata: { contentType: g.mime } }); return json({ ok: true, preview: pk, url: '/api/clipfile?k=' + pk, provider: g.provider, model: g.model }); }
  const key = keyOf(id) + '-' + rnd(4) + '.' + g.ext; await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
  await delOld(); await setUrl('/api/clipfile?k=' + key);
  return json({ ok: true, id, url: '/api/clipfile?k=' + key, provider: g.provider, model: g.model });
}
