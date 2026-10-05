// Director — SCENE DIRECTOR / MEDIA SELECTOR / MOTION DIRECTOR 층(규칙 기반 기본 감독).
//   입력  : factualBasis(내부 사실) · chapter · narration(이미 쓰인 문장) · media 후보 · previousScene · nextScene
//   출력  : { sceneType, narrativePurpose, visualConcept, mediaTags, textSegments, mood, pacing, motionIntensity, imageMotion, transition, duration, textPosition, overlayStrength, ... }
// 명리 계산·수정은 하지 않는다. 관리자의 "AI 연출 추천" 버튼(/api/direct)은 같은 입력을 AI 에게 보내고, 돌아온 값을 Cinema.clean 으로 걸러 이 규칙 결과 위에 얹는다.
// 우선순위(낮음→높음): 내장 기본값 < 프리셋 < 감독(cinemaAuto) < 기본 연출(cinemaDefaults[sceneType]) < 클립 개별 연출(asset.cinema) < 장면 지정(scene.cinema)
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var K = function () { return R.Cinema; };

  // 기존 장면 종류 → 감독 기본 결정 (스펙 §17: 설명=거의 정적, 감정=slow zoom, 갈등=조금 빠름, 전환점=camera push, 경고=정적, 엔딩=slow zoom out)
  var BY_LEGACY = {
    chapterIntro: { preset: 'QUIET_REFLECTION', purpose: '이 챕터가 묻는 질문을 먼저 던진다', concept: '질문 앞에 선 인물', mood: 'reflective' },
    insight: { preset: 'REALITY_CHECK', purpose: '계산된 사실을 현실의 한 문장으로 번역한다', concept: '일상 속 인물의 한 순간', mood: 'calm', pacing: 'MEDIUM', motionIntensity: 1, imageMotion: 'slow-zoom-in' },
    explanation: { preset: 'REALITY_CHECK', purpose: '의미를 풀어 설명한다(핵심은 하나)', concept: '조용한 배경', mood: 'calm' },
    chart: { preset: 'REALITY_CHECK', purpose: '만세력이 읽은 값을 데이터로 보여 준다', concept: '데이터 모션 그래픽', mood: 'calm', motionIntensity: 0, imageMotion: 'none' },
    dataVisualization: { preset: 'TIMELINE', purpose: '달마다 달라지는 흐름을 보여 준다', concept: '12개월 타임라인', mood: 'reflective' },
    timeline: { preset: 'TIMELINE', purpose: '시간축 위에 대운의 계절을 놓는다', concept: '시간이 흐르는 길', mood: 'reflective' },
    recommendation: { preset: 'OPPORTUNITY', purpose: '다음 장면을 바꾸는 구체적인 선택지를 보여 준다', concept: '열리는 문', mood: 'hopeful' },
    warning: { preset: 'WARNING', purpose: '같은 자리에서 반복되는 위험 신호를 조용히 짚는다', concept: '멈춰 선 인물', mood: 'tense' },
    action: { preset: 'OPPORTUNITY', purpose: '지금 할 수 있는 행동을 장면으로 정리한다', concept: '첫 걸음', mood: 'hopeful' },
    chapterEnding: { preset: 'QUIET_REFLECTION', purpose: '다음 장면이 궁금해지게 닫는다', concept: '여운', mood: 'reflective', pacing: 'SLOW' },
    verdictFind: { preset: 'DISCOVERY', purpose: '주인공의 가장 큰 동력을 알아본다', concept: '발견', mood: 'awe' },
    verdictBlock: { preset: 'TENSION', purpose: '그 동력이 다 쓰이지 못하는 이유를 짚는다', concept: '막힌 길', mood: 'tense' },
    verdictEvidence: { preset: 'EMOTIONAL', purpose: '시간축 위의 한 지점에 비춰 본다', concept: '회상', mood: 'lonely' },
    verdictAdvice: { preset: 'OPPORTUNITY', purpose: '다음 장면을 위한 두 걸음', concept: '길 위의 첫 발', mood: 'hopeful' },
  };
  // 챕터(base)별 특별 규칙
  var BY_CHAPTER = {
    c14: { insight: { preset: 'EMOTIONAL', purpose: '회상 장면처럼 오래된 뿌리를 비춘다', mood: 'lonely' } },
    c16: { insight: { preset: 'TURNING_POINT', purpose: '지금이 이야기의 어느 지점인지 알려 준다', mood: 'powerful' } },
    c17: { insight: { preset: 'DISCOVERY', purpose: '올해 배경이 어떻게 바뀌는지 보여 준다' } },
    c20: { action: { preset: 'OPPORTUNITY', purpose: '엔딩 전에 지금 할 일을 정리한다' } },
  };
  var ELEMENT_OF = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };

  // 한 장면의 감독 결정. ctx: { chapter, prev, next, sd, basis }
  function direct(scene, ctx) {
    ctx = ctx || {}; var Kc = K(), ch = ctx.chapter || {}, base = ch.base || ch.id || '', st = scene.sceneType;
    var rule = Object.assign({}, BY_LEGACY[st] || {}, (BY_CHAPTER[base] || {})[st] || {});
    var out = { sceneType: Kc.PRESETS[rule.preset] ? Kc.PRESETS[rule.preset].sceneType : (Kc.LEGACY[st] || 'EXPLANATION'), preset: rule.preset || null, narrativePurpose: rule.purpose || '', visualConcept: rule.concept || '', mood: rule.mood };
    ['pacing', 'motionIntensity', 'imageMotion', 'transition', 'textPosition', 'overlayStrength'].forEach(function (k) { if (rule[k] != null) out[k] = rule[k]; });
    // 리듬: 같은 종류가 3번 연속이면 박자를 바꾼다(단조 방지)
    if (ctx.prev && ctx.prev2 && ctx.prev.dirType === out.sceneType && ctx.prev2.dirType === out.sceneType) out.pacing = out.pacing === 'SLOW' ? 'MEDIUM' : 'SLOW';
    // 다음이 전환점이면 직전 장면 끝에 정적을 둔다
    if (ctx.next && /TURNING_POINT|CLIMAX/.test(ctx.next.dirType || '')) out.pauseAfter = Math.max(out.pauseAfter || 0, 700);
    // 이미지가 없으면 카메라는 의미가 없다
    if (!scene.media && st !== 'chapterIntro') { out.imageMotion = 'none'; }
    // 오행 색감은 미디어 태그에 반영
    var el = ctx.sd && ctx.sd.dayMaster && ELEMENT_OF[ctx.sd.dayMaster.el];
    out.mediaTags = el ? [el] : [];
    return out;
  }

  // 챕터 전체를 감독한다(제자리 수정): 오프닝·현실 장면 삽입, 각 장면에 cinemaAuto 부여, 강도 제한, 다음 챕터 예고.
  //  o: { media (자산 목록), ctx (Scenes ctx), vars (heroVars), state ({four:0}), enabled }
  function apply(ch, sd, o) {
    o = o || {}; var Kc = K(), T = R.Translator, base = ch.base || ch.id, scenes = ch.scenes || [], out = [], prevD = null, prev2D = null;
    // 1) 현실 장면(DAILY_LIFE) — 설명 뒤에 끼워 넣는다
    var life = T ? T.chapterScenes(base, sd, o.vars) : [];
    life.forEach(function (l, i) { l.chapterId = ch.id; l.sceneId = ch.id + '_life' + (i + 1); l.media = pickMedia(l, o.media, o.ctx, ch.id); });
    var inserted = false;
    scenes.forEach(function (s, i) {
      out.push(s);
      if (!inserted && life.length && s.sceneType === 'insight') { life.forEach(function (l) { out.push(l); }); inserted = true; }
    });
    if (!inserted && life.length) { var at = Math.max(1, out.length - 1); life.forEach(function (l, j) { out.splice(at + j, 0, l); }); }
    // 2) 챕터 오프닝(검은 화면 + 질문 한 줄) — 맨 앞
    var hook = T && T.chapterHook(base, ch.no);
    if (hook) {
      var seg = [{ text: hook.line, emphasis: 'impact', animation: 'fade-up', block: 0 }];
      out.unshift({ chapterId: ch.id, sceneId: ch.id + '_open', sceneType: 'cinema', kind: 'opener', bg: 'black', hook: hook, media: null, cinema: { preset: 'QUIET_REFLECTION', segments: seg, pacing: 'SLOW', motionIntensity: 0, imageMotion: 'none', overlayStrength: 1, textPosition: 'center', textSize: 'L', pauseAfter: 600 } });
    }
    // 3) 감독
    out.forEach(function (s, i) {
      if (s.kind === 'script' || s.kind === 'opener') { s.dirType = (s.cinema && Kc.PRESETS[s.cinema.preset] || {}).sceneType || 'DAILY_LIFE'; if (s.kind === 'script') s.cinemaAuto = { sceneType: s.dirType, preset: s.cinema.preset }; prev2D = prevD; prevD = s; return; }
      var nx = out[i + 1], d = direct(s, { chapter: ch, prev: prevD, prev2: prev2D, next: nx && { dirType: nx.dirType || (Kc.LEGACY[nx.sceneType] || '') }, sd: sd });
      s.dirType = d.sceneType; s.cinemaAuto = Kc.clean(d); s.cinemaAuto.narrativePurpose = d.narrativePurpose; s.cinemaAuto.visualConcept = d.visualConcept;
      prev2D = prevD; prevD = s;
    });
    // 4) 강도 규칙(3 은 챕터당 최대 2회, 4 는 전체 1회) — 해석된 최종 값 기준으로 낮춘다
    var three = 0;
    out.forEach(function (s) {
      var r = Kc.resolve(s, [s.cinemaAuto]); if (r.motionIntensity >= 4) { if ((o.state = o.state || { four: 0 }).four >= 1) s.cinemaAuto.motionIntensity = 3; else o.state.four++; r = Kc.resolve(s, [s.cinemaAuto]); }
      if (r.motionIntensity === 3) { if (three >= 2) s.cinemaAuto.motionIntensity = 2; else three++; }
    });
    ch.scenes = out; return ch;
  }
  // 다음 챕터 예고(NEXT HOOK): 챕터 끝 장면에 다음 질문을 붙인다
  function linkNext(chapters) {
    var T = R.Translator; if (!T) return;
    chapters.forEach(function (c, i) {
      var n = chapters[i + 1], h = n && T.chapterHook(n.base || n.id, n.no); if (!h) return;
      (c.scenes || []).forEach(function (s) { if (s.sceneType === 'chapterEnding') s.nextHook = { label: h.label, line: h.line }; });
    });
  }

  // 미디어 선택: Scenes.search(규칙 점수) — 장면의 mediaIntent / cinema.mediaTags 로 의도를 만든다. 반환: scene.media 모양 또는 null
  function pickMedia(scene, assets, ctx, chapterId) {
    var S = R.Scenes; if (!S || !assets || !assets.length) return null; ctx = ctx || { usedIds: [] };
    var mi = scene.mediaIntent || {}, tags = (scene.cinema && scene.cinema.mediaTags) || [], cl = S.classify ? S.classify(tags) : { scene: [] };
    var it = { chapter: chapterId || '', chapterKey: '', sceneType: 'insight', desiredElements: mi.elements || [], desiredStates: mi.states || [], desiredThemes: mi.themes || [], desiredEmotion: mi.emotions || [], desiredActions: mi.actions || [],
      desiredScenes: (mi.scenes || []).concat(cl.scene || []), preferredMediaType: ['image', 'videoLoop', 'video', 'backgroundVideo'], visualRole: 'hero' };
    var found = S.search(assets, it, { usedIds: ctx.usedIds || [], prevChapter: ctx.prevChapter, sameChapter: [] });
    var top = found.filter(function (c) { return c.score > 0; })[0]; if (!top) return null;
    var a = top.asset; if (ctx.usedIds) ctx.usedIds.push(a.id);
    return { assetId: a.id, type: a.type, url: a.url, webmUrl: a.webmUrl, posterUrl: a.posterUrl || a.thumbnailUrl, loop: a.loopable || a.type === 'videoLoop', muted: true, score: top.score, cinema: a.cinema || null };
  }
  // 렌더에 쓸 층 배열 [감독, 기본 연출, 클립 연출]  (장면 자체 cinema 는 resolve 가 맨 위로 얹는다)
  function layersFor(scene, defaults) {
    var Kc = K(), r = []; r.push(scene.cinemaAuto || {});
    var type = (scene.cinemaAuto && scene.cinemaAuto.sceneType) || Kc.LEGACY[scene.sceneType];
    if (defaults && type && defaults[type]) r.push(defaults[type]);
    if (scene.media && scene.media.cinema) r.push(scene.media.cinema);
    return r;
  }
  // 관리자 "AI 연출 추천" 입력(서버로 보낼 값): 계산 사실이 아니라 이미 쓰인 문장과 메타만
  function aiInput(scene, ctx) {
    ctx = ctx || {}; return { chapter: { id: (ctx.chapter || {}).id, title: (ctx.chapter || {}).title }, narration: String(scene.body || scene.text || (scene.cinema && (scene.cinema.segments || []).map(function (g) { return g.text; }).join(' ')) || '').slice(0, 400),
      sceneType: scene.sceneType, media: scene.media ? { type: scene.media.type, tags: scene.media.tags || [] } : null, previous: ctx.prev && { sceneType: ctx.prev.sceneType }, next: ctx.next && { sceneType: ctx.next.sceneType } };
  }

  R.Director = { direct: direct, apply: apply, linkNext: linkNext, pickMedia: pickMedia, layersFor: layersFor, aiInput: aiInput, BY_LEGACY: BY_LEGACY, BY_CHAPTER: BY_CHAPTER };
})(typeof window !== 'undefined' ? window : globalThis);
