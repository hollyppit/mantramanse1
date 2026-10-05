// Terms — 쉬운 용어 풀이. 챕터 글에 나오는 명리 용어를 "여기서 관성은 화(火) 기운을 말해요" 식으로 풀어 준다.
// 계산은 하지 않는다: 이미 나온 sd(만세력 엔진·명리 분석 결과)의 값을 읽어 이 사람의 사주에서 그 용어가 가리키는 것을 한 줄로 말해 줄 뿐이다.
//   explain(key, sd)        → { term, hanja, here, plain, analogy }   (here: 이 사주에서 가리키는 것, plain: 쉬운 뜻, analogy: 생활 비유)
//   forChapter(out, sd, n)  → 챕터 글에 나온 용어(우선) + 챕터 기본 용어, 최대 3개
// 말투는 해요체(UI 설명 voice). 사용자는 "이 사람"이 아니라 "내 사주"로 가리킨다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var ELN = { '목': '나무(木)', '화': '불(火)', '토': '흙(土)', '금': '쇠(金)', '수': '물(水)' };
  var ELTRAIT = { '목': '자라고 뻗는 힘', '화': '밝게 드러내고 달구는 힘', '토': '품고 중심을 잡는 힘', '금': '맺고 끊어 내는 힘', '수': '스며들고 흐르는 힘' };
  var jo = function (w, k) { return R.Narrator ? R.Narrator.josa(w, k) : ''; };
  var pctWord = function (p) { return p >= 35 ? '꽤 센 편이에요' : p < 5 ? '거의 없어요' : p < 14 ? '평균보다 적은 편이에요' : p >= 27 ? '평균보다 많은 편이에요' : '무난한 편이에요'; };

  // 십성군 5종: 일간(나)을 기준으로 한 관계. el 은 sd.groupEl 에서 읽는다.
  var GROUP = {
    '비겁': { hanja: '比劫', plain: '나와 같은 기운이에요. 자기 주관, 독립심, 형제·동료, 경쟁심을 뜻해요.', analogy: '같은 반 친구나 라이벌 같은 존재예요.' },
    '식상': { hanja: '食傷', plain: '내가 밖으로 꺼내 놓는 기운이에요. 표현력, 아이디어, 재능, 말솜씨를 뜻해요.', analogy: '무대 위에서 재주를 보여 주는 순간과 같아요.' },
    '재성': { hanja: '財星', plain: '내가 다스리고 얻는 기운이에요. 돈, 현실 감각, 성과, 실속을 뜻해요.', analogy: '내가 가꾸는 밭과 거기서 거두는 수확 같아요.' },
    '관성': { hanja: '官星', plain: '나를 다스리고 다듬는 기운이에요. 직장, 책임, 규칙, 평판, 그리고 나를 단련시키는 압박을 뜻해요.', analogy: '학교로 치면 담임 선생님과 교칙 같은 존재예요.' },
    '인성': { hanja: '印星', plain: '나를 길러 주는 기운이에요. 공부, 보호, 도움, 마음의 안정을 뜻해요.', analogy: '나를 품어 키워 준 부모님과 책가방 속 교과서 같아요.' },
  };
  var ELEMENT = {
    '목': { hanja: '木', plain: '나무의 기운이에요. 시작, 성장, 배움, 가능성을 뜻해요.' },
    '화': { hanja: '火', plain: '불의 기운이에요. 열정, 표현, 드러냄, 따뜻함을 뜻해요.' },
    '토': { hanja: '土', plain: '흙의 기운이에요. 중심, 안정, 신뢰, 품어 주는 힘을 뜻해요.' },
    '금': { hanja: '金', plain: '쇠의 기운이에요. 결단, 원칙, 정리, 완성도를 뜻해요.' },
    '수': { hanja: '水', plain: '물의 기운이에요. 지혜, 유연함, 흐름, 깊이를 뜻해요.' },
  };

  // 용어 사전: key → { hanja, plain, analogy, here(sd) → 문장 | '' }
  var T = {};
  Object.keys(GROUP).forEach(function (g) {
    T[g] = { hanja: GROUP[g].hanja, plain: GROUP[g].plain, analogy: GROUP[g].analogy, here: function (sd) {
      var el = sd.groupEl && sd.groupEl[g], p = sd.groups && sd.groups[g]; if (!el) return '';
      return '여기서 ' + g + jo(g, '은/는') + ' ' + ELN[el] + ' 기운을 말해요. 내 사주에는 이 기운이 ' + Math.round(p) + '%로, ' + pctWord(p) + ' (평균은 20%).';
    } };
  });
  Object.keys(ELEMENT).forEach(function (e) {
    T[e] = { hanja: ELEMENT[e].hanja, plain: ELEMENT[e].plain, analogy: '', here: function (sd) {
      var p = sd.fiveElements && sd.fiveElements[e]; if (p == null) return '';
      return '여기서 ' + e + jo(e, '은/는') + ' ' + ELN[e] + ' 기운이에요. 내 사주에는 ' + Math.round(p) + '%로 ' + pctWord(p) + (sd.dayMaster && sd.dayMaster.el === e ? ' 내 일간이 이 기운이라 "나 자신"을 상징해요.' : '');
    } };
  });
  T['오행'] = { hanja: '五行', plain: '세상을 이루는 다섯 가지 기운, 나무·불·흙·쇠·물이에요. 좋고 나쁨이 아니라 서로 어울리는 균형이 중요해요.', analogy: '다섯 가지 재료로 요리하는 것처럼, 어느 재료가 많고 적은지 보는 거예요.', here: function (sd) {
    var f = sd.fiveElements; if (!f) return ''; var k = Object.keys(f).sort(function (a, b) { return f[b] - f[a]; });
    return '여기서 오행은 내 사주의 다섯 기운이에요. 가장 큰 기운은 ' + ELN[k[0]] + '(' + Math.round(f[k[0]]) + '%), 가장 작은 기운은 ' + ELN[k[4]] + '(' + Math.round(f[k[4]]) + '%)예요.';
  } };
  T['일간'] = { hanja: '日干', plain: '태어난 날의 윗글자로, 사주에서 "나 자신"을 뜻해요. 모든 해석의 출발점이에요.', analogy: '지도에서 "현재 위치" 핀 같은 글자예요.', here: function (sd) {
    return sd.dayMaster ? '여기서 일간은 ' + sd.dayMaster.stem + '(' + ELN[sd.dayMaster.el] + ')이에요. 내 사주에서 "나"를 가리키는 글자예요.' : '';
  } };
  T['일주'] = { hanja: '日柱', plain: '태어난 날의 두 글자(하늘 글자+땅 글자)예요. 나의 기본 기질과 가까운 사람과의 관계를 보여 줘요.', analogy: '내 이름표 같은 두 글자예요.', here: function (sd) {
    return sd.dayPillar ? '여기서 일주는 ' + sd.dayPillar.ko + '이에요.' : '';
  } };
  T['일지'] = { hanja: '日支', plain: '태어난 날의 아랫글자예요. 가까운 관계, 특히 배우자 자리로 보는 곳이에요.', analogy: '집으로 치면 가장 안쪽 방이에요.', here: function (sd) {
    return sd.dayPillar ? '여기서 일지는 ' + sd.dayPillar.ko.charAt(1) + '이에요.' : '';
  } };
  T['월지'] = { hanja: '月支', plain: '태어난 달의 아랫글자예요. 내 사주가 어느 계절 속에서 태어났는지를 알려 줘서 기운의 세기를 좌우해요.', analogy: '식물이 어느 계절에 뿌리내렸는지 보는 것과 같아요.', here: function (sd) {
    return sd.pillars && sd.pillars.month ? '여기서 월지는 ' + sd.pillars.month.ko.charAt(1) + '이에요.' : '';
  } };
  T['원국'] = { hanja: '原局', plain: '태어난 해·달·날·시의 여덟 글자를 말해요. 바뀌지 않는 나의 기본 설계도예요.', analogy: '집으로 치면 타고난 구조와 뼈대예요.', here: function (sd) { return sd.dayPillar ? '여기서 원국은 내가 태어난 순간의 여덟 글자 전체를 말해요.' : ''; } };
  T['신강'] = { hanja: '身強', plain: '내 편이 되어 주는 기운이 넉넉한 구조예요. 에너지가 충분하지만 과하면 고집이 될 수 있어요.', analogy: '엔진 출력이 큰 차 같아요.', here: function (sd) { return strengthHere('신강', sd); } };
  T['중화'] = { hanja: '中和', plain: '내 편 기운과 나를 소모시키는 기운이 비슷한 균형 잡힌 구조예요.', analogy: '저울이 평평한 상태예요.', here: function (sd) { return strengthHere('중화', sd); } };
  T['신약'] = { hanja: '身弱', plain: '내 편이 되어 주는 기운이 상대적으로 적은 구조예요. 약하다는 뜻이 아니라 도움과 환경이 중요하다는 뜻이에요.', analogy: '좋은 팀과 장비가 큰 힘이 되는 사람 같아요.', here: function (sd) { return strengthHere('신약', sd); } };
  T['용신'] = { hanja: '用神', plain: '내 사주의 균형을 맞춰 주는 데 가장 도움이 되는 기운이에요. 부족한 쪽을 채워 주는 "처방 재료" 같아요.', analogy: '요리에서 간을 맞춰 주는 소금 한 꼬집 같아요.', here: function (sd) {
    var u = sd.usefulElements; return u ? '여기서 용신은 ' + ELN[u.yong] + ' 기운이에요. ' + ELTRAIT[u.yong] + '을 곁에 두면 균형에 도움이 돼요.' : '';
  } };
  T['대운'] = { hanja: '大運', plain: '10년 단위로 바뀌는 큰 환경이에요. 원국이 "나의 설계도"라면 대운은 "10년마다 달라지는 날씨와 지형"이에요.', analogy: '같은 산길인데 10년마다 계절이 바뀌는 느낌이에요.', here: function (sd) {
    var d = sd.currentDaewoon; if (!d) return ''; var S = R.Translator && R.Translator.SEASON && R.Translator.SEASON[d.season];
    return '여기서 대운은 ' + d.startYear + '년에 시작된 ' + d.ganzhi + ' 대운이에요.' + (S ? ' 지금은 "' + S.ko + '" 흐름이에요.' : '');
  } };
  T['세운'] = { hanja: '歲運', plain: '그해 한 해의 운이에요. 대운이 큰 지형이라면 세운은 그날그날의 날씨 같아요.', analogy: '같은 길이라도 비 오는 해와 맑은 해가 있는 것과 같아요.', here: function (sd) {
    var s = sd.sewoon; if (!s) return ''; var S = R.Translator && R.Translator.SEASON && R.Translator.SEASON[s.season];
    return '여기서 세운은 ' + s.year + '년의 운이에요.' + (S ? ' 올해는 "' + S.ko + '" 흐름이에요.' : '');
  } };
  T['월운'] = { hanja: '月運', plain: '그달의 흐름이에요. 한 해 안에서 계절처럼 조금씩 결이 달라져요.', analogy: '같은 해 안에서도 봄·여름이 다른 것과 같아요.', here: function (sd) {
    var m = sd.monthlyLuck && sd.monthlyLuck[0]; if (!m) return ''; var S = R.Translator && R.Translator.SEASON && R.Translator.SEASON[m.season];
    return '여기서 월운은 ' + m.month + '월의 흐름이에요.' + (S ? ' 이번 달은 "' + S.ko + '" 쪽이에요.' : '');
  } };
  T['합'] = { hanja: '合', plain: '두 글자가 서로 끌려서 붙는 관계예요. 협력, 인연, 결합의 에너지로 읽어요.', analogy: '자석처럼 서로 끌리는 느낌이에요.', here: function () { return ''; } };
  T['충'] = { hanja: '沖', plain: '두 글자가 서로 정면으로 부딪히는 관계예요. 변화, 이동, 긴장의 에너지로 읽어요. 나쁜 것이 아니라 움직임이 생긴다는 뜻이에요.', analogy: '파도가 부딪히며 물보라가 이는 것과 같아요.', here: function () { return ''; } };
  T['역마살'] = { hanja: '驛馬殺', plain: '이동·변화·여행의 기운이에요. 한곳에 오래 머물기보다 움직일 때 힘이 나는 경향이에요.', analogy: '역참에서 말을 갈아타는 사람 같아요.', here: function (sd) { return hasStar(sd, '역마살') ? '여기서 역마살은 내 사주에 실제로 들어 있는 기운이에요.' : ''; } };
  T['도화살'] = { hanja: '桃花殺', plain: '사람을 끄는 매력과 인기의 기운이에요. 좋고 나쁨이 아니라 사람 사이에서 눈에 띄는 경향이에요.', analogy: '봄날 복숭아꽃처럼 눈길이 가는 느낌이에요.', here: function (sd) { return hasStar(sd, '도화살') ? '여기서 도화살은 내 사주에 실제로 들어 있는 기운이에요.' : ''; } };
  function hasStar(sd, n) { return (sd.specialStars || []).some(function (s) { return s.name === n; }); }
  function strengthHere(k, sd) {
    if (!sd.strength) return ''; var what = { '신강': '내 편 기운이 넉넉한 구조', '중화': '힘이 균형 잡힌 구조', '신약': '내 편 기운이 상대적으로 적은 구조' }[k];
    return '여기서 ' + k + jo(k, '은/는') + ' ' + what + '를 말해요. 내 사주는 "' + sd.strength.zone + '"으로 읽혀요.'.replace('구조를', '구조를');
  }
  var KEYS = Object.keys(T);

  // 어떤 용어를 보여 줄지: 챕터 글에 직접 나온 용어를 우선, 없으면 챕터 기본 용어. @키는 사주에 따라 정해진다.
  var DEFAULT = { c01: ['일간', '일주'], c02: ['오행', '용신'], c03: ['@strength', '일간'], c04: ['식상', '@dominant'], c05: ['@weakest', '@dominant'], c06: ['관성', '식상'], c07: ['@dominant', '재성'], c08: ['재성', '식상'], c09: ['@spouse', '일지'],
    c10: ['@spouse', '일지'], c11: ['비겁', '관성'], c12: ['합', '충'], c13: ['월지', '인성'], c15: ['대운'], c16: ['대운', '용신'], c17: ['세운', '대운'], c18: ['월운', '세운'], c19: ['용신', '오행'], c20: ['용신', '대운'] };
  function resolve(k, sd) {
    if (k === '@strength') return sd.strength && T[sd.strength.band] ? sd.strength.band : '신강';
    if (k === '@dominant') return sd.dominantGroup; if (k === '@weakest') return sd.weakestGroup;
    if (k === '@spouse') return sd.gender === 'F' ? '관성' : '재성'; // 전통 해석에서 인연을 볼 때 참고하는 기운
    return k;
  }
  function explain(key, sd) {
    var t = T[key]; if (!t) return null; var here = '';
    try { here = t.here(sd || {}) || ''; } catch (e) { here = ''; }
    if (key === '재성' || key === '관성') { /* 인연 챕터에서는 한 줄 보충 */ }
    return { term: key, hanja: t.hanja, here: here, plain: t.plain, analogy: t.analogy || '' };
  }
  // out: 챕터 결과(headline·interpretation·meaning·details·topics). 반환: 최대 n 개
  function forChapter(out, sd, n) {
    n = n || 3; var base = out.base || out.id, text = [out.headline, out.interpretation, out.meaning].concat((out.details || []).map(function (d) { return [d.headline, d.summary, d.detail].join(' '); }), (out.topics || []).map(function (c) { return [c.headline, c.summary].join(' '); })).join(' ');
    var found = KEYS.filter(function (k) { return k.length >= 2 && text.indexOf(k) >= 0; }), keys = [];
    var push = function (k) { k = resolve(k, sd); if (k && T[k] && keys.indexOf(k) < 0) keys.push(k); };
    found.forEach(push); (DEFAULT[base] || []).forEach(push);
    return keys.slice(0, n).map(function (k) { return explain(k, sd); }).filter(function (x) { return x && (x.here || x.plain); });
  }
  R.Terms = { KEYS: KEYS, DEFAULT: DEFAULT, explain: explain, forChapter: forChapter, ELN: ELN };
})(typeof window !== 'undefined' ? window : globalThis);
