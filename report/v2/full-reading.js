// 완성된 무빙툰의 모든 본문 챕터를 원국과 DB 원리로 다시 풀이한다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, active = null;
  function collect(chapter, name) {
    var paragraphs = [], targets = [];
    function push(text, set) {
      if (!text || text.trim().length < 30) return;
      var id = String(targets.length);
      paragraphs.push({ id: id, text: name ? text.split(name).join('본인') : text }); targets.push(set);
    }
    ['meaning', 'choice'].forEach(function (k) { if (typeof chapter[k] === 'string') push(chapter[k], function (text) { chapter[k] = text; }); });
    (chapter.details || []).forEach(function (d) { ['summary', 'detail'].forEach(function (k) { if (typeof d[k] === 'string') push(d[k], function (text) { d[k] = text; }); }); });
    (chapter.scenes || []).forEach(function (scene) {
      if (scene.html) {
        var box = root.document.createElement('div'); box.innerHTML = scene.html;
        [].forEach.call(box.querySelectorAll('p'), function (p) {
          if (p.closest('.rd-answer,.vd,.dp-note,.faint,[data-answer-topic]')) return;
          push(p.textContent, function (text) { p.textContent = text; scene.html = box.innerHTML; });
        });
      }
      ['body', 'narration', 'text'].forEach(function (k) { if (typeof scene[k] === 'string') push(scene[k], function (text) { scene[k] = text; }); });
      (scene.cards || []).forEach(function (c) { if (typeof c.summary === 'string') push(c.summary, function (text) { c.summary = text; }); });
      if (scene.insight && typeof scene.insight.body === 'string') push(scene.insight.body, function (text) { scene.insight.body = text; });
    });
    return { chapter: { id: chapter.id || chapter.base, title: name ? (chapter.title || '').split(name).join('본인') : chapter.title || '', paragraphs: paragraphs }, targets: targets };
  }
  function apply(job, result) {
    if (!result || !Array.isArray(result.paragraphs) || result.paragraphs.length !== job.targets.length) return false;
    var seen = {};
    if (!result.paragraphs.every(function (p) { var i = Number(p.id); if (!Number.isInteger(i) || !job.targets[i] || seen[i] || typeof p.text !== 'string' || p.text.length < 30 || p.text.length > 1200) return false; seen[i] = true; return true; })) return false;
    result.paragraphs.forEach(function (p) { job.targets[Number(p.id)](p.text); }); return true;
  }
  function prepare(rep, sd, name, onReady) {
    if (active) { active.cancelled = true; active.controllers.forEach(function (c) { c.abort(); }); }
    var session = { cancelled: false, controllers: [] }; active = session;
    var safe = {}; Object.keys(sd || {}).forEach(function (k) { if (k !== 'birth' && k !== 'name') safe[k] = sd[k]; });
    var chapters = rep.chapters || [], outline = chapters.map(function (c) { return { id: c.id || c.base, title: name ? (c.title || '').split(name).join('본인') : c.title || '' }; });
    var jobs = chapters.map(function (c) { return { c: c, job: collect(c, name) }; }), done = 0;
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
        var r = await root.fetch('/api/movingtoon-reading', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ sd: safe, outline: outline, chapter: job.chapter }), signal: ctl && ctl.signal });
        var d = await r.json(); if (d && ['no-ai', 'storage-unavailable', 'rate-limited'].indexOf(d.error) >= 0) done = jobs.length;
        if (!session.cancelled && d && d.ok && apply(job, d.result)) { item.c.readingProvider = d.provider; status.completed++; if (onReady) onReady(item.c, job, d.result); } else status.failed++;
      } catch (e) { status.failed++; } finally { root.clearTimeout(timer); }
    }
    // 첫 챕터를 준비한 뒤 표시하고, 후속 챕터는 미리 준비한다. 현재 DOM은 다시 그리지 않는다.
    var first = jobs.find(function (x) { return x.job.targets.length; });
    var firstPromise = first ? run(first) : Promise.resolve();
    async function worker() { while (!session.cancelled && done < jobs.length) { var x = jobs[done++]; if (x !== first) await run(x); } }
    firstPromise.then(function () { worker(); worker(); });
    return { first: firstPromise, status: status };
  }
  R.FullReading = { collect: collect, apply: apply, prepare: prepare };
})(typeof window !== 'undefined' ? window : globalThis);
