// 무료 콘텐츠(타로·오늘의 운세) 문장 조각 덮어쓰기 저장소.
// GET /api/free-content — 공개. { content: { tarot, daily, version } | null }  (null 이면 코드의 기본 문구 report/hub/free-core.js 를 쓴다)
// PUT /api/free-content — 관리자. { tarot?, daily? } 보낸 쪽만 교체. 저장할 때마다 version 이 바뀐다.
// 저장: GLOSSARY_KV 'free:content'.  tarot.cards[카드id][up|rev][분야][슬롯] = [문장…]  /  daily = free-core.js DAILY_DEFAULTS 와 같은 경로의 문자열 배열(cta 는 {q,btn,to})
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';

const KEY = 'free:content', MAX_BYTES = 1024 * 1024;
const CARD_ID = /^(M\d{1,2}|[WCSP]\d{1,2})$/, CATS = ['today', 'love', 'money', 'work', 'yesno'], SLOTS = ['headline', 'summary', 'detail', 'currentFlow', 'opportunity', 'caution', 'action', 'closingMessage', 'yesNoResult'];
const DEFAULT_FRAME = '/report/hub/tarot/frame-default.svg', IMG_OK = /^\/api\/clipfile\?k=[\w.-]{1,120}$/, KEY_OK = /^[A-Za-z0-9가-힣_]{1,24}$/, TO_OK = /^#\/(go\?to=(money|career|love|life|marriage|future|relation|self)|my|today|awaken|tarot)$/;
const sa = (v, n = 12, len = 400) => (Array.isArray(v) ? v.slice(0, n).map(x => (typeof x === 'string' ? x.trim().slice(0, len) : '')).filter(Boolean) : []);

function cleanTarot(t) {
  const out = { cards: {} }; if (!t || typeof t !== 'object') return out;
  if (t.images && typeof t.images === 'object') { const im = {}; for (const id of Object.keys(t.images).slice(0, 78)) if (CARD_ID.test(id) && typeof t.images[id] === 'string' && IMG_OK.test(t.images[id])) im[id] = t.images[id]; if (Object.keys(im).length) out.images = im; } // 카드 이미지: 관리자가 올린 R2 파일(/api/clipfile?k=…)만 허용
  const f = t.frame; if (f && typeof f === 'object' && typeof f.url === 'string' && (IMG_OK.test(f.url) || f.url === DEFAULT_FRAME) && Array.isArray(f.win) && f.win.length === 4 && f.win.every(n => typeof n === 'number' && n >= 0 && n <= 1)) out.frame = { url: f.url, win: f.win.map(n => Math.round(n * 10000) / 10000) }; // 공통 카드 프레임(그림 창 비율 포함)
  if (!t.cards) return out;
  for (const id of Object.keys(t.cards).slice(0, 78)) {
    if (!CARD_ID.test(id)) continue; const c = t.cards[id], o = {};
    for (const ori of ['up', 'rev']) { const p = c && c[ori]; if (!p) continue; const po = {};
      for (const cat of CATS) { const s = p[cat]; if (!s) continue; const so = {}; for (const sl of SLOTS) { const a = sa(s[sl]); if (a.length) so[sl] = a; } if (Object.keys(so).length) po[cat] = so; }
      if (Object.keys(po).length) o[ori] = po; }
    if (Object.keys(o).length) out.cards[id] = o;
  }
  return out;
}
// daily: 깊이 4 이하 객체, 잎은 문자열 배열. cta 의 잎은 문자열(q·btn·to)
function cleanDaily(d, depth = 0, inCta = false) {
  const out = {}; if (!d || typeof d !== 'object' || Array.isArray(d) || depth > 4) return out;
  for (const k of Object.keys(d).slice(0, 40)) {
    if (!KEY_OK.test(k)) continue; const v = d[k], cta = inCta || k === 'cta';
    if (Array.isArray(v)) { const a = sa(v); if (a.length) out[k] = a; }
    else if (cta && typeof v === 'string') { const s = v.trim().slice(0, 120); if (s && (k !== 'to' || TO_OK.test(s))) out[k] = s; }
    else if (v && typeof v === 'object') { const o = cleanDaily(v, depth + 1, cta); if (Object.keys(o).length) out[k] = o; }
  }
  return out;
}

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({ content: null });
  return json({ content: (await kvOf(env, { cache: true }).get(KEY, 'json')) || null });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const kv = kvOf(env), next = { ...((await kv.get(KEY, 'json')) || {}) };
  if (b.tarot) next.tarot = cleanTarot(b.tarot);
  if (b.daily) next.daily = cleanDaily(b.daily);
  next.version = 'f' + Date.now().toString(36);
  const text = JSON.stringify(next); if (text.length > MAX_BYTES) return json({ error: '콘텐츠가 너무 큽니다' }, 413);
  await kv.put(KEY, text);
  return json({ ok: true, version: next.version });
}
