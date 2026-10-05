// EpicIntro — INTRO 전용 연출: "한 사람이 태어난 일을 천하의 대사건처럼 다루는 초진지 정통 무협 패러디".
// 대사는 거창하게, 연출은 극도로 진지하게, 데이터(간지·출생일시·이름)는 절대 과장하지 않는다. 패러디는 이 INTRO에서 끝난다.
// 본편(BODY: 해석 모듈·AI 컴포저·챕터 문구)과 코드 수준에서 분리한다: 이 파일의 문구·프리셋·펀치라인은 compose/AI 프롬프트로 들어가지 않는다.
//   style = EPIC_WUXIA_PARODY (INTRO) / MODERN_CLEAR (BODY)
// 입력 : sd(만세력 결과를 옮긴 Structured Saju Data: pillars hanja/ko, birth, gender) · name · opts
// 출력 : 시네마 장면 배열(Translator.prologue 와 같은 모양). 명리 계산·한자 음독 추측은 하지 않는다 — 간지는 sd.pillars 값 그대로.
// 음성 해설(TTS)은 쓰지 않는다. 소리는 북·바람 효과음과 배경음악 신호(cue)뿐이다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var STYLES = ['EPIC_WUXIA_PARODY', 'CINEMATIC', 'MINIMAL'], HUMORS = ['OFF', 'SUBTLE', 'PARODY'];
  var DEFAULTS = { style: 'EPIC_WUXIA_PARODY', humor: 'PARODY', epicLevel: 5 };
  var CAP_MS = 30000; // INTRO 최대 길이(운로 타이틀까지). 20~25초가 목표, 30초는 넘기지 않는다.

  // 사실로 입증할 수 없는 주장(INTRO 에서도 쓰지 않는다). 테스트가 검사한다.
  var FORBIDDEN = /(천년에 한 번|하늘이 선택|황제의 사주|무림을 제패|오행이 뒤집|천지가 요동|태어나자 )/;
  // 본편에 새어 들어가면 안 되는 INTRO 어휘
  var BODY_BAN = /(강호|내공|검을 뽑|천명|무림)/;

  // 입력한 시각 그대로(보정하지 않는다) → "새벽 1시 20분". 시 모름이면 null
  function timeWords(h, m) {
    if (h == null) return null; h = +h; m = +m || 0;
    var per = h === 0 ? '' : h <= 5 ? '새벽' : h <= 8 ? '아침' : h <= 11 ? '오전' : h === 12 ? '낮' : h <= 17 ? '오후' : h <= 20 ? '저녁' : '밤', h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    if (h === 0) return { disp: m ? '자정 ' + m + '분' : '자정' };
    return { disp: per + ' ' + h12 + '시' + (m ? ' ' + m + '분' : '') };
  }

  /* ── 문장 → 화면 줄(모바일 세로: 한 줄 12자 안팎) ── */
  function wrapLine(t, max) {
    var w = String(t).split(' '), out = [], cur = '';
    w.forEach(function (x) { if (!cur) cur = x; else if ((cur + ' ' + x).length <= max) cur += ' ' + x; else { out.push(cur); cur = x; } });
    if (cur) out.push(cur); return out;
  }
  // 한 문장을 줄 단위 조각들로. 앞 줄은 잠깐만 머물고, 마지막 줄이 남은 시간(ms)을 머문다.
  //   o: { e:'impact'|'pause'|'normal'|'soft', a(애니메이션), cue(소리 신호), big(큰 한자), name(이름), together(앞 문장과 같은 블록에 쌓기), min(줄여도 이 시간 아래로는 안 내려감) }
  function S(text, ms, o) {
    o = o || {}; var lines = o.big ? [text] : wrapLine(text, 12), per = lines.length > 1 ? 320 : 0, segs = [];
    lines.forEach(function (ln, i) {
      var last = i === lines.length - 1, g = { text: ln, emphasis: o.e || 'normal', animation: o.a || 'fade-up', block: 0, hold: last ? Math.max(200, ms - per * (lines.length - 1)) : per };
      if (o.min && last) g.min = o.min; if (i === 0 && o.cue) g.cue = o.cue; if (o.big) g.big = true; if (o.name) g.name = true; if (o.together) g.together = true; segs.push(g);
    });
    return segs;
  }
  // 줄(블록)을 쌓아서 장면의 segments 를 만든다. 문장마다 자기 블록(앞 문장은 사라지고 새 문장이 나온다).
  function build(parts) { var segs = [], b = -1; parts.forEach(function (p) { if (!p[0].together) b++; p.forEach(function (g) { delete g.together; g.block = Math.max(0, b); segs.push(g); }); }); return segs; }

  /* ── 장면 ── */
  var HERO = { M: '한 사내가', F: '한 여인이' }; // 조사까지 붙여 둔다(사내가 · 여인이 · 사람이)
  function scene(id, preset, cin, segs, extra) {
    var pm = R.Cinema && R.Cinema.PRESETS[preset];
    return Object.assign({ sceneId: id, chapterId: 'c00', sceneType: 'cinema', kind: 'script', cinema: Object.assign({ preset: preset, segments: segs }, pm && pm.mediaTags ? { mediaTags: pm.mediaTags } : {}, cin || {}) }, extra || {});
  }

  /* ── 펀치라인 풀: 건조한 deadpan 만. 밈·이모티콘·코믹 효과음·조롱·사주 결과 희화화는 쓰지 않는다. 사용 가능한 자리(slot)가 정해져 있다 ── */
  //  born: 탄생 장면 · saju: 명식 장면 · present: 현재 장면 · question: 마지막 질문. 한 INTRO 에서 슬롯이 겹치지 않게 최대 2개.
  var PUNCH = {
    A: { slot: 'born', lines: function () { return [S('하늘은 평소와 다름없이 하늘이었고.', 1900, { e: 'normal' }), S('땅 또한 평소와 다름없는 땅이었다.', 1900, { e: 'normal' }), S('그러나.', 700, { e: 'pause', cue: 'drum' })]; } },
    B: { slot: 'born', lines: function () { return [S('당시에는 아무도 알지 못했다.', 1700), S('본인조차.', 1100, { e: 'pause' })]; } },
    C: { slot: 'present', lines: function () { return [S('생년월일시를 입력했다.', 1800, { e: 'impact', a: 'zoom-in' })]; } },
    D: { slot: 'saju', lines: function () { return [S('그리고.', 600, { e: 'pause' }), S('한 사람의 수많은 고민.', 1800)]; } },
    E: { slot: 'question', lines: function () { return [S('수많은 선택을 지나 마침내 묻는다.', 2100), S('그래서.', 800, { e: 'pause' })]; } },
    F: { slot: 'question', lines: function () { return [S('천하는 넓고 인생은 길다.', 1900), S('그러나 대운은.', 1000, { e: 'pause' }), S('십 년이다.', 1200, { e: 'impact', a: 'zoom-in', cue: 'drum' })]; } },
  };
  function hash(s) { var h = 2166136261; String(s).split('').forEach(function (c) { h = (h ^ c.charCodeAt(0)) * 16777619 >>> 0; }); return h; }
  // 같은 사람에게는 같은 펀치라인 순서(새로고침해도 안 바뀐다). n >= 후보 수면 전체 순위를 돌려준다.
  function pickPunch(seed, n) {
    var keys = Object.keys(PUNCH), order = keys.map(function (k, i) { return [k, hash(seed + k + i)]; }).sort(function (a, b) { return a[1] - b[1]; }).map(function (x) { return x[0]; }), used = {}, out = [];
    if (n >= keys.length) return order; order.forEach(function (k) { if (out.length < n && !used[PUNCH[k].slot]) { used[PUNCH[k].slot] = 1; out.push(k); } }); return out;
  }

  // 연도 흐름(출생 → 현재). 숫자가 빠르게 흐른다: 최대 4개를 고르게 뽑는다.
  function yearSteps(y0, y1) {
    var span = y1 - y0; if (span <= 0) return [y1]; var n = Math.min(5, Math.max(3, Math.round(span / 8) + 1)), out = [];
    for (var i = 0; i < n; i++) out.push(i === n - 1 ? y1 : Math.round(y0 + span * i / (n - 1)));
    return out.filter(function (v, i, a) { return a.indexOf(v) === i; });
  }

  // ── 메인 ──
  //  birth: { y, m, d, hour, minute, hourKnown, place }   opts: { humor, epicLevel, nowYear, capSec }
  function make(sd, name, vars, birth, opts, punchList) {
    opts = Object.assign({}, DEFAULTS, opts || {}); birth = birth || {}; var cap = Math.max(20000, Math.min(60000, (+opts.capSec || 30) * 1000));
    var N = R.Narrator, nm = String(name || '').trim(), L = Math.max(1, Math.min(5, Math.round(+opts.epicLevel || 5))), humor = HUMORS.indexOf(opts.humor) >= 0 ? opts.humor : 'PARODY';
    var P = sd.pillars || {}, py = P.year, pm = P.month, pd = P.day, ph = birth.hourKnown === false || !P.hour ? null : P.hour;
    var by = birth.y || (sd.birth && sd.birth.solarY), bm = birth.m || (sd.birth && sd.birth.solarM), bd = birth.d || (sd.birth && sd.birth.solarD), now = opts.nowYear || new Date().getFullYear();
    var hero = HERO[sd.gender] || '한 사람이', tw = ph ? timeWords(birth.hour != null ? birth.hour : sd.birth && sd.birth.hour, birth.minute != null ? birth.minute : sd.birth && sd.birth.minute) : null;
    var rate = [0.6, 0.7, 0.8, 0.9, 1][L - 1];                               // 정적(pause) 길이: epicLevel 이 높을수록 길다. 전체 길이는 fit() 이 상한으로 묶는다.
    var nameEmph = ['NORMAL', 'NORMAL', 'STRONG', 'TITLE', 'MAXIMUM'][L - 1], drumOn = L >= 3, deepOn = L >= 2, big = L >= 4;
    var cue = function (c) { return c === 'deepDrum' ? (deepOn ? c : (drumOn ? 'drum' : undefined)) : (drumOn ? c : undefined); };
    var punch = humor === 'PARODY' ? punchList : [], has = function (k) { return punch.indexOf(k) >= 0; };
    var out = [], add = function (arr, k) { if (has(k)) PUNCH[k].lines().forEach(function (x) { arr.push(x); }); return arr; };
    var base = { lead: 150, tail: 0, pauseAfter: 0 }, C1 = function (o) { return Object.assign({}, base, o); };

    // 01 때는. — 검은 화면, 바람, 낮은 북
    out.push(scene('ep_01', 'SILENCE', C1({ sceneType: 'INTRO', lead: 500, bgmMood: 'ambient', pacing: 'PAUSE', textSize: big ? 'XL' : 'L' }), build([S('때는.', Math.round(1200 * rate), { cue: cue('deepDrum'), e: 'impact', a: 'fade' })]), { bg: 'black', sfx: 'wind', bgmCue: 'bgmDrone' }));
    // 02 연도 — 광활한 산맥. 서기 N년, 간지(화면은 한자)
    var yr = [S('서기 ' + by + '年', 1600, { big: true, a: 'fade', min: 900 })];
    if (py) yr.push(S(py.hanja + '年', 1100, { big: true, a: 'fade', cue: cue('drum'), min: 800 }));
    out.push(scene('ep_02', 'MOUNTAIN', C1({ lead: 200, pacing: 'SLOW', motionIntensity: 2, bgmMood: 'ambient', overlayStrength: 0.35, textPosition: 'center', textSize: 'XL', mediaTags: ['mountain', 'cloud', 'mist'] }), build(yr), { mediaIntent: { scenes: ['mountain', 'cloud', 'mist'], emotions: ['powerful', 'awe'] } }));
    // 03 그날 — 달·먹구름·갈대. 월·일·시 간지가 한 블록에 쌓이고, 다음 블록에 양력 출생일·시각·출생지
    var d3 = [];
    if (pm) d3.push(S(pm.hanja + '月', 750, { big: true, a: 'fade', min: 450 }));
    if (pd) d3.push(S(pd.hanja + '日', 750, { big: true, a: 'fade', together: !!pm, min: 450 }));
    if (ph) d3.push(S(ph.hanja + '時', 900, { big: true, a: 'fade', together: !!(pm || pd), min: 450 }));
    if (bm && bd) d3.push(S(bm + '월 ' + bd + '일', tw ? 500 : 1000, { a: 'fade', e: 'soft' }));
    if (tw) d3.push(S(tw.disp, 1300, { a: 'fade', e: 'soft', together: !!(bm && bd), min: 800 }));
    if (birth.place) d3.push(S(birth.place, 900, { a: 'fade', together: !!(bm && bd) || !!tw, min: 500 }));
    out.push(scene('ep_03', 'MOON', C1({ pacing: 'SLOW', motionIntensity: 1, bgmMood: 'ambient', overlayStrength: 0.5, textPosition: 'center', textSize: 'L', mediaTags: ['stars', 'mist', 'field'] }), build(d3), { mediaIntent: { scenes: ['stars', 'mist', 'field', 'temple'], emotions: ['mysterious', 'contemplative'] } }));
    // 04 탄생 — 먹구름·바람·대숲(연출일 뿐 사실 주장 아님). 한 사내가 태어났다.
    var born = [S('그날.', Math.round(700 * rate), { e: 'pause', cue: cue('drum'), min: 450 })];
    add(born, 'A');
    born.push(S('훗날 자신의 운을 확인하기 위해 생년월일시를 입력할 ' + hero + '—', 3200, { min: 2000 }));
    born.push(S('바로 이날 태어났다.', Math.round(1500 * rate) + 300, { e: 'impact', a: 'zoom-in', cue: cue('drum'), min: 1200 }));
    add(born, 'B');
    out.push(scene('ep_04', 'TENSION', C1({ pacing: 'SLOW', motionIntensity: 2, imageMotion: 'drift', transition: 'dip-black', sceneType: 'INTRO', bgmMood: 'tension', overlayStrength: 0.55, textPosition: 'center', textSize: 'L', mediaTags: ['windyForest', 'cloud', 'rain'] }), build(born), { mediaIntent: { scenes: ['windyForest', 'cloud', 'rain', 'mist'], emotions: ['tense', 'powerful'] } }));
    // 05 이름 — 암전, 음악 정지, 정적, 북, 이름
    var nmSegs = [S('그 이름.', Math.round(900 * rate), { e: 'pause', a: 'fade', cue: 'bgmCut', min: 600 })];
    if (nm) nmSegs.push(S('{hero}', Math.round(1900 * rate) + 200, { name: true, e: 'impact', a: 'fade', cue: cue('deepDrum'), min: 1500 }));
    out.push(scene('ep_05', 'NAME_REVEAL', C1({ sceneType: 'INTRO', lead: Math.round(700 * rate), pacing: 'PAUSE', nameEmphasis: nm ? nameEmph : 'NONE', bgmMood: 'minimal', transition: 'dip-black', textSize: 'XL' }), build(nmSegs), { bg: 'black' }));
    // 06 사주팔자 — 명식(時 日 月 年)이 펼쳐진다
    var sj = [S('네 개의 기둥.', Math.round(1000 * rate), { cue: cue('drum'), min: 500 }), S('여덟 개의 글자.', Math.round(1000 * rate) + 100, { cue: cue('drum'), min: 500 })];
    add(sj, 'D'); sj.push(S('四柱八字', 900, { big: true, a: 'fade', e: 'impact', min: 600 }));
    var pil = ['hour', 'day', 'month', 'year'].map(function (k, i) { var p = P[k]; return { label: '時日月年'[i], hj: k === 'hour' && !ph ? '' : (p ? p.hanja : ''), ko: k === 'hour' && !ph ? '' : (p ? p.ko : '') }; });
    out.push(scene('ep_06', 'REALITY_CHECK', C1({ sceneType: 'INTRO', lead: 250, pacing: 'SLOW', transition: 'hard-cut', bgmMood: 'emotional', textPosition: 'bottom', textSize: 'L', overlayStrength: 0.8 }), build(sj), { bg: 'black', pillars: pil, bgmCue: 'bgmUp' }));
    // 07 세월 폭주 — 숫자가 빠르게 흐른다
    var tm = [S('그리고.', 600, { e: 'pause', a: 'fade', min: 400 }), S('세월은 흘렀다.', 1100, { cue: cue('drum'), a: 'fade', min: 700 })];
    yearSteps(by || now, now).slice(0, -1).forEach(function (y) { tm.push(S(String(y), 240, { big: true, a: 'fade', min: 200 })); });
    out.push(scene('ep_07', 'TIMELINE', C1({ sceneType: 'INTRO', lead: 100, pacing: 'FAST', transition: 'hard-cut', bgmMood: 'ambient', motionIntensity: 3, imageMotion: 'drift', overlayStrength: 0.55, textPosition: 'center', textSize: 'L', mediaTags: ['road', 'city', 'rain'] }), build(tm), { mediaIntent: { scenes: ['road', 'city', 'crossroads', 'rain'], emotions: ['contemplative'] }, bgmCue: 'bgmUp' }));
    // 08 현재 — 검은 화면, 음악 정지, 현재 연도, 마침내 자신의 사주를 보게 된다
    var cur = [S(String(now) + '年', 1100, { big: true, a: 'fade', cue: 'bgmCut', min: 700 })];
    if (nm) cur.push(S('{hero}', 800, { name: true, a: 'fade', min: 500 }));
    add(cur, 'C');
    cur.push(S('마침내.', Math.round(800 * rate), { e: 'pause', a: 'fade', min: 450 }));
    cur.push(S('자신의 사주를 보게 된다.', 1900, { e: 'impact', a: 'zoom-in', cue: 'bgmUp', min: 1500 }));
    out.push(scene('ep_08', 'SILENCE', C1({ sceneType: 'INTRO', lead: 250, pacing: 'PAUSE', nameEmphasis: nm ? 'NORMAL' : 'NONE', transition: 'dip-black', bgmMood: 'tension', textSize: 'L' }), build(cur), { bg: 'black' }));
    // 09 질문 — 命 · 運 · 대체 내 운은 — 언제 풀리는가
    var qs = [S('命', 150, { big: true, a: 'fade', min: 150 }), S('타고난 명은 무엇인가.', 900, { a: 'fade', together: true, min: 600 }), S('運', 150, { big: true, a: 'fade', min: 150 }), S('지금 흐르는 운은 무엇인가.', 900, { a: 'fade', together: true, min: 600 })];
    add(qs, 'F'); add(qs, 'E');
    qs.push(S('대체. 내 운은—', 1400, { e: 'pause', cue: 'bgmCut', min: 900 }));
    qs.push(S('언제 풀리는가.', Math.round(1700 * rate) + 200, { e: 'impact', a: 'zoom-in', cue: cue('deepDrum'), min: 1300 }));
    out.push(scene('ep_09', 'MOUNTAIN', C1({ sceneType: 'INTRO', pacing: 'SLOW', transition: 'dip-black', motionIntensity: 2, bgmMood: 'tension', overlayStrength: 0.55, textPosition: 'center', textSize: 'XL', mediaTags: ['mountain', 'river', 'stars'] }), build(qs), { mediaIntent: { scenes: ['mountain', 'river', 'stars', 'cloud'], emotions: ['powerful', 'awe'] }, bgmCue: 'bgmUp' }));
    // 10 運路 타이틀 — 산 뒤에서 해가 떠오른다
    out.push(scene('ep_10', 'CINEMATIC_INTRO', C1({ sceneType: 'INTRO', textAnimation: 'cinematic-title', pacing: 'PAUSE', transition: 'dip-white', motionIntensity: 2, imageMotion: 'slow-zoom-in', overlayStrength: 0.45, bgmMood: 'cinematic', lead: 100, tail: 1200, nameEmphasis: nm ? 'TITLE' : 'NONE', mediaTags: ['sunrise', 'mountain', 'cloud'] }),
      build([S('運路', 1000, { e: 'impact', a: 'cinematic-title', cue: 'bgmUp', min: 800 })]), { kind: 'title', sub: nm ? '{hero}의 운이 흐르는 길\n\n{hero}에게는,\n{hero}의 때가 있다.' : '모든 사람에게는,\n각자의 때가 있다.', bgmCue: 'full', mediaIntent: { scenes: ['sunrise', 'mountain', 'cloud'], emotions: ['hopeful', 'powerful'] } }));
    if (!drumOn) eachSeg(out, function (g) { if (g.cue === 'drum') g.cue = undefined; }); // 낮은 레벨에서는 일반 북 신호를 쓰지 않는다(펀치라인 포함)
    out = fit(out, cap);
    // 이름이 들어간 문장은 자리표시자로 두었다가 여기서 채운다(이름은 이 기기 안에서만 쓴다)
    if (N && vars) out.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { g.text = N.fill(g.text, vars); }); if (s.sub) s.sub = N.fill(s.sub, vars); });
    return out;
  }

  // 길이 상한(기본 30초)에 맞추되 펀치라인을 지키려 한다.
  //   PARODY 는 에픽 레벨에 따라 펀치라인 1~2개(레벨 4~5 는 2개). 같은 사람에게는 같은 순서로 시도하고, 길이에 안 맞으면 다른 후보·개수를 차례로 시도한다.
  function intro(sd, name, vars, birth, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {}); var cap = Math.max(20000, Math.min(60000, (+opts.capSec || 30) * 1000)), L = Math.max(1, Math.min(5, Math.round(+opts.epicLevel || 5)));
    var s = birth && birth.y || sd.birth && sd.birth.solarY, seed = (String(name || '').trim()) + '|' + s + (birth && birth.m || '') + (birth && birth.d || ''), want = opts.humor === 'PARODY' ? (L >= 4 ? 2 : 1) : 0, order = pickPunch(seed, 6), tries = [], i, j;
    if (want === 2) for (i = 0; i < order.length; i++) for (j = i + 1; j < order.length; j++) if (PUNCH[order[i]].slot !== PUNCH[order[j]].slot) tries.push([order[i], order[j]]);
    if (want >= 1) order.forEach(function (k) { tries.push([k]); });
    tries.push([]);
    var out = null; for (i = 0; i < tries.length; i++) { out = make(sd, name, vars, birth, opts, tries[i]); if (totalMs(out) <= cap) break; }
    return out;
  }

  // 본편으로 넘어가는 다리: 패러디는 여기서 끝난다. 문체는 본편과 같은 담백한 현대어.
  function bridge() {
    var segs = build([S('CHAPTER 01', 900, { a: 'fade', e: 'soft' }), S('나의 기본 사주', 2200, { a: 'fade-up', e: 'impact' })]);
    return scene('ep_bridge', 'REALITY_CHECK', { sceneType: 'INTRO', lead: 300, tail: 500, pauseAfter: 0, pacing: 'MEDIUM', transition: 'dip-black', bgmMood: 'minimal', textPosition: 'center', textSize: 'L', overlayStrength: 1 }, segs, { bg: 'black', bgmCue: 'bgmDrone' });
  }

  /* ── 길이: 장면 합계가 상한을 넘으면 각 줄의 머무는 시간·정적을 비례로 줄인다(min 아래로는 내리지 않는다) ── */
  function totalMs(scenes) { var K = R.Cinema; return scenes.reduce(function (a, s) { return a + K.build(s).timing.total; }, 0); }
  function eachSeg(scenes, fn) { scenes.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { fn(g, s); }); }); }
  function fit(scenes, cap) {
    if (!R.Cinema) return scenes;
    for (var j = 0; j < 60 && totalMs(scenes) > cap; j++) {
      var moved = false;
      eachSeg(scenes, function (g) { if (g.hold != null) { var h = Math.max(g.min || 160, Math.round(g.hold * 0.96)); if (h < g.hold) { g.hold = h; moved = true; } } });
      scenes.forEach(function (s) { var c = s.cinema; if (c.lead > 60) { c.lead = Math.round(c.lead * 0.96); moved = true; } if (c.tail > 400) { c.tail = Math.round(c.tail * 0.96); moved = true; } });
      if (!moved) break;
    }
    return scenes;
  }

  R.EpicIntro = { build: intro, bridge: bridge, totalMs: totalMs, fit: fit, timeWords: timeWords, pickPunch: pickPunch, PUNCH: PUNCH, STYLES: STYLES, HUMORS: HUMORS, DEFAULTS: DEFAULTS, CAP_MS: CAP_MS, FORBIDDEN: FORBIDDEN, BODY_BAN: BODY_BAN };
})(typeof window !== 'undefined' ? window : globalThis);
