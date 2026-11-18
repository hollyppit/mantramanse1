/* 시대 흐름 ↔ 개인 명식 다리 — 공통인 시대 기운(macro-era.js)을 이 사람의 원국·대운·세운이 어떻게 받아들이는지. 2026-11-18
   · 시대 오행은 개인의 용신이 되지 않는다. 용신·희신·기신은 기존 통합 용신 엔진(ch.unified.roles)을 그대로 읽는다.
   · 상생·상극은 '관계'로만 보여 주고, 좋고 나쁨은 그 오행들의 이 사람 안에서의 역할(용신·기신 등)로 판단한다.
   · 대운·세운·흐름 점수·luck-cycle 결과를 바꾸지 않는다(읽기만 하는 설명용 결과).
   · 결과 순서(사용자 해석 순서): ① 시대 환경 ② 개인 위치(원국·현재 대운) ③ 상호작용 ④ 시기별 변화(세운) ⑤ 영역(재물·커리어·인연) ⑥ 대응 방향
   · 브라우저·Node 공용. 사용: MantraMacroBridge.analyze(Manse, ch, ms) — ms 를 빼면 지금 */
(function (G) {
  'use strict';
  var VERSION = 'macro-era-bridge-20261118-1';
  var EL_K = ['목(木)', '화(火)', '토(土)', '금(金)', '수(水)'], GN = ['bi', 'sik', 'jae', 'gwan', 'in'], GK = ['비겁', '식상', '재성', '관성', '인성'];
  var GPLAIN = { bi: '나와 같은 편 기운', sik: '표현하고 만드는 기운', jae: '돈과 현실을 다루는 기운', gwan: '규칙과 책임의 기운', in: '배우고 기대는 기운' };
  var mod5 = function (x) { return ((x % 5) + 5) % 5; };
  var GOOD = { '용신': 1, '희신': 1 }, BAD = { '기신': 1, '구신': 1 };
  var side = function (role) { return GOOD[role] ? 'good' : BAD[role] ? 'bad' : 'mid'; };
  // a(위: 시대) 가 b(아래: 대운·세운) 에게
  function relEl(a, b) { if (a === b) return 'same'; if (mod5(a + 1) === b) return 'gives'; if (mod5(b + 1) === a) return 'gets'; if (mod5(a + 2) === b) return 'hits'; return 'hit'; }
  var REL_K = { same: '같은 오행', gives: '시대가 생해 줌', gets: '시대가 생을 받음', hits: '시대가 누름', hit: '시대가 눌림' };
  // 문장 안에서 운 쪽에서 본 관계(… 관계라)
  var REL_S = { same: '시대와 같은 오행인', gives: '시대 기운이 생해 주는', gets: '시대 기운을 생해 주는', hits: '시대 기운에 눌리는', hit: '시대 기운을 누르는' };

  // ① 시대 기운이 이 원국에서 맡는 역할
  function natalRole(M, ch, el) {
    var roles = (ch.unified && ch.unified.roles) || [], role = roles[el] || '', dEl = M.stemEl(ch.pillars.day.s), g = GN[mod5(el - dEl)], pct = (ch.weights && ch.weights.pct && ch.weights.pct[el]) || 0;
    var s = side(role), amount = pct < 3 ? 'absent' : pct >= 35 ? 'heavy' : 'some';
    var text;
    if (s === 'good' && amount === 'absent') text = '이 사주에 필요한 ' + EL_K[el] + ' 기운이 원국에는 거의 없는데, 시대가 그 기운을 바깥에서 보태 주는 흐름이에요.';
    else if (s === 'good') text = '시대의 ' + EL_K[el] + ' 기운은 이 사주에 ' + role + '이라, 큰 흐름이 내게 필요한 쪽으로 부는 편이에요.';
    else if (s === 'bad' && amount === 'heavy') text = '원국에 이미 많은 ' + EL_K[el] + ' 기운(' + Math.round(pct) + '%)이 시대 흐름으로 더 커지는 쪽이라, 넘치는 부분을 덜어 내는 생활이 중요해요.';
    else if (s === 'bad') text = '시대의 ' + EL_K[el] + ' 기운은 이 사주에 ' + role + '이라, 남들에게 순풍인 흐름이 내게는 부담으로 느껴질 수 있어요.';
    else text = '시대의 ' + EL_K[el] + ' 기운은 이 사주에 크게 돕지도 막지도 않는 쪽(' + (role || '중립') + ')이라, 시대보다 개인 대운의 영향이 더 크게 느껴지기 쉬워요.';
    return { el: el, elK: EL_K[el], role: role || '중립', side: s, group: g, groupK: GK[GN.indexOf(g)], groupPlain: GPLAIN[g], natalPct: Math.round(pct * 10) / 10, amount: amount, text: text };
  }

  // ③ 시대 ↔ 운(대운·세운) — 관계 + 두 오행의 역할로 판단(관계만으로 길흉을 정하지 않음)
  function luckVsEra(M, ch, eraEl, p, who) {
    var roles = (ch.unified && ch.unified.roles) || [], se = M.stemEl(p.s), be = M.stemEl(M.mainHidden(p.b));
    var rel = relEl(eraEl, se), lr = side(roles[se] || ''), er = side(roles[eraEl] || '');
    var t;
    if (lr === 'good') t = rel === 'gives' ? '시대 기운이 ' + who + '의 좋은 ' + EL_K[se] + ' 기운을 받쳐 줘서, ' + who + '의 도움이 더 크게 느껴지기 쉬워요.'
      : rel === 'same' ? '시대와 ' + who + '이 같은 ' + EL_K[se] + ' 기운이라, 필요한 기운이 겹쳐서 커지는 시기예요.'
        : rel === 'hits' ? '시대 기운이 ' + who + '의 좋은 ' + EL_K[se] + ' 기운을 누르는 관계라, ' + who + '의 도움이 생각보다 덜 느껴질 수 있어요.'
          : who + '의 좋은 ' + EL_K[se] + ' 기운은 ' + REL_S[rel] + ' 관계예요. 큰 마찰 없이 ' + who + '의 도움을 쓸 수 있는 편이에요.';
    else if (lr === 'bad') t = rel === 'hits' ? '시대 기운이 ' + who + '의 부담스러운 ' + EL_K[se] + ' 기운을 눌러 줘서, ' + who + '의 부담이 조금 덜어지는 쪽이에요.'
      : rel === 'gives' || rel === 'same' ? '시대 기운이 ' + who + '의 부담스러운 ' + EL_K[se] + ' 기운을 ' + (rel === 'same' ? '겹쳐' : '생해') + ' 키울 수 있어, 무리한 확장은 조심하는 편이 좋아요.'
        : who + '의 ' + EL_K[se] + ' 기운은 이 사주에 부담 쪽이지만 ' + REL_S[rel] + ' 관계라, 시대가 그 부담을 크게 키우지는 않아요.';
    else t = who + '의 ' + EL_K[se] + ' 기운은 이 사주에 중립에 가깝고, ' + REL_S[rel] + ' 관계예요. ' + (er === 'good' ? '이 시기에는 시대 쪽 순풍을 더 의식해 써 보세요.' : er === 'bad' ? '이 시기에는 시대 쪽 부담을 더 의식해 관리하세요.' : '시대와 ' + who + ' 모두 큰 쏠림은 없어요.');
    return { who: who, gz: (M.STEM ? M.STEM[p.s] : '') + (M.BR ? M.BR[p.b] : ''), stemEl: se, branchEl: be, stemRole: roles[se] || '중립', branchRole: roles[be] || '중립', rel: rel, relK: REL_K[rel], side: lr, text: t };
  }

  // ⑤ 영역 — 시대 오행이 이 사람에게 어떤 십성인지 + 그 역할(좋음/부담)
  var DOMAIN = {
    bi: { good: ['일: 혼자보다 동료·협업으로 움직일 때 시대 흐름을 타기 쉬워요.', '돈: 함께 하는 일에서 기회가 생기지만 몫은 처음부터 분명히 해 두세요.'], bad: ['일: 경쟁이 붙기 쉬운 흐름이라 내 몫과 역할을 지키는 데 신경 쓰세요.', '돈: 사람 사이에서 돈이 나뉘기 쉬운 흐름이에요. 동업·보증은 신중하게.'] },
    sik: { good: ['일: 만들고 표현하고 알리는 일이 시대 흐름과 맞물려요.', '돈: 재능과 결과물을 값으로 바꾸기 좋은 흐름이에요.'], bad: ['일: 보여 줄 일은 많아지는데 힘이 빨리 빠지기 쉬워요. 충전 주기를 정해 두세요.', '돈: 표현·경험에 쓰는 돈이 늘기 쉬우니 즐거움 예산을 따로 두세요.'] },
    jae: { good: ['돈: 돈과 현실을 다루는 일에 시대 바람이 맞게 부는 편이에요.', '일: 성과가 숫자로 보이는 일에서 기회가 커져요.'], bad: ['돈: 기회는 많아 보여도 감당할 크기를 먼저 정하는 게 중요해요.', '일: 성과 압박이 커지기 쉬우니 체력과 범위를 먼저 지키세요.'] },
    gwan: { good: ['일: 자리·책임·자격이 힘을 얻는 흐름이라, 조직이나 체계 안에서 인정받기 쉬워요.', '돈: 신용과 직함이 수입을 받쳐 주는 편이에요.'], bad: ['일: 책임과 규칙의 압박이 커지기 쉬워요. 맡을 일의 경계를 분명히 하세요.', '돈: 의무 지출이 늘기 쉬운 흐름이에요.'] },
    in: { good: ['일: 배우고 자격을 쌓는 일, 문서·지원이 힘이 되는 흐름이에요.', '돈: 서두르기보다 준비한 만큼 안정적으로 쌓이는 편이에요.'], bad: ['일: 생각과 준비가 길어지기 쉬운 흐름이에요. 마감을 먼저 정하세요.', '돈: 대비·준비에 쓰는 돈이 겹치지 않게 정리하세요.'] }
  };
  function domains(ch, nr) {
    var s = nr.side === 'mid' ? null : nr.side, d = DOMAIN[nr.group], out = [];
    if (s) d[s].forEach(function (t) { out.push(t); });
    else out.push('일·돈: 시대 기운이 이 사주에는 중립에 가까워, 영역별 변화는 개인 대운·세운 쪽을 기준으로 보는 편이 정확해요.');
    // 인연: 전통 배우자성(남 재성·여 관성) 기준임을 밝힌다
    var F = ch.gender === 'F', sp = F ? 'gwan' : 'jae';
    if (nr.group === sp) out.push('인연(전통 배우자성 기준 — ' + (F ? '여성은 관성' : '남성은 재성') + '): 시대 기운이 배우자성에 해당해, 인연 이야기가 ' + (s === 'good' ? '자연스럽게 늘어나는 흐름으로 읽어요.' : s === 'bad' ? '많아지지만 고르는 눈이 중요한 흐름으로 읽어요.' : '오가는 흐름으로 읽어요.'));
    else if (nr.group === 'sik') out.push('인연: 표현하는 기운이 시대 흐름과 닿아 있어, 마음을 표현하는 방식이 관계를 좌우하기 쉬워요.');
    else if (nr.group === 'bi') out.push('인연: 같은 편 기운이 커지는 흐름이라, 친구·동료 사이의 관계가 넓어지는 만큼 경쟁도 생길 수 있어요.');
    return out;
  }

  function analyze(M, ch, ms) {
    var ME = G.MantraMacroEra; if (!ME) throw new Error('macro-era.js 를 먼저 불러오세요');
    var t = ms || Date.now(), kd = new Date(t + 9 * 3600e3), y = kd.getUTCFullYear(), m = kd.getUTCMonth() + 1, d = kd.getUTCDate();
    var era = ME.eraAt({ y: y, m: m, d: d }); if (!era.supported) return { supported: false, era: era };
    var el = era.era.el, nr = natalRole(M, ch, el);
    var du = M.daeunAt ? M.daeunAt(ch, t) : null, sy = M.yearPillarAt ? M.yearPillarAt(t).sajuYear : y, se = M.seunRange ? M.seunRange(ch, sy, sy)[0] : null;
    var dv = du ? luckVsEra(M, ch, el, du, '대운') : null, sv = se ? luckVsEra(M, ch, el, se, '세운') : null;
    // ⑥ 대응 방향: 시대 역할 + 대운 판단을 합쳐 한 줄
    var act = nr.side === 'good' ? (dv && dv.side === 'bad' ? '시대 바람은 내 편이지만 지금 대운이 부담 쪽이에요. 시대 흐름에 맞는 일을 고르되 속도는 대운에 맞춰 조절하세요.' : '시대 바람이 내 편인 시기예요. 시대가 키우는 영역(' + nr.groupPlain + ')에 한 걸음 더 들어가 보세요.')
      : nr.side === 'bad' ? (dv && dv.side === 'good' ? '시대 바람은 부담 쪽이지만 지금 대운이 받쳐 줘요. 유행을 좇기보다 대운이 돕는 방향을 꾸준히 지키세요.' : '시대 바람이 부담 쪽이라, 남들이 몰리는 흐름을 그대로 따라가기보다 내 리듬을 지키는 쪽이 안전해요.')
        : '시대 기운은 중립에 가까워요. 개인 대운·세운의 흐름을 기준으로 움직이세요.';
    return {
      supported: true, version: VERSION, at: { y: y, m: m, d: d }, era: era, natal: nr,
      daeun: dv, seun: sv, domains: domains(ch, nr), action: act,
      note: '시대 흐름(삼원구운)은 모두에게 공통인 바깥 환경이고, 개인의 용신·운을 대신하지 않아요. 같은 시대라도 원국과 대운에 따라 다르게 작용해요. 상징 해석이며 사회 현상을 예측하는 것이 아니에요.',
      trace: { roles: (ch.unified && ch.unified.roles) || [], eraEl: el, theory: era.theory }
    };
  }

  var api = { version: VERSION, analyze: analyze, natalRole: natalRole, luckVsEra: luckVsEra, relEl: relEl, REL_K: REL_K };
  G.MantraMacroBridge = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
