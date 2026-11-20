/* 인연운 심화 마지막 장 '그 사람과 나의 궁합'(2026-11-20, timeline_love_compat)
   · 인연운 심화(세계 w3)를 구매해 보유한 기간(받은 날부터 12개월)에는 언제든 상대 정보를 넣어 궁합을 본다.
   · 계산은 서버(/api/love-compat, functions/_love-compat.js)가 만세력 궁합 탭과 같은 엔진으로 한다:
     compat-pair.js(PairCompat.evaluate) · compat-day.js(일주 적합도) · amhap.js(MantraAmhap.compat, 숨은 인연 — 암합).
     잠금(구매·12개월 만료)과 하루 10회 제한은 서버가 검사하고, 이 화면은 남은 횟수를 보여 준다.
   · 화면 구성은 만세력 index.html prResult()(점수 → 한눈에 정리 → 서로에게 주는 것 → 두 사람의 간지 관계 → 숨은 인연 암합 → 근거)를 따른다.
   · 자리: 인연운 심화의 마지막 장(placeLast — explore.js·관리자 타임라인 구성이 세계 끝에 고정). 관리자에서 노출·제목을 바꿀 수 있다.
   · 상대 생년월일은 이 기기(localStorage)에만 최근 8명 저장한다. 서버는 저장하지 않는다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var VERSION = 'love-compat-20261120-1';
  var ID = 'timeline_love_compat', TITLE = '그 사람과 나의 궁합', TOPIC = 'love';
  var API = '/api/love-compat', LIST_KEY = 'mt_love_compat_partners', DEV = 'mt_dev_id';
  var CITIES = [['서울', 126.98], ['부산', 129.08], ['대구', 128.60], ['인천', 126.70], ['광주', 126.85], ['대전', 127.38], ['울산', 129.31], ['세종', 127.29], ['수원', 127.03], ['고양', 126.83], ['성남', 127.14], ['용인', 127.18], ['청주', 127.49], ['천안', 127.15], ['전주', 127.15], ['목포', 126.39], ['여수', 127.66], ['포항', 129.36], ['경주', 129.22], ['안동', 128.73], ['창원', 128.68], ['진주', 128.11], ['춘천', 127.73], ['강릉', 128.90], ['제주', 126.53]];
  var REL = { lover: '연인·부부', work: '직장·동업', friend: '친구', family: '가족' };
  var ERR = { 'daily-limit': '오늘 궁합 보기를 모두 썼어요. 내일(한국 시간 자정) 다시 열려요.', 'ip-limit': '이 네트워크에서 오늘 볼 수 있는 궁합을 모두 썼어요. 내일 다시 열려요.', unavailable: '지금은 궁합을 볼 수 없어요. 잠시 후 다시 시도해 주세요.', 'commerce-unavailable': '구매 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.' };

  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var store = { get: function (k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }, set: function (k, v) { try { root.localStorage.setItem(k, v); } catch (e) { } } };
  function josa(w, pair) { var M = root.Manse; if (M && M.josa) return M.josa(w, pair); var t = String(w), c = t.charCodeAt(t.length - 1), p = pair.split('/'); return t + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? p[0] : p[1]); }
  function device() {
    var v = store.get(DEV); if (v && /^[a-z0-9]{16,40}$/.test(v)) return v;
    var a = new Uint8Array(12); try { root.crypto.getRandomValues(a); } catch (e) { for (var i = 0; i < 12; i++) a[i] = Math.floor(Math.random() * 256); }
    v = Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join(''); store.set(DEV, v); return v;
  }

  // ───────── 장 만들기·끼우기 ─────────
  var S = { me: null, name: '', gender: 'M', chapter: null, status: null, statusP: null, inp: null, res: null, rel: 'lover', editing: true, busy: false, err: '', locked: null, list: [] };
  function meOf(ch) {
    var i = (ch && ch.input) || {}, o = {};
    ['year', 'month', 'day', 'hour', 'minute', 'calendar', 'leap', 'gender', 'lon', 'timeMode', 'jasi', 'sinsalBase', 'model', 'school', 'combinationMode', 'climatePalaceMode'].forEach(function (k) { if (i[k] !== undefined) o[k] = i[k]; });
    if (!o.gender && ch) o.gender = ch.gender === 'F' ? 'F' : 'M';
    if (o.hour == null) o.hourUnknown = true;
    return o;
  }
  function chapter(act) {
    var head = '<section class="scene rd-head rd-chead" data-sc="lc-head"><div class="rd-rule" aria-hidden="true"></div><div class="no">LOVE · MATCH</div><h2>' + esc(TITLE) + '</h2><p class="sub">마음에 둔 사람, 지금 곁에 있는 사람의 생년월일을 넣으면 두 사람의 사주를 직접 맞대어 봅니다.</p></section>';
    var body = '<section class="scene rv rd-react lc-wrap" data-sc="lc-main"><div class="lc-root" data-lc-root>' + rootHtml() + '</div></section>';
    return {
      id: ID, base: ID, title: TITLE, kind: 'life', act: act, editorialTopicId: TOPIC, editorialContractId: ID, aiEnabled: false, readingDeferred: false,   // aiEnabled:false → 풀이 AI(full-reading.js) 대상 아님. readingSupplementary 는 본문을 '더 깊이 읽기'로 접어서 쓰지 않는다
      readingProvider: 'local-engine-compat', loveCompat: true, placeLast: true,
      scenes: [{ sceneId: 'lc-head', sceneType: 'life', episode: true, html: head }, { sceneId: 'lc-main', sceneType: 'life', episode: true, html: body }],
    };
  }
  function add(rep, sd, name, M, ch) {
    if (!rep || !rep.chapters || rep.chapters.some(function (c) { return c.id === ID; })) return rep;
    var list = rep.chapters.slice(), last = -1;
    list.forEach(function (c, i) { if (c.editorialTopicId === TOPIC) last = i; });
    if (last < 0) return rep;   // 인연운 장이 없는 문서(주제 꺼짐·미리보기)에는 넣지 않는다
    S.me = meOf(ch); S.name = String(name || '').trim().replace(/님$/, '').slice(0, 12); S.gender = S.me.gender || 'M';
    var c = chapter(list[last].act); S.chapter = c;
    list.splice(last + 1, 0, c);
    list.forEach(function (x, j) { if (x.no !== j + 1) list[j] = Object.assign({}, x, { no: j + 1 }); });
    S.chapter = list[last + 1];
    watch();
    return Object.assign({}, rep, { chapters: list });
  }

  // ───────── 서버 ─────────
  function headers() { var h = { 'content-type': 'application/json' }; try { if (R.Paywall && R.Paywall.headers) Object.assign(h, R.Paywall.headers()); } catch (e) { } return h; }
  function post(body) {
    body.device = device(); body.me = S.me; body.name = S.name;
    return root.fetch(API, { method: 'POST', headers: headers(), body: JSON.stringify(body), cache: 'no-store' }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { d = d || {}; d.status = r.status; return d; }); });
  }
  function loadStatus(force) {
    if (!S.me || !root.fetch) return Promise.resolve(null);
    if (S.statusP && !force) return S.statusP;
    S.statusP = post({ a: 'status' }).then(function (d) { if (d && d.ok) { S.status = d; if (d.access && !d.access.ok) S.locked = d.access.reason; else S.locked = null; } paint(); return d; }).catch(function () { S.statusP = null; return null; });
    return S.statusP;
  }

  // ───────── 입력 ─────────
  function defaults() { return { name: '', gender: S.gender === 'M' ? 'F' : 'M', calendar: 'solar', leap: false, year: 1990, month: 1, day: 1, hour: 12, minute: 0, hourUnknown: false, city: '서울', lon: 126.98 }; }
  function loadList() { try { var l = JSON.parse(store.get(LIST_KEY) || '[]'); return Array.isArray(l) ? l.slice(0, 8) : []; } catch (e) { return []; } }
  function saveList(l) { store.set(LIST_KEY, JSON.stringify(l.slice(0, 8))); }
  var keyOf = function (x) { return [x.name, x.year, x.month, x.day, x.hourUnknown ? '-' : x.hour, x.minute, x.gender, x.calendar].join('|'); };
  function quotaLine() {
    var q = S.status && S.status.quota;
    if (!q) return '<p class="lc-q" data-lc-quota>오늘 남은 횟수를 확인하는 중…</p>';
    if (q.unlimited) return '<p class="lc-q" data-lc-quota>관리자 보기 — 횟수 제한 없이 볼 수 있어요.</p>';
    return '<p class="lc-q' + (q.left <= 0 ? ' lc-q0' : '') + '" data-lc-quota>오늘 남은 궁합 보기 <b>' + q.left + '</b> / ' + q.limit + '회 <span>· 한국 시간 자정에 다시 채워져요</span></p>';
  }
  function lockHtml() {
    var r = S.locked;
    return '<div class="lc-lock"><p><b>인연운 심화를 보유한 동안 열리는 장이에요.</b></p><p>' + (r === 'login' ? '구매한 계정으로 로그인하면 바로 볼 수 있어요.' : r === 'unavailable' ? ERR['commerce-unavailable'] : '인연운 심화를 구매하면 이용 기간(12개월) 동안 언제든 상대를 바꿔 가며 하루 10번까지 궁합을 볼 수 있어요.') + '</p>' +
      (r !== 'unavailable' && R.Paywall ? '<button type="button" class="btn lc-btn" data-lc="buy">' + (r === 'login' ? '로그인하기' : '구매하고 열기') + '</button>' : '') + '</div>';
  }
  function formHtml() {
    var i = S.inp || (S.inp = defaults()), y = new Date().getFullYear(), minY = (root.Manse && root.Manse.MIN_Y) || 1900;
    var sel = function (name, a, b, v, suf) { var h = '<select data-f="' + name + '" aria-label="' + suf + '">'; for (var k = a; k <= b; k++) h += '<option value="' + k + '"' + (+v === k ? ' selected' : '') + '>' + k + suf + '</option>'; return h + '</select>'; };
    var seg = function (name, opts, v) { return '<div class="lc-seg" role="group">' + opts.map(function (o) { return '<button type="button" data-lc-set="' + name + ':' + o[0] + '" aria-pressed="' + (v === o[0]) + '">' + o[1] + '</button>'; }).join('') + '</div>'; };
    var recent = S.list.length ? '<div class="lc-recent"><span>최근 본 사람</span>' + S.list.map(function (x, k) { return '<span class="lc-chip"><button type="button" data-lc-pick="' + k + '">' + esc(x.name || (x.year + '.' + x.month + '.' + x.day)) + '</button><button type="button" class="lc-x" data-lc-del="' + k + '" aria-label="지우기">×</button></span>'; }).join('') + '</div>' : '';
    var q = S.status && S.status.quota, out = q && !q.unlimited && q.left <= 0;
    return '<form class="lc-form" data-lc-form novalidate>' + recent +
      '<label class="lc-f lc-wide"><span>상대 이름 (선택)</span><input data-f="name" maxlength="12" value="' + esc(i.name) + '" placeholder="이름 또는 별명"></label>' +
      '<div class="lc-row"><div class="lc-f"><span>성별</span>' + seg('gender', [['M', '남'], ['F', '여']], i.gender) + '</div><div class="lc-f"><span>달력</span>' + seg('calendar', [['solar', '양력'], ['lunar', '음력']], i.calendar) + '</div>' + (i.calendar === 'lunar' ? '<label class="lc-ck"><input type="checkbox" data-f="leap"' + (i.leap ? ' checked' : '') + '> 윤달</label>' : '') + '</div>' +
      '<div class="lc-row"><div class="lc-f"><span>생년월일</span><div class="lc-sel">' + sel('year', minY, y, i.year, '년') + sel('month', 1, 12, i.month, '월') + sel('day', 1, 31, i.day, '일') + '</div></div></div>' +
      '<div class="lc-row"><div class="lc-f"><span>태어난 시각</span><div class="lc-sel">' + sel('hour', 0, 23, i.hour, '시') + sel('minute', 0, 59, i.minute, '분') + '</div></div><label class="lc-ck"><input type="checkbox" data-f="hourUnknown"' + (i.hourUnknown ? ' checked' : '') + '> 시간 모름</label></div>' +
      '<div class="lc-row"><label class="lc-f"><span>출생지</span><select data-f="city">' + CITIES.map(function (c) { return '<option value="' + c[0] + '"' + (c[0] === i.city ? ' selected' : '') + '>' + c[0] + '</option>'; }).join('') + '</select></label></div>' +
      '<p class="lc-note">시간 계산 기준(진태양시·자시 등)은 내 사주와 같은 설정을 씁니다. 시간을 모르면 시주 없이 비교합니다. 상대 정보는 이 기기에만 저장돼요.</p>' +
      '<div class="lc-go"><button type="submit" class="btn lc-btn lc-primary"' + (S.busy || out ? ' disabled' : '') + '>' + (S.busy ? '두 사주를 맞대어 보는 중…' : '궁합 보기') + '</button>' + (S.err || out ? '<span class="lc-err" role="alert">' + esc(S.err || ERR['daily-limit']) + '</span>' : '') + '</div></form>';
  }
  function readForm(form) {
    var i = S.inp || (S.inp = defaults()), g = function (k) { return form.querySelector('[data-f="' + k + '"]'); };
    if (g('name')) i.name = g('name').value.trim().slice(0, 12);
    ['year', 'month', 'day', 'hour', 'minute'].forEach(function (k) { if (g(k)) i[k] = +g(k).value; });
    i.hourUnknown = !!(g('hourUnknown') && g('hourUnknown').checked); i.leap = i.calendar === 'lunar' && !!(g('leap') && g('leap').checked);
    if (g('city')) { i.city = g('city').value; var c = CITIES.filter(function (x) { return x[0] === i.city; })[0]; i.lon = c ? c[1] : 126.98; }
  }
  function submit() {
    if (S.busy) return;
    var i = S.inp; S.err = ''; S.busy = true; paint();
    post({ a: 'run', partner: i, partnerName: i.name }).then(function (d) {
      S.busy = false;
      if (d && d.quota && S.status) S.status.quota = d.quota;
      if (d && d.ok) {
        S.res = d.result; S.rel = 'lover'; S.editing = false;
        var rec = Object.assign({}, i); S.list = [rec].concat(S.list.filter(function (x) { return keyOf(x) !== keyOf(rec); })).slice(0, 8); saveList(S.list);
        track('love_compat_view');
      } else if (d && (d.status === 401 || d.status === 402)) { S.locked = d.locked && d.locked.reason || 'purchase'; }
      else S.err = (d && (ERR[d.error] || d.message)) || '궁합을 보지 못했어요. 잠시 후 다시 시도해 주세요.';
      paint(); if (!S.editing) scrollTop();
    }).catch(function () { S.busy = false; S.err = '연결이 불안정해요. 잠시 후 다시 시도해 주세요.'; paint(); });
  }
  function track(name) { try { root.dispatchEvent(new CustomEvent('mt:track', { detail: { name: name, chapter: ID } })); } catch (e) { } }
  function scrollTop() { var el = root.document && root.document.querySelector('[data-lc-root]'); if (el && el.scrollIntoView) try { el.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (e) { } }

  // ───────── 결과(만세력 prResult 와 같은 구성) ─────────
  var EL = '木火土金水', EL_K = ['목', '화', '토', '금', '수'];
  var elTxt = function (e) { return EL_K[e] + '(' + EL[e] + ')'; };
  var BAND = function (s) { return s >= 72 ? 0 : s >= 50 ? 1 : 2; };
  var PART_TXT = {
    yong: ['서로의 부족한 기운을 채워 줍니다. 함께 있으면 힘이 나는 사이예요.', '기운 면에서는 크게 돕지도 해치지도 않습니다.', '서로에게 필요한 기운이 아니라서, 오래 붙어 있으면 에너지가 새기 쉽습니다.'],
    dayStem: ['성향과 사고방식이 잘 맞습니다. 말이 통하는 사이예요.', '성향은 무난하게 맞춰 갈 수 있습니다.', '생각하는 방식이 달라 자주 엇갈립니다.'],
    dayBranch: ['마음 깊은 곳이 통합니다. 속마음을 편하게 터놓을 수 있어요.', '속마음은 무난하게 맞습니다.', '마음자리가 부딪칩니다. 가까울수록 서운함과 마찰이 커져요.'],
    harmony: ['두 사람의 전체 사주가 서로 잘 맞물려 있습니다.', '맞물리는 자리와 부딪치는 자리가 섞여 있습니다.', '사주 곳곳에서 부딪치는 자리가 많아 신경 쓸 일이 자주 생깁니다.'],
    balance: ['한쪽이 이끌고 한쪽이 받쳐 주는 균형이 좋습니다.', '균형은 무난합니다.', '둘 다 비슷하게 치우쳐 있어 같은 약점이 함께 드러나기 쉽습니다.'],
    tenGod: ['서로가 가진 십성이 상대에게 꼭 필요한 역할(보호·표현·성과·책임·협력)로 작동합니다.', '서로 주고받는 역할이 도움과 부담을 함께 가지고 있습니다.', '서로가 주는 역할이 상대에게는 부담으로 다가오기 쉬워, 역할을 따로 정해 두는 편이 좋습니다.'],
    relation: ['이 관계에서 기대하는 역할이 자연스럽게 맞물립니다.', '이 관계에서 필요한 역할은 무난하게 맞춰 갈 수 있습니다.', '이 관계에서 서로 기대하는 역할이 어긋나기 쉽습니다.'],
  };
  var REL_TIP = { lover: '중요한 이야기는 감정이 가라앉은 뒤에 하고, 기념일과 돈 문제는 미리 약속을 정해 두세요.', work: '역할과 책임을 문서로 나누고, 의견이 갈리면 근거 자료로 결정하세요.', friend: '서운한 점은 쌓아 두지 말고 가볍게 바로 말하세요.', family: '가까운 사이일수록 말투를 조심하고, 돌봄과 간섭의 선을 정해 두세요.' };
  var SUMMARY = {
    lover: ['서로 부족한 곳을 채우고 속마음까지 잘 통하는, 만나기 어려운 짝입니다.', '큰 틀에서 서로 힘이 되는 짝입니다. 다투더라도 금방 풀리는 편이에요.', '잘 맞는 부분이 확실히 많은 짝입니다. 몇 가지만 조심하면 오래 편안하게 지낼 수 있어요.', '크게 좋지도 나쁘지도 않은 무난한 짝입니다. 서로 맞춰 가는 만큼 관계가 깊어져요.', '끌림과 마찰이 함께 있는 짝입니다. 서로의 속도와 표현 방식을 맞춰 가야 오래가요.', '자주 부딪치기 쉬운 짝입니다. 감정이 오를 때의 규칙과 거리를 미리 정해 두면 관계를 지킬 수 있어요.'],
    work: ['역할이 자연스럽게 나뉘고 손발이 척척 맞는, 함께 일하기 아주 좋은 파트너입니다.', '서로의 빈자리를 채워 주는 든든한 동료입니다. 의견이 갈려도 결과로 금방 맞춰져요.', '함께 일하면 득이 되는 부분이 많은 사이입니다. 역할과 책임만 분명히 하면 성과가 납니다.', '무난하게 협업할 수 있는 사이입니다. 일하는 방식을 처음에 맞춰 두면 훨씬 수월해져요.', '일하는 방식이 자주 엇갈릴 수 있는 사이입니다. 결정 기준과 역할을 문서로 정해 두세요.', '함께 일할 때 마찰이 커지기 쉬운 사이입니다. 업무 범위를 나누고 중요한 결정은 근거 자료로 하세요.'],
    friend: ['말하지 않아도 통하고 함께 있으면 편한, 오래 갈 친구입니다.', '서로에게 힘이 되는 좋은 친구입니다. 서운한 일이 생겨도 금방 풀려요.', '잘 맞는 구석이 많은 친구입니다. 가끔 생기는 서운함만 바로 풀면 오래갑니다.', '편하게 어울릴 수 있는 무난한 친구입니다. 자주 만날수록 더 가까워져요.', '취향이나 속도가 엇갈려 서운함이 생기기 쉬운 친구입니다. 서로 다른 점을 인정하는 게 먼저예요.', '가까워질수록 부딪치기 쉬운 친구입니다. 적당한 거리를 두는 편이 오히려 오래갑니다.'],
    family: ['서로를 든든하게 받쳐 주는, 마음이 잘 통하는 가족입니다.', '서로에게 힘이 되는 가족입니다. 다투더라도 금방 풀리는 편이에요.', '대체로 잘 맞는 가족입니다. 몇 가지 생활 습관만 맞추면 편안하게 지낼 수 있어요.', '무난한 가족 사이입니다. 서로의 생활 방식을 존중할수록 사이가 좋아져요.', '가까운 만큼 부딪치는 일이 생기기 쉬운 가족입니다. 돌봄과 간섭의 선을 함께 정해 두세요.', '말 한마디에도 마찰이 커지기 쉬운 가족입니다. 각자의 공간과 시간을 지켜 주는 것이 먼저예요.'],
  };
  var gradeIdx = function (s) { return s >= 90 ? 0 : s >= 80 ? 1 : s >= 70 ? 2 : s >= 60 ? 3 : s >= 50 ? 4 : 5; };
  var ZONE_B = { year: '집안 배경·어린 시절 습관', month: '일하는 방식·사회생활', day: '속마음·함께하는 일상', hour: '앞날 계획·자녀관' };
  var ZONE_S = { year: '집안에서 배운 가치관', month: '사회에서 보이는 모습', day: '생각과 성격', hour: '앞날에 대한 생각' };
  var POS_K = { year: '년', month: '월', day: '일', hour: '시' };
  var posName = function (p, kind) { return [].concat(p).map(function (k) { return POS_K[k] + (kind === 'stem' ? '간' : '지'); }).join('·'); };
  var TG_KW = { '비견': '나와 같은 편 — 형제·동료, 자립심과 경쟁', '겁재': '나와 닮은 경쟁자 — 승부욕, 재물 다툼', '식신': '내 재능과 솜씨 — 먹고사는 능력, 여유', '상관': '날카로운 표현력 — 창의력, 반항심', '편재': '크게 벌고 쓰는 돈 — 사업·투자, 넓은 활동', '정재': '꾸준히 모으는 돈 — 월급·저축, 성실함', '편관': '강한 압박 — 책임·권력, 위기 극복', '정관': '규칙과 명예 — 직장, 안정된 지위', '편인': '남다른 직관 — 특수한 공부, 영감', '정인': '배움과 보살핌 — 학문·자격, 후원' };
  // 쉬운 항목 이름은 서버가 compat-pair.js 의 PART_PLAIN 을 결과에 함께 보낸다
  function partPlain() { return (S.res && S.res.partPlain) || (root.PairCompat && root.PairCompat.PART_PLAIN) || {}; }
  var ul = function (arr, empty) { return arr && arr.length ? '<ul>' + arr.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '<p class="lc-muted">' + empty + '</p>'; };
  function scene(r, Rr) {
    var Z = r.kind === 'stem' ? ZONE_S : ZONE_B, za = [].concat(r.aPos).map(function (k) { return Z[k]; }).join(', '), zb = [].concat(r.bAll || r.bPos).map(function (k) { return Z[k]; }).join(', ');
    if (za === zb) return '두 사람의 ' + za + '에서 드러납니다.';
    return esc(Rr.names.a) + '의 ' + josa(za, '과/와') + ' ' + esc(Rr.names.b) + '의 ' + zb + ' 사이에서 드러납니다.';
  }
  function relGroups(rels) {
    var m = {}, order = [], w = function (r) { return r.txt[4] * 2 + (r.txt[0] === 'bad' ? 1 : 0); };
    rels.forEach(function (r) { var k = r.kind + ':' + [].concat(r.aPos).join('-') + '|' + [].concat(r.bAll || r.bPos).join('-'); if (!m[k]) { m[k] = []; order.push(k); } m[k].push(r); });
    return order.map(function (k) { return m[k].sort(function (a, b) { return w(b) - w(a); }); });
  }
  function relCard(rs, Rr) {
    var r = rs[0], t = r.txt, strong = Math.max(1, Math.min(3, Math.round(Math.max.apply(null, rs.map(function (x) { return x.txt[4]; })))));
    var also = rs.slice(1).map(function (x) { return '<b>' + esc(x.type) + '</b> ' + esc(x.txt[1]); });
    return '<article class="lc-rel tone-' + t[0] + '"><div class="lc-rel-top">' + rs.map(function (x) { return '<span class="lc-badge">' + esc(x.type) + '</span>'; }).join('') + '<span class="lc-muted">' + rs.map(function (x) { return esc(x.name); }).join(' · ') + '</span><span class="lc-str" title="영향 세기">' + '●●●'.slice(0, strong) + '○○○'.slice(0, 3 - strong) + '</span></div>' +
      '<div class="lc-muted">' + esc(Rr.names.a) + '의 ' + posName(r.aPos, r.kind) + ' ↔ ' + esc(Rr.names.b) + '의 ' + posName(r.bAll || r.bPos, r.kind) + '</div>' +
      '<p><b>' + esc(t[1]) + '</b></p><p><b>어디서 나타나요</b> ' + scene(r, Rr) + '</p>' + (also.length ? '<p><b>같은 자리에 함께</b> ' + also.join(' · ') + '</p>' : '') + '<p>' + esc(t[2]) + '</p><p class="lc-tip"><b>이렇게 해 보세요</b> ' + esc(t[3]) + '</p></article>';
  }
  var AM_POS = { year: '연', month: '월', day: '일', hour: '시' };
  function amRec(r, a, b) {
    var posTxt = function (p) { var s = String(p), id = s.split(':').pop(), ow = s.indexOf(':') >= 0 ? s.split(':')[0] : ''; return (ow ? (ow === 'A' ? a : b) + ' ' : '') + (AM_POS[id] || id); };
    var title = r.type === 'stem-hidden-stem' ? r.stem + '·' + r.branch + '(' + r.hiddenStem + ') ' + (r.samePillar ? '간지 암합' : '명암합') : r.branchA + r.branchB + ' 암합';
    var where = (r.positions || []).map(function (pp) { return pp.map(posTxt).join('–'); }).join(' · '), tx = r.text || {};
    var tg = (r.relatedTenGods || []).map(function (t) { return t.stem + ' ' + t.tenGod; }).join(' · ');
    var depth = r.type === 'stem-hidden-stem' ? r.branch + ' 속 ' + r.depth + ' ' + r.hiddenStem : r.branchA + ' 속 ' + (r.depthA || '-') + ' ' + r.hiddenStemA + ' · ' + r.branchB + ' 속 ' + (r.depthB || '-') + ' ' + r.hiddenStemB;
    return '<div class="lc-am"><div class="lc-am-h"><b>' + esc(title) + '</b><span class="lc-muted">' + esc(r.combination) + ' ' + esc(r.element) + ' · ' + esc(where) + '</span></div><p>' + esc(tx.general || '') + (tx.love ? '<br><b>인연</b> ' + esc(tx.love) : '') + '</p><p class="lc-muted">' + esc(depth) + ' · 십성 ' + esc(tg) + '</p></div>';
  }
  function amhapCard(res) {
    var recs = res.amhap || [], a = res.names.a, b = res.names.b;
    var br = recs.filter(function (r) { return r.type === 'branch-hidden-stem'; }), my = recs.filter(function (r) { return r.type !== 'branch-hidden-stem'; }), dayLink = recs.filter(function (r) { return r.loveLink; }).length;
    return '<div class="lc-card"><h3>숨은 인연 — 암합 분석</h3><p class="lc-sub">두 사람의 지지·지장간을 교차해 본 보조 해석 · 궁합 점수에는 넣지 않아요</p>' +
      '<p>' + (recs.length ? '두 사람 사이에 지지 암합 ' + br.length + '개, 명암합 ' + my.length + '개가 있어요' + (dayLink ? ' · 그중 ' + dayLink + '개는 일지(배우자궁)나 배우자 자리 십성과 이어져 있어요' : '') + '. 겉으로 드러나는 관계와 별개로 서로에게 느끼는 내면의 끌림을 보여 주는 자리예요.' : '두 사람 사이에 확인되는 기본 암합이 없어요. 암합이 없다고 인연이 약하다는 뜻은 아니에요.') + '</p>' +
      (br.length ? br.map(function (r) { return amRec(r, a, b); }).join('') : '') +
      (my.length ? '<details class="lc-fold"><summary>천간과 지장간의 명암합 ' + my.length + '개</summary>' + my.map(function (r) { return amRec(r, a, b); }).join('') + '</details>' : '') +
      '<p class="lc-note">암합이 많다고 좋은 궁합이고 없다고 나쁜 궁합인 것은 아니에요. ' + esc(res.amhapNote || '') + '</p></div>';
  }
  function dayCard(res) {
    var d = res.day; if (!d) return '';
    return '<div class="lc-card"><h3>상대 일주 적합도</h3><p class="lc-sub">내 원국 기준으로 60일주를 줄 세웠을 때 상대 일주(' + esc(res.gz.b) + ')의 자리 · 만세력 궁합 일주와 같은 계산</p>' +
      '<p><b>' + d.of + '개 일주 중 ' + d.rank + '번째</b>로 내 사주와 잘 맞는 일주예요 (적합도 <b>' + d.score + '점</b>' + (d.type ? ' · ' + esc(d.type) : '') + ').</p>' + ul(d.reasons.concat(d.cautions), '') +
      '<p class="lc-note">상대의 전체 원국이 아니라 일간·일지만 내 원국과 비교한 지표라, 위 궁합 점수와는 다를 수 있어요.</p></div>';
  }
  function resultHtml() {
    var res = S.res, Rr = res.views[S.rel] || res.views.lover, a = Rr.names.a, b = Rr.names.b, sc = Rr.score, gi = gradeIdx(sc), D = Rr.directions, S3 = Rr.summary3, PP = partPlain();
    var relSeg = '<div class="lc-seg" role="group" aria-label="관계">' + Object.keys(REL).map(function (k) { return '<button type="button" data-lc-rel="' + k + '" aria-pressed="' + (S.rel === k) + '">' + REL[k] + '</button>'; }).join('') + '</div>';
    var hero = '<div class="lc-hero tone-' + esc(Rr.grade.tone) + '"><div class="lc-names"><div><span>' + esc(a) + '</span><b>' + esc(res.gz.a) + '</b></div><i aria-hidden="true">♡</i><div><span>' + esc(b) + '</span><b>' + esc(res.gz.b) + '</b></div></div>' +
      '<div class="lc-ring" style="--p:' + sc + '"><div><b>' + sc + '</b><span>점</span></div></div><div class="lc-grade"><span class="lc-gb">' + esc(Rr.grade.name) + '</span><span class="lc-muted">' + esc(Rr.relLabel) + ' 기준</span></div>' +
      '<div class="lc-acts"><button type="button" class="btn lc-btn" data-lc="edit">상대 바꾸기</button>' + relSeg + '</div>' + quotaLine() + '</div>';
    if (!D || !D.ab || !D.ab.plain) return hero + '<div class="lc-card"><p>' + esc(SUMMARY[Rr.rel] ? SUMMARY[Rr.rel][gi] : '') + '</p></div>' + amhapCard(res);
    var used = {}, key = function (t) { return String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); };
    var once = function (arr) { return arr.filter(Boolean).map(function (t) { if (/<b>/.test(t)) { var k = key(t); if (!k || used[k]) return ''; used[k] = 1; return t; } return String(t).split(/(?<=[.!?])\s+/).filter(function (x) { var k = key(x); if (!k || used[k]) return false; used[k] = 1; return true; }).join(' '); }).filter(Boolean); };
    var rels = (function (arr) { var seen = {}; return arr.filter(function (x) { var k = x.name + x.aPos.join() + x.bPos; if (seen[k]) return false; seen[k] = 1; return true; }); })(Rr.relations || []);
    var groups = relGroups(rels), goodG = groups.filter(function (g) { return g[0].tone === 'good'; }), badG = groups.filter(function (g) { return g[0].tone === 'bad'; });
    var relPlain = function (g) { var r = g[0]; return '<b>' + esc(r.txt[1]) + '</b> — ' + scene(r, Rr) + ' ' + esc(r.txt[2]); };
    var lead = (SUMMARY[Rr.rel] || SUMMARY.lover)[gi] + (PP[Rr.best.key] && PP[Rr.worst.key] ? ' 가장 힘이 되는 건 ' + josa(PP[Rr.best.key], '이고/고') + ', 가장 신경 쓸 곳은 ' + josa(PP[Rr.worst.key], '이에요/예요') + '.' : '');
    var helpA = D.ab.plain.help.slice(), helpB = D.ba.plain.help.slice();
    if (D.ab.best && D.ba.best && D.ab.best.g === D.ba.best.g && helpA[0] && helpB[0]) {
      var pre = function (d) { return (d.from === '나' ? '나는' : josa(d.from, '은/는')) + ' ' + (d.to === '나' ? '나에게' : d.to + '에게') + ' '; };
      if (helpA[0].indexOf(pre(D.ab)) === 0) helpA[0] = '두 사람은 서로에게 ' + helpA[0].slice(pre(D.ab).length);
      if (helpB[0].indexOf(pre(D.ba)) === 0) helpB[0] = helpB[0].replace(/^[^.]*\.\s*/, '');
    }
    var LOW = '배우자로 끌리는 기운이 적어', ia = helpA.findIndex(function (x) { return x.indexOf(LOW) >= 0; }), ib = helpB.findIndex(function (x) { return x.indexOf(LOW) >= 0; });
    if (ia >= 0 && ib >= 0) { helpA[ia] = '두 사람 모두 서로에게 배우자로 끌리는 기운이 적어, 설렘보다 편안함으로 이어지는 사이예요.'; helpB.splice(ib, 1); }
    var sHelp = once([helpA[0], helpB[0]]), sBad = once([D.ab.plain.burden[0], D.ba.plain.burden[0]]);
    if (badG[0] && sBad.length < 3) { var t0 = relPlain(badG[0]); if (once([t0]).length) sBad.push(t0); }
    var advA = D.ab.plain.advice.slice(), advB = D.ba.plain.advice.slice();
    if (D.ab.best && D.ba.best && D.ab.best.g === D.ba.best.g && advA[1] && advB[1]) { advA[1] = advA[1].replace(/^.+?에게 /, '서로에게 '); advB.splice(1, 1); }
    var sTip = once([S3 && S3.grow[0], advA[0], advB[0], badG[0] && badG[0][0].txt[3]]).slice(0, 4);
    var asym = Rr.asym && Rr.asym.plain ? once([Rr.asym.plain])[0] : '';
    var glance = '<div class="lc-card"><h3>한눈에 정리</h3><p class="lc-lead">' + esc(lead) + '</p>' + (asym ? '<p>' + esc(asym) + '</p>' : '') + '<div class="lc-3">' +
      '<div class="lc-box good"><b>서로에게 도움 되는 점</b>' + ul(sHelp, '뚜렷하게 맞는 점이 적습니다.') + '</div>' +
      '<div class="lc-box bad"><b>갈등이 생기는 이유</b>' + (sBad.length ? '<ul>' + sBad.map(function (x) { return '<li>' + (/<b>/.test(x) ? x : esc(x)) + '</li>'; }).join('') + '</ul>' : '<p class="lc-muted">크게 부딪치는 점이 없습니다.</p>') + '</div>' +
      '<div class="lc-box"><b>이렇게 해 보세요</b>' + ul(sTip.length ? sTip : [REL_TIP[Rr.rel]], '') + '</div></div></div>';
    var dirPlain = function (d, help, adv) {
      var h = once(help), bd = once(d.plain.burden), ad = once(adv); if (!h.length && !bd.length && !ad.length) return '';
      return '<div class="lc-box"><b>' + esc(d.from) + ' → ' + esc(d.to) + '</b>' + (h.length ? '<div class="lc-k">더 주는 도움</div>' + ul(h) : '') + (bd.length ? '<div class="lc-k">조심할 점</div>' + ul(bd) : '') + (ad.length ? '<div class="lc-k">이렇게 해 보세요</div>' + ul(ad) : '') + '</div>';
    };
    var dAB = dirPlain(D.ab, helpA, advA), dBA = dirPlain(D.ba, helpB, advB);
    var dirs = dAB || dBA ? '<div class="lc-card"><h3>서로에게 주는 것</h3><p class="lc-sub">한쪽이 받는 것과 다른 쪽이 받는 것은 다를 수 있어요</p><div class="lc-2">' + dAB + dBA + '</div></div>' : '';
    var relOver = [];
    if (groups.length) {
      relOver.push('두 사람의 사주가 맞닿는 자리가 ' + groups.length + '곳 있어요. ' + (goodG.length && badG.length ? '그중 ' + goodG.length + '곳은 서로 끌어당기고 ' + badG.length + '곳은 부딪쳐, ' + (goodG.length > badG.length ? '끌림이 조금 더 큰 사이예요' : goodG.length < badG.length ? '부딪침이 조금 더 많은 사이예요' : '끌림과 부딪침이 비슷하게 섞인 사이예요') + '.' : goodG.length ? '대부분 서로 끌어당기는 자리라 큰 틀에서 잘 맞물려요.' : badG.length ? '대부분 부딪치는 자리라, 가까울수록 규칙과 거리를 정해 두는 편이 좋아요.' : '대부분 예민하게 얽히는 자리예요.'));
      once([goodG[0] && relPlain(goodG[0]), badG[0] && relPlain(badG[0])]).forEach(function (x) { relOver.push(x); });
    }
    var relSec = '<div class="lc-card"><h3>두 사람의 간지 관계</h3><p class="lc-sub">종합 해석 · 개별 근거는 펼쳐서</p>' + (groups.length ? '<ul>' + relOver.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul><details class="lc-fold"><summary>개별 관계 근거 ' + groups.length + '개 보기</summary>' + groups.map(function (g) { return relCard(g, Rr); }).join('') + '</details>' : '<p>두 사람 사이에 뚜렷한 합·충이 없습니다. 서로에게 크게 끌리지도 부딪치지도 않는 담백한 사이입니다.</p>') + '</div>';
    var rows = Rr.parts.map(function (p) { return '<div class="lc-part"><div><b>' + esc(p.label) + '</b><span>' + p.score + '</span></div><i style="width:' + p.score + '%"></i><p class="lc-muted">' + esc((PART_TXT[p.key] || [])[BAND(p.score)] || '') + '</p></div>'; }).join('');
    var tgLine = function (who, other, tg) { return '<li><b>' + esc(other) + '</b>의 일간은 <b>' + esc(who) + '</b>에게 <b>' + esc(tg) + '</b> — ' + esc(TG_KW[tg] || '') + '</li>'; };
    var evDir = function (d) { return '<div class="lc-box"><b>' + esc(d.from) + ' → ' + esc(d.to) + ' · ' + d.score + '</b><p class="lc-muted">' + (d.best ? '가장 크게 채워 주는 십성: ' + esc(d.best.name) + '(' + elTxt(d.best.e) + ')' : '뚜렷하게 채워 주는 십성이 적습니다.') + (d.element ? ' · 오행으로는 ' + elTxt(d.element.e) + '(' + esc(d.element.role) + ')' : '') + '</p><div class="lc-k">근거 — 도움</div>' + ul(d.help, '뚜렷한 도움은 적습니다.') + '<div class="lc-k">근거 — 부담</div>' + ul(d.burden, '크게 부담되는 점은 없습니다.') + '</div>'; };
    var ip = Rr.interplay || [];
    var evidence = '<details class="lc-card lc-fold lc-ev"><summary><b>명리학적 근거 모두 보기</b> <span class="lc-muted">항목별 점수 · 십성·오행 · 일간 · 원국 상호작용</span></summary>' +
      '<h4>항목별 점수</h4>' + rows + (Rr.relWhy ? '<p class="lc-note">' + esc(Rr.relWhy) + ' (반영 비율 ' + Rr.parts.map(function (p) { return p.label + ' ' + p.weight + '%'; }).join(' · ') + ')</p>' : '') +
      '<h4>양방향 근거(십성·오행)</h4><div class="lc-2">' + evDir(D.ab) + evDir(D.ba) + '</div>' +
      '<h4>일간으로 본 서로의 자리 · 강약</h4><ul>' + tgLine(a, b, Rr.stems.aSeesB) + tgLine(b, a, Rr.stems.bSeesA) + (Rr.stems.hap ? '<li><b>일간끼리 천간합</b> — 마음이 쉽게 끌리는 인연입니다.</li>' : '') + (Rr.stems.chung ? '<li><b>일간끼리 천간충</b> — 생각이 정면으로 맞서 말다툼이 잦습니다.</li>' : '') + '<li>강약: ' + esc(a) + ' ' + esc(Rr.strength.a) + ' · ' + esc(b) + ' ' + esc(Rr.strength.b) + '</li>' + (Rr.balanceNotes || []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' +
      (ip.length ? '<h4>원국 상호작용</h4>' + ul(ip.map(function (x) { return x.text; })) : '') + (res.hourKnown && !res.hourKnown.b ? '<p class="lc-note">상대의 태어난 시각을 몰라 시주 없이 비교했어요.</p>' : '') + '</details>';
    return hero + glance + dirs + relSec + amhapCard(res) + dayCard(res) + evidence + '<p class="lc-note">궁합 점수는 두 사람의 사주를 견준 상대적인 참고 지표이며, 관계가 잘될 확률이 아닙니다. 같은 점수라도 서로 맞춰 가는 노력에 따라 관계는 달라집니다.</p>';
  }

  // ───────── 그리기 ─────────
  function rootHtml() {
    if (!S.me) return '<p class="lc-muted">사주 정보를 불러오는 중…</p>';
    if (S.locked) return lockHtml();
    if (S.res && !S.editing) return resultHtml();
    return '<div class="lc-intro"><p>상대의 생년월일을 넣으면 만세력 궁합과 같은 기준으로 <b>점수·한눈에 정리·서로에게 주는 것·간지 관계·숨은 인연(암합)</b>까지 바로 보여 드려요. 인연운 심화를 보유한 동안 상대를 바꿔 가며 볼 수 있어요.</p>' + quotaLine() + '</div>' + formHtml() + (S.res ? '<p><button type="button" class="btn lc-btn" data-lc="back">지난 결과 다시 보기</button></p>' : '');
  }
  function paint() {
    if (!root.document) return;
    Array.prototype.forEach.call(root.document.querySelectorAll('[data-lc-root]'), function (el) { el.innerHTML = rootHtml(); el.setAttribute('data-lc-ready', '1'); });
  }
  function ensure() {
    var d = root.document; if (!d) return;
    var fresh = d.querySelector('[data-lc-root]:not([data-lc-ready])'); if (!fresh) return;
    if (!S.list.length) S.list = loadList();
    paint(); loadStatus(!!S.locked);   // 잠겨 있던 화면이 다시 그려지면(로그인·구매 뒤) 권한을 다시 확인한다
  }
  var watching = false;
  function watch() {
    if (watching || !root.document || !root.MutationObserver) return;
    try { if (/\/admin\//.test(root.location.pathname)) return; } catch (e) { }   // 관리자 '내용 확인'은 입력 폼 모양만 보여 준다
    watching = true;
    style();
    var queued = false, mo = new root.MutationObserver(function () { if (queued) return; queued = true; (root.requestAnimationFrame || setTimeout)(function () { queued = false; ensure(); }); });
    var start = function () { mo.observe(root.document.body, { childList: true, subtree: true }); ensure(); };
    if (root.document.body) start(); else root.addEventListener('DOMContentLoaded', start);
    root.document.addEventListener('click', onClick, true);
    root.document.addEventListener('submit', function (e) { var f = e.target && e.target.closest && e.target.closest('[data-lc-form]'); if (!f) return; e.preventDefault(); readForm(f); submit(); }, true);
    root.document.addEventListener('change', function (e) { var f = e.target && e.target.closest && e.target.closest('[data-lc-form]'); if (f) readForm(f); }, true);
  }
  function onClick(e) {
    var t = e.target && e.target.closest && e.target.closest('[data-lc],[data-lc-set],[data-lc-rel],[data-lc-pick],[data-lc-del]'); if (!t || !t.closest('[data-lc-root]')) return;
    e.preventDefault(); e.stopPropagation();
    var f = t.closest('[data-lc-root]').querySelector('[data-lc-form]'); if (f) readForm(f);
    if (t.hasAttribute('data-lc-set')) { var kv = t.getAttribute('data-lc-set').split(':'); S.inp[kv[0]] = kv[1]; if (kv[0] === 'calendar' && kv[1] !== 'lunar') S.inp.leap = false; paint(); return; }
    if (t.hasAttribute('data-lc-rel')) { S.rel = t.getAttribute('data-lc-rel'); paint(); return; }
    if (t.hasAttribute('data-lc-pick')) { var p = S.list[+t.getAttribute('data-lc-pick')]; if (p) { S.inp = Object.assign(defaults(), p); S.err = ''; } paint(); return; }
    if (t.hasAttribute('data-lc-del')) { S.list.splice(+t.getAttribute('data-lc-del'), 1); saveList(S.list); paint(); return; }
    var a = t.getAttribute('data-lc');
    if (a === 'edit') { S.editing = true; S.err = ''; paint(); scrollTop(); }
    else if (a === 'back') { S.editing = false; paint(); scrollTop(); }
    else if (a === 'buy' && R.Paywall && S.chapter) { try { R.Paywall.show(S.chapter, { worldName: '인연운 심화' }); } catch (err) { } }
  }
  function style() {
    var d = root.document; if (!d || d.getElementById('lc-style')) return;
    var s = d.createElement('style'); s.id = 'lc-style';
    s.textContent = '.lc-root{text-align:left;color:var(--ink,#EDE8DC);line-height:1.7}.lc-root .lc-muted{color:var(--ink3,#8A8678);font-size:.86rem}.lc-root p{margin:6px 0}' +
      '.lc-q{font-size:.88rem;color:var(--ink2,#BDB8AB);margin:10px 0}.lc-q b{color:var(--gold,#D5B97F);font-size:1.05rem}.lc-q span{color:var(--ink3,#8A8678)}.lc-q0 b{color:var(--red,#D9694F)}' +
      '.lc-form{display:flex;flex-direction:column;gap:12px;margin-top:8px}.lc-row{display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end}.lc-f{display:flex;flex-direction:column;gap:6px;min-width:0}.lc-f>span{font-size:.82rem;color:var(--ink2,#BDB8AB)}' +
      '.lc-root input[data-f=name],.lc-root select{font:inherit;color:var(--ink,#EDE8DC);background:rgba(0,0,0,.28);border:1px solid rgba(255,255,255,.18);border-radius:10px;padding:9px 10px;min-height:44px;box-sizing:border-box}.lc-root input[data-f=name]{width:100%;max-width:360px}.lc-root select option{color:#111}' +
      '.lc-sel{display:flex;flex-wrap:wrap;gap:6px}.lc-ck{display:flex;align-items:center;gap:6px;font-size:.9rem;min-height:44px}' +
      '.lc-seg{display:inline-flex;flex-wrap:wrap;gap:4px;padding:3px;border-radius:12px;background:rgba(255,255,255,.06)}.lc-seg button{font:inherit;font-size:.9rem;color:var(--ink2,#BDB8AB);background:none;border:0;border-radius:9px;padding:8px 14px;min-height:40px;cursor:pointer}.lc-seg button[aria-pressed=true]{background:var(--gold,#D5B97F);color:#1a1408;font-weight:700}' +
      '.lc-btn{min-height:44px;border-radius:10px}.lc-primary{border-color:var(--gold,#D5B97F)!important;font-weight:700}.lc-btn[disabled]{opacity:.55}.lc-go{display:flex;flex-wrap:wrap;gap:10px;align-items:center}.lc-err{color:#FF9C8A;font-size:.9rem}.lc-note{font-size:.8rem;color:var(--ink3,#8A8678)}' +
      '.lc-recent{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:.82rem;color:var(--ink2,#BDB8AB)}.lc-chip{display:inline-flex;border:1px solid rgba(255,255,255,.16);border-radius:99px;overflow:hidden}.lc-chip button{font:inherit;color:var(--ink,#EDE8DC);background:none;border:0;padding:6px 10px;min-height:36px;cursor:pointer}.lc-chip .lc-x{color:var(--ink3,#8A8678);padding:6px 9px}' +
      '.lc-lock{padding:16px;border:1px solid var(--line,rgba(205,178,122,.2));border-radius:14px;background:rgba(255,255,255,.03)}' +
      '.lc-hero{text-align:center;padding:18px 12px;border:1px solid var(--line,rgba(205,178,122,.2));border-radius:16px;background:rgba(255,255,255,.03)}.lc-names{display:flex;justify-content:center;align-items:center;gap:22px}.lc-names div{display:flex;flex-direction:column}.lc-names span{font-size:.8rem;color:var(--ink3,#8A8678)}.lc-names b{font-family:var(--f-serif,serif);font-size:1.5rem}.lc-names i{color:var(--red,#D9694F);font-style:normal}' +
      '.lc-ring{--p:0;width:118px;height:118px;margin:14px auto;border-radius:50%;background:conic-gradient(var(--gold,#D5B97F) calc(var(--p)*1%),rgba(255,255,255,.1) 0);display:grid;place-items:center}.lc-ring>div{width:92px;height:92px;border-radius:50%;background:var(--bg2,#0D1120);display:flex;align-items:baseline;justify-content:center;padding-top:26px;box-sizing:border-box;gap:2px}.lc-ring b{font-size:2rem}.lc-ring span{font-size:.8rem;color:var(--ink3,#8A8678)}' +
      '.lc-grade{display:flex;justify-content:center;gap:8px;align-items:center}.lc-gb{background:var(--gold,#D5B97F);color:#1a1408;font-weight:700;border-radius:99px;padding:4px 14px}.tone-bad .lc-gb,.tone-warn .lc-gb{background:var(--red,#D9694F);color:#fff}.lc-acts{display:flex;flex-direction:column;align-items:center;gap:10px;margin-top:12px}' +
      '.lc-card{margin-top:14px;padding:16px;border:1px solid var(--line2,rgba(236,231,219,.1));border-radius:14px;background:rgba(255,255,255,.03)}.lc-card h3{margin:0 0 2px;font-size:1.05rem}.lc-card h4{margin:14px 0 6px;font-size:.95rem}.lc-sub{font-size:.8rem;color:var(--ink3,#8A8678)}.lc-lead{font-weight:600}.lc-card ul{margin:6px 0;padding-left:1.1em}.lc-card li{margin:4px 0}' +
      '.lc-3,.lc-2{display:grid;gap:10px;margin-top:10px}@media(min-width:760px){.lc-3{grid-template-columns:repeat(3,minmax(0,1fr))}.lc-2{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
      '.lc-box{padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.92rem}.lc-box.good{background:rgba(94,158,120,.14)}.lc-box.bad{background:rgba(217,105,79,.13)}.lc-k{margin-top:8px;font-size:.8rem;color:var(--ink3,#8A8678)}' +
      '.lc-fold summary{cursor:pointer;margin-top:8px;color:var(--ink2,#BDB8AB)}.lc-rel{margin:10px 0;padding:12px;border-radius:12px;background:rgba(255,255,255,.04);font-size:.9rem}.lc-rel.tone-good{border-left:3px solid var(--wood,#5E9E78)}.lc-rel.tone-bad{border-left:3px solid var(--red,#D9694F)}.lc-rel-top{display:flex;flex-wrap:wrap;gap:6px;align-items:center}.lc-badge{font-size:.75rem;border:1px solid rgba(255,255,255,.2);border-radius:99px;padding:1px 8px}.lc-str{margin-left:auto;color:var(--gold,#D5B97F);font-size:.75rem}.lc-tip{color:var(--ink2,#BDB8AB)}' +
      '.lc-am{padding:10px 0;border-top:1px solid var(--line2,rgba(236,231,219,.1));font-size:.9rem}.lc-am-h{display:flex;flex-wrap:wrap;gap:8px;align-items:baseline}' +
      '.lc-part{margin:8px 0}.lc-part>div{display:flex;justify-content:space-between}.lc-part i{display:block;height:6px;border-radius:3px;background:var(--gold,#D5B97F);margin:4px 0}';
    d.head.appendChild(s);
  }

  R.LoveCompat = { VERSION: VERSION, ID: ID, TITLE: TITLE, TOPIC: TOPIC, API: API, add: add, chapter: chapter, meOf: meOf, resultHtml: function (res, rel) { var keep = { res: S.res, rel: S.rel }; S.res = res; S.rel = rel || 'lover'; try { return resultHtml(); } finally { S.res = keep.res; S.rel = keep.rel; } }, _state: S };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.LoveCompat;
})(typeof window !== 'undefined' ? window : globalThis);
