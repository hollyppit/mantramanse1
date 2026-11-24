// 사주 물상 그림(실사 풍경, 2026-11-24 수묵에서 바꿈) — 만세력 원국 탭 'AI로 물상 표현하기' 버튼이 부른다. 2026-11-24
// POST /api/mulsang-art { spec, sketch?, attempt?, force? }
//   · spec: mulsang.js fromChart() 명세(간지 번호·오행 비율·조후·용희기구신·합충만, 생년월일·이름 없음). 서버에서 clean() 으로 다시 검사하고
//     프롬프트·검사 목록도 서버에서 다시 만든다 → 이 주소로 임의 그림을 만들 수 없다.
//   · sketch: 브라우저가 명세로 그린 배치 밑그림 PNG(data URL, 2MB 이하). 이미지 모델에 참고 그림으로 넣어 자리·크기를 지키게 한다.
//   · 한 번 부르면 한 장 생성 + 비전 모델 검사. 통과하면 R2 에 저장(같은 명세는 다음부터 저장본을 바로 준다).
//     통과 못 하면 { pass:false, failed } — 브라우저가 attempt 를 올려 최대 3번까지 다시 부르고, 그래도 안 되면 밑그림을 보여 준다.
//   · 횟수 제한 없음(사용자 요청 2026-11-24). 공개 스위치 /api/luck-flags mulsangArt 가 켜졌거나 관리자일 때만 동작.
// 2026-11-24: kind='house' — 오행·강약 탭 '사주의 집'(saju-house.js) 실사 미니어처. 스위치 sajuHouse, 저장 키 house:·house-
// 필요: GLOSSARY_KV · CLIPS_R2 · OPENAI_API_KEY(그림 gpt-image-2 + 검사) 또는 GEMINI_API_KEY(그림만, 검사 없음)
import '../../mulsang.js';
import '../../saju-house.js';
import { json, isAdmin } from '../_lib.js';
import { generate } from '../_panelart.js';
import { aiFetch } from '../_ai-cost.js';

// 그림 종류별 모듈·스위치·저장 이름
const KINDS = { landscape: { mod: () => globalThis.MantraMulsang, flag: 'mulsangArt', pre: 'mulsang', off: '물상 그림 기능이 아직 꺼져 있습니다', what: 'painting' }, house: { mod: () => globalThis.MantraSajuHouse, flag: 'sajuHouse', pre: 'house', off: '사주의 집 기능이 아직 꺼져 있습니다', what: 'photo of a miniature house' } };
const MAX_SKETCH = 2 * 1024 * 1024;
const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
const b64ToBytes = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const bytesToB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
const fileUrl = k => '/api/clipfile?k=' + k;

