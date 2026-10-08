// 무빙툰 컷 — 외부 도구용 프롬프트(영어). 이미지는 Leonardo.ai, 영상(이미지 → 영상)은 Kling 에서 직접 만들 때 복사해 쓴다. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 장면·색은 _panelart.js 의 ELEMENTS·THEMES 와 같은 뜻의 영어 문장이고, 화풍·감성·세계관은 관리자 "비주얼 디렉션" 선택을 그대로 따른다(직접 쓴 한글 추가 방향은 원문 그대로 덧붙인다).
// kind: 'panel'(본문 컷, 글 아래 30%를 비움) · 'bg'(배경, 초점 없이 어둡고 차분하게).
import { cleanDirection, ELEMENTS, THEMES, kindOf } from './_panelart.js';

const EL_EN = {
  wood: 'early-dawn cyan-green and fresh lime light, mist in a forest, freshly sprouting leaves',
  fire: 'sunset orange and red-gold glow, warm lantern light and the heat of flames',
  earth: 'ochre and amber tones, wide fields and low hills, quiet heavy twilight',
  metal: 'silver moonlight and cold steel blue-grey, crisp cool city night air',
  water: 'deep navy and blue-black, a rainy night sea and calm ripples' };
const TH_EN = {
  identity: 'a lone person seen from behind standing at the start of a long road, a vast landscape opening ahead',
  talent: 'a quiet library with towering shelves, a person reading an open book, a shaft of light falling onto the page',
  career: 'a work desk by a large window above a dawn city, a lit notebook and a cooling cup of tea',
  wealth: 'an evening alley market with glowing lanterns, a person seen from behind holding a small pouch',
  love: 'two silhouettes walking together under one umbrella on a rainy street',
  relationship: 'several people seated around a long table, warm lighting, gestures turned toward each other',
  family: 'a single house at the far end of an evening field, every window glowing warmly, smoke rising from the chimney',
  shadow: 'a long corridor with light flooding in from its far end, a long shadow stretching behind a person',
  daewoon: 'a crossroads between seasons, one path covered in snow and the other in blossoms, a person standing between them',
  remedy: 'a misty morning under a great tree, a person setting down a bag and resting' };
