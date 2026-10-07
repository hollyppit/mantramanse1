// 무빙툰 패널 이미지(장면 삽화) 생성 — 프리셋 + 이미지 모델 호출. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 사용자별 실시간 생성은 하지 않는다: 오행 5 × 이야기 주제 10 = 50장을 관리자가 미리 만들어 미디어 라이브러리에 태그와 함께 저장 → 조합 규칙(Director.pickMedia)이 장면에 맞는 컷을 고른다.
// 모델: ① OpenAI gpt-image-2(env PANEL_IMAGE_MODEL 로 교체 가능) → 실패·키 없음이면 ② Gemini 이미지 모델(env GEMINI_IMAGE_MODEL, 기본 gemini-2.5-flash-image)
import { cleanMedia } from './_media.js';

export const STYLE = '한 편의 한국 웹툰 같은 시네마틱 일러스트. 먹물 번짐과 수채 질감이 섞인 동양화풍 위에 영화 같은 조명. 인물은 뒷모습이나 멀리 보이는 실루엣으로만 그리고 얼굴 클로즈업은 하지 않는다. ' +
  '화면 안에 글자·숫자·간판·로고·워터마크는 절대 넣지 않는다. 세로 구도, 아래쪽 30%는 비교적 어둡고 단순하게 비워 둔다(글자가 올라갈 자리).';

export const ELEMENTS = {
  wood: { name: '木', palette: '이른 새벽의 청록·연두 빛, 안개 낀 숲, 막 돋는 새싹', mood: 'hopeful', state: 'growth' },
  fire: { name: '火', palette: '노을의 주황·붉은 금빛, 등불과 불꽃의 따뜻한 열기', mood: 'energetic', state: 'expansion' },
  earth: { name: '土', palette: '황토·호박색, 넓은 들판과 낮은 산, 고요하고 묵직한 저녁 빛', mood: 'calm', state: 'stability' },
  metal: { name: '金', palette: '달빛 은색과 쇳빛 청회색, 서늘하고 또렷한 도시의 밤공기', mood: 'cold', state: 'defense' },
  water: { name: '水', palette: '깊은 남색·검푸른 빛, 비 내리는 밤바다와 잔잔한 물결', mood: 'mysterious', state: 'accumulation' },
};

// theme 은 _media.js TAX.theme 안의 값만. tags 는 TAX.scene · TAX.action 안의 값만.
export const THEMES = {
  identity: { name: '나는 어떤 사람인가', scene: '긴 길의 시작점에 선 한 사람의 뒷모습, 앞에 펼쳐진 풍경', tags: ['road', 'lookingForward'] },
  talent: { name: '숨은 재능', scene: '서가가 높이 솟은 고요한 서재에서 책 한 권을 펼친 사람, 빛줄기가 책 위로 떨어진다', tags: ['library', 'studying'] },
  career: { name: '일과 직업', scene: '새벽 도시가 내려다보이는 큰 창가의 작업 책상, 불 켜진 노트와 식은 찻잔', tags: ['workspace', 'working'] },
  wealth: { name: '돈과 재물', scene: '등불이 켜진 저녁 골목 시장, 작은 주머니를 손에 쥔 사람의 뒷모습', tags: ['city', 'walking'] },
  love: { name: '사랑과 인연', scene: '비 오는 거리에서 우산 하나를 함께 쓰고 걸어가는 두 사람의 실루엣', tags: ['rain', 'walking'] },
  relationship: { name: '사람과 관계', scene: '여러 사람이 둘러앉은 긴 식탁, 따뜻한 조명, 서로를 향한 몸짓', tags: ['gathering', 'meeting'] },
  family: { name: '가족', scene: '저녁 들판 끝 집 한 채, 창문마다 켜진 따뜻한 불빛과 굴뚝 연기', tags: ['field', 'lookingBack'] },
  shadow: { name: '그림자와 약점', scene: '긴 복도 끝에서 밀려오는 빛 속에 사람의 긴 그림자가 뒤로 늘어진다', tags: ['tunnelLight', 'thinking'] },
  daewoon: { name: '지금 지나는 시기', scene: '계절이 바뀌는 갈림길, 한쪽은 눈 덮인 길 다른 쪽은 꽃핀 길, 그 사이에 선 한 사람', tags: ['crossroads', 'lookingForward'] },
  remedy: { name: '쉬어 가기와 회복', scene: '큰 나무 아래 안개 낀 아침, 짐을 내려놓고 앉아 쉬는 사람', tags: ['mist', 'resting'] },
};
// 오행은 풍경의 계절·빛을 정한다(장면 태그에도 더해진다).
const SCENE_BY_EL = { wood: ['forest', 'sunrise'], fire: ['sunset'], earth: ['field', 'mountain'], metal: ['nightCity', 'stars'], water: ['rain', 'sea'] };
const ACTIONS = /^(walking|studying|working|meeting|thinking|resting|lookingBack|lookingForward)$/;

