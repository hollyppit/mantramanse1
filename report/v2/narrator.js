// Narrator — 전지적 관찰자 시점(소설체 ~다)의 주인공 호칭·조사 처리. 주인공 = 리포트를 보는 사용자.
// 이름은 브라우저(viewer 의 S.name)에서만 쓰이고 서버로 보내지 않는다. AI 에는 이름 대신 {hero…} 자리표시자가 나간다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};

  // 조사 쌍: 받침 있음 / 없음. '로' 계열은 ㄹ 받침도 '로'.
  var PAIRS = { '은/는': ['은', '는'], '이/가': ['이', '가'], '을/를': ['을', '를'], '과/와': ['과', '와'], '이라/라': ['이라', '라'], '으로/로': ['으로', '로'] };

  // 마지막 글자의 받침: 'none' | 'jong' | 'rieul'. 한글이 아니면(영문·숫자·기호) 받침 없는 형태로 본다.
  function batchim(word) {
    var w = String(word == null ? '' : word).replace(/[\s.,!?'"”’)\]]+$/, ''), c = w ? w.charCodeAt(w.length - 1) : 0;
    if (c < 0xAC00 || c > 0xD7A3) return 'none';
    var j = (c - 0xAC00) % 28; return j === 0 ? 'none' : j === 8 ? 'rieul' : 'jong';
  }
  function pickJosa(word, kind) {
    var p = PAIRS[kind]; if (!p) return '';
    var b = batchim(word); return kind === '으로/로' ? (b === 'jong' ? p[0] : p[1]) : (b === 'none' ? p[1] : p[0]);
  }
  // josa('민준','은/는') → '은' (조사만) · attach('민준','은/는') → '민준은'
  function josa(word, kind) { return pickJosa(word, kind); }
  function attach(word, kind) { return word + pickJosa(word, kind); }

  // 주인공 호칭: 이름이 있으면 이름, 없으면 성별로 '그'/'그녀'
  function hero(sd, name) {
    name = String(name == null ? '' : name).trim();
    return name || (sd && sd.gender === 'F' ? '그녀' : '그');
  }
  // 템플릿 변수 묶음. mask=true 면 AI 에 보낼 자리표시자({hero…} 그대로)
  var KEYS = ['hero', 'hero은는', 'hero이가', 'hero을를', 'hero의'];
  function heroVars(sd, name, mask) {
    if (mask) { var m = {}; KEYS.forEach(function (k) { m[k] = '{' + k + '}'; }); return m; }
    var h = hero(sd, name);
    return { 'hero': h, 'hero은는': attach(h, '은/는'), 'hero이가': attach(h, '이/가'), 'hero을를': attach(h, '을/를'), 'hero의': h + '의' };
  }
  // 자리표시자가 섞인 문장에 실제 호칭을 되돌려 넣는다(AI 응답 후 로컬 치환). 이름은 서버를 거치지 않는다.
  function fill(text, vars) {
    return String(text == null ? '' : text).replace(/\{(hero[은는이가을를의]*)\}/g, function (m, k) { return vars && vars[k] != null ? vars[k] : m; });
  }
  // 서술 파트 문체 검사: '당신'·합쇼체(~습니다/~합니다/~입니다)·명령형(~하세요/~세요)이 있으면 서술체가 아니다.
  var NARR_BAD = /당신|니다(?=[.!?…\s"'”’)]|$)|세요/;
  function isNarrative(text) { return !NARR_BAD.test(String(text || '')); }
  // 풀이 본문은 차분한 상담체(~습니다). 시네마의 짧은 서술체 검사는 isNarrative로 유지한다.
  var READING_BAD = /당신|(?:이에요|예요|해요|있어요|없어요|거든요|잖아요|볼게요|세요)(?=[.!?…\s"'”’)]|$)/;
  function isReading(text) { return !READING_BAD.test(String(text || '')); }
  // 허용되는 자리표시자만 남았는지(AI 가 {hero} 를 지어내거나 깨뜨리지 않았는지)
  function placeholdersOk(text) {
    var m = String(text || '').match(/\{[^{}]*\}/g) || [];
    return m.every(function (t) { return KEYS.indexOf(t.slice(1, -1)) >= 0; });
  }

  R.Narrator = { hero: hero, josa: josa, attach: attach, batchim: batchim, heroVars: heroVars, fill: fill, isNarrative: isNarrative, isReading: isReading, READING_BAD: READING_BAD, placeholdersOk: placeholdersOk, KEYS: KEYS, NARR_BAD: NARR_BAD };
})(typeof window !== 'undefined' ? window : globalThis);