const NAME_EN = { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' };
const ART_EN = { webtoonInk: 'Korean webtoon-style illustration blended with ink-wash (sumi-e) bleeding and watercolor texture', webtoon: 'Korean webtoon-style illustration with clean line art and tidy coloring', ink: 'East Asian ink-wash painting with soft ink bleeding, empty space and brush lines, restrained color',
  anime: 'cinematic anime background art, delicate and clear color', painting: 'oil painting illustration with visible brush strokes, thick paint texture and deep color', realistic: 'photorealistic image with realistic texture and proportions' };
const FEEL_EN = { cinematic: 'cinematic mood like a film still: deliberate composition, dramatic lighting, deep shadows, color-graded tones, shallow depth of field', documentary: 'plain documentary mood with natural light and unforced everyday composition', noir: 'film noir mood with strong contrast and a single beam of light, quiet tension, restrained color',
  fairytale: 'soft fairytale mood, cozy and dreamy, gentle light', lyrical: 'lyrical quiet mood with delicate atmosphere, negative space and soft glowing light', none: '' };
const WORLD_EN = { asis: '', modern: 'set in real modern Korea (city, alley, office, home, cafe, subway), no fantasy elements', eastFantasy: 'East Asian fantasy world: hanok, pavilions, tiled roofs, stone bridges, lanterns, misty mountains, hanbok-inspired clothing',
  joseon: 'Joseon-dynasty period drama set: historically grounded hanok village, marketplace, village school, palace', wuxia: 'wuxia martial-arts world: bamboo forest, cliffside inn, river ferry, waterfall, old fortress', abstract: 'symbolic surreal space: floating light, a huge door, a path over water' };
const MOOD_EN = { auto: '', warm: 'overall warm and cozy atmosphere', lonely: 'lonely, quiet atmosphere with lots of empty space', hopeful: 'hopeful, clear and bright atmosphere', tense: 'tense heavy atmosphere with strong contrast', dreamy: 'dreamlike atmosphere with soft fog and glowing haze' };
const PEOPLE_EN = { back: 'people only as back views or distant silhouettes, no face close-ups', none: 'no people, only scenery and objects', face: 'faces and expressions may be visible (fictional people, not resembling any real person)' };

export const NEGATIVE_IMAGE = 'text, letters, numbers, captions, signage, logo, watermark, extra fingers, deformed hands, distorted anatomy, blurry, low quality, oversaturated';
export const NEGATIVE_VIDEO = 'text, subtitles, watermark, logo, face distortion, morphing, extra limbs, sudden camera cut, fast motion, flicker, jitter';

function styleEN(dir, kind) {
  const d = cleanDirection(dir), part = [ART_EN[d.art], FEEL_EN[d.feel], WORLD_EN[d.world], MOOD_EN[d.mood], PEOPLE_EN[d.people]].filter(Boolean);
  if (d.extra) part.push('extra direction (original Korean): ' + d.extra);
  const tail = kindOf(kind) === 'bg'
    ? 'This is a full-screen background behind text: keep the whole frame dark, calm and low-contrast with no strong focal point, no bright light source and no face close-ups, so white text stays readable.'
    : 'Vertical 2:3 composition. Keep the lower 30% of the frame comparatively dark and simple, empty space reserved for overlaid text.';
  return part.join('. ') + '. ' + tail;
}
// Leonardo.ai 이미지 프롬프트 + 권장 설정
export function leonardo(el, th, dir, kind) {
  if (!ELEMENTS[el] || !THEMES[th]) return null;
  return { prompt: `${styleEN(dir, kind)}\nScene: ${TH_EN[th]}.\nColor and light: ${EL_EN[el]}.\nThe atmosphere of the five-element energy of ${NAME_EN[el]} should show through the season and mood of the whole landscape. No text, numbers or logos anywhere in the image.`,
    negative: NEGATIVE_IMAGE, size: '832 × 1248 (2:3 세로)' };
}
// Kling 이미지→영상 프롬프트(시작 프레임 = 위에서 만든 이미지). 움직임은 작고 잔잔하게, 얼굴·형태가 변하지 않게.
const MOT_EL = {
  wood: 'mist drifts slowly through the trees, leaves and branches sway gently, soft light shifts through the canopy',
  fire: 'warm light flickers softly, embers and sparks float upward, flame glow pulses gently',
  earth: 'fine dust motes drift in the golden light, grass sways slightly in a slow breeze, distant clouds move slowly',
  metal: 'moonlight glints and slowly shifts, a thin cold breath of mist passes, small lights twinkle in the distance',
  water: 'ripples spread on the water, rain falls softly, reflections shimmer slowly' };
const MOT_TH = {
  identity: 'the lone figure stands still while the camera pushes in very slowly along the road',
  talent: 'a page turns slowly, dust floats inside the shaft of light, the reader leans slightly over the book',
  career: 'the desk lamp glows steadily, steam curls up from the cup, city lights far below twinkle',
  wealth: 'lantern light flickers, blurred passers-by drift across the background, the figure shifts slightly',
  love: 'the couple walks slowly under the umbrella, raindrops fall and ripple on the street, street lights glimmer',
  relationship: 'people at the table gesture and nod softly, warm light wavers, steam rises from the dishes',
  family: 'the window lights flicker warmly, chimney smoke rises and drifts, the field grass sways',
  shadow: 'the long shadow slowly lengthens, the light at the corridor end pulses softly, dust floats in the beam',
  daewoon: 'snow and blossom petals drift across the frame, the figure stands still between the two paths, the camera pushes in slightly',
  remedy: 'mist moves slowly under the tree, a few leaves fall, the resting figure breathes calmly' };
export function kling(el, th, kind) {
  if (!ELEMENTS[el] || !THEMES[th]) return null;
  return { prompt: `Gentle, cinematic motion on the first-frame image. ${MOT_TH[th][0].toUpperCase() + MOT_TH[th].slice(1)}. ${MOT_EL[el][0].toUpperCase() + MOT_EL[el].slice(1)}. The camera does a very slow push-in or stays locked. Keep composition, colors and the illustration style exactly as in the image; subtle, smooth, loop-friendly movement; no text appears.`,
    negative: NEGATIVE_VIDEO, settings: '이미지→영상 · 길이 5초 · 시작 프레임 = 위에서 만든 이미지 · 창의성(관련도) 중간 · 카메라 움직임은 프롬프트에 맡김' };
}
export function toolsFor(el, th, dir, kind) { const l = leonardo(el, th, dir, kind), k = kling(el, th, kind); return l && k ? { leo: l.prompt, leoNeg: l.negative, leoSize: l.size, kling: k.prompt, klingNeg: k.negative, klingSet: k.settings } : null; }
