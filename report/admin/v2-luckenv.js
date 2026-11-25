/* 관리자 "운세 환경 문구" 탭 — ① 환경 해석 문구의 게시(체크 후 일괄 게시·수정 후 저장하고 게시·되돌리기) ② 통합 운세 시뮬레이터(해석 추적)
   API: /api/luck-phrases. 화면에서는 "게시" 한 번으로 끝나고(내부적으로 승인+게시), 게시한 문구만 사용자 화면에 반영된다. 수정하면 게시본에서 즉시 빠진다.
   시뮬레이터는 브라우저에서 engine.js·luck-interpret.js를 그대로 써서 사용자 화면과 같은 결과를 보여 주며, 서버에 아무것도 저장하지 않는다. */
(function () {
  'use strict';
  var pw = '', root, M = window.Manse, LI = window.MantraLuckInterpret, RG = window.MantraRegion;
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var BASE = {};
  var S = { flags: null, items: {}, phrases: [], version: 0, f: { type: '', status: '', q: '' }, cur: null, sel: {} };
  var ST = { draft: '미게시', reviewed: '미게시', published: '게시됨' }, FST = { unpub: '미게시', published: '게시됨' }, TYPE = { core: '핵심 기운', scene: '상황', good: '유리 조건', bad: '불리 조건', act: '대응', sixHook: '시기 첫 문장', sixBody: '시기 설명', sixDo: '시기 할 일', sixTrap: '시기 함정' };
  var stOf = function (id) { return (S.items[id] && S.items[id].status) || 'draft'; };
  var txOf = function (p) { return (S.items[p.id] && S.items[p.id].text) || p.text; };
  function call(method, qs, body) {
    var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
    return fetch('/api/luck-phrases' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); });
  }
  function msg(t, bad) { var m = $('#leMsg'); if (m) { m.textContent = t; m.style.color = bad ? '#FF8A78' : '#62C2AE'; } }
  function load(note) {
    return call('GET', '?all=1').then(function (d) {
      if (!d._ok) { root.innerHTML = '<div class="card"><p class="muted">' + esc(d.error || '불러오지 못했습니다') + '</p></div>'; return; }
      S.items = d.items || {}; S.phrases = d.phrases || []; S.version = d.version || 0;
      return fetch('/api/luck-flags', { cache: 'no-store' }).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }).then(function (f) { S.flags = f; draw(); if (note) msg(note); });
    });
  }
  function counts() { var c = { published: 0, unpub: 0 }; S.phrases.forEach(function (p) { c[stOf(p.id) === 'published' ? 'published' : 'unpub']++; }); return c; }
  function visible() {
    var f = S.f;
    return S.phrases.filter(function (p) { var pub = stOf(p.id) === 'published'; return (!f.type || p.type === f.type) && (!f.status || (f.status === 'published' ? pub : !pub)) && (!f.q || (p.id + txOf(p)).indexOf(f.q) >= 0); });
  }
  var selIds = function () { return Object.keys(S.sel).filter(function (k) { return S.sel[k]; }); };
  function bulk(ids, op) {
    if (!ids.length) return;
    var pubWord = op === 'publish';
    if (!confirm(ids.length + '건을 ' + (pubWord ? '게시' : '게시 취소') + '합니다.' + (pubWord ? '\n게시한 문구는 사용자 화면의 해석에 그대로 쓰입니다(운세 환경 해석 기능이 꺼져 있으면 아직 보이지 않습니다).\n내용을 확인하셨나요?' : '\n사용자 화면은 기본 문구로 돌아갑니다.'))) return;
    var chunks = [], i; for (i = 0; i < ids.length; i += 200) chunks.push(ids.slice(i, i + 200));
    var done = 0, skipped = 0, failed = [];
    chunks.reduce(function (p, ch) { return p.then(function () { return call('PUT', '', { action: 'bulk', ids: ch, op: op }).then(function (d) { if (!d._ok) failed.push({ id: '(요청)', error: d.error || '실패' }); else { done += d.done; skipped += d.skipped; failed = failed.concat(d.failed || []); } }); }); }, Promise.resolve())
      .then(function () { S.sel = {}; load((pubWord ? '게시 ' : '게시 취소 ') + done + '건' + (skipped ? ' · 이미 처리됨 ' + skipped + '건' : '') + (failed.length ? ' · 실패 ' + failed.length + '건: ' + failed.slice(0, 3).map(function (x) { return x.id + ' (' + x.error + ')'; }).join(', ') : '')); });
  }
  function draw() {
    var c = counts(), f = S.f, list = visible(), shown = list.slice(0, 200), n = selIds().length, allSel = shown.length && shown.every(function (p) { return S.sel[p.id]; });
    var fl = S.flags, on = fl && fl.interpret && fl.timeline && fl.region, part = fl && !on && (fl.interpret || fl.timeline || fl.region);
    var flagBox = '<div class="card"><h3 style="margin:0 0 6px;color:var(--gold)">운세 환경 신기능 공개 스위치</h3>' +
      '<p style="margin:0 0 8px">현재: <b style="color:' + (on ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '상태를 불러오지 못했습니다' : on ? '● 켜짐 — 모든 사용자에게 보입니다' : part ? '◐ 일부만 켜짐' : '○ 꺼짐 — 사용자에게 보이지 않습니다') + '</b>' + (fl && fl.at ? ' <span class="muted">(마지막 변경 ' + esc(fl.at.slice(0, 16).replace('T', ' ')) + (fl.by ? ' · ' + esc(fl.by) : '') + ')</span>' : '') + '</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leFOn">모두 켜기</button><button class="btn" id="leFOff">모두 끄기</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 환경 해석 카드·환경 변화 타임라인·나의 운명 지도가 <b>약 1분 안에</b> 모든 사용자의 운세 흐름 탭에 나타나고, 끄면 같은 방식으로 사라집니다(코드 배포 필요 없음). 아직 게시하지 않은 문구는 기본 문구로 보입니다. 큰 문제가 생기면 [모두 끄기]를 누르세요.</p>' +
      // 타임라인 카드 문안은 [모두 켜기]에 묶지 않고 따로 켠다(functions/api/luck-flags.js ALL_ON)
      '<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:12px 0"><p style="margin:0 0 8px"><b>운명의 타임라인 카드 문안</b> — 현재: <b style="color:' + (fl && fl.timelineCopy ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.timelineCopy ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leTC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.timelineCopy ? '타임라인 문안 끄기' : '타임라인 문안 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운명의 타임라인 카드(대운·세운·월운) 맨 위에 시기 첫 문장·설명·할 일·함정이 <b>약 1분 안에</b> 나타납니다. 아래 목록에서 유형 "시기 첫 문장 / 시기 설명 / 시기 할 일 / 시기 함정"으로 걸러 먼저 검수·게시하세요. [모두 켜기·끄기]와는 따로 움직입니다.</p>' +
      '<hr style="border:0;border-top:1px solid rgba(255,255,255,.1);margin:12px 0"><p style="margin:0 0 8px"><b>무빙툰 주제 심화 블록</b> — 현재: <b style="color:' + (fl && fl.topicDeep ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.topicDeep ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leTD"' + (fl ? '' : ' disabled') + '>' + (fl && fl.topicDeep ? '주제 심화 끄기' : '주제 심화 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 무빙툰 재물운·커리어운·인연운·개운법 장에 그래프 지표(횡재·사업·이직·결혼 등) 10년 그래프, 직업 TOP 10·업종·수익 유형 순위, 궁합(저장한 상대), 거주·사업장 방향과 지역 TOP 5, 우리 집 현공풍수, 소원성취 명당 순위가 <b>약 1분 안에</b> 붙습니다.</p></div>';
    // 운명의 타임라인 서사 엔진(report/v2/life-narrative.js) 스위치 — 따로 켜고 끈다. 사주별 미리보기·검수는 tools/life-narrative-preview.cjs
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 서사 엔진(59장)</b> — 현재: <b style="color:' + (fl && fl.lifeNarrative ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.lifeNarrative ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leLN"' + (fl ? '' : ' disabled') + '>' + (fl && fl.lifeNarrative ? '서사 엔진 끄기' : '서사 엔진 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 종합풀이 14장(기질·인생 흐름·최고와 최악·사용설명서·움직일 때·강점과 약점·맞는 업·인연운·배우자·재물운·재물 그릇·말년운·자식운·개운법), 재물운 심화 15장 전체, 인연운 심화 15장 전체, 커리어운 심화 15장 전체의 본문이 복합 규칙 서사(핵심 성향→생활→갈등→운의 변화→조언)로 바뀝니다. 맞는 규칙이 없는 사주는 기존 문안 그대로입니다. 끄면 약 1분 안에 원래대로 돌아갑니다(DB 변경 없음).</p></div>';
    // 운세 흐름 오행 흐름 상자(engine.js elementFlow) 스위치 — 따로 켜고 끈다. 표시 전용이라 점수는 바뀌지 않는다
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운세 흐름 오행 흐름 상자</b> — 현재: <b style="color:' + (fl && fl.elementFlow ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.elementFlow ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leEF"' + (fl ? '' : ' disabled') + '>' + (fl && fl.elementFlow ? '오행 흐름 끄기' : '오행 흐름 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운세 흐름 탭에서 대운·세운을 눌렀을 때 그 운의 오행이 원국과 어떻게 이어지는지(순생·통관·제압·극·설기·막힘·엇갈림) 한 줄 판정, 생(초록)·극(빨강) 화살표가 그려진 미니 오각형, 이 운이 만드는 구조(식신제살·군겁쟁재 등)가 <b>약 1분 안에</b> 나타납니다. 설명용이라 점수는 바뀌지 않고, 끄면 같은 방식으로 사라집니다.</p></div>';
    // 운세 흐름 오행 사이클(luck-cycle.js) 스위치 — 대운 30년·세운 2년 묶음. 표시 전용이라 점수는 바뀌지 않는다
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운세 흐름 오행 사이클(30년·2년 묶음)</b> — 현재: <b style="color:' + (fl && fl.luckCycle ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.luckCycle ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leLC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.luckCycle ? '오행 사이클 끄기' : '오행 사이클 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운세 흐름 탭의 대운 그래프에 30년 묶음(장기 분석 구간) 표시와 요약 카드(오행 변화·상승 하락·전환점·기회와 위험·대응 전략), 세운 10년 타일에 천간 오행이 같은 2년 묶음(천간 오행 구간)과 2년 전략 카드가 <b>약 1분 안에</b> 나타납니다. 월운·일진은 그대로입니다. 문장은 사전 문구 조합(AI 없음)이고 점수는 바뀌지 않습니다.</p></div>';
    // 운명의 타임라인 건강·사고수 상세 장(report/v2/health-chapters.js) 스위치 — 엔진 값으로 만든 장 6개. 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 건강·사고수 장(6장)</b> — 현재: <b style="color:' + (fl && fl.healthChapters ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.healthChapters ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leHC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.healthChapters ? '건강·사고수 장 끄기' : '건강·사고수 장 켜기') + '</button><a class="btn" href="/report/v2/?mantraFlags=healthChapters" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 종합풀이 \'건강 및 사고수\' 장 바로 뒤에 \'내 몸의 오행 지도\'·\'나는 언제 쉽게 지칠까?\'·\'스트레스가 몸으로 오는 길\'·\'올해·이번 달 몸 챙길 때\'·\'사고수 신호 읽기\'·\'앞으로 10년 안전 흐름과 삼재\' 6장이 <b>약 1분 안에</b> 나타납니다. 건강 지도·사고수 참고·건강/사고 지수·삼재 계산으로 만든 문장(AI·DB 문안 없음)이고, 장마다 의학적 진단·사고 예측이 아니라는 안내가 붙습니다. 점수는 바뀌지 않습니다.</p></div>';
    // 프리미엄 심화 층(2026-11-17, report/v2/premium-depth.js): 서사 59장에 내면의 구조·양면성과 반전·알아보는 장면·내게 맞는 한 가지를 더한다
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 프리미엄 심화 층(59장)</b> — 현재: <b style="color:' + (fl && fl.premiumDepth ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.premiumDepth ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="lePD"' + (fl ? '' : ' disabled') + '>' + (fl && fl.premiumDepth ? '심화 층 끄기' : '심화 층 켜기') + '</button><a class="btn" href="/report/v2/?mantraFlags=premiumDepth" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 서사 59장(종합·재물·커리어·인연)마다 <b>내면의 구조</b>(그 사주의 실제 기운 비율·필요한 기운), <b>양면성과 반전·함께 보는 조건</b>(겹친 조건별 문단 + 알아보는 생활 장면 한 줄), <b>내게 맞는 한 가지</b>(필요한 기운별 결론 + 다음 장 연결)가 <b>약 1분 안에</b> 붙습니다. 규칙 기반 사전 문안(AI 호출 없음)이고 점수·계산은 바뀌지 않습니다. 장마다 맞는 조건이 없으면 붙지 않습니다. 문안은 초안이라 켜기 전에 미리보기 주소로 확인해 주세요.</p></div>';
    // 오행 겹쳐 보기(2026-11-18, luck-overlay.js): 운세 흐름 대운·세운·월운·일진 상세에 원국 위로 층을 쌓은 오행 비율·층별 풀이·그래프 비교 — 스위치 + 층 무게
    var ow = (fl && fl.overlayWeights) || { daeun: 1, seun: 0.7, wolun: 0.4, ilun: 0.2 }, owIn = function (k, nm) { return '<label class="small" style="display:inline-flex;gap:4px;align-items:center;margin-right:10px">' + nm + ' <input type="number" id="leOW_' + k + '" min="0" max="2" step="0.05" value="' + ow[k] + '" style="width:64px"' + (fl ? '' : ' disabled') + '></label>'; };
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운세 흐름 오행 겹쳐 보기</b> — 현재: <b style="color:' + (fl && fl.luckOverlay ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.luckOverlay ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leOL"' + (fl ? '' : ' disabled') + '>' + (fl && fl.luckOverlay ? '겹쳐 보기 끄기' : '겹쳐 보기 켜기') + '</button><a class="btn" href="/?mantraFlags=luckOverlay" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<div style="margin-top:10px">' + owIn('daeun', '대운') + owIn('seun', '세운') + owIn('wolun', '월운') + owIn('ilun', '일진') + '<button class="btn" id="leOLW"' + (fl ? '' : ' disabled') + '>층 무게 저장</button> <button class="btn" id="leOLR"' + (fl ? '' : ' disabled') + '>기본값</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력 운세 흐름에서 대운·세운·월운·일진을 누를 때 <b>오행 겹쳐 보기</b> 상자가 나옵니다: 원국 위에 대운 → 세운 → 월운 → 일진을 차례로 쌓은 오행 비율(층 단추·오각형 고리·막대), 층별 한 줄 풀이, 그래프 막대와 같은/다른 방향인지와 그 이유. 설명용이라 흐름 점수·그래프는 바뀌지 않습니다. 층 무게(0~2)는 운 한 기둥(천간 1 + 지장간 비율 1 = 2점)을 원국에 얼마나 크게 더할지 정합니다 — 기본 대운 1 · 세운 0.7 · 월운 0.4 · 일진 0.2.</p></div>';
    // 십성 작용 분석(2026-11-18, ten-god-roles.js): 오행·강약 탭 카드 + 운세 흐름 상세 '원국과 운의 상호작용' — 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>십성 작용 분석</b> — 현재: <b style="color:' + (fl && fl.tenGodRoles ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.tenGodRoles ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leTG"' + (fl ? '' : ' disabled') + '>' + (fl && fl.tenGodRoles ? '십성 작용 분석 끄기' : '십성 작용 분석 켜기') + '</button><a class="btn" href="/?mantraFlags=tenGodRoles" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력 <b>오행·강약 탭</b>에 “십성 작용 분석” 카드(비겁·식상·재성·관성·인성 5종을 세력·역할·실제 작용으로 한눈에 비교, 누르면 상세)와 상호작용 구조 11종(식상생재·재생관·관인상생·살인상생·식신제살·상관견관·상관패인·재극인·도식·관살혼잡·비겁쟁재)의 성립/유불리가, <b>운세 흐름</b> 대운·세운·월운·일진 상세에 “원국과 운의 상호작용”(들어온 십성의 억부·조후·통합 역할, 구조의 신규 형성·강화·약화·해소, 감당 능력, 재물·커리어·인연)이 <b>약 1분 안에</b> 나타납니다. 설명용이라 강약·용신·흐름 점수·그래프는 바뀌지 않습니다.</p></div>';
    // 특기·적성 장(2026-11-25, report/v2/aptitude-chapters.js): 운명의 타임라인 종합풀이 1장·커리어운 심화 2장 + 커리어 기존 장 연결 블록 2개
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 특기·적성 장(3장)</b> — 현재: <b style="color:' + (fl && fl.aptChapters ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.aptChapters ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leAC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.aptChapters ? '특기·적성 장 끄기' : '특기·적성 장 켜기') + '</button><a class="btn" href="/report/v2/?mantraFlags=aptChapters" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운명의 타임라인에 <b>종합풀이</b> “내 손이 먼저 가는 일 — 특기와 끌리는 활동”(타고난 강점과 맞는 일 뒤), <b>커리어운 심화</b> “내 특기가 일에서 무기가 되는 방식”(내 재능의 값 뒤)·“일 밖에서 날을 세우는 법 — 재충전과 사이드 프로젝트”(앞으로 10년 일의 흐름 그래프 뒤)가 들어가고, ‘일하는 방식 성향’ 장 끝에 짧은 연결 블록이, 재물운 심화 ‘이렇게 벌면 편해요’ 끝에 “특기가 돈이 되는 구조”(20세 미만 제외)·‘돈이 새는 자리 점검’ 끝에 “취미에 나가는 돈 점검”이, 종합풀이 ‘인연이 열리는 곳 · 순위’ 끝에 “활동으로 넓히는 만남 자리”가 붙고, 인연운 심화 ‘그 사람과 나의 궁합’ 결과에 “두 사람이 함께 하면 좋은 활동”이 나옵니다. 만세력 특기·적성 탭과 같은 계산이며 표시 전용입니다.</p></div>';
    // 특기·적성(2026-11-25, aptitude.js): 만세력 새 탭 — 특기 5영역·적성 6분야·운동·스포츠 상세·최종 추천, 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>특기·적성 분석</b> — 현재: <b style="color:' + (fl && fl.aptitude ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.aptitude ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leAPT"' + (fl ? '' : ' disabled') + '>' + (fl && fl.aptitude ? '특기·적성 끄기' : '특기·적성 켜기') + '</button><a class="btn" href="/?mantraFlags=aptitude" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력에 <b>특기·적성</b> 탭이 생깁니다: 종합 특기·적성 → 특기 5영역(표현·창작/기술·숙련/신체 활동/분석·탐구/경쟁·전략) → 적성 6분야 → 운동·스포츠 상세(성향 6·활동 방식 5축·종목 6분야) → 최종 추천(활동 3~5개·장기 숙련·보완 성향). 엔진 결과를 읽기만 하는 표시 전용이며, 실력·건강을 판단하지 않습니다. 직업 적성과는 따로입니다.</p></div>';
    // 여러 명 궁합(2026-11-25, compat-group.js): 만세력 궁합 탭 '두 사람 / 여러 명' 전환, 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>여러 명 궁합(무리 궁합)</b> — 현재: <b style="color:' + (fl && fl.groupCompat ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.groupCompat ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leGC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.groupCompat ? '여러 명 궁합 끄기' : '여러 명 궁합 켜기') + '</button><a class="btn" href="/?mantraFlags=groupCompat" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력 <b>궁합 탭</b> 위에 “두 사람 / 여러 명” 전환이 생깁니다. 여러 명을 고르면 나와 최근 본 사람 중 3~6명을 함께 놓고 관계 지도(모든 두 사람 조합의 궁합 점수)·기운 방향(누가 누구를 받쳐 주고 누구의 기준이 무겁게 느껴지는지)·무리의 오행 균형·이어 주는 사람·앞으로 12달 함께 좋은 달과 예민한 달을 보여 줍니다. 두 사람 궁합 계산을 그대로 모아 보는 표시 전용이며, 다른 사람 생년월일은 지금처럼 그 기기에만 저장됩니다.</p></div>';
    // 뚜렷한 신호 자동 알림(2026-11-18, luck-alerts.js): 만세력 상단(9분야)에만 — 운명의 타임라인 알림은 2026-11-20 제거
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>뚜렷한 신호 자동 알림</b> — 현재: <b style="color:' + (fl && fl.luckAlerts ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.luckAlerts ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leAL"' + (fl ? '' : ' disabled') + '>' + (fl && fl.luckAlerts ? '자동 알림 끄기' : '자동 알림 켜기') + '</button><a class="btn" href="/?mantraFlags=luckAlerts" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 오늘부터 7일과 이번 달 중 <b>이 사주의 평소 분포에서 상위·하위 1%(월운 5%)이면서 신호등이 최고·부담</b>인 분야만 상단 알림으로 띄웁니다. 만세력은 인연·재물·직업·사업·취업·가족·자녀·횡재수·손재수(최대 4개)만 띄웁니다(운명의 타임라인에는 띄우지 않음). 사용자가 \'오늘 닫기\'를 누르면 그날은 다시 뜨지 않습니다. 점수는 엔진 분야 지수 그대로이며 새 점수를 만들지 않습니다.</p></div>';
    // 내 사주 뮤직비디오(2026-11-18, report/v2/music-video.js · /api/music-video): 유료 주제 화면의 진입 카드 — 패널 이미지는 '뮤직비디오 패널' 메뉴
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>내 사주 뮤직비디오</b> — 현재: <b style="color:' + (fl && fl.musicVideo ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.musicVideo ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leMV"' + (fl ? '' : ' disabled') + '>' + (fl && fl.musicVideo ? '뮤직비디오 끄기' : '뮤직비디오 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 <b>유료 주제</b> 풀이 화면 위쪽에 “내 사주 뮤직비디오” 카드가 나오고, 그 주제를 산 회원이 누르면 사주 조합 랩 가사로 일레븐랩스가 3분 노래를 만듭니다(곡마다 비용, 같은 사주는 다시 만들지 않음). 노래 키(ELEVENLABS_API_KEY)와 패널 이미지(점검·운영 › 뮤직비디오 패널)를 먼저 준비하세요.</p></div>';
    // 운 공통 분석 층(2026-11-18, luck-env.js): 운세 상세를 ① 외부 환경 ② 개인 영향 ③ 상위·하위 운 ④ 영역으로 나눔 — 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운 공통 분석(외부 환경·개인 반응 분리)</b> — 현재: <b style="color:' + (fl && fl.luckEnv ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.luckEnv ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leEV"' + (fl ? '' : ' disabled') + '>' + (fl && fl.luckEnv ? '운 공통 분석 끄기' : '운 공통 분석 켜기') + '</button><a class="btn" href="/?mantraFlags=luckEnv" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력 운세 흐름에서 대운·세운·월운·일진을 눌렀을 때 상세 화면이 네 칸으로 나뉩니다: <b>① 외부 환경의 오행 흐름</b>(원국·용신 없이 간지·지장간·간지 안 관계·월령 왕상휴수사·상위 운과의 합충·앞뒤 시기 변화, 모두에게 같음), <b>② 내 사주에 미치는 영향</b>(전환 점검 + 기존 해석·십성·근거 상자), <b>③ 상위 운과 하위 운</b>(층별 도움/부담 방향 비교 + 오행 겹쳐 보기), <b>④ 영역별 영향</b>. 전환 점검은 원국 역할이 뒤집히거나 일지·월지와 새 충·합, 십성 구조 변화가 있을 때만 큰 전환으로 올립니다. 점수·그래프는 바뀌지 않습니다.</p></div>';
    // 시대 흐름(2026-11-18, macro-era.js·macro-era-bridge.js): 만세력 운세 흐름 맨 위 삼원구운 20년 시대 카드 + 대운 카드의 장기 운세 요약 — 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>시대 흐름(삼원구운)</b> — 현재: <b style="color:' + (fl && fl.macroEra ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.macroEra ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leME"' + (fl ? '' : ' disabled') + '>' + (fl && fl.macroEra ? '시대 흐름 끄기' : '시대 흐름 켜기') + '</button><a class="btn" href="/?mantraFlags=macroEra" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 만세력 <b>운세 흐름</b> 맨 위에 모든 사람에게 같은 <b>시대 흐름</b> 카드(삼원구운 20년: 지금 9운 구자 화 2024~2043, 앞뒤 시대, 전통 상징과 시대 환경 해석을 나눠 표시)와 그 시대를 이 사주가 받아들이는 방식(원국 역할·지금 대운·올해 세운·영역·대응 방향)이 나옵니다. 시대 오행은 용신을 바꾸지 않고 점수에도 들어가지 않습니다. 오자원·공간대운은 근거 확인 전이라 결과 없이 ‘연구 대기’로만 표시합니다. 30년 구간 판정은 이 스위치와 상관없이 대운 카드의 <b>장기 운세 요약</b>(대운 3개를 순서대로)으로 바뀌었습니다.</p></div>';
    // 인연의 광장 벚꽃 테마(community/theme-sakura.css·theme-sakura.js) 스위치 — 광장 겉모습만 바꾼다(2026-11-17)
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>인연의 광장 벚꽃 테마</b> — 현재: <b style="color:' + (fl && fl.sakuraTheme ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.sakuraTheme ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leSK"' + (fl ? '' : ' disabled') + '>' + (fl && fl.sakuraTheme ? '벚꽃 테마 끄기' : '벚꽃 테마 켜기') + '</button></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 인연의 광장이 타임라인 안개 테마와 같은 결(밝은 바탕·흰 카드·먹색 글씨)에 <b>벚꽃 포인트</b>(진분홍 강조·새벽빛 머리·흩날리는 꽃잎)로 <b>약 1분 안에</b> 바뀝니다. 기능·글은 그대로이고 겉모습만 바뀝니다. 이 기기에서만 미리 보려면 광장 주소 뒤에 <code>?sakura=1</code>, 되돌리려면 <code>?sakura=auto</code>.</p></div>';
    // 밝은 안개 테마(report/hub/theme-mist.css·theme-mist.js) 스위치 — 운명의 타임라인·일진 캘린더·무료 타로의 겉모습만 바꾼다(2026-11-16)
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>밝은 안개 테마(타임라인·일진 캘린더·무료 타로)</b> — 현재: <b style="color:' + (fl && fl.mistTheme ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.mistTheme ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leMT"' + (fl ? '' : ' disabled') + '>' + (fl && fl.mistTheme ? '안개 테마 끄기' : '안개 테마 켜기') + '</button><a class="btn" href="/report/?mist=1#/timeline" target="_blank" rel="noopener">이 기기에서만 미리보기</a><a class="btn" href="/report/?mist=auto#/timeline" target="_blank" rel="noopener">미리보기 해제</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 운명의 타임라인·일진 캘린더·무료 타로가 먹빛 화면에서 <b>밝은 안개 화면</b>(새벽 산안개 바탕·흰 한지 카드·먹색 글씨·붉은 낙관)으로 <b>약 1분 안에</b> 바뀝니다. 글자·계산·점수는 그대로이고 겉모습만 바뀝니다. 다른 화면(입력·영상·무빙툰)은 그대로입니다. \'이 기기에서만 미리보기\'는 스위치와 상관없이 지금 기기에만 켜고, \'미리보기 해제\'로 스위치를 따르게 되돌립니다.</p></div>';
    // 운명의 타임라인 오행 흐름·격국 상세 풀이 장(report/v2/flow-chapters.js) 스위치 — 엔진 값으로 만든 장 5개. 표시 전용
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>운명의 타임라인 오행 흐름·격국 장(5장)</b> — 현재: <b style="color:' + (fl && fl.flowChapters ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.flowChapters ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leFC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.flowChapters ? '흐름·격국 장 끄기' : '흐름·격국 장 켜기') + '</button><a class="btn" href="/report/v2/?mantraFlags=flowChapters" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 종합풀이 \'나의 타고난 기질\' 뒤에 \'내 사주의 기운은 어떻게 흐를까?\'·\'내 사주의 뼈대, 격국과 주요 구조\', 재물운·커리어운·인연운 심화 첫 장 뒤에 각 주제의 \'○○의 기운은 어떻게 흐를까?\' 장이 <b>약 1분 안에</b> 나타납니다. 만세력의 오행 흐름·격국 판정 값으로 만든 문장(AI·DB 문안 없음)이고 점수·용신은 바뀌지 않습니다. 미리보기 주소는 로컬·미리보기 배포에서만 스위치 없이 켜집니다.</p></div>';
    // 60갑자 일주 적합도 2판(compat-day.js) 스위치 — 오행·강약 탭 '나와 잘 맞는 상대 일주'와 무빙툰 일주 궁합의 계산을 바꾼다. 설계: docs/DAY_PILLAR_COMPAT_PLAN_2026-11-16.md
    flagBox += '<div class="card" style="margin-top:12px"><p style="margin:0 0 8px"><b>60갑자 일주 적합도 2판</b> — 현재: <b style="color:' + (fl && fl.dayCompat ? '#62C2AE' : '#E0BC74') + '">' + (!fl ? '알 수 없음' : fl.dayCompat ? '● 켜짐' : '○ 꺼짐') + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><button class="btn" id="leDC"' + (fl ? '' : ' disabled') + '>' + (fl && fl.dayCompat ? '일주 적합도 2판 끄기' : '일주 적합도 2판 켜기') + '</button><a class="btn" href="/?mantraFlags=dayCompat" target="_blank" rel="noopener">미리보기 주소</a></div>' +
      '<p class="muted" style="margin:8px 0 0">켜면 오행·강약 탭 \'나와 잘 맞는 상대 일주\'와 무빙툰의 일주 궁합(끌림 포함)이 <b>약 1분 안에</b> 새 계산으로 바뀝니다. 통합 용신 하나로 필요한 기운을 보고, 부족한 오행을 무조건 더하지 않으며, 일지 충·형은 맞는 글자의 역할에 따라 조건부로 봅니다. 두 사람 궁합(궁합 탭) 점수와는 별개이고, 끄면 기존 계산으로 돌아갑니다.</p></div>';
    root.innerHTML = flagBox + '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">운세 환경 문구 게시</h3>' +
      '<div style="background:rgba(255,255,255,.05);border-radius:8px;padding:8px 12px;margin:0 0 8px;line-height:1.7"><b>사용법</b><br>① 목록의 문구를 읽어 봅니다.<br>② 괜찮으면 체크하고 <b>[선택 게시]</b>, 전부 괜찮으면 <b>[목록 전체 게시]</b>를 누릅니다.<br>③ 고치려면 문구를 눌러 본문을 수정한 뒤 <b>[저장하고 게시]</b>를 누릅니다.</div>' +
      '<p class="muted" style="margin:0 0 8px">게시한 문구만 사용자 화면에 반영되고, 수정하면 게시본에서 빠집니다(사용자에게는 기본 문구). 단정·반말 표현이나 같은 문구는 저장되지 않습니다. 운세 환경 해석 기능이 꺼져 있으면 게시해도 아직 사용자에게 보이지 않습니다. <b>전체 ' + S.phrases.length + '건 · 게시됨 ' + c.published + ' · 미게시 ' + c.unpub + '</b></p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center"><label>유형 <select id="leT"><option value="">전체</option>' + Object.keys(TYPE).map(function (k) { return '<option value="' + k + '"' + (f.type === k ? ' selected' : '') + '>' + TYPE[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>상태 <select id="leS"><option value="">전체</option>' + Object.keys(FST).map(function (k) { return '<option value="' + k + '"' + (f.status === k ? ' selected' : '') + '>' + FST[k] + '</option>'; }).join('') + '</select></label>' +
      '<label>검색 <input id="leQ" value="' + esc(f.q) + '" style="width:160px"></label></div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-top:8px"><button class="btn" id="leBp"' + (n ? '' : ' disabled') + '>선택 게시 (' + n + ')</button><button class="btn" id="leBu"' + (n ? '' : ' disabled') + '>선택 게시 취소</button>' +
      '<button class="btn" id="leAp"' + (list.length ? '' : ' disabled') + '>목록 전체 게시 (' + Math.min(list.length, 200) + ')</button><button class="btn" id="leAu"' + (list.length ? '' : ' disabled') + '>목록 전체 게시 취소</button><span id="leMsg" class="muted"></span></div>' +
      '<div style="overflow:auto;max-height:340px;margin-top:8px"><table style="width:100%;font-size:.86rem"><thead><tr><th style="width:28px"><input type="checkbox" id="leAll"' + (allSel ? ' checked' : '') + ' aria-label="보이는 문구 전체 선택"></th><th>ID</th><th>유형</th><th>본문</th><th>상태</th></tr></thead><tbody>' +
      shown.map(function (p) { return '<tr data-id="' + esc(p.id) + '" style="cursor:pointer' + (S.cur === p.id ? ';background:rgba(255,255,255,.06)' : '') + '"><td><input type="checkbox" data-ck="' + esc(p.id) + '"' + (S.sel[p.id] ? ' checked' : '') + '></td><td>' + esc(p.id) + '</td><td>' + (TYPE[p.type] || '') + '</td><td>' + esc(txOf(p)) + '</td><td>' + ST[stOf(p.id)] + '</td></tr>'; }).join('') + '</tbody></table></div>' +
      (list.length > 200 ? '<p class="muted">처음 200건만 표시합니다. 필터로 좁혀 주세요.</p>' : '') + '<div id="leEd" style="margin-top:10px"></div></div>' +
      '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 6px;color:var(--gold)">통합 운세 시뮬레이터</h3><div id="leSim"></div></div>';
    function setFlags(v) {
      if (v && !confirm('운세 환경 신기능(해석 카드·타임라인·나의 운명 지도)을 모든 사용자에게 공개합니다.\n지금 게시된 문구만 바뀐 문구로 보이고, 나머지는 기본 문구입니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ on: v }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '켰습니다(약 1분 안에 반영)' : '껐습니다(약 1분 안에 반영)'); });
    }
    $('#leFOn').onclick = function () { setFlags(true); }; $('#leFOff').onclick = function () { setFlags(false); };
    $('#leTD').onclick = function () {   // 무빙툰 주제 심화 블록 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.topicDeep);
      if (v && !confirm('무빙툰 주제 심화 블록(그래프 지표·직업 순위·궁합·풍수·명당)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { topicDeep: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '주제 심화 블록을 켰습니다(약 1분 안에 반영)' : '주제 심화 블록을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leLN').onclick = function () {   // 타임라인 서사 엔진 스위치
      var v = !(S.flags && S.flags.lifeNarrative);
      if (v && !confirm('운명의 타임라인 서사 엔진(59장)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { lifeNarrative: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '서사 엔진을 켰습니다(약 1분 안에 반영)' : '서사 엔진을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leEF').onclick = function () {   // 운세 흐름 오행 흐름 상자 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.elementFlow);
      if (v && !confirm('운세 흐름 오행 흐름 상자(판정·미니 오각형·구조 칩)를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { elementFlow: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '오행 흐름 상자를 켰습니다(약 1분 안에 반영)' : '오행 흐름 상자를 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leLC').onclick = function () {   // 운세 흐름 오행 사이클 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.luckCycle);
      if (v && !confirm('운세 흐름 오행 사이클(대운 30년·세운 2년 묶음)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { luckCycle: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '오행 사이클을 켰습니다(약 1분 안에 반영)' : '오행 사이클을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leHC').onclick = function () {   // 운명의 타임라인 건강·사고수 장 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.healthChapters);
      if (v && !confirm('운명의 타임라인 종합풀이에 건강·사고수 상세 장 6개를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { healthChapters: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '건강·사고수 장을 켰습니다(약 1분 안에 반영)' : '건강·사고수 장을 껐습니다(약 1분 안에 반영)'); });
    };
    var putFlags = function (body, okMsg) {
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify(body) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(okMsg); });
    };
    $('#leAL').onclick = function () {   // 뚜렷한 신호 자동 알림 스위치(luck-alerts.js)
      var v = !(S.flags && S.flags.luckAlerts);
      if (v && !confirm('만세력 상단에 뚜렷한 신호 자동 알림을 모든 사용자에게 띄웁니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { luckAlerts: v } }, v ? '자동 알림을 켰습니다(약 1분 안에 반영)' : '자동 알림을 껐습니다(약 1분 안에 반영)');
    };
    $('#leMV').onclick = function () {   // 내 사주 뮤직비디오 스위치(music-video.js)
      var v = !(S.flags && S.flags.musicVideo);
      if (v && !confirm('유료 주제 화면에 내 사주 뮤직비디오 카드를 띄웁니다. 구매 회원이 누를 때마다 노래 생성 비용이 듭니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { musicVideo: v } }, v ? '뮤직비디오를 켰습니다(약 1분 안에 반영)' : '뮤직비디오를 껐습니다(약 1분 안에 반영)');
    };
    $('#leEV').onclick = function () {   // 운 공통 분석 층 스위치(luck-env.js)
      var v = !(S.flags && S.flags.luckEnv);
      if (v && !confirm('만세력 운세 상세를 외부 환경·개인 영향·상위 하위 운·영역 네 칸으로 나눈 화면을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { luckEnv: v } }, v ? '운 공통 분석을 켰습니다(약 1분 안에 반영)' : '운 공통 분석을 껐습니다(약 1분 안에 반영)');
    };
    $('#leME').onclick = function () {   // 시대 흐름 스위치(macro-era.js)
      var v = !(S.flags && S.flags.macroEra);
      if (v && !confirm('만세력 운세 흐름 맨 위의 시대 흐름(삼원구운) 카드를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { macroEra: v } }, v ? '시대 흐름을 켰습니다(약 1분 안에 반영)' : '시대 흐름을 껐습니다(약 1분 안에 반영)');
    };
    $('#leAC').onclick = function () {   // 특기·적성 장 스위치(report/v2/aptitude-chapters.js)
      var v = !(S.flags && S.flags.aptChapters);
      if (v && !confirm('운명의 타임라인 종합풀이·커리어운 심화에 특기·적성 장 3개와 연결 블록을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { aptChapters: v } }, v ? '특기·적성 장을 켰습니다(약 1분 안에 반영)' : '특기·적성 장을 껐습니다(약 1분 안에 반영)');
    };
    $('#leGC').onclick = function () {   // 여러 명 궁합 스위치(compat-group.js)
      var v = !(S.flags && S.flags.groupCompat);
      if (v && !confirm('만세력 궁합 탭의 여러 명 궁합을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { groupCompat: v } }, v ? '여러 명 궁합을 켰습니다(약 1분 안에 반영)' : '여러 명 궁합을 껐습니다(약 1분 안에 반영)');
    };
    $('#leAPT').onclick = function () {   // 특기·적성 탭 스위치(aptitude.js)
      var v = !(S.flags && S.flags.aptitude);
      if (v && !confirm('만세력의 특기·적성 탭을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { aptitude: v } }, v ? '특기·적성을 켰습니다(약 1분 안에 반영)' : '특기·적성을 껐습니다(약 1분 안에 반영)');
    };
    $('#leTG').onclick = function () {   // 십성 작용 분석 스위치(ten-god-roles.js)
      var v = !(S.flags && S.flags.tenGodRoles);
      if (v && !confirm('만세력 오행·강약 탭의 십성 작용 분석 카드와 운세 흐름 상세의 원국과 운의 상호작용 상자를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { tenGodRoles: v } }, v ? '십성 작용 분석을 켰습니다(약 1분 안에 반영)' : '십성 작용 분석을 껐습니다(약 1분 안에 반영)');
    };
    $('#leOL').onclick = function () {   // 운세 흐름 오행 겹쳐 보기 스위치
      var v = !(S.flags && S.flags.luckOverlay);
      if (v && !confirm('만세력 운세 흐름의 대운·세운·월운·일진 상세에 오행 겹쳐 보기 상자를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      putFlags({ flags: { luckOverlay: v } }, v ? '오행 겹쳐 보기를 켰습니다(약 1분 안에 반영)' : '오행 겹쳐 보기를 껐습니다(약 1분 안에 반영)');
    };
    $('#leOLW').onclick = function () {   // 층 무게 저장(0~2)
      var w = {}, bad = '';
      ['daeun', 'seun', 'wolun', 'ilun'].forEach(function (k) { var v = parseFloat($('#leOW_' + k).value); if (!(v >= 0 && v <= 2)) bad = k; w[k] = v; });
      if (bad) return msg('층 무게는 0~2 사이 숫자로 넣어 주세요', true);
      putFlags({ overlayWeights: w }, '층 무게를 저장했습니다(약 1분 안에 반영)');
    };
    $('#leOLR').onclick = function () { if (confirm('층 무게를 기본값(대운 1 · 세운 0.7 · 월운 0.4 · 일진 0.2)으로 되돌릴까요?')) putFlags({ overlayWeights: { daeun: 1, seun: 0.7, wolun: 0.4, ilun: 0.2 } }, '층 무게를 기본값으로 되돌렸습니다'); };
    $('#lePD').onclick = function () {   // 운명의 타임라인 프리미엄 심화 층 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.premiumDepth);
      if (v && !confirm('운명의 타임라인 서사 59장에 프리미엄 심화 층(내면의 구조·양면성과 반전·알아보는 장면·내게 맞는 한 가지)을 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { premiumDepth: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '프리미엄 심화 층을 켰습니다(약 1분 안에 반영)' : '프리미엄 심화 층을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leDC').onclick = function () {   // 60갑자 일주 적합도 2판 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.dayCompat);
      if (v && !confirm('오행·강약 탭과 무빙툰의 일주 궁합 점수를 새 계산(일주 적합도 2판)으로 바꿉니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { dayCompat: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '일주 적합도 2판을 켰습니다(약 1분 안에 반영)' : '일주 적합도 2판을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leSK').onclick = function () {   // 인연의 광장 벚꽃 테마 스위치
      var v = !(S.flags && S.flags.sakuraTheme);
      if (v && !confirm('인연의 광장을 모든 사용자에게 벚꽃 테마로 보여 줍니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { sakuraTheme: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '벚꽃 테마를 켰습니다(약 1분 안에 반영)' : '벚꽃 테마를 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leMT').onclick = function () {   // 밝은 안개 테마 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.mistTheme);
      if (v && !confirm('운명의 타임라인·일진 캘린더·무료 타로를 모든 사용자에게 밝은 안개 테마로 보여 줍니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { mistTheme: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '안개 테마를 켰습니다(약 1분 안에 반영)' : '안개 테마를 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leFC').onclick = function () {   // 운명의 타임라인 오행 흐름·격국 장 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.flowChapters);
      if (v && !confirm('운명의 타임라인에 오행 흐름·격국 상세 풀이 장 5개를 모든 사용자에게 공개합니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { flowChapters: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '흐름·격국 장을 켰습니다(약 1분 안에 반영)' : '흐름·격국 장을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leTC').onclick = function () {   // 타임라인 카드 문안 스위치(따로 켜고 끈다)
      var v = !(S.flags && S.flags.timelineCopy);
      if (v && !confirm('운명의 타임라인 카드 문안을 모든 사용자에게 공개합니다.\n게시한 문구는 게시본으로, 나머지는 기본 문구로 보입니다.\n켜시겠습니까?')) return;
      var who = ''; try { who = localStorage.getItem('iching_reviewer') || ''; } catch (e) { }
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent(who) }, body: JSON.stringify({ flags: { timelineCopy: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._ok = r.ok; return d; }); })
        .then(function (d) { if (!d._ok) return msg(d.error || '변경하지 못했습니다', true); S.flags = d; draw(); msg(v ? '타임라인 문안을 켰습니다(약 1분 안에 반영)' : '타임라인 문안을 껐습니다(약 1분 안에 반영)'); });
    };
    $('#leT').onchange = function () { S.f.type = this.value; draw(); }; $('#leS').onchange = function () { S.f.status = this.value; draw(); };
    $('#leQ').onchange = function () { S.f.q = this.value.trim(); draw(); };
    $('#leAll').onchange = function () { var on = this.checked; shown.forEach(function (p) { S.sel[p.id] = on; }); draw(); };
    root.querySelectorAll('input[data-ck]').forEach(function (cb) { cb.onclick = function (e) { e.stopPropagation(); S.sel[cb.dataset.ck] = cb.checked; var m = selIds().length; $('#leBp').disabled = $('#leBu').disabled = !m; $('#leBp').textContent = '선택 게시 (' + m + ')'; }; });
    $('#leBp').onclick = function () { bulk(selIds(), 'publish'); }; $('#leBu').onclick = function () { bulk(selIds(), 'unpublish'); };
    $('#leAp').onclick = function () { bulk(shown.map(function (p) { return p.id; }), 'publish'); }; $('#leAu').onclick = function () { bulk(shown.map(function (p) { return p.id; }), 'unpublish'); };
    root.querySelectorAll('tr[data-id]').forEach(function (tr) { tr.onclick = function () { S.cur = tr.dataset.id; draw(); }; });
    if (S.cur) editor(); drawSim();
  }
  function editor() {
    var p = S.phrases.filter(function (x) { return x.id === S.cur; })[0]; if (!p) return;
    var it = S.items[p.id], st = stOf(p.id), hist = (it && it.history || []).slice().reverse();
    $('#leEd').innerHTML = '<div style="border-top:1px solid var(--line,#333);padding-top:10px"><b>' + esc(p.id) + '</b> · ' + ST[st] + (it && it.by ? ' · 마지막 ' + esc(it.by) : '') +
      '<p class="muted" style="margin:4px 0">기본 문구: ' + esc(p.text) + '</p><textarea id="leTx" rows="3" maxlength="200" style="width:100%">' + esc(txOf(p)) + '</textarea>' +
      '<div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap"><button class="btn" data-a="pub">' + (st === 'published' ? '수정해서 다시 게시' : '저장하고 게시') + '</button><button class="btn" data-a="save">수정만 저장(미게시)</button><button class="btn" data-a="unpublish"' + (st !== 'published' ? ' disabled' : '') + '>게시 취소</button></div>' +
      (hist.length ? '<details style="margin-top:8px"><summary>이력 ' + hist.length + '건</summary><ul style="margin:6px 0 0 18px">' + hist.map(function (h) { return '<li>v' + h.v + ' · ' + ST[h.status] + ' · ' + esc(h.at.slice(0, 16).replace('T', ' ')) + (h.by ? ' · ' + esc(h.by) : '') + ' — ' + esc(h.text) + ' <button class="btn" data-rs="' + h.v + '">이 본문으로</button></li>'; }).join('') + '</ul></details>' : '') + '</div>';
    var fail = function (d) { msg(d.error || '실패했습니다', true); };
    root.querySelectorAll('#leEd [data-a]').forEach(function (b) {
      b.onclick = function () {
        var a = b.dataset.a, text = $('#leTx').value, changed = text.trim() !== txOf(p).trim();
        if (a === 'unpublish') return call('PUT', '', { id: p.id, action: 'unpublish' }).then(function (d) { d._ok ? load('게시를 취소했습니다') : fail(d); });
        if (a === 'save') return call('PUT', '', { id: p.id, action: 'save', text: text }).then(function (d) { d._ok ? load('저장했습니다(미게시)') : fail(d); });
        // 저장하고 게시: 본문을 고쳤으면 저장 후, 아니면 바로 게시
        (changed || st === 'published' ? call('PUT', '', { id: p.id, action: 'save', text: text }) : Promise.resolve({ _ok: true })).then(function (d) { if (!d._ok) return fail(d); return call('PUT', '', { id: p.id, action: 'approve_publish' }).then(function (d2) { d2._ok ? load('게시했습니다') : fail(d2); }); });
      };
    });
    root.querySelectorAll('#leEd [data-rs]').forEach(function (b) { b.onclick = function () { call('PUT', '', { id: p.id, action: 'restore', v: +b.dataset.rs }).then(function (d) { if (!d._ok) return fail(d); load('되돌렸습니다(미게시) — 게시하려면 [저장하고 게시]를 누르세요'); }); }; });
  }

  // ── 시뮬레이터 ──
  var SIM = { year: 1990, month: 3, day: 15, hour: 14, minute: 30, gender: 'F', lon: 126.98, level: 'seun', Y: new Date().getFullYear(), m: 1, d: 1, region: '' };
  function drawSim() {
    var o = function (arr, v) { return arr.map(function (a) { return '<option value="' + a[0] + '"' + (String(a[0]) === String(v) ? ' selected' : '') + '>' + a[1] + '</option>'; }).join(''); };
    var num = function (id, v, w) { return '<input id="' + id + '" type="number" value="' + v + '" style="width:' + (w || 70) + 'px">'; };
    $('#leSim').innerHTML = '<p class="muted" style="margin:0 0 8px">테스트 사주와 기간을 넣으면 사용자 화면과 같은 해석, 적용·배제된 규칙, 선택된 문구를 보여 줍니다. 서버에 저장하지 않습니다.</p><div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end">' +
      '<label>생년 ' + num('sY', SIM.year) + '</label><label>월 ' + num('sM', SIM.month, 50) + '</label><label>일 ' + num('sD', SIM.day, 50) + '</label><label>시 ' + num('sH', SIM.hour, 50) + '</label><label>분 ' + num('sMi', SIM.minute, 50) + '</label>' +
      '<label>성별 <select id="sG">' + o([['M', '남'], ['F', '여']], SIM.gender) + '</select></label><label>경도 ' + num('sL', SIM.lon, 80) + '</label>' +
      '<label>단계 <select id="sLv">' + o([['daeun', '대운'], ['seun', '세운'], ['wolun', '월운'], ['ilun', '일진']], SIM.level) + '</select></label><label>연도 ' + num('sPY', SIM.Y) + '</label><label>월 ' + num('sPM', SIM.m, 50) + '</label><label>일 ' + num('sPD', SIM.d, 50) + '</label>' +
      '<label>지역 <select id="sRg"><option value="">없음</option>' + RG.REGIONS.map(function (r) { return '<option value="' + r.id + '"' + (SIM.region === r.id ? ' selected' : '') + '>' + esc(r.name) + '</option>'; }).join('') + '</select></label>' +
      '<label><input type="checkbox" id="sDraft" checked> 미게시 문구 포함</label><button class="btn" id="sGo">실행</button></div><div id="sOut" style="margin-top:10px"></div>';
    $('#sGo').onclick = run;
  }
  function ctxOf(ch, x, kind) {
    var c = {};
    if (kind === 'daeun') { var i = ch.daeun.list.indexOf(x); if (i > 0) c.prev = ch.daeun.list[i - 1]; }
    else if (kind === 'seun') { c.daeun = x.daeun; c.prev = M.seunRange(ch, x.year - 1, x.year - 1)[0]; }
    else if (kind === 'wolun') { var Y = M.yearPillarAt(x.startMs).sajuYear, wl = M.wolun(ch, Y), i2 = wl.findIndex(function (m) { return m.startMs === x.startMs; }); c.seun = M.seunRange(ch, Y, Y)[0]; c.daeun = M.daeunAt(ch, x.startMs); c.prev = i2 > 0 ? wl[i2 - 1] : M.wolun(ch, Y - 1)[11]; }
    else { var y = x.date[0], m = x.date[1], d = x.date[2], ms = Date.UTC(y, m - 1, d, 3), Y2 = M.yearPillarAt(ms).sajuYear, wm = null; M.wolun(ch, Y2).forEach(function (q) { if (q.startMs <= ms) wm = q; }); c.wolun = wm || M.wolun(ch, Y2 - 1)[11]; c.seun = M.seunRange(ch, Y2, Y2)[0]; c.daeun = M.daeunAt(ch, ms); if (d > 1) c.prev = M.ilun(ch, y, m)[d - 2]; }
    return c;
  }
  function run() {
    var g = function (id) { return $('#' + id).value; }, out = $('#sOut');
    try {
      SIM = { year: +g('sY'), month: +g('sM'), day: +g('sD'), hour: +g('sH'), minute: +g('sMi'), gender: g('sG'), lon: +g('sL'), level: g('sLv'), Y: +g('sPY'), m: +g('sPM'), d: +g('sPD'), region: g('sRg') };
      var ch = M.compute({ year: SIM.year, month: SIM.month, day: SIM.day, hour: SIM.hour, minute: SIM.minute, calendar: 'solar', leap: false, gender: SIM.gender, lon: SIM.lon, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'auto' });
      var x;
      if (SIM.level === 'daeun') x = M.daeunAt(ch, Date.UTC(SIM.Y, Math.max(0, SIM.m - 1), SIM.d || 1, 3));
      else if (SIM.level === 'seun') x = M.seunRange(ch, SIM.Y, SIM.Y)[0];
      else if (SIM.level === 'wolun') { x = M.wolun(ch, SIM.Y)[Math.min(11, Math.max(0, SIM.m - 1))]; }
      else x = M.ilun(ch, SIM.Y, SIM.m)[SIM.d - 1];
      if (!x) throw new Error('해당 기간을 계산할 수 없습니다(범위를 확인하세요)');
      var withDraft = $('#sDraft').checked;
      LI.PHRASES.forEach(function (p) { if (!(p.id in BASE)) BASE[p.id] = p.text; var it = S.items[p.id]; p.text = withDraft && it && it.text ? it.text : BASE[p.id]; });
      var r = LI.build(M, ch, x, SIM.level, ctxOf(ch, x, SIM.level)), ev = r.evidence, list = function (a) { return a.length ? '<ul style="margin:2px 0 6px 18px">' + a.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '<p class="muted">없음</p>'; };
      var h = '<p><b>원국</b> ' + esc(ev.natal.join(' · ')) + ' · 적합도 ' + esc(x.ev.condition) + '</p><h4 style="margin:6px 0 2px">' + esc(r.core.title) + '</h4><p>' + esc(r.core.text) + '</p><p>' + esc(r.relation) + '</p>' +
        '<p><b>영역</b> ' + r.areas.map(function (a) { return esc(a.name) + ' ' + a.level + '(' + a.value + ')'; }).join(' · ') + '</p>' +
        '<b>상황</b>' + list(r.scenes.map(function (s) { return s.name + ' — ' + s.text + ' [' + s.phraseId + ']'; })) + '<b>유리</b>' + list(r.good) + '<b>불리</b>' + list(r.bad) + ((r.mixed || []).length ? '<b>기준에 따라 달라지는 점</b>' + list(r.mixed) : '') + ((r.facts || []).length ? '<b>사실(유불리 없음)</b>' + list(r.facts) : '') + '<b>연결</b>' + list(r.chain.map(function (c) { return c.text; }).concat(r.change ? [r.change] : [])) + '<b>대응</b>' + list(r.strategy);
      if (SIM.region) { var rgn = RG.get(SIM.region); h += '<b>지역 연결(' + esc(rgn.name) + ')</b>' + list(RG.link(rgn, r.topAreas, '이 기간').map(function (l) { return l.text; })); }
      h += '<details open><summary><b>해석 추적</b></summary><p><b>적용된 규칙</b> ' + esc(ev.rules.map(function (q) { return q.id; }).filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '</p>' +
        '<p><b>선택된 문구</b> ' + ev.phraseIds.map(function (id) { return esc(id) + '(' + ST[stOf(id)] + ')'; }).join(', ') + '</p><p><b>배제된 규칙</b></p>' + list(ev.excluded.map(function (q) { return q.id + ' — ' + q.why; })) + '</details>';
      out.innerHTML = h;
    } catch (e) { out.innerHTML = '<p style="color:#FF8A78">' + esc(e.message) + '</p>'; }
  }
  window.V2LuckEnv = { open: function (password) { pw = password; root = document.getElementById('t-luckenv'); if (!root || !M || !LI || !RG) return; load(); } };
})();
