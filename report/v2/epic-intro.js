// EpicIntro — INTRO 전용 연출: "한 사람이 태어난 일을 천하의 대사건처럼 다루는 초진지 정통 무협 패러디".
// 대사는 거창하게, 연출은 극도로 진지하게, 데이터(간지·출생일시·이름)는 절대 과장하지 않는다. 패러디는 이 INTRO에서 끝난다.
// 본편(BODY: 해석 모듈·AI 컴포저·챕터 문구)과 코드 수준에서 분리한다: 이 파일의 문구·프리셋·펀치라인은 compose/AI 프롬프트로 들어가지 않는다.
//   style = EPIC_WUXIA_PARODY (INTRO) / MODERN_CLEAR (BODY)
// 입력 : sd(만세력 결과를 옮긴 Structured Saju Data: pillars hanja/ko, birth, gender) · name · opts
// 출력 : 시네마 장면 배열(Translator.prologue 와 같은 모양). 명리 계산·한자 음독 추측은 하지 않는다 — 간지는 sd.pillars 값 그대로.
// 음성 해설(TTS)·효과음(SFX)은 쓰지 않는다. 배경음악 신호(cue: bgmCut·bgmUp·bgmDrone)만 남아 있고, 북·바람 신호(drum·deepDrum·sfx)는 데이터로만 보존되며 재생되지 않는다.
// style: EPIC_WUXIA_JOURNEY(기본 · 정통 무협 오프닝, 모험·출정·路) · EPIC_WUXIA_PARODY(예전 패러디) · CINEMATIC · MINIMAL
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var STYLES = ['EPIC_WUXIA_JOURNEY_SHORT', 'EPIC_WUXIA_JOURNEY', 'EPIC_WUXIA_PARODY', 'CINEMATIC', 'MINIMAL'], HUMORS = ['OFF', 'SUBTLE', 'PARODY'];
  var DEFAULTS = { style: 'EPIC_WUXIA_JOURNEY_SHORT', humor: 'PARODY', epicLevel: 5 };
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
    o = o || {}; var lines = o.big ? [text] : String(text).indexOf('\n') >= 0 ? String(text).split('\n') : wrapLine(text, 12), per = lines.length > 1 ? 320 : 0, segs = [];
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

  /* ═══════════════════════════════════════════════════════════════════════════════════════════
     EPIC_WUXIA_JOURNEY — 정통 무협 영화의 오프닝. 전투가 아니라 모험·출정·길·여정. 전체의 visual motif 는 路(길).
     글자 애니메이션은 네 가지 어휘만, 의미별로 고정한다(사용자마다 같다):
       일반 문장 FADE_IN(fade) · 중요 문장 SLOW_SCALE_IN(slow-scale-in) · 한자 INK_REVEAL(ink-reveal) · 이름·運路·타이틀 CINEMATIC_REVEAL(cinematic-reveal)
       (BLUR_TO_FOCUS 는 보조로 허용되지만 기본 연출에서는 쓰지 않는다)
     TTS · 효과음(SFX)은 쓰지 않는다. 배경음악(BGM)은 독립된 층이고, 타이밍은 이 파일의 문장 길이(ms)가 정한다.
     간지·출생일·출생지는 sd.pillars / birth 값 그대로(AI·추측 없음). 성별 데이터가 없으면 "한 사람이". 이름으로 성별을 추측하지 않는다.
     ═══════════════════════════════════════════════════════════════════════════════════════════ */
  var ANIM = { normal: 'fade', important: 'slow-scale-in', hanja: 'ink-reveal', cine: 'cinematic-reveal', blur: 'blur-to-focus' };
  var JOURNEY_CAP_MS = 150000; // 이 스타일은 길이 상한을 따로 둔다(사용자는 SKIP·배속으로 조절)

  function journey(sd, name, vars, birth, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {}); birth = birth || {};
    var cap = Math.max(40000, Math.min(240000, (+opts.capSec || JOURNEY_CAP_MS / 1000) * 1000)), N = R.Narrator, nm = String(name || '').trim();
    var P = sd.pillars || {}, py = P.year, pm = P.month, pd = P.day, ph = birth.hourKnown === false || !P.hour ? null : P.hour;
    var by = birth.y || (sd.birth && sd.birth.solarY), now = opts.nowYear || new Date().getFullYear();
    var hero = HERO[sd.gender] || '한 사람이'; // 성별이 명확할 때만 사내/여인
    var T = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.normal }, o)); };                                     // 일반 문장
    var Im = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.important, e: 'impact' }, o)); };                   // 중요 문장
    var Hj = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.hanja, e: 'impact', big: true }, o)); };            // 한자
    var base = { lead: 250, tail: 0, pauseAfter: 0, motionIntensity: 2, transition: 'crossfade', pacing: 'SLOW' }, C1 = function (o) { return Object.assign({}, base, o); };
    var out = [], tags = function (arr) { return { mediaTags: arr }; };
    var sc = function (id, preset, cin, segs, extra) { return scene(id, preset, C1(cin), build(segs), extra); };

    // 01 검은 화면 — 때는, 연도, 연주·월주(간지는 만세력 결과 그대로)
    var s1 = [T('때는,', 1500, { min: 900 })];
    if (by) s1.push(Im(by + '년.', 1700, { min: 1000 }));
    if (py) { s1.push(Hj(py.hanja + '年', 800, { min: 600 })); s1.push(T(py.ko + '년', 1300, { e: 'soft', together: true, min: 800 })); }
    if (pm) s1.push(Hj(pm.hanja + '月', 1900, { min: 1100 }));
    out.push(sc('ep_j01', 'SILENCE', { sceneType: 'INTRO', lead: 900, bgmMood: 'ambient', pacing: 'PAUSE', textSize: 'XL' }, s1, { bg: 'black', bgmCue: 'bgmDrone' }));

    // 02 탄생 — 새벽 산맥, 운해, 갈대
    var s2 = [T('어느 새벽.', 1700, { min: 1000 })];
    s2.push(T('한 사람이\n세상에 첫발을\n내디뎠다.', 2800, { min: 1800 }), T(hero + ' 태어났으니—', 2400, { min: 1500, e: 'pause' }));
    out.push(sc('ep_j02', 'DAWN', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.4, bgmMood: 'ambient', textPosition: 'center', textSize: 'L' }, tags(['mountain', 'mist', 'field', 'sunrise'])), s2,
      { mediaIntent: { scenes: ['mountain', 'mist', 'field', 'sunrise'], emotions: ['awe', 'calm'] } }));

    // 03 이름 공개 — 암전, 충분한 HOLD, 큰 글자 + 검은 여백 + 느린 scale. (이름이 없으면 이 장면은 건너뛴다)
    if (nm) out.push(sc('ep_j03', 'NAME_REVEAL', { sceneType: 'INTRO', lead: 800, pacing: 'PAUSE', nameEmphasis: 'MAXIMUM', bgmMood: 'minimal', transition: 'dip-black', textSize: 'XL' },
      [T('그 이름.', 2000, { e: 'pause', min: 1200 }), S('{hero}', 4200, { name: true, big: true, e: 'impact', a: ANIM.cine, min: 2600 })], { bg: 'black' }));

    // 04 命 — 산 정상, 안개, 새벽빛
    out.push(sc('ep_j04', 'MOUNTAIN', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.42, bgmMood: 'cinematic', textPosition: 'center' }, tags(['mountain', 'cloud', 'mist', 'sunrise'])), [
      T('누구에게나\n태어나며 주어진 것이\n있다.', 3000, { min: 1800 }), Hj('命', 2300, { min: 1500 }),
      T('태어난 시간.', 1000, { min: 700 }), T('태어난 계절.', 1000, { min: 700 }), T('타고난 기질.', 1000, { min: 700 }), T('세상을 바라보는 방식.', 1700, { min: 1000 }),
      T('그 시작을', 1300, { min: 800 }), T('명이라 부른다.', 2200, { min: 1400, e: 'pause' })],
      { mediaIntent: { scenes: ['mountain', 'cloud', 'mist'], emotions: ['awe', 'powerful'] } }));

    // 05 運 — 산 정상에서 흐르는 강, 이어지는 길로
    out.push(sc('ep_j05', 'RIVER', Object.assign({ sceneType: 'INTRO', imageMotion: 'pan-left', overlayStrength: 0.45, bgmMood: 'ambient', textPosition: 'center' }, tags(['river', 'road', 'mist', 'lake'])), [
      T('그러나—', 1500, { min: 900 }), T('태어난 것이\n전부는 아니다.', 2300, { min: 1500 }), Hj('運', 2300, { min: 1500 }), T('시간이 흐르면\n운도 흐른다.', 2500, { min: 1600 }),
      T('어떤 길은 열리고.', 1700, { min: 1000 }), T('어떤 길은 막힌다.', 1700, { min: 1000 }), T('어떤 사람은 찾아오고.', 1700, { min: 1000 }), T('어떤 사람은 떠난다.', 1900, { min: 1100 }), T('어떤 선택은\n삶의 방향을 바꾼다.', 2700, { min: 1600 })],
      { mediaIntent: { scenes: ['river', 'road', 'mist'], emotions: ['reflective', 'calm'] } }));

    // 06 길 — 광활한 산맥, 여러 갈래의 길
    out.push(sc('ep_j06', 'CROSSROAD', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-out', overlayStrength: 0.4, bgmMood: 'reflective', textPosition: 'center' }, tags(['mountain', 'road', 'crossroads', 'cloud'])), [
      T('그렇게 사람은', 1500, { min: 900 }), T('수많은 길을 지나고.', 1800, { min: 1000 }), T('수많은 선택을 하며.', 1800, { min: 1000 }), T('자신의 시간을\n살아간다.', 2300, { min: 1400 }),
      T('그리고—', 1600, { min: 1000, e: 'pause' }), T('누구에게나\n한 번쯤 이런 순간이\n찾아온다.', 2900, { min: 1800 })],
      { mediaIntent: { scenes: ['mountain', 'road', 'crossroads'], emotions: ['reflective'] } }));

    // 07 질문 — 안개 낀 산길, 앞이 보이지 않는다
    out.push(sc('ep_j07', 'MIST', Object.assign({ sceneType: 'INTRO', imageMotion: 'drift', overlayStrength: 0.52, bgmMood: 'tension', textPosition: 'center' }, tags(['mist', 'road', 'walkingAlone', 'mountain'])), [
      Im('나는 지금\n어디쯤 와 있는가.', 4200, { min: 2600 }), T('지나온 길에는\n무엇이 있었는가.', 2700, { min: 1700 }), T('지금 내 앞에는\n어떤 운이 흐르고 있는가.', 3000, { min: 1900 }), T('그리고—', 1700, { min: 1100, e: 'pause' })],
      { mediaIntent: { scenes: ['mist', 'road', 'walkingAlone'], emotions: ['lonely', 'reflective'] } }));
    out.push(sc('ep_j08', 'MOUNTAIN', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.45, bgmMood: 'tension', textPosition: 'center' }, tags(['mountain', 'cloud', 'mist'])), [
      Im('산 너머에는\n무엇이 기다리고 있는가.', 4200, { min: 2600 })], { mediaIntent: { scenes: ['mountain', 'cloud', 'mist'], emotions: ['awe'] } }));

    // 09 여정의 시작 — 안개가 조금씩 걷힌다. 본편에서 다룰 주제를 자연스럽게 예고
    out.push(sc('ep_j09', 'DAWN', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.38, bgmMood: 'hopeful', textPosition: 'center' }, tags(['mist', 'sunrise', 'road', 'field'])), [
      T('그래서 이제.', 1400, { min: 900 }), T('지나온 운을 거슬러', 1800, { min: 1100 }), T('아직 오지 않은 때를\n향해 간다.', 2500, { min: 1500 }),
      T('재물이 흐르는 곳.', 1500, { min: 900 }), T('인연이 기다리는 곳.', 1500, { min: 900 }), T('기회가 열리는 때.', 1500, { min: 900 }), T('그리고', 1000, { min: 700 }), T('피해야 할 길까지.', 2100, { min: 1300 })],
      { mediaIntent: { scenes: ['mist', 'sunrise', 'road'], emotions: ['hopeful'] } }));

    // 10 四柱八字 — 고풍스러운 지도·두루마리·먹(이미지 대신 양피지·먹 배경). 실제 명식은 만세력 값 그대로
    var s10 = [T('그 길을 찾기 위해.', 1900, { min: 1200 }), T('네 개의 기둥.', 1700, { min: 1000 }), T('여덟 개의 글자를\n펼친다.', 2200, { min: 1400 }), S('四柱八字', 3200, { big: true, e: 'impact', a: ANIM.cine, title: true, min: 2200 })];
    var pil = ['hour', 'day', 'month', 'year'].map(function (k, i) { var p = P[k]; return { label: '時日月年'[i], hj: k === 'hour' && !ph ? '' : (p ? p.hanja : ''), ko: k === 'hour' && !ph ? '' : (p ? p.ko : '') }; });
    out.push(sc('ep_j10', 'REALITY_CHECK', { sceneType: 'INTRO', motionIntensity: 0, imageMotion: 'none', overlayStrength: 0.7, bgmMood: 'cinematic', textPosition: 'top', textSize: 'L' }, s10, { phTone: 'map', pillars: pil, pillarsAt: 3 }));
    // 11 사주팔자의 의미 — "지도"가 핵심 은유. 미래를 확정한다는 표현은 쓰지 않는다
    out.push(sc('ep_j11', 'REALITY_CHECK', { sceneType: 'INTRO', motionIntensity: 0, imageMotion: 'none', overlayStrength: 0.7, bgmMood: 'reflective', textPosition: 'center', textSize: 'L' }, [
      T('이것은\n정답이 아니다.', 2400, { min: 1500 }), T('길을 대신\n걸어주지도 않는다.', 2800, { min: 1800 }), T('다만—', 1700, { min: 1100, e: 'pause' }),
      T('지나온 흐름을 살피고.', 2000, { min: 1200 }), T('지금 서 있는 곳을\n확인하고.', 2200, { min: 1400 }), T('앞으로 마주할 길을\n헤아리기 위한', 2400, { min: 1500 }), Im('하나의 지도다.', 3000, { min: 1900 })], { phTone: 'map' }));

    // 12 출정 — 가장 큰 스케일: 광활한 산맥, 운해, 절벽, 끝없이 이어지는 길, 아직 완전히 뜨지 않은 태양
    out.push(sc('ep_j12', 'SUNRISE', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.3, bgmMood: 'cinematic', textPosition: 'lower-third', textSize: 'L' }, tags(['mountain', 'cloud', 'sunrise', 'road'])), [
      Im('이제.', 1900, { min: 1200 }), T('길을 나선다.', 2000, { min: 1200 }), T('지나온 운을 넘어.', 1900, { min: 1200 }), T('아직 오지 않은', 1600, { min: 1000 }), Im('나의 때를 향해.', 3000, { min: 1900 })],
      { mediaIntent: { scenes: ['mountain', 'cloud', 'sunrise', 'road'], emotions: ['powerful', 'hopeful'] } }));
    // 13 마지막 빌드업 — 길 자체가 주인공
    out.push(sc('ep_j13', 'MOUNTAIN', Object.assign({ sceneType: 'INTRO', imageMotion: 'pan-up', overlayStrength: 0.42, bgmMood: 'cinematic', textPosition: 'center' }, tags(['road', 'mountain', 'mist', 'walkingAlone'])), [
      T('산 너머', 1400, { min: 900 }), T('무엇이 기다리고 있는지는', 2000, { min: 1300 }), T('아직 알 수 없다.', 2400, { min: 1500 }), T('다만—', 3000, { min: 2200, e: 'pause' }), Im('길은\n이미 열렸다.', 3400, { min: 2200 })],
      { mediaIntent: { scenes: ['road', 'mountain', 'mist'], emotions: ['awe', 'hopeful'] } }));

    // 14 運路 — 태양이 산맥 너머로 떠오르고, 운해 사이로 길이 이어진다. INTRO 에서 가장 강한 글자 연출(ink + opacity + 0.97→1 scale)
    out.push(scene('ep_j14', 'CINEMATIC_INTRO', C1({ sceneType: 'INTRO', pacing: 'PAUSE', transition: 'dip-white', motionIntensity: 2, imageMotion: 'slow-zoom-in', overlayStrength: 0.38, bgmMood: 'cinematic', lead: 300, tail: 1800, nameEmphasis: nm ? 'TITLE' : 'NONE', mediaTags: ['sunrise', 'mountain', 'cloud', 'road', 'mist'] }),
      build([S('運路', 2400, { big: true, e: 'impact', a: ANIM.cine, title: true, min: 1800 })]),
      { kind: 'title', sub: nm ? '{hero}의 운이 흐르는 길\n\n{hero}에게는,\n{hero}의 때가 있다.' : '모든 사람에게는,\n각자의 때가 있다.', bgmCue: 'full', mediaIntent: { scenes: ['sunrise', 'mountain', 'cloud', 'road'], emotions: ['hopeful', 'powerful'] } }));
    // 15 이제, 출발한다. — 여기서 INTRO 연출이 끝난다(이후 본편은 글자가 움직이지 않는다)
    out.push(sc('ep_j15', 'SILENCE', { sceneType: 'INTRO', lead: 600, pacing: 'PAUSE', transition: 'dip-black', bgmMood: 'minimal', textSize: 'XL', tail: 600 }, [T('이제,', 1700, { min: 1100 }), Im('출발한다.', 2800, { min: 1800 })], { bg: 'black' }));

    out = fit(out, cap);
    // 이름이 들어간 문장은 자리표시자로 두었다가 여기서 채운다(이름은 이 기기 안에서만 쓴다)
    if (N && vars) out.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { g.text = N.fill(g.text, vars); }); if (s.sub) s.sub = N.fill(s.sub, vars); });
    // 지도 장면: 명식은 四柱八字 제목이 나온 뒤에 펼쳐진다(해당 문장의 위치를 찾아 둔다)
    out.forEach(function (s) { if (s.pillars) { var segs = s.cinema.segments || [], at = -1; segs.forEach(function (g, i) { if (/四柱八字/.test(g.text)) at = i; }); if (at >= 0) s.pillarsAt = at; } });
    return out;
  }

  /* EPIC_WUXIA_JOURNEY_SHORT — 같은 여정(命→運→四柱八字→運路)을 7장면으로 압축한 기본 INTRO. 본편 다리(bridge)까지 합쳐 20초 안에 끝난다. 글자 연출 어휘는 JOURNEY 와 같다. */
  var SHORT_CAP_MS = 20000, SHORT_BODY_MS = 15200; // 본편 다리 장면(약 3.4초)을 더해도 20초 이내
  function journeyShort(sd, name, vars, birth, opts) {
    opts = Object.assign({}, DEFAULTS, opts || {}); birth = birth || {};
    var N = R.Narrator, nm = String(name || '').trim(), P = sd.pillars || {}, py = P.year, pm = P.month, ph = birth.hourKnown === false || !P.hour ? null : P.hour, by = birth.y || (sd.birth && sd.birth.solarY);
    var T = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.normal }, o)); }, Im = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.important, e: 'impact' }, o)); }, Hj = function (t, ms, o) { return S(t, ms, Object.assign({ a: ANIM.hanja, e: 'impact', big: true }, o)); };
    var base = { lead: 150, tail: 0, pauseAfter: 0, motionIntensity: 2, transition: 'crossfade', pacing: 'MEDIUM' }, C1 = function (o) { return Object.assign({}, base, o); }, out = [];
    var sc = function (id, preset, cin, segs, extra) { return scene(id, preset, C1(cin), build(segs), extra); }, mt = function (arr) { return { mediaTags: arr }; };
    var s1 = [T('때는,', 800, { min: 500 })]; if (by) s1.push(Im(by + '년.', 900, { min: 600 })); if (py) { s1.push(Hj(py.hanja + '年', 700, { min: 500 })); } if (pm) s1.push(Hj(pm.hanja + '月', 800, { min: 500 }));
    out.push(sc('ep_s01', 'SILENCE', { sceneType: 'INTRO', lead: 300, bgmMood: 'ambient', pacing: 'PAUSE', textSize: 'XL' }, s1, { bg: 'black', bgmCue: 'bgmDrone' }));
    if (nm) out.push(sc('ep_s02', 'NAME_REVEAL', { sceneType: 'INTRO', lead: 300, pacing: 'PAUSE', nameEmphasis: 'MAXIMUM', bgmMood: 'minimal', transition: 'dip-black', textSize: 'XL' }, [S('{hero}', 2400, { name: true, big: true, e: 'impact', a: ANIM.cine, min: 1600 })], { bg: 'black' }));
    out.push(sc('ep_s03', 'MOUNTAIN', Object.assign({ sceneType: 'INTRO', imageMotion: 'slow-zoom-in', overlayStrength: 0.42, bgmMood: 'cinematic', textPosition: 'center' }, mt(['mountain', 'cloud', 'mist', 'sunrise'])), [T('태어나며 주어진 것.', 1400, { min: 900 }), Hj('命', 1300, { min: 900 })],
      { mediaIntent: { scenes: ['mountain', 'cloud', 'mist'], emotions: ['awe', 'powerful'] } }));
    out.push(sc('ep_s04', 'RIVER', Object.assign({ sceneType: 'INTRO', imageMotion: 'pan-left', overlayStrength: 0.45, bgmMood: 'ambient', textPosition: 'center' }, mt(['river', 'road', 'mist'])), [T('그러나 시간이 흐르면\n운도 흐른다.', 2000, { min: 1300 }), Hj('運', 1300, { min: 900 })],
      { mediaIntent: { scenes: ['river', 'road', 'mist'], emotions: ['reflective', 'calm'] } }));
    var pil = ['hour', 'day', 'month', 'year'].map(function (k, i) { var p = P[k]; return { label: '時日月年'[i], hj: k === 'hour' && !ph ? '' : (p ? p.hanja : ''), ko: k === 'hour' && !ph ? '' : (p ? p.ko : '') }; });
    out.push(sc('ep_s05', 'REALITY_CHECK', { sceneType: 'INTRO', motionIntensity: 0, imageMotion: 'none', overlayStrength: 0.7, bgmMood: 'cinematic', textPosition: 'top', textSize: 'L' },
      [T('길을 찾기 위해, 네 개의 기둥.', 1500, { min: 1000 }), S('四柱八字', 1700, { big: true, e: 'impact', a: ANIM.cine, title: true, min: 1200 }), Im('하나의 지도다.', 1700, { min: 1100 })], { phTone: 'map', pillars: pil, pillarsAt: 1 }));
    out.push(scene('ep_s06', 'CINEMATIC_INTRO', C1({ sceneType: 'INTRO', pacing: 'PAUSE', transition: 'dip-white', motionIntensity: 2, imageMotion: 'slow-zoom-in', overlayStrength: 0.38, bgmMood: 'cinematic', lead: 200, tail: 900, nameEmphasis: nm ? 'TITLE' : 'NONE' }),
      build([S('運路', 1800, { big: true, e: 'impact', a: ANIM.cine, title: true, min: 1400 })]),
      { kind: 'title', sub: nm ? '{hero}에게는,\n{hero}의 때가 있다.' : '모든 사람에게는,\n각자의 때가 있다.', bgmCue: 'full', mediaIntent: { scenes: ['sunrise', 'mountain', 'cloud', 'road'], emotions: ['powerful', 'hopeful'] } }));
    out = fit(out, SHORT_BODY_MS);
    if (N && vars) out.forEach(function (s) { (s.cinema.segments || []).forEach(function (g) { g.text = N.fill(g.text, vars); }); if (s.sub) s.sub = N.fill(s.sub, vars); });
    out.forEach(function (s) { if (s.pillars) { var segs = s.cinema.segments || [], at = -1; segs.forEach(function (g, i) { if (/四柱八字/.test(g.text)) at = i; }); if (at >= 0) s.pillarsAt = at; } });
    return out;
  }

  // 본편으로 넘어가는 다리: 패러디는 여기서 끝난다. 문체는 본편과 같은 담백한 현대어.
  function bridge() {
    var segs = build([S('CHAPTER 01', 900, { a: 'fade', e: 'soft' }), S('나의 기본 사주', 2200, { a: 'fade', e: 'impact' })]);
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

  R.EpicIntro = { journey: journey, journeyShort: journeyShort, SHORT_CAP_MS: SHORT_CAP_MS, ANIM: ANIM, JOURNEY_CAP_MS: JOURNEY_CAP_MS, build: intro, bridge: bridge, totalMs: totalMs, fit: fit, timeWords: timeWords, pickPunch: pickPunch, PUNCH: PUNCH, STYLES: STYLES, HUMORS: HUMORS, DEFAULTS: DEFAULTS, CAP_MS: CAP_MS, FORBIDDEN: FORBIDDEN, BODY_BAN: BODY_BAN };
})(typeof window !== 'undefined' ? window : globalThis);
