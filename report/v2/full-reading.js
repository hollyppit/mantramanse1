// 완성된 무빙툰의 모든 본문 챕터를 원국과 DB 원리로 다시 풀이한다.
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {}, active = null;
  // A gateway can return HTML (or a truncated body) before the JSON API finishes.
  // Retry only transport failures; evidence/validation/quota decisions are final.
  async function readingResponse(init, session, chapter) {
    var transientStatus=function(s){return s===408 || s===425 || s===502 || s===503 || s===504 || s>=520 && s<=524;};
    for(var attempt=0;attempt<3;attempt++){
      if(session.cancelled || init.signal && init.signal.aborted){var cancelled=new Error('cancelled');cancelled.name='AbortError';throw cancelled;}
      var response=null, data=null, failure=null;
      try {
        response=await root.fetch('/api/movingtoon-reading',init);
        try{data=await response.json();}catch(e){failure=e;}
        if(!failure){
          // Only explicit in-progress/storage responses are retriable JSON errors.
          // Never repeat paid generation after a quality or cost rejection.
          if(!(data && !data.ok && ['generation-in-progress','storage-unavailable'].indexOf(data.error)>=0 && (response.status===202 || transientStatus(response.status))))return {r:response,d:data};
          failure=new Error('temporary-reading-service');
        }
        if(!transientStatus(response.status) && !response.ok)throw failure;
      } catch(e){
        if(e.name==='AbortError' || init.signal && init.signal.aborted)throw e;
        failure=e;
        if(response && !transientStatus(response.status) && !response.ok)throw e;
      }
      if(attempt===2)throw failure;
      chapter.readingRecovery={attempt:attempt+1,status:response?response.status:0,reason:failure instanceof SyntaxError?'invalid-json':'transport'};
      await new Promise(function(resolve){root.setTimeout(resolve,attempt===0?800:2000);});
    }
  }
  function collect(chapter, name) {
    var paragraphs = [], targets = [];
    // 생활 점검 지표와 예방 안내는 검증된 고정 문구로 유지한다.
    if (chapter.aiEnabled === false || chapter.readingSupplementary || (!chapter.editorialContractId && (chapter.id === 'deep_health' || chapter.base === 'deep_health'))) return { chapter: { id: chapter.id || chapter.base, title: chapter.title || '', paragraphs: [] }, targets: [] };
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
      var part=chapter && chapter.editorialDraft && collect(chapter,'').chapter.paragraphs.find(function(x){return x.id===p.id;});if(part && part.role==='evidence')return true;
      return Array.from(seen.entries()).every(function(old){if(old[1]===id)return true;return policy ? policy.similarity(key,old[0])<0.9 && !(policy.similarity(key,old[0])>=0.65 && policy.generalTrait(key,policy.kind(chapter || {}) || 'other') && policy.duplicate(key,old[0])) : key.replace(/\s+/g,'')!==old[0].replace(/\s+/g,'');}); }));
  }
  function adviceHistory(chapters,currentId,name){
    var total=0;return (chapters || []).filter(function(c){return c.id!==currentId && !c.readingDeferred && c.readingProvider!=='local-reviewed-education' && c.editorialTopicId!=='creative' && Array.isArray(c.readingParagraphs);}).map(function(c){var row={chapter:c.id,title:c.title || ''};['reinforce','practice','risk'].forEach(function(role){var p=c.readingParagraphs.find(function(p){return p.role===role;});if(p && p.text.length<=500)row[role==='risk'?'caution':role]=name?p.text.split(name).join('본인'):p.text;});return row;}).filter(function(row){return row.reinforce || row.practice || row.caution;}).slice(-84).reverse().filter(function(row){var size=JSON.stringify(row).length;if(total+size>60000)return false;total+=size;return true;}).reverse();
  }
  function remember(result, seen, id) { result.paragraphs.forEach(function(p) { seen.set(p.text,id); }); }
  function deferredParagraphs(job, chapter, sd) {
    var basic=chapter.readingCore && chapter.readingSection && R.ReadingFlow ? R.ReadingFlow.card(sd,chapter.readingSection-1) : null;
    return job.chapter.paragraphs.map(function(p,i){var action=basic && ['reinforce','practice'].indexOf(p.role)>=0 ? basic[p.role] : '';return {id:p.id,role:p.role || '',text:action?'일반 실천 점검: '+action:'',refs:[],claim_ids:[]};});
  }
  function prepare(rep, sd, name, onReady) {
    if (active) { active.cancelled = true; active.controllers.forEach(function (c) { c.abort(); }); }
    var session = { cancelled: false, controllers: [] }; active = session;
    // Both guides use the same polite reading and therefore share its server cache.
    var guide = 'male';
    var safe = {}; Object.keys(sd || {}).forEach(function (k) { if (k !== 'birth' && k !== 'name') safe[k] = sd[k]; });
    var chapters = rep.chapters || [], outline = chapters.map(function (c) { return { id: c.id || c.base, title: name ? (c.title || '').split(name).join('본인') : c.title || '' }; });
    var jobs = chapters.map(function (c) { return { c: c, job: collect(c, name) }; }), done = 0;
    // Prepare the three entrance declarations before longer supplemental introductions.
    jobs.sort(function(a,b){function rank(x){var k=x.job.chapter.chapterKind;return x.c.readingCore && ['wealth','love','career'].indexOf(k)>=0 ? ['wealth','love','career'].indexOf(k) : x.c.id==='c-char'?5:4;}return rank(a)-rank(b);});
    var acceptedTexts = new Map();
    var status = { total: jobs.length, completed: 0, failed: 0 };
    rep.readingStatus = status;
    var unavailable = null, pastStoryPromise = null;
    // Production uses the released fixed educational text; preview keeps its isolated draft source.
    var localHealthPromise=null;
    function localHealth(c){
      if(!root.location || !/^timeline_health_(01|06|08)$/.test(c.editorialContractId || ''))return Promise.resolve(null);
      var local=/^(localhost|127\.0\.0\.1|\[::1\])$/.test(root.location.hostname);
      if(!localHealthPromise){
        var healthController=root.AbortController?new root.AbortController():null,healthTimer;
        if(healthController)session.controllers.push(healthController);
        var healthDeadline=new Promise(function(resolve){healthTimer=root.setTimeout(function(){if(healthController)healthController.abort();resolve(null);},8000);});
        var healthRequest=Promise.resolve().then(function(){return root.fetch(local?'/api/local-health-supplement':'/api/health-education',{signal:healthController && healthController.signal});}).then(function(r){return r.ok?r.json():null;}).catch(function(){return null;});
        localHealthPromise=Promise.race([healthRequest,healthDeadline]).finally(function(){root.clearTimeout(healthTimer);if(healthController)session.controllers=session.controllers.filter(function(c){return c!==healthController;});});
      }
      return localHealthPromise.then(function(data){if(!data || !data.aiReview || !data.aiReview.passed || !Array.isArray(data.chapters) || !Array.isArray(data.sources))return null;var row=data.chapters.find(function(x){return x && x.id===c.editorialContractId;});return row && Array.isArray(row.paragraphs) && row.paragraphs.length>0 && row.paragraphs.every(function(p){return p && typeof p.text==='string' && p.text.trim();}) && Array.isArray(row.sourceIds) && row.mode==='educational-only' && row.state===(local?'draft':'released-education') && row.personalizedEvidenceAccepted===false?{row:row,sources:data.sources}:null;});
    }
    function defer(item, data, fallback) {
      if(session.cancelled)return;
      var c=item.c,job=item.job,deferred={paragraphs:deferredParagraphs(job,c,safe)};
      var known=['bad-payload','too-large','insufficient-evidence','storage-unavailable','chapter-validation-failed','ai-unavailable','no-ai','rate-limited','cost-limit','invalid-engine-mode'];
      c.readingWarning=known.indexOf(data && data.error)>=0?data.error:fallback || 'composition-failed';
      c.readingFailure={code:data && data.failure && data.failure.code || c.readingWarning,
        requestId:data && /^[a-f0-9-]{36}$/.test(data.requestId || '')?data.requestId:null,
        module:'full-reading',chapter:c.id || c.base || ''};
      var messages={'rate-limited':'풀이 요청 횟수 한도에 도달했습니다. 한도가 갱신된 뒤 이 장을 다시 생성해 주세요.','cost-limit':'설정된 요청당 비용 상한 때문에 생성을 중단했습니다. 관리자 설정을 확인해 주세요.','server-timeout':'풀이 생성·검수 응답 시간이 초과됐습니다. 이 장을 다시 생성해 주세요.','ai-unavailable':'AI 생성·검수 서비스를 완료하지 못했습니다. 잠시 후 다시 생성해 주세요.','insufficient-evidence':'이 장에 연결할 수 있는 풀이 근거가 부족합니다. 근거를 확인한 뒤 다시 생성해 주세요.','no-ai':'풀이 생성 서비스가 설정되지 않았습니다. 관리자에서 AI 연결을 확인해 주세요.'};
      c.readingNotice='검수된 풀이를 불러오지 못했습니다. 잠시 후 이 장 다시 불러오기를 눌러 주세요.';
      c.readingNotice+=' (오류: '+c.readingWarning+(c.readingFailure.requestId?' / 요청 '+c.readingFailure.requestId:'')+')';
      c.readingDeferred=true;c.interpretationAnalysis=null;c.readingProvider=null;c.chapterHook=null;
      c.chapterQuality={ok:false,issues:[],semanticReviewStatus:'not-accepted'};
      c.readingParagraphs=deferred.paragraphs;c.readingEvidence=[];
      c.readingFullText=deferred.paragraphs.map(function(p){return p.text;}).filter(Boolean).join('\n\n');
      deferred.paragraphs.forEach(function(p){job.targets[Number(p.id)](p.text);});
      status.failed++;
      if(onReady)onReady(c,job,deferred);
    }
    async function run(item) {
      if (session.cancelled || item.started) return;
      item.started=true;
      var job = item.job;
      var education=await localHealth(item.c);if(session.cancelled)return;
      if(education){
        var c=item.c,escape=function(t){return String(t).replace(/[&<>"']/g,function(x){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x];});};
        c.readingNotice='일반 건강·안전 안내입니다. 개인의 건강 상태나 사고를 예측하는 풀이가 아닙니다.';
        c.readingDeferred=false;c.readingProvider='local-reviewed-education';c.interpretationAnalysis=null;c.readingEvidence=[];
        c.readingParagraphs=education.row.paragraphs.map(function(p,i){return {id:String(i),text:p.text,refs:[],claim_ids:[]};});
        c.readingEducationSources=education.sources.filter(function(s){return education.row.sourceIds.indexOf(s.id)>=0;});
        c.readingFullText=c.readingParagraphs.map(function(p){return p.text;}).join('\n\n');
        c.chapterQuality={ok:true,semanticReviewStatus:'educational-ai-reviewed',personalizedEvidenceAccepted:false,expertApproved:false};
        var supplementary=c.scenes.filter(function(s){return s.readingSupplementary;});
        c.scenes=[{sceneId:c.id+'_education_notice',sceneType:'life',html:'<section class="scene rd-prose"><p class="lead"><strong>'+escape(c.readingNotice)+'</strong></p></section>'}].concat(c.readingParagraphs.map(function(p,i){return {sceneId:c.id+'_education_'+i,sceneType:'life',html:'<section class="scene rd-prose"><p class="lead">'+escape(p.text)+'</p></section>'};}));
        c.scenes.push({sceneId:c.id+'_education_sources',sceneType:'life',html:'<section class="scene rd-prose"><details class="reading-evidence"><summary>일반 안내의 출처와 한계</summary>'+education.row.sourceIds.map(function(id){var s=education.sources.find(function(x){return x && x.id===id;});if(!s)return '';var url=s.url && /^https:\/\//.test(s.url)?s.url:null;return '<p>'+(url?'<a href="'+escape(url)+'" target="_blank" rel="noopener noreferrer">'+escape(s.title)+'</a>':escape(s.title))+'<br>'+escape(s.scope)+(s.limitations?'<br>'+escape(s.limitations):'')+'</p>';}).join('')+'<p>일반 교육 초안의 AI 품질 검수 결과입니다. 전문가 승인이나 개인 건강·사고 판단 근거를 뜻하지 않습니다.</p></details></section>'});
        c.scenes=c.scenes.concat(supplementary);
        status.completed++;if(onReady)onReady(c,job,{paragraphs:c.readingParagraphs});return;
      }
      if (!job.chapter.paragraphs.length) {status.skipped=(status.skipped || 0)+1;return;}
      if (job.chapter.paragraphs.length > 60) { defer(item,null,'composition-limit');return; }
      if(unavailable){defer(item,unavailable);return;}
      var ctl = root.AbortController ? new root.AbortController() : null, timer;
      var deadline = new Promise(function(resolve,reject){timer=root.setTimeout(function(){if(ctl)ctl.abort();var e=new Error('reading timeout');e.name='AbortError';reject(e);},90000);});
      if (ctl) session.controllers.push(ctl);
      try {
        var response = await Promise.race([readingResponse({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ realityContext:R.Editorial?R.Editorial.cleanContext(rep.realityContext):{}, guide: guide, directnessConsent: root.document && root.document.getElementById("directnessConsent") && root.document.getElementById("directnessConsent").checked ? 5 : null, sd: safe, outline: outline, chapter: job.chapter, usedAdviceKeys: chapters.filter(function(c){return c.id!==item.c.id;}).flatMap(function(c){return c.readingAdviceKeys||[];}).slice(-512), adviceHistory: adviceHistory(chapters,item.c.id,name), previous: Array.from(acceptedTexts.entries()).filter(function(x){var prior=chapters.find(function(c){return c.id===x[1];});return prior && (!item.c.editorialTopicId || prior.editorialTopicId===item.c.editorialTopicId) && !(prior.readingParagraphs || []).some(function(p){return p.text===x[0] && p.role==='evidence';});}).slice(-8).map(function(x){return {text:name?x[0].split(name).join('본인'):x[0],chapter:x[1],title:(chapters.find(function(c){return c.id===x[1];}) || {}).title || ''};}) }), signal: ctl && ctl.signal },session,item.c),deadline]);
        var r=response.r;
        var d=response.d;
        if(session.cancelled)return;
        if(d && d.error==='no-ai')unavailable={error:d.error};
        if (r.ok && d && d.ok && (d.provider==='reviewed-library' || uniqueAcross(d.result, acceptedTexts, item.c.id,item.c)) && apply(job, d.result)) {
          item.c.readingDeferred=false;item.c.readingNotice='';item.c.readingFailure=null;item.c.readingWarning=null;
          item.c.readingProvider=d.provider;item.c.readingAdviceKeys=d.adviceKeys||[];item.c.readingPendingRoles=d.pending||[];item.c.readingNotice=d.scopeNotice||(d.pending&&d.pending.length?'검수된 근거를 조합한 풀이입니다. 일부 항목은 문장을 보완하고 있습니다.':'');item.c.chapterHook=d.hook || null;item.c.chapterQuality=d.chapterQuality || null;item.c.hookName=name || '귀인';
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
      } catch (e) { if(!session.cancelled)defer(item,null,e && e.name==='AbortError'?'server-timeout':e instanceof SyntaxError?'server-response-invalid':'server-communication-failed'); }
      finally {root.clearTimeout(timer);if(ctl)session.controllers=session.controllers.filter(function(c){return c!==ctl;});}
    }
    // 첫 챕터를 준비한 뒤 표시하고, 후속 챕터는 미리 준비한다. 현재 DOM은 다시 그리지 않는다.
    // Generate only the chapter the user is reading. Never fill the report in the background.
    // One in-flight request per session; quick navigation keeps only the latest queued selection.
    var running=false, selected=null, runningPromise=Promise.resolve();
    function pump(){
      if(session.cancelled || running || !selected)return;
      var item=selected;selected=null;if(item.started)return;
      running=true;runningPromise=run(item).finally(function(){running=false;pump();});
    }
    // An explicit novel view may need several chapters. Reuse the same one-request lane and accepted results.
    session.ensure=async function(ids){
      for(var id of ids){
        if(session.cancelled)return false;
        while(running){await runningPromise;if(session.cancelled)return false;}
        var item=jobs.find(function(x){return x.c.id===id;});if(!item)return false;
        if(!item.started){running=true;runningPromise=run(item).finally(function(){running=false;pump();});await runningPromise;}
        if(item.c.readingDeferred)return false;
      }return !session.cancelled;
    };
    session.retry=function(id){var item=jobs.find(function(x){return x.c.id===id;});if(!item || !item.c.readingWarning)return;status.failed=Math.max(0,status.failed-1);unavailable=null;item.started=false;item.c.readingWarning=null;item.c.readingFailure=null;item.c.readingNotice='검수된 문안을 다시 불러오고 있습니다.';if(onReady)onReady(item.c,item.job,{paragraphs:[]});selected=item;pump();};
    session.prioritize=function(id){var item=jobs.find(function(x){return x.c.id===id;});if(!item)return;selected=item.started?null:item;pump();};
    return {first:Promise.resolve(),status:status};
  }
  R.FullReading = { ensure:function(ids){return active && !active.cancelled && active.ensure?active.ensure(ids):Promise.resolve(false);}, retry:function(id){if(active && !active.cancelled && active.retry)active.retry(id);}, prioritize:function(id){if(active && !active.cancelled && active.prioritize)active.prioritize(id);}, adviceHistory: adviceHistory, deferredParagraphs: deferredParagraphs, uniqueAcross: uniqueAcross, collect: collect, apply: apply, prepare: prepare };
})(typeof window !== 'undefined' ? window : globalThis);
