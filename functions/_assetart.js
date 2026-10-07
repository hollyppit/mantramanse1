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

export const GROUPS = { car: '자동차 비유 (일간 10)', career: '직업 후보 (12직군)', spouse: '배우자 인상 (12지지 × 성별)', past: '전생 (십성 5 × 오행 5 × 성별)' };
export function slots() {
  const out = [];
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
  if (g === 'career' && CAREER[a]) return styleOf({ ...dir, people: dir.people === 'face' ? 'face' : 'back' }) + `\n주제: '${CAREER[a][0]}' 일의 분위기가 한눈에 보이는 장면. ${CAREER[a][1]}.`;
  if (g === 'spouse' && FACE[a]) { const el = BR_EL[a], woman = b === 'F', E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[el];
    return styleOf({ ...dir, people: 'face' }) + `\n주제: ${FACE[a][0]} 인상의 ${woman ? '젊은 여성' : '젊은 남성'} 반신 초상. ${FACE[a][1]} 분위기이며, 동물의 귀·털은 그리지 않고 이목구비와 표정의 닮은 인상만 사람으로 표현한다. 가상의 인물이고 실존 인물을 닮게 그리지 않는다.\n색과 빛: ${pal(E)}.`; }
  if (g === 'past' && PAST[a] && PAST[a][b] && (c === 'F' || c === 'M')) { const E = { 목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water' }[b];
    return styleOf({ ...dir, people: dir.people === 'face' ? 'face' : 'back' }) + `\n주제: 조선 시대 무렵의 한국을 배경으로 '${PAST[a][b]}'의 모습을 상징적으로 그린다. 그 인물은 ${c === 'F' ? '여성' : '남성'}이다. 시대에 맞는 의복과 소품, 그 사람의 일터가 함께 보이게.\n색과 빛: ${pal(E)}.`; }
  return '';
}
