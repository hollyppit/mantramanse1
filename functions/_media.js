// 미디어 라이브러리·일간 소개 영상 공용 검증 (파일명이 _로 시작해 라우트로 노출되지 않음). 태그 taxonomy 는 report/v2/scenes.js 의 TAX 와 같아야 한다.
import { cleanCinema } from './_cinema.js';
export const TAX = {
  element: ['wood', 'fire', 'earth', 'metal', 'water'],
  state: ['growth', 'opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense', 'recovery', 'conflict', 'isolation', 'connection', 'stability'],
  emotion: ['calm', 'mysterious', 'powerful', 'hopeful', 'lonely', 'tense', 'warm', 'cold', 'romantic', 'energetic', 'contemplative'],
  scene: ['forest', 'mountain', 'ocean', 'river', 'lake', 'field', 'road', 'city', 'nightCity', 'library', 'bookstore', 'museum', 'gallery', 'workspace', 'temple', 'sunrise', 'sunset', 'rain', 'snow', 'mist', 'cloud', 'stars', 'dawnCity', 'emptyOffice', 'commute', 'walkingAlone', 'meetingRoom', 'studio', 'desk', 'laptop', 'paymentAlert', 'card', 'trainStation', 'airport', 'crossroads', 'rainWindow', 'meadow', 'openDoor', 'stairs', 'tunnelLight', 'windyForest', 'sea', 'trip', 'exercise', 'gathering', 'farewell', 'newStart'],
  theme: ['identity', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'children', 'relationship', 'family', 'pastLife', 'daewoon', 'sewoon', 'monthly', 'remedy', 'action'],
  action: ['walking', 'running', 'working', 'studying', 'creating', 'thinking', 'meeting', 'traveling', 'climbing', 'fighting', 'resting', 'meditating', 'lookingForward', 'lookingBack'],
  role: ['hero', 'background', 'support', 'transition', 'divider', 'atmosphere', 'ending'],
  type: ['image', 'video', 'videoLoop', 'backgroundVideo', 'character', 'symbol', 'transition', 'chapterCover'],
};
// 이 사이트 업로드 파일(/api/clipfile?k=) 또는 https 주소만
export const MEDIA_OK = /^(\/api\/clipfile\?k=[\w.-]{1,120}|https:\/\/[^\s"'<>]+)$/;
const url = v => { v = typeof v === 'string' ? v.trim() : ''; return MEDIA_OK.test(v) ? v : ''; };
const txt = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');
const tags = (v, allowed) => (Array.isArray(v) ? [...new Set(v.filter(t => allowed.includes(t)))] : []);
export const FIELD = { elementTags: 'element', stateTags: 'state', emotionTags: 'emotion', sceneTags: 'scene', themeTags: 'theme', chapterTags: 'theme', actionTags: 'action', visualRole: 'role' };

export function cleanMedia(m) {
  if (!m || typeof m !== 'object' || !/^[\w.-]{1,80}$/.test(m.id || '')) return null;
  const o = { id: m.id, type: TAX.type.includes(m.type) ? m.type : 'image', url: url(m.url), webmUrl: url(m.webmUrl), thumbnailUrl: url(m.thumbnailUrl), posterUrl: url(m.posterUrl), panelVideo: url(m.panelVideo),
    title: txt(m.title, 80), description: txt(m.description, 400), orientation: ['portrait', 'landscape', 'square'].includes(m.orientation) ? m.orientation : 'portrait',
    duration: Math.max(0, Math.min(600, +m.duration || 0)), loopable: !!m.loopable, hasAudio: !!m.hasAudio, priority: Math.max(0, Math.min(100, Math.round(+m.priority || 0))),
    chapterIds: Array.isArray(m.chapterIds) ? [...new Set(m.chapterIds.filter(x => typeof x === 'string' && /^[\w.\-가-힣]{1,80}$/.test(x)))].slice(0, 30) : [], enabled: m.enabled !== false, tagsApproved: m.tagsApproved !== false, bytes: Math.max(0, +m.bytes || 0), uploadedAt: +m.uploadedAt || 0 };
  for (const [f, k] of Object.entries(FIELD)) o[f] = tags(m[f], TAX[k]);
  o.tags = [...new Set([...o.elementTags, ...o.stateTags, ...o.emotionTags, ...o.sceneTags, ...o.themeTags, ...o.actionTags])];
  // AI가 추천만 한 태그: 관리자가 승인하기 전에는 조합에 쓰이지 않는다
  o.pending = m.pending && typeof m.pending === 'object' ? { tags: Object.fromEntries(Object.keys(FIELD).map(f => [f, tags((m.pending.tags || {})[f], TAX[FIELD[f]])])), description: txt(m.pending.description, 400) } : null;
  const cin = cleanCinema(m.cinema); if (Object.keys(cin).length) o.cinema = cin; // 클립 개별 연출(sceneType·preset·pacing·motionIntensity·imageMotion·transition·textAnimation·textPosition·textSize·overlayStrength·focalPoint·pauseAfter·bgmMood)
  return o;
}

// 공개 영상 기본 주소(R2 공개 커스텀 도메인). https 주소만, 끝의 / 는 제거. 비우면 기존처럼 /api/clipfile 을 거친다.
export function cleanPublicBase(v) {
  const s = String(v || '').trim().replace(/\/+$/, '');
  return s.length <= 200 && /^https:\/\/[A-Za-z0-9.-]+(:\d+)?(\/[\w.-]+)*$/.test(s) ? s : '';
}
// 저장된 /api/clipfile?k=<키> 주소를 공개 주소(<기본주소>/<키>)로 바꾼다. 업로드 키는 그대로 쓴다. 다른 주소는 건드리지 않는다.
export function publicUrl(base, u) {
  return base && typeof u === 'string' ? u.replace(/^\/api\/clipfile\?k=([\w.-]{1,120})$/, (m, k) => base + '/' + k) : u;
}
export function publicizeClip(base, c) {
  if (!base || !c || typeof c !== 'object') return c;
  const o = { ...c }; for (const f of ['videoUrl', 'videoWebm', 'posterUrl', 'captionsUrl']) if (o[f]) o[f] = publicUrl(base, o[f]);
  return o;
}

export function cleanAwakening(v) {
  if (!v || typeof v !== 'object') return null;
  const ST = '갑을병정무기경신임계', BR = '자축인묘진사오미신유술해', H1 = '甲乙丙丁戊己庚辛壬癸', H2 = '子丑寅卯辰巳午未申酉戌亥';
  const s = String(v.dayPillar || '').trim(), a = H1.indexOf(s[0]), b = H2.indexOf(s[1]);
  const k = a >= 0 && b >= 0 ? ST[a] + BR[b] : s.slice(0, 2), ia = ST.indexOf(k[0]), ib = BR.indexOf(k[1]);
  if (ia < 0 || ib < 0 || (ia % 2) !== (ib % 2)) return null; // 60갑자는 천간·지지의 음양이 같아야 한다
  const g = /^(m|male|남)/i.test(v.gender || '') ? 'M' : /^(f|female|여)/i.test(v.gender || '') ? 'F' : null; if (!g) return null;
  return { dayPillar: k, gender: g, videoUrl: url(v.videoUrl), videoWebm: url(v.videoWebm), posterUrl: url(v.posterUrl), captionsUrl: url(v.captionsUrl),
    title: txt(v.title, 60), subtitle: txt(v.subtitle, 200), keywords: Array.isArray(v.keywords) ? v.keywords.slice(0, 8).map(x => txt(x, 20)).filter(Boolean) : [], enabled: v.enabled !== false };
}

// 일간 소개 영상(10일간 × 성별 = 20): 프롤로그 앞에 나오는 "이 이야기의 주인공" 캐릭터 소개
export const STEMS_K = '갑을병정무기경신임계', STEMS_H = '甲乙丙丁戊己庚辛壬癸';
export function normStem(v) {
  const s = String(v || '').trim(), c = s[0] || '', i = STEMS_K.indexOf(c) >= 0 ? STEMS_K.indexOf(c) : STEMS_H.indexOf(c);
  return i >= 0 ? STEMS_K[i] : null;
}
// ── 영상 항목 문구 검사(관리자 입력 오류 방지): 기토 영상에 경금 문구가 붙은 경우 등. report/v2/media.js 의 ilganTextMismatch·ijuTextMismatch 와 같은 규칙 ──
const STEM_NAME = { 갑: '갑목', 을: '을목', 병: '병화', 정: '정화', 무: '무토', 기: '기토', 경: '경금', 신: '신금', 임: '임수', 계: '계수' }, EL_H = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
function stemsIn(text) {
  const t = String(text || ''), out = [];
  STEMS_K.split('').forEach((s, i) => { const nm = STEM_NAME[s], hj = STEMS_H[i] + EL_H[nm[1]]; if (t.includes(hj) || new RegExp('(^|[^가-힣])' + nm + '(?=$|[^가-힣]|[은는이가을를의과와도만로])').test(t)) out.push(s); });
  return out;
}
export function ilganTextMismatch(stem, text) { const s = normStem(stem), f = stemsIn(text); return s && f.length && !f.includes(s) ? STEM_NAME[f[0]] : ''; }
export function ijuTextMismatch(pillar, text) { const p = String(pillar || '').slice(0, 2), m = String(text || '').match(/[갑을병정무기경신임계][자축인묘진사오미신유술해](?=일주)/g) || []; return m.length && !m.includes(p) ? m[0] + '일주' : ''; }
// 어긋난 칸만 비운다(영상 주소 등 나머지는 그대로). 비워진 칸은 화면에서 그 일간·일주의 기본 문구로 채워진다.
export function sanitizeClipText(c, bad) {
  if (!c || typeof c !== 'object') return c; const o = { ...c };
  if (bad(o.title || '')) o.title = ''; if (bad(o.subtitle || '')) o.subtitle = ''; if (Array.isArray(o.keywords) && bad(o.keywords.join(' '))) o.keywords = [];
  return o;
}
export function cleanIlgan(v) {
  if (!v || typeof v !== 'object') return null;
  const stem = normStem(v.stem), g = /^(m|male|남)/i.test(v.gender || '') ? 'M' : /^(f|female|여)/i.test(v.gender || '') ? 'F' : null; if (!stem || !g) return null;
  return { stem, gender: g, videoUrl: url(v.videoUrl), videoWebm: url(v.videoWebm), posterUrl: url(v.posterUrl), captionsUrl: url(v.captionsUrl), title: txt(v.title, 60), subtitle: txt(v.subtitle, 200),
    keywords: Array.isArray(v.keywords) ? v.keywords.slice(0, 8).map(x => txt(x, 20)).filter(Boolean) : [], enabled: v.enabled !== false };
}
