/* 관리자 "뮤직비디오 패널" — 내 사주 뮤직비디오(report/v2/music-video.js)에 쓰는 패널 이미지와 공개 상태를 관리한다.
   ① 상태: 공개 스위치(musicVideo)·음악 키(ELEVENLABS_API_KEY)·이미지 키·오늘 만든 곡 수/하루 상한
   ② 패널: 일주(주인공 = 일간 색 + 일지 동물 의인화 래퍼, 60) × 성별 2 × 주제 5 × 구간 6 = 3,600칸 — 화면은 일주·성별·주제 하나씩 6칸. 사용자가 열면 빈 칸은 서버가 자동으로 채운다.
      AI 로 만들기(기존 패널 이미지와 같은 모델 — OpenAI gpt-image-2 → Gemini), 직접 만든 이미지 올리기, 비우기. 주제 칸이 비면 화면은 종합풀이 칸을 쓴다.
   ③ 가사 미리보기: 테스트 사주로 주제별 3분 가사(구간·시간)를 본다 — 서버 호출 없음.
   ④ 테스트 재생: 관리자 권한으로 실제 노래를 만들어 본다(곡마다 일레븐랩스 비용, 같은 사주·주제는 캐시).
   API: /api/music-video (?admin=1 · panel), /api/clipfile(직접 올리기), /api/luck-flags(스위치). index.html 의 showTab 이 V2MvPanel.open(비밀번호) 를 부른다. */
