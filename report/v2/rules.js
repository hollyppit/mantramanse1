// Rule Engine — Structured Saju Data → 조건 사실(facts) → 해석/개운 모듈 선택. 같은 입력이면 항상 같은 결과(결정적).
// 모듈 조건(conditions)은 { 조건키: [허용값…] } 이며 비어 있으면 "상관없음". 구체적인 조건일수록 가중치가 커서 먼저 뽑힌다.
(function (root) {
  // 조건 키 → [표시 이름, 가중치]. 가중치는 "얼마나 좁게 가리키는가" (관리자 조합 테스트에서 이유 표시에 사용)
  var FIELDS = {
    dayPillar: ['일주', 8], dayMasterStem: ['일간', 4], dayMasterEl: ['일간 오행', 3], gender: ['성별', 1],
    dominantEl: ['가장 강한 오행', 2], lackEl: ['부족한 오행', 3], yongEl: ['용신 오행', 3],
    dominantGroup: ['가장 강한 십성군', 3], weakestGroup: ['가장 약한 십성군', 2], strength: ['신강약', 3], hasRoot: ['원국 통근', 1],
    pattern: ['격국·구조', 3], star: ['신살', 2], career: ['직업 분야', 3],
    daewoonSeason: ['현재 대운 계절', 3], seunSeason: ['올해 계절', 3], monthSeason: ['이달 계절', 3], needTag: ['필요 행동', 2],
  };
  var ARRAY_FACTS = { pattern: 1, star: 1, career: 1, needTag: 1 };

  // sd(Structured Saju Data) → 평평한 사실. 값이 없으면 키 자체를 넣지 않는다.
  function flatten(sd, over) {
    var f = {};
    f.dayPillar = sd.dayPillar.ko; f.dayMasterStem = sd.dayMaster.stem; f.dayMasterEl = sd.dayMaster.el; f.gender = sd.gender === 'F' ? '여' : '남';
    f.dominantEl = sd.dominantEl; if (sd.lackEl) f.lackEl = sd.lackEl;
    if (sd.usefulElements) f.yongEl = sd.usefulElements.yong;
    f.dominantGroup = sd.dominantGroup; f.weakestGroup = sd.weakestGroup; f.strength = sd.strength.band;
    if (sd.roots) f.hasRoot = sd.roots.hasRoot ? '있음' : '없음';
    f.pattern = (sd.patterns || []).map(function (p) { return p.name; });
    f.star = (sd.specialStars || []).map(function (s) { return s.name; });
    f.career = ((sd.career && sd.career.top) || []).map(function (c) { return c.category; });
    if (sd.currentDaewoon && sd.currentDaewoon.season) f.daewoonSeason = sd.currentDaewoon.season;
    if (sd.sewoon && sd.sewoon.season) f.seunSeason = sd.sewoon.season;
    var m0 = (sd.monthlyLuck || [])[0]; if (m0 && m0.season) f.monthSeason = m0.season;
    f.needTag = [];
    for (var k in (over || {})) f[k] = over[k];
    return f;
  }

  // 모듈 하나가 facts 에 맞는가 + 조건별 결과(왜 선택됐는지)
  function evaluate(mod, facts) {
    var c = mod.conditions || {}, rows = [], ok = true, spec = 0;
    Object.keys(c).forEach(function (k) {
      var want = c[k]; if (!want || !want.length) return;
      var have = facts[k], hit;
      if (have == null) hit = false;
      else if (Array.isArray(have)) hit = have.some(function (v) { return want.indexOf(v) >= 0; });
      else hit = want.indexOf(have) >= 0;
      var w = (FIELDS[k] || [k, 1])[1];
      rows.push({ key: k, label: (FIELDS[k] || [k])[0], want: want, have: have == null ? null : have, hit: hit, weight: w });
      if (hit) spec += w; else ok = false;
    });
    return { match: ok, specificity: ok ? spec : 0, rows: rows };
  }

  // 후보 정렬: 구체성 → priority → id (결정적)
  function rank(mods, facts, o) {
    o = o || {}; var out = [];
    mods.forEach(function (m) {
      if (m.enabled === false) return;
      if (o.categories && o.categories.indexOf(m.category) < 0) return;
      if (o.type && m.type !== o.type) return;
      var e = evaluate(m, facts); if (!e.match) return;
      out.push({ mod: m, specificity: e.specificity, rows: e.rows, score: e.specificity * 100 + (+m.priority || 0) });
    });
    out.sort(function (a, b) { return b.score - a.score || (a.mod.id < b.mod.id ? -1 : a.mod.id > b.mod.id ? 1 : 0); });
    return out;
  }

  // 같은 headline·같은 id 중복 제거 후 상위 n개
  function pick(mods, facts, n, o) {
    var seen = {}, out = [];
    rank(mods, facts, o).forEach(function (x) {
      var key = x.mod.id + '|' + (x.mod.headline || '');
      if (seen[x.mod.id] || seen[x.mod.headline]) return;
      seen[x.mod.id] = seen[x.mod.headline] = 1;
      if (out.length < (n || 1)) out.push(x);
    });
    return out;
  }

  // {키} 치환 — 문장 속 개인화 단어. 알 수 없는 키는 빈 글자 대신 원문 그대로 둔다.
  function tpl(s, vars) {
    return String(s == null ? '' : s).replace(/\{([\w.가-힣]+)\}/g, function (m, k) {
      var v = vars; k.split('.').forEach(function (p) { v = v == null ? v : v[p]; });
      return v == null || typeof v === 'object' ? m : v;
    });
  }

  // 결정적 해시(FNV-1a 32bit) — 같은 계산 결과 + 콘텐츠 버전 + 프롬프트 버전이면 같은 키. 캐시 키로 쓴다.
  function stable(o) {
    if (Array.isArray(o)) return '[' + o.map(stable).join(',') + ']';
    if (o && typeof o === 'object') return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + stable(o[k]); }).join(',') + '}';
    return JSON.stringify(o);
  }
  function hash(parts) {
    var s = stable(parts), h = 0x811c9dc5;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
    return ('00000000' + h.toString(16)).slice(-8);
  }

  root.ReportV2 = root.ReportV2 || {};
  root.ReportV2.Rules = { FIELDS: FIELDS, flatten: flatten, evaluate: evaluate, rank: rank, pick: pick, tpl: tpl, hash: hash, stable: stable };
})(typeof window !== 'undefined' ? window : globalThis);
