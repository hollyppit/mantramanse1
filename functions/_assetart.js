// 풀이 화면 이미지 슬롯(자동차 10 · 직업 12 · 배우자 인상 24 · 전생 50 = 96장) — 슬롯 목록·프롬프트. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 슬롯 id 는 report/v2/deep*.js 의 fig(H, 슬롯, …) 와 같아야 한다(tests/asset-art-sim.js 가 맞는지 검사). 비주얼 디렉션은 패널 이미지(panel:direction)와 같은 설정을 쓴다.
import { styleOf, ELEMENTS } from './_panelart.js';

const CAR = { 갑: ['곧게 뻗은 대형 SUV·픽업트럭', '울창한 숲속 비포장 길', '목'], 을: ['경쾌한 소형 해치백', '꽃과 덩굴이 늘어진 골목 담장 옆', '목'], 병: ['눈에 띄는 붉은 컨버터블 스포츠카', '해 지는 해안 도로', '화'], 정: ['감성 있는 클래식 쿠페', '등불이 켜진 밤 시골길', '화'], 무: ['묵직한 대형 SUV', '큰 산 아래 황토빛 길', '토'],
  기: ['실용적인 승합 밴·왜건', '논밭 사이로 난 한적한 길', '토'], 경: ['강철 프레임의 오프로더·군용 지프', '바위 협곡을 가로지르는 험로', '금'], 신: ['정교한 은빛 럭셔리 세단', '보석 같은 야경이 펼쳐진 고급스러운 도심', '금'], 임: ['항속거리가 긴 장거리 전기 GT', '넓은 강과 바다를 끼고 달리는 고속도로', '수'], 계: ['조용한 하이브리드 소형차', '비 내리는 새벽 안개 낀 길', '수'] };
const CAREER = { creative: ['창작·콘텐츠', '햇빛이 드는 큰 창가의 작업실, 스케치와 붓·태블릿이 놓인 책상'], planning: ['기획·전략', '지도와 전략 보드가 붙은 벽, 메모와 화살표가 가득한 회의실'], research: ['연구·분석', '책 더미와 현미경·그래프가 있는 조용한 연구실'], education: ['교육·전문성', '칠판이 있는 교실, 학생들을 바라보는 선생님의 뒷모습'],
  business: ['사업·창업', '새벽에 문을 여는 작은 가게, 불이 막 켜지는 개업 풍경(간판 글자 없음)'], sales: ['영업·판매', '사람들이 오가는 활기찬 장터, 악수하는 두 사람'], management: ['경영·리더십', '도시가 내려다보이는 큰 회의 테이블과 상석'], organization: ['조직·운영', '질서 있게 정리된 사무실, 서류함과 일정표'],
  technical: ['기술·제작', '공구와 기계 부품이 놓인 공방 작업대'], communication: ['소통·방송', '조명이 켜진 방송 스튜디오, 마이크와 카메라'], asset: ['자산·금융', '저울과 금화, 단단한 금고가 있는 차분한 금융 공간'], public: ['공공·법·행정', '대리석 기둥이 늘어선 공공 청사 앞, 법전과 저울'] };
const FACE = { 자: ['다람쥐상', '눈이 반짝이고 재치 있는'], 축: ['곰상', '듬직하고 푸근한'], 인: ['호랑이상', '선이 또렷하고 눈빛이 강한'], 묘: ['토끼상', '맑고 순한'], 진: ['공룡상', '이목구비가 크고 시원한'], 사: ['여우상', '갸름하고 세련된'], 오: ['사슴상', '맑은 눈에 선이 긴'], 미: ['강아지상', '둥글고 따뜻한'], 신: ['수달상', '장난기 있고 재기발랄한'], 유: ['고양이상', '단정하고 도도한'], 술: ['늑대상', '날렵하고 경계심 있는'], 해: ['판다상', '둥글고 편안한'] };
const BR_EL = { 자: '수', 축: '토', 인: '목', 묘: '목', 진: '토', 사: '화', 오: '화', 미: '토', 신: '금', 유: '금', 술: '토', 해: '수' };
const PAST = { 비겁: { 목: '두레패를 이끌던 마을의 접장', 화: '불같은 성미로 의병을 모으던 장정', 토: '마을 장정들의 우두머리', 금: '의리로 사람을 지키던 호위무사', 수: '포구의 뱃사공 무리를 이끌던 사람' },
  식상: { 목: '글방에서 글을 가르치던 학자', 화: '장터에서 사람을 웃기던 연희패', 토: '손맛이 이름난 요리사·도공', 금: '쇠를 다루던 이름난 대장장이', 수: '밤마다 이야기를 풀던 이야기꾼' },
  재성: { 목: '약초·목재를 다루던 상인', 화: '비단과 등불을 팔던 장사꾼', 토: '곡물과 땅을 거래하던 객주', 금: '금은방·환전을 하던 상인', 수: '포구에서 무역을 하던 선상(船商)' },
  관성: { 목: '향교에서 일하던 서리', 화: '밤길을 지키던 포도청 관리', 토: '고을을 다스리던 향리·이장', 금: '성을 지키던 무관', 수: '말과 문서를 다루던 역관·밀사' },
  인성: { 목: '서당을 열던 훈장', 화: '사찰의 승려이자 제사를 맡던 사람', 토: '명당을 보던 지관(풍수가)', 금: '법과 율을 가르치던 율사', 수: '병을 보고 길흉을 짚던 의원·점술가' } };

