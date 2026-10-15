// 운명 세계 지도: 세계(테마 월드) 정의 — 이름·설명·색·배경·입장 연출·무료/유료·연결 챕터·순서·활성화
// GET /api/worlds — 공개. { worlds: [...] } 저장본이 없으면 빈 배열(뷰어가 코드 기본값을 쓴다). 비활성 세계는 관리자에게만 보인다.
// PUT /api/worlds — 관리자 전용. { worlds: [...] } 통째로 저장(검증·정리 후).
// 저장 위치: GLOSSARY_KV 'worlds:config'
import { json, isAdmin, configError } from '../_lib.js';

const KEY = 'worlds:config', MAX = 12;
const MEDIA = /^(\/api\/clipfile\?k=[\w.-]{1,120}|\/[\w./-]{1,200}|https:\/\/[^\s"'<>]{1,500})$/;
const str = (v, n) => (typeof v === 'string' ? v.trim().slice(0, n) : '');
const media = v => (typeof v === 'string' && MEDIA.test(v.trim()) ? v.trim() : '');
const color = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim() : '');
// 세계 무빙툰 컷 이미지(관리자 패널 이미지 탭): { 챕터id: [주소 최대 3] }. 주소는 media() 와 같은 규칙, 챕터 id 는 ids() 와 같은 규칙.
const cuts = v => { const o = {}; if (!v || typeof v !== 'object' || Array.isArray(v)) return o; for (const k of Object.keys(v).slice(0, 80)) { if (!/^[\w-]{1,60}$/.test(k) || !Array.isArray(v[k])) continue; const l = v[k].map(media).filter(Boolean).slice(0, 3); if (l.length) o[k] = l; } return o; };
const ids = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[\w-]{1,60}$/.test(x)).slice(0, 80) : []);
const chapterSettings = v => {
  const out = {}; if (!v || typeof v !== 'object' || Array.isArray(v)) return out;
  for (const [id, setting] of Object.entries(v).slice(0, 160)) {
    if (!/^[\w-]{1,80}$/.test(id) || !setting || typeof setting !== 'object') continue;
    out[id] = { title: str(setting.title, 200), enabled: setting.enabled !== false, order: Number.isFinite(+setting.order) ? Math.max(0, Math.min(999, +setting.order)) : 999 };
  } return out;
};

export function cleanWorlds(list) {
  if (!Array.isArray(list)) return [];
  const seen = new Set(), out = [];
  for (const w of list.slice(0, MAX)) {
    if (!w || typeof w !== 'object') continue;
    const id = str(w.id, 40).replace(/[^\w-]/g, ''); if (!id || seen.has(id)) continue; seen.add(id);
    out.push({
      id, name: str(w.name, 40), line: str(w.line, 80), desc: str(w.desc, 300), enabled: w.enabled !== false,
      order: Number.isFinite(+w.order) ? Math.max(0, Math.min(999, Math.round(+w.order))) : out.length + 1,
      access: w.access === 'paid' ? 'paid' : 'free',
      color: color(w.color), accent: color(w.accent), bgImage: media(w.bgImage), bgVideo: media(w.bgVideo), introImage: media(w.introImage), introVideo: media(w.introVideo),
      chapters: ids(w.chapters), notice: str(w.notice, 120),
      chapterSettings: chapterSettings(w.chapterSettings),
      ...(Object.keys(cuts(w.cutImages)).length ? { cutImages: cuts(w.cutImages) } : {}),
    });
  }
  return out;
}

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ worlds: [] });
  const saved = await env.GLOSSARY_KV.get(KEY, 'json'), list = cleanWorlds(saved && saved.worlds);
  return json({ worlds: isAdmin(request, env) ? list : list.filter(w => w.enabled) });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env); if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const worlds = cleanWorlds(b && b.worlds);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify({ worlds, at: new Date().toISOString() }));
  return json({ ok: true, worlds });
}
