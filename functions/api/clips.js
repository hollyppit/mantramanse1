// GET /api/clips — 무빙툰 클립 목록 { clips: [...] } (관리자 전용)
// PUT /api/clips — { clips: [...], defaults: {...} } 전체 저장 (defaults = 기본 연출) (관리자 전용)
// 저장 위치: GLOSSARY_KV의 'clips:index' 키
import { json, isAdmin, configError } from '../_lib.js';

const CLIPS_KEY = 'clips:index';
// 장(章)은 관리자가 이름·순서·개수를 바꿀 수 있다. 저장된 값이 없으면 이 기본 9장을 쓴다. (report/assemble.js의 CHAPTERS와 같게 유지)
const DEFAULT_CHAPTERS = [['ch0', '序 일주의 각성'], ['ch1', '一 타고난 성정'], ['ch2', '二 인생의 길'], ['ch3', '三 인연의 장'], ['ch4', '四 재물의 장'],
  ['ch5', '五 도약의 장'], ['ch6', '六 가족의 장'], ['ch7', '七 앞으로 십 년의 문'], ['ch8', '終 개운 종합 카드']].map(([id, name]) => ({ id, name }));
const MAX_CHAPTERS = 40, MAX_FOLDERS = 200;

// [{id,name}] 목록 검증. 형식이 틀리면 null.
function cleanNamed(list, max, min) {
  if (!Array.isArray(list) || list.length > max || list.length < min) return null;
  const out = [], seen = new Set();
  for (const x of list) {
    const id = String((x && x.id) || ''), name = String((x && x.name) || '').trim().slice(0, 30);
    if (!/^[\w-]{1,20}$/.test(id) || !name || seen.has(id)) return null;
    seen.add(id); out.push({ id, name });
  }
  return out;
}
const COND_KEYS = ['ilju', 'ilgan', 'ilji', 'wolji', 'yongEl', 'strength', 'dominant', 'gender'];
const MAX_CLIPS = 3000;

// 연출 옵션 검증표 (report/fx.js의 FIELDS와 같은 범위). 배열=허용 값, [min,max]=숫자 범위, 'S'=짧은 문자열, 'H'=#색상코드.
const FONT_KEYS = ['gothic', 'pretty', 'myeongjo', 'gowun', 'gowundodum', 'hanna', 'dohyeon', 'bagel', 'jua', 'dongle', 'gamja', 'hi', 'single', 'poor', 'pen', 'gaegu', 'dokdo', 'brush', 'songmyung', 'yeonsung', 'gugi', 'stylish', 'cute', 'kirang', 'sunflower', 'eulji', 'eulji10', 'euljioldae', 'hannapro', 'melona', 'taom', 'binggrae', 'lv1', 'lv2', 'football', 'bazzi', 'maple', 'cookie', 'infinity', 'yes', 'ridi', 'gmarket', 'suit', 'paperlogy', 'spoqa', 'nsround', 'ssurround', 'dangdang', 'supermagic', 'meongi', 'lotte', 'mango', 'moneyround', 'samlip', 'eyes', 'bokeh', 'crooked', 'delta', 'player', 'yacheR', 'kimhoon', 'eunyoung', 'dodam', 'muruk', 'ahnjg', 'butpen', 'doldam', 'sketchbook', 'poster', 'parkdh', 'meetme', 'okticon'];
const TR_IN = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-right', 'slide-up', 'zoom-in', 'zoom-out', 'wipe', 'flash'];
const TR_OUT = ['cut', 'fade', 'dissolve', 'slide-left', 'slide-up', 'zoom-in', 'wipe', 'flash'];
const FX = {
  trans: { in: TR_IN, out: TR_OUT, dur: [0.1, 3] },
  sub: {
    font: FONT_KEYS, weight: ['400', '500', '700', '900'], italic: ['normal', 'italic'], size: ['S', 'M', 'L'], fs: [2, 14], color: ['ivory', 'white', 'gold', 'yellow'], colorHex: 'H', align: ['center', 'left', 'right'], lh: [1, 2.5], ls: [-5, 30],
    pos: ['bottom', 'middle', 'top'], x: [0, 100], y: [0, 100], w: [20, 100], rot: [-30, 30],
    strokeW: [0, 15], strokeColor: 'H', shOn: ['off', 'on'], shX: [-30, 30], shY: [-30, 30], shBlur: [0, 60], shColor: 'H', glowBlur: [0, 80], glowColor: 'H',
    bg: ['none', 'shade', 'box'], bgColor: 'H', bgOpacity: [0, 100], bgRadius: [0, 100], padX: [0, 200], padY: [0, 100],
    anim: ['none', 'fade', 'rise', 'drop', 'pop', 'zoom', 'blur', 'slide-l', 'slide-r', 'bounce', 'flip', 'type', 'word', 'char'], animDur: [0.1, 3], wordDelay: [0.02, 1], typeSpeed: [3, 60],
    animOut: ['none', 'fade', 'fall', 'lift', 'shrink', 'blur', 'slide-l', 'slide-r'], animOutDur: [0.1, 3], emph: ['none', 'pulse', 'float', 'shake', 'blink', 'wobble', 'glow'], emphSpeed: [0.3, 6],
  },
  voice: { on: ['off', 'on'], engine: ['browser', 'eleven'], name: 'S', mode: ['cue', 'whole'], rate: [0.5, 2], pitch: [0.5, 2], vol: [0, 1], delay: [0, 10], fit: ['stretch', 'off'], pad: [0, 3],
    elVoice: 'I', elModel: ['eleven_multilingual_v2', 'eleven_v3', 'eleven_flash_v2_5', 'eleven_turbo_v2_5'], elStability: [0, 1], elSimilarity: [0, 1], elStyle: [0, 1], elSpeed: [0.7, 1.2] },
  video: { speed: [0.25, 2], vol: [0, 1], duck: ['off', 'on'], duckVol: [0, 1], fadeIn: [0, 5], fadeOut: [0, 5], fit: ['contain', 'cover'], loop: ['auto', 'reverse', 'black', 'freeze', 'off'], trimStart: [0, 600], trimEnd: [0, 600], hold: [0, 10] },
};
const MAX_CUES = 80;

