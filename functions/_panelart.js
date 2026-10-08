// 무빙툰 패널 이미지(장면 삽화) 생성 — 프리셋 + 이미지 모델 호출. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 사용자별 실시간 생성은 하지 않는다: 오행 5 × 이야기 주제 10 = 50장을 관리자가 미리 만들어 미디어 라이브러리에 태그와 함께 저장 → 조합 규칙(Director.pickMedia)이 장면에 맞는 컷을 고른다.
// 모델: ① OpenAI gpt-image-2(env PANEL_IMAGE_MODEL 로 교체 가능) → 실패·키 없음이면 ② Gemini 이미지 모델(env GEMINI_IMAGE_MODEL, 기본 gemini-2.5-flash-image)
import { cleanMedia } from './_media.js';

export const STYLE = '한 편의 한국 웹툰 같은 시네마틱 일러스트. 먹물 번짐과 수채 질감이 섞인 동양화풍 위에 영화 같은 조명. 인물은 뒷모습이나 멀리 보이는 실루엣으로만 그리고 얼굴 클로즈업은 하지 않는다. ' +
  '화면 안에 글자·숫자·간판·로고·워터마크는 절대 넣지 않는다. 세로 구도, 아래쪽 30%는 비교적 어둡고 단순하게 비워 둔다(글자가 올라갈 자리).';

