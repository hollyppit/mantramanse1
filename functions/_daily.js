// 오늘의 운테크(4단계) — 회원의 일간·일지(일주)와 오늘 일진만으로 만드는 하루 카드. AI 없음, 미리 쓴 문안만 쓴다.
//   · 생년월일은 쓰지 않는다(광장은 일주·일간 이름만 가지고 있다). 그래서 "원국 전체"가 아니라 "일주와 오늘 하루의 만남"만 읽는다고 화면에 밝힌다.
//   · 천간: 오늘 일진 천간이 내 일간에게 어떤 십성인지(10가지) → 하루의 결
//   · 지지: 오늘 일진 지지와 내 일지의 육합·충·같은 글자 → 마음·관계의 결
//   · 날짜는 한국 시간 자정 기준(자시 학파 차이는 다루지 않는다)
import '../engine.js';

const M = () => globalThis.Manse;
export const STEMS = '갑을병정무기경신임계'.split('');
export const BRANCHES = '자축인묘진사오미신유술해'.split('');
const EL_KO = ['목', '화', '토', '금', '수'];
const HAP = ['자축', '인해', '묘술', '진유', '사신', '오미'];
const CHUNG = ['자오', '축미', '인신', '묘유', '진술', '사해'];

// 한국 시간 기준 오늘(YYYY-MM-DD)
export function kstDay(now = Date.now()) { return new Date(now + 9 * 3600e3).toISOString().slice(0, 10); }
export function dayPillar(day) {
  const [y, m, d] = day.split('-').map(Number), p = M().dayPillarOfJdn(M().jdnFromYMD(y, m, d));
  return { s: p.s, b: p.b, name: STEMS[p.s] + BRANCHES[p.b], el: EL_KO[Math.floor(p.s / 2)] };
}
const pairIn = (list, a, b) => list.includes(a + b) || list.includes(b + a);
export function branchRel(myBranch, todayBranch) {
  if (!myBranch || !todayBranch) return 'none';
  if (myBranch === todayBranch) return 'same';
  if (pairIn(HAP, myBranch, todayBranch)) return 'hap';
  if (pairIn(CHUNG, myBranch, todayBranch)) return 'chung';
  return 'none';
}

