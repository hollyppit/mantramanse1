// 완성된 무빙툰의 모든 본문 챕터를 원국과 DB 원리로 다시 풀이한다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, active = null;
  function collect(chapter, name) {
    var paragraphs = [], targets = [];
    // 생활 점검 지표와 예방 안내는 검증된 고정 문구로 유지한다.
    if (chapter.aiEnabled === false || chapter.readingSupplementary || chapter.id === 'deep_health' || chapter.base === 'deep_health') return { chapter: { id: chapter.id || chapter.base, title: chapter.title || '', paragraphs: [] }, targets: [] };
    if(chapter.editorialDraft && R.ReadingFlow){
      var contract=chapter.editorialContractId;
      ['title','reality','strength','risk','reinforce','practice','evidence'].forEach(function(role,i){
        var instructions={title:'첫 문장에서 이 챕터의 질문에 근거 범위 안에서 직접 답하세요.',reality:'해당 질문에 관련된 구체적인 생활 사례를 조건부로 설명하세요.',strength:'이 챕터의 조건이 장점으로 발휘되는 상황을 설명하세요.',risk:'이 챕터의 조건이 취약점으로 바뀌는 상황과 부담을 설명하세요.',reinforce:'장점을 강화할 실제 행동과 적용되지 않는 반대 조건·예외를 함께 설명하세요.',practice:'실제로 시도하고 점검할 수 있는 행동을 제안하세요.',evidence:'전달된 판단의 근거와 한계, 상반된 해석 조건을 설명하세요.'};
        paragraphs.push({id:String(i),role:role,kind:'reading',text:instructions[role]+' 질문: '+chapter.title+' / 작성 계약 '+contract+'. 근거가 없으면 새로운 주장으로 채우지 마세요.'});
        targets.push(function(text){chapter.readingCore[role]=text;if(role==='title')chapter.headline=text;var replacement=R.ReadingFlow.scenes(chapter.readingCore,chapter.id);chapter.scenes=chapter.scenes.map(function(scene){return scene.readingRole===role?replacement.find(function(x){return x.readingRole===role;}):scene;});});
      });
      return {chapter:{id:chapter.id,title:chapter.title,chapterKind:chapter.editorialTopicId,paragraphs:paragraphs},targets:targets};
    }
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
  function deferredParagraphs(job, chapter, sd) {
    var basic=chapter.readingCore && chapter.readingSection && R.ReadingFlow ? R.ReadingFlow.card(sd,chapter.readingSection-1) : null;
    return job.chapter.paragraphs.map(function(p,i){var action=basic && ['reinforce','practice'].indexOf(p.role)>=0 ? basic[p.role] : '';return {id:p.id,role:p.role || '',text:action?'일반 실천 점검: '+action:'',refs:[],claim_ids:[]};});
  }
  function prepare(rep, sd, name, onReady) {
    if (active) { active.cancelled = true; active.controllers.forEach(function (c) { c.abort(); }); }
    var session = { cancelled: false, controllers: [] }; active = session;
    var guide = 'male'; try { guide = JSON.parse(root.localStorage.getItem('mt_guide') || 'null') === 'female' ? 'female' : 'male'; } catch (e) { }
    var safe = {}; Object.keys(sd || {}).forEach(function (k) { if (k !== 'birth' && k !== 'name') safe[k] = sd[k]; });
    var chapters = rep.chapters || [], outline = chapters.map(function (c) { return { id: c.id || c.base, title: name ? (c.title || '').split(name).join('본인') : c.title || '' }; });
    var jobs = chapters.map(function (c) { return { c: c, job: collect(c, name) }; }), done = 0;
    // Prepare the three entrance declarations before longer supplemental introductions.
    jobs.sort(function(a,b){function rank(x){var k=x.job.chapter.chapterKind;return x.c.readingCore && ['wealth','love','career'].indexOf(k)>=0 ? ['wealth','love','career'].indexOf(k) : x.c.id==='c-char'?5:4;}return rank(a)-rank(b);});
    var acceptedTexts = new Map();
    var status = { total: jobs.length, completed: 0, failed: 0 };
    rep.readingStatus = status;
    var unavailable = null;
    function defer(item, data, fallback) {
      if(session.cancelled)return;
      var c=item.c,job=item.job,deferred={paragraphs:deferredParagraphs(job,c,safe)};
      var known=['bad-payload','too-large','insufficient-evidence','storage-unavailable','chapter-validation-failed','ai-unavailable','no-ai','rate-limited','cost-limit','invalid-engine-mode'];
      c.readingWarning=known.indexOf(data && data.error)>=0?data.error:fallback || 'composition-failed';
      c.readingFailure={code:data && data.failure && data.failure.code || c.readingWarning,
        requestId:data && /^[a-f0-9-]{36}$/.test(data.requestId || '')?data.requestId:null,
        module:'full-reading',chapter:c.id || c.base || ''};
      c.readingNotice='이 장의 풀이를 준비하지 못했습니다. 계산표를 먼저 확인해 주세요.';
      c.readingDeferred=true;c.interpretationAnalysis=null;c.readingProvider=null;c.chapterHook=null;
      c.chapterQuality={ok:false,issues:[],semanticReviewStatus:'not-accepted'};
      c.readingParagraphs=deferred.paragraphs;c.readingEvidence=[];
      c.readingFullText=deferred.paragraphs.map(function(p){return p.text;}).filter(Boolean).join('\n\n');
      deferred.paragraphs.forEach(function(p){job.targets[Number(p.id)](p.text);});
      status.failed++;
      if(onReady)onReady(c,job,deferred);
    }
    async function run(item) {
      if (session.cancelled) return;
      var job = item.job;
      if (!job.chapter.paragraphs.length) {status.skipped=(status.skipped || 0)+1;return;}
      if (job.chapter.paragraphs.length > 60) { defer(item,null,'composition-limit');return; }
      if(unavailable){defer(item,unavailable);return;}
      var ctl = root.AbortController ? new root.AbortController() : null, timer = root.setTimeout(function () { if (ctl) ctl.abort(); }, 85000);
      if (ctl) session.controllers.push(ctl);
      try {
        var r = await root.fetch('/api/movingtoon-reading', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ realityContext:R.Editorial?R.Editorial.cleanContext(rep.realityContext):{}, guide: guide, directnessConsent: root.document && root.document.getElementById("directnessConsent") && root.document.getElementById("directnessConsent").checked ? 5 : null, sd: safe, outline: outline, chapter: job.chapter, previous: Array.from(acceptedTexts.entries()).slice(-80).map(function(x){return {text:name?x[0].split(name).join('본인'):x[0],chapter:x[1]};}) }), signal: ctl && ctl.signal });
        var d;try {d=await r.json();}catch(e){defer(item,null,'server-response-invalid');return;}
        if(session.cancelled)return;
        if(d && ['no-ai','rate-limited','cost-limit'].indexOf(d.error)>=0)unavailable={error:d.error};
        if (r.ok && d && d.ok && uniqueAcross(d.result, acceptedTexts, item.c.id,item.c) && apply(job, d.result)) {
          item.c.readingDeferred=false;item.c.readingNotice='';item.c.readingFailure=null;item.c.readingWarning=null;
          item.c.readingProvider=d.provider;item.c.chapterHook=d.hook || null;item.c.chapterQuality=d.chapterQuality || null;item.c.hookName=name || '귀인';
          item.c.interpretationAnalysis=d.interpretation || null;
          item.c.writingQuality=d.writingQuality || null;
          if(R.ReadingFlow && R.ReadingFlow.evidenceScene){var evidence=R.ReadingFlow.evidenceScene(item.c);item.c.scenes=item.c.scenes.filter(function(s){return s.sceneId!==item.c.id+'_ux_sources';});if(evidence)item.c.scenes.push(evidence);}
          item.c.readingParagraphs=d.result.paragraphs.map(function(p){var original=job.chapter.paragraphs.find(function(x){return x.id===p.id;});return Object.assign({},p,{role:original && original.role || ''});});
          item.c.readingFullText=d.result.paragraphs.map(function(p){return p.text;}).join('\n\n');
          item.c.readingEvidence=d.result.paragraphs.map(function(p){return {id:p.id,refs:p.refs,claim_ids:p.claim_ids || []};});
          if(d.style){item.c.readingStyle=d.style;rep.readingStyle=rep.readingStyle || d.style;}
          remember(d.result,acceptedTexts,item.c.id);status.completed++;
          if(onReady)onReady(item.c,job,d.result);
        } else defer(item,d,d && d.ok?'client-validation-failed':'server-communication-failed');
      } catch (e) { if(!session.cancelled)defer(item,null,e && e.name==='AbortError'?'server-timeout':'server-communication-failed'); }
      finally {root.clearTimeout(timer);if(ctl)session.controllers=session.controllers.filter(function(c){return c!==ctl;});}
    }
    // 첫 챕터를 준비한 뒤 표시하고, 후속 챕터는 미리 준비한다. 현재 DOM은 다시 그리지 않는다.
    var first = jobs.find(function (x) { return x.job.targets.length; });
    var firstPromise = first ? run(first) : Promise.resolve();
    async function worker() { while (!session.cancelled && done < jobs.length) { var x = jobs[done++]; if (x !== first) await run(x); } }
    firstPromise.then(function () { worker(); }); // Prior chapters must be available for semantic review.
    return { first: firstPromise, status: status };
  }
  R.FullReading = { deferredParagraphs: deferredParagraphs, uniqueAcross: uniqueAcross, collect: collect, apply: apply, prepare: prepare };
})(typeof window !== 'undefined' ? window : globalThis);
