// Composer — 계산(SajuData) → 규칙 판단 → 모듈 선택 → (선택) AI 연결 → 20챕터 리포트.
// AI 없이도 항상 완성된 리포트가 나온다(AI는 enhancement). 같은 입력·같은 콘텐츠 버전이면 결과가 같다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var PROMPT_VERSION = 'p2';
  var BANNED = /(반드시|무조건|확정|100%|틀림없)/; // 단정 표현 방어선: 모듈 문구에서 발견되면 점검 목록에 올린다

  function el(sd, name) { return sd.fiveElements[name]; }
  // FACT 문장: 계산에서 읽힌 사실만 말한다(해석·단정 없음).
  function factOf(ch, sd) {
    var d = sd.dayMaster, k = ch.kind, S = R.SajuData;
    var sn = function (s) { return s ? S.SEASONS[s] : '확인 불가'; };
    switch (ch.base || ch.id) {
      case 'c00': return sd.dayPillar.ko + '일주의 가장 큰 동력 · ' + sd.dominantGroup + ' ' + Math.round(sd.groups[sd.dominantGroup]) + '% (평균 20%)';
      case 'c01': return sd.dayPillar.ko + '일주 · 일간 ' + d.stem + '(' + d.hanja + ', ' + d.el + ')';
      case 'c02': return S.ELK.map(function (e) { return e + ' ' + Math.round(el(sd, e)) + '%'; }).join(' · ');
      case 'c03': return '신강약 ' + sd.strength.zone + ' · 가장 큰 십성군 ' + sd.dominantGroup + ' ' + Math.round(sd.groups[sd.dominantGroup]) + '%';
      case 'c04': return '십성군 ' + sd.dominantGroup + ' 중심' + (sd.roots ? ' · 원국 통근 ' + sd.roots.level : '');
      case 'c05': return (sd.lackEl ? sd.lackEl + ' 기운 비중 낮음 · ' : '') + '약한 십성군 ' + sd.weakestGroup + ' ' + Math.round(sd.groups[sd.weakestGroup]) + '%';
      case 'c06': return '십성군 ' + sd.dominantGroup + ' 중심' + (sd.career && sd.career.top[0] ? ' · 엔진 상위 분야 ' + sd.career.top.slice(0, 3).map(function (c) { return c.name; }).join(', ') : '');
      case 'c07': return '신강약 ' + sd.strength.zone + (sd.usefulElements ? ' · 용신 ' + sd.usefulElements.yong : '');
      case 'c08': return '재성 ' + Math.round(sd.groups['재성']) + '% · 식상 ' + Math.round(sd.groups['식상']) + '%';
      case 'c09': return sd.dominantGroup + ' 중심 · 일지 12운성 ' + (sd.twelveStages.day || '-');
      case 'c10': return '신강약 ' + sd.strength.zone + (sd.combinations.length ? ' · 합 ' + sd.combinations.length + '개' : '') + (sd.clashes.length ? ' · 충·형 ' + sd.clashes.length + '개' : '');
      case 'c11': return '신강약 ' + sd.strength.zone + ' · 인성 ' + Math.round(sd.groups['인성']) + '% · 비겁 ' + Math.round(sd.groups['비겁']) + '%';
      case 'c12': return '내 일간 ' + d.el + ' 기준 · ' + ['인성', '관성', '재성', '비겁', '식상'].map(function (g) { return g + '=' + sd.groupEl[g]; }).join(' · ');
      case 'c13': return '년주 ' + (sd.pillars.year ? sd.pillars.year.ko : '-') + ' · 월주 ' + (sd.pillars.month ? sd.pillars.month.ko : '-');
      case 'c14': return '일간 ' + d.el + ' · 십성군 ' + sd.dominantGroup + ' 중심' + (sd.specialStars.some(function (s) { return s.name === '역마살'; }) ? ' · 역마살' : '');
      case 'c15': return sd.daewoon.slice(0, 10).map(function (x) { return x.startAge + '세 ' + x.ganzhi; }).join(' → ');
      case 'c16': return sd.currentDaewoon ? '현재 대운 ' + sd.currentDaewoon.ganzhi + ' (' + sd.currentDaewoon.startYear + '–' + sd.currentDaewoon.endYear + ') · ' + sn(sd.currentDaewoon.season) : '현재 대운 정보 없음(대운 시작 전)';
      case 'c17': return sd.sewoon ? sd.sewoon.year + '년 ' + sd.sewoon.ganzhi + ' · ' + sd.sewoon.label : '세운 정보 없음';
      case 'c18': return sd.monthlyLuck.length ? '앞으로 ' + sd.monthlyLuck.length + '개월 · ' + sd.monthlyLuck[0].label + '부터' : '월운 정보 없음';
      case 'c19': return '원국 + 신강약 ' + sd.strength.band + ' + 통근 + 오행 + 십성 + 용신 + 현재 대운·세운·월운';
      default: return k + ' 종합';
    }
  }

  function vars(sd, facts, name, mask) {
    var pct = {}, elPct = {};
    Object.keys(sd.groups || {}).forEach(function (g) { pct[g] = Math.round(sd.groups[g]); });
    Object.keys(sd.fiveElements || {}).forEach(function (e) { elPct[e] = Math.round(sd.fiveElements[e]); });
    return Object.assign({}, facts, R.Narrator.heroVars(sd, name, mask), { el: sd.groupEl, groupEl: sd.groupEl, yongEl: facts.yongEl || sd.dominantEl, lackEl: facts.lackEl || '', pct: pct, elPct: elPct, strengthZone: sd.strength.zone });
  }
  function view(c, v) { // 선택된 모듈 → 화면용(템플릿 치환 포함)
    var T = R.Rules.tpl, m = c.mod;
    return { id: m.id, category: m.category, headline: T(m.headline, v), summary: T(m.summary, v), detail: T(m.detail, v), choice: m.choice ? T(m.choice, v) : '', keywords: m.keywords || [], imageTags: m.imageTags || [], extra: m.extra || null,
      why: c.rows.map(function (r) { return r.label + ' = ' + (Array.isArray(r.have) ? r.have.join(',') : r.have) + (r.hit ? ' ✓' : ' ✗'); }), specificity: c.specificity };
  }

  // lib: { modules, remedies, images, version }
  function build(sd, lib, cfg, opts) {
    opts = opts || {}; var Rules = R.Rules, Remedy = R.Remedy, Media = R.Media;
    var pj = (cfg.project && cfg.project.id) || 'full', facts = Rules.flatten(sd, { project: pj }), v = vars(sd, facts, opts.name), vMask = vars(sd, facts, '', true), warnings = [];
    var heroVars = R.Narrator.heroVars(sd, opts.name, !!opts.maskHero); // maskHero: 관리자 문구 편집용 — {hero…} 자리표시자를 그대로 둔다
     // 이름은 이 기기 안에서만 쓴다(서버 전송 금지). AI 에는 vMask 로 만든 {hero…} 자리표시자 문장이 나간다.
    var nd = Remedy.needs(sd, (cfg.project && cfg.project.needTags) || []); facts.needTag = nd.tags;
    var rec = Remedy.recommend(sd, facts, lib.remedies, nd, { action: 5, growth: 3, people: 3, place: 3, environment: 3, timing: 1 });
    var plan = Remedy.actionPlan(sd, nd, rec);
    var vparts = null; // 총평(c00) 재료: 막힘 후보(과다·결핍 모듈) + c05 lead + 행동 계획
    if (cfg.chapters.some(function (c) { return c.kind === 'verdict'; }) && R.Verdict) {
      var vc = Rules.rank(lib.modules.filter(function (m) { return /^pro_(high|zero)_/.test(m.id) || m.layer === 'groupHigh' || m.layer === 'groupZero'; }), facts).map(function (x) { var cd = x.mod.conditions || {}, w = view(x, v); w.kind = cd.groupHigh ? 'high' : 'zero'; w.group = (cd.groupHigh || cd.groupZero || [])[0]; return w; });
      var c5 = Rules.pick(lib.modules, facts, 1, { categories: ['shadow'] })[0];
      vparts = { blocked: vc, c05: c5 ? view(c5, v) : null, plan: plan };
    }
    var actLib = (lib.remedies || []).filter(function (it) { return it.type === 'action' && it.enabled !== false && !Remedy.isExercise(it) && Rules.evaluate(it, facts).match; }), usedAct = {}, seenTerms = {};
    var ctx = { usedIds: [], prevChapter: [] }, chapters = [], media = lib.media || lib.media || [], lastAct = 0, dirState = { four: 0 };

    cfg.chapters.forEach(function (ch) {
      var picks = Rules.pick(lib.modules, facts, ch.maxModules || 1, { categories: ch.moduleCategories });
      var views = picks.map(function (p) { return view(p, v); });
      var maskLead = picks[0] ? view(picks[0], vMask) : null; // AI 전송용(이름 대신 {hero…})
      var lead = views[0] || { headline: ch.title, summary: '', detail: '', keywords: [], imageTags: [], extra: null, why: [] };
      var out = { id: ch.id, base: ch.base || ch.id, project: ch.project || 'full', no: ch.no, act: ch.act, title: ch.title, subtitle: ch.subtitle, kind: ch.kind, accessLevel: ch.accessLevel || 'free', introText: ch.introText || '',
        aiEnabled: ch.aiEnabled !== false, actionPool: (rec.action || []).slice(0, 4).map(function (x) { return x.item.title; }), fact: factOf(ch, sd), headline: lead.headline, interpretation: lead.summary, meaning: lead.detail, choice: lead.choice || '', tpl: maskLead ? { headline: maskLead.headline, interpretation: maskLead.summary, meaning: maskLead.detail } : null, details: views.slice(1), lead: lead, extra: lead.extra, modules: views.map(function (x) { return x.id; }), disclaimer: ch.disclaimer || null, cta: ch.cta || null, items: null };

      if (ch.kind === 'verdict' && vparts) { // 총평: 고정 첫 문장 + 동력 재료(모듈이 아니라 sd·규칙 문장에서 조립)
        out.verdict = R.Verdict.material(sd, vparts); out.headline = R.Verdict.FIRST; out.interpretation = out.verdict.discover; out.meaning = ''; out.details = []; out.modules = []; out.action = [];
        out.lead = { id: 'verdict', category: 'verdict', headline: out.headline, summary: out.interpretation, detail: '', keywords: [], imageTags: ['mist', 'stars'], extra: null, why: [], specificity: 0 }; out.extra = null;
      }
      if (ch.kind === 'daewoon') { // 대운 10개 각각을 같은 모듈 DB에서 계절별로 선택
        out.items = sd.daewoon.map(function (x) {
          var p = Rules.pick(lib.modules, Object.assign({}, facts, { daewoonSeason: x.season }), 1, { categories: ['daewoon'] })[0];
          return Object.assign({}, x, { seasonName: x.season ? R.SajuData.SEASONS[x.season] : null, isCurrent: sd.currentDaewoon === x, module: p ? view(p, v) : null });
        });
      }
      if (ch.kind === 'monthly') {
        out.items = sd.monthlyLuck.map(function (x) {
          var p = Rules.pick(lib.modules, Object.assign({}, facts, { monthSeason: x.season }), 1, { categories: ['monthly'] })[0];
          return Object.assign({}, x, { seasonName: x.season ? R.SajuData.SEASONS[x.season] : null, module: p ? view(p, v) : null });
        });
      }
      if (ch.kind === 'remedy') {
        out.remedy = {}; Remedy.TYPES.forEach(function (t) { out.remedy[t] = (rec[t] || []).map(function (c) { return { id: c.item.id, title: c.item.title, summary: c.item.summary, extra: c.item.extra, kind: c.item.extra && c.item.extra.kind || '', matched: c.matchedTags }; }); });
        out.timing = { chain: [
          sd.currentDaewoon ? { level: '대운', ganzhi: sd.currentDaewoon.ganzhi, season: sd.currentDaewoon.season } : null,
          sd.sewoon ? { level: '세운', ganzhi: sd.sewoon.year + ' ' + sd.sewoon.ganzhi, season: sd.sewoon.season } : null,
          sd.monthlyLuck[0] ? { level: '월운', ganzhi: sd.monthlyLuck[0].month + '월', season: sd.monthlyLuck[0].season } : null,
        ].filter(Boolean), strategy: plan.strategy };
        out.needs = nd;
        out.action = (rec.action || []).map(function (c) { return c.item.title; });
      } else {
        var ai = actionItems(ch.base || ch.id, (picks[0] && picks[0].mod.actionTags) || [], actLib, nd, usedAct, rec);
        out.action = ai.map(function (x) { return x.title; }); out.actionNotes = ai.map(function (x) { return x.summary || ''; });
        out.actionPool = out.action.slice();
      }
      if (ch.kind === 'summary') out.plan = plan;

      // 챕터별 주제 카드(흥미 카테고리)와 쉬운 용어 풀이 — 계산 결과(facts)로 고른 모듈 문장 + 용어 사전(terms.js)
      out.topics = R.Topics ? R.Topics.pick(lib.modules, facts, out.base, function (p) { return view(p, v); }) : [];
      out.terms = R.Terms && ch.kind !== 'verdict' ? R.Terms.forChapter(out, sd, 3, seenTerms) : [];

      // Scene 시퀀스: Scene Intent → 미디어 후보 검색/점수 → 선택. 미디어가 없어도 scene 은 텍스트만으로 완성된다(UI 가 자리표시 장면).
      out.scenes = R.Scenes.buildChapterScenes(out, sd, media, ctx);
      if (R.Director) R.Director.apply(out, sd, { media: media, ctx: ctx, vars: heroVars, state: dirState }); // 장면 감독: 오프닝·현실 장면 삽입, 연출값(cinemaAuto) 부여, 강도 제한
      var hero = out.scenes.filter(function (s) { return s.media; })[0];
      out.image = hero ? { id: hero.media.assetId, url: hero.media.posterUrl || hero.media.url } : null;
      if (ch.act !== lastAct) { out.actTransition = R.Scenes.actTransition(cfg.acts.filter(function (a) { return a.id === ch.act; })[0] || { id: ch.act, roman: 'ACT', title: '', line: '' }, sd, media, ctx); lastAct = ch.act; }

      [out.headline, out.interpretation, out.meaning].forEach(function (t) { if (BANNED.test(t || '')) warnings.push(ch.id + ': 단정 표현 포함 "' + (t.match(BANNED) || [])[0] + '"'); });
      chapters.push(out);
    });

    if (R.Director) R.Director.linkNext(chapters, heroVars); // 챕터 끝에 다음 챕터의 질문(NEXT HOOK)

    // 20장 최종 종합 요약(PDF 요약·마지막 화면). 구조화 필드만 모은다.
    var byId = {}; chapters.forEach(function (c) { byId[c.base || c.id] = c; });
    var summary = {
      core: byId.c01 && byId.c01.headline, strengths: byId.c04 && byId.c04.headline, weaknesses: byId.c05 && byId.c05.headline, work: byId.c06 && byId.c06.headline,
      money: byId.c08 && byId.c08.headline, people: byId.c11 && byId.c11.headline, love: byId.c09 && byId.c09.headline, growth: (rec.growth[0] && rec.growth[0].item.title) || '',
      body: ((rec.action || []).filter(function (c) { return Remedy.isExercise(c.item); })[0] || { item: {} }).item.title || '', place: (rec.place[0] && rec.place[0].item.title) || '',
      daewoon: byId.c16 && byId.c16.headline, thisYear: byId.c17 && byId.c17.headline, months: sd.monthlyLuck.map(function (m) { return m.month + '월 ' + (m.season ? R.SajuData.SEASONS[m.season] : ''); }),
      todo: plan.checklist, avoid: plan.avoid, strategy: plan.strategy.map(function (s) { return s.label; }),
    };
    return { meta: { contentVersion: lib.version, promptVersion: PROMPT_VERSION, key: Rules.hash({ facts: facts, c: lib.version, p: PROMPT_VERSION, chapters: cfg.chapters.map(function (c) { return [c.id, c.order, c.maxModules, c.moduleCategories]; }) }), unavailable: sd.unavailable, aiApplied: false, warnings: warnings, heroVars: heroVars },
      acts: cfg.acts, chapters: chapters, remedies: rec, plan: plan, summary: summary, needs: nd, facts: facts };
  }

  // 챕터 주제에 맞는 행동만 고른다. ① 이 챕터 전용(extra.chapters) 행동을 우선 ② 그 챕터 모듈의 actionTags 와 겹치는 일반 행동은 한 리포트에서 한 번만.
  // 모자라면 채우지 않는다 — 다른 챕터와 같은 행동이 반복되는 것보다 적게 보이는 편이 낫다. used 는 리포트 전체에서 공유한다.
  function actionItems(base, tags, pool, nd, used, rec) {
    var keep = {}; ((rec && rec.action) || []).forEach(function (c) { keep[c.item.id] = 1; }); // 개운법 장(c19)에서 쓰는 행동은 다른 챕터가 가져가지 않는다
    var w = (nd && nd.weights) || {}, sc = function (it) { var s = 0; (it.tags || []).forEach(function (g) { s += (w[g] || 0) + (tags.indexOf(g) >= 0 ? 2 : 0); }); return s * 10 + (+it.priority || 0) / 100; };
    var by = function (a, b) { return sc(b) - sc(a) || (a.id < b.id ? -1 : 1); };
    var out = pool.filter(function (it) { return it.extra && it.extra.chapters && it.extra.chapters.indexOf(base) >= 0 && !used[it.id]; }).sort(by).slice(0, 2);
    if (out.length < 3) {
      pool.filter(function (it) { return !(it.extra && it.extra.chapters) && !used[it.id] && !keep[it.id] && (it.tags || []).some(function (g) { return tags.indexOf(g) >= 0; }); }).sort(by).slice(0, 3 - out.length).forEach(function (it) { out.push(it); });
    }
    out.forEach(function (it) { used[it.id] = 1; });
    return out;
  }
  function actionsForTags(tags, rec) { // 모듈 actionTags 와 추천 행동의 태그가 겹치는 행동 제목 (없으면 상위 추천 1개)
    var out = [];
    (rec.action || []).forEach(function (c) { if ((c.item.tags || []).some(function (t) { return tags.indexOf(t) >= 0; }) && out.length < 2) out.push(c.item.title); });
    if (!out.length && rec.action && rec.action[0]) out.push(rec.action[0].item.title);
    return out;
  }

  /* ── AI Composer 연결부 ─────────────────────────────────────────────────────
     AI 에는 "이미 선택된 모듈 문장 + 계산 근거"만 보낸다. 새 명리 규칙을 만들 수 없도록 프롬프트가 제한한다.
     AI 응답은 챕터별 headline/lead(2문장 이내)만 받아들이고, 길이·단정 표현을 검사해 어긋나면 그 챕터는 원본 모듈 문장을 유지한다. */
  function aiPayload(report) {
    return { promptVersion: PROMPT_VERSION, rules: ['서술은 전지적 관찰자 시점의 소설체(~다) 3인칭이며 "당신"·"~습니다"·"~하세요"를 쓰지 않는다', '{hero}·{hero은는}·{hero이가}·{hero을를}·{hero의} 자리표시자는 그대로 둔다', '제공된 문장과 근거만 사용한다', '새로운 명리 규칙·수치·직업·행동을 만들지 않는다', '중복 제거와 문체 통일만 한다', '단정 표현(반드시·무조건·확정)을 쓰지 않는다', '건강·투자수익·질병·임신·법률은 예측하지 않는다'],
      chapters: report.chapters.filter(function (c) { return c.aiEnabled !== false; }).map(function (c) { var t = c.tpl || c; // 이름이 들어간 문장 대신 {hero…} 자리표시자 문장을 보낸다
        var o = { id: c.id, title: c.title, fact: c.fact, headline: t.headline, interpretation: t.interpretation, meaning: t.meaning, action: c.action }; if (c.verdict) o.verdict = { discover: c.verdict.discover, blocked: c.verdict.blocked.text, evidence: c.verdict.evidence ? c.verdict.evidence.text : '' }; return o; }) };
  }
  function applyAi(report, ai) {
    var ok = 0, byId = {}; ((ai && ai.chapters) || []).forEach(function (x) { if (x && x.id) byId[x.id] = x; });
    report.chapters.forEach(function (c) {
      var x = byId[c.id]; if (!x) return;
      if (c.verdict) { // 총평: 첫 문장·조언은 고정. 발견/막힘/증거만 검증을 통과하면 교체(막힘은 템플릿의 50% 이상 길이)
        var acc = R.Verdict.acceptAi(x.verdict, c.verdict, BANNED);
        if (acc.discover) { c.verdict.discover = acc.discover; c.interpretation = acc.discover; ok++; } if (acc.blocked) { c.verdict.blocked.text = acc.blocked; ok++; } if (acc.evidence && c.verdict.evidence) { c.verdict.evidence.text = acc.evidence; ok++; }
        (c.scenes || []).forEach(function (s) { if (s.sceneType === 'verdictFind') s.body = c.verdict.discover; else if (s.sceneType === 'verdictBlock') s.body = c.verdict.blocked.text; else if (s.sceneType === 'verdictEvidence' && c.verdict.evidence) s.body = c.verdict.evidence.text; });
        return;
      }
      var N = R.Narrator, hv = report.meta.heroVars, narr = function (t) { return N.isNarrative(t) && N.placeholdersOk(t); }; // 서술 파트에 '당신'·합쇼체·명령형이 있으면 그 챕터는 template 유지
      if (!narr(x.headline) || !narr(x.lead)) return;
      var okH = typeof x.headline === 'string' && x.headline.length >= 4 && x.headline.length <= 80 && !BANNED.test(x.headline);
      var okL = typeof x.lead === 'string' && x.lead.length <= 300 && !BANNED.test(x.lead);
      if (okH) { c.headline = N.fill(x.headline, hv); ok++; } if (okL && x.lead) c.interpretation = N.fill(x.lead, hv);
      (c.scenes || []).forEach(function (s) { // 장면 문구도 같이 갱신
        if (s.sceneType === 'chapterIntro') s.body = c.headline; else if (s.sceneType === 'insight') s.body = c.interpretation; else if (s.sceneType === 'chapterEnding') s.headline = c.headline;
      });
    });
    report.meta.aiApplied = ok > 0; return report;
  }

  // 기본 라이브러리 + 관리자 저장본(id 기준 덮어쓰기/추가)을 합친다. saved: { modules:[], remedies:[], images:[], version }
  function library(saved) {
    saved = saved || {};
    var mix = function (base, extra) { var m = {}, out = []; (base || []).forEach(function (x) { m[x.id] = x; }); (extra || []).forEach(function (x) { if (x && x.id) m[x.id] = Object.assign({}, m[x.id] || {}, x); }); Object.keys(m).forEach(function (k) { out.push(m[k]); }); return out; };
    return { modules: mix(R.Content.modules, saved.modules), remedies: mix(R.Remedy.LIBRARY, (saved.remedies || []).map(R.Remedy.normalize)), media: saved.media || saved.images || [], version: (saved.version ? saved.version + '+' : '') + R.Content.version };
  }

  // AI 미디어 선택: 서버가 만든 후보(assetId·점수·태그)만 AI 에 주고, 응답 assetId 가 그 scene 의 후보 목록에 있을 때만 교체한다.
  function mediaPayload(report, lib) {
    // 에셋 정보는 한 번만(assets), 장면에는 후보 id·점수만. 후보가 2개 이상인 장면만 AI 선택 대상(최대 40장면, 후보 5개)
    var by = {}; (lib.media || []).forEach(function (a) { by[a.id] = a; });
    var assets = {}, scenes = [];
    report.chapters.forEach(function (c) { (c.scenes || []).forEach(function (s) {
      if (scenes.length >= 40 || !s.candidates || s.candidates.length < 2) return;
      var cs = s.candidates.filter(function (x) { return x.score > 0; }).slice(0, 5); if (cs.length < 2) return;
      cs.forEach(function (x) { var a = by[x.assetId] || {}; assets[x.assetId] = { title: a.title || '', description: a.description || '', tags: (a.tags || []).slice(0, 10) }; });
      scenes.push({ sceneId: s.sceneId, sceneType: s.sceneType, message: s.intent && s.intent.message || '', candidates: cs.map(function (x) { return [x.assetId, x.score]; }) });
    }); });
    return { assets: assets, scenes: scenes };
  }
  function applyAiMedia(report, picks, lib) {
    var by = {}; (lib.media || []).forEach(function (a) { by[a.id] = a; }); var used = {}, n = 0;
    report.chapters.forEach(function (c) { (c.scenes || []).forEach(function (s) { if (s.media) used[s.media.assetId] = 1; }); });
    report.chapters.forEach(function (c) { (c.scenes || []).forEach(function (s) {
      var id = picks && picks[s.sceneId]; if (!id || !s.media || id === s.media.assetId) return;
      var ok = s.candidates.some(function (x) { return x.assetId === id && x.score > 0; }), a = by[id];
      if (!ok || !a || used[id]) return; // 후보 밖 id·이미 쓴 id 는 무시(AI 가 새 URL 을 만들 수 없다)
      delete used[s.media.assetId]; used[id] = 1; n++;
      s.media = { assetId: id, type: a.type, url: a.url, webmUrl: a.webmUrl, posterUrl: a.posterUrl || a.thumbnailUrl, loop: !!a.loopable, muted: true, by: 'ai' };
    }); });
    return n;
  }

  // 서버 저장본 한 번에 적용: content = /api/report-content 의 content, media = /api/media 의 media
  function fromSaved(content, media, projectId) {
    content = content || {}; if (content.scoring) R.Scenes.configure(content.scoring);
    return { lib: library({ modules: content.modules, remedies: content.remedies, media: media, version: content.version }), cfg: R.Chapters.forProject(content, projectId || 'full'), scoring: content.scoring || {}, introEpic: content.introEpic || null, cinemaDefaults: content.cinemaDefaults || {}, bgm: content.bgm || {}, textStyles: content.textStyles || { all: {}, chapters: {} }, sceneCopy: content.sceneCopy || {}, flow: R.Moving ? R.Moving.clean(content.flow) : null };
  }

  // 서버(/api/compose) 응답 한 번에 적용. 어떤 부분이 이상해도 원본이 유지된다.
  function applyResult(report, result, lib) {
    if (!result) return report; applyAi(report, result); var n = applyAiMedia(report, result.media || {}, lib); report.meta.aiApplied = report.meta.aiApplied || n > 0; return report;
  }

  R.Compose = { applyResult: applyResult, fromSaved: fromSaved, mediaPayload: mediaPayload, applyAiMedia: applyAiMedia, library: library, build: build, aiPayload: aiPayload, applyAi: applyAi, PROMPT_VERSION: PROMPT_VERSION, factOf: factOf };
})(typeof window !== 'undefined' ? window : globalThis);
