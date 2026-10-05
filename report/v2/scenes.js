// Media Scene Library — 태그 taxonomy · Scene Intent · 점수 매칭(DB검색+Rule Scoring, AI는 후보 안에서만 선택) · Scene 시퀀스 · 커버리지.
// 사용자별 이미지/영상을 생성하지 않는다. 관리자가 올린 asset 의 id 만 선택하며, 모든 가중치는 CONFIG 로 분리돼 관리자에서 조정 가능하다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};

  var TAX = {
    element: ['wood', 'fire', 'earth', 'metal', 'water'],
    state: ['growth', 'opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense', 'recovery', 'conflict', 'isolation', 'connection', 'stability'],
    emotion: ['calm', 'mysterious', 'powerful', 'hopeful', 'lonely', 'tense', 'warm', 'cold', 'romantic', 'energetic', 'contemplative'],
    scene: ['forest', 'mountain', 'ocean', 'river', 'lake', 'field', 'road', 'city', 'nightCity', 'library', 'bookstore', 'museum', 'gallery', 'workspace', 'temple', 'sunrise', 'sunset', 'rain', 'snow', 'mist', 'cloud', 'stars'],
    theme: ['identity', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'relationship', 'family', 'pastLife', 'daewoon', 'sewoon', 'monthly', 'remedy', 'action'],
    action: ['walking', 'running', 'working', 'studying', 'creating', 'thinking', 'meeting', 'traveling', 'climbing', 'fighting', 'resting', 'meditating', 'lookingForward', 'lookingBack'],
    role: ['hero', 'background', 'support', 'transition', 'divider', 'atmosphere', 'ending'],
    type: ['image', 'video', 'videoLoop', 'backgroundVideo', 'character', 'symbol', 'transition', 'chapterCover'],
  };
  var VIDEO_TYPES = ['video', 'videoLoop', 'backgroundVideo', 'transition'];

  // 점수 가중치(요구서 기준값). 관리자 저장본으로 덮어쓸 수 있다.
  var CONFIG = { w: { element: 20, state: 25, theme: 25, emotion: 10, action: 10, chapter: 10, scene: 6, role: 5, typePref: 8 }, priorityDiv: 10,
    sameTypeRun: -14, // 직전 장면과 같은 미디어 타입이면 감점(media diversity)
    repeatInReport: -1000, // 같은 리포트 안 재사용은 사실상 제외(후보가 그것뿐이면 마지막 수단으로 허용)
    adjacentChapter: -25, sameChapter: -2000, candidates: 20, exempt: ['guardian', 'brand', 'ui'] };

  // 레거시/임의 태그 → taxonomy 분류 (기존 imageTags: 'wood','growth','forest' 같은 단어 호환)
  var ALIAS = { wealth_: 'wealth', study: 'theme:identity', leadership: 'theme:success', balance: 'state:stability', creation: 'action:creating', travel: 'action:traveling', harvest_: 'harvest' };
  function classify(tags) {
    var o = { element: [], state: [], emotion: [], scene: [], theme: [], action: [], role: [] };
    (tags || []).forEach(function (t) {
      var hit = false;
      Object.keys(o).forEach(function (k) { if (TAX[k].indexOf(t) >= 0) { if (o[k].indexOf(t) < 0) o[k].push(t); hit = true; } });
      if (!hit && ALIAS[t]) { var p = ALIAS[t].split(':'); if (p.length === 2 && o[p[0]].indexOf(p[1]) < 0) o[p[0]].push(p[1]); }
    });
    return o;
  }
  // 관리자 저장 형식(elementTags 등)과 단일 tags 배열을 모두 받아 표준화
  function normalize(a) {
    var c = classify(a.tags || []), g = function (k, f) { return (a[f] && a[f].length ? a[f] : c[k]).slice(); };
    return { id: a.id, type: a.type || 'image', url: a.url || '', webmUrl: a.webmUrl || '', thumbnailUrl: a.thumbnailUrl || '', posterUrl: a.posterUrl || '', title: a.title || '', description: a.description || '',
      elements: g('element', 'elementTags'), states: g('state', 'stateTags'), emotions: g('emotion', 'emotionTags'), scenes: g('scene', 'sceneTags'), themes: g('theme', 'themeTags'),
      chapters: (a.chapterTags || []).slice(), actions: g('action', 'actionTags'), roles: g('role', 'visualRoles').concat(a.visualRole && a.visualRole.length ? [].concat(a.visualRole) : []),
      orientation: a.orientation || 'portrait', duration: a.duration || 0, loopable: !!a.loopable, priority: +a.priority || 0, enabled: a.enabled !== false, tagsApproved: a.tagsApproved !== false };
  }
  var inter = function (a, b) { return (a || []).filter(function (x) { return (b || []).indexOf(x) >= 0; }); };

  // Scene Intent → 후보 점수. 이유(breakdown)를 함께 돌려 DEBUG 에서 "왜 선택됐는지" 보여준다.
  function score(a, intent, ctx, cfg) {
    var w = cfg.w, b = [], s = 0;
    var add = function (label, v) { if (v) { b.push({ label: label, v: v }); s += v; } };
    if (inter(a.elements, intent.desiredElements).length) add('element', w.element);
    if (inter(a.states, intent.desiredStates).length) add('state', w.state);
    if (inter(a.themes, intent.desiredThemes).length) add('theme', w.theme);
    if (inter(a.emotions, intent.desiredEmotion).length) add('emotion', w.emotion);
    if (inter(a.actions, intent.desiredActions).length) add('action', w.action);
    if (inter(a.scenes, intent.desiredScenes).length) add('scene', w.scene);
    if (a.chapters.length && a.chapters.indexOf(intent.chapterKey) >= 0) add('chapter', w.chapter);
    if (intent.visualRole && a.roles.indexOf(intent.visualRole) >= 0) add('role', w.role);
    if (intent.preferredMediaType && intent.preferredMediaType.indexOf(a.type) >= 0) add('type', w.typePref - 2 * intent.preferredMediaType.indexOf(a.type));
    if (!b.length) return null; // 어떤 의미도 겹치지 않으면 후보가 아님
    add('priority', Math.round(a.priority / cfg.priorityDiv));
    if (ctx.avoidType && a.type === ctx.avoidType) add('variety', cfg.sameTypeRun);
    var exempt = (a.themes || []).concat(a.roles).some(function (t) { return cfg.exempt.indexOf(t) >= 0; });
    if (!exempt) {
      if (ctx.usedIds.indexOf(a.id) >= 0) add('repeat', cfg.repeatInReport);
      if (ctx.sameChapter && ctx.sameChapter.indexOf(a.id) >= 0) add('sameChapter', cfg.sameChapter);
      if (ctx.prevChapter && ctx.prevChapter.indexOf(a.id) >= 0) add('adjacent', cfg.adjacentChapter);
    }
    return { asset: a, score: s, breakdown: b };
  }
  function search(assets, intent, ctx, cfg) {
    cfg = cfg || CONFIG; ctx = ctx || { usedIds: [] };
    var out = [];
    (assets || []).forEach(function (x) {
      var a = x.elements ? x : normalize(x);
      if (!a.enabled || !a.tagsApproved || !a.url && !a.posterUrl) return; // 승인 안 된 AI 추천 태그는 조합에 쓰지 않는다
      var r = score(a, intent, ctx, cfg); if (r) out.push(r);
    });
    out.sort(function (p, q) { return q.score - p.score || (p.asset.id < q.asset.id ? -1 : 1); });
    return out.slice(0, cfg.candidates);
  }
  // 최종 선택: 규칙 1위. aiAssetId 가 후보 목록 안에 있을 때만 AI 선택을 존중한다(없는 id·임의 URL 은 무시).
  function choose(cands, aiAssetId) {
    if (!cands.length) return null;
    var ai = aiAssetId && cands.filter(function (c) { return c.asset.id === aiAssetId && c.score > 0; })[0];
    var top = cands.filter(function (c) { return c.score > 0; });
    return ai || top[0] || null;
  }

  /* Scene Type 별 기본 규칙: 영상은 인트로·핵심에만, 상세는 이미지, 데이터는 HTML/CSS. */
  var SCENE_RULES = {
    chapterIntro: { media: true, types: ['video', 'chapterCover', 'backgroundVideo', 'image'], role: 'hero', effect: ['slowZoom', 'low'] },
    insight: { media: true, types: ['image', 'video', 'character'], role: 'hero', effect: ['fade', 'low'] },
    explanation: { media: true, types: ['image', 'symbol'], role: 'support', effect: ['parallax', 'low'] },
    visualMetaphor: { media: true, types: ['image', 'videoLoop', 'symbol'], role: 'atmosphere', effect: ['mist', 'low'] },
    dataVisualization: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    timeline: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    recommendation: { media: true, types: ['image', 'symbol'], role: 'support', effect: ['fade', 'low'] },
    warning: { media: true, types: ['image', 'videoLoop'], role: 'atmosphere', effect: ['mist', 'low'] },
    action: { media: true, types: ['videoLoop', 'image'], role: 'support', effect: ['glow', 'low'] },
    transition: { media: true, types: ['transition', 'video', 'backgroundVideo'], role: 'transition', effect: ['mist', 'medium'] },
    chapterEnding: { media: true, types: ['image', 'videoLoop'], role: 'ending', effect: ['fade', 'low'] },
  };
  var SEASON_STATE = { opportunity: ['opportunity', 'expansion'], expansion: ['expansion', 'growth'], harvest: ['harvest', 'stability'], accumulation: ['accumulation', 'growth'], transition: ['transition', 'isolation'], defense: ['defense', 'recovery'] };
  var SEASON_EMO = { opportunity: ['hopeful', 'energetic'], expansion: ['powerful', 'hopeful'], harvest: ['warm', 'calm'], accumulation: ['calm', 'contemplative'], transition: ['mysterious', 'contemplative'], defense: ['calm', 'cold'] };
  var SEASON_ACT = { opportunity: ['meeting', 'lookingForward'], expansion: ['working', 'walking'], harvest: ['resting', 'lookingBack'], accumulation: ['studying', 'thinking'], transition: ['thinking', 'lookingForward'], defense: ['resting', 'meditating'] };
  var KIND_THEME = { c01: 'identity', c02: 'identity', c03: 'personality', c04: 'talent', c05: 'shadow', c06: 'career', c07: 'success', c08: 'wealth', c09: 'love', c10: 'marriage', c11: 'relationship', c12: 'relationship', c13: 'family', c14: 'pastLife', c15: 'daewoon', c16: 'daewoon', c17: 'sewoon', c18: 'monthly', c19: 'remedy', c20: 'action' };

  // Scene Intent: 챕터 핵심 메시지 + 사주 사실 → "원하는 장면"의 의미 구조.
  function intent(ch, sd, lead, sceneType, season) {
    var rule = SCENE_RULES[sceneType], cl = classify(lead && lead.imageTags || []), el = sd.dayMaster.el;
    var elMap = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
    var elements = cl.element.length ? cl.element : [elMap[el]];
    if (sd.usefulElements && /remedy|summary/.test(ch.kind)) elements = [elMap[sd.usefulElements.yong]].concat(elements);
    var s = season || (sd.sewoon && sd.sewoon.season) || 'accumulation';
    return { chapter: ch.id, chapterKey: KIND_THEME[ch.base || ch.id] || ch.id, sceneType: sceneType,
      message: lead && (lead.headline || ''), desiredElements: elements.slice(0, 2), desiredStates: cl.state.concat(SEASON_STATE[s] || []).slice(0, 4),
      desiredThemes: [KIND_THEME[ch.base || ch.id]].filter(Boolean).concat(cl.theme), desiredEmotion: SEASON_EMO[s] || [], desiredActions: SEASON_ACT[s] || [], desiredScenes: cl.scene,
      preferredMediaType: rule.types, visualRole: rule.role };
  }

  var EFFECT_PARTICLE = { wood: 'leaf', fire: 'ember', earth: 'dust', metal: 'spark', water: 'mist' };
  function effectOf(sceneType, intentObj) {
    var e = SCENE_RULES[sceneType].effect, p = EFFECT_PARTICLE[(intentObj.desiredElements || [])[0]];
    return { type: e[0], intensity: e[1], particle: p || null }; // 프론트에서 prefers-reduced-motion 이면 무시
  }

  // 챕터 구조 → Scene 배열. 장면 종류 순서가 단조롭지 않게(연속 같은 media 타입 방지) 구성한다.
  function planScenes(c) {
    var p = ['chapterIntro'];
    if (c.interpretation) p.push('insight');
    if (c.items && c.kind === 'daewoon') p.push('timeline'); else if (c.items) p.push('dataVisualization');
    if (c.meaning || (c.details && c.details.length)) p.push('explanation');
    if (c.kind === 'remedy') p.push('recommendation');
    else if (c.extra && (c.extra.fields || c.extra.earn || c.extra.attract || c.extra.expect || c.extra.style || c.extra.steps)) p.push('recommendation');
    if ((c.base || c.id) === 'c05' || (c.extra && c.extra.caution)) p.push('warning');
    if (c.action && c.action.length || c.plan) p.push('action');
    p.push('chapterEnding');
    return p;
  }
  function bullets(c) {
    var x = c.extra || {}, b = [], L = function (t, a) { if (a && a.length) b.push({ label: t, items: [].concat(a) }); };
    L('추천 환경', x.env); L('추천 역할', x.roles); L('잘 맞는 분야', x.fields); L('주의', x.caution);
    L('돈을 버는 방식', x.earn); L('돈을 지키는 방식', x.keep); L('소비 성향', x.spend); L('투자·사업 성향', x.invest); L('재투자 성향', x.reinvest); L('위험 요소', x.risk);
    L('끌리는 사람', x.attract); L('사랑 표현', x.express); L('갈등 패턴', x.conflict); L('필요한 것', x.need);
    L('배우자에게 기대하는 것', x.expect); L('장기 관계 패턴', x.longterm); L('잘 맞는 방식', x.fit);
    L('사람을 대하는 방식', x.style); L('협업 방식', x.collab); L('친밀 관계', x.close); L('사회 관계', x.social);
    L('성공 단계', x.steps);
    return b;
  }

  // 한 챕터의 Scene 들. ctx 는 리포트 전체에서 공유(usedIds·prevChapter).
  function buildChapterScenes(c, sd, assets, ctx, cfg) {
    cfg = cfg || CONFIG; var types = planScenes(c), scenes = [], lastMedia = ctx.lastType || null, sameCh = [];
    var season = c.kind === 'monthly' ? null : (c.kind === 'daewoon' || c.kind === 'current') && sd.currentDaewoon ? sd.currentDaewoon.season : (sd.sewoon && sd.sewoon.season);
    types.forEach(function (st, i) {
      var rule = SCENE_RULES[st], it = intent(c, sd, c.lead, st, season), sc = { chapterId: c.id, sceneId: c.id + '_' + ('0' + (i + 1)).slice(-2), sceneType: st, headline: '', body: '', detail: '', bullets: null, media: null, effect: effectOf(st, it), intent: it, candidates: [] };
      if (st === 'chapterIntro') { sc.headline = c.title; sc.body = c.headline; sc.subtitle = c.subtitle; sc.kicker = 'ACT ' + c.act + ' · ' + String(c.no).padStart(2, '0') + ' / 20'; }
      else if (st === 'insight') { sc.headline = c.headline; sc.body = c.interpretation; sc.fact = c.fact; }
      else if (st === 'explanation') { sc.headline = '의미'; sc.body = c.meaning; sc.detail = (c.details || []).map(function (d) { return d.headline + ' — ' + d.summary; }).join('\n'); }
      else if (st === 'recommendation') { sc.headline = c.kind === 'remedy' ? '추천 개운법' : '구체적으로는'; sc.bullets = c.kind === 'remedy' ? null : bullets(c); }
      else if (st === 'warning') { sc.headline = '조심할 점'; sc.body = (c.extra && c.extra.caution && c.extra.caution[0]) || c.meaning; }
      else if (st === 'action') { sc.headline = '지금 할 수 있는 행동'; sc.bullets = [{ label: 'ACTION', items: c.action || [] }]; }
      else if (st === 'chapterEnding') { sc.headline = c.headline; sc.body = ''; }
      else if (st === 'dataVisualization' || st === 'timeline') { sc.headline = c.title; sc.data = c.items; }
      // 같은 종류가 연속되지 않게: 직전 장면과 같은 media type 이면 다른 타입을 우선
      if (rule.media && !(st === 'chapterEnding' && !c.interpretation)) {
        var pref = lastMedia ? rule.types.filter(function (t) { return t !== lastMedia; }).concat(rule.types.filter(function (t) { return t === lastMedia; })) : rule.types;
        it.preferredMediaType = pref;
        var cands = search(assets, it, { usedIds: ctx.usedIds, prevChapter: ctx.prevChapter, sameChapter: sameCh, avoidType: lastMedia }, cfg);
        sc.candidates = cands.map(function (x) { return { assetId: x.asset.id, score: x.score, breakdown: x.breakdown }; });
        var pickd = choose(cands, null);
        if (pickd) {
          var a = pickd.asset; sc.media = { assetId: a.id, type: a.type, url: a.url, webmUrl: a.webmUrl, posterUrl: a.posterUrl || a.thumbnailUrl, loop: a.loopable || a.type === 'videoLoop', muted: true, score: pickd.score, why: pickd.breakdown };
          ctx.usedIds.push(a.id); sameCh.push(a.id); lastMedia = a.type;
        } else lastMedia = null;
      }
      scenes.push(sc);
    });
    ctx.prevChapter = sameCh.slice(); ctx.lastType = lastMedia;
    return scenes;
  }

  // ACT 사이 전환 장면(웹 애니메이션 + 있으면 transition 미디어)
  function actTransition(act, sd, assets, ctx, cfg) {
    var it = { chapter: 'act' + act.id, chapterKey: 'act', sceneType: 'transition', message: act.line, desiredElements: [], desiredStates: ['transition'], desiredThemes: [], desiredEmotion: ['mysterious', 'contemplative'], desiredActions: [], desiredScenes: ['mist', 'stars'], preferredMediaType: SCENE_RULES.transition.types, visualRole: 'transition' };
    var cands = search(assets, it, { usedIds: ctx.usedIds, sameChapter: [] }, cfg || CONFIG), p = choose(cands, null);
    if (p) ctx.usedIds.push(p.asset.id);
    return { chapterId: 'act' + act.id, sceneId: 'act' + act.id + '_transition', sceneType: 'transition', kicker: act.roman, headline: act.title, body: act.line, duration: 2800, effect: { type: 'actTransition', intensity: 'medium' },
      media: p ? { assetId: p.asset.id, type: p.asset.type, url: p.asset.url, posterUrl: p.asset.posterUrl, muted: true, why: p.breakdown } : null, candidates: cands.map(function (x) { return { assetId: x.asset.id, score: x.score }; }) };
  }

  // 커버리지: 태그별 보유 수와 부족 경고(최소 권장 수는 설정값)
  var MIN = { element: 10, state: 12, theme: 10 };
  function coverage(assets, min) {
    min = min || MIN; var n = (assets || []).filter(function (a) { return a.enabled !== false; }).map(function (a) { return a.elements ? a : normalize(a); }), out = { total: n.length, byType: {}, element: {}, state: {}, theme: {}, emotion: {}, warnings: [] };
    n.forEach(function (a) { out.byType[a.type] = (out.byType[a.type] || 0) + 1; });
    [['element', 'elements'], ['state', 'states'], ['theme', 'themes'], ['emotion', 'emotions']].forEach(function (p) {
      TAX[p[0]].forEach(function (t) { out[p[0]][t] = n.filter(function (a) { return a[p[1]].indexOf(t) >= 0; }).length; });
      if (min[p[0]]) TAX[p[0]].forEach(function (t) { if (out[p[0]][t] < min[p[0]]) out.warnings.push({ kind: p[0], tag: t, have: out[p[0]][t], recommended: min[p[0]] }); });
    });
    return out;
  }

  // 관리자 저장 가중치 적용(없는 값은 기본 유지)
  function configure(sc) { if (!sc) return CONFIG; if (sc.w) for (var k in sc.w) CONFIG.w[k] = +sc.w[k]; ['priorityDiv', 'adjacentChapter', 'sameTypeRun'].forEach(function (k) { if (typeof sc[k] === 'number') CONFIG[k] = sc[k]; }); return CONFIG; }

  R.Scenes = { configure: configure, TAX: TAX, CONFIG: CONFIG, SCENE_RULES: SCENE_RULES, VIDEO_TYPES: VIDEO_TYPES, classify: classify, normalize: normalize, search: search, choose: choose, intent: intent, planScenes: planScenes,
    buildChapterScenes: buildChapterScenes, actTransition: actTransition, coverage: coverage };
})(typeof window !== 'undefined' ? window : globalThis);
