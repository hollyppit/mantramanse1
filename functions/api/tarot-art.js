// 타로 카드 78장 이미지 생성 (관리자 전용) — 화풍·감성·세계관·분위기 + 레퍼런스(참고) 이미지 + 카드별 세부 수정
// GET  /api/tarot-art                         — 카드 78장(현재 이미지·프롬프트) + 비주얼 디렉션 + 선택지 + 사용 가능한 모델
// PUT  /api/tarot-art { direction }           — 비주얼 디렉션 저장(art·feel·world·mood·frame·label·extra·refs[최대3]·refUse). 새로 만드는 이미지부터 적용
// POST /api/tarot-art { card, preview?, prompt?, extra?, fromCurrent?, refs?, useGlobalRefs?, provider?, useDefault? } — 한 장 생성
//        preview:true 면 임시 파일(tarotprev-…)만 만들고 { preview, url } 반환 · { card, accept:키 } 확정 · { discard:키 } 임시 파일 삭제
// 공통 프레임: POST { genFrame:true, extra?, provider?, useGlobalRefs? } 마젠타 그림 창이 있는 프레임 후보(임시 파일) 생성 · POST { setFrame:{url,win:[x,y,w,h]} | null } 적용/해제(free:content 의 tarot.frame, 적용하면 카드 틀 디렉션이 '그림만 생성'으로 바뀐다)
// 확정된 이미지는 R2 에 저장되고 free:content 의 tarot.images[카드id] 에 들어간다(타로 화면이 이 값을 그대로 쓴다).
// 레퍼런스 이미지는 관리자 업로드(/api/clipfile)로 올린 파일이며, 이미지 모델(gpt-image-2 edits / Gemini)에 참고 이미지로 함께 보낸다.
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';
import { generate } from '../_panelart.js';
import { CARDS, CARD_BY_ID, TAROT_OPTIONS, REF_USE, REF_OK, cleanRefs, cleanTarotDir, tarotPrompt, framePrompt } from '../_tarotart.js';