export const presetId = (el, th) => `panel-${el}-${th}`;
export function presets() {
  const out = [];
  for (const el of Object.keys(ELEMENTS)) for (const th of Object.keys(THEMES)) out.push({ id: presetId(el, th), element: el, theme: th, title: `${ELEMENTS[el].name} · ${THEMES[th].name}` });
  return out;
}
export function promptFor(el, th) {
  const E = ELEMENTS[el], T = THEMES[th]; if (!E || !T) return '';
  return `${STYLE}\n장면: ${T.scene}.\n색과 빛: ${E.palette}.\n오행 ${E.name}의 기운이 풍경 전체의 계절감과 분위기로 드러나게 한다.`;
}
// 생성된 파일 → 미디어 라이브러리 항목(태그는 승인 상태라 조합에 바로 쓰인다). cleanMedia 가 TAX 밖 태그를 걸러낸다.
export function mediaItem(el, th, url, bytes, provider) {
  const E = ELEMENTS[el], T = THEMES[th];
  return cleanMedia({ id: presetId(el, th), type: 'image', url, posterUrl: url, title: `${E.name} · ${T.name} 패널`, description: `AI 생성 패널(${provider}) — ${T.scene}`, orientation: 'portrait', priority: 60,
    elementTags: [el], stateTags: [E.state], emotionTags: [E.mood], themeTags: [th], sceneTags: SCENE_BY_EL[el].concat(T.tags.filter(t => !ACTIONS.test(t))), actionTags: T.tags.filter(t => ACTIONS.test(t)),
    visualRole: ['hero'], enabled: true, tagsApproved: true, bytes, uploadedAt: Date.now() });
}

// 클립 소스 칸(장면 의도 태그) 하나에 맞는 이미지. 태그는 TAX 안의 값만 받는다(cleanMedia 가 거른다).
const arr = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[A-Za-z]{2,24}$/.test(x)).slice(0, 6) : []);
export function slotPrompt(t, title) {
  t = t || {}; const el = ELEMENTS[arr(t.element)[0]], line = (k, label) => (arr(t[k]).length ? label + ': ' + arr(t[k]).join(', ') + '.\n' : '');
  return STYLE + '\n' + (title ? '이 컷이 쓰이는 곳: ' + String(title).slice(0, 80) + '.\n' : '') + line('scene', '장소·장면(영어 태그)') + line('theme', '이야기 주제(영어 태그)') + line('state', '상태') + line('emotion', '감정·분위기') + line('action', '인물의 행동') +
    (el ? '색과 빛: ' + el.palette + '.\n' : '') + '위 태그가 한눈에 읽히는 하나의 장면으로 그린다.';
}
export function slotItem(chapterId, title, t, url, bytes, provider) {
  t = t || {}; const rnd = Array.from(crypto.getRandomValues(new Uint8Array(3)), x => x.toString(16).padStart(2, '0')).join('');
  return cleanMedia({ id: 'ai-' + String(chapterId || 'all').replace(/[^w.-]/g, '').slice(0, 30) + '-' + rnd, type: 'image', url, posterUrl: url, title: String(title || 'AI 컷').slice(0, 80), description: 'AI 생성 컷(' + provider + ')', orientation: 'portrait', priority: 50,
    elementTags: arr(t.element), stateTags: arr(t.state), emotionTags: arr(t.emotion), sceneTags: arr(t.scene), themeTags: arr(t.theme), actionTags: arr(t.action), chapterTags: arr(t.theme).slice(0, 1), visualRole: ['hero'],
    chapterIds: chapterId ? [chapterId] : [], enabled: true, tagsApproved: true, bytes, uploadedAt: Date.now() });
}

