/* 풀이 정합성 검사(결정론적 규칙). 만세력 계산값(sd)을 사실로 고정하고, 문장이 그 값과 어긋나는지 확인한다.
   - 월령(sd.pillars.month 의 월지)이 '실제 출생 계절'이다. 일지·일주 DB 의 계절 비유(예: 亥 = 겨울 문턱)는 '일지의 상징'일 뿐 출생 환경이 아니다.
   - check(sd, text): 문장이 출생 계절을 단정하는 표현("…에서 자란/태어난/성장한")으로 월령과 다른 계절을 말하면 위반으로 돌려준다.
   AI 의미 검증은 보조 수단이고, 이 파일의 규칙이 먼저 걸러낸다. */
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var BR = '자축인묘진사오미신유술해';
  // 월지 → 월령 계절(절기 경계는 엔진의 월주 계산이 이미 반영한다: 입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한)
  var SEASON = { 인: '초봄', 묘: '한봄', 진: '늦봄', 사: '초여름', 오: '한여름', 미: '늦여름', 신: '초가을', 유: '한가을', 술: '늦가을', 해: '초겨울', 자: '한겨울', 축: '늦겨울' };
  var GROUP = { 봄: '인묘진', 여름: '사오미', 가을: '신유술', 겨울: '해자축' };
  var TEMP = { 봄: '따뜻해지며 습기가 오르는 시기', 여름: '덥고 불기운이 센 시기', 가을: '서늘하고 건조해지는 시기', 겨울: '춥고 물기운이 깊은 시기' };
  function groupOf(b) { for (var g in GROUP) if (GROUP[g].indexOf(b) >= 0) return g; return ''; }
  function monthBranchOf(sd) { var m = sd && sd.pillars && sd.pillars.month; return m && m.ko ? String(m.ko)[1] : ''; }
  function birthSeason(sd) { var b = monthBranchOf(sd); return b && SEASON[b] ? { branch: b, name: SEASON[b], group: groupOf(b), temp: TEMP[groupOf(b)] } : null; }
  // 일주 DB 의 계절 비유(일지 기준): 실제 출생 계절로 읽히지 않게 일지의 상징으로 말하는 문장 틀
  function branchSymbol(branch, image) { return '일지 ' + branch + '이(가) 상징하는 "' + image + '"의 기운'; }
  var CLAIM = /(?:에서|에|속에서|곁에서|곁에)\s*(?:태어난|태어나|자란|자라난|자라|성장한|나고 자란)/g;
  var SEASON_WORDS = { 봄: /(초봄|한봄|늦봄|이른 봄|봄)/, 여름: /(초여름|한여름|늦여름|무더운 여름|여름)/, 가을: /(초가을|한가을|늦가을|가을)/, 겨울: /(초겨울|한겨울|늦겨울|겨울 문턱|겨울)/ };
  // text 안의 출생 계절 단정 표현을 찾아 월령과 비교한다. 반환: 위반 목록([{ rule, claimed, actual, snippet }]).
  function check(sd, text) {
    var bs = birthSeason(sd), out = [], t = String(text || '').replace(/<[^>]*>/g, ' ');
    if (!bs) return out;
    var m; CLAIM.lastIndex = 0;
    while ((m = CLAIM.exec(t))) {
      var before = t.slice(Math.max(0, m.index - 24), m.index + m[0].length), claimed = null;
      for (var g in SEASON_WORDS) { if (SEASON_WORDS[g].test(before)) { claimed = g; break; } }
      if (claimed && claimed !== bs.group) out.push({ rule: 'birth-season', claimed: claimed, actual: bs.group, snippet: before.trim() });
    }
    // 일지 상징 문구가 "곁에서 자란" 같은 출생 환경 문형에 묶인 경우(계절 단어 없이도 오해 유발)
    if (/(?:문턱|물가|논밭|들판|바위산|언덕|숲)\s*곁에서\s*(?:자란|자라난)/.test(t)) out.push({ rule: 'branch-symbol-as-birth-env', claimed: '', actual: bs.group, snippet: (t.match(/.{0,16}곁에서\s*(?:자란|자라난).{0,8}/) || [''])[0] });
    return out;
  }
  // 문서(chapters) 전체 검사: 챕터별 위반 목록. 장면 html 의 글자만 본다.
  function checkDoc(sd, chapters) {
    var res = [];
    (chapters || []).forEach(function (c) { (c.scenes || []).forEach(function (s) { check(sd, s.html || s.text || '').forEach(function (v) { v.chapter = c.id; v.scene = s.sceneId; res.push(v); }); }); });
    return res;
  }
  R.Consistency = { SEASON: SEASON, birthSeason: birthSeason, branchSymbol: branchSymbol, check: check, checkDoc: checkDoc, monthBranchOf: monthBranchOf };
})(typeof window !== 'undefined' ? window : globalThis);