(function () {
  'use strict';
  var pw = '', root = null, D = null, busy = false, stop = false, ERR = {};   // ERR: 칸별 마지막 그림 생성 실패 이유(이 화면에서만)
  var S = { topic: 'self', gender: 'F', day: '', sim: { year: 1992, month: 6, day: 23, hour: 14, minute: 0, gender: 'F' }, simTopic: 'self' };
  var L = function () { return window.ReportV2 && window.ReportV2.MusicVideoLyrics; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var $ = function (s) { return root.querySelector(s); };
  var EL_KO = { 목: '목(나무)', 화: '화(불)', 토: '토(흙)', 금: '금(쇠)', 수: '수(물)' };
  function mergeP(p) { if (!D || !p) return; D.panels = D.panels || {}; Object.keys(p).forEach(function (k) { if (p[k]) D.panels[k] = p[k]; else delete D.panels[k]; }); }
  function toast(m, bad) { var t = $('#mvpMsg'); if (t) { t.textContent = m; t.style.color = bad ? '#E07A6E' : ''; } }
  function call(method, qs, body) {
    return fetch('/api/music-video' + (qs || ''), { method: method, headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d._s = r.status; return d; }); });
  }
  function load() { if (!S.day) { try { S.day = simSd().dayPillar.ko; S.gender = S.sim.gender === 'M' ? 'M' : 'F'; } catch (e) { S.day = '갑자'; } } return call('GET', '?admin=1&day=' + encodeURIComponent(S.day) + '&g=' + S.gender).then(function (d) { if (d._s !== 200) { toast(d.error || '불러오지 못했습니다', true); return; } D = d; draw(); }); }

  function draw() {
    var lib = L(); if (!root) return;
    if (!lib) { root.innerHTML = '<div class="card"><p>가사 조합 파일(music-video-lyrics.js)을 불러오지 못했습니다.</p></div>'; return; }
    var c = (D && D.configured) || {}, ok = function (v) { return v ? '<b style="color:#62C2AE">● 준비됨</b>' : '<b style="color:#E0BC74">○ 없음</b>'; };
    var h = '<div class="card"><h3 style="margin:0 0 8px">내 사주 뮤직비디오</h3>' +
      '<p class="muted" style="margin:0 0 10px">유료 주제 풀이 화면 위쪽(창작 단편이 있던 자리)과 토정비결 신년운세 첫 장에 “내 사주 뮤직비디오” 카드가 나옵니다. 그 주제를 산 회원이 누르면 사주 값으로 미리 쓴 랩 가사를 조합해 일레븐랩스가 3분 노래를 만들고, 가사 구간에 맞춰 아래 패널이 넘어가며 자막이 흐릅니다. 같은 사주·같은 주제는 다시 만들지 않습니다.</p>' +
      '<div class="row" style="gap:16px;flex-wrap:wrap;align-items:center">' +
      '<span>공개 스위치: <b style="color:' + (D && D.flag ? '#62C2AE' : '#E0BC74') + '">' + (!D ? '알 수 없음' : D.flag ? '● 켜짐' : '○ 꺼짐') + '</b></span>' +
      '<button class="btn" id="mvpFlag"' + (D ? '' : ' disabled') + '>' + (D && D.flag ? '뮤직비디오 끄기' : '뮤직비디오 켜기') + '</button>' +
      '<span>음악 키(ELEVENLABS_API_KEY): ' + ok(c.music) + '</span><span>이미지 키: ' + ok(c.image) + '</span><span>영상 키(Kling): ' + ok(c.video) + '</span><span>파일 저장소(R2): ' + ok(c.r2) + '</span>' +
      '<span>오늘 만든 곡: <b>' + (D ? D.today : '-') + '</b> / 하루 상한 ' + (D ? D.limit : '-') + '곡(MV_DAILY_LIMIT)</span><span>모델: ' + esc(D ? D.model : '-') + '</span></div>' +
      '<p class="muted" style="margin:10px 0 0">상업 이용: 일레븐랩스 음악 약관상 사업자는 Scale(직원 10명 미만) 이상 요금제 계정의 키를 써야 합니다. 곡당 약 3분 = 약 $0.45(종량 기준). 노래 키는 Cloudflare Pages 설정 › 환경 변수(비밀)에 직접 넣으세요 — 이 화면에서는 입력하지 않습니다. 키 권한은 <b>뮤직(음악 생성)</b>과 <b>음성 텍스트 변환(Speech to Text)</b> 둘 다 켜 주세요 — 노래를 만든 뒤 음성 인식으로 줄마다 실제로 부르는 시각을 찾아 자막을 맞춥니다(실패하면 구간 비율로 표시, 원인은 아래 “마지막 오류”).</p>' +
      (D && D.lastPanelError ? '<details style="margin:8px 0 0"><summary style="color:#E07A6E;cursor:pointer">마지막 패널 그림 생성 오류 · ' + esc(D.lastPanelError.slot) + ' · ' + esc(new Date(D.lastPanelError.at).toLocaleString('ko-KR')) + '</summary><pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;margin:6px 0 0">' + esc(D.lastPanelError.message) + '</pre></details>' : '') +
      (D && D.lastError ? '<details style="margin:8px 0 0"><summary style="color:#E07A6E;cursor:pointer">마지막 노래 생성 오류 · ' + esc(new Date(D.lastError.at).toLocaleString('ko-KR')) + '</summary><pre style="white-space:pre-wrap;word-break:break-all;font-size:12px;margin:6px 0 0">' + esc(D.lastError.message) + '</pre></details>' : '') +
      '<p id="mvpMsg" class="muted" style="margin:8px 0 0"></p></div>';

    // 패널 칸: 일주(주인공 동물) × 성별 × 주제 → 구간 6칸. 화면은 한 번에 일주·성별 하나(서버가 그 30칸만 준다)
    var panels = (D && D.panels) || {}, hero = lib.heroOf(S.day, S.gender);
    var daySel = '<label>일주(주인공) <select id="mvpDay">' + lib.DAYS.map(function (d) { var hh = lib.heroOf(d, S.gender); return '<option value="' + d + '"' + (d === S.day ? ' selected' : '') + '>' + d + ' · ' + esc(hh.nameKo) + '</option>'; }).join('') + '</select></label>';
    var gtabs = lib.GENDERS.map(function (g) { return '<button class="btn" data-mvgender="' + g + '"' + (S.gender === g ? ' style="outline:2px solid #C9A25C"' : '') + '>' + esc(lib.GENDER_KO[g]) + ' 사주 · ' + (g === 'F' ? '여성' : '남성') + ' 래퍼</button>'; }).join(' ');
    var tabs = lib.TOPICS.map(function (t) { var n = lib.panelSlots(t, S.gender, S.day).filter(function (s) { return panels[s.id]; }).length; return '<button class="btn" data-mvtopic="' + t + '"' + (S.topic === t ? ' style="outline:2px solid #C9A25C"' : '') + '>' + esc(lib.TOPIC_KO[t]) + ' <small>' + n + '/6</small></button>'; }).join(' ');
    var mine = lib.panelSlots(S.topic, S.gender, S.day);
    var grid = '<table style="width:100%;border-collapse:collapse;table-layout:fixed"><tr>' + mine.map(function (s) { return '<th style="font-weight:600;padding:4px">' + esc(s.sectionKo) + '</th>'; }).join('') + '</tr><tr>' +
      mine.map(function (s) {
        var p = panels[s.id], fb = S.topic !== 'self' && panels[lib.panelId(s.section, 'self', S.gender, S.day)], vt = (D && D.vtasks || []).indexOf(s.id) >= 0;
        var img = p && p.video ? '<video src="' + esc(p.video) + '" poster="' + esc(p.url) + '" muted loop playsinline autoplay preload="metadata" style="width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:8px;display:block;outline:2px solid #C9A25C"></video>' :
          p ? '<img src="' + esc(p.url) + '" alt="" style="width:100%;aspect-ratio:9/16;object-fit:cover;border-radius:8px;display:block">' :
          '<div style="width:100%;aspect-ratio:9/16;border:1px dashed rgba(128,128,128,.5);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:12px;text-align:center;padding:4px;opacity:.75">' + (fb ? '비어 있음<br>(종합풀이 칸으로 대신)' : '비어 있음<br>(사용자가 열면 자동으로 만들어짐)') + '</div>';
        if (ERR[s.id]) img += '<div style="color:#E07A6E;font-size:11px;line-height:1.4;margin-top:4px;word-break:break-all;max-height:6em;overflow:auto">실패: ' + esc(ERR[s.id]) + '</div>';
        return '<td style="padding:4px;vertical-align:top">' + img + '<div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:4px">' +
          '<button class="btn" style="padding:3px 8px;font-size:12px" data-mvgen="' + s.id + '">' + (p ? '다시' : '만들기') + '</button>' +
          '<label class="btn" style="padding:3px 8px;font-size:12px;cursor:pointer">올리기<input type="file" accept="image/png,image/jpeg,image/webp" data-mvup="' + s.id + '" hidden></label>' +
          (p ? '<button class="btn" style="padding:3px 8px;font-size:12px" data-mvclr="' + s.id + '">비우기</button>' : '') +
          (p && vt ? '<button class="btn" style="padding:3px 8px;font-size:12px" data-mvvchk="' + s.id + '">영상 만드는 중 · 확인</button>' :
            p ? '<button class="btn" style="padding:3px 8px;font-size:12px" data-mvvid="' + s.id + '"' + (c.video ? '' : ' disabled title="Kling 키(KLING_API_KEY)가 없습니다"') + '>' + (p.video ? '영상 다시' : '영상 만들기') + '</button>' : '') +
          (p && p.video ? '<button class="btn" style="padding:3px 8px;font-size:12px" data-mvvclr="' + s.id + '">영상 빼기</button>' : '') + '</div></td>';
      }).join('') + '</tr></table>';
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">패널 이미지 (일주 주인공 × 성별 × 주제 × 구간)</h3><p class="muted" style="margin:0 0 8px">주인공은 사용자 사주의 <b>일주</b> — 일간 오행 색 + 일지 동물을 한 의인화 래퍼(여자 사주는 여성, 남자 사주는 남성 래퍼)입니다. 크루는 일지의 삼합 동물, 연애운의 짝은 육합 동물. 연출은 힙합 뮤직비디오의 스웩을 유쾌하게 패러디한 한국풍(갓·선글라스, 한복 트레이닝복, 엽전 목걸이, 한옥 골목, 포장마차, 한강 야경, 노래방 네온). 칸 조합이 3,600가지라 미리 다 만들 필요는 없습니다 — 사용자가 뮤직비디오를 열면 빈 칸을 서버가 한 장씩 만들어 채우고(하루 상한 ' + (D ? D.panelLimit : '-') + '장, 오늘 ' + (D ? D.panelToday : '-') + '장), 같은 칸은 다음 사람부터 바로 보입니다. 여기서는 미리 만들거나 마음에 안 드는 그림을 다시 만들 수 있습니다. “영상 만들기”는 그 칸 그림을 첫 장면으로 Kling 이 5초 영상을 만듭니다(보통 1~5분).</p>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:8px">' + daySel + gtabs + '</div>' +
      (hero ? '<p style="margin:0 0 8px">주인공: <b>' + esc(hero.nameKo) + ' ' + (S.gender === 'F' ? '여성' : '남성') + ' 래퍼</b> · 크루 ' + esc(hero.crewKo.join('·')) + ' · 연애운 짝 ' + esc(hero.partnerKo) + '</p>' : '') +
      '<div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">' + tabs + '</div>' +
      '<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center"><button class="btn" id="mvpFill"' + (busy ? ' disabled' : '') + '>이 주제 빈 칸 모두 만들기</button><button class="btn" id="mvpStop"' + (busy ? '' : ' disabled') + '>멈추기</button>' +
      '<input id="mvpExtra" placeholder="추가 요청(선택) — 예: 비 오는 밤 분위기" style="flex:1;min-width:200px"></div>' + grid + '</div>';

    // 가사 미리보기·테스트 재생
    var sm = S.sim;
    h += '<div class="card" style="margin-top:12px"><h3 style="margin:0 0 8px">가사 미리보기 · 테스트 재생</h3>' +
      '<div class="row" style="gap:6px;flex-wrap:wrap;align-items:center">' +
      ['year', 'month', 'day', 'hour'].map(function (k) { return '<label>' + { year: '년', month: '월', day: '일', hour: '시' }[k] + ' <input type="number" data-mvsim="' + k + '" value="' + esc(sm[k]) + '" style="width:' + (k === 'year' ? 74 : 54) + 'px"></label>'; }).join('') +
      '<label>성별 <select data-mvsim="gender"><option value="F"' + (sm.gender === 'F' ? ' selected' : '') + '>여</option><option value="M"' + (sm.gender === 'M' ? ' selected' : '') + '>남</option></select></label>' +
      '<label>주제 <select id="mvpSimTopic">' + lib.TOPICS.map(function (t) { return '<option value="' + t + '"' + (S.simTopic === t ? ' selected' : '') + '>' + esc(lib.TOPIC_KO[t]) + '</option>'; }).join('') + '</select></label>' +
      '<button class="btn" id="mvpPlay">테스트 노래 만들기·재생</button></div><div id="mvpLyrics" style="margin-top:10px"></div></div>';
    root.innerHTML = h;
    wire(); preview();
  }

  function simSd() {
    var s = S.sim, inp = { year: +s.year, month: +s.month, day: +s.day, minute: 0, gender: s.gender, calendar: 'solar', city: '서울' };
    if (s.hour !== '' && s.hour != null && !isNaN(+s.hour)) inp.hour = +s.hour;
    return window.ReportV2.SajuData.build(window.Manse.compute(inp), { now: Date.now() });
  }
  function preview() {
    var box = $('#mvpLyrics'); if (!box) return;
    var lib = L(), t = S.simTopic;
    if (t === 'newyear') { box.innerHTML = '<p class="muted">신년운세 가사는 서버가 승인된 토정 현대어 풀이(괘 제목·한 해 어조·월별 어조)로 조합합니다. 테스트 재생으로 확인하세요. 검수 전 괘는 노래를 만들지 않습니다.</p>'; return; }
    var song; try { song = lib.compose(simSd(), t); } catch (e) { song = null; }
    if (!song) { box.innerHTML = '<p class="muted">이 입력으로는 가사를 만들 수 없습니다.</p>'; return; }
    var fmt = function (ms) { var s = Math.round(ms / 1000); return Math.floor(s / 60) + ':' + ('0' + s % 60).slice(-2); };
    box.innerHTML = '<p style="margin:0 0 6px"><b>' + esc(song.title) + '</b> · ' + fmt(song.totalMs) + ' · 스타일 ' + esc(song.style.join(', ')) + '</p>' +
      song.sections.map(function (s) { return '<div style="margin:8px 0"><b>' + esc(s.name) + '</b> <span class="muted">' + fmt(s.startMs) + '~' + fmt(s.startMs + s.durationMs) + ' · 패널 ' + esc(s.panel) + '</span><div style="white-space:pre-line;line-height:1.6">' + esc(s.lines.join('\n')) + '</div></div>'; }).join('');
  }

  function wire() {
    root.querySelectorAll('[data-mvtopic]').forEach(function (b) { b.onclick = function () { S.topic = b.dataset.mvtopic; draw(); }; });
    root.querySelectorAll('[data-mvgender]').forEach(function (b) { b.onclick = function () { S.gender = b.dataset.mvgender; load(); }; });
    if ($('#mvpDay')) $('#mvpDay').onchange = function () { S.day = this.value; load(); };
    root.querySelectorAll('[data-mvgen]').forEach(function (b) { b.onclick = function () { gen(b.dataset.mvgen).then(draw); }; });
    root.querySelectorAll('[data-mvclr]').forEach(function (b) { b.onclick = function () { if (!confirm('이 칸의 이미지를 비울까요?')) return; call('POST', '', { panel: { slot: b.dataset.mvclr, clear: true } }).then(function (d) { if (d.panels) mergeP(d.panels); draw(); }); }; });
    root.querySelectorAll('[data-mvup]').forEach(function (inp) { inp.onchange = function () { upload(inp.dataset.mvup, inp.files && inp.files[0]); }; });
    root.querySelectorAll('[data-mvvid]').forEach(function (b) { b.onclick = function () { makeVideo(b.dataset.mvvid); }; });
    root.querySelectorAll('[data-mvvchk]').forEach(function (b) { b.onclick = function () { checkVideo(b.dataset.mvvchk, false); }; });
    root.querySelectorAll('[data-mvvclr]').forEach(function (b) { b.onclick = function () { if (!confirm('이 칸의 영상을 빼고 그림만 쓸까요?')) return; call('POST', '', { panel: { slot: b.dataset.mvvclr, clearVideo: true } }).then(function (d) { if (d.panels) mergeP(d.panels); draw(); }); }; });
    root.querySelectorAll('[data-mvsim]').forEach(function (inp) { inp.onchange = function () { S.sim[inp.dataset.mvsim] = inp.value; preview(); }; });
    $('#mvpSimTopic').onchange = function () { S.simTopic = this.value; preview(); };
    $('#mvpFlag').onclick = function () {
      var v = !(D && D.flag);
      if (v && !confirm('유료 주제 화면에 내 사주 뮤직비디오 카드를 띄웁니다. 구매 회원이 누를 때마다 노래 생성 비용이 듭니다.\n켜시겠습니까?')) return;
      fetch('/api/luck-flags', { method: 'PUT', headers: { authorization: 'Bearer ' + pw, 'content-type': 'application/json', 'x-reviewer': encodeURIComponent('관리자') }, body: JSON.stringify({ flags: { musicVideo: v } }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) return toast(d.error || '바꾸지 못했습니다', true); load().then(function () { toast(v ? '뮤직비디오를 켰습니다(약 1분 안에 반영)' : '뮤직비디오를 껐습니다'); }); }); });
    };
    $('#mvpFill').onclick = fillAll; $('#mvpStop').onclick = function () { stop = true; };
    $('#mvpPlay').onclick = function () {
      var MV = window.ReportV2.MusicVideo; if (!MV) return toast('플레이어(music-video.js)를 불러오지 못했습니다', true);
      if (!confirm('관리자 권한으로 실제 노래를 만듭니다(처음이면 일레븐랩스 비용 1곡, 같은 사주·주제는 캐시). 진행할까요?')) return;
      var h = function () { return { authorization: 'Bearer ' + pw }; };
      if (S.simTopic === 'newyear') { var s = S.sim, b = { year: +s.year, month: +s.month, day: +s.day, gender: s.gender, calendar: 'solar' }; if (s.hour !== '' && !isNaN(+s.hour)) { b.hour = +s.hour; b.minute = 0; } MV.open({ topic: 'newyear', birth: b, year: 2027, headers: h, onLocked: function () { toast('잠김 응답 — 관리자 비밀번호를 확인하세요', true); } }); }
      else MV.open({ sd: simSd(), topic: S.simTopic, headers: h, onLocked: function () { toast('잠김 응답 — 관리자 비밀번호를 확인하세요', true); } });
    };
  }
  /* 패널 영상: 칸 그림을 JPEG 로 바꿔 시작 프레임으로 올리고(Kling 은 JPG·PNG 만) 작업을 맡긴 뒤 15초마다 확인한다 */
  function makeVideo(slot) {
    var p = D && D.panels && D.panels[slot]; if (!p) return;
    if (!confirm('이 칸의 그림으로 5초 영상을 만듭니다(Kling 크레딧 사용, 보통 1~5분). 진행할까요?')) return;
    toast(slot + ' 영상 준비 중…');
    var extra = ($('#mvpExtra') && $('#mvpExtra').value || '').trim();
    fetch(p.url).then(function (r) { if (!r.ok) throw new Error('그림을 불러오지 못했습니다'); return r.blob(); })
      .then(function (blob) { return new Promise(function (ok, no) { var im = new Image(), u = URL.createObjectURL(blob); im.onload = function () { var cv = document.createElement('canvas'), w = im.naturalWidth, h = im.naturalHeight, sc = Math.min(1, 1536 / Math.max(w, h)); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u); cv.toBlob(function (b) { b ? ok(b) : no(new Error('JPEG 변환 실패')); }, 'image/jpeg', 0.9); }; im.onerror = function () { no(new Error('그림을 읽지 못했습니다')); }; im.src = u; }); })
      .then(function (jpg) { return fetch('/api/clipfile?name=' + encodeURIComponent('mvstart-' + slot + '.jpg'), { method: 'POST', headers: { authorization: 'Bearer ' + pw }, body: jpg }).then(function (r) { return r.json(); }); })
      .then(function (d) { if (!d || !d.key) throw new Error((d && d.error) || '시작 프레임을 올리지 못했습니다'); return call('POST', '', { panel: { slot: slot, video: { startKey: d.key, extra: extra || undefined } } }); })
      .then(function (d) { if (!d.ok) throw new Error(d.error || '영상 작업을 맡기지 못했습니다'); D.vtasks = (D.vtasks || []).concat(slot); draw(); toast(slot + ' 영상 만드는 중… 끝나면 자동으로 붙습니다'); checkVideo(slot, true); })
      .catch(function (e) { toast(e.message, true); });
  }
  function checkVideo(slot, keep) {
    return call('GET', '?vt=' + encodeURIComponent(slot)).then(function (d) {
      if (d.state === 'done') { mergeP(d.panels); D.vtasks = (D.vtasks || []).filter(function (x) { return x !== slot; }); draw(); toast(slot + ' 영상 완성'); return; }
      if (d.state === 'failed' || d.state === 'none') { D.vtasks = (D.vtasks || []).filter(function (x) { return x !== slot; }); draw(); if (d.state === 'failed') toast(slot + ' 영상 실패: ' + (d.error || ''), true); return; }
      toast(slot + ' 영상 만드는 중…'); if (keep && root && document.body.contains(root)) setTimeout(function () { checkVideo(slot, true); }, 15000);
    });
  }
  function gen(slot) {
    toast(slot + ' 만드는 중… (한 장에 20~60초)');
    var extra = ($('#mvpExtra') && $('#mvpExtra').value || '').trim();
    return call('POST', '', { panel: { slot: slot, generate: true, extra: extra || undefined } }).then(function (d) {
      if (d.panels) { mergeP(d.panels); delete ERR[slot]; toast(slot + ' 완료'); return true; }
      ERR[slot] = String(d.error || ('HTTP ' + d._s)); toast(slot + ' 실패: ' + ERR[slot], true); return false;   // 실패 이유는 그 칸 아래에 남는다
    });
  }
  function fillAll() {
    var lib = L(), panels = (D && D.panels) || {}, todo = lib.panelSlots(S.topic, S.gender, S.day).filter(function (s) { return !panels[s.id]; }).map(function (s) { return s.id; });
    if (!todo.length) return toast('빈 칸이 없습니다');
    if (!confirm(lib.GENDER_KO[S.gender] + ' 사주 · ' + lib.TOPIC_KO[S.topic] + ' 빈 칸 ' + todo.length + '장을 차례로 만듭니다(이미지 생성 비용). 진행할까요?')) return;
    busy = true; stop = false; draw(); var done = 0;
    (function next() {
      if (stop || !todo.length) { busy = false; draw(); var failed = Object.keys(ERR).length; toast((stop ? '멈춤 — ' : '끝 — ') + done + '장 만들었습니다' + (failed ? ' · 실패 ' + failed + '장(칸 아래 빨간 글씨에 이유)' : ''), failed > 0); return; }
      gen(todo.shift()).then(function (ok) { if (ok) done++; next(); });
    })();
  }
  function upload(slot, file) {
    if (!file) return; if (file.size > 15 * 1024 * 1024) return toast('15MB 이하 이미지만 올릴 수 있습니다', true);
    var ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z]/g, '') || 'png';
    toast('올리는 중…');
    fetch('/api/clipfile?name=' + encodeURIComponent('mvpanel-' + slot + '.' + ext), { method: 'POST', headers: { authorization: 'Bearer ' + pw }, body: file })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d || !d.key) throw new Error((d && d.error) || '올리지 못했습니다'); return call('POST', '', { panel: { slot: slot, uploadKey: d.key } }); })
      .then(function (d) { if (d.panels) { mergeP(d.panels); draw(); toast('연결했습니다'); } else toast(d.error || '연결하지 못했습니다', true); })
      .catch(function (e) { toast(e.message, true); });
  }

  window.V2MvPanel = { open: function (password) { pw = password || ''; root = document.getElementById('t-mvpanel'); if (!root) return; root.innerHTML = '<div class="card"><p class="muted">불러오는 중…</p></div>'; load().then(function () { if (!D) draw(); }); } };
})();
