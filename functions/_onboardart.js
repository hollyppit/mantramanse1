// 시네마틱 온보딩 장면 이미지·영상 프롬프트 — 패널 이미지의 비주얼 디렉션(styleOf)을 그대로 쓰고, PC(가로)·모바일(세로) 화면마다 따로 짠다.
// 장면 내용은 관리자 화면이 보내는 장면 제목·독백(초안의 renewal.cinematic.scenes[i])에서 만든다. 파일명이 _ 로 시작해 라우트로 노출되지 않는다.
//
// 문구와 그림을 맞추는 방법: 독백 → "장면 연출"(AI 가 짜고 관리자가 고칠 수 있음, KV onb:briefs) → 이미지 프롬프트.
//   연출은 { core(장면 핵심), pc(가로 화면 연출), mobile(세로 화면 연출), motion(영상 움직임, 영어) } 이고, 만들 때의 문구 지문(src)을 같이 저장한다.
//   문구가 바뀌면 지문이 달라져 "다시 짜야 함"(stale)이 된다.
// 실제 화면(report/hub/cinematic.css): 문구는 화면 높이 약 45% 아래부터 나온다 — PC 는 가운데 정렬, 모바일(≤720px)은 왼쪽 정렬. 그 아래는 어두운 그라데이션으로 덮인다.
//   → 그림의 중심 피사체는 위쪽(모바일 상단 40%, PC 상단 45%)에 둔다.
import { styleOf } from './_panelart.js';

export const ORIENT = {
  pc: { label: 'PC(가로)', size: '1536x1024', aspect: '16:9', field: 'image', videoField: 'video' },
  mobile: { label: '모바일(세로)', size: '1024x1536', aspect: '9:16', field: 'imageMobile', videoField: 'videoMobile' }
};
export const orientOf = v => (v === 'mobile' ? 'mobile' : 'pc');
export const SCENE_ID = /^[a-z0-9_-]{2,60}$/;
const text = (v, n) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, n) : '');

export function cleanScene(s) {
  s = s && typeof s === 'object' ? s : {};
  const lines = (Array.isArray(s.lines) ? s.lines : []).map(x => text(x, 300)).filter(Boolean).slice(0, 12);
  return { id: SCENE_ID.test(s.id || '') ? s.id : '', title: text(s.title, 120), lines, index: Number.isInteger(s.index) && s.index >= 0 && s.index < 30 ? s.index : -1 };
}
// 문구 지문: 제목 + 독백이 같으면 같은 값(연출이 지금 문구로 짠 것인지 확인용)
export function srcOf(scene) {
  const s = cleanScene(scene), str = s.title + '\n' + s.lines.join('\n'); let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h.toString(36) + '.' + str.length;
}
export function cleanBrief(b) {
  b = b && typeof b === 'object' ? b : {};
  return { core: text(b.core, 200), pc: text(b.pc, 900), mobile: text(b.mobile, 900), motion: text(b.motion, 500) };
}