// 십성별 하루 문안. head 는 두 가지 중 날짜로 고른다(매일 같은 문장이 반복되지 않게)
export const TG_COPY = {
  '비견': { key: '나란히 서는 날', head: ['내 페이스대로 가도 되는 날이에요', '비슷한 사람들 사이에서 힘이 나는 하루'], body: '오늘은 나와 같은 기운이 들어와 자기 주장이 또렷해져요. 혼자 밀고 나가는 일에 힘이 붙지만, 같은 걸 원하는 사람과 부딪치기도 쉬워요.', money: '같이 쓰는 돈(더치·공동 구매)은 기준부터 정하고 시작하세요. 남이 산다고 따라 사는 소비는 한 번 더 생각해요.', people: '동료·친구와 역할을 나누면 일이 빨라져요. 경쟁심이 올라오면 "누가 이기나" 대신 "누가 뭘 맡나"로 바꿔 말해 보세요.', do: '미뤄 둔 혼자 하는 일 끝내기', avoid: '고집 때문에 도움 거절하기' },
  '겁재': { key: '나눠 갖는 날', head: ['지갑과 마음이 쉽게 열리는 날', '남의 일에 휩쓸리기 쉬운 하루'], body: '나와 닮았지만 결이 다른 기운이 들어와요. 사람 사이에서 에너지가 오가고, 그만큼 돈과 시간도 새어 나가기 쉬워요.', money: '즉흥 지출·빌려주기·급한 투자 권유는 하루 미루세요. 오늘 쓰는 돈은 "내가 정한 한도"까지만.', people: '부탁을 받으면 바로 답하지 말고 "확인하고 알려 줄게"로 시간을 버세요. 경쟁 상황이면 내 몫부터 지키는 게 먼저예요.', do: '가계부·정산 한 번 훑기', avoid: '보증·돈 거래 약속' },
  '식신': { key: '만들고 누리는 날', head: ['손끝에서 결과가 나오는 날', '맛있는 것, 좋은 것이 잘 맞는 하루'], body: '내가 가진 걸 자연스럽게 풀어내는 기운이에요. 손을 움직여 만드는 일, 꾸준히 해 온 일의 결과가 잘 보이고 몸과 마음이 비교적 여유로워요.', money: '작은 부수입·재능 판매·콘텐츠처럼 "내가 만든 것"으로 버는 돈과 잘 맞아요. 먹고 즐기는 데 쓰는 돈은 기분 좋은 만큼만.', people: '편하게 웃고 나누는 대화가 관계를 부드럽게 해요. 맛있는 걸 함께 먹자고 먼저 제안해 보세요.', do: '작은 결과물 하나 완성하기', avoid: '과식·늦은 밤 군것질' },
  '상관': { key: '말이 날카로워지는 날', head: ['아이디어는 반짝, 말은 조심하는 날', '틀을 깨고 싶어지는 하루'], body: '표현력과 비판력이 함께 올라와요. 기획·글쓰기·발표처럼 내 생각을 꺼내는 일엔 좋지만, 윗사람이나 규칙과 부딪치기 쉬워요.', money: '새로운 수익 아이디어를 적어 두기 좋은 날. 다만 "지금 당장 바꾸자"는 결정(해지·이직 통보·큰 결제)은 하루 묵혀 두세요.', people: '맞는 말도 말투 때문에 손해 볼 수 있어요. 지적하기 전에 한 번 더 고쳐 말하기, 메시지는 보내기 전에 다시 읽기.', do: '아이디어 메모·기획서 초안', avoid: '감정 섞인 단체 대화방 답장' },
  '편재': { key: '판이 커지는 날', head: ['기회가 굴러들어오기 쉬운 날', '바깥 활동이 돈이 되는 하루'], body: '활동 반경이 넓어지고 사람·정보·기회가 많이 오가요. 움직이는 만큼 얻는 게 있지만, 크게 벌이고 싶은 마음도 함께 커져요.', money: '영업·거래·협상처럼 밖에서 움직이는 일에 운이 붙어요. 투자·투기성 결정은 "잃어도 괜찮은 만큼"이라는 선을 먼저 그으세요.', people: '새로운 사람을 만나기 좋은 날. 약속은 많이 잡되, 지킬 수 있는 만큼만 말하세요.', do: '연락 끊긴 사람에게 안부 하나', avoid: '한 번에 크게 베팅하기' },
  '정재': { key: '차곡차곡 쌓는 날', head: ['꼼꼼함이 보상받는 날', '작은 돈이 제자리를 찾는 하루'], body: '현실 감각이 또렷해지고 계산이 정확해져요. 큰 한 방보다 정리·관리·마무리에서 성과가 나는 날이에요.', money: '고정비 점검, 구독 정리, 적금·자동이체 설정처럼 "새는 돈 막기"가 오늘의 운테크예요. 받을 돈이 있다면 정중하게 챙기세요.', people: '약속 시간·마감처럼 기본을 지키는 모습이 신뢰를 만들어요. 연인·가족에게는 작은 실용적인 챙김이 통해요.', do: '구독·고정비 하나 정리', avoid: '귀찮아서 미뤄 둔 영수증 방치' },
  '편관': { key: '압박이 오는 날', head: ['버티는 힘이 시험받는 날', '해야 할 일이 몰려오는 하루'], body: '바깥에서 요구와 압박이 들어오는 기운이에요. 몸과 마음이 쉽게 긴장하지만, 어려운 일을 정면으로 처리하면 오히려 인정받기 좋은 날이에요.', money: '급하게 나가는 돈(벌금·수리비·갑작스런 경조사)에 대비해 여유분을 남겨 두세요. 겁이 나서 내리는 결정은 피하세요.', people: '갈등이 생기면 감정보다 사실과 순서로 대응하세요. 무리한 요구에는 "어디까지 가능한지"를 분명히 말해도 괜찮아요.', do: '가장 하기 싫은 일 하나 먼저 처리', avoid: '수면 줄여 가며 버티기' },
  '정관': { key: '제자리를 지키는 날', head: ['원칙대로 하면 인정받는 날', '책임감이 빛나는 하루'], body: '질서와 신뢰의 기운이 들어와요. 맡은 일을 반듯하게 해내면 평가가 따라오고, 공식적인 일(서류·면담·계약)을 다루기 좋아요.', money: '계약서·약관을 꼼꼼히 읽는 습관이 돈을 지켜 줘요. 정식 절차를 밟는 재테크(연금·청약 점검)와 잘 맞아요.', people: '예의와 약속이 관계를 단단하게 해요. 윗사람·조직과 이야기할 일이 있다면 오늘이 좋아요.', do: '미뤄 둔 서류·신청 마무리', avoid: '지각·마감 넘기기' },
  '편인': { key: '생각이 깊어지는 날', head: ['혼자만의 시간이 답을 주는 날', '직감이 예민해지는 하루'], body: '안으로 파고드는 기운이에요. 공부·연구·상담처럼 깊이 생각하는 일엔 좋지만, 기분이 쉽게 가라앉거나 일을 시작하기 귀찮아질 수 있어요.', money: '새 분야를 공부하거나 정보를 모으기엔 좋지만, 확인 안 된 "꿀팁"으로 바로 돈을 움직이진 마세요.', people: '연락이 뜸해져도 괜찮은 날. 다만 오해가 쌓이지 않게 짧은 답장은 남겨 두세요.', do: '읽고 싶던 글·강의 하나', avoid: '밤새 걱정 곱씹기' },
  '정인': { key: '도움이 들어오는 날', head: ['기댈 곳이 생기는 날', '배우고 쉬기 좋은 하루'], body: '나를 채워 주는 기운이 들어와요. 도움을 받거나 배우는 일이 잘 풀리고, 마음이 차분해져 회복하기 좋은 날이에요.', money: '자격증·교육처럼 나에게 투자하는 돈은 아깝지 않아요. 도움을 받았다면 작게라도 고마움을 표현하세요.', people: '선배·부모님·스승처럼 나를 챙겨 주는 사람과 연락하기 좋아요. 받기만 하지 말고 근황을 먼저 전해 보세요.', do: '감사 인사 하나 보내기', avoid: '도움을 당연하게 여기기' },
};
export const REL_COPY = {
  hap: { key: '마음이 맞물리는 날', line: '오늘 일진이 내 일지와 합을 이뤄요. 관계가 부드럽게 이어지고, 미뤄 둔 화해·제안을 꺼내기 좋아요. 다만 정에 끌려 원치 않는 약속까지 하지는 마세요.' },
  chung: { key: '흔들림이 있는 날', line: '오늘 일진이 내 일지와 부딪혀요(충). 계획이 바뀌거나 마음이 들썩일 수 있어요. 이동·운전은 여유 있게, 큰 결정은 하루 미루면 좋아요.' },
  same: { key: '나를 비추는 날', line: '오늘 일진의 땅 글자가 내 일지와 같아요. 내 버릇과 습관이 그대로 드러나기 쉬운 날이라, 평소 고치고 싶던 점을 알아차리기 좋아요.' },
  none: { key: '', line: '오늘 일진과 내 일지 사이에 두드러진 합·충은 없어요. 위의 하루 결을 중심으로 보세요.' },
};
const pick = (arr, day) => arr[[...day].reduce((a, c) => a + c.charCodeAt(0), 0) % arr.length];