// 지정된 값만 남긴다. 비어 있으면 "기본 연출을 따름".
function cleanFx(fx) {
  const out = {};
  if (!fx || typeof fx !== 'object') return out;
  for (const g of Object.keys(FX)) {
    const src = fx[g];
    if (!src || typeof src !== 'object') continue;
    for (const k of Object.keys(FX[g])) {
      const v = src[k], rule = FX[g][k];
      if (v === undefined || v === null || v === '') continue;
      let val;
      if (Array.isArray(rule) && typeof rule[0] === 'string') { if (!rule.includes(String(v))) continue; val = String(v); }
      else if (Array.isArray(rule)) { const n = +v; if (!Number.isFinite(n)) continue; val = Math.round(Math.max(rule[0], Math.min(rule[1], n)) * 100) / 100; }
      else if (rule === 'I') { if (!/^[A-Za-z0-9]{10,40}$/.test(String(v))) continue; val = String(v); }
      else if (rule === 'H') { if (!/^#[0-9a-fA-F]{3,8}$/.test(String(v))) continue; val = String(v); }
      else val = String(v).slice(0, 120);
      (out[g] = out[g] || {})[k] = val;
    }
  }
  if (Array.isArray(fx.cues)) {
    const cues = [];
    for (const c of fx.cues.slice(0, MAX_CUES)) {
      const t = String((c && c.t) || '').trim().slice(0, 200), s = +(c && c.s), e = +(c && c.e);
      if (t && Number.isFinite(s) && Number.isFinite(e) && s >= 0 && e > s && e <= 3600) {
        const cue = { t, s: Math.round(s * 100) / 100, e: Math.round(e * 100) / 100 };
        // 일레븐랩스로 만든 음성 파일: a=R2 키, d=길이(초), ah=만들 때의 문장·설정 서명(바뀌었는지 확인용)
        if (/^[\w.-]{1,120}$/.test(String(c.a || ''))) { cue.a = String(c.a); const d = +c.d; if (d > 0 && d < 600) cue.d = Math.round(d * 100) / 100; cue.ah = String(c.ah || '').slice(0, 300); }
        cues.push(cue);
      }
    }
    if (cues.length) out.cues = cues;
  }
  return out;
}

function cleanCond(src) {
  const cond = {};
  for (const k of COND_KEYS) {
    const v = src && src[k];
    if (Array.isArray(v) && v.length) cond[k] = v.slice(0, 80).map(x => String(x).slice(0, 8));
  }
  return cond;
}

// 폴더: { id, name, parent, priority, cond, fx }. 부모는 존재해야 하고 순환·깊이 8단계 초과는 거부한다. 형식이 틀리면 null.
const MAX_DEPTH = 8;
function cleanFolders(list, chapterIds) {
  if (!Array.isArray(list) || list.length > MAX_FOLDERS) return null;
  const out = [], ids = new Set();
  for (const x of list) {
    const id = String((x && x.id) || ''), name = String((x && x.name) || '').trim().slice(0, 30);
    if (!/^[\w-]{1,20}$/.test(id) || !name || ids.has(id)) return null;
    ids.add(id);
    const fx = cleanFx({ ...(x.fx || {}), cues: undefined });
    out.push({ id, name, chapter: chapterIds.has(x.chapter) ? x.chapter : '', parent: String(x.parent || ''), priority: Math.max(-100, Math.min(100, Math.round(+x.priority || 0))), cond: cleanCond(x.cond), fx });
  }
  const byId = new Map(out.map(f => [f.id, f]));
  for (const f of out) {
    if (f.parent && !byId.has(f.parent)) f.parent = '';
    let depth = 1, cur = f;
    while (cur.parent) { cur = byId.get(cur.parent); if (++depth > MAX_DEPTH || cur === f) return null; }
  }
  return out;
}

// 폴더 체인에 장이 지정돼 있으면 그 장 id, 없으면 ''
function folderChapter(byId, id) {
  for (let n = 0; id && byId.has(id) && n < MAX_DEPTH + 1; n++) { const f = byId.get(id); if (f.chapter) return f.chapter; id = f.parent; }
  return '';
}

function clean(c, chapterIds, folderIds, byId) {
  if (!c || typeof c !== 'object') return null;
  const id = String(c.id || '').slice(0, 40), title = String(c.title || '').trim().slice(0, 80);
  const folder = folderIds.has(c.folder) ? c.folder : '';
  // 장이 비어 있으면(폴더를 따름) 폴더 체인에 장이 있어야 한다
  if (!/^[\w-]{1,40}$/.test(id) || !title || !(chapterIds.has(c.chapter) || (!c.chapter && folderChapter(byId, folder)))) return null;
  const cond = cleanCond(c.cond);
  const s = c.src || {};
  let src = null;
  if (s.type === 'r2' && /^[\w.-]{1,120}$/.test(s.value || '')) src = { type: 'r2', value: s.value };
  else if (s.type === 'url' && /^https:\/\/[^\s]{1,500}$/.test(s.value || '')) src = { type: 'url', value: s.value };
  else if (s.type) return null; // 알 수 없는 형식
  return { id, title, chapter: chapterIds.has(c.chapter) ? c.chapter : '', folder, cond, src, caption: String(c.caption || '').slice(0, 500), draft: String(c.draft || '').slice(0, 1500), note: String(c.note || '').slice(0, 300), fx: cleanFx(c.fx), priority: Math.max(-100, Math.min(100, +c.priority || 0)) };
}

export async function onRequestGet({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const data = (await env.GLOSSARY_KV.get(CLIPS_KEY, 'json')) || { clips: [] };
  return json({ clips: data.clips || [], defaults: data.defaults || {}, chapters: data.chapters || DEFAULT_CHAPTERS, folders: data.folders || [], r2: !!env.CLIPS_R2 });
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!body || !Array.isArray(body.clips) || body.clips.length > MAX_CLIPS) return json({ error: '클립 목록이 올바르지 않습니다' }, 400);
  const prev = (await env.GLOSSARY_KV.get(CLIPS_KEY, 'json')) || {};
  const chapters = body.chapters === undefined ? (prev.chapters || DEFAULT_CHAPTERS) : cleanNamed(body.chapters, MAX_CHAPTERS, 1);
  if (!chapters) return json({ error: '장 목록이 올바르지 않습니다 (1~40개, 이름 필수, 중복 id 불가)' }, 400);
  const chapterIds = new Set(chapters.map(c => c.id));
  const folders = body.folders === undefined ? (prev.folders || []) : cleanFolders(body.folders, chapterIds);
  if (!folders) return json({ error: '폴더 목록이 올바르지 않습니다 (이름 필수, 중복·순환 불가, 최대 8단계)' }, 400);
  const folderIds = new Set(folders.map(f => f.id)), byId = new Map(folders.map(f => [f.id, f]));
  const clips = [], seen = new Set();
  for (const raw of body.clips) {
    const c = clean(raw, chapterIds, folderIds, byId);
    if (!c) return json({ error: `클립 형식 오류: ${String(raw && (raw.title || raw.id) || '').slice(0, 30)}` }, 400);
    if (seen.has(c.id)) return json({ error: `중복된 id: ${c.id}` }, 400);
    seen.add(c.id); clips.push(c);
  }
  const defaults = body.defaults === undefined ? (prev.defaults || {}) : cleanFx({ ...body.defaults, cues: undefined });
  await env.GLOSSARY_KV.put(CLIPS_KEY, JSON.stringify({ clips, defaults, chapters, folders, at: new Date().toISOString() }));
  return json({ ok: true, count: clips.length });
}