// ── 비주얼 디렉션: 화풍(look) · 세계관(world) · 분위기(mood) · 인물(people) + 자유 문장. 관리자에서 고르고 모든 프롬프트에 들어간다. 값은 id 만 저장.
export const DIRECTION_OPTIONS = {
  art: { label: '화풍 (그림체)', default: 'webtoon', items: {
    webtoonInk: ['웹툰 + 동양화', '한국 웹툰 스타일의 일러스트에 먹물 번짐과 수채 질감이 섞인 동양화풍 채색.'],
    webtoon: ['웹툰', '한국 웹툰 스타일의 일러스트. 또렷한 선화와 깔끔한 채색, 웹툰 특유의 배경 표현.'],
    ink: ['동양화 · 수묵', '수묵·동양화 스타일. 먹의 번짐과 여백, 붓 선, 절제된 색.'],
    anime: ['애니메이션 배경 미술', '극장판 애니메이션 배경 미술처럼 섬세한 일러스트. 맑은 색감.'],
    painting: ['유화 일러스트', '붓 자국이 보이는 유화 일러스트. 두꺼운 물감 질감과 깊은 색.'],
    realistic: ['실사', '실제 사진처럼 사실적인 화면. 현실적인 질감과 비율.'] } },
  feel: { label: '감성 · 연출', default: 'cinematic', items: {
    cinematic: ['영화 감성', '영화 같은 감성: 영화 스틸처럼 의도된 구도(와이드·로우앵글·오버숄더), 극적인 조명과 깊은 명암, 색보정된 톤, 얕은 심도의 느낌.'],
    documentary: ['담백한 다큐 감성', '담백한 다큐 감성: 꾸밈 없는 자연광과 일상적인 구도, 과장 없는 색.'],
    noir: ['느와르 감성', '느와르 감성: 강한 명암 대비와 한 줄기 빛, 고요한 긴장감, 색은 절제.'],
    fairytale: ['동화 감성', '동화 같은 감성: 포근하고 환상적인 분위기, 부드러운 빛.'],
    lyrical: ['서정적 감성', '서정적인 감성: 조용하고 섬세한 분위기, 여백과 부드러운 빛 번짐.'],
    none: ['지정 안 함', ''] } },
  world: { label: '세계관·배경', default: 'modern', items: {
    asis: ['장면 그대로', ''],
    modern: ['현실 · 현대 한국', '배경은 현대 한국의 실제 장소(도시·골목·사무실·집·카페·지하철 등)로 현실감 있게 그린다. 판타지 요소는 넣지 않는다.'],
    eastFantasy: ['동양 판타지', '배경은 동양 판타지 세계로 바꿔 그린다. 한옥·누각·기와지붕·서원·돌다리·등불·안개 낀 산수, 한복풍 의복. 장면의 장소·소품은 이 세계관에 맞게 번역한다(사무실→서원, 도시→성곽 마을).'],
    joseon: ['조선 시대 사극', '배경은 조선 시대 사극 세트처럼 고증된 한옥 마을·저잣거리·서당·궁궐 풍경으로 그린다. 장면의 현대적 소품은 시대에 맞게 바꾼다.'],
    wuxia: ['무협 강호', '배경은 무협의 강호 세계(대나무 숲·절벽 위 객잔·강나루·폭포·고성)로 그린다. 장면의 현대적 소품은 시대에 맞게 바꾼다.'],
    abstract: ['추상 · 상징', '구체적인 장소 대신 상징적이고 초현실적인 공간(떠다니는 빛, 거대한 문, 물 위의 길)으로 표현한다.'] } },
  mood: { label: '분위기', default: 'auto', items: {
    auto: ['오행에 맡김', ''], warm: ['따뜻하고 포근하게', '전체적으로 따뜻하고 포근한 분위기.'], lonely: ['쓸쓸하고 고요하게', '쓸쓸하고 고요한 분위기, 여백이 많다.'],
    hopeful: ['희망차고 맑게', '희망이 느껴지는 맑고 밝은 분위기.'], tense: ['긴장감 있게', '긴장감이 감도는 묵직한 분위기, 강한 명암 대비.'], dreamy: ['몽환적으로', '꿈속 같은 몽환적인 분위기, 부드러운 안개와 빛 번짐.'] } },
  people: { label: '인물', default: 'face', items: {
    back: ['뒷모습·실루엣만', '인물은 뒷모습이나 멀리 보이는 실루엣으로만 그리고 얼굴 클로즈업은 하지 않는다.'], none: ['사람 없이 풍경만', '사람은 그리지 않고 풍경과 사물만으로 표현한다.'],
    face: ['얼굴이 보이는 인물', '인물의 얼굴과 표정이 보여도 좋다(특정 실존 인물을 닮게 그리지 않는다).'] } },
};
// 그림체 통일용 레퍼런스(최대 3장): 모든 컷을 만들 때 함께 첨부한다. style = 그림체·채색·질감만 따르고 구도·인물·소재는 새로, close = 구도·분위기까지 가깝게.
export const REF_USE = { style: ['그림체·채색·질감만 참고 (구도·인물은 새로)', '첨부한 레퍼런스 이미지에서는 오직 그림체(선화의 굵기와 질감, 채색·명암 방식, 색감과 보정 톤, 배경 묘사의 밀도)만 가져온다. 레퍼런스에 나온 인물은 화풍 견본일 뿐이므로 그 인물의 얼굴·이목구비·눈매·얼굴형·헤어스타일·옷·체형·포즈·카메라 거리·구도(얼굴 중심의 클로즈업 구도 포함)·배경은 절대 따라 그리지 않는다. 구도와 동작은 아래 장면과 연출 지시만 따른다. 같은 얼굴이나 같은 포즈가 나오면 실패다. 인물은 아래 장면에 적힌 외형 지시대로, 레퍼런스와 전혀 다른 사람으로 새로 그린다. 같은 작가가 그린 연작처럼 보이되 인물은 컷마다 다른 사람이어야 한다.'], close: ['구도·분위기까지 가깝게', '첨부한 레퍼런스 이미지와 같은 그림체로, 구도와 분위기도 가깝게 따르되 인물의 얼굴·헤어스타일은 따라 그리지 않고 아래 외형 지시대로 새로 그린다. 같은 작가가 그린 연작처럼 보여야 한다.'] };
export const REF_OK = /^\/api\/clipfile\?k=([\w.-]{1,120})$/;
export const cleanRefs = v => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && REF_OK.test(x)))].slice(0, 3) : []);
export const DEFAULT_DIRECTION = { art: 'webtoon', feel: 'cinematic', world: 'modern', mood: 'auto', people: 'face', extra: '', refs: [], refUse: 'style' };
export function cleanDirection(v) {
  v = v && typeof v === 'object' ? { ...v } : {}; const o = { ...DEFAULT_DIRECTION };
  const OLD = { ink: ['webtoonInk', 'cinematic'], film: ['realistic', 'cinematic'], photo: ['realistic', 'documentary'], anime: ['anime', 'lyrical'], painting: ['painting', 'lyrical'], noir: ['realistic', 'noir'] }; // 예전 저장값(look 하나) 호환
  if (v.look && OLD[v.look] && !v.art) { v.art = OLD[v.look][0]; v.feel = v.feel || OLD[v.look][1]; }
  for (const k of Object.keys(DIRECTION_OPTIONS)) if (typeof v[k] === 'string' && DIRECTION_OPTIONS[k].items[v[k]]) o[k] = v[k];
  o.extra = typeof v.extra === 'string' ? v.extra.trim().slice(0, 300) : ''; o.refs = cleanRefs(v.refs); o.refUse = REF_USE[v.refUse] ? v.refUse : 'style'; return o;
}
// 공통 화풍 문장(글자 금지·글자 자리 비우기는 항상 붙는다)
export function styleOf(dir) {
  const d = cleanDirection(dir), O = DIRECTION_OPTIONS, part = k => O[k].items[d[k]][1];
  return [part('art'), part('feel'), part('world'), part('mood'), part('people'), d.extra && '추가 방향: ' + d.extra + '.'].filter(Boolean).join(' ') +
    ' 화면 안에 글자·숫자·간판·로고·워터마크는 절대 넣지 않는다. 세로 구도, 아래쪽 30%는 비교적 어둡고 단순하게 비워 둔다(글자가 올라갈 자리).';
}

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

