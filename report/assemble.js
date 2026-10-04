// 무빙툰 클립 조합 규칙 (관리자 테스트 화면과 이후 공개 뷰어가 함께 쓴다)
// 같은 입력(facts)과 같은 클립 목록이면 항상 같은 결과가 나온다.
(function (root) {
  var CHAPTERS = [
    ['ch0', '序 일주의 각성'], ['ch1', '一 타고난 성정'], ['ch2', '二 인생의 길'], ['ch3', '三 인연의 장'], ['ch4', '四 재물의 장'],
    ['ch5', '五 도약의 장'], ['ch6', '六 가족의 장'], ['ch7', '七 앞으로 십 년의 문'], ['ch8', '終 개운 종합 카드'],
  ];
  var STEMS = '갑을병정무기경신임계'.split(''), BRANCHES = '자축인묘진사오미신유술해'.split('');
  var ILJU = (function () { var a = []; for (var i = 0; i < 60; i++) a.push(STEMS[i % 10] + BRANCHES[i % 12]); return a; })();
  // 조건 항목: key → [표시 이름, 선택지]
  var FIELDS = {
    ilju: ['일주', ILJU],
    ilgan: ['일간', STEMS],
    ilji: ['일지', BRANCHES],
    wolji: ['월지', BRANCHES],
    yongEl: ['용신 오행', ['목', '화', '토', '금', '수']],
    strength: ['신강약', ['극약', '태약', '신약', '중화', '신강', '태강', '극왕']],
    dominant: ['가장 강한 십성군', ['비겁', '식상', '재성', '관성', '인성']],
    gender: ['성별', ['남', '여']],
  };

  // 조건 항목별 구체성 가중치: 더 좁게 가리키는 조건(일주)이 넓은 조건(성별)보다 먼저 뽑힌다.
  var WEIGHT = { ilju: 6, ilgan: 3, yongEl: 3, strength: 3, dominant: 2, wolji: 2, ilji: 2, gender: 1 };
  // 클립 하나가 facts에 맞는가. 비어 있는 조건은 "상관없음".
  function specified(clip) {
    var c = clip.cond || {}, n = 0;
    Object.keys(FIELDS).forEach(function (k) { if (c[k] && c[k].length) n += WEIGHT[k] || 1; });
    return n;
  }
  function matches(clip, facts) {
    var c = clip.cond || {};
    return Object.keys(FIELDS).every(function (k) {
      return !(c[k] && c[k].length) || c[k].indexOf(facts[k]) >= 0;
    });
  }

  // 폴더 체인(최상위 → 클립이 든 폴더). 순환·끊긴 부모는 무시한다.
  function chain(folders, id) {
    var map = {}, out = [], seen = {}; (folders || []).forEach(function (f) { map[f.id] = f; });
    while (id && map[id] && !seen[id]) { seen[id] = 1; out.unshift(map[id]); id = map[id].parent; }
    return out;
  }
  // 클립의 실제 적용값: 조건은 폴더에서 상속(아래 폴더가 위 폴더를, 클립이 폴더를 항목별로 덮어씀), 우선순위는 폴더들의 값을 더한다.
  // inherited = 폴더에서 온 조건 항목 목록(클립이 직접 지정한 항목은 제외)
  function effective(clip, folders) {
    var cond = {}, pri = +clip.priority || 0, own = clip.cond || {}, fromFolder = {}, chapter = '';
    chain(folders, clip.folder).forEach(function (f) {
      var c = f.cond || {}; Object.keys(c).forEach(function (k) { if (c[k] && c[k].length) { cond[k] = c[k]; fromFolder[k] = 1; } });
      pri += +f.priority || 0; if (f.chapter) chapter = f.chapter; // 아래 폴더가 위 폴더의 장을 덮어쓴다
    });
    if (clip.chapter) chapter = clip.chapter; // 클립이 직접 지정한 장이 최우선 (비어 있으면 폴더의 장을 따른다)
    Object.keys(own).forEach(function (k) { if (own[k] && own[k].length) { cond[k] = own[k]; delete fromFolder[k]; } });
    return { cond: cond, priority: pri, chapter: chapter, inherited: Object.keys(fromFolder) };
  }

  // chapters = [[id, 이름], …] (관리자에서 바꾼 장 목록, 생략하면 기본 9장). 장 순서가 곧 재생 순서.
  // 장마다 가장 구체적인 클립 1개를 고른다. 구체성 점수(조건 가중합) → 우선순위 → id 순.
  function assemble(clips, facts, chapters, folders) {
    return (chapters || CHAPTERS).map(function (ch) {
      var cands = clips.map(function (c) {
        var e = effective(c, folders), ec = { cond: e.cond };
        return { clip: c, ec: ec, chapter: e.chapter, spec: specified(ec), pri: e.priority };
      }).filter(function (x) { return x.chapter === ch[0]; }).filter(function (x) { return matches(x.ec, facts); }).sort(function (a, b) { return b.spec - a.spec || b.pri - a.pri || (a.clip.id < b.clip.id ? -1 : 1); });
      return { chapter: ch[0], label: ch[1], pick: cands[0] ? cands[0].clip : null, specificity: cands[0] ? cands[0].spec : 0, candidates: cands };
    });
  }

  root.Assemble = { chain: chain, effective: effective, CHAPTERS: CHAPTERS, FIELDS: FIELDS, ILJU: ILJU, assemble: assemble, matches: matches, specified: specified };
})(typeof window !== 'undefined' ? window : globalThis);
