// 사주가 필요한 화면: 입력(필요할 때만) · 오늘의 운세 · 일주 각성 · MY 운명 홈.
// 계산은 전부 기존 엔진을 그대로 쓴다: Manse.compute / ilun / evaluateDomainLuck / careerLuckActivation / flowName·flowLabel, 일간·일주 소개는 /report/v2/intro-text.js, 일진 "그날 할 일"은 MantraCore.DAYMODE.
// 새로운 점수나 명리 판단은 만들지 않는다 — 여기서는 엔진 값을 화면 문장에 끼워 넣을 뿐이다.
(function (root) {
  'use strict';
  var H = root.Hub, P = H.profile, esc = H.esc, br = H.br, $ = H.$, DAYMODE = root.MantraCore.DAYMODE;
  var Saju = H.Saju = {};
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]];
  var NEXT_NAME = { today: '월운 그래프 · 일진 캘린더', awaken: '나의 일주 각성', life: '내 인생의 흐름', deep: '심층 무빙툰', my: '나의 운명 이야기' };
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'];
  var GROUPS5 = ['비겁', '식상', '재성', '관성', '인성'];
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };
  var clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  var DOW = ['일', '월', '화', '수', '목', '금', '토'];
  /* ───────── 오늘의 흐름 (엔진 값 읽기) ───────── */
  // 계산은 FreeCore.todayData(= 기존 엔진 값 읽기, 점수·단계 산식은 그대로)가 하고, 문장·행동·근거·다음 콘텐츠는 FreeCore.buildDaily 가 한 객체(DailyFortuneResult)로 묶는다.
  // 홈의 점수 줄과 #/today 가 이 객체 하나를 같이 쓴다. 같은 사람·같은 날은 localStorage 에 저장해 다시 열어도 같은 결과가 나온다.
  var FC = root.FreeCore;
  var cache = { ch: null, v: null };
  Saju.todayData = function (ch) {
    if (cache.ch === ch && cache.v) return cache.v;
    var v = FC.todayData(root.Manse, ch, Date.now(), DAYMODE); cache = { ch: ch, v: v }; return v;
  };
  var dailyMem = null;
  Saju.daily = function (ch) { // → Promise<DailyFortuneResult>
    var t = Saju.todayData(ch), day = t.y + '-' + t.mo + '-' + t.d, sig = P.sig(), key = 'mt_daily_v1';
    return H.freeContent().then(function (ov) {
      var ver = (ov && ov.version) || '', id = day + '|' + sig + '|' + ver;
      if (dailyMem && dailyMem.id === id) return dailyMem.r;
      try { var s = JSON.parse(localStorage.getItem(key) || 'null'); if (s && s.id === id) { dailyMem = s; return s.r; } } catch (e) { }
      var r = FC.buildDaily(t, { seed: sig, name: P.name(), overrides: ov }); r.line = t.line; r.todo = t.todo; r.meaning = t.meaning;
      dailyMem = { id: id, r: r }; try { localStorage.setItem(key, JSON.stringify(dailyMem)); } catch (e) { }
      return r;
    });
  };

  /* ───────── 입력 ───────── */
  var opts = function (a, b, sel, suf) { var h = ''; for (var i = a; i <= b; i++) h += '<option value="' + i + '"' + (i === sel ? ' selected' : '') + '>' + i + suf + '</option>'; return h; };
  function after(next) { // 입력을 마친 뒤 가는 곳
    if (next === 'today') return '#/today';
    if (next === 'life') return '#/go?to=life';
    if (next === 'deep') return '#/go?to=deep';
    if (next === 'my') return P.awakened() ? '#/my' : '#/awaken';
    return '#/awaken';
  }
  H.route('input', function (q, ctx) {
    var next = NEXT_NAME[q.next] ? q.next : 'my', has = P.has(), s = P.get() || {}, y = new Date().getFullYear();
    H.engine().catch(function () { }); // 미리 불러 둔다
    var sy = +s.year || 1990, sm = +s.month || 1, sd = +s.day || 1, g = s.gender === 'M' ? 'M' : s.gender === 'F' ? 'F' : '', minY = 1900;
    var el = H.view('<section class="hero" style="text-align:left;padding-bottom:0"><p class="kick">BIRTH</p><h1 class="h1">' + (q.next && NEXT_NAME[q.next] ? esc(NEXT_NAME[q.next]) + '을 보려면<br>태어난 순간이 필요해요' : '당신이 태어난<br>순간을 알려주세요') + '</h1><p class="sub">한 번만 입력하면 다른 콘텐츠에서도 그대로 쓰입니다.<br>입력한 정보는 이 기기 안에서만 계산되고 서버로 보내지 않습니다.</p></section>' +
      '<form class="form" id="sf" novalidate autocomplete="off">' +
      '<label class="f"><span>이름 (선택)</span><input type="text" name="name" maxlength="20" autocomplete="off" value="' + esc(s.name || '') + '"></label>' +
      '<div class="f seg" role="radiogroup" aria-label="성별"><span>성별</span><label><input type="radio" name="gender" value="F"' + (g === 'F' ? ' checked' : '') + '><i>여</i></label><label><input type="radio" name="gender" value="M"' + (g === 'M' ? ' checked' : '') + '><i>남</i></label></div>' +
      '<div class="f seg" role="radiogroup" aria-label="달력"><span>달력</span><label><input type="radio" name="calendar" value="solar"' + (s.calendar === 'lunar' ? '' : ' checked') + '><i>양력</i></label><label><input type="radio" name="calendar" value="lunar"' + (s.calendar === 'lunar' ? ' checked' : '') + '><i>음력</i></label><label class="leap" hidden><input type="checkbox" name="leap"' + (s.leap ? ' checked' : '') + '><i>윤달</i></label></div>' +
      '<div class="f row3"><span>생년월일</span><select name="year" aria-label="년">' + opts(minY, y, sy, '년') + '</select><select name="month" aria-label="월">' + opts(1, 12, sm, '월') + '</select><select name="day" aria-label="일">' + opts(1, 31, sd, '일') + '</select></div>' +
      '<div class="f"><span>태어난 시간</span><div class="inl"><input type="time" name="time" value="' + (s.hourUnknown || s.hour == null || s.hour === '' ? '' : ('0' + s.hour).slice(-2) + ':' + ('0' + (s.minute || 0)).slice(-2)) + '" aria-label="태어난 시간"><label class="chk"><input type="checkbox" name="unknown"' + (!has || s.hourUnknown || s.hour == null ? ' checked' : '') + '><i>시간을 몰라요</i></label></div></div>' +
      '<label class="f"><span>태어난 곳</span><select name="city">' + CITIES.map(function (c) { return '<option value="' + c[1] + '"' + (c[0] === (s.city || '서울') ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label>' +
      '<p class="msg err" id="sm" role="alert"></p><button type="submit" class="btn">' + (q.next === 'today' ? '내 운 캘린더 보기' : q.next === 'life' ? '내 인생 지도 펼치기' : '내 운명 이야기 시작') + '</button></form>');
    var f = $('#sf', el), msg = $('#sm', el);
    function fix() { f.leap.parentElement.hidden = f.calendar.value !== 'lunar'; f.time.disabled = f.unknown.checked; }
    f.addEventListener('change', fix); fix();
    f.addEventListener('focusin', function () { H.track('saju_input_start', { next: next }, true); });
    f.addEventListener('submit', function (e) {
      e.preventDefault(); msg.textContent = '';
      if (!f.gender.value) { msg.textContent = '성별을 선택해 주세요.'; return; }
      var t = f.time.value, hasT = !f.unknown.checked && /^\d\d:\d\d$/.test(t), city = CITIES.filter(function (c) { return String(c[1]) === f.city.value; })[0];
      var saved = { name: String(f.name.value || '').trim().slice(0, 20), gender: f.gender.value, calendar: f.calendar.value, leap: f.calendar.value === 'lunar' && f.leap.checked, year: +f.year.value, month: +f.month.value, day: +f.day.value, hour: hasT ? +t.slice(0, 2) : 12, minute: hasT ? +t.slice(3) : 0, hourUnknown: !hasT, city: city ? city[0] : '서울', lon: +f.city.value, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' };
      H.engine().then(function (M) {
        try { M.compute(P.toInput(saved)); } catch (err) { msg.textContent = (err && err.message) || '입력을 확인해 주세요.'; return; }
        if (!P.save(saved)) { H.toast('이 브라우저에서는 정보를 저장할 수 없어 이번만 사용합니다.'); }
        H.afterInput(); H.track('saju_input_complete', { next: next, hour_known: hasT ? 1 : 0 });
        H.replace(after(next)); // 입력 화면은 기록에 남기지 않는다(뒤로가기가 입력 폼으로 돌아가지 않게)
      }).catch(function () { msg.textContent = '분석 엔진을 불러오지 못했습니다. 새로고침 후 다시 시도해 주세요.'; });
    });
  });

  // 사주가 필요한 화면의 공통 시작: 정보가 없으면 입력으로, 있으면 엔진·소개 문구·계산 결과를 준비한다
  function needSaju(ctx, next, fn) {
    if (!P.has()) { H.replace('#/input?next=' + next); return; }
    H.view('<p class="pend">당신의 사주를 펼치는 중…</p>');
    H.sajuKit().then(function (kit) { return H.chart().then(function (ch) { return { kit: kit, ch: ch }; }); }).then(function (o) { if (H.alive(ctx)) fn(o.ch, o.kit); }).catch(function () { if (!H.alive(ctx)) return; H.view('<p class="pend">사주를 불러오지 못했습니다.<br><br><button type="button" class="btn ghost" id="rt">다시 시도</button></p>'); $('#rt').onclick = function () { H.render(); }; });
  }

  /* ───────── 오늘의 운세 ───────── */
  var FLD = [['money', '재물운', 'MONEY'], ['work', '일·사업운', 'WORK'], ['love', '연애운', 'LOVE'], ['health', '컨디션', 'BODY']];
  var tags = function (a) { return a.map(function (x) { return '<i>#' + esc(String(x).replace(/\s+/g, '')) + '</i>'; }).join(''); };
  var lis = function (a) { return '<ul class="dl">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };
  function calendar(ch, ctx) {
    var M = root.Manse, today = Saju.todayData(ch), y = today.y, m = today.mo, d = today.d, purpose = '', range = 30, weekday = 'all', generation = 0, searchY = y, searchM = m;
    var C = { draws: 0 }, names = { opportunity: '기회', expansion: '확장', harvest: '수확', accumulation: '축적' };
    var key = function (yy,mm,dd) { return yy + '-' + ('0'+mm).slice(-2) + '-' + ('0'+dd).slice(-2); };
    var score = function (x) { return clamp((x.ev.fitScore + 100)/2); };
    C.title = function () { return key(y,m,d) === key(today.y,today.mo,today.d) ? '오늘의 운 지수' : '선택한 날의 운 지수'; };
    C.refresh = function () {
      var gen = ++generation, td = FC.todayData(M,ch,Date.UTC(y,m-1,d,3),DAYMODE);
      H.freeContent().then(function (ov) {
        if (!H.alive(ctx) || gen !== generation) return;
        var result = FC.buildDaily(td,{seed:P.sig(),name:P.name(),overrides:ov}); result.line = td.line; C.paint(result);
      });
    };
    C.html = function () {
      var months = M.wolun(ch,y), days = M.ilun(ch,y,m), choices = [], lookup = {};
      if (purpose) choices = M.pickDays(ch,purpose,searchY,searchM,searchY === today.y && searchM === today.mo ? today.d : 1,range).filter(function (x) { return weekday === 'all' || (weekday === 'weekend' ? x.dow === 0 || x.dow === 6 : x.dow > 0 && x.dow < 6); }).sort(function (a,b) { return b.score-a.score || a.jdn-b.jdn; });
      choices.forEach(function (x) { lookup[key(x.y,x.m,x.d)] = x; });
      var top = choices.filter(function (x) { return x.score >= 62; }).slice(0,3);
      var h = '<section class="fortune-panel"><p class="kick">FORTUNE CALENDAR</p><h1 class="h1">월운 그래프 · 일진 캘린더</h1><p class="sub">달의 흐름을 보고, 내 일정에 맞는 날을 골라보세요.</p><div class="mc-nav"><button type="button" data-year="-1" aria-label="이전 연도">‹</button><h2>'+y+'년 월운 그래프</h2><button type="button" data-year="1" aria-label="다음 연도">›</button></div><div class="mc-chart">';
      months.forEach(function (x) { var dt = new Date(x.startMs+9*3600e3), yy=dt.getUTCFullYear(), mm=dt.getUTCMonth()+1, sc=score(x); h += '<button type="button" class="mc-bar'+(yy===y && mm===m?' active':'')+'" data-month="'+yy+'-'+mm+'" aria-label="'+yy+'년 '+mm+'월 '+esc(x.termName)+', 흐름 '+sc+'"><b>'+sc+'</b><i class="flow-'+x.ev.flow.primaryFlow+'" style="height:'+sc+'%"></i><span>'+mm+'월</span><small>'+esc(x.termName)+'</small></button>'; });
      h += '</div><div class="mc-legend">'+Object.keys(names).map(function (k) { return '<span><i class="flow-'+k+'"></i>'+names[k]+'</span>'; }).join('')+'</div><p class="dsub">높이: 운 흐름 지수(0~100). 월을 누르면 캘린더가 바뀝니다.<br>월운은 절기 기준이며 양력 한 달 안에서도 절기 전후로 흐름이 바뀝니다. 1월 막대는 다음 해 소한입니다.</p></section>';
      var activeMonths = M.wolun(ch,y-1).concat(months).filter(function (x) { return x.startMs <= Date.UTC(y,m-1,d,3); }), activeMonth = activeMonths[activeMonths.length-1];
      if (activeMonth) h += '<p class="mc-month-note">선택한 날의 월운: ' + esc(activeMonth.termName) + ' · ' + names[activeMonth.ev.flow.primaryFlow] + ' · ' + esc(activeMonth.ev.flow.condition.name) + '<br>' + esc({opportunity:'새로운 연락과 작은 시도를 시작해 보세요.',expansion:'하던 일을 넓히되 감당할 수 있는 범위를 정하세요.',harvest:'결과를 정리하고 마무리할 일을 챙겨 보세요.',accumulation:'배우고 준비하면서 다음 단계의 기반을 다져 보세요.'}[activeMonth.ev.flow.primaryFlow]) + '</p>';
      h += '<section class="fortune-panel"><div class="mc-nav"><button type="button" data-nav="-1" aria-label="이전 달">‹</button><h2>'+y+'년 '+m+'월 일진 캘린더</h2><button type="button" data-nav="1" aria-label="다음 달">›</button></div><div class="mc-controls"><label>보기<select id="mc-purpose"><option value="">일상 흐름</option>'+['move','wedding','contract','trip','exam'].map(function (k) { return '<option value="'+k+'"'+(purpose===k?' selected':'')+'>'+esc(M.TAEK_PURPOSE[k].label)+' 택일</option>'; }).join('')+'</select></label>';
      if (purpose) h += '<label>검색 기간<select id="mc-range">'+[30,60,90].map(function (n) { return '<option value="'+n+'"'+(range===n?' selected':'')+'>'+n+'일</option>'; }).join('')+'</select></label><label>요일<select id="mc-weekday">'+[['all','전체'],['weekday','평일'],['weekend','주말']].map(function (x) { return '<option value="'+x[0]+'"'+(weekday===x[0]?' selected':'')+'>'+x[1]+'</option>'; }).join('')+'</select></label>';
      h += '<button type="button" id="mc-today">오늘로</button></div><div class="mc-grid" role="group" aria-label="날짜 선택">'+DOW.map(function (x) { return '<span class="mc-week">'+x+'</span>'; }).join('');
      for(var i=0;i<new Date(Date.UTC(y,m-1,1)).getUTCDay();i++) h += '<span></span>';
      days.forEach(function (x,idx) { var dd=idx+1, f=x.ev.flow, k=key(y,m,dd), pick=lookup[k], recommended=top.some(function (t) { return key(t.y,t.m,t.d)===k; });
        h += '<button type="button" class="mc-day flow-'+f.primaryFlow+(dd===d?' selected':'')+(k===key(today.y,today.mo,today.d)?' is-today':'')+'" data-date="'+k+'" aria-pressed="'+(dd===d)+'" aria-label="'+m+'월 '+dd+'일 '+esc(M.gzNameK(x))+', 흐름 '+score(x)+', '+esc(f.condition.name)+'"><b>'+dd+'</b><small>'+esc(M.gzNameK(x))+'</small><span>'+(pick?'택일 '+pick.score:names[f.primaryFlow]+' '+score(x))+'</span><em>'+(recommended?'추천':f.overlays.defense.active?'부담 점검':f.overlays.volatility.active?'변동':esc(f.condition.name))+'</em></button>';
      });
      h += '</div><p class="dsub">테두리: 선택한 날 · 점: 오늘 / 색: 주 흐름<br>날짜를 누르면 아래 운 지수와 행동 안내가 함께 바뀝니다.</p>';
      if(purpose) {
        h += '<h3>추천 날짜</h3><p class="dsub">'+searchM+'월 '+(searchY===today.y && searchM===today.mo?today.d:1)+'일부터 '+range+'일간 · '+esc(M.TAEK_PURPOSE[purpose].label)+'</p>';
        h += top.length ? top.map(function (x) { var good=x.reasons.filter(function (r) { return r.pts>0; }).slice(0,2), caution=x.reasons.filter(function (r) { return r.pts<0; }).slice(0,1); return '<button type="button" class="mc-pick" data-date="'+key(x.y,x.m,x.d)+'"><b>'+x.m+'/'+x.d+'('+DOW[x.dow]+') · 택일 '+x.score+' · '+esc(x.grade)+'</b><span>'+good.map(function (r) { return esc(r.text); }).join(' · ')+'</span>'+(caution.length?'<small>살필 점: '+esc(caution[0].text)+'</small>':'')+'</button>'; }).join('') : '<p>이 조건에는 양호 이상의 날짜가 없습니다. 기간이나 요일 조건을 바꿔보세요.</p>';
        var selected=lookup[key(y,m,d)]; if(selected) h += '<p>선택한 날의 '+esc(M.TAEK_PURPOSE[purpose].label)+' 택일 적합도: '+selected.score+' · '+esc(selected.grade)+'</p>';
        h += '<p class="dsub">택일은 목적별 적합도를 따로 계산합니다. 운 흐름 지수와 다른 점수이며 성공 확률이 아닙니다.</p>';
      }
      return h+'</section>';
    };
    C.bind = function (el) {
      H.$$('[data-date]',el).forEach(function (b) { b.onclick=function () { var a=b.dataset.date.split('-').map(Number); y=a[0];m=a[1];d=a[2];C.refresh(); }; });
      H.$$('[data-month]',el).forEach(function (b) { b.onclick=function () { var a=b.dataset.month.split('-').map(Number); if(a[0]>2098)return;y=a[0];m=a[1];searchY=y;searchM=m;d=1;C.refresh(); }; });
      H.$$('[data-nav],[data-year]',el).forEach(function (b) { b.onclick=function () { var dt=new Date(Date.UTC(y+(+b.dataset.year||0),m-1+(+b.dataset.nav||0),1));if(dt.getUTCFullYear()<1901||dt.getUTCFullYear()>2098)return;y=dt.getUTCFullYear();m=dt.getUTCMonth()+1;searchY=y;searchM=m;d=1;C.refresh(); }; });
      $('#mc-today',el).onclick=function () { y=today.y;m=today.mo;searchY=y;searchM=m;d=today.d;C.refresh(); };
      $('#mc-purpose',el).onchange=function () { purpose=this.value;C.refresh(); };
      if(purpose) { $('#mc-range',el).onchange=function () { range=+this.value;C.refresh(); };$('#mc-weekday',el).onchange=function () { weekday=this.value;C.refresh(); }; }
    };
    return C;
  }

  H.route('today', function (q, ctx) {
    needSaju(ctx, 'today', function (ch) {
      var cal = calendar(ch, ctx);
      cal.paint = function (d) {
        if (!H.alive(ctx)) return; var nm = P.name();
        var meta = function (k) { return FLD.filter(function (x) { return x[0] === k; })[0]; };
        var cards = d.order.map(function (k) { var v = d.fields[k], f = meta(k); return '<a class="dc' + (q.f === k ? ' hl' : '') + '" id="d-' + k + '" href="#dd-' + k + '" data-jump="' + k + '"><small>' + f[2] + '</small><b>' + f[1] + '</b><span>' + esc(v.band) + '</span><div class="bar"><i style="width:' + clamp(v.score) + '%"></i></div></a>'; }).join('');
        var detail = d.order.map(function (k) {
          var v = d.fields[k], f = meta(k);
          return '<details class="dd" id="dd-' + k + '" data-f="' + k + '"' + (q.f === k ? ' open' : '') + '><summary><span><small>' + f[2] + '</small><b>' + f[1] + ' · ' + esc(v.band) + '</b><em>' + esc(v.summary) + '</em></span><i class="chev" aria-hidden="true"></i></summary><div class="ddb">' +
            v.detail.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + (v.examples ? '<div class="chips ex">' + v.examples.map(function (x) { return '<i>' + esc(x.trim()) + '</i>'; }).join('') + '</div>' : '') +
            '<div class="gc"><div class="g"><h5>좋은 행동</h5>' + lis(v.goodActions) + '</div><div class="c"><h5>주의할 행동</h5>' + lis(v.cautions) + '</div></div></div></details>';
        }).join('');
        var ev = d.evidence, why = '<details class="dd why" id="d-why"><summary><span><b>왜 이런 결과가 나왔나요?</b></span><i class="chev" aria-hidden="true"></i></summary><div class="ddb"><p>' + esc(ev.intro) + '</p>' +
          ev.plain.map(function (x) { return '<div class="ev"><h5>' + esc(x.title) + '</h5><p>' + esc(x.body) + '</p></div>'; }).join('') +
          '<details class="pro"><summary>전문 해석 보기</summary>' + lis(ev.pro) + '</details></div></details>';
        var el = H.view(cal.html() + '<section class="tscore" id="selected-fortune"><h2>' + cal.title() + '</h2><p class="kick">' + +d.date.slice(5, 7) + '월 ' + +d.date.slice(8) + '일 ' + d.dow + '요일 · ' + esc(d.gz) + '日</p><div class="ring" style="--p:' + d.overallScore + '"><b>' + d.overallScore + '</b></div><div class="tflow">' + esc(String(d.phase).replace(/기$/, '운')) + ' · ' + esc(d.cond) + '</div><p class="sub" style="margin-top:6px">' + (nm ? esc(nm) + '님, ' : '') + esc(d.line) + '</p>' +
          '<p class="dhead">“' + esc(d.headline) + '”</p>' + (d.notes.length ? '<p class="note">' + esc(d.notes.join(' ')) + '</p>' : '') + '</section>' +
          '<div class="dgrid">' + cards + '</div>' +
          '<section class="dsec"><h3>이날의 핵심</h3><p>' + esc(d.summary) + '</p><p>' + esc(d.summary2) + '</p></section>' +
          '<section class="dsec"><h3>분야별로 자세히 보기</h3><p class="dsub">궁금한 분야를 눌러 펼쳐 보세요.</p>' + detail + '</section>' +
          '<section class="actcard" id="d-action"><h3>이날의 행동 처방</h3><h5>하면 좋은 것</h5><div class="chips tg">' + tags(d.todayActions) + '</div><h5>미루면 좋은 것</h5><div class="chips tg avoid">' + tags(d.avoidActions) + '</div><div class="one"><small>이날의 한 문장</small><p>“' + esc(d.closingMessage) + '”</p></div></section>' +
          '<section class="dsec">' + why + '</section>' +
          '<p class="dis">점수는 선택한 날의 일진이 내 사주에 필요한 기운인지를 따진 값입니다. 사건을 확정하지 않는 참고용 흐름이며, 컨디션은 의학적 진단이 아닌 생활 리듬의 참고입니다.</p>' +
          '<section class="nextc"><p class="q">' + esc(d.next.q) + '</p><a class="btn" href="' + esc(d.next.to) + '" data-track="today_cta_click" data-p="' + esc(d.next.track) + '">' + esc(d.next.btn) + '</a><a class="btn ghost sm" href="#/my" data-track="fortune_content_click" data-p="from_today_my">MY 운명으로</a></section>', { keepScroll: cal.draws++ > 0 });
        cal.bind(el);
        H.track('fortune_content_view', { content: 'today', flow: d.flowKey }); H.track('today_open', { flow: d.flowKey, cta: d.next.key }, true);
        H.$$('details.dd', el).forEach(function (x) { x.addEventListener('toggle', function () { if (x.open) H.track(x.id === 'd-why' ? 'today_evidence_expand' : 'today_detail_expand', { field: x.dataset.f || 'why' }); }); });
        H.$$('[data-jump]', el).forEach(function (a) { a.onclick = function (e) { e.preventDefault(); var t = H.$('#dd-' + a.dataset.jump, el); if (t) { t.open = true; t.scrollIntoView({ block: 'center', behavior: H.reduce ? 'auto' : 'smooth' }); } }; });
        if (q.f && cal.draws === 1) { var tg = $('#dd-' + q.f, el) || $('#d-' + q.f, el); if (tg && tg.scrollIntoView) setTimeout(function () { tg.scrollIntoView({ block: 'center', behavior: H.reduce ? 'auto' : 'smooth' }); }, 120); }
      };
      cal.refresh();
    });
  });

  /* ───────── 일주 각성 (15~30초) ─────────
     사주 계산 → 이름 → 일간 → 일주 → 짧은 설명 → "이제, 당신의 이야기를 시작합니다" → MY 운명. 화면을 탭하면 다음으로, 건너뛰기도 가능.
     영상은 관리자가 올려 둔 일간·일주 영상(/api/awakening)이 있을 때만 배경으로 깔고, 없으면 글만 나온다. */
  H.route('awaken', function (q, ctx) {
    needSaju(ctx, 'awaken', function (ch, kit) { play(ch, kit, ctx, !!q.replay); });
  });
  function play(ch, kit, ctx, replay) {
    var M = kit.M, T = kit.T, nm = P.name(), g = ch.gender, day = ch.pillars.day, stemK = M.STEM_K[day.s], ju = M.gzNameK(day);
    var ig = T.ilganCard(stemK, nm), jc = T.ijuCard(ju, nm, g), pot = null;
    try { var gr = ch.weights.groups, mi = 0; for (var i = 1; i < 5; i++) if (gr[i] > gr[mi]) mi = i; pot = { group: GROUPS5[mi], name: POTENTIAL[GROUPS5[mi]] }; } catch (e) { }
    var steps = [];
    if (nm) steps.push({ ms: 2300, vid: 'ilgan', html: '<div class="nm aw-in">' + esc(nm) + '.</div>' });
    steps.push({ ms: 4200, vid: 'ilgan', html: '<p class="a1 aw-in">당신의 중심은</p><div class="big aw-in">' + esc(ig ? ig.title.split(' · ')[0] : M.STEM[day.s]) + '</div>' + (ig ? '<p class="a1 aw-in">' + br(ig.line) + '</p>' : '') });
    steps.push({ ms: 3200, vid: 'iju', html: '<p class="a1 aw-in">그리고 당신이 태어난 날은</p><div class="big aw-in">' + esc(M.gzName(day)) + '</div>' });
    if (jc) steps.push({ ms: 6500, vid: 'iju', html: '<p class="film aw-in">' + br(jc.film) + '</p><p class="ttl aw-in">' + esc(jc.title) + '</p><p class="trait aw-in">' + br(jc.trait) + '</p>' });
    steps.push({ ms: 2600, vid: 'iju', html: '<p class="film aw-in">이제,<br>당신의 이야기를 시작합니다.</p>' });
    var host = document.createElement('div'); host.id = 'awk'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-label', '일주 각성');
    host.innerHTML = '<video class="vid" muted playsinline loop preload="auto" hidden></video><div class="shade"></div><div class="stage" id="awStage" aria-live="polite"></div><button type="button" class="skip" id="awSkip">건너뛰기 ›</button><div class="tap" aria-hidden="true">TAP</div>';
    document.body.appendChild(host);
    var stage = $('#awStage', host), vid = $('.vid', host), timer = 0, i = -1, done = false, clips = null;
    function setVideo(kind) { // 있을 때만: 일간 영상 → 일주 변신 영상
      var c = clips && (kind === 'iju' ? (clips.video || clips.fallback) : clips.ilgan); var u = c && (c.videoUrl || c.videoWebm);
      if (!u) { vid.classList.remove('on'); return; }
      if (vid.getAttribute('data-k') === kind) return; vid.setAttribute('data-k', kind);
      vid.hidden = false; if (c.posterUrl) vid.poster = c.posterUrl; vid.src = u; vid.onerror = function () { vid.classList.remove('on'); vid.hidden = true; }; vid.oncanplay = function () { vid.classList.add('on'); }; var p = vid.play(); if (p && p.catch) p.catch(function () { });
    }
    function show() {
      clearTimeout(timer); i++; if (i >= steps.length) return finish(false);
      var s = steps[i]; stage.innerHTML = s.html; setVideo(s.vid); timer = setTimeout(show, s.ms);
    }
    function finish(skipped) {
      if (done) return; done = true; clearTimeout(timer); host.remove(); H.cleanup = null;
      if (!replay) P.markAwakened(); H.track('ilju_awakening_complete', { skipped: skipped ? 1 : 0, replay: replay ? 1 : 0 });
      H.replace('#/my');
    }
    H.cleanup = function () { done = true; clearTimeout(timer); };
    host.onclick = function (e) { if (e.target.id === 'awSkip') finish(true); else show(); };
    H.track('ilju_awakening_start', { replay: replay ? 1 : 0 }); show();
    if (!(navigator.connection && navigator.connection.saveData)) fetch('/api/awakening?pillar=' + encodeURIComponent(ju) + '&gender=' + g).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) { if (d && !done) { clips = d; if (steps[i]) setVideo(steps[i].vid); } }).catch(function () { });
  }

  /* ───────── MY 운명 홈 ───────── */
  var tile = function (title, small, href, p, extra) { return '<a class="tile' + (extra ? ' ' + extra : '') + '" href="' + href + '" data-track="fortune_content_click" data-p="' + p + '"><b>' + title + '</b><small>' + small + '</small></a>'; };
  H.route('my', function (q, ctx) {
    if (!P.has()) return H.replace('#/input?next=my');
    if (!P.awakened() && !q.s) return H.replace('#/awaken'); // 첫 방문: 일주 각성을 먼저 거친다
    needSaju(ctx, 'my', function (ch, kit) {
      var M = kit.M, T = kit.T, nm = P.name(), day = ch.pillars.day, t = Saju.todayData(ch), stemK = M.STEM_K[day.s], S = T.DATA.S[stemK] || {};
      var pct = (ch.weights && ch.weights.pct) || [], bars = M.EL_K.map(function (e, i) { var v = Math.round(pct[i] || 0); return '<div class="eb"><span>' + esc(e) + '</span><div class="eb-t"><i style="width:' + Math.max(2, Math.min(100, v * 2)) + '%;background:' + EL_COL[i] + '"></i></div><b>' + v + '%</b></div>'; }).join('');
      var gr = (ch.weights && ch.weights.groups) || [], mi = 0; for (var i = 1; i < gr.length; i++) if (gr[i] > gr[mi]) mi = i;
      var jc = T.ijuCard(M.gzNameK(day), nm, ch.gender);
      var me = '<div class="me-body" id="meBody" hidden><div class="eb-wrap">' + bars + '</div>' + (gr.length ? '<p class="sub" style="margin-top:8px;font-size:.92rem">가장 큰 동력은 <em>' + esc(POTENTIAL[GROUPS5[mi]]) + '</em>입니다 (' + GROUPS5[mi] + ' 기운 ' + Math.round(gr[mi]) + '%).</p>' : '') +
        '<div class="sw">' + (S.strength ? '<div><small>나의 강점</small>' + esc(S.strength) + '</div>' : '') + (jc ? '<div><small>주의할 성향</small>' + esc(jc.trait.split(', ').slice(-1)[0] || '') + '</div>' : '') + (S.tip ? '<div><small>이렇게 다뤄 보세요</small>' + esc(S.tip) + '</div>' : '') + '</div></div>';
      var el = H.view(
        '<section class="myhead"><p class="kick">MY 運命</p><h1 class="who">' + (nm ? esc(nm) + '님의 운명' : '나의 운명') + '</h1><div class="ilju"><b>' + esc(M.gzName(day)) + '</b><span>' + esc(M.gzNameK(day)) + '일주</span></div></section>' +
        '<a class="todaycard" href="#/today" data-track="fortune_content_click" data-p="today_card"><div class="ring" style="--p:' + t.score + '"><b>' + t.score + '</b></div><div><p class="lb">오늘의 흐름 · ' + esc(String(t.phase).replace(/기$/, '운')) + '</p><h3>' + esc(t.cond) + '의 날</h3><p>' + esc(t.line) + '</p></div></a>' +
        '<section class="grp"><h2>오늘의 나</h2><div class="tiles">' +
        tile('월운 · 일진 캘린더', '흐름을 보고 날짜 고르기', '#/today', 'today') + tile('재물운', '오늘의 돈 흐름', '#/today?f=money', 'today_money') + tile('일·사업운', '오늘의 일 흐름', '#/today?f=work', 'today_work') + tile('연애운', '오늘의 인연 흐름', '#/today?f=love', 'today_love') + tile('컨디션', '몸과 마음의 균형', '#/today?f=health', 'today_health') + tile('오늘의 행동 가이드', '오늘 하면 좋은 일', '#/today?f=action', 'today_action') + '</div></section>' +
        '<section class="grp"><h2>나라는 사람</h2><div class="tiles">' +
        '<button type="button" class="tile wide" id="meBtn" data-track="fortune_content_click" data-p="me_profile"><b>오행 · 십성 · 강점과 주의할 성향</b><small>내 안의 다섯 기운과 가장 큰 동력</small></button>' + me +
        tile('일간 · 일주 다시 보기', '일주 각성 연출', '#/awaken?replay=1', 'ilju_replay', 'wide') + '</div></section>' +
        '<section class="grp"><h2>심층 콘텐츠</h2><div class="tiles"><a class="tile wide" href="#/go?to=life" data-track="premium_cta_click" data-p="deep_movingtoon"><b>심층 무빙툰, 종합 리포트</b><small>인생 지도부터 연애·재물·직장, 개운 가이드까지 한 편으로 읽는 나의 운로</small></a></div></section>' +
        '<p class="dis">사주는 참고용 콘텐츠이며 미래를 단정하지 않습니다.</p>');
      $('#meBtn', el).onclick = function () { var b = $('#meBody', el); b.hidden = !b.hidden; };
      H.track('fortune_home_view', { awakened: 1 });
    });
  });
})(window);
