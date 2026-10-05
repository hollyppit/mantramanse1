// 시네마틱 연출 값 검증 (파일명이 _로 시작해 라우트로 노출되지 않는다).
// report/v2/cinema.js 의 clean() 과 같은 허용값·범위를 쓴다. 한쪽을 바꾸면 다른 쪽도 바꿀 것. 쓰는 곳: api/media.js(클립 개별 연출), api/report-content.js(기본 연출).
export const SCENE_TYPES = ['INTRO', 'CHARACTER', 'QUESTION', 'MEMORY', 'DAILY_LIFE', 'EXPLANATION', 'CONFLICT', 'COMPARISON', 'REVEAL', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'ACTION', 'CLIMAX', 'ENDING'];
export const PRESETS = ['CINEMATIC_INTRO', 'CHARACTER_REVEAL', 'QUIET_REFLECTION', 'DAILY_REALITY', 'REALITY_CHECK', 'TENSION', 'DISCOVERY', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'EMOTIONAL', 'CLIMAX', 'ENDING'];
const TEXT_ANIMS = ['fade', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out', 'blur-in', 'focus-in', 'word-reveal', 'line-reveal', 'typewriter', 'cinematic-title', 'impact', 'whisper', 'float', 'parallax-text'];
const IMAGE_MOTIONS = ['none', 'slow-zoom-in', 'slow-zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'parallax', 'drift', 'focus-pull'];
const TRANSITIONS = ['fade', 'crossfade', 'dip-black', 'dip-white', 'blur', 'push-left', 'push-right', 'zoom', 'hard-cut', 'light-leak'];
const PACING = ['FAST', 'MEDIUM', 'SLOW', 'PAUSE'], EMPHASIS = ['soft', 'normal', 'pause', 'impact'], POSITIONS = ['top', 'center', 'bottom', 'lower-third'], SIZES = ['S', 'M', 'L', 'XL'];
const BGM = ['cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'], MOODS = ['calm', 'awe', 'reflective', 'tense', 'warm', 'hopeful', 'lonely', 'powerful'];
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
  return o;
}
// 기본 연출: { [sceneType]: cleanCinema } — 알 수 없는 sceneType 은 버린다
export function cleanCinemaDefaults(d) {
  const out = {}; if (!d || typeof d !== 'object') return out;
  for (const k of SCENE_TYPES) { const v = cleanCinema(d[k]); if (Object.keys(v).length) out[k] = v; }
  return out;
}