const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function errDetail(r) { try { return ' ' + (await r.text()).slice(0, 200); } catch { return ''; } }

async function viaOpenAI(env, prompt, ref) {
  const model = env.PANEL_IMAGE_MODEL || 'gpt-image-2', size = env.PANEL_IMAGE_SIZE || '1024x1536', quality = env.PANEL_IMAGE_QUALITY || 'medium';
  let r;
  if (ref) { // 기존 이미지를 바탕으로 수정(images/edits, multipart)
    const f = new FormData(); f.append('model', model); f.append('prompt', prompt); f.append('size', size); f.append('quality', quality); f.append('output_format', 'webp');
    f.append('image', new Blob([ref.bytes], { type: ref.mime }), 'ref.' + (/webp/.test(ref.mime) ? 'webp' : /jpe?g/.test(ref.mime) ? 'jpg' : 'png'));
    r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: f });
  } else r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
    body: JSON.stringify({ model, prompt, size, quality, output_format: 'webp', output_compression: 82, n: 1 }) });
  if (!r.ok) throw new Error(`openai(${model}) ${r.status}` + await errDetail(r));
  const d = await r.json(), x = d.data && d.data[0]; if (!x || !x.b64_json) throw new Error('openai 응답에 이미지가 없습니다');
  return { bytes: b64(x.b64_json), mime: 'image/webp', ext: 'webp', provider: 'openai', model };
}
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
async function viaGemini(env, prompt, ref) {
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }].concat(ref ? [{ inlineData: { mimeType: ref.mime, data: toB64(new Uint8Array(ref.bytes)) } }] : []) }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '3:4' } } }) });
  if (!r.ok) throw new Error(`gemini(${model}) ${r.status}` + await errDetail(r));
  const d = await r.json(), parts = (((d.candidates || [])[0] || {}).content || {}).parts || [], p = parts.find(x => x.inlineData && x.inlineData.data);
  if (!p) throw new Error('gemini 응답에 이미지가 없습니다(안전 필터에 걸렸을 수 있습니다)');
  const mime = p.inlineData.mimeType || 'image/png';
  return { bytes: b64(p.inlineData.data), mime, ext: /webp/.test(mime) ? 'webp' : /jpe?g/.test(mime) ? 'jpg' : 'png', provider: 'gemini', model };
}
// 키가 있는 모델을 차례로 시도한다. 반환 { bytes, mime, ext, provider, model } · 모두 실패하면 던진다.
export async function generate(env, prompt, only, ref) {
  const errs = [], tries = [];
  if (env.OPENAI_API_KEY && (!only || only === 'openai')) tries.push(viaOpenAI);
  if (env.GEMINI_API_KEY && (!only || only === 'gemini')) tries.push(viaGemini);
  if (!tries.length) throw new Error('이미지 생성 키가 없습니다(OPENAI_API_KEY 또는 GEMINI_API_KEY)');
  for (const f of tries) { try { return await f(env, prompt, ref); } catch (e) { errs.push((e && e.message) || String(e)); } }
  throw new Error(errs.join(' / '));
}
