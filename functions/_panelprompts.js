// 무빙툰 컷 — 외부 도구용 프롬프트(영어). 이미지는 Leonardo.ai, 영상(이미지 → 영상)은 Kling 에서 직접 만들 때 복사해 쓴다. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 기본 방향: 웹툰풍 + 영화 감성 + 현대 한국 배경 + 얼굴이 보이는 인물(_panelart.js DEFAULT_DIRECTION). 관리자 "비주얼 디렉션"을 바꾸면 이미지 프롬프트의 화풍·감성·세계관·인물이 따라 바뀐다(직접 쓴 한글 추가 방향은 원문 그대로 덧붙인다).
// 장면은 현대 한국 일상 + 표정이 보이는 인물로 쓴 영어 문장이고, 오행은 빛·색 분위기만 정한다(같은 장면이 오행에 따라 새벽·노을·황금빛·달빛·비 내리는 밤으로 달라진다).
// kind: 'panel'(본문 컷, 글 아래 30%를 비움) · 'bg'(배경, 초점 없이 어둡고 차분하게).
import { cleanDirection, ELEMENTS, THEMES, kindOf, genderOfKind } from './_panelart.js';

const NAME_EN = { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' };
const EL_EN = {
  wood: 'fresh dawn light in cyan-green and lime tones, soft morning mist, touches of green plants',
  fire: 'warm sunset glow in orange and red-gold, warm lamp light',
  earth: 'ochre and amber golden-hour light, a calm, heavy, settled atmosphere',
  metal: 'cool silver moonlight and steel blue-grey tones, crisp clear night air',
  water: 'deep navy and blue-black tones, rain and reflections, a calm night atmosphere' };
const TH_EN = {
  identity: 'a young Korean {c} standing at the start of a long riverside path with the city skyline far ahead, facing slightly toward the viewer with a calm, determined expression',
  talent: 'a young Korean {c} absorbed in reading in a quiet modern library or book cafe, a shaft of light falling on the open book, face visible in three-quarter view with a focused expression',
  career: 'a young Korean {c} working at a desk by a large window above a city skyline, laptop and notebook glowing, a cooling coffee cup, a tired but focused face',
  wealth: 'a young Korean {c} walking through a lively evening street-market alley in Korea, glowing shop lights with no readable signs, holding a small shopping bag, a thoughtful expression',
  love: 'a young Korean couple (the main character is the {c}, the partner is of the opposite sex) sharing one umbrella on a rainy city street at night, their faces softly lit and turned toward each other with gentle smiles',
  relationship: 'a group of young Korean friends including the main character (a young Korean {c}) sitting around a long table in a cozy restaurant, warm lighting, laughing and talking, faces visible',
  family: 'a young Korean {c} looking up at the warmly lit windows of a family home (an apartment complex or a countryside house) at dusk, a nostalgic, tender expression',
  shadow: 'a young Korean {c} in a long empty corridor (a subway passage or an office hallway) with light flooding in from the far end, a long shadow stretching behind, a quiet, troubled expression',
  daewoon: 'a young Korean {c} standing at a crossroads in a modern city park, one path covered in snow and the other in blossoms, looking thoughtfully toward the viewer',
  remedy: 'a young Korean {c} resting on a park bench under a big tree in the morning mist, bag set down beside them, eyes closed with a relaxed, small smile' };
const ART_EN = { webtoonInk: 'Korean webtoon-style illustration blended with ink-wash bleeding and watercolor texture', webtoon: 'Korean webtoon-style illustration with clean line art, tidy coloring and expressive character faces', ink: 'East Asian ink-wash painting with soft ink bleeding, empty space and brush lines, restrained color',
  anime: 'cinematic anime background art, delicate and clear color', painting: 'oil painting illustration with visible brush strokes, thick paint texture and deep color', realistic: 'photorealistic image with realistic texture and proportions' };
const FEEL_EN = { cinematic: 'cinematic mood like a film still: deliberate composition (wide, low-angle or over-the-shoulder), dramatic lighting, deep shadows, color-graded tones, shallow depth of field', documentary: 'plain documentary mood with natural light and unforced everyday composition', noir: 'film noir mood with strong contrast and a single beam of light, quiet tension, restrained color',
  fairytale: 'soft fairytale mood, cozy and dreamy, gentle light', lyrical: 'lyrical quiet mood with delicate atmosphere, negative space and soft glowing light', none: '' };
const WORLD_EN = { asis: '', modern: 'set in real, present-day Korea (city streets, alleys, offices, homes, cafes, subway, parks), realistic modern clothing and props, no fantasy or period elements', eastFantasy: 'East Asian fantasy world: hanok, pavilions, tiled roofs, stone bridges, lanterns, misty mountains, hanbok-inspired clothing',
  joseon: 'Joseon-dynasty period drama set: historically grounded hanok village, marketplace, village school, palace', wuxia: 'wuxia martial-arts world: bamboo forest, cliffside inn, river ferry, waterfall, old fortress', abstract: 'symbolic surreal space: floating light, a huge door, a path over water' };
const MOOD_EN = { auto: '', warm: 'overall warm and cozy atmosphere', lonely: 'lonely, quiet atmosphere with lots of empty space', hopeful: 'hopeful, clear and bright atmosphere', tense: 'tense heavy atmosphere with strong contrast', dreamy: 'dreamlike atmosphere with soft fog and glowing haze' };
const PEOPLE_EN = { back: 'people only as back views or distant silhouettes, no face close-ups', none: 'no people, only scenery and objects',
  face: 'the main character\'s face and expression are clearly visible (a fictional person who does not resemble any real person); medium shot or three-quarter view, natural proportions, delicate eyes and a believable emotion' };
// 얼굴이 보이는 인물일 때: 시리즈 전체에서 같은 인물 느낌을 유지하도록 공통 캐릭터 설정을 붙인다.
const cOf = kind => ({ F: 'woman', M: 'man' }[genderOfKind(kindOf(kind))] || 'adult');
const HAIR = { woman: 'natural dark hair in a soft everyday style', man: 'short neat dark hair', adult: 'natural dark hair' };
const characterEN = c => `Main character design (keep consistent across the series): a young Korean ${c} in ${{ woman: "her", man: "his", adult: "their" }[c]} late 20s to early 30s, ${HAIR[c]}, everyday modern clothing, a gentle and expressive face.`;

export const NEGATIVE_IMAGE = 'text, letters, numbers, captions, signage, logo, watermark, distorted face, asymmetrical or cross-eyes, extra fingers, deformed hands, distorted anatomy, extra people, hanbok, fantasy costume, blurry, low quality, oversaturated';
export const NEGATIVE_VIDEO = 'text, subtitles, watermark, logo, face distortion, face morphing, changing identity, extra limbs, sudden camera cut, fast motion, flicker, jitter';

function styleEN(dir, kind) {
  const d = cleanDirection(dir), part = [ART_EN[d.art], FEEL_EN[d.feel], WORLD_EN[d.world], MOOD_EN[d.mood], PEOPLE_EN[d.people]].filter(Boolean);
  if (d.extra) part.push('extra direction (original Korean): ' + d.extra);
  const bg = kindOf(kind) === 'bg';
  const tail = bg ? 'This is a full-screen background behind text: keep the whole frame dark, calm and low-contrast with no strong focal point, no bright light source and no face close-ups, so white text stays readable.'
    : 'Vertical 2:3 composition. Keep the lower 30% of the frame comparatively dark and simple, empty space reserved for overlaid text.';
  return part.join('. ') + '. ' + (!bg && d.people === 'face' ? characterEN(cOf(kind)) + ' ' : '') + tail;
}
// Leonardo.ai 이미지 프롬프트 + 권장 설정
export function leonardo(el, th, dir, kind) {
  if (!ELEMENTS[el] || !THEMES[th]) return null;
  return { prompt: `${styleEN(dir, kind)}\nScene: ${TH_EN[th].split("{c}").join(cOf(kind)).split(" (the main character is the adult, the partner is of the opposite sex)").join("")}.\nColor and light: ${EL_EN[el]}.\nThe five-element energy of ${NAME_EN[el]} should show through the light, color and mood of the whole scene. No text, numbers or logos anywhere in the image.`,
    negative: NEGATIVE_IMAGE, size: '832 × 1248 (2:3 세로)' };
}
// Kling 이미지→영상 프롬프트(시작 프레임 = 위에서 만든 이미지). 움직임은 작고 잔잔하게, 인물의 얼굴·정체성이 변하지 않게.
const MOT_EL = {
  wood: 'soft morning mist drifts slowly, leaves and plants sway gently, fresh light shifts across the scene',
  fire: 'warm light flickers softly, lamp and city lights pulse gently, a faint warm glow breathes in the air',
  earth: 'golden dust motes drift in the light, grass and curtains sway slightly in a slow breeze, distant clouds move slowly',
  metal: 'moonlight glints and slowly shifts, a thin cool breath of mist passes, small distant lights twinkle',
  water: 'rain falls softly, ripples spread and reflections shimmer slowly' };
const MOT_TH = {
  identity: 'the character\'s hair and clothes sway in the breeze, they blink and breathe calmly, and the camera pushes in very slowly',
  talent: 'the reader turns a page slowly, dust floats inside the shaft of light, their eyes move slightly along the lines',
  career: 'the screen glow flickers softly, steam curls up from the cup, the city lights below twinkle, the character exhales and blinks',
  wealth: 'blurred shoppers pass in the background, the market lights flicker, the character glances around and shifts the bag slightly',
  love: 'the couple walks slowly under the umbrella, raindrops fall and ripple on the street, they exchange a soft glance, street lights glimmer',
  relationship: 'friends laugh and gesture softly, glasses clink, the warm light wavers, steam rises from the dishes',
  family: 'the lit windows flicker warmly, the character lets out a small breath in the cool air, their hair stirs in the breeze',
  shadow: 'the long shadow slowly lengthens, the light at the corridor end pulses softly, the character slowly lifts their gaze',
  daewoon: 'snow and blossom petals drift across the frame, the character blinks and turns their eyes between the two paths, the camera pushes in slightly',
  remedy: 'mist moves slowly under the tree, a few leaves fall, the character breathes calmly with a small smile' };
const up = s => s[0].toUpperCase() + s.slice(1);
export function kling(el, th, kind) {
  if (!ELEMENTS[el] || !THEMES[th]) return null;
  return { prompt: `Gentle, cinematic motion on the first-frame image. ${up(MOT_TH[th])}. ${up(MOT_EL[el])}. The camera does a very slow push-in or stays locked. Keep the character's face, identity, composition, colors and the webtoon illustration style exactly as in the image; natural blinking and subtle facial expression only; smooth, loop-friendly movement; no text appears.`,
    negative: NEGATIVE_VIDEO, settings: '이미지→영상 · 길이 5초 · 시작 프레임 = 위에서 만든 이미지 · 창의성(관련도) 낮음~중간(얼굴이 변하면 더 낮추기) · 카메라 움직임은 프롬프트에 맡김' };
}
export function toolsFor(el, th, dir, kind) { const l = leonardo(el, th, dir, kind), k = kling(el, th, kind); return l && k ? { leo: l.prompt, leoNeg: l.negative, leoSize: l.size, kling: k.prompt, klingNeg: k.negative, klingSet: k.settings } : null; }
