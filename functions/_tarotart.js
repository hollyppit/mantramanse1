// 타로 카드 78장 이미지 생성 — 카드 정의·장면 설명·비주얼 디렉션·프롬프트. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 카드 id 는 shared-core.js 와 같다(M0~M21, W/C/S/P 1~14). 만든 이미지는 R2 에 두고 주소를 free:content 의 tarot.images[id] 에 넣는다(타로 화면이 이미 이 값을 쓴다).
import { DIRECTION_OPTIONS } from './_panelart.js';

const MAJ = [
  ['바보', 'The Fool', '절벽 끝을 향해 가볍게 걸어가는 방랑자, 어깨에 멘 막대기 끝의 작은 보따리, 곁에서 뛰는 흰 개, 떠오르는 해와 먼 산'],
  ['마법사', 'The Magician', '탁자 앞에 선 마법사, 한 손은 하늘 한 손은 땅을 가리키고 머리 위에 무한대 기호, 탁자 위에 컵·검·지팡이·동전 네 가지 상징, 장미와 백합 덩굴'],
  ['여사제', 'The High Priestess', '검은 기둥과 흰 기둥 사이 베일 앞에 앉은 여사제, 발치의 초승달, 손에 든 두루마리, 석류 무늬 장막'],
  ['여황제', 'The Empress', '풍성한 밀밭 속 푹신한 의자에 앉은 여황제, 별이 박힌 왕관, 숲과 흐르는 폭포, 풍요로운 자연'],
  ['황제', 'The Emperor', '돌 왕좌에 앉은 엄격한 황제, 양 머리 장식의 왕좌, 붉은 갑옷과 홀, 뒤로 황량한 산맥'],
  ['교황', 'The Hierophant', '두 기둥 사이 왕좌에서 두 제자 앞에 손을 들어 축복하는 교황, 교차한 두 열쇠, 삼중 관'],
  ['연인', 'The Lovers', '두 사람이 마주 서고 그 위로 날개를 활짝 편 천사가 축복하는 장면, 생명의 나무와 불의 나무, 먼 산'],
  ['전차', 'The Chariot', '별이 빛나는 덮개 아래 전차에 선 전사, 두 마리 스핑크스가 반대 방향을 보며 전차를 끌고, 뒤로 성곽 도시'],
  ['힘', 'Strength', '사자를 부드럽게 쓰다듬어 달래는 여인, 머리 위에 떠 있는 무한대 기호, 꽃 화관, 초록 들판'],
  ['은둔자', 'The Hermit', '눈 덮인 산정에 홀로 선 회색 외투의 노인, 여섯 갈래 별이 든 등불을 들고 지팡이를 짚고 있다'],
  ['운명의 수레바퀴', 'Wheel of Fortune', '구름 위 하늘에 떠 있는 거대한 신비한 수레바퀴, 네 모퉁이의 날개 달린 네 존재, 위쪽의 스핑크스, 아래의 자칼과 뱀'],
  ['정의', 'Justice', '두 기둥 사이 왕좌에 앉아 한 손에 저울 한 손에 곧게 세운 검을 든 판관, 자주색 장막'],
  ['매달린 사람', 'The Hanged Man', '살아 있는 나무 가지에 한 발로 거꾸로 매달린 사람, 얼굴은 평온하고 머리 뒤에 후광, 다른 다리는 가볍게 꼬여 있다'],
  ['죽음', 'Death', '흰 말을 타고 천천히 나아가는 검은 갑옷의 해골 기사, 흰 장미가 그려진 검은 깃발, 멀리 두 탑 사이로 떠오르는 해(공포보다 끝과 새 시작의 상징)'],
  ['절제', 'Temperance', '두 개의 잔 사이로 물을 옮겨 따르는 날개 달린 천사, 한 발은 물 위 한 발은 땅 위, 멀리 빛나는 왕관이 있는 길'],
  ['악마', 'The Devil', '높은 단상 위의 뿔 달린 반인반수, 아래에 느슨한 사슬로 목이 묶인 두 사람, 어두운 배경'],
  ['탑', 'The Tower', '번개에 맞아 왕관이 날아가는 높은 탑, 불꽃이 튀고 두 사람이 떨어지는 장면, 캄캄한 밤하늘'],
  ['별', 'The Star', '물가에 무릎 꿇고 두 항아리로 물을 붓는 알몸의 여인, 하늘에 큰 별 하나와 일곱 작은 별, 고요한 연못과 새'],
  ['달', 'The Moon', '큰 달이 떠 있고 두 탑 사이로 난 길, 물에서 기어 나오는 가재, 길 양쪽에서 달을 보고 우는 개와 늑대'],
  ['태양', 'The Sun', '정면의 커다란 해, 해바라기가 핀 담장 앞 흰 말 위에서 붉은 깃발을 들고 웃는 아이'],
  ['심판', 'Judgement', '하늘의 천사가 나팔을 불고, 아래에서 관을 열고 일어나 두 팔을 벌리는 사람들, 먼 산과 바다'],
  ['세계', 'The World', '커다란 월계관 안에서 두 개의 지팡이를 들고 춤추는 인물, 네 모퉁이에 네 존재(사람·사자·황소·독수리)'],
];
const SUITS = {
  W: { ko: '완드', en: 'Wands', obj: '싹이 돋은 나무 지팡이(완드)', place: '불꽃 같은 주황 하늘과 사막, 먼 성' },
  C: { ko: '컵', en: 'Cups', obj: '빛나는 성배(컵)', place: '잔잔한 강과 호수, 물가의 풍경' },
  S: { ko: '소드', en: 'Swords', obj: '곧은 검(소드)', place: '바람 부는 구름 하늘과 차가운 바다' },
  P: { ko: '펜타클', en: 'Pentacles', obj: '오각별 문양이 새겨진 금화(펜타클)', place: '가꿔진 정원과 포도밭, 완만한 언덕' },
};
const RANK_KO = ['에이스', '2', '3', '4', '5', '6', '7', '8', '9', '10', '페이지', '나이트', '퀸', '킹'], RANK_EN = ['Ace', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Page', 'Knight', 'Queen', 'King'];
const RANK_SCENE = [
  '구름에서 뻗어 나온 손이 {obj}를 쥐고 있다, 새로운 시작의 상징', '두 개의 {obj}를 든 인물이 균형을 잡고 선택 앞에 서 있다', '세 개의 {obj} 앞에서 협력하고 확장하는 인물들', '네 개의 {obj} 앞에서 멈추어 안정을 지키는 인물',
  '다섯 개의 {obj}를 두고 갈등하거나 상실을 겪는 인물들', '여섯 개의 {obj}가 나눔과 조화를 이루는 장면', '일곱 개의 {obj} 앞에서 도전과 방어 사이에 선 인물', '여덟 개의 {obj}와 함께 숙련·움직임에 몰두하는 인물',
  '아홉 개의 {obj}에 둘러싸여 거의 완성에 이른 인물', '열 개의 {obj}가 가득한 완결의 풍경, 그 안에 선 사람들', '{obj}를 호기심 어린 눈으로 바라보는 젊은 전령(페이지)', '{obj}를 들고 말을 타고 나아가는 기사(나이트)',
  '{obj}를 든 채 왕좌에 앉은 성숙하고 보살피는 여왕(퀸)', '{obj}를 든 채 왕좌에 앉아 통솔하는 왕(킹)'];

export const CARDS = [];
MAJ.forEach(([ko, en, scene], i) => CARDS.push({ id: 'M' + i, suit: 'M', rank: i, nameKo: ko, nameEn: en, scene }));
for (const k of Object.keys(SUITS)) { const S = SUITS[k]; RANK_KO.forEach((rk, i) => CARDS.push({ id: k + (i + 1), suit: k, rank: i + 1, nameKo: S.ko + ' ' + rk, nameEn: RANK_EN[i] + ' of ' + S.en, scene: RANK_SCENE[i].replace('{obj}', S.obj) + '. 배경: ' + S.place })); }
export const CARD_BY_ID = Object.fromEntries(CARDS.map(c => [c.id, c]));

// ── 비주얼 디렉션(타로 전용): 화풍·감성·세계관·분위기는 패널 이미지와 같은 선택지를 쓰되 타로 전용 항목을 더한다 ──
const O = DIRECTION_OPTIONS;
export const TAROT_OPTIONS = {
  art: { label: '화풍 (그림체)', default: 'tarotClassic', items: { tarotClassic: ['고전 타로 일러스트', '고전 타로 카드 일러스트 스타일. 또렷한 외곽선과 평면적인 채색, 상징적인 구도.'], artNouveau: ['아르누보', '아르누보 포스터 스타일. 유려한 곡선, 장식적인 선과 꽃 문양, 금빛 포인트.'], woodcut: ['목판화', '목판화 스타일. 거친 칼자국 선과 제한된 색, 강한 대비.'], ...Object.fromEntries(Object.entries(O.art.items).filter(([k]) => k !== 'realistic')) } },
  feel: { label: '감성 · 연출', default: 'cinematic', items: O.feel.items },
  world: { label: '세계관·배경', default: 'asis', items: { asis: ['정통 타로 세계', ''], ...Object.fromEntries(Object.entries(O.world.items).filter(([k]) => k !== 'asis')) } },
  mood: { label: '분위기', default: 'auto', items: O.mood.items },
  frame: { label: '카드 틀', default: 'bordered', items: { overlay: ['공통 프레임 사용 (그림만 생성)', '테두리·프레임·장식 틀·글자 없이 장면 일러스트만 화면 가득 그린다. 카드 틀은 나중에 따로 덮어씌우므로 그리지 않는다. 핵심 상징은 화면 중앙 80% 안쪽에 둔다.'], bordered: ['테두리 있는 완성 카드', '카드 한 장 전체가 보이는 세로 타로 카드 디자인. 장식 테두리가 일러스트를 둘러싼다.'], full: ['일러스트만 (테두리 없음)', '테두리 없이 일러스트가 화면 전체를 꽉 채운다.'] } },
  label: { label: '카드 이름 글자', default: 'none', items: { none: ['글자 없음', '화면 안에 글자·숫자·로고는 절대 넣지 않는다.'], ko: ['한글 카드명 넣기', '__KO__'], en: ['영문 카드명 넣기', '__EN__'] } },
};
export const REF_USE = { style: ['화풍·색감·틀만 참고 (구도·인물은 새로)', '첨부한 레퍼런스 이미지의 화풍, 색감, 질감, 카드 틀 디자인만 참고한다. 레퍼런스의 인물·구도·소재를 그대로 따라 그리지 않고 아래 카드의 장면을 새로 그린다.'], close: ['구도까지 비슷하게', '첨부한 레퍼런스 이미지의 구도와 분위기를 가깝게 따르되, 아래 카드의 상징과 장면에 맞게 바꿔 그린다.'] };
export const REF_OK = /^\/api\/clipfile\?k=([\w.-]{1,120})$/;
export const cleanRefs = v => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && REF_OK.test(x)))].slice(0, 3) : []);
export const DEFAULT_TAROT_DIR = { art: 'tarotClassic', feel: 'cinematic', world: 'asis', mood: 'auto', frame: 'bordered', label: 'none', extra: '', refs: [], refUse: 'style' };
export function cleanTarotDir(v) {
  v = v && typeof v === 'object' ? v : {}; const o = { ...DEFAULT_TAROT_DIR };
  for (const k of Object.keys(TAROT_OPTIONS)) if (typeof v[k] === 'string' && TAROT_OPTIONS[k].items[v[k]]) o[k] = v[k];
  o.extra = typeof v.extra === 'string' ? v.extra.trim().slice(0, 300) : ''; o.refs = cleanRefs(v.refs); o.refUse = REF_USE[v.refUse] ? v.refUse : 'style'; return o;
}
const part = (k, d) => TAROT_OPTIONS[k].items[d[k]][1];
export function tarotPrompt(card, dir, withRefs) {
  const c = typeof card === 'string' ? CARD_BY_ID[card] : card; if (!c) return ''; const d = cleanTarotDir(dir);
  const label = d.frame === 'overlay' ? part('label', { label: 'none' }) : d.label === 'ko' ? `카드 하단 띠에 한글로 '${c.nameKo}'만 정확히 적는다. 다른 글자는 넣지 않는다.` : d.label === 'en' ? `카드 하단 띠에 영어로 '${c.nameEn.toUpperCase()}'만 정확히 적는다. 다른 글자는 넣지 않는다.` : part('label', d);
  return [withRefs && REF_USE[d.refUse][1], '타로 카드 한 장의 일러스트: ' + c.nameEn + '(' + c.nameKo + ').', '장면: ' + c.scene + '.', part('art', d), part('feel', d), part('world', d), part('mood', d), part('frame', d), d.extra && '추가 방향: ' + d.extra + '.', label, '세로 2:3 구도, 상징이 한눈에 읽히게 중앙에 둔다.'].filter(Boolean).join('\n');
}

