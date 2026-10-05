// 미디어 라이브러리·각성 영상 공용 검증 (파일명이 _로 시작해 라우트로 노출되지 않음). 태그 taxonomy 는 report/v2/scenes.js 의 TAX 와 같아야 한다.
export const TAX = {
  element: ['wood', 'fire', 'earth', 'metal', 'water'],
  state: ['growth', 'opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense', 'recovery', 'conflict', 'isolation', 'connection', 'stability'],
  emotion: ['calm', 'mysterious', 'powerful', 'hopeful', 'lonely', 'tense', 'warm', 'cold', 'romantic', 'energetic', 'contemplative'],
  scene: ['forest', 'mountain', 'ocean', 'river', 'lake', 'field', 'road', 'city', 'nightCity', 'library', 'bookstore', 'museum', 'gallery', 'workspace', 'temple', 'sunrise', 'sunset', 'rain', 'snow', 'mist', 'cloud', 'stars'],
  theme: ['identity', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'relationship', 'family', 'pastLife', 'daewoon', 'sewoon', 'monthly', 'remedy', 'action'],
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
  const o = { id: m.id, type: TAX.type.includes(m.type) ? m.type : 'image', url: url(m.url), webmUrl: url(m.webmUrl), thumbnailUrl: url(m.thumbnailUrl), posterUrl: url(m.posterUrl),
    title: txt(m.title, 80), description: txt(m.description, 400), orientation: ['portrait', 'landscape', 'square'].includes(m.orientation) ? m.orientation : 'portrait',
    duration: Math.max(0, Math.min(600, +m.duration || 0)), loopable: !!m.loopable, hasAudio: !!m.hasAudio, priority: Math.max(0, Math.min(100, Math.round(+m.priority || 0))),
    enabled: m.enabled !== false, tagsApproved: m.tagsApproved !== false, bytes: Math.max(0, +m.bytes || 0), uploadedAt: +m.uploadedAt || 0 };
  for (const [f, k] of Object.entries(FIELD)) o[f] = tags(m[f], TAX[k]);
  o.tags = [...new Set([...o.elementTags, ...o.stateTags, ...o.emotionTags, ...o.sceneTags, ...o.themeTags, ...o.actionTags])];
  // AI가 추천만 한 태그: 관리자가 승인하기 전에는 조합에 쓰이지 않는다
  o.pending = m.pending && typeof m.pending === 'object' ? { tags: Object.fromEntries(Object.keys(FIELD).map(f => [f, tags((m.pending.tags || {})[f], TAX[FIELD[f]])])), description: txt(m.pending.description, 400) } : null;
  return o;
}

export function cleanAwakening(v) {
  if (!v || typeof v !== 'object') return null;
  const ST = '갑을병정무기경신임계', BR = '자축인묘진사오미신유술해', H1 = '甲乙丙丁戊己庚辛壬癸', H2 = '子丑寅卯辰巳午未申酉戌亥';
  const s = String(v.dayPillar || '').trim(), a = H1.indexOf(s[0]), b = H2.indexOf(s[1]);
  const k = a >= 0 && b >= 0 ? ST[a] + BR[b] : s.slice(0, 2), ia = ST.indexOf(k[0]), ib = BR.indexOf(k[1]);
  if (ia < 0 || ib < 0 || (ia % 2) !== (ib % 2)) return null; // 60갑자는 천간·지지의 음양이 같아야 한다
  const g = /^(m|male|남)/i.test(v.gender || '') ? 'M' : /^(f|female|여)/i.test(v.gender || '') ? 'F' : null; if (!g) return null;
  return { dayPillar: k, gender: g, videoUrl: url(v.videoUrl), videoWebm: url(v.videoWebm), posterUrl: url(v.posterUrl), guardianImageUrl: url(v.guardianImageUrl), captionsUrl: url(v.captionsUrl),
    title: txt(v.title, 60), subtitle: txt(v.subtitle, 200), keywords: Array.isArray(v.keywords) ? v.keywords.slice(0, 8).map(x => txt(x, 20)).filter(Boolean) : [], enabled: v.enabled !== false };
}