// 재물 그릇 10종(그릇의 힘 5 × 재물의 성질 2: 정재형 fixed · 편재형 flow) — report/v2/deep-wealth.js 의 BOWLS 키와 같아야 한다. 사물이 화면 중심에 또렷하게 보이는 정물 그림(사람 없음).
const WEALTH = { 'rich:fixed': ['신강재왕 · 정재형 · 대형 스테인리스 금고', '크고 묵직한 스테인리스 대형 금고가 단단히 닫혀 있는 정물, 두꺼운 문과 볼트가 보이고 차갑고 또렷한 조명', '금'],
  'rich:flow': ['신강재왕 · 편재형 · 큰 호수', '산에 둘러싸인 넓고 깊은 호수, 맑은 물이 가득하고 강물이 흘러드는 스케일 큰 풍경', '수'],
  'heavy:fixed': ['재다신약 · 정재형 · 가득 찬 큰 옹기 독', '마당에 놓인 아주 큰 옹기 독이 가득 차 뚜껑이 들썩이고, 그 곁에 작은 지게가 무거워 보이는 정물, 해 질 녘 빛', '토'],
  'heavy:flow': ['재다신약 · 편재형 · 넘칠 듯 가득 찬 대형 물탱크', '물이 가득 차 넘치려 하는 거대한 금속 물탱크, 사람이 들기엔 너무 커 보이는 크기감, 해 질 녘 공장 마당', '토'],
  'poorS:fixed': ['신강재약 · 정재형 · 작지만 튼튼한 보온통', '작지만 반짝이는 스테인리스 보온통이 책상 위에 단단히 닫혀 놓인 정물, 튼튼하고 단정해 보인다', '금'],
  'poorS:flow': ['신강재약 · 편재형 · 바위 틈 옹달샘', '바위 틈에서 맑은 물이 가늘지만 끊임없이 솟는 작은 옹달샘, 이끼와 새벽 안개, 은은한 푸른빛', '수'],
  'poorW:fixed': ['신약재약 · 정재형 · 작은 돼지 저금통', '작은 돼지 저금통이 따뜻한 조명의 창가 책상에 놓인 소박한 정물, 동전이 조금 들어 있는 느낌', '토'],
  'poorW:flow': ['신약재약 · 편재형 · 물이 조금 고인 작은 바가지', '물이 조금 고인 작고 낡은 나무 바가지가 돌 위에 놓인 모습, 가장자리가 갈라져 물이 가늘게 새는 클로즈업', '목'],
  'mid:fixed': ['균형 · 정재형 · 묵직한 쌀독', '전통 곳간 안의 묵직한 쌀독과 항아리, 쌀이 적당히 담긴 따뜻한 빛', '토'],
  'mid:flow': ['균형 · 편재형 · 마을 우물', '마을 한가운데 오래된 돌 우물과 두레박, 사람은 없고 오가는 흔적만 보이는 아침 빛', '수'] };

// 연애 챕터: 만날 확률이 높은 장소 10 · 오행별 패션·그루밍 룩북 10(오행 5 × 성별) — report/v2/deep-love.js 의 PLACES·STYLE 과 같은 키.
const PLACE = { class: ['배움의 자리(클래스·강연·독서모임)', '조용한 강연장과 클래스 룸, 책과 노트를 펼친 사람들의 뒷모습, 따뜻한 스탠드 조명', '목'],
  nature: ['자연·야외(공원·등산·러닝·캠핑)', '이른 아침 숲길과 호숫가 산책로, 러닝하는 사람들의 실루엣, 안개와 맑은 햇살', '목'],
  intro: ['지인 소개·소규모 모임', '아늑한 카페 테이블에 둘러앉은 서너 명의 뒷모습, 따뜻한 조명과 커피 잔', '토'],
  event: ['공연·전시·축제', '저녁 공연장 입구와 전시장 조명, 환하게 모여든 사람들의 실루엣, 따뜻한 불빛', '화'],
  online: ['온라인·SNS·모임 앱', '어두운 방에서 스마트폰과 노트북 불빛이 얼굴 없이 은은하게 번지는 장면, 창밖 야경', '수'],
  work: ['직장·거래처·업무 네트워크', '해 질 녘 사무 빌딩 로비와 회의실 유리창, 서류를 든 사람들의 실루엣', '토'],
  local: ['동네·단골 가게·지역 동호회', '동네 골목의 단골 식당과 작은 가게 간판 불빛(글자 없음), 퇴근길 사람들', '토'],
  gym: ['운동·자기계발 모임(헬스·크루·스터디)', '새벽 한강변 러닝 크루와 체육관 유리창 너머 운동하는 실루엣, 서늘한 푸른 빛', '금'],
  trip: ['여행·이동 중(기차·공항·게스트하우스)', '새벽 기차역 플랫폼과 공항 창가, 캐리어를 든 여행자의 뒷모습, 넓은 하늘', '수'],
  bar: ['밤의 바·재즈바·야경 명소', '조명이 낮은 재즈바 카운터와 도시 야경 전망대, 잔에 비치는 불빛, 사람은 실루엣만', '화'] };