// 화면별 구도 — 실제 문구 위치에 맞춘다
const FRAME = {
  pc: '가로 16:9 와이드 전체 화면(데스크톱) 구도. 문구가 화면 가운데 정렬로 높이 45% 아래부터 올라오므로, 중심 피사체와 장면의 핵심은 화면 위쪽 45% 안, 가로 가운데에 둔다. 아래쪽 절반은 바닥·어둠·안개처럼 어둡고 단순하게 이어지게 해서 흰 글자가 읽히게 한다. 넓은 공간감과 깊이(앞·중간·뒤 레이어)를 살리고 좌우 가장자리는 어둡게 가라앉힌다.',
  mobile: '세로 9:16 휴대폰 전체 화면 구도. 문구가 왼쪽 정렬로 높이 45% 아래부터 여러 줄 올라오므로, 중심 피사체와 장면의 핵심은 화면 위쪽 40% 안에 크게 둔다. 아래쪽 60%는 어둡고 단순하게(바닥·그림자·안개) 이어지게 해서 글자가 읽히게 한다. 가로 화면보다 피사체에 더 가까이 다가간 세로 프레이밍으로, 위아래 높이(올려다봄·내려다봄)를 살린다.'
};
// styleOf 는 세로 패널용 문장(세로 구도·아래 30% 비움)으로 끝난다 → 그 부분만 빼고 화면별 구도를 붙인다.
// 글자 금지 — 독백은 화면에 따로 자막으로 나오므로 그림 안에는 어떤 글자도 없어야 한다. 모델이 끝 문장을 강하게 따르므로 프롬프트 맨 끝에 둔다.
export const NO_TEXT = '절대 규칙: 이 그림에는 어떤 글자도 없다. 독백은 화면에 자막으로 따로 나오므로 그림 안에 독백·제목을 쓰지 않는다. 한글·한자·영문·숫자·서예 글씨·부적의 글자·간판·현판·책 표지 제목·종이 위 문장·말풍선·자막·로고·워터마크를 모두 넣지 않는다. 종이·책·부적·현판·두루마리가 나오면 비어 있거나 글자로 읽히지 않는 흐릿한 얼룩·무늬로만 그린다.';
const styleBase = dir => styleOf(dir).replace(/ ?세로 구도, 아래쪽 30%는 비교적 어둡고 단순하게 비워 둔다\(글자가 올라갈 자리\)\./, '');

export function scenePrompt(scene, dir, orient, brief) {
  const s = cleanScene(scene), o = orientOf(orient), b = cleanBrief(brief);
  const mono = s.lines.length ? s.lines.map((l, i) => (i + 1) + ') ' + l).join(' ') : '';
  const direct = b[o] ? '\n장면 연출(이 내용을 가장 우선해 그린다): ' + b[o] : '';
  return styleBase(dir) + ' ' + FRAME[o] +
    '\n이 그림은 사주 서비스 첫 화면의 자동 재생 시네마틱 온보딩' + (s.index >= 0 ? ' ' + (s.index + 1) + '번째' : '') + ' 장면의 전체 화면 배경이다. 이 그림 위로 아래 독백이 한 줄씩 흐르므로, 보는 사람이 문구를 읽으며 "이 장면이 바로 그 이야기"라고 느끼도록 독백의 내용(누가·어디서·무엇을·어떤 감정)을 구체적인 장면으로 옮긴다.' +
    (s.title ? '\n장면 제목: ' + s.title + '.' : '') +
    (b.core ? '\n장면의 핵심: ' + b.core + '.' : '') +
    (mono ? '\n함께 나오는 독백(뜻만 장면으로 옮기고, 이 문장을 그림 안에 글자로 쓰지 않는다): ' + mono : '') + direct +
    '\n한 장면 안에 한 가지 중심 이미지만 둔다. 독백과 상관없는 장식(무관한 부적·해골·괴물·과한 공포 연출)은 넣지 않는다. 영상의 첫 프레임으로도 쓰이므로 은은하게 움직일 수 있는 요소(안개, 빛줄기, 흩날리는 빈 종이, 촛불, 물결, 연기) 하나를 둔다.\n' + NO_TEXT;
}

