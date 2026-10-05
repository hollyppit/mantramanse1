// Composer — 계산(SajuData) → 규칙 판단 → 모듈 선택 → (선택) AI 연결 → 20챕터 리포트.
// AI 없이도 항상 완성된 리포트가 나온다(AI는 enhancement). 같은 입력·같은 콘텐츠 버전이면 결과가 같다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var PROMPT_VERSION = 'p1';
  var BANNED = /(반드시|무조건|확정|100%|틀림없)/; // 단정 표현 방어선: 모듈 문구에서 발견되면 점검 목록에 올린다

  function el(sd, name) { return sd.fiveElements[name]; }
  // FACT 문장: 계산에서 읽힌 사실만 말한다(해석·단정 없음).
  function factOf(ch, sd) {
    var d = sd.dayMaster, k = ch.kind, S = R.SajuData;
    var sn = function (s) { return s ? S.SEASONS[s] : '확인 불가'; };
    switch (ch.base || ch.id) {
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

  function vars(sd, facts) {
    return Object.assign({}, facts, { el: sd.groupEl, groupEl: sd.groupEl, yongEl: facts.yongEl || sd.dominantEl, lackEl: facts.lackEl || '' });
  }
  function view(c, v) { // 선택된 모듈 → 화면용(템플릿 치환 포함)
    var T = R.Rules.tpl, m = c.mod;
    return { id: m.id, category: m.category, headline: T(m.headline, v), summary: T(m.summary, v), detail: T(m.detail, v), keywords: m.keywords || [], imageTags: m.imageTags || [], extra: m.extra || null,
      why: c.rows.map(function (r) { return r.label + ' = ' + (Array.isArray(r.have) ? r.have.join(',') : r.have) + (r.hit ? ' ✓' : ' ✗'); }), specificity: c.specificity };
  }

  // lib: { modules, remedies, images, version }
  function build(sd, lib, cfg, opts) {
    opts = opts || {}; var Rules = R.Rules, Remedy = R.Remedy, Media = R.Media;
    var facts = Rules.flatten(sd), v = vars(sd, facts), warnings = [];
    var nd = Remedy.needs(sd); facts.needTag = nd.tags;
    var rec = Remedy.recommend(sd, facts, lib.remedies, nd, { action: 3, exercise: 2, growth: 2, people: 2, place: 2, environment: 2, timing: 1 });
    var plan = Remedy.actionPlan(sd, nd, rec);
    var ctx = { usedIds: [], prevChapter: [] }, chapters = [], media = lib.media || lib.media || [], lastAct = 0;

    cfg.chapters.forEach(function (ch) {
      var picks = Rules.pick(lib.modules, facts, ch.maxModules || 1, { categories: ch.moduleCategories });
      var views = picks.map(function (p) { return view(p, v); });
      var lead = views[0] || { headline: ch.title, summary: '', detail: '', keywords: [], imageTags: [], extra: null, why: [] };
      var out = { id: ch.id, base: ch.base || ch.id, project: ch.project || 'full', no: ch.no, act: ch.act, title: ch.title, subtitle: ch.subtitle, kind: ch.kind, accessLevel: ch.accessLevel || 'free', introText: ch.introText || '',
        aiEnabled: ch.aiEnabled !== false, fact: factOf(ch, sd), headline: lead.headline, interpretation: lead.summary, meaning: lead.detail, details: views.slice(1), lead: lead, extra: lead.extra, modules: views.map(function (x) { return x.id; }), disclaimer: ch.disclaimer || null, cta: ch.cta || null, items: null };

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
        out.remedy = {}; Remedy.TYPES.forEach(function (t) { out.remedy[t] = (rec[t] || []).map(function (c) { return { id: c.item.id, title: c.item.title, summary: c.item.summary, extra: c.item.extra, matched: c.matchedTags }; }); });
        out.timing = { chain: [
          sd.currentDaewoon ? { level: '대운', ganzhi: sd.currentDaewoon.ganzhi, season: sd.currentDaewoon.season } : null,
          sd.sewoon ? { level: '세운', ganzhi: sd.sewoon.year + ' ' + sd.sewoon.ganzhi, season: sd.sewoon.season } : null,
          sd.monthlyLuck[0] ? { level: '월운', ganzhi: sd.monthlyLuck[0].month + '월', season: sd.monthlyLuck[0].season } : null,
        ].filter(Boolean), strategy: plan.strategy };
        out.needs = nd;
        out.action = (rec.action || []).map(function (c) { return c.item.title; });
      } else {
        out.action = (picks[0] && picks[0].mod.actionTags || []).length ? actionsForTags(picks[0].mod.actionTags, rec) : [];
      }
      if (ch.kind === 'summary') out.plan = plan;

      // Scene 시퀀스: Scene Intent → 미디어 후보 검색/점수 → 선택. 미디어가 없어도 scene 은 텍스트만으로 완성된다(UI 가 자리표시 장면).
      out.scenes = R.Scenes.buildChapterScenes(out, sd, media, ctx);
      var hero = out.scenes.filter(function (s) { return s.media; })[0];
      out.image = hero ? { id: hero.media.assetId, url: hero.media.posterUrl || hero.media.url } : null;
      if (ch.act !== lastAct) { out.actTransition = R.Scenes.actTransition(cfg.acts.filter(function (a) { return a.id === ch.act; })[0] || { id: ch.act, roman: 'ACT', title: '', line: '' }, sd, media, ctx); lastAct = ch.act; }

      [out.headline, out.interpretation, out.meaning].forEach(function (t) { if (BANNED.test(t || '')) warnings.push(ch.id + ': 단정 표현 포함 "' + (t.match(BANNED) || [])[0] + '"'); });
      chapters.push(out);
    });

    // 20장 최종 종합 요약(PDF 요약·마지막 화면). 구조화 필드만 모은다.
    var byId = {}; chapters.forEach(function (c) { byId[c.base || c.id] = c; });
    var summary = {
      core: byId.c01 && byId.c01.headline, strengths: byId.c04 && byId.c04.headline, weaknesses: byId.c05 && byId.c05.headline, work: byId.c06 && byId.c06.headline,
      money: byId.c08 && byId.c08.headline, people: byId.c11 && byId.c11.headline, love: byId.c09 && byId.c09.headline, growth: (rec.growth[0] && rec.growth[0].item.title) || '',
      body: (rec.exercise[0] && rec.exercise[0].item.title) || '', place: (rec.place[0] && rec.place[0].item.title) || '',
      daewoon: byId.c16 && byId.c16.headline, thisYear: byId.c17 && byId.c17.headline, months: sd.monthlyLuck.map(function (m) { return m.month + '월 ' + (m.season ? R.SajuData.SEASONS[m.season] : ''); }),
      todo: plan.checklist, avoid: plan.avoid, strategy: plan.strategy.map(function (s) { return s.label; }),
    };
    return { meta: { contentVersion: lib.version, promptVersion: PROMPT_VERSION, key: Rules.hash({ facts: facts, c: lib.version, p: PROMPT_VERSION, chapters: cfg.chapters.map(function (c) { return [c.id, c.order, c.maxModules, c.moduleCategories]; }) }), unavailable: sd.unavailable, aiApplied: false, warnings: warnings },
      acts: cfg.acts, chapters: chapters, remedies: rec, plan: plan, summary: summary, needs: nd, facts: facts };
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
    return { promptVersion: PROMPT_VERSION, rules: ['제공된 문장과 근거만 사용한다', '새로운 명리 규칙·수치·직업·행동을 만들지 않는다', '중복 제거와 문체 통일만 한다', '단정 표현(반드시·무조건·확정)을 쓰지 않는다', '건강·투자수익·질병·임신·법률은 예측하지 않는다'],
      chapters: report.chapters.filter(function (c) { return c.aiEnabled !== false; }).map(function (c) { return { id: c.id, title: c.title, fact: c.fact, headline: c.headline, interpretation: c.interpretation, meaning: c.meaning, action: c.action }; }) };
  }
  function applyAi(report, ai) {
    var ok = 0, byId = {}; ((ai && ai.chapters) || []).forEach(function (x) { if (x && x.id) byId[x.id] = x; });
    report.chapters.forEach(function (c) {
      var x = byId[c.id]; if (!x) return;
      var okH = typeof x.headline === 'string' && x.headline.length >= 4 && x.headline.length <= 80 && !BANNED.test(x.headline);
      var okL = typeof x.lead === 'string' && x.lead.length <= 300 && !BANNED.test(x.lead);
      if (okH) { c.headline = x.headline; ok++; } if (okL && x.lead) c.interpretation = x.lead;
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
    return { modules: mix(R.Content.modules, saved.modules), remedies: mix(R.Remedy.LIBRARY, saved.remedies), media: saved.media || saved.images || [], version: (saved.version ? saved.version + '+' : '') + R.Content.version };
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
    return { lib: library({ modules: content.modules, remedies: content.remedies, media: media, version: content.version }), cfg: R.Chapters.forProject(content, projectId || 'full'), scoring: content.scoring || {}, textStyles: content.textStyles || { all: {}, chapters: {} } };
  }

  // 서버(/api/compose) 응답 한 번에 적용. 어떤 부분이 이상해도 원본이 유지된다.
  function applyResult(report, result, lib) {
    if (!result) return report; applyAi(report, result); var n = applyAiMedia(report, result.media || {}, lib); report.meta.aiApplied = report.meta.aiApplied || n > 0; return report;
  }

  R.Compose = { applyResult: applyResult, fromSaved: fromSaved, mediaPayload: mediaPayload, applyAiMedia: applyAiMedia, library: library, build: build, aiPayload: aiPayload, applyAi: applyAi, PROMPT_VERSION: PROMPT_VERSION, factOf: factOf };
})(typeof window !== 'undefined' ? window : globalThis);
