// 리포트 미디어 라이브러리 (이미지·영상·루프·배경·캐릭터·상징·전환·챕터 커버)
// GET  /api/media            — 공개. 활성+태그 승인된 미디어만 (조합용). 관리자 인증 + ?all=1 이면 전부
// PUT  /api/media            — 관리자. { media: [...] } 전체 저장 (태그는 taxonomy 밖 값 제거)
// POST /api/media            — 관리자. { task:'tag', image:<dataURL jpeg/png/webp>, title?, description? } → AI 추천 태그 { suggestion }
//                              (저장하지 않는다. 관리자가 승인해야 반영된다)
// 저장 위치: GLOSSARY_KV 'media:index'. 파일은 /api/clipfile (R2).
import { json, isAdmin, configError } from '../_lib.js';
import { TAX, FIELD, cleanMedia } from '../_media.js';

const KEY = 'media:index', MAX_ITEMS = 3000, MAX_BYTES = 5 * 1024 * 1024;

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ media: [] });
  const all = new URL(request.url).searchParams.get('all') && isAdmin(request, env);
  const list = (await env.GLOSSARY_KV.get(KEY, 'json')) || [];
  return json({ media: all ? list : list.filter(m => m.enabled && m.tagsApproved && (m.url || m.posterUrl)).map(({ pending, bytes, uploadedAt, ...pub }) => pub) });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!Array.isArray(b.media) || b.media.length > MAX_ITEMS) return json({ error: `미디어는 ${MAX_ITEMS}개 이하 배열이어야 합니다` }, 400);
  const seen = new Set(), list = [];
  for (const m of b.media) { const c = cleanMedia(m); if (c && !seen.has(c.id)) { seen.add(c.id); list.push(c); } }
  const text = JSON.stringify(list);
  if (text.length > MAX_BYTES) return json({ error: '미디어 목록이 너무 큽니다' }, 413);
  await env.GLOSSARY_KV.put(KEY, text);
  return json({ ok: true, count: list.length });
}

// ── AI 자동 태깅 (추천만; 확정은 관리자 승인) ───────────────────────────
const PROMPT = `당신은 사주 스토리 콘텐츠의 미디어 큐레이터다. 주어진 이미지(영상은 대표 프레임)를 보고, 아래 허용 목록에 있는 태그만 골라라. 목록에 없는 단어는 절대 쓰지 마라.
허용 태그:
${Object.entries(TAX).filter(([k]) => k !== 'type').map(([k, v]) => `- ${k}: ${v.join(', ')}`).join('\n')}
오행 대응 힌트: wood=숲·새싹·성장, fire=불·노을·열기, earth=산·들·안정, metal=금속·도시·서늘함, water=바다·비·밤.
JSON 한 덩어리로만 답하라: {"elementTags":[],"stateTags":[],"emotionTags":[],"sceneTags":[],"themeTags":[],"actionTags":[],"visualRole":[],"description":"한국어 한두 문장(이 장면이 어떤 상황의 표현에 어울리는지)"}
태그는 확실한 것 위주로 종류별 최대 4개. 사람 얼굴을 특정하거나 이름을 말하지 마라.`;

async function ask(env, mime, b64, note) {
  const errs = [], user = note || '이 미디어의 태그를 추천해줘.';
  if (env.ANTHROPIC_API_KEY) {
    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', { method: 'POST', signal: AbortSignal.timeout(40000), headers: { 'content-type': 'application/json', 'x-api-key': env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: env.ANTHROPIC_MODEL || 'claude-sonnet-5-5', max_tokens: 700, system: PROMPT, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: mime, data: b64 } }, { type: 'text', text: user }] }] }) });
      if (r.ok) { const d = await r.json(); return (d.content || []).filter(x => x.type === 'text').map(x => x.text).join(''); }
      errs.push('anthropic ' + r.status);
    } catch (e) { errs.push('anthropic ' + ((e && e.message) || e)); }
  }
  if (env.OPENAI_API_KEY) {
    try {
      const r = await fetch('https://api.openai.com/v1/responses', { method: 'POST', signal: AbortSignal.timeout(40000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
        body: JSON.stringify({ model: env.OPENAI_MODEL || 'gpt-6.1-sol', instructions: PROMPT, input: [{ role: 'user', content: [{ type: 'input_text', text: user }, { type: 'input_image', image_url: `data:${mime};base64,${b64}` }] }] }) });
      if (r.ok) { const d = await r.json(); return typeof d.output_text === 'string' ? d.output_text : (d.output || []).flatMap(o => o.content || []).map(c => c.text || '').join(''); }
      errs.push('openai ' + r.status);
    } catch (e) { errs.push('openai ' + ((e && e.message) || e)); }
  }
  throw new Error(errs.length ? 'AI 호출 실패: ' + errs.join(' / ') : 'AI 키가 없습니다(ANTHROPIC_API_KEY 또는 OPENAI_API_KEY)');
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (b.task !== 'tag') return json({ error: '알 수 없는 작업입니다' }, 400);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(b.image || '');
  if (!m || m[2].length > 4 * 1024 * 1024) return json({ error: '이미지(jpeg/png/webp, 3MB 이하)가 필요합니다' }, 400);
  let text; try { text = await ask(env, m[1], m[2], [b.title, b.description].filter(Boolean).join(' / ')); } catch (e) { return json({ error: e.message }, 502); }
  const a = text.indexOf('{'), z = text.lastIndexOf('}'); let d = null; try { d = JSON.parse(text.slice(a, z + 1)); } catch { /* 형식 오류 */ }
  if (!d) return json({ error: 'AI 답이 JSON 형식이 아닙니다' }, 502);
  // taxonomy 밖 태그는 서버에서 한 번 더 걸러낸다
  const sug = { description: String(d.description || '').slice(0, 400) };
  for (const [f, k] of Object.entries(FIELD)) sug[f] = f === 'chapterTags' ? [] : [...new Set((Array.isArray(d[f]) ? d[f] : []).filter(t => TAX[k].includes(t)))].slice(0, 6);
  sug.chapterTags = sug.themeTags.slice(0, 4);
  return json({ ok: true, suggestion: sug });
}