// ilju: '갑자' 같은 일주 이름 → 오늘 카드
export function todayCard(ilju, day = kstDay()) {
  const s = STEMS.indexOf(ilju && ilju[0]), b = BRANCHES.indexOf(ilju && ilju[1]);
  if (s < 0 || b < 0) return null;
  const dp = dayPillar(day), tg = M().tenGod(s, dp.s), rel = branchRel(ilju[1], BRANCHES[dp.b]), c = TG_COPY[tg], r = REL_COPY[rel];
  return { day, dayPillar: dp.name, dayEl: dp.el, tenGod: tg, relation: rel, key: c.key, relKey: r.key, head: pick(c.head, day), body: c.body, money: c.money, people: c.people, do: c.do, avoid: c.avoid, relLine: r.line, basis: '내 일주(' + ilju + ')와 오늘 일진(' + dp.name + ')의 만남만 본 하루 카드예요. 사주 전체를 본 풀이가 아니며, 참고용으로만 읽어 주세요.' };
}

// ── 익명 통계: 최소 표본·작은 칸 숨김·5% 반올림 ──
export const STAT_MIN = 20, CELL_MIN = 10;
const r5 = x => Math.round(x / 5) * 5;
export const MOODS = { 5: '아주 좋음', 4: '좋음', 3: '보통', 2: '별로', 1: '힘듦' };
export const LOG_TAGS = { work: '일', money: '돈', love: '연애', people: '사람', health: '몸', rest: '쉼', study: '배움', family: '가족' };
export function groupStats(rows) {
  const n = rows.length;
  if (n < STAT_MIN) return { open: false, need: STAT_MIN };
  const mood = {}, tag = {};
  rows.forEach(r => { mood[r.mood] = (mood[r.mood] || 0) + 1; (r.tags || []).forEach(t => { if (LOG_TAGS[t]) tag[t] = (tag[t] || 0) + 1; }); });
  const good = rows.filter(r => r.mood >= 4).length;
  const moods = [5, 4, 3, 2, 1].map(k => ({ mood: k, label: MOODS[k], pct: (mood[k] || 0) >= CELL_MIN ? r5((mood[k] / n) * 100) : null }));
  const tags = Object.keys(tag).filter(t => tag[t] >= CELL_MIN).sort((a, b) => tag[b] - tag[a]).slice(0, 3).map(t => ({ tag: t, label: LOG_TAGS[t], pct: r5((tag[t] / n) * 100) }));
  return { open: true, size: n >= 100 ? '100명 이상' : n >= 50 ? '50명 이상' : '20명 이상', goodPct: r5((good / n) * 100), moods, tags };
}

