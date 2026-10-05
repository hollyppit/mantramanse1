// 미디어: ① 120개 일주 캐릭터 영상 + 20개 일간 소개 영상 매핑·커버리지 ② 태그 기반 이미지 선택. 사용자별 AI 이미지 생성은 하지 않는다(사전 제작 라이브러리 조합).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var STEMS = '갑을병정무기경신임계'.split(''), BRS = '자축인묘진사오미신유술해'.split('');
  var STEM_H = '甲乙丙丁戊己庚辛壬癸', BR_H = '子丑寅卯辰巳午未申酉戌亥';
  var ILJU = []; for (var i = 0; i < 60; i++) ILJU.push(STEMS[i % 10] + BRS[i % 12]);

  // 甲子 / 갑자 어느 쪽으로 와도 한글 키(갑자)로 통일. 60갑자가 아니면 null.
  function normPillar(s) {
    s = String(s || '').trim(); if (s.length < 2) return null;
    var a = STEM_H.indexOf(s[0]), b = BR_H.indexOf(s[1]);
    var k = (a >= 0 && b >= 0) ? STEMS[a] + BRS[b] : s.slice(0, 2);
    return ILJU.indexOf(k) >= 0 ? k : null;
  }
  function normGender(g) { return /^(m|male|남|남성)$/i.test(g) ? 'M' : /^(f|female|여|여성)$/i.test(g) ? 'F' : null; }
  var keyOf = function (p, g) { return p + '|' + g; };

  // videos: [{dayPillar, gender, videoUrl, videoWebm, posterUrl, title, subtitle, keywords, enabled}]
  // 반환: 해당 일주·성별 영상, 없으면 fallback(공용), 그것도 없으면 null → UI는 poster/문구만으로 진행한다.
  function pickAwakening(videos, dayPillar, gender, fallback) {
    var p = normPillar(dayPillar), g = normGender(gender), found = null;
    (videos || []).forEach(function (v) { if (v && v.enabled !== false && normPillar(v.dayPillar) === p && normGender(v.gender) === g && (v.videoUrl || v.videoWebm || v.posterUrl)) found = v; });
    if (found) return { clip: found, fallback: false, key: keyOf(p, g) };
    return { clip: fallback || null, fallback: true, key: keyOf(p, g) };
  }
  // 관리자 Matrix / 커버리지. status: ok 완료 · missing 누락 · disabled 비활성 · error(주소 형식 오류)
  function awakeningCoverage(videos) {
    var map = {}, bad = [];
    (videos || []).forEach(function (v) {
      var p = normPillar(v.dayPillar), g = normGender(v.gender);
      if (!p || !g) { bad.push(v); return; } map[keyOf(p, g)] = v;
    });
    var cells = [], n = { M: 0, F: 0 }, missing = [];
    ILJU.forEach(function (p) {
      ['M', 'F'].forEach(function (g) {
        var v = map[keyOf(p, g)], st = 'missing';
        if (v) { var has = !!(v.videoUrl || v.videoWebm); st = v.enabled === false ? 'disabled' : (has && !/^(\/|https:\/\/)/.test(v.videoUrl || v.videoWebm) ? 'error' : has ? 'ok' : (v.posterUrl ? 'poster-only' : 'missing')); }
        if (st === 'ok') n[g]++; else if (st === 'missing') missing.push(keyOf(p, g));
        cells.push({ dayPillar: p, gender: g, status: st });
      });
    });
    return { male: n.M, female: n.F, total: n.M + n.F, of: 120, cells: cells, missing: missing, invalid: bad.length };
  }

  // 일간 소개 영상(일간 10 × 성별 2 = 20). 프롤로그 앞에 나오는 캐릭터 소개. 없으면 null → 이 단계는 건너뛴다.
  function normStem(s) { s = String(s || '').trim()[0] || ''; var i = STEMS.indexOf(s); if (i < 0) i = STEM_H.indexOf(s); return i >= 0 ? STEMS[i] : null; }
  function pickIlgan(list, stem, gender) {
    var s = normStem(stem), g = normGender(gender), f = null;
    (list || []).forEach(function (v) { if (v && v.enabled !== false && normStem(v.stem) === s && normGender(v.gender) === g && (v.videoUrl || v.videoWebm)) f = v; });
    return f;
  }
  function ilganCoverage(list) {
    var cells = [], n = { M: 0, F: 0 };
    STEMS.forEach(function (s) { ['M', 'F'].forEach(function (g) {
      var v = (list || []).filter(function (x) { return normStem(x.stem) === s && normGender(x.gender) === g; })[0], st = 'missing';
      if (v) st = v.enabled === false ? 'disabled' : (v.videoUrl || v.videoWebm) ? (/^(\/|https:\/\/)/.test(v.videoUrl || v.videoWebm) ? 'ok' : 'error') : (v.posterUrl ? 'poster-only' : 'missing');
      if (st === 'ok') n[g]++; cells.push({ stem: s, gender: g, status: st });
    }); });
    return { male: n.M, female: n.F, total: n.M + n.F, of: 20, cells: cells };
  }

  // 이미지 라이브러리: [{id,url,tags,priority,chapters?,enabled}]. 점수 = 겹치는 태그 수(가중) + priority/100. 같은 이미지는 usedIds 로 중복 회피.
  function pickImage(images, wantTags, o) {
    o = o || {}; var used = o.usedIds || [], best = null, bestS = 0;
    (images || []).forEach(function (im) {
      if (!im || im.enabled === false || !im.url) return;
      if (o.chapter && im.chapters && im.chapters.length && im.chapters.indexOf(o.chapter) < 0) return;
      var s = 0; (wantTags || []).forEach(function (t, i) { if ((im.tags || []).indexOf(t) >= 0) s += 10 - Math.min(i, 5); });
      if (!s) return; s += (+im.priority || 0) / 100; if (used.indexOf(im.id) >= 0) s -= 5;
      if (s > bestS || (s === bestS && best && im.id < best.id)) { best = im; bestS = s; }
    });
    return best ? { image: best, score: bestS } : null; // null 이면 UI 가 자리표시 장면(CSS 그라데이션)을 쓴다
  }
  var TAG_GROUPS = {
    element: ['wood', 'fire', 'earth', 'metal', 'water'],
    state: ['growth', 'expansion', 'accumulation', 'transition', 'defense', 'recovery', 'conflict', 'opportunity', 'isolation', 'connection'],
    scene: ['forest', 'ocean', 'river', 'mountain', 'city', 'library', 'road', 'night', 'sunrise', 'sunset', 'rain', 'mist'],
    theme: ['career', 'wealth', 'love', 'marriage', 'relationship', 'family', 'study', 'creation', 'leadership', 'travel'],
  };

  // 일간 소개·일주 영상의 제목·부제가 "다른 일간"을 말하고 있는지 검사한다(관리자 입력 오류 방지: 기토 영상에 경금 문구를 붙여 넣은 경우 등).
  //   본문에 자기 일간 이름이 없고 다른 일간 이름(경금·庚金 …)만 있으면 어긋난 문구로 본다. 반환: 어긋난 문구가 가리키는 이름 또는 ''.
  var STEM_NAME = { 갑: '갑목', 을: '을목', 병: '병화', 정: '정화', 무: '무토', 기: '기토', 경: '경금', 신: '신금', 임: '임수', 계: '계수' }, EL_H = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' };
  function stemsIn(text) { // 문장에 나온 일간들(한글 이름은 앞뒤가 한글 단어가 아닐 때만: '정화하다' 같은 말은 일간이 아니다)
    var t = String(text || ''), out = [];
    STEMS.forEach(function (s, i) {
      var nm = STEM_NAME[s], hj = STEM_H[i] + EL_H[nm[1]];
      if (t.indexOf(hj) >= 0 || new RegExp('(^|[^가-힣])' + nm + '(?=$|[^가-힣]|[은는이가을를의과와도만로])').test(t)) out.push(s);
    });
    return out;
  }
  function ilganTextMismatch(stem, text) { var s = normStem(stem), f = stemsIn(text); return s && f.length && f.indexOf(s) < 0 ? STEM_NAME[f[0]] : ''; }
  function ijuTextMismatch(pillar, text) { // 'XX일주' 로 다른 일주를 말하면 어긋난 문구
    var p = String(pillar || '').slice(0, 2), m = String(text || '').match(/[갑을병정무기경신임계][자축인묘진사오미신유술해](?=일주)/g) || [];
    return m.length && m.indexOf(p) < 0 ? m[0] + '일주' : '';
  }

  R.Media = { ilganTextMismatch: ilganTextMismatch, ijuTextMismatch: ijuTextMismatch, ILJU: ILJU, normPillar: normPillar, normGender: normGender, pickAwakening: pickAwakening, awakeningCoverage: awakeningCoverage, pickIlgan: pickIlgan, ilganCoverage: ilganCoverage, normStem: normStem, STEMS: STEMS, pickImage: pickImage, TAG_GROUPS: TAG_GROUPS };
})(typeof window !== 'undefined' ? window : globalThis);