// 용도(kind): 'panel' = 본문 컷 공용(성별 무관, 예전 50장) · 'panelF' · 'panelM' = 본문 컷 여성·남성 주인공(id panel-…-F / -M) · 'bg' = 무빙툰 배경(id panelbg-…).
// 뷰어는 id 로 풀을 가른다: 본문 컷은 panel-…(사용자 성별과 같은 칸 → 없으면 공용), 배경은 panelbg-… 와 기존 클립.
export const KINDS = { panel: '본문 컷 · 공용', panelF: '본문 컷 · 여성', panelM: '본문 컷 · 남성', bg: '배경' };
export const kindOf = k => (k === 'bg' || k === 'panelF' || k === 'panelM' ? k : 'panel');
export const genderOfKind = k => (k === 'panelF' ? 'F' : k === 'panelM' ? 'M' : '');
export const presetId = (el, th, kind) => { const k = kindOf(kind); return k === 'bg' ? `panelbg-${el}-${th}` : `panel-${el}-${th}${genderOfKind(k) ? '-' + genderOfKind(k) : ''}`; };
const KIND_SUFFIX = { panel: '', panelF: ' · 여성', panelM: ' · 남성', bg: ' (배경)' };
export function presets(kind) {
  const out = [], k = kindOf(kind);
  for (const el of Object.keys(ELEMENTS)) for (const th of Object.keys(THEMES)) out.push({ id: presetId(el, th, k), kind: k, gender: genderOfKind(k), element: el, theme: th, title: `${ELEMENTS[el].name} · ${THEMES[th].name}${KIND_SUFFIX[k]}` });
  return out;
}
// 본문 컷 장면(한국어): 본문 내용에 맞춘 현대 한국 일상 + 표정이 보이는 주인공. {P} = 주인공(성별에 따라 한국인 여성·남성·청년).
const PLOT = {
  identity: '{P}이 긴 강변 산책로의 시작점에 서서, 멀리 도시 스카이라인이 펼쳐진 앞쪽을 바라본다. 차분하고 단단한 표정',
  talent: '{P}이 조용한 도서관(또는 북카페)에서 책에 깊이 몰입해 있다. 펼친 책 위로 한 줄기 빛이 떨어지고 집중한 옆얼굴이 보인다',
  career: '{P}이 새벽 도시가 내려다보이는 큰 창가의 업무 책상에 앉아 있다. 켜진 노트북과 식은 커피, 피곤하지만 집중한 표정',
  wealth: '{P}이 저녁 불빛이 켜진 재래시장 골목을 걷는다(간판 글자는 읽히지 않게). 작은 장바구니를 들고 생각에 잠긴 표정',
  love: '{P}이 비 오는 밤 도심 거리에서 연인(이성)과 우산 하나를 함께 쓰고 있다. 두 사람의 얼굴이 서로를 향하고 은은한 미소가 보인다',
  relationship: '{P}이 따뜻한 조명의 식당 긴 테이블에서 친구들과 둘러앉아 웃으며 이야기한다. 얼굴들이 또렷이 보인다',
  family: '{P}이 해 질 녘 불이 켜진 가족의 집(아파트 단지 또는 시골집) 창문을 올려다본다. 그리움이 섞인 따뜻한 표정',
  shadow: '{P}이 지하철 통로 또는 사무실 복도처럼 긴 복도 한가운데 서 있고, 끝에서 밀려오는 빛에 뒤로 긴 그림자가 늘어진다. 조용히 고민하는 표정',
  daewoon: '{P}이 도시 공원의 갈림길에 서 있다. 한쪽 길은 눈이 덮이고 다른 쪽은 꽃이 피어 있으며, 두 길을 생각에 잠겨 바라본다',
  remedy: '{P}이 아침 안개가 낀 공원의 큰 나무 아래 벤치에서 가방을 내려놓고 쉰다. 눈을 감고 편안하게 미소 짓는다' };
