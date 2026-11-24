/* 신년운세 문구 품질 검사(조합 결과·문구 DB 공용). 실패 목록을 돌려준다. */
(function (root) {
  'use strict';
  var BANNED = [
    [/반드시|틀림없이|무조건|100\s*%|확실히 (?:일어|생기|됩니다)/, '확정 표현'],
    [/사고가 (?:납니다|나요|날 거|나리라)|병에 걸(?:립|려요|릴 거|리리라)|(?:돈|재물)을 잃(?:습|어요|을 거|으리라)|이혼(?:합니다|해요|하게 됩|하리라)|(?<![허희소원절야])망(?:합니다|해요|하리라)|죽(?:습니다|어요|게 됩|을 수|으리라)/, '단정 예언'],   // ~리라: 토정 원문 해석의 고전체(2026-11-25)
    [/(?:약|영양제)을 (?:드세요|먹으세요)|(?:주식|코인|부동산)을 (?:사세요|파세요)|투자하세요/, '의료·투자 지시'],
    [/노력하면 좋은 결과|건강에 유의하세요|긍정적인 마음을 가지|좋은 일이 있을 거예요/, '범용 문장'],
    [/^(?:신강|신약|용신|희신|기신|십성|합충|격국)(?:은|는|이|가)\s/, '용어를 주어로 씀'],
  ];
  var POLITE_END = /(?:요|다|니다|세요|까요|죠|요\?|요!|[.!?…)」』"'·]|\d)\s*$/;
  function checkText(text, role) {
    var t = String(text || '').trim(), out = [];
    if (!t) return out;
    BANNED.forEach(function (b) { if (b[0].test(t)) out.push(b[1]); });
    if (role !== 'tojeong' && role !== 'note' && role !== 'basis') {
      t.split(/(?<=[.?!])\s+/).forEach(function (s) { if (s.length > 140) out.push('문장 김(' + s.length + '자)'); });
      if (!POLITE_END.test(t)) out.push('존댓말 끝맺음 아님');
    }
    return out;
  }
  function checkReading(sentences) {
    var problems = [], seen = {};
    sentences.forEach(function (s) {
      checkText(s.text, s.role).forEach(function (p) { problems.push({ kind: p, text: s.text }); });
      var k = s.text.replace(/\s+/g, '');
      if (seen[k] && s.role !== 'tojeong') problems.push({ kind: '같은 풀이 안 반복', text: s.text });
      seen[k] = 1;
    });
    return problems;
  }
  var API = { BANNED: BANNED, checkText: checkText, checkReading: checkReading };
  root.NewyearQuality = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : globalThis);
