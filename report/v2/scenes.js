// Media Scene Library — 태그 taxonomy · Scene Intent · 점수 매칭(DB검색+Rule Scoring, AI는 후보 안에서만 선택) · Scene 시퀀스 · 커버리지.
// 사용자별 이미지/영상을 생성하지 않는다. 관리자가 올린 asset 의 id 만 선택하며, 모든 가중치는 CONFIG 로 분리돼 관리자에서 조정 가능하다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};

  var TAX = {
    element: ['wood', 'fire', 'earth', 'metal', 'water'],
    state: ['growth', 'opportunity', 'expansion', 'harvest', 'accumulation', 'transition', 'defense', 'recovery', 'conflict', 'isolation', 'connection', 'stability'],
    emotion: ['calm', 'mysterious', 'powerful', 'hopeful', 'lonely', 'tense', 'warm', 'cold', 'romantic', 'energetic', 'contemplative'],
    scene: ['forest', 'mountain', 'ocean', 'river', 'lake', 'field', 'road', 'city', 'nightCity', 'library', 'bookstore', 'museum', 'gallery', 'workspace', 'temple', 'sunrise', 'sunset', 'rain', 'snow', 'mist', 'cloud', 'stars', 'dawnCity', 'emptyOffice', 'commute', 'walkingAlone', 'meetingRoom', 'studio', 'desk', 'laptop', 'paymentAlert', 'card', 'trainStation', 'airport', 'crossroads', 'rainWindow', 'meadow', 'openDoor', 'stairs', 'tunnelLight', 'windyForest', 'sea', 'trip', 'exercise', 'gathering', 'farewell', 'newStart'],
    theme: ['identity', 'personality', 'talent', 'shadow', 'career', 'success', 'wealth', 'love', 'marriage', 'children', 'relationship', 'family', 'pastLife', 'daewoon', 'sewoon', 'monthly', 'remedy', 'action'],
    action: ['walking', 'running', 'working', 'studying', 'creating', 'thinking', 'meeting', 'traveling', 'climbing', 'fighting', 'resting', 'meditating', 'lookingForward', 'lookingBack'],
    role: ['hero', 'background', 'support', 'transition', 'divider', 'atmosphere', 'ending'],
    type: ['image', 'video', 'videoLoop', 'backgroundVideo', 'character', 'symbol', 'transition', 'chapterCover'],
  };
  var VIDEO_TYPES = ['video', 'videoLoop', 'backgroundVideo', 'transition'];

  // 점수 가중치(요구서 기준값). 관리자 저장본으로 덮어쓸 수 있다.
  var CONFIG = { w: { element: 20, state: 25, theme: 25, emotion: 10, action: 10, chapter: 10, scene: 6, role: 5, typePref: 8, chapterOnly: 15 }, priorityDiv: 10,
    sameTypeRun: -14, // 직전 장면과 같은 미디어 타입이면 감점(media diversity)
    repeatInReport: -1000, // 같은 리포트 안 재사용은 사실상 제외(후보가 그것뿐이면 마지막 수단으로 허용)
    adjacentChapter: -25, sameChapter: -2000, candidates: 20, exempt: ['brand', 'ui'] };

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
      orientation: a.orientation || 'portrait', duration: a.duration || 0, loopable: !!a.loopable, priority: +a.priority || 0, enabled: a.enabled !== false, tagsApproved: a.tagsApproved !== false, chapterIds: (a.chapterIds || []).slice(), cinema: a.cinema || null };
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
    if (a.chapterIds && a.chapterIds.length && a.chapterIds.indexOf(intent.chapter) >= 0) add('이 챕터 전용', w.chapterOnly); // 보관함에서 "이 챕터 전용"으로 올린 클립은 그 챕터에서 먼저 후보가 된다
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
      if (a.chapterIds && a.chapterIds.length && a.chapterIds.indexOf(intent.chapter) < 0) return; // 챕터 전용 클립은 다른 챕터의 후보가 아니다
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
    chart: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    verdictFind: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    verdictBlock: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    verdictEvidence: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    verdictAdvice: { media: false, types: [], role: 'support', effect: ['glow', 'low'] },
    timeline: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    topics: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    terms: { media: false, types: [], role: 'support', effect: ['fade', 'low'] },
    recommendation: { media: true, types: ['image', 'symbol'], role: 'support', effect: ['fade', 'low'] },
    warning: { media: true, types: ['image', 'videoLoop'], role: 'atmosphere', effect: ['mist', 'low'] },
    action: { media: true, types: ['videoLoop', 'image'], role: 'support', effect: ['glow', 'low'] },
    transition: { media: true, types: ['transition', 'video', 'backgroundVideo'], role: 'transition', effect: ['mist', 'medium'] },
    chapterEnding: { media: true, types: ['image', 'videoLoop'], role: 'ending', effect: ['fade', 'low'] },
  };
  var SEASON_STATE = { opportunity: ['opportunity', 'expansion'], expansion: ['expansion', 'growth'], harvest: ['harvest', 'stability'], accumulation: ['accumulation', 'growth'], transition: ['transition', 'isolation'], defense: ['defense', 'recovery'] };
  var SEASON_EMO = { opportunity: ['hopeful', 'energetic'], expansion: ['powerful', 'hopeful'], harvest: ['warm', 'calm'], accumulation: ['calm', 'contemplative'], transition: ['mysterious', 'contemplative'], defense: ['calm', 'cold'] };
  var SEASON_ACT = { opportunity: ['meeting', 'lookingForward'], expansion: ['working', 'walking'], harvest: ['resting', 'lookingBack'], accumulation: ['studying', 'thinking'], transition: ['thinking', 'lookingForward'], defense: ['resting', 'meditating'] };
  var KIND_THEME = { c00: 'identity', c01: 'identity', c02: 'identity', c03: 'personality', c04: 'talent', c05: 'shadow', c06: 'career', c07: 'success', c08: 'wealth', c09: 'love', c10: 'marriage', c11: 'relationship', c12: 'relationship', c13: 'family', c14: 'pastLife', c15: 'daewoon', c16: 'daewoon', c17: 'sewoon', c18: 'monthly', c19: 'remedy', c20: 'action' };

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
  // 챕터마다 "만세력이 읽은 값"을 그림으로 먼저 보여 주고, 그 값을 근거로 풀이한다
  var CHART_OF = { c01: 'pillars', c02: 'elements', c03: 'strength', c04: 'groups', c05: 'groups', c06: 'career', c07: 'yong', c08: 'groups', c09: 'spouse', c10: 'spouse', c11: 'groups', c12: 'yong', c13: 'pillars', c15: 'flow', c18: 'months' };
  function chartKind(c) { return CHART_OF[c.base || c.id] || null; }
  function planScenes(c) {
    if (c.verdict) return ['chapterIntro', 'verdictFind', 'verdictBlock'].concat(c.verdict.evidence ? ['verdictEvidence'] : [], ['verdictAdvice', 'chapterEnding']); // 총평: 발견 → 막힘 → 증거 → 조언
    var p = ['chapterIntro'];
    if (chartKind(c)) p.push('chart'); // 근거: 계산된 값을 그림으로(원국·오행·십성군·신강약·용신·직업 분야)
    if (c.interpretation) p.push('insight'); // 풀이
    if (c.items && c.kind === 'daewoon') p.push('timeline'); else if (c.items) p.push('dataVisualization');
    if (c.topics && c.topics.length) p.push('topics'); // 흥미 카테고리 카드
    if (c.meaning || (c.details && c.details.length)) p.push('explanation');
    if (c.terms && c.terms.length) p.push('terms'); // 현실 공감 → 의미 → 명리 용어 쉬운 풀이
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
      else if (st === 'warning') { // 조심할 점: 근거 있는 주의 목록 + 이렇게 대응해 보세요(모듈 팁·추천 행동, 3개 이상 목표)
        var caut = (c.extra && c.extra.caution) || [], det = (c.details || []).filter(function (d) { return !/_fallback$/.test(d.id || ''); }), shadow = caut.length ? caut : det.map(function (d) { return d.headline + (d.summary ? ' — ' + d.summary : ''); });
        var tips = [c.meaning].concat(det.map(function (d) { return d.detail; })).concat(c.action || []).concat(c.actionPool || []).filter(function (t, i, a) { return t && a.indexOf(t) === i; }).slice(0, 5);
        sc.headline = '조심할 점'; sc.body = c.meaning; sc.bullets = [{ label: '조심할 점', items: shadow.length ? shadow : [c.interpretation].filter(Boolean) }, { label: '이렇게 대응해 보세요', items: tips }];
      }
      else if (st === 'action') { sc.headline = '지금 할 수 있는 행동'; sc.bullets = [{ label: 'ACTION', items: c.action || [], notes: c.actionNotes || [] }]; }
      else if (st === 'chapterEnding') { sc.headline = c.headline; sc.body = ''; }
      else if (st === 'verdictFind') { sc.headline = '타고난 동력'; sc.body = c.verdict.discover; sc.verdict = c.verdict.potential; }
      else if (st === 'verdictBlock') { sc.headline = c.verdict.blocked.label; sc.body = c.verdict.blocked.text; sc.sub = c.verdict.blocked.headline; }
      else if (st === 'verdictEvidence') { sc.headline = '시간축 위의 한 지점'; sc.body = c.verdict.evidence.text; sc.evidence = { yes: c.verdict.evidence.yes, no: c.verdict.evidence.no }; }
      else if (st === 'verdictAdvice') { sc.headline = '다음 장면을 위한 두 걸음'; sc.body = c.verdict.advice.lead; sc.bullets = [{ label: 'ADVICE', items: c.verdict.advice.items }]; }
      else if (st === 'topics') { sc.headline = '더 알아보기'; sc.cards = c.topics; }
      else if (st === 'terms') { sc.headline = '쉬운 용어 풀이'; sc.terms = c.terms; }
      else if (st === 'chart') { sc.headline = c.title; sc.chart = chartKind(c); sc.chartBase = c.base || c.id; }
      else if (st === 'dataVisualization' || st === 'timeline') { sc.headline = c.title; sc.data = c.items; }
      // 같은 종류가 연속되지 않게: 직전 장면과 같은 media type 이면 다른 타입을 우선
      if (rule.media && !(st === 'chapterEnding' && !c.interpretation)) {
        var pref = lastMedia ? rule.types.filter(function (t) { return t !== lastMedia; }).concat(rule.types.filter(function (t) { return t === lastMedia; })) : rule.types;
        it.preferredMediaType = pref;
        var cands = search(assets, it, { usedIds: ctx.usedIds, prevChapter: ctx.prevChapter, sameChapter: sameCh, avoidType: lastMedia }, cfg);
        sc.candidates = cands.map(function (x) { return { assetId: x.asset.id, score: x.score, breakdown: x.breakdown }; });
        var pickd = choose(cands, null);
        if (pickd) {
          var a = pickd.asset; sc.media = { assetId: a.id, type: a.type, url: a.url, webmUrl: a.webmUrl, posterUrl: a.posterUrl || a.thumbnailUrl, loop: a.loopable || a.type === 'videoLoop', muted: true, score: pickd.score, why: pickd.breakdown, cinema: a.cinema || null };
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

  // 실제 챕터별 본문 패널 주제와 기존 이미지 대체 순서.
  function panelThemes(c) {
    c = c || {}; var base = c.base || c.id || '', t = (c.id || '') + ' ' + base + ' ' + (c.title || '');
    if (/children|자식운|자녀와/.test(t)) return ['children', 'family'];
    if (/past|전생|오래된 뿌리/.test(t) || base === 'c14') return ['pastLife'];
    if (/monthly|wolun|월운|월별|12개월/.test(t) || base === 'c18') return ['monthly', 'daewoon'];
    if (/sewoon|seun|세운|올해/.test(t) || base === 'c17') return ['sewoon', 'daewoon'];
    if (/marriage|spouse|결혼|배우자|동반자/.test(t) || base === 'c10') return ['marriage', 'love'];
    if (/life_actions|life_action$|manual|실천|버릴 것|사용설명서/.test(t) || base === 'c20') return ['action', 'remedy'];
    if (/remedy|개운|회복|쉼/.test(t) || base === 'c19') return ['remedy'];
    if (/money|wealth|돈|재물|재성/.test(t) || base === 'c08') return ['wealth'];
    if (/career|work|직업|일의|성공|커리어/.test(t) || base === 'c06' || base === 'c07') return ['career'];
    if (/love|ilju|연애|사랑|궁합|인연/.test(t) || base === 'c09' || base === 'c12') return ['love'];
    if (/family|가족|부모|자녀|자라온/.test(t) || base === 'c13') return ['family'];
    if (/relation|관계|대인|사람 사이|사람을 대/.test(t) || base === 'c11') return ['relationship'];
    if (/talent|재능|공부|학업/.test(t) || base === 'c04') return ['talent'];
    if (/shadow|weak|약점|그림자|장단점|십성|신살/.test(t) || base === 'c05') return ['shadow'];
    if (/daewoon|future|timing|대운|시기|흐름|앞으로/.test(t)) return ['daewoon'];
    return ['identity'];
  }
  R.Scenes = { panelThemes: panelThemes, configure: configure, TAX: TAX, CONFIG: CONFIG, SCENE_RULES: SCENE_RULES, VIDEO_TYPES: VIDEO_TYPES, classify: classify, normalize: normalize, search: search, choose: choose, intent: intent, planScenes: planScenes, chartKind: chartKind,
    buildChapterScenes: buildChapterScenes, actTransition: actTransition, coverage: coverage };
})(typeof window !== 'undefined' ? window : globalThis);