// 배경용 장소(사람 없이 풍경만)
const PLACE = {
  identity: '긴 강변 산책로와 멀리 보이는 도시 스카이라인', talent: '조용한 도서관, 책장 사이로 들어오는 빛', career: '새벽 도시가 내려다보이는 큰 창가의 빈 책상', wealth: '저녁 재래시장 골목에 켜진 불빛(간판 글자는 읽히지 않게)',
  love: '비 오는 밤 도심 거리, 젖은 길에 번지는 불빛', relationship: '따뜻한 조명이 켜진 빈 식당의 긴 테이블', family: '해 질 녘 불이 켜진 집들의 창문', shadow: '긴 복도와 끝에서 들어오는 빛',
  daewoon: '눈 덮인 길과 꽃핀 길로 갈라지는 공원 갈림길', remedy: '아침 안개가 낀 큰 나무와 빈 벤치' };
// 본문 컷·배경 프롬프트용 빛·색(장소와 무관한 조명 분위기). 풀이 화면 이미지(자동차·직업…)는 ELEMENTS.palette 를 그대로 쓴다.
const PAL = { wood: '이른 새벽의 청록·연두 빛, 옅은 아침 안개, 싱그러운 초록 포인트', fire: '노을의 주황·붉은 금빛, 따뜻한 조명의 열기', earth: '황토·호박색 황금빛, 고요하고 묵직한 저녁 빛', metal: '달빛 은색과 쇳빛 청회색, 서늘하고 또렷한 밤공기', water: '깊은 남색·검푸른 빛, 비와 물에 비친 반사, 잔잔한 밤 분위기' };
const WHO_KO = { F: '20대 후반의 한국인 여성', M: '20대 후반의 한국인 남성', '': '20대 후반의 한국인 청년' };
// 배경용 공통 문장: 본문 컷과 같은 화풍·감성이되, 글 아래 30%만 비우는 대신 화면 전체가 글 뒤에서 은은하게 깔리도록 한다.
export function bgStyleOf(dir) {
  const d = cleanDirection(dir), O = DIRECTION_OPTIONS, part = k => O[k].items[d[k]][1];
  return [part('art'), part('feel'), part('world'), part('mood'), d.extra && '추가 방향: ' + d.extra + '.'].filter(Boolean).join(' ') +
    ' 이 그림은 글 뒤에 깔리는 전체 화면 배경이다. 세로 구도 전체가 비교적 어둡고 차분하며 대비는 낮게, 시선을 끄는 뚜렷한 초점·밝은 광원·인물 클로즈업은 두지 않는다. 인물은 아주 작은 실루엣이거나 없어도 된다. 화면 위에 흰 글자가 올라가도 읽히도록 어둡게 정리한다. 화면 안에 글자·숫자·간판·로고·워터마크는 절대 넣지 않는다.';
}
// 컷마다 인물 외형을 달리 지정한다(레퍼런스·다른 컷과 같은 얼굴이 나오는 것을 막는다). 오행×주제 조합마다 고정된 값이라 다시 만들어도 같은 사람이다.
const LOOK = {
  F: ['단발 보브 머리에 또렷한 눈매의 20대 중반, 갸름한 얼굴', '굵은 웨이브 긴 머리에 둥근 얼굴, 도톰한 입술, 20대 후반', '짧은 숏컷에 각진 턱선과 짙은 눈썹, 30대 초반', '느슨하게 올려 묶은 번 머리에 동그란 안경, 부드러운 인상의 20대 후반', '어깨 아래 곧은 생머리와 앞머리, 작은 얼굴과 처진 눈매', '곱슬기 있는 중단발에 주근깨, 밝고 둥근 눈의 20대 초반', '하나로 땋은 머리에 높은 광대와 날카로운 눈매, 30대', '앞가르마 긴 머리에 넓은 이마와 오뚝한 코, 차분한 30대 초반', '짧은 투블럭 단발에 큰 귀걸이, 강한 인상의 20대 후반', '볼륨 있는 레이어드 컷에 도톰한 볼살, 웃는 인상의 20대 중반'],
  M: ['짧은 스포츠 머리에 각진 얼굴과 굵은 눈썹, 30대 초반', '단정한 가르마 머리에 둥근 안경, 갸름한 얼굴의 20대 후반', '덥수룩한 곱슬머리와 수염 자국, 처진 눈매의 30대', '긴 앞머리 댄디 컷에 하얀 피부와 가는 눈, 20대 중반', '삭발에 가까운 짧은 머리, 넓은 어깨와 두툼한 인상의 30대', '옆머리를 깎은 투블럭에 뚜렷한 쌍꺼풀, 20대 후반', '가볍게 넘긴 올백 머리에 긴 얼굴과 높은 코, 30대 초반', '부스스한 중간 길이 머리에 둥글고 순한 얼굴, 20대 초반', '자연스러운 다운펌 머리에 짙은 눈매와 각진 턱, 20대 후반', '짧은 크롭 머리에 광대가 두드러진 마른 얼굴, 30대'],
  '': ['짧은 단발에 선명한 눈매, 20대 중반', '긴 머리를 묶은 둥근 얼굴, 20대 후반', '짧은 머리에 안경, 갸름한 얼굴, 30대 초반', '곱슬 중단발에 주근깨, 20대 초반', '곧은 머리에 앞머리, 처진 눈매, 20대 후반', '투블럭 머리에 각진 턱, 30대', '웨이브 머리에 둥근 볼, 20대 중반', '올백 머리에 높은 코, 30대 초반', '덥수룩한 머리에 순한 인상, 20대 초반', '크롭 머리에 광대가 두드러진 얼굴, 30대'] };