// 내 기록 회고: 기간 안 기록 → 평균 기분, 많이 쓴 태그, 십성별 평균(2번 이상 기록된 십성만)
export function reflect(logs) {
  if (!logs.length) return { count: 0 };
  const avg = a => Math.round((a.reduce((s, x) => s + x.mood, 0) / a.length) * 10) / 10;
  const tag = {}; logs.forEach(l => (l.tags || []).forEach(t => { if (LOG_TAGS[t]) tag[t] = (tag[t] || 0) + 1; }));
  const byTg = {}; logs.forEach(l => { if (l.ten_god) (byTg[l.ten_god] = byTg[l.ten_god] || []).push(l); });
  const tgs = Object.keys(byTg).filter(k => byTg[k].length >= 2).map(k => ({ tenGod: k, avg: avg(byTg[k]), n: byTg[k].length })).sort((a, b) => b.avg - a.avg);
  const best = tgs[0], worst = tgs.length > 1 ? tgs[tgs.length - 1] : null;
  let insight = '';
  if (best && worst && best.avg - worst.avg >= 0.8) insight = '기록을 보면 ' + best.tenGod + ' 날(' + TG_COPY[best.tenGod].key + ')에 기분이 가장 좋았고, ' + worst.tenGod + ' 날(' + TG_COPY[worst.tenGod].key + ')엔 조금 가라앉았어요. 다음 ' + worst.tenGod + ' 날엔 일정을 가볍게 잡아 보세요.';
  else if (logs.length < 5) insight = '기록이 5일 이상 모이면 나에게 잘 맞는 날의 패턴을 찾아 드려요.';
  else insight = '날마다 기분 차이가 크지 않았어요. 안정적으로 지낸 기간이에요.';
  return { count: logs.length, avg: avg(logs), good: logs.filter(l => l.mood >= 4).length, topTags: Object.keys(tag).sort((a, b) => tag[b] - tag[a]).slice(0, 3).map(t => ({ tag: t, label: LOG_TAGS[t], n: tag[t] })), byTenGod: tgs, insight };
}
