// 완성된 무빙툰의 모든 본문 챕터를 원국과 DB 원리로 다시 풀이한다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, active = null;
  function collect(chapter, name) {
    var paragraphs = [], targets = [];
    // 생활 점검 지표와 예방 안내는 검증된 고정 문구로 유지한다.
    if (chapter.aiEnabled === false || chapter.readingSupplementary || chapter.id === 'deep_health' || chapter.base === 'deep_health') return { chapter: { id: chapter.id || chapter.base, title: chapter.title || '', paragraphs: [] }, targets: [] };
    function push(text, set, kind, role) {
      if (!text || text.trim().length < 30) return;
      var id = String(targets.length);
      paragraphs.push({ id: id, text: name ? text.split(name).join('본인') : text, kind: kind || 'reading', role: role || '' }); targets.push(set);
    }
    ['meaning', 'choice'].forEach(function (k) { if (!chapter.readingCore && typeof chapter[k] === 'string') push(chapter[k], function (text) { chapter[k] = text; }); });
    (chapter.readingCore ? [] : chapter.details || []).forEach(function (d) { ['summary', 'detail'].forEach(function (k) { if (typeof d[k] === 'string') push(d[k], function (text) { d[k] = text; }); }); });
    (chapter.scenes || []).forEach(function (scene) {
      // 예시 장면은 episode 종류로 전달해 설명체로 바뀌지 않게 한다.
      if (scene.readingSupplementary || scene.readingLayer === 'fact' || scene.readingLayer === 'model') return;
      if (scene.html) {
        var box = root.document.createElement('div'); box.innerHTML = scene.html;
        [].forEach.call(box.querySelectorAll('p'), function (p) {
          if (p.closest('.rd-answer,.vd,.dp-note,.faint,[data-answer-topic]')) return;
          push(p.textContent, function (text) { p.textContent = text; scene.html = box.innerHTML; if (scene.readingRole && chapter.readingCore) chapter.readingCore[scene.readingRole] = text; }, scene.episode ? 'episode' : 'reading', scene.readingRole);
        });
      }
      ['body', 'narration', 'text'].forEach(function (k) { if (typeof scene[k] === 'string') push(scene[k], function (text) { scene[k] = text; }); });
      (scene.cards || []).forEach(function (c) { if (typeof c.summary === 'string') push(c.summary, function (text) { c.summary = text; }); });
      if (scene.insight && typeof scene.insight.body === 'string') push(scene.insight.body, function (text) { scene.insight.body = text; });
    });
    return { chapter: { id: chapter.id || chapter.base, base: chapter.base || '', chapterKind: R.ChapterPolicy ? R.ChapterPolicy.kind(chapter) : root.MantraChapterPolicy ? root.MantraChapterPolicy.kind(chapter) : '', title: name ? (chapter.title || '').split(name).join('본인') : chapter.title || '', paragraphs: paragraphs }, targets: targets };
  }
  function apply(job, result) {
    if (!result || !Array.isArray(result.paragraphs) || result.paragraphs.length !== job.targets.length) return false;
    var seen = {};
    if (!result.paragraphs.every(function (p) { var i = Number(p.id); if (!Number.isInteger(i) || !job.targets[i] || seen[i] || typeof p.text !== 'string' || p.text.length < 30 || p.text.length > 1200) return false; seen[i] = true; return true; })) return false;
    result.paragraphs.forEach(function (p) { job.targets[Number(p.id)](p.text); }); return true;
  }
  function uniqueAcross(result, seen, id, chapter) {
    return !!(result && Array.isArray(result.paragraphs) && result.paragraphs.every(function(p) { var key=String(p.text || ''); var policy=root.MantraChapterPolicy;
      return Array.from(seen.entries()).every(function(old){if(old[1]===id)return true;return policy ? policy.similarity(key,old[0])<0.9 && !(policy.generalTrait(key,policy.kind(chapter || {}) || 'other') && policy.duplicate(key,old[0])) : key.replace(/\s+/g,'')!==old[0].replace(/\s+/g,'');}); }));
  }
  function remember(result, seen, id) { result.paragraphs.forEach(function(p) { seen.set(p.text,id); }); }
  function prepare(rep, sd, name, onReady) {
    if (active) { active.cancelled = true; active.controllers.forEach(function (c) { c.abort(); }); }
    var session = { cancelled: false, controllers: [] }; active = session;
    var safe = {}; Object.keys(sd || {}).forEach(function (k) { if (k !== 'birth' && k !== 'name') safe[k] = sd[k]; });
    var chapters = rep.chapters || [], outline = chapters.map(function (c) { return { id: c.id || c.base, title: name ? (c.title || '').split(name).join('본인') : c.title || '' }; });
    var jobs = chapters.map(function (c) { return { c: c, job: collect(c, name) }; }), done = 0;
    // Prepare the three entrance declarations before longer supplemental introductions.
    jobs.sort(function(a,b){function rank(x){var k=x.job.chapter.chapterKind;return x.c.readingCore && ['wealth','love','career'].indexOf(k)>=0 ? ['wealth','love','career'].indexOf(k) : x.c.id==='c-char'?5:4;}return rank(a)-rank(b);});
    var acceptedTexts = new Map();
    var status = { total: jobs.length, completed: 0, failed: 0 };
    rep.readingStatus = status;
    async function run(item) {
      if (session.cancelled) return;
      var job = item.job;
      if (!job.chapter.paragraphs.length) return;
      if (job.chapter.paragraphs.length > 60) { status.failed++; return; }
      var ctl = root.AbortController ? new root.AbortController() : null, timer = root.setTimeout(function () { if (ctl) ctl.abort(); }, 85000);
      if (ctl) session.controllers.push(ctl);
      try {
        var r = await root.fetch('/api/movingtoon-reading', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sd: safe, outline: outline, chapter: job.chapter, previous: Array.from(acceptedTexts.entries()).slice(-80).map(function(x){return {text:name?x[0].split(name).join('본인'):x[0],chapter:x[1]};}) }), signal: ctl && ctl.signal });
        var d = await r.json(); if (d && ['no-ai', 'storage-unavailable', 'rate-limited'].indexOf(d.error) >= 0) done = jobs.length;
        if (!session.cancelled && d && d.ok && uniqueAcross(d.result, acceptedTexts, item.c.id,item.c) && apply(job, d.result)) { item.c.readingProvider = d.provider; item.c.chapterHook = d.hook || null; item.c.chapterQuality = d.chapterQuality || null; item.c.hookName = name || '귀인'; if (d.interpretation) { item.c.interpretationAnalysis = d.interpretation; item.c.readingParagraphs = d.result.paragraphs.map(function(p){var original=job.chapter.paragraphs.find(function(x){return x.id===p.id;});return Object.assign({},p,{role:original && original.role || ''});}); item.c.readingFullText = d.result.paragraphs.map(function(p){return p.text;}).join('\n\n'); item.c.readingEvidence = d.result.paragraphs.map(function(p) { return { id: p.id, refs: p.refs, claim_ids: p.claim_ids || [] }; }); } if (d.style) { item.c.readingStyle = d.style; rep.readingStyle = rep.readingStyle || d.style; } remember(d.result, acceptedTexts, item.c.id); status.completed++; if (onReady) onReady(item.c, job, d.result); } else {
          status.failed++; item.c.readingWarning = d && d.error || 'validation-failed';
          if (!session.cancelled && (d && d.engineMode === 'grounded' || d && d.interpretation && d.interpretation.mode === 'grounded')) {
            // Runtime presentation only; original saved chapters remain intact.
            var deferred = { paragraphs: job.chapter.paragraphs.map(function(p,i){return {id:p.id,text:i===0?'이 주제의 풀이를 뒷받침할 검증된 근거가 부족하거나 생성 검증을 통과하지 못했습니다. 계산표를 확인하고 풀이 검수가 끝난 뒤 다시 살펴보세요.':'',refs:[],claim_ids:[]};}) };
            deferred.paragraphs.forEach(function(p){job.targets[Number(p.id)](p.text);});
            if(onReady)onReady(item.c,job,deferred);
          }
        }
      } catch (e) { status.failed++; } finally { root.clearTimeout(timer); }
    }
    // 첫 챕터를 준비한 뒤 표시하고, 후속 챕터는 미리 준비한다. 현재 DOM은 다시 그리지 않는다.
    var first = jobs.find(function (x) { return x.job.targets.length; });
    var firstPromise = first ? run(first) : Promise.resolve();
    async function worker() { while (!session.cancelled && done < jobs.length) { var x = jobs[done++]; if (x !== first) await run(x); } }
    firstPromise.then(function () { worker(); }); // Prior chapters must be available for semantic review.
    return { first: firstPromise, status: status };
  }
  R.FullReading = { uniqueAcross: uniqueAcross, collect: collect, apply: apply, prepare: prepare };
})(typeof window !== 'undefined' ? window : globalThis);