const STYLE = { 목: ['초록·카키·연두 계열, 린넨·면·니트, 여유 있고 자연스러운 실루엣', '자연스러운 레이어드 헤어, 맑은 피부 표현', 'wood'], 화: ['코랄·붉은 벽돌·버건디 계열, 실크·새틴·니트, 선명하고 허리선이 살아 있는 실루엣', '또렷한 눈매와 밝은 안색, 선명한 립 포인트', 'fire'],
  토: ['베이지·카멜·브라운 계열, 코튼·울·스웨이드, 편안하고 단정한 실루엣', '단정하게 정돈된 헤어, 매끈한 손과 따뜻한 인상', 'earth'], 금: ['화이트·아이보리·실버·그레이 계열, 울·셔츠 원단·메탈 액세서리, 각이 잡힌 깔끔한 실루엣', '정돈된 이마와 헤어, 깨끗한 손톱과 구두', 'metal'],
  수: ['네이비·블랙·딥블루 계열, 새틴·저지·유광 소재, 길고 흐르는 실루엣', '촉촉한 윤기 피부와 젖은 듯한 헤어 광택', 'water'] };

export const GROUPS = { place: '연애 · 만날 장소 (10)', style: '연애 · 패션·그루밍 (오행 5 × 성별)', car: '자동차 비유 (일간 10)', career: '직업 후보 (12직군)', spouse: '배우자 인상 (12지지 × 성별)', past: '전생 (십성 5 × 오행 5 × 성별)', wealth: '재물 그릇 (힘 5 × 성질 2 = 10종)' };
export function slots() {
  const out = [];
  for (const k of Object.keys(WEALTH)) out.push({ id: 'wealth:' + k, group: 'wealth', title: WEALTH[k][0] });
  for (const k of Object.keys(PLACE)) out.push({ id: 'place:' + k, group: 'place', title: PLACE[k][0] });
  for (const e of Object.keys(STYLE)) for (const g of ['F', 'M']) out.push({ id: `style:${e}:${g}`, group: 'style', title: `${e} 계열 룩 (${g === 'F' ? '여성' : '남성'})` });
  for (const k of Object.keys(CAR)) out.push({ id: 'car:' + k, group: 'car', title: `${k} · ${CAR[k][0]}` });
  for (const k of Object.keys(CAREER)) out.push({ id: 'career:' + k, group: 'career', title: CAREER[k][0] });
  for (const b of Object.keys(FACE)) for (const g of ['F', 'M']) out.push({ id: `spouse:${b}:${g}`, group: 'spouse', title: `${b} · ${FACE[b][0]} (${g === 'F' ? '여성' : '남성'})` });
  for (const g of Object.keys(PAST)) for (const e of Object.keys(PAST[g])) for (const s of ['F', 'M']) out.push({ id: `past:${g}:${e}:${s}`, group: 'past', title: `${g}·${e} · ${PAST[g][e]} (${s === 'F' ? '여성' : '남성'})` });
  return out;
}
export const SLOT_BY_ID = Object.fromEntries(slots().map(s => [s.id, s]));
// R2 키에는 한글을 쓸 수 없다(clipfile 키 규칙) — 영문·숫자 외는 _코드 로 바꾼다.
export const keyOf = id => 'asset-' + id.replace(/[^A-Za-z0-9]/g, c => '_' + c.codePointAt(0).toString(16));
export const SLOT_KEY = /^asset-[\w.-]{1,100}$/;