// 공통 카드 프레임(빈 틀) 프롬프트. 그림 창은 순수 마젠타 단색으로 칠하게 해서 관리자 화면에서 그 부분만 투명하게 뚫는다(크로마키).
export const FRAME_KEY_COLOR = '#FF00FF';
export function framePrompt(dir, extra) {
  const d = cleanTarotDir(dir);
  return ['타로 카드의 공통 프레임(빈 틀) 디자인 한 장.', '세로 카드 전체가 화면 끝까지 꽉 차게 그린다. 카드 바깥에 여백이나 그림자, 배경은 두지 않는다.',
    '카드 위쪽 가운데에 큰 직사각형 그림 창(가로 약 80%, 세로 약 74%)을 두고, 그 안은 장식·그라데이션·그림자 없이 완전히 평평한 순수 마젠타색(' + FRAME_KEY_COLOR + ') 한 가지 색으로만 채운다. 마젠타색은 그림 창 외에는 어디에도 쓰지 않는다.',
    '그림 창 아래에는 카드 이름이 들어갈 비어 있는 명판 띠를 둔다. 글자·숫자·로고·인물·풍경 그림은 절대 넣지 않는다. 테두리, 모서리 장식, 문양, 선 같은 프레임 장식만 그린다.',
    part('art', d), part('feel', d), part('world', d), part('mood', d), d.extra && '추가 방향: ' + d.extra + '.', extra && '프레임 요청: ' + String(extra).trim().slice(0, 300) + '.'].filter(Boolean).join('\n');
}