// 장면 연출을 짜는 AI 지시문 — 비주얼 디렉션 문장을 같이 넘겨 세계관을 맞춘다.
export const BRIEF_SYSTEM = `[시네마틱 온보딩 장면 연출]
너는 한국 사주 서비스의 첫 화면 시네마틱 온보딩 장면을 설계하는 영화 미술감독이다.
장면마다 한 장의 전체 화면 그림 위로 독백 문구가 한 줄씩 흐른다. 그림은 그 문구와 정확히 어울려야 한다.
규칙:
- 독백의 실제 내용(화자, 장소, 상황, 사물, 감정, 시간대)을 구체적인 한 순간의 장면으로 옮긴다. 추상적인 상징만 나열하지 말고 문구를 읽으면 바로 연결되는 장면이어야 한다.
- 독백이 여러 문장이면 전체를 아우르는 하나의 장면을 고르고, 마지막 문장의 감정이 화면의 분위기가 되게 한다.
- 화자 "저"는 서비스 제작자다. 얼굴을 특정하지 말고 뒷모습·옆모습·손·실루엣으로 보여 준다. 실존 인물을 닮게 하지 않는다.
- 사주·운·명리 이야기는 한국적인 소재(서책, 붓, 먹, 한지, 만세력, 별자리판, 기와, 문턱, 창호, 등불 등)로 은은하게 드러낸다. 과한 공포·괴물·해골은 쓰지 않는다.
- 그림 안에는 어떤 글자도 없다(독백은 화면에 자막으로 따로 나온다). 연출에 간판·현판·책 제목·편지 내용·부적 글씨처럼 글자가 보이는 것을 적지 말고, 종이·책·부적은 "빈" 또는 "글자 없는"이라고 적는다. 독백 문장을 따옴표로 옮겨 적지 않는다.
- pc: 가로 16:9 데스크톱. 문구가 화면 가운데 정렬로 높이 45% 아래에 나온다 → 핵심은 위쪽 45%·가운데, 아래쪽은 어둡고 단순하게. 넓은 공간감.
- mobile: 세로 9:16 휴대폰. 문구가 왼쪽 정렬로 높이 45% 아래에 여러 줄 나온다 → 핵심은 위쪽 40%, 아래 60%는 어둡고 단순하게. 같은 장면·같은 인물·같은 빛이지만 더 가까이, 세로로 다시 잡은 구도.
- motion: 이 그림을 영상으로 만들 때의 느린 움직임 한두 문장(영어). 카메라는 아주 느리게, 움직이는 것은 장면 속 요소(촛불, 안개, 종이, 빗물 등).
JSON 한 덩어리로만 답한다: {"core":"장면의 핵심 한 문장","pc":"PC 화면 연출 2~4문장(장소·인물·행동·소품·빛·카메라 위치)","mobile":"모바일 화면 연출 2~4문장","motion":"English motion prompt"}`;

export function briefUser(scene, dir) {
  const s = cleanScene(scene);
  return '비주얼 디렉션(그림체·세계관, 연출은 이 안에서): ' + styleBase(dir).slice(0, 900) +
    '\n\n장면 ' + (s.index >= 0 ? (s.index + 1) + '번 ' : '') + '제목: ' + (s.title || '(없음)') +
    '\n이 장면에 흐르는 독백:\n' + (s.lines.length ? s.lines.map((l, i) => (i + 1) + '. ' + l).join('\n') : '(없음)');
}
export function parseBrief(t) {
  const m = /\{[\s\S]*\}/.exec(String(t || '')); if (!m) throw new Error('AI 응답에서 연출을 읽지 못했습니다');
  let j; try { j = JSON.parse(m[0]); } catch { throw new Error('AI 응답 형식이 올바르지 않습니다'); }
  const b = cleanBrief(j); if (!b.pc || !b.mobile) throw new Error('AI 응답에 PC·모바일 연출이 없습니다'); return b;
}

// Kling 이미지 → 영상: 장면 분위기를 유지한 느린 카메라 움직임(연출에 motion 이 있으면 그것을 앞에 둔다)
export function sceneMotion(scene, orient, brief) {
  const s = cleanScene(scene), b = cleanBrief(brief);
  return {
    prompt: (b.motion ? b.motion.replace(/\s*$/, ' ') : '') + 'Slow, atmospheric cinematic motion on the first-frame image for a full-screen ' + (orient === 'mobile' ? 'vertical 9:16 mobile' : 'horizontal 16:9 desktop') + ' onboarding scene' + (s.title ? ' titled "' + s.title.replace(/"/g, '') + '"' : '') +
      '. The camera does a very slow push-in. Only ambient elements move gently. Keep the subject, composition, colors and art style exactly as in the image. Keep the lower part of the frame dark and calm. No text or writing ever appears in the frame. The motion should loop smoothly and feel mysterious and quiet.',
    negative: 'text, letters, subtitles, captions, Korean characters, Chinese characters, calligraphy, writing on paper, signboards, watermark, logo, sudden cuts, fast camera moves, morphing faces, distorted hands, extra people appearing, flashing lights, jump scare'
  };
}