const LOOK_CLOTHES = ['검은 코트', '밝은 베이지 트렌치', '남색 니트와 셔츠', '짙은 초록 후드 집업', '회색 블레이저', '크림색 가디건', '청재킷', '와인색 터틀넥', '카키 점퍼', '흰 셔츠와 어두운 조끼'];
function lookOf(el, th, k) {
  const L = LOOK[genderOfKind(k)] || LOOK[''], ti = Object.keys(THEMES).indexOf(th), ei = Object.keys(ELEMENTS).indexOf(el);
  return L[(ti + ei * 3) % L.length] + ', ' + LOOK_CLOTHES[(ti * 3 + ei) % LOOK_CLOTHES.length] + ' 차림.';
}
// 컷마다 카메라 거리·각도·몸짓을 달리한다(모든 컷이 얼굴 중심 같은 포즈로 나오는 것을 막는다). 오행×주제 조합마다 고정 — 한 주제 안의 5컷, 한 오행 안의 10컷 모두 서로 다른 연출이 된다.
const SHOTS = [
  '연출: 와이드 롱샷. 인물은 전신이 화면의 작은 부분만 차지하고 환경이 화면 대부분을 채운다. 인물은 걸어가는 중이며 얼굴은 보이지 않거나 아주 작다.',
  '연출: 오버숄더 구도. 화면 앞쪽에 인물의 뒤통수와 어깨가 크게 걸리고, 인물이 바라보는 풍경·상대가 화면의 주인공이다. 얼굴은 보이지 않는다.',
  '연출: 로우앵글(아래에서 올려다봄) 전신. 바람에 옷자락이 날리는 역동적인 자세, 몸이 한쪽으로 기울며 앞으로 나아가는 동작. 얼굴은 작게 보이거나 가려진다.',
  '연출: 소품·손 클로즈업. 장면의 사물(책, 컵, 우산, 가방끈, 휴대폰 등)을 쥔 손이 화면 중심이고, 인물의 얼굴은 프레임 밖이거나 흐릿하게 물러나 있다.',
  '연출: 하이앵글(위에서 내려다봄). 인물이 바닥·길·공간의 무늬 속에 작게 놓이고, 몸짓과 그림자가 구도의 핵심이다. 얼굴은 거의 보이지 않는다.',
  '연출: 측면 프로필 미디엄샷. 인물은 옆을 보며 움직이는 중(걸음, 손 뻗기, 몸 기울이기)이고 시선은 화면 밖을 향한다. 정면 얼굴이 아니라 옆모습이다.',
  '연출: 강한 역광 실루엣 전신. 인물은 어두운 형태로 보이고 뒤에서 오는 빛이 윤곽을 만든다. 표정은 보이지 않고 몸의 자세로 감정을 전한다.',
  '연출: 몸을 돌리는 순간. 걷다가 어깨 너머로 뒤를 돌아보거나 막 돌아서는 3/4 뒷모습, 머리카락과 옷이 따라 움직인다.',
  '연출: 낮은 자세의 전신. 앉거나 기대거나 웅크리거나 난간·벽에 몸을 맡긴 자세로, 인물과 주변 공간이 함께 보이는 넓은 구도. 시선은 아래나 먼 곳을 향한다.',
  '연출: 미디엄 클로즈업으로 표정이 보이는 컷. 정면이 아닌 3/4 각도, 한 손이나 어깨가 함께 프레임에 들어오며 몸이 살짝 움직이는 순간.'];
