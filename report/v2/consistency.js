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
  /* ── 원국 사실 대조 규칙: 계산값(sd)과 문장이 어긋나는지. 규칙마다 '문장 단위'로 보고, 상대방·궁합을 말하는 문장은 건너뛴다. ── */
  var ELK = ['목', '화', '토', '금', '수'], HJ_EL = { 木: '목', 火: '화', 土: '토', 金: '금', 水: '수' }, GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
  var OTHER = /(상대|배우자|궁합|파트너|연인|부모|자녀|아이|친구|동료|같은 일주|유명인|맞는|끌리는|부딪히는|TOP)/;
  var EL_RE = '(?:(목|화|토|금|수)\\s*\\(([木火土金水])\\)|([木火土金水])|(목|화|토|금|수)\\s*(?:기운|오행))(?:\\s*(?:기운|오행))?';
  function elOf(m) { return m[1] || HJ_EL[m[2]] || HJ_EL[m[3]] || m[4]; }
  var RE_EL_ABS = new RegExp(EL_RE + '(?:이|가|은|는)?\\s*(?:원국에\\s*)?(?:전혀\\s*|하나도\\s*)?없', 'g');
  var RE_EL_TOP = new RegExp(EL_RE + '(?:이|가|은|는)[^.。!?%0-9·]{0,14}?가장\\s*(?:강|많|두드러|센)', 'g');
  var RE_GR_ABS = /(비겁|식상|재성|관성|인성)(?:이|가|은|는)\s*(?:원국에\s*)?(?:전혀\s*|하나도\s*)?없/g;
  var RE_GR_TOP = /(비겁|식상|재성|관성|인성)(?:이|가|은|는)[^.。!?%0-9·]{0,14}?가장\s*(?:강|많|두드러|센)/g;
  var RE_STR = /(?:일간(?:이|은|는)?|사주(?:는|가)?|당신(?:은|이)?|원국(?:은|이)?)[^.。!?%0-9·]{0,12}?(?<![·/])(신강|신약)(?![·/]|약)/g;
  var RE_DM = /일간(?:은|이|는)?\s*([갑을병정무기경신임계])(?:목|화|토|금|수|\()/g;
  var RE_IJ = /(?:당신의|나의|내)\s*([갑을병정무기경신임계][자축인묘진사오미신유술해])일주/g;
  var RE_LUCK = /(세운[^.。!?]{0,6}?(?:10년마다|10년 단위|십 년마다)|대운[^.。!?]{0,8}?(?:올해의|올해 운|해마다 바뀌)|월운[^.。!?]{0,8}?(?:10년마다|해마다 바뀌))/g;
  // 용신·통근: 억부/조후는 학파마다 용신이 다를 수 있으므로 '어느 기준의 용신인지'가 밝혀진 문장은 그 기준의 값과, 밝혀지지 않은 문장은 어느 한 기준과라도 맞아야 한다.
  var RE_YONG_M = /(억부|조후)(?:상|로|론으로|상으로|기준(?:으로)?)?\s*용신(?:은|이|는|으로)?\s*(목|화|토|금|수)/g;
  var RE_YONG = /(?<!희신|기신|구신|한신)용신(?:은|이|는|인)\s*(목|화|토|금|수)/g;
  var RE_ROOT_NO = /(?:통근(?:이|은|도)|뿌리(?:가|는))\s*(?:전혀\s*|하나도\s*)?(?:없|약하지 않)/g;
  var RE_ROOT_YES = /통근(?:이|은)\s*(?:아주\s*)?(?:강하|튼튼|잘 되어)/g;
  function yongRule(sd, t, push) {
    var U = sd.usefulElements, M = sd.usefulElementMethods || {}, m, ok = {};
    if (U && U.yong) ok[U.yong] = 1; Object.keys(M).forEach(function (k) { if (M[k] && M[k].yong) ok[M[k].yong] = 1; });
    if (!Object.keys(ok).length) return;
    RE_YONG_M.lastIndex = 0; while ((m = RE_YONG_M.exec(t))) { var key = m[1] === '억부' ? 'eokbu' : 'johu', y = M[key] && M[key].yong; if (y && m[2] !== y) push('yong-method', m[1] + ' 용신 ' + m[2], m[1] + ' 용신 ' + y); }
    var scoped = t.replace(RE_YONG_M, ' ');
    RE_YONG.lastIndex = 0; while ((m = RE_YONG.exec(scoped))) { if (!ok[m[1]]) push('yong', '용신 ' + m[1], '용신 ' + Object.keys(ok).join('/')); }
  }
  function rootRule(sd, t, push) {
    var r = sd.roots; if (!r || r.hasRoot == null) return;
    RE_ROOT_NO.lastIndex = 0; RE_ROOT_YES.lastIndex = 0;
    if (r.hasRoot && RE_ROOT_NO.test(t)) push('root', '통근 없음', '통근 있음(' + r.score + '점)');
    if (!r.hasRoot && RE_ROOT_YES.test(t)) push('root', '통근 강함', '통근 없음');
    RE_ROOT_NO.lastIndex = 0; RE_ROOT_YES.lastIndex = 0;
  }
  function facts(sd, text) {
    var out = [], sents = String(text || '').replace(/<[^>]*>/g, ' ').split(/(?<=[.!?。])\s+|\n+/), fe = (sd && sd.fiveElements) || {}, gr = (sd && sd.groups) || {};
    sents.forEach(function (t) {
      if (!t || OTHER.test(t)) return;
      var self = /(사주|원국|당신|나의|내 |오행 분포)/.test(t), selfY = self || /나에게/.test(t);
      var m, push = function (rule, claimed, actual) { out.push({ rule: rule, claimed: claimed, actual: actual, snippet: t.trim().slice(0, 60) }); };
      RE_EL_ABS.lastIndex = 0; while ((m = RE_EL_ABS.exec(t))) { var e = elOf(m); if (self && fe[e] != null && fe[e] >= 8) push('element-absent', e + ' 없음', e + ' ' + fe[e] + '%'); }
      RE_EL_TOP.lastIndex = 0; while ((m = RE_EL_TOP.exec(t))) { var e2 = elOf(m); if (self && sd.dominantEl && e2 !== sd.dominantEl) push('element-dominant', e2 + ' 최다', '최다 ' + sd.dominantEl); }
      RE_GR_ABS.lastIndex = 0; while ((m = RE_GR_ABS.exec(t))) { if (gr[m[1]] != null && gr[m[1]] >= 5) push('group-absent', m[1] + ' 없음', m[1] + ' ' + gr[m[1]] + '%'); }
      RE_GR_TOP.lastIndex = 0; while ((m = RE_GR_TOP.exec(t))) { if (sd.dominantGroup && m[1] !== sd.dominantGroup) push('group-dominant', m[1] + ' 최다', '최다 ' + sd.dominantGroup); }
      RE_STR.lastIndex = 0; while ((m = RE_STR.exec(t))) { var band = sd.strength && sd.strength.band; if (band && band !== '중화' && m[1] !== band) push('strength', m[1], band); }
      RE_DM.lastIndex = 0; while ((m = RE_DM.exec(t))) { if (sd.dayMaster && m[1] !== sd.dayMaster.stem) push('day-master', m[1], sd.dayMaster.stem); }
      RE_IJ.lastIndex = 0; while ((m = RE_IJ.exec(t))) { if (sd.dayPillar && m[1] !== sd.dayPillar.ko) push('day-pillar', m[1], sd.dayPillar.ko); }
      if (selfY) yongRule(sd, t, push); if (self) rootRule(sd, t, push);
      RE_LUCK.lastIndex = 0; while ((m = RE_LUCK.exec(t))) push('luck-scope', m[1].slice(0, 20), '대운=10년 · 세운=해마다 · 월운=달마다');
    });
    return out;
  }
  // 문서(chapters) 전체 검사: 챕터별 위반 목록. 장면 html 의 글자만 본다.
  function checkAll(sd, text) { return check(sd, text).concat(facts(sd, text)); }
  function checkDoc(sd, chapters) {
    var res = [];
    (chapters || []).forEach(function (c) { (c.scenes || []).forEach(function (s) { checkAll(sd, s.html || s.text || '').forEach(function (v) { v.chapter = c.id; v.scene = s.sceneId; res.push(v); }); }); });
    return res;
  }
  R.Consistency = { SEASON: SEASON, birthSeason: birthSeason, branchSymbol: branchSymbol, check: check, facts: facts, checkAll: checkAll, checkDoc: checkDoc, monthBranchOf: monthBranchOf };
})(typeof window !== 'undefined' ? window : globalThis);