const FREE = 'free:content', DKEY = 'tarot:direction', PKEY = 'tarot:prompts';
const PREV_KEY = /^tarotprev-[\w.-]{1,100}$/, TYPE_OF = { webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }, OPTS = { size: '1024x1536', aspect: '2:3' };
const rnd = n => Array.from(crypto.getRandomValues(new Uint8Array(n)), x => x.toString(16).padStart(2, '0')).join('');
const loadDir = async env => cleanTarotDir(await env.GLOSSARY_KV.get(DKEY, 'json'));
const DEFAULT_FRAME = '/report/hub/tarot/frame-default.svg', frameOf = async env => (((await kvOf(env, { cache: false }).get(FREE, 'json')) || {}).tarot || {}).frame || null;
const imagesOf = async env => (((await kvOf(env, { cache: false }).get(FREE, 'json')) || {}).tarot || {}).images || {};
async function r2Ref(env, url) { // /api/clipfile?k=… → { bytes, mime } (없으면 null)
  const m = REF_OK.exec(url || ''); if (!m) return null; const o = await env.CLIPS_R2.get(m[1]); if (!o) return null;
  const ext = (m[1].split('.').pop() || '').toLowerCase(); return { bytes: await o.arrayBuffer(), mime: (o.httpMetadata && o.httpMetadata.contentType) || TYPE_OF[ext] || 'image/png' };
}
async function setFrame(env, fr) { // free:content 의 tarot.frame 갱신(null 이면 해제)
  const kv = kvOf(env), cur = (await kv.get(FREE, 'json')) || {}, tarot = { ...(cur.tarot || { cards: {} }) }; if (fr) tarot.frame = fr; else delete tarot.frame;
  await kv.put(FREE, JSON.stringify({ ...cur, tarot, version: 'f' + Date.now().toString(36) }));
}
async function setImage(env, id, url) { // free:content 의 tarot.images 갱신(다른 내용은 그대로)
  const kv = kvOf(env), cur = (await kv.get(FREE, 'json')) || {}, tarot = cur.tarot || { cards: {} };
  const next = { ...cur, tarot: { ...tarot, images: { ...(tarot.images || {}), [id]: url } }, version: 'f' + Date.now().toString(36) }; await kv.put(FREE, JSON.stringify(next));
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  const dir = await loadDir(env), saved = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, imgs = await imagesOf(env);
  return json({ cards: CARDS.map(c => ({ id: c.id, suit: c.suit, rank: c.rank, nameKo: c.nameKo, nameEn: c.nameEn, url: imgs[c.id] || '', prompt: saved[c.id] || tarotPrompt(c, dir), custom: !!saved[c.id], defaultPrompt: tarotPrompt(c, dir) })), direction: dir, frame: await frameOf(env), defaultFrame: { url: DEFAULT_FRAME, win: [0.1, 0.0595, 0.8, 0.7381] },
    options: Object.fromEntries(Object.entries(TAROT_OPTIONS).map(([k, v]) => [k, { label: v.label, items: Object.fromEntries(Object.entries(v.items).map(([i, x]) => [i, x[0]])) }])), refUse: Object.fromEntries(Object.entries(REF_USE).map(([k, v]) => [k, v[0]])),
    providers: { openai: !!env.OPENAI_API_KEY, gemini: !!env.GEMINI_API_KEY }, r2: !!env.CLIPS_R2, models: { openai: env.PANEL_IMAGE_MODEL || 'gpt-image-2', gemini: env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image' } });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const d = cleanTarotDir(b.direction); await env.GLOSSARY_KV.put(DKEY, JSON.stringify(d)); return json({ ok: true, direction: d });
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  if (!env.CLIPS_R2) return json({ error: 'R2 바인딩(CLIPS_R2)이 없어 이미지를 저장할 수 없습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (b.discard) { if (!PREV_KEY.test(b.discard)) return json({ error: '키가 올바르지 않습니다' }, 400); try { await env.CLIPS_R2.delete(b.discard); } catch { /* 이미 없음 */ } return json({ ok: true }); }
  if ('setFrame' in b) {
    const f = b.setFrame; if (f === null) { await setFrame(env, null); return json({ ok: true, frame: null }); }
    const okWin = f && Array.isArray(f.win) && f.win.length === 4 && f.win.every(n => typeof n === 'number' && n >= 0 && n <= 1) && f.win[2] > 0.3 && f.win[3] > 0.3;
    if (!okWin || typeof f.url !== 'string' || !(f.url === DEFAULT_FRAME || REF_OK.test(f.url))) return json({ error: '프레임 정보가 올바르지 않습니다' }, 400);
    const fr = { url: f.url, win: f.win.map(n => Math.round(n * 10000) / 10000) }; await setFrame(env, fr);
    const d0 = await loadDir(env); await env.GLOSSARY_KV.put(DKEY, JSON.stringify({ ...d0, frame: 'overlay' })); return json({ ok: true, frame: fr });
  }
  if (b.genFrame) { // 프레임 후보: 전체 레퍼런스(화풍 참고)만 함께 보낸다
    const dirF = await loadDir(env), refsF = []; for (const u of (b.useGlobalRefs === false ? [] : dirF.refs)) { const r = await r2Ref(env, u); if (r) refsF.push(r); }
    const onlyF = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '';
    let g; try { g = await generate(env, (refsF.length ? REF_USE[dirF.refUse][1] + '\n' : '') + framePrompt(dirF, b.extra), onlyF, refsF.length ? refsF : null, OPTS); } catch (e) { return json({ error: e.message }, 502); }
    const pk = 'tarotprev-' + rnd(8) + '.' + g.ext; await env.CLIPS_R2.put(pk, g.bytes, { httpMetadata: { contentType: g.mime } });
    return json({ ok: true, preview: pk, url: '/api/clipfile?k=' + pk, provider: g.provider, model: g.model });
  }
  const card = CARD_BY_ID[b.card]; if (!card) return json({ error: '카드 id 가 올바르지 않습니다' }, 400);
  const id = card.id, only = b.provider === 'openai' || b.provider === 'gemini' ? b.provider : '', dir = await loadDir(env), prompts = (await env.GLOSSARY_KV.get(PKEY, 'json')) || {}, oldUrl = (await imagesOf(env))[id] || '';
  const delOld = async () => { const m = /^\/api\/clipfile\?k=(tarotai-[\w.-]+)$/.exec(oldUrl); if (m) { try { await env.CLIPS_R2.delete(m[1]); } catch { /* 무시 */ } } }; // 우리가 만든 파일만 지운다(직접 올린 파일은 건드리지 않는다)
  if (b.accept) { // 미리 만든 결과를 이 카드의 이미지로 확정
    if (!PREV_KEY.test(b.accept)) return json({ error: '키가 올바르지 않습니다' }, 400);
    const o = await env.CLIPS_R2.get(b.accept); if (!o) return json({ error: '미리보기 파일이 만료되었습니다. 다시 만들어 주세요' }, 410);
    const ext = b.accept.split('.').pop() || 'webp', key = 'tarotai-' + id + '-' + rnd(4) + '.' + ext, buf = await o.arrayBuffer();
    await env.CLIPS_R2.put(key, buf, { httpMetadata: { contentType: TYPE_OF[ext] || 'image/webp' } }); try { await env.CLIPS_R2.delete(b.accept); } catch { /* 무시 */ }
    await setImage(env, id, '/api/clipfile?k=' + key); await delOld();
    if (typeof b.prompt === 'string' && b.prompt.trim() && b.prompt.trim() !== tarotPrompt(card, dir)) { prompts[id] = b.prompt.trim().slice(0, 2500); await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
    return json({ ok: true, id, url: '/api/clipfile?k=' + key });
  }
  if (b.useDefault && prompts[id]) { delete prompts[id]; await env.GLOSSARY_KV.put(PKEY, JSON.stringify(prompts)); }
  // 참고 이미지: (전체 설정의 레퍼런스) + (이번 요청에서 올린 레퍼런스) + (현재 이미지를 바탕으로 수정할 때는 맨 앞에 현재 이미지)
  const refUrls = [...(b.useGlobalRefs === false ? [] : dir.refs), ...cleanRefs(b.refs)], refs = [];
  for (const u of [...new Set(refUrls)].slice(0, 4)) { const r = await r2Ref(env, u); if (r) refs.push(r); }
  let base = typeof b.prompt === 'string' && b.prompt.trim() ? b.prompt.trim().slice(0, 2500) : (prompts[id] || tarotPrompt(card, dir)), prompt;
  if (b.fromCurrent) {
    const cur = await r2Ref(env, oldUrl); if (!cur) return json({ error: '바탕으로 쓸 현재 이미지가 없습니다' }, 400); refs.unshift(cur);
    prompt = '첫 번째 첨부 이미지(현재 카드)를 바탕으로, 같은 구도와 그림체를 유지하면서 아래 요청만 반영해 다시 그린다.' + (refs.length > 1 ? ' 나머지 첨부 이미지는 참고용 레퍼런스다.' : '') + '\n수정 요청: ' + (String(b.extra || '').trim().slice(0, 500) || '전체적으로 조금 더 선명하게');
  } else {
    prompt = (refs.length ? REF_USE[dir.refUse][1] + '\n' : '') + base + (typeof b.extra === 'string' && b.extra.trim() ? '\n추가 요청: ' + b.extra.trim().slice(0, 500) : '');
  }
  let g; try { g = await generate(env, prompt, only, refs.length ? refs : null, OPTS); } catch (e) { return json({ error: e.message }, 502); }
  if (b.preview) {
    const pk = 'tarotprev-' + rnd(8) + '.' + g.ext; await env.CLIPS_R2.put(pk, g.bytes, { httpMetadata: { contentType: g.mime } });
    return json({ ok: true, preview: pk, url: '/api/clipfile?k=' + pk, provider: g.provider, model: g.model, refs: refs.length });
  }
  const key = 'tarotai-' + id + '-' + rnd(4) + '.' + g.ext; await env.CLIPS_R2.put(key, g.bytes, { httpMetadata: { contentType: g.mime } });
  await setImage(env, id, '/api/clipfile?k=' + key); await delOld();
  return json({ ok: true, id, url: '/api/clipfile?k=' + key, provider: g.provider, model: g.model, refs: refs.length });
}
