// 시네마틱 연출 값 검증 (파일명이 _로 시작해 라우트로 노출되지 않는다).
// report/v2/cinema.js 의 clean() 과 같은 허용값·범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것. 쓰는 곳: api/media.js(클립 개별 연출), api/report-content.js(기본 연출).
export const SCENE_TYPES = ['INTRO', 'CHARACTER', 'QUESTION', 'MEMORY', 'DAILY_LIFE', 'EXPLANATION', 'CONFLICT', 'COMPARISON', 'REVEAL', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'ACTION', 'CLIMAX', 'ENDING', 'NAME_REVEAL', 'NATURE', 'REALITY', 'DATA', 'REFLECTION'];
export const PRESETS = ['CINEMATIC_INTRO', 'CHARACTER_REVEAL', 'QUIET_REFLECTION', 'DAILY_REALITY', 'REALITY_CHECK', 'TENSION', 'DISCOVERY', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'EMOTIONAL', 'CLIMAX', 'ENDING', 'NAME_REVEAL', 'DATA_VIEW', 'DAWN', 'MIST', 'MOUNTAIN', 'WIND', 'RAIN', 'MOON', 'FIRE', 'RIVER', 'CROSSROAD', 'BLADE', 'GATE', 'SEASON_CHANGE', 'STORM', 'SUNRISE', 'SILENCE'];
const TEXT_ANIMS = ['fade', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out', 'blur-in', 'focus-in', 'word-reveal', 'line-reveal', 'typewriter', 'cinematic-title', 'impact', 'whisper', 'float', 'parallax-text'];
const IMAGE_MOTIONS = ['none', 'slow-zoom-in', 'slow-zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'parallax', 'drift', 'focus-pull'];
const TRANSITIONS = ['fade', 'crossfade', 'dip-black', 'dip-white', 'blur', 'push-left', 'push-right', 'zoom', 'hard-cut', 'light-leak'];
const PACING = ['FAST', 'MEDIUM', 'SLOW', 'PAUSE'], EMPHASIS = ['soft', 'normal', 'pause', 'impact'], POSITIONS = ['top', 'center', 'bottom', 'lower-third'], SIZES = ['S', 'M', 'L', 'XL'];
const BGM = ['cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'], MOODS = ['calm', 'awe', 'reflective', 'tense', 'warm', 'hopeful', 'lonely', 'powerful'];
const NAME_EMPH = ['NONE', 'SOFT', 'NORMAL', 'STRONG', 'TITLE', 'MAXIMUM'];
const CUES = ['drum', 'deepDrum', 'bgmCut', 'bgmUp', 'bgmDrone'];
const num = (v, lo, hi, d) => { v = v === '' || v == null ? NaN : +v; return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

export function cleanCinema(c) {
  const o = {}; if (!c || typeof c !== 'object') return o;
  if (SCENE_TYPES.includes(c.sceneType)) o.sceneType = c.sceneType;
  if (PRESETS.includes(c.preset)) o.preset = c.preset;
  if (PACING.includes(c.pacing)) o.pacing = c.pacing;
  const mi = num(c.motionIntensity, 0, 4, undefined); if (mi !== undefined) o.motionIntensity = Math.round(mi);
  if (IMAGE_MOTIONS.includes(c.imageMotion)) o.imageMotion = c.imageMotion;
  if (TRANSITIONS.includes(c.transition)) o.transition = c.transition;
  if (TEXT_ANIMS.includes(c.textAnimation)) o.textAnimation = c.textAnimation;
  if (POSITIONS.includes(c.textPosition)) o.textPosition = c.textPosition;
  if (SIZES.includes(c.textSize)) o.textSize = c.textSize;
  if (EMPHASIS.includes(c.textEmphasis)) o.textEmphasis = c.textEmphasis;
  const ov = num(c.overlayStrength, 0, 1, undefined); if (ov !== undefined) o.overlayStrength = Math.round(ov * 100) / 100;
  if (c.focalPoint && typeof c.focalPoint === 'object') o.focalPoint = { x: num(c.focalPoint.x, 0, 1, 0.5), y: num(c.focalPoint.y, 0, 1, 0.5) };
  const pa = num(c.pauseAfter, 0, 5000, undefined); if (pa !== undefined) o.pauseAfter = Math.round(pa);
  if (BGM.includes(c.bgmMood)) o.bgmMood = c.bgmMood;
  if (MOODS.includes(c.mood)) o.mood = c.mood;
  if (NAME_EMPH.includes(c.nameEmphasis)) o.nameEmphasis = c.nameEmphasis;
  if (typeof c.visualMetaphor === 'string') o.visualMetaphor = c.visualMetaphor.slice(0, 160);
  const ld = num(c.lead, 0, 2500, undefined); if (ld !== undefined) o.lead = Math.round(ld);
  const tl = num(c.tail, 0, 3000, undefined); if (tl !== undefined) o.tail = Math.round(tl);
  return o;
}
// 기본 연출: { [sceneType]: cleanCinema } — 알 수 없는 sceneType 은 버린다
export function cleanCinemaDefaults(d) {
  const out = {}; if (!d || typeof d !== 'object') return out;
  for (const k of SCENE_TYPES) { const v = cleanCinema(d[k]); if (Object.keys(v).length) out[k] = v; }
  return out;
}

// 장면 문구 override: { [sceneId]: { segments?: [{text, emphasis, animation, block, name}], nameEmphasis?, sub? } } — 관리자가 프롤로그·엔딩·챕터 연출 장면의 문장과 이름 강조를 고친 것.
// 텍스트에는 {hero}·{hero은는}·{hero이가}·{hero을를}·{hero의} 자리표시자만 허용한다(이름은 서버에 저장하지 않는다).
const HERO_KEYS = ['hero', 'hero은는', 'hero이가', 'hero을를', 'hero의'];
const okText = t => typeof t === 'string' && (t.match(/{[^{}]*}/g) || []).every(x => HERO_KEYS.includes(x.slice(1, -1))) && !/[<>]/.test(t);
export function cleanSceneCopy(c) {
  const out = {}; if (!c || typeof c !== 'object') return out;
  for (const id of Object.keys(c).slice(0, 300)) {
    if (!/^[A-Za-z0-9_]{1,40}$/.test(id)) continue; const e = c[id]; if (!e || typeof e !== 'object') continue; const o = {};
    if (Array.isArray(e.segments)) {
      const segs = e.segments.slice(0, 24).map(g => (g && okText(g.text) && g.text.trim() ? { text: g.text.trim().slice(0, 120), emphasis: EMPHASIS.includes(g.emphasis) ? g.emphasis : 'normal', animation: TEXT_ANIMS.includes(g.animation) ? g.animation : 'fade-up', block: Math.round(num(g.block, 0, 40, 0)), name: g.name === true ? true : undefined, hold: g.hold == null || g.hold === '' ? undefined : Math.round(num(g.hold, 0, 8000, 0)), cue: CUES.includes(g.cue) ? g.cue : undefined, big: g.big === true ? true : undefined } : null)).filter(Boolean);
      if (segs.length) o.segments = segs;
    }
    if (NAME_EMPH.includes(e.nameEmphasis)) o.nameEmphasis = e.nameEmphasis;
    if (okText(e.sub)) o.sub = e.sub.slice(0, 120);
    if (Object.keys(o).length) out[id] = o;
  }
  return out;
}