export function promptOf(id, dir) {
  const [g, a, b, c] = id.split(':'), pal = e => (ELEMENTS[e] ? ELEMENTS[e].palette : '');
  if (g === 'car' && CAR[a]) { const [v, scene, el] = CAR[a]; return styleOf({ ...dir, people: 'none' }) + `\n주제: 사람의 성격을 상징하는 자동차 한 대를 멋지게 그린다. 차종: ${v}. 배경: ${scene}. 사람은 그리지 않는다.\n색과 빛: ${pal(el === '목' ? 'wood' : el === '화' ? 'fire' : el === '토' ? 'earth' : el === '금' ? 'metal' : 'water')}.`; }
  if (g === 'place' && PLACE[a]) { const [v, scene, el] = PLACE[a], E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[el]; return styleOf({ ...dir, people: dir.people === 'face' ? 'face' : 'back' }) + `
주제: 새로운 인연을 만나기 좋은 장소 '${v}'의 분위기가 한눈에 보이는 장면. ${scene}.
색과 빛: ${pal(E)}.`; }
  if (g === 'style' && STYLE[a] && (b === 'F' || b === 'M')) { const [look, groom, E] = STYLE[a]; return styleOf({ ...dir, people: 'face' }) + `
주제: ${a}(五行) 기운의 ${b === 'F' ? '여성' : '남성'} 패션·그루밍 룩북 화보, 허리 위 반신 또는 전신. 스타일: ${look}. 그루밍: ${groom}. 가상의 인물이며 실존 인물을 닮게 그리지 않는다. 배경은 단순한 스튜디오 톤.
색과 빛: ${pal(E)}.`; }
  if (g === 'wealth' && WEALTH[a + ':' + b]) { const [v, scene, el] = WEALTH[a + ':' + b], E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[el]; return styleOf({ ...dir, people: 'none' }) + `\n주제: 사람의 '재물 그릇'을 상징하는 사물 그림. 그릇: ${v}. 장면: ${scene}. 그릇이 화면 중심에 크고 또렷하게 보이게 하고 사람은 그리지 않는다.\n색과 빛: ${pal(E)}.`; }
  if (g === 'career' && CAREER[a]) return styleOf({ ...dir, people: dir.people === 'face' ? 'face' : 'back' }) + `\n주제: '${CAREER[a][0]}' 일의 분위기가 한눈에 보이는 장면. ${CAREER[a][1]}.`;
  if (g === 'spouse' && FACE[a]) { const el = BR_EL[a], woman = b === 'F', E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[el];
    return styleOf({ ...dir, people: 'face' }) + `\n주제: ${FACE[a][0]} 인상의 ${woman ? '젊은 여성' : '젊은 남성'} 반신 초상. ${FACE[a][1]} 분위기이며, 동물의 귀·털은 그리지 않고 이목구비와 표정의 닮은 인상만 사람으로 표현한다. 가상의 인물이고 실존 인물을 닮게 그리지 않는다.\n색과 빛: ${pal(E)}.`; }
  if (g === 'past' && PAST[a] && PAST[a][b] && (c === 'F' || c === 'M')) { const E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[b];
    return styleOf({ ...dir, people: dir.people === 'face' ? 'face' : 'back' }) + `\n주제: 조선 시대 무렵의 한국을 배경으로 '${PAST[a][b]}'의 모습을 상징적으로 그린다. 그 인물은 ${c === 'F' ? '여성' : '남성'}이다. 시대에 맞는 의복과 소품, 그 사람의 일터가 함께 보이게.\n색과 빛: ${pal(E)}.`; }
  return '';
}

// Kling 이미지→영상 프롬프트(시작 프레임 = 슬롯의 현재 이미지). 그룹별로 잔잔한 움직임만 주고 인물·사물의 모양은 바꾸지 않는다.
const KLING_MOTION = {
  car: 'light shifts slowly across the car body, dust and leaves drift gently, the background foliage and clouds move softly; the car stays parked and does not drive away',
  career: 'ambient motion only: light and shadows shift softly, dust floats in the light, small background activity moves slowly',
  spouse: 'a soft breeze stirs the hair, the light glimmers gently, a very slow natural blink and a subtle soft expression',
  past: 'wind moves the clothes and hair, dust and embers drift, distant lantern or sunlight flickers softly',
  place: 'light and shadows shift softly, distant silhouettes move slowly, mist or lights shimmer gently',
  style: 'a soft breeze stirs the hair and clothing, the studio light glimmers gently, a very slow natural blink and a subtle soft expression',
  wealth: 'light glints softly on the object, dust motes and mist drift slowly, background light flickers gently; the object itself stays still' };
export const KLING_NEG = 'text, subtitles, watermark, logo, face distortion, face morphing, changing identity, extra limbs, sudden camera cut, fast motion, flicker, jitter';
export function klingOf(id) {
  const s = SLOT_BY_ID[id]; if (!s) return null;
  return { prompt: `Gentle, cinematic motion on the first-frame image. ${KLING_MOTION[s.group][0].toUpperCase() + KLING_MOTION[s.group].slice(1)}. The camera does a very slow push-in. Keep the subject, composition, colors and the illustration style exactly as in the image; smooth, loop-friendly movement; no text appears.`, negative: KLING_NEG };
}