async function flagOn(env, name) { try { const d = await env.GLOSSARY_KV.get('luckenv:flags', 'json'); return !!(d && d[name] === true); } catch { return false; } }
function sketchOf(v) {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(typeof v === 'string' ? v : ''); if (!m) return null;
  if (m[1].length > MAX_SKETCH * 1.37) return null;
  const u = b64ToBytes(m[1]); if (u.length < 8 || u[0] !== 0x89 || u[1] !== 0x50 || u[2] !== 0x4E || u[3] !== 0x47) return null;
  return { bytes: u.buffer, mime: 'image/png' };
}
// 비전 모델 검사: 검사 목록 질문마다 예/아니오. 키가 없거나 실패하면 null(검사 없이 통과로 보지 않는다 — 호출한 쪽이 판단)
async function check(env, img, list, what) {
  if (!env.OPENAI_API_KEY) return null;
  const model = env.MULSANG_CHECK_MODEL || 'gpt-4.1-mini';
  const ask = 'You are checking whether a generated ' + (what || 'image') + ' matches a specification. Look at the image carefully and answer each question strictly with true or false. Reply with JSON only: {"answers":{"<id>":true|false,...}}.\n' + list.map(x => x.id + ': ' + x.q).join('\n');
  const r = await aiFetch(env, 'mulsang-check', 'https://api.openai.com/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
    body: JSON.stringify({ model, temperature: 0, response_format: { type: 'json_object' }, messages: [{ role: 'user', content: [{ type: 'text', text: ask }, { type: 'image_url', image_url: { url: 'data:' + img.mime + ';base64,' + bytesToB64(new Uint8Array(img.bytes)), detail: 'low' } }] }] }) });
  if (!r.ok) return null;
  try { const d = await r.json(), a = JSON.parse(d.choices[0].message.content).answers || {}; const o = {}; list.forEach(x => { o[x.id] = a[x.id] === true; }); return o; } catch { return null; }
}

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV || !env.CLIPS_R2) return json({ error: '저장소(GLOSSARY_KV·CLIPS_R2)가 설정되지 않았습니다' }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const K = KINDS[(b && b.kind) || 'landscape']; if (!K) return json({ error: '알 수 없는 그림 종류입니다' }, 400);
  const MS = K.mod(); if (!MS) return json({ error: '그림 모듈을 불러오지 못했습니다' }, 500);
  const META = h => K.pre + ':' + h;
  const admin = isAdmin(request, env);
  if (!admin && !(await flagOn(env, K.flag))) return json({ error: K.off }, 403);
  const spec = MS.clean(b && b.spec); if (!spec) return json({ error: '명세 형식이 올바르지 않습니다' }, 400);
  const k = MS.key(spec), h = hex(await crypto.subtle.digest('SHA-256', enc.encode(k))).slice(0, 32);
  const debug = admin ? { key: k, prompt: MS.prompt(spec), checklist: MS.checklist(spec) } : undefined;
  // 저장본이 있으면 바로(다시 그리기 force 가 아니면)
  if (!b.force) { const meta = await env.GLOSSARY_KV.get(META(h), 'json'); if (meta && meta.file && await env.CLIPS_R2.head(meta.file)) return json({ ok: true, pass: true, cached: true, url: fileUrl(meta.file), failed: meta.failed || [], debug }); }
  const attempt = Math.max(1, Math.min(3, Number(b.attempt) || 1)), sketch = sketchOf(b.sketch);
  let img; try { img = await generate(env, MS.prompt(spec) + (attempt > 1 ? '\n\nPrevious attempt missed parts of the specification — follow every listed part, its size and the ABSENT list exactly this time.' : ''), null, sketch || null, { size: '1024x1536', quality: 'medium', aspect: '3:4' }); }
  catch (e) { return json({ error: '그림 생성에 실패했습니다: ' + String((e && e.message) || e).slice(0, 160) }, 502); }
  const list = MS.checklist(spec), answers = await check(env, img, list, K.what);
  const verdict = answers ? MS.judge(spec, answers) : { pass: false, failed: ['unchecked'], critical: ['unchecked'] };
  const checked = !!answers, keep = verdict.pass || (!checked && !env.OPENAI_API_KEY);   // 검사 키가 없으면(그림만 Gemini) 검사 없이 저장하되 표시한다
  if (!keep) return json({ ok: true, pass: false, attempt, failed: verdict.failed, critical: verdict.critical, provider: img.provider, debug });
  const file = K.pre + '-' + h + '-' + crypto.randomUUID().slice(0, 8) + '.' + img.ext;
  await env.CLIPS_R2.put(file, img.bytes, { httpMetadata: { contentType: img.mime } });
  const prev = await env.GLOSSARY_KV.get(META(h), 'json');
  await env.GLOSSARY_KV.put(META(h), JSON.stringify({ file, at: new Date().toISOString(), provider: img.provider, model: img.model, failed: verdict.failed, checked, style: MS.STYLE_V }));
  if (prev && prev.file && prev.file !== file) { try { await env.CLIPS_R2.delete(prev.file); } catch { } }
  return json({ ok: true, pass: true, checked, attempt, url: fileUrl(file), failed: verdict.failed, provider: img.provider, debug });
}