const shotOf = (el, th) => SHOTS[(Object.keys(THEMES).indexOf(th) + Object.keys(ELEMENTS).indexOf(el) * 3) % SHOTS.length];
export function promptFor(el, th, dir, kind) {
  const E = ELEMENTS[el], T = THEMES[th]; if (!E || !T) return '';
  const k = kindOf(kind);
  if (k === 'bg') return `${bgStyleOf(dir)}\n배경 분위기: ${PLACE[th]}. 이 장면을 멀리서 본 넓고 고요한 풍경으로 그린다.\n색과 빛: ${PAL[el]}.\n오행 ${E.name}의 기운이 풍경 전체의 계절감과 분위기로 드러나게 한다.`;
  const people = cleanDirection(dir).people, face = people === 'none' ? '' : '\n' + shotOf(el, th) + (people === 'face' ? ' 실존 인물을 닮지 않은 가상의 인물이며 이 컷만의 고유한 외형이다 — ' + lookOf(el, th, k) + ' 다른 컷의 인물, 레퍼런스의 인물과 얼굴이 겹치지 않게 한다.' : '') +
    '\n위 연출(카메라 거리·각도·몸짓)이 장면 문장의 인물 묘사보다 우선한다. 증명사진처럼 가만히 서서 정면을 보는 포즈, 얼굴만 가득 찬 구도는 피하고 장면 속에서 무언가 하고 있는 동작으로 그린다.';
  return `${styleOf(dir)}\n장면: ${PLOT[th].replace('{P}', WHO_KO[genderOfKind(k)])}.${face}\n색과 빛: ${PAL[el]}.\n오행 ${E.name}의 기운이 장면 전체의 빛과 분위기로 드러나게 한다.`;
}
// 생성된 파일 → 미디어 라이브러리 항목(태그는 승인 상태라 조합에 바로 쓰인다). cleanMedia 가 TAX 밖 태그를 걸러낸다.
export function mediaItem(el, th, url, bytes, provider, panelVideo, kind) {
  const E = ELEMENTS[el], T = THEMES[th], k = kindOf(kind), bg = k === 'bg', g = genderOfKind(k);
  return cleanMedia({ id: presetId(el, th, k), type: 'image', url, posterUrl: url, title: `${E.name} · ${T.name} ${bg ? '배경' : '패널'}${g ? (g === 'F' ? ' 여성' : ' 남성') : ''}`, description: `AI 생성 ${bg ? '배경' : '패널'}(${provider}) — ${bg ? PLACE[th] : PLOT[th].replace('{P}', WHO_KO[g])}`, orientation: 'portrait', priority: bg ? 55 : g ? 62 : 60,
    elementTags: [el], stateTags: [E.state], emotionTags: [E.mood], themeTags: [th], sceneTags: SCENE_BY_EL[el].concat(T.tags.filter(t => !ACTIONS.test(t))), actionTags: T.tags.filter(t => ACTIONS.test(t)),
    visualRole: bg ? ['background', 'hero'] : ['hero'], loopable: bg && !!panelVideo, enabled: true, tagsApproved: true, bytes, uploadedAt: Date.now(), panelVideo: panelVideo || '' });
}

