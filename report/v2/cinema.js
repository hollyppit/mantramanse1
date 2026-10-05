// Cinema — "MY LIFE AS A MOVIE" 시네마틱 장면 스키마 · 연출 프리셋 · 텍스트 자동 분절 · 모션 시퀀스.
// 순수 함수(브라우저·Node 공용). 명리 계산을 하지 않는다: 이미 나온 factualBasis·문장을 받아 "어떻게 보여 줄지"만 정한다.
//
// 장면(scene.cinema) 필드 우선순위:  scene.cinema(감독/관리자 지정) > 클립 개별 연출(asset.cinema) > 기본 연출(cinemaDefaults[sceneType]) > 프리셋 > 내장 기본값
// 새 필드가 하나도 없는 기존 장면도 그대로 동작한다(resolve 가 EXPLANATION/MEDIUM/1/crossfade 로 채운다).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};

  var SCENE_TYPES = ['INTRO', 'CHARACTER', 'QUESTION', 'MEMORY', 'DAILY_LIFE', 'EXPLANATION', 'CONFLICT', 'COMPARISON', 'REVEAL', 'TURNING_POINT', 'TIMELINE', 'WARNING', 'OPPORTUNITY', 'ACTION', 'CLIMAX', 'ENDING'];
  var TEXT_ANIMS = ['fade', 'fade-up', 'fade-down', 'slide-left', 'slide-right', 'zoom-in', 'zoom-out', 'blur-in', 'focus-in', 'word-reveal', 'line-reveal', 'typewriter', 'cinematic-title', 'impact', 'whisper', 'float', 'parallax-text'];
  var IMAGE_MOTIONS = ['none', 'slow-zoom-in', 'slow-zoom-out', 'pan-left', 'pan-right', 'pan-up', 'pan-down', 'parallax', 'drift', 'focus-pull'];
  var TRANSITIONS = ['fade', 'crossfade', 'dip-black', 'dip-white', 'blur', 'push-left', 'push-right', 'zoom', 'hard-cut', 'light-leak'];
  var SPECIAL_TRANSITIONS = ['dip-black', 'dip-white', 'blur', 'push-left', 'push-right', 'zoom', 'light-leak']; // ACT 전환·turning point 에서만
  var PACING = ['FAST', 'MEDIUM', 'SLOW', 'PAUSE'];
  var EMPHASIS = ['soft', 'normal', 'pause', 'impact'];
  var POSITIONS = ['top', 'center', 'bottom', 'lower-third'];
  var SIZES = ['S', 'M', 'L', 'XL'];
  var BGM = ['cinematic', 'minimal', 'ambient', 'emotional', 'tension', 'hopeful', 'reflective'];
  var MOODS = ['calm', 'awe', 'reflective', 'tense', 'warm', 'hopeful', 'lonely', 'powerful'];
  var MOTION_TARGETS = ['background', 'camera', 'overlay', 'text'];
  var MOTION_ACTIONS = ['fade-in', 'fade-out', 'dim', 'brighten', 'slow-zoom-in', 'slow-zoom-out', 'pan-left', 'pan-right', 'drift', 'impact', 'fade-up', 'blur-in', 'hold'];

  // 모션 강도: 0 정적 · 1 약함 · 2 일반 · 3 강조(챕터당 최대 2) · 4 클라이맥스(리포트 전체에서 극히 제한)
  var INTENSITY_SCALE = [0, 0.04, 0.08, 0.14, 0.22]; // 카메라가 움직이는 비율(확대/이동 폭)
  var MAX_INTENSITY3_PER_CHAPTER = 2, MAX_INTENSITY4_PER_REPORT = 1;

  // 연출 프리셋: 관리자는 프리셋만 골라도 기본 연출이 자동으로 들어간다.
  var PRESETS = {
    CINEMATIC_INTRO: { sceneType: 'INTRO', pacing: 'SLOW', motionIntensity: 2, imageMotion: 'slow-zoom-in', transition: 'dip-black', textAnimation: 'cinematic-title', textPosition: 'center', textSize: 'XL', overlayStrength: 0.6, bgmMood: 'cinematic', mood: 'awe', pauseAfter: 900 },
    CHARACTER_REVEAL: { sceneType: 'CHARACTER', pacing: 'SLOW', motionIntensity: 2, imageMotion: 'focus-pull', transition: 'crossfade', textAnimation: 'line-reveal', textPosition: 'lower-third', textSize: 'M', overlayStrength: 0.5, bgmMood: 'cinematic', mood: 'awe', pauseAfter: 600 },
    QUIET_REFLECTION: { sceneType: 'QUESTION', pacing: 'SLOW', motionIntensity: 1, imageMotion: 'slow-zoom-in', transition: 'crossfade', textAnimation: 'fade-up', textPosition: 'center', textSize: 'L', overlayStrength: 0.55, bgmMood: 'reflective', mood: 'reflective', pauseAfter: 700 },
    DAILY_REALITY: { sceneType: 'DAILY_LIFE', pacing: 'MEDIUM', motionIntensity: 1, imageMotion: 'drift', transition: 'crossfade', textAnimation: 'fade-up', textPosition: 'bottom', textSize: 'M', overlayStrength: 0.45, bgmMood: 'minimal', mood: 'calm', pauseAfter: 400 },
    REALITY_CHECK: { sceneType: 'EXPLANATION', pacing: 'MEDIUM', motionIntensity: 0, imageMotion: 'none', transition: 'crossfade', textAnimation: 'fade', textPosition: 'center', textSize: 'M', overlayStrength: 0.55, bgmMood: 'minimal', mood: 'calm', pauseAfter: 300 },
    TENSION: { sceneType: 'CONFLICT', pacing: 'FAST', motionIntensity: 2, imageMotion: 'pan-left', transition: 'hard-cut', textAnimation: 'blur-in', textPosition: 'bottom', textSize: 'L', overlayStrength: 0.5, bgmMood: 'tension', mood: 'tense', pauseAfter: 300 },
    DISCOVERY: { sceneType: 'REVEAL', pacing: 'MEDIUM', motionIntensity: 2, imageMotion: 'slow-zoom-in', transition: 'crossfade', textAnimation: 'focus-in', textPosition: 'center', textSize: 'L', overlayStrength: 0.45, bgmMood: 'hopeful', mood: 'hopeful', pauseAfter: 500 },
    TURNING_POINT: { sceneType: 'TURNING_POINT', pacing: 'PAUSE', motionIntensity: 3, imageMotion: 'slow-zoom-in', transition: 'dip-black', textAnimation: 'impact', textPosition: 'center', textSize: 'XL', overlayStrength: 0.55, bgmMood: 'emotional', mood: 'powerful', pauseAfter: 900 },
    TIMELINE: { sceneType: 'TIMELINE', pacing: 'MEDIUM', motionIntensity: 1, imageMotion: 'pan-right', transition: 'crossfade', textAnimation: 'slide-left', textPosition: 'top', textSize: 'M', overlayStrength: 0.5, bgmMood: 'ambient', mood: 'reflective', pauseAfter: 300 },
    WARNING: { sceneType: 'WARNING', pacing: 'SLOW', motionIntensity: 0, imageMotion: 'none', transition: 'crossfade', textAnimation: 'whisper', textPosition: 'center', textSize: 'L', overlayStrength: 0.6, bgmMood: 'tension', mood: 'tense', pauseAfter: 600 },
    OPPORTUNITY: { sceneType: 'OPPORTUNITY', pacing: 'MEDIUM', motionIntensity: 2, imageMotion: 'pan-up', transition: 'crossfade', textAnimation: 'fade-up', textPosition: 'lower-third', textSize: 'L', overlayStrength: 0.4, bgmMood: 'hopeful', mood: 'hopeful', pauseAfter: 400 },
    EMOTIONAL: { sceneType: 'MEMORY', pacing: 'SLOW', motionIntensity: 1, imageMotion: 'slow-zoom-in', transition: 'crossfade', textAnimation: 'whisper', textPosition: 'lower-third', textSize: 'M', overlayStrength: 0.55, bgmMood: 'emotional', mood: 'lonely', pauseAfter: 700 },
    CLIMAX: { sceneType: 'CLIMAX', pacing: 'PAUSE', motionIntensity: 4, imageMotion: 'slow-zoom-in', transition: 'dip-white', textAnimation: 'impact', textPosition: 'center', textSize: 'XL', overlayStrength: 0.5, bgmMood: 'emotional', mood: 'powerful', pauseAfter: 1200 },
    ENDING: { sceneType: 'ENDING', pacing: 'SLOW', motionIntensity: 1, imageMotion: 'slow-zoom-out', transition: 'dip-black', textAnimation: 'fade-up', textPosition: 'center', textSize: 'L', overlayStrength: 0.6, bgmMood: 'reflective', mood: 'reflective', pauseAfter: 900 },
  };
  var PRESET_NAMES = Object.keys(PRESETS);
  // 프리셋이 따로 정해지지 않은 sceneType 의 기본 프리셋
  var TYPE_PRESET = { INTRO: 'CINEMATIC_INTRO', CHARACTER: 'CHARACTER_REVEAL', QUESTION: 'QUIET_REFLECTION', MEMORY: 'EMOTIONAL', DAILY_LIFE: 'DAILY_REALITY', EXPLANATION: 'REALITY_CHECK', CONFLICT: 'TENSION', COMPARISON: 'REALITY_CHECK',
    REVEAL: 'DISCOVERY', TURNING_POINT: 'TURNING_POINT', TIMELINE: 'TIMELINE', WARNING: 'WARNING', OPPORTUNITY: 'OPPORTUNITY', ACTION: 'OPPORTUNITY', CLIMAX: 'CLIMAX', ENDING: 'ENDING' };

  // 기존(v2) 장면 종류 → 시네마틱 sceneType. 새 필드가 없는 기존 장면의 fallback 은 EXPLANATION.
  var LEGACY = { chapterIntro: 'QUESTION', insight: 'EXPLANATION', explanation: 'EXPLANATION', chart: 'EXPLANATION', dataVisualization: 'TIMELINE', timeline: 'TIMELINE', recommendation: 'OPPORTUNITY', warning: 'WARNING', action: 'ACTION',
    chapterEnding: 'QUESTION', transition: 'TURNING_POINT', verdictFind: 'REVEAL', verdictBlock: 'CONFLICT', verdictEvidence: 'MEMORY', verdictAdvice: 'ACTION', visualMetaphor: 'MEMORY', cinema: 'DAILY_LIFE' };

  var BUILTIN = { sceneType: 'EXPLANATION', pacing: 'MEDIUM', motionIntensity: 1, imageMotion: 'none', transition: 'crossfade', textAnimation: 'fade-up', textPosition: 'bottom', textSize: 'M', textEmphasis: 'normal', overlayStrength: 0.45,
    focalPoint: { x: 0.5, y: 0.5 }, pauseAfter: 0, bgmMood: 'minimal', mood: 'calm' };

  var has = function (list, v) { return list.indexOf(v) >= 0; };
  var num = function (v, lo, hi, d) { v = v === '' || v == null ? NaN : +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; };

  // 허용값만 남기는 정리(서버 검증과 같은 범위여야 한다: functions/_cinema.js)
  function clean(c) {
    var o = {}; if (!c || typeof c !== 'object') return o;
    if (has(SCENE_TYPES, c.sceneType)) o.sceneType = c.sceneType;
    if (has(PRESET_NAMES, c.preset)) o.preset = c.preset;
    if (has(PACING, c.pacing)) o.pacing = c.pacing;
    var mi = num(c.motionIntensity, 0, 4, undefined); if (mi !== undefined) o.motionIntensity = Math.round(mi);
    if (has(IMAGE_MOTIONS, c.imageMotion)) o.imageMotion = c.imageMotion;
    if (has(TRANSITIONS, c.transition)) o.transition = c.transition;
    if (has(TEXT_ANIMS, c.textAnimation)) o.textAnimation = c.textAnimation;
    if (has(POSITIONS, c.textPosition)) o.textPosition = c.textPosition;
    if (has(SIZES, c.textSize)) o.textSize = c.textSize;
    if (has(EMPHASIS, c.textEmphasis)) o.textEmphasis = c.textEmphasis;
    var ov = num(c.overlayStrength, 0, 1, undefined); if (ov !== undefined) o.overlayStrength = Math.round(ov * 100) / 100;
    if (c.focalPoint && typeof c.focalPoint === 'object') o.focalPoint = { x: num(c.focalPoint.x, 0, 1, 0.5), y: num(c.focalPoint.y, 0, 1, 0.5) };
    var pa = num(c.pauseAfter, 0, 5000, undefined); if (pa !== undefined) o.pauseAfter = Math.round(pa);
    if (has(BGM, c.bgmMood)) o.bgmMood = c.bgmMood;
    if (has(MOODS, c.mood)) o.mood = c.mood;
    if (typeof c.narrativePurpose === 'string') o.narrativePurpose = c.narrativePurpose.slice(0, 160);
    if (typeof c.visualConcept === 'string') o.visualConcept = c.visualConcept.slice(0, 160);
    if (Array.isArray(c.mediaTags)) o.mediaTags = c.mediaTags.slice(0, 12).map(function (t) { return String(t).slice(0, 30); }).filter(Boolean);
    var du = num(c.duration, 1000, 60000, undefined); if (du !== undefined) o.duration = Math.round(du);
    if (Array.isArray(c.segments)) o.segments = cleanSegments(c.segments);
    if (Array.isArray(c.motionSequence)) o.motionSequence = cleanSequence(c.motionSequence);
    return o;
  }
  function cleanSegments(list) {
    return list.slice(0, 24).map(function (s, i) {
      if (!s || typeof s.text !== 'string' || !s.text.trim()) return null;
      return { text: s.text.slice(0, 120), emphasis: has(EMPHASIS, s.emphasis) ? s.emphasis : 'normal', animation: has(TEXT_ANIMS, s.animation) ? s.animation : 'fade-up', block: Math.round(num(s.block, 0, 40, 0)) };
    }).filter(Boolean);
  }
  function cleanSequence(list) {
    return list.slice(0, 40).map(function (m) {
      if (!m || typeof m !== 'object') return null; var t = String(m.target || '');
      var okT = has(MOTION_TARGETS, t) || /^text-\d{1,2}$/.test(t); if (!okT || !has(MOTION_ACTIONS, m.action)) return null;
      return { at: Math.round(num(m.at, 0, 120000, 0)), target: t, action: m.action, duration: Math.round(num(m.duration, 0, 60000, 600)) };
    }).filter(Boolean).sort(function (a, b) { return a.at - b.at; });
  }

  // 설정 한 겹(기본 연출·클립 연출·장면 지정)을 우선순위대로 합쳐 최종 값을 만든다.
  //  layers: [낮은 우선순위 … 높은 우선순위] 배열. 각 요소는 clean 을 거친 객체.
  function resolve(scene, layers) {
    scene = scene || {}; layers = (layers || []).map(clean);
    var own = clean(scene.cinema);
    var legacy = LEGACY[scene.sceneType];
    var all = layers.concat([own]);
    // sceneType: 가장 높은 층에서 지정한 값 → 기존 장면 종류 매핑 → EXPLANATION
    var st = BUILTIN.sceneType, explicitType = false;
    if (legacy) st = legacy;
    all.forEach(function (l) { if (l.sceneType) { st = l.sceneType; explicitType = true; } });
    // preset: 지정이 있으면 그것, 없으면 sceneType 기본 프리셋(기존 장면은 프리셋을 적용하지 않고 내장 기본값 — 모양이 갑자기 바뀌지 않게)
    var presetName = null; all.forEach(function (l) { if (l.preset) presetName = l.preset; });
    var base = Object.assign({}, BUILTIN, { sceneType: st });
    var explicit = presetName || (scene.cinema && scene.cinema.auto ? TYPE_PRESET[st] : null);
    if (explicit && PRESETS[explicit]) { var pv = Object.assign({}, PRESETS[explicit]); if (presetName && !explicitType) st = pv.sceneType; delete pv.sceneType; base = Object.assign(base, pv); } // 프리셋을 고르면 그 프리셋의 장면 종류도 따라온다(장면 종류를 직접 지정했으면 그 값이 우선)
    all.forEach(function (l) { Object.keys(l).forEach(function (k) { if (k !== 'preset' && k !== 'sceneType') base[k] = l[k]; }); });
    base.sceneType = st; base.preset = presetName || (explicit || null);
    return base;
  }

  // ───────────── 텍스트 자동 분절 ─────────────
  // 긴 문장을 한꺼번에 띄우지 않는다. 문장 → 호흡 단위(어절 묶음)로 쪼개고, 단위마다 강조·애니메이션을 정한다.
  //   하지만 / 중요한 순간마다 / 이상하게 / 판이 커진다.   (마지막은 impact)
  var CONNECTIVE = /^(하지만|그러나|그런데|그리고|그래서|결국|그러면|그럼에도|다만|사실|어쩌면|아니|그래도|또는|혹은|한편|반면)$/;
  var ADVERB = /(하게|롭게|럽게|스럽게|히|듯이|처럼|이나|에게도)$/;
  var MAXW = 9; // 한 호흡의 최대 글자 수(공백 제외 기준 약 8~9자)
  var len = function (s) { return String(s).replace(/\s+/g, '').length; };

  function phrases(sentence) {
    var toks = sentence.trim().split(/\s+/).filter(Boolean), out = [], cur = [];
    var flush = function () { if (cur.length) { out.push(cur.join(' ')); cur = []; } };
    for (var i = 0; i < toks.length; i++) {
      var t = toks[i], bare = t.replace(/[.,!?…"'”’“‘]+$/g, ''), isLast = i === toks.length - 1;
      if (CONNECTIVE.test(bare) && !isLast) { flush(); out.push(t); continue; } // 접속어는 혼자
      if (ADVERB.test(bare) && !isLast && len(bare) <= 5 && toks.length > 3) { flush(); out.push(t); continue; } // 짧은 부사는 혼자(박자)
      if (cur.length && len(cur.join('')) + len(t) > MAXW) flush();
      cur.push(t);
      if (/[,，]$/.test(t)) flush(); // 쉼표에서 끊는다
    }
    flush();
    // 마지막 두 조각이 너무 짧게 쪼개졌으면 합친다(서술어는 앞말과 붙는다): ["판이","커진다."] → "판이 커진다."
    if (out.length >= 2 && len(out[out.length - 1]) <= 3 && len(out[out.length - 2]) + len(out[out.length - 1]) <= MAXW && !CONNECTIVE.test(out[out.length - 2].replace(/[.,]$/, ''))) {
      out.splice(out.length - 2, 2, out[out.length - 2] + ' ' + out[out.length - 1]);
    }
    return out;
  }
  // text: 줄바꿈(\n)은 "장면 안의 문장 경계(블록)"로 본다. opts.impact: 각 블록의 마지막을 impact 로(기본 true: 문장 끝마다)
  function splitSegments(text, opts) {
    opts = opts || {}; var segs = [], block = 0;
    String(text == null ? '' : text).split(/\n+/).forEach(function (line) {
      var sents = line.match(/[^.!?…]+[.!?…]*/g) || []; // 문장 단위
      sents.forEach(function (sent) {
        sent = sent.trim(); if (!sent) return;
        var ph = phrases(sent);
        ph.forEach(function (p, i) {
          var last = i === ph.length - 1, bare = p.replace(/[.,!?…"'”’]+$/g, '');
          var e = 'normal', a = 'fade-up';
          if (CONNECTIVE.test(bare)) { e = 'soft'; a = 'fade'; }
          else if (!last && ADVERB.test(bare) && len(bare) <= 5) { e = 'pause'; a = 'blur-in'; }
          else if (last && opts.impact !== false && ph.length > 1) { e = 'impact'; a = 'zoom-in'; }
          segs.push({ text: p, emphasis: e, animation: a, block: block });
        });
        block++;
      });
    });
    if (opts.animation) segs.forEach(function (s) { if (s.emphasis !== 'impact') s.animation = opts.animation; });
    return segs;
  }

  // ───────────── 타이밍 / 모션 시퀀스 ─────────────
  // 정보량이 많다고 무조건 빠르게 넘기지 않는다: 핵심 문장(impact) 직전·직후에는 정적 구간을 둔다.
  var PACE = { FAST: { read: 85, hold: 650, mul: 0.75, gap: 200 }, MEDIUM: { read: 120, hold: 800, mul: 1, gap: 380 }, SLOW: { read: 140, hold: 850, mul: 1.3, gap: 520 }, PAUSE: { read: 170, hold: 950, mul: 1.7, gap: 800 } };
  var LEAD_IN = 700;
  // 세그먼트별 등장 시각(ms) 계산. 반환: { at: [..], end, total }
  function timing(segs, c) {
    var p = PACE[c.pacing] || PACE.MEDIUM, cur = LEAD_IN, at = [];
    segs.forEach(function (s, i) {
      if (s.emphasis === 'impact') cur += Math.round(p.gap * 0.8);               // impact 직전 정적
      at.push(cur);
      var hold = Math.max(p.hold * 0.6, len(s.text) * p.read * (s.emphasis === 'soft' ? 0.8 : 1));
      if (s.emphasis === 'pause') hold += p.gap;
      if (s.emphasis === 'impact') hold += p.gap * 1.6;                          // impact 직후 정적
      var next = segs[i + 1]; if (next && next.block !== s.block) hold += p.gap * 0.6; // 문장 사이 호흡
      cur += Math.round(hold);
    });
    var total = cur + (c.pauseAfter || 0) + 600;
    return { at: at, end: cur, total: c.duration || total };
  }
  // 카메라 동작 이름(image motion → motionSequence action)
  var CAM = { 'slow-zoom-in': 'slow-zoom-in', 'slow-zoom-out': 'slow-zoom-out', 'pan-left': 'pan-left', 'pan-right': 'pan-right', 'drift': 'drift', 'focus-pull': 'slow-zoom-in', 'pan-up': 'drift', 'pan-down': 'drift', 'parallax': 'drift' };
  // 관리자가 motionSequence 를 직접 쓰지 않았으면 프리셋·세그먼트에서 만든다. (절대 시각 ms, target: background | camera | overlay | text-N)
  function sequence(segs, c, tm) {
    tm = tm || timing(segs, c); var seq = [{ at: 0, target: 'background', action: 'fade-in', duration: 800 }];
    if (c.imageMotion && c.imageMotion !== 'none' && c.motionIntensity > 0 && CAM[c.imageMotion]) seq.push({ at: 300, target: 'camera', action: CAM[c.imageMotion], duration: Math.max(2000, tm.total - 300) });
    segs.forEach(function (s, i) {
      var act = s.emphasis === 'impact' ? 'impact' : s.animation === 'blur-in' ? 'blur-in' : 'fade-up';
      if (s.emphasis === 'impact') seq.push({ at: Math.max(0, tm.at[i] - 350), target: 'background', action: 'dim', duration: 700 });
      seq.push({ at: tm.at[i], target: 'text-' + (i + 1), action: act, duration: s.emphasis === 'impact' ? 450 : 600 });
    });
    return seq.sort(function (a, b) { return a.at - b.at; });
  }

  // ───────────── 장면 완성: 해석 + 분절 + 시간 ─────────────
  // scene: { text, cinema?, ... }  → { c, segments, timing, sequence }
  function build(scene, layers) {
    var c = resolve(scene, layers), cin = clean(scene && scene.cinema);
    var segs = cin.segments && cin.segments.length ? cin.segments : splitSegments((scene && (scene.text || scene.body)) || '', { animation: c.textAnimation === 'cinematic-title' || c.textAnimation === 'impact' ? undefined : c.textAnimation });
    if (c.textAnimation === 'cinematic-title') segs.forEach(function (s) { if (s.emphasis === 'impact') s.animation = 'cinematic-title'; });
    var tm = timing(segs, c);
    return { c: c, segments: segs, timing: tm, sequence: cin.motionSequence && cin.motionSequence.length ? cin.motionSequence : sequence(segs, c, tm) };
  }

  // 강도 규칙 적용: 3 은 챕터당 최대 2회, 4 는 전체에서 1회. 넘치는 장면은 2 로 내린다. scenes: 한 챕터의 장면 배열(제자리 수정)
  function limitIntensity(scenes, state) {
    state = state || { four: 0 }; var three = 0;
    (scenes || []).forEach(function (s) {
      var cin = s && s.cinema; if (!cin || cin.motionIntensity == null) return;
      if (cin.motionIntensity >= 4) { if (state.four >= MAX_INTENSITY4_PER_REPORT) cin.motionIntensity = 3; else state.four++; }
      if (cin.motionIntensity === 3) { if (three >= MAX_INTENSITY3_PER_CHAPTER) cin.motionIntensity = 2; else three++; }
    });
    return state;
  }
  // 특수 전환은 ACT 전환·turning point 에서만. 그 밖의 장면은 fade/crossfade/hard-cut 으로 내린다.
  function limitTransition(c, isActChange) {
    if (!has(SPECIAL_TRANSITIONS, c.transition)) return c.transition;
    if (isActChange || c.sceneType === 'TURNING_POINT' || c.sceneType === 'CLIMAX' || c.sceneType === 'INTRO' || c.sceneType === 'ENDING') return c.transition;
    return 'crossfade';
  }

  function validate(scene) {
    var p = [], c = scene && scene.cinema; if (!c) return p;
    var k = clean(c);
    Object.keys(c).forEach(function (key) { if (!(key in k) && !/^(auto|segments|motionSequence)$/.test(key)) p.push('cinema.' + key + ' 값이 허용 범위 밖이라 무시됩니다'); });
    (k.segments || []).forEach(function (s, i) { var l = len(s.text); if (l > 22) p.push('segments[' + i + '] 한 장면 한 조각이 너무 깁니다(' + l + '자)'); });
    return p;
  }

  R.Cinema = { SCENE_TYPES: SCENE_TYPES, TEXT_ANIMS: TEXT_ANIMS, IMAGE_MOTIONS: IMAGE_MOTIONS, TRANSITIONS: TRANSITIONS, SPECIAL_TRANSITIONS: SPECIAL_TRANSITIONS, PACING: PACING, EMPHASIS: EMPHASIS, POSITIONS: POSITIONS, SIZES: SIZES, BGM: BGM, MOODS: MOODS,
    PRESETS: PRESETS, PRESET_NAMES: PRESET_NAMES, TYPE_PRESET: TYPE_PRESET, LEGACY: LEGACY, BUILTIN: BUILTIN, INTENSITY_SCALE: INTENSITY_SCALE, PACE: PACE, MOTION_ACTIONS: MOTION_ACTIONS,
    clean: clean, resolve: resolve, splitSegments: splitSegments, phrases: phrases, timing: timing, sequence: sequence, build: build, limitIntensity: limitIntensity, limitTransition: limitTransition, validate: validate };
})(typeof window !== 'undefined' ? window : globalThis);