// 클립 소스 칸(장면 의도 태그) 하나에 맞는 이미지. 태그는 TAX 안의 값만 받는다(cleanMedia 가 거른다).
const arr = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^[A-Za-z]{2,24}$/.test(x)).slice(0, 6) : []);
export function slotPrompt(t, title, dir) {
  t = t || {}; const el = ELEMENTS[arr(t.element)[0]], line = (k, label) => (arr(t[k]).length ? label + ': ' + arr(t[k]).join(', ') + '.\n' : '');
  return styleOf(dir) + '\n' + (title ? '이 컷이 쓰이는 곳: ' + String(title).slice(0, 80) + '.\n' : '') + line('scene', '장소·장면(영어 태그)') + line('theme', '이야기 주제(영어 태그)') + line('state', '상태') + line('emotion', '감정·분위기') + line('action', '인물의 행동') +
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

async function viaOpenAI(env, prompt, ref, opts) {
  const refs = ref ? [].concat(ref) : [];
  const model = env.PANEL_IMAGE_MODEL || 'gpt-image-2', size = (opts && opts.size) || env.PANEL_IMAGE_SIZE || '1024x1536', quality = env.PANEL_IMAGE_QUALITY || 'medium';
  let r;
  if (refs.length) { // 참고·바탕 이미지가 있으면 images/edits (multipart, 여러 장 가능)
    const f = new FormData(); f.append('model', model); f.append('prompt', prompt); f.append('size', size); f.append('quality', quality); f.append('output_format', 'webp');
    refs.forEach((x, i) => f.append('image[]', new Blob([x.bytes], { type: x.mime }), 'ref' + i + '.' + (/webp/.test(x.mime) ? 'webp' : /jpe?g/.test(x.mime) ? 'jpg' : 'png')));
    r = await fetch('https://api.openai.com/v1/images/edits', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { authorization: 'Bearer ' + env.OPENAI_API_KEY }, body: f });
  } else r = await fetch('https://api.openai.com/v1/images/generations', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + env.OPENAI_API_KEY },
    body: JSON.stringify({ model, prompt, size, quality, output_format: 'webp', output_compression: 82, n: 1 }) });
  if (!r.ok) throw new Error(`openai(${model}) ${r.status}` + await errDetail(r));
  const d = await r.json(), x = d.data && d.data[0]; if (!x || !x.b64_json) throw new Error('openai 응답에 이미지가 없습니다');
  return { bytes: b64(x.b64_json), mime: 'image/webp', ext: 'webp', provider: 'openai', model };
}
const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };
async function viaGemini(env, prompt, ref, opts) {
  const refs = ref ? [].concat(ref) : [];
  const model = env.GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', { method: 'POST', signal: AbortSignal.timeout(110000), headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }].concat(refs.map(x => ({ inlineData: { mimeType: x.mime, data: toB64(new Uint8Array(x.bytes)) } }))) }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: (opts && opts.aspect) || '3:4' } } }) });
  if (!r.ok) throw new Error(`gemini(${model}) ${r.status}` + await errDetail(r));
  const d = await r.json(), parts = (((d.candidates || [])[0] || {}).content || {}).parts || [], p = parts.find(x => x.inlineData && x.inlineData.data);
  if (!p) throw new Error('gemini 응답에 이미지가 없습니다(안전 필터에 걸렸을 수 있습니다)');
  const mime = p.inlineData.mimeType || 'image/png';
  return { bytes: b64(p.inlineData.data), mime, ext: /webp/.test(mime) ? 'webp' : /jpe?g/.test(mime) ? 'jpg' : 'png', provider: 'gemini', model };
}
// 키가 있는 모델을 차례로 시도한다. 반환 { bytes, mime, ext, provider, model } · 모두 실패하면 던진다.
export async function generate(env, prompt, only, ref, opts) {
  const errs = [], tries = [];
  if (env.OPENAI_API_KEY && (!only || only === 'openai')) tries.push(viaOpenAI);
  if (env.GEMINI_API_KEY && (!only || only === 'gemini')) tries.push(viaGemini);
  if (!tries.length) throw new Error('이미지 생성 키가 없습니다(OPENAI_API_KEY 또는 GEMINI_API_KEY)');
  for (const f of tries) { try { return await f(env, prompt, ref, opts); } catch (e) { errs.push((e && e.message) || String(e)); } }
  throw new Error(errs.join(' / '));
}
