// 무료 결과(수호신 각성 직후) + 공유 링크. html()·shareUrl()·potentialLine() 은 순수 함수라 Node 에서 테스트된다.
//   화면: 수호신 이미지 + "{일주}일주 · {title}" + 오행 막대(수치) + 잠재력 한 줄 + "그런데 이 힘은 아직 다 쓰이지 않고 있습니다." + 잠금 목록 + 결제 버튼
//   잠재력 문장은 우세 십성군 매핑으로만 만든다(AI 없음). 공유 링크에는 일주·성별만 들어간다(생년월일·이름 금지).
(function (root) {
  var R = root.ReportV2 = root.ReportV2 || {};
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var EL_COLORS = { '목': '#5E9E78', '화': '#D0634A', '토': '#BC9C62', '금': '#AEB9C6', '수': '#4A7AB5' };
  var DEFAULT_LINE = "당신의 수호신이 발견한 힘은 '{potential}'입니다. {group} 기운 {n}%, 평균의 {times}배입니다.";
  var TURN = '그런데 이 힘은 아직 다 쓰이지 않고 있습니다.';
  var POTENTIAL = { 비겁: '스스로 길을 여는 힘', 식상: '생각을 형태로 만드는 힘', 재성: '기회를 알아보는 힘', 관성: '사람들이 믿고 따르게 만드는 힘', 인성: '깊이 이해하고 꿰뚫는 힘' };

  function isObj(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function deepMerge(a, b) { var o = Object.assign({}, a || {}); Object.keys(b || {}).forEach(function (k) { o[k] = isObj(b[k]) && isObj(o[k]) ? deepMerge(o[k], b[k]) : b[k]; }); return o; }
  // 온보딩 기본 문구(story/content.js) + 관리자 저장본(/api/story) → 무료 결과에 쓰는 부분만
  function mergeStory(def, saved) {
    var out = {}; ['settings', 'result', 'locked', 'purchase'].forEach(function (k) { out[k] = deepMerge((def || {})[k], saved && isObj(saved[k]) ? saved[k] : {}); });
    return out;
  }

  // 우세 십성군 → 잠재력(매핑만). sd 는 이미 계산된 값.
  function potential(sd) {
    var g = sd.dominantGroup, pct = sd.groups[g];
    return { group: g, name: POTENTIAL[g], pct: pct, n: Math.round(pct), times: Math.round(pct / 20 * 10) / 10 };
  }
  function potentialLine(sd, tpl) {
    var p = potential(sd);
    return String(tpl || DEFAULT_LINE).replace(/\{potential\}/g, p.name).replace(/\{group\}/g, p.group).replace(/\{n\}/g, p.n).replace(/\{times\}/g, p.times);
  }
  // 공유 링크: 일주·성별만. 생년월일·이름·시각은 절대 넣지 않는다.
  function shareUrl(sd, origin) { return String(origin || '') + '/report/?g=' + encodeURIComponent(sd.dayPillar.ko) + '&s=' + (sd.gender === 'F' ? 'F' : 'M'); }
  function copyText(t) {
    if (root.navigator && navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (ok, no) { try { var a = document.createElement('textarea'); a.value = t; a.setAttribute('readonly', ''); a.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(a); a.select(); var r = document.execCommand('copy'); a.remove(); r ? ok() : no(new Error('copy')); } catch (e) { no(e); } });
  }

  // 만세력 계산으로 알 수 있는 값은 전부 무료: 원국(네 기둥·십성·12운성) · 오행 · 십성군 · 신강약(득령·득지·득세) · 용신/희신 · 격국 · 대운 · 올해 세운.
  // (유료는 이 값을 "어떻게 읽고 어떻게 쓰는지"의 풀이다.) 새 계산은 없고 sd 에 이미 있는 값만 보여 준다.
  function facts(sd, theme) {
    var P = sd.pillars, cell = function (k, l) { var p = P[k]; return '<td' + (k === 'day' ? ' class="me"' : '') + '>' + (p ? '<div class="h">' + esc(p.hanja) + '</div><div class="k">' + esc(p.ko) + '</div>' : '<span class="k">시간 모름</span>') + '</td>'; };
    var tg = function (k) { var p = P[k]; return '<td>' + (p ? esc((p.stemTG || '-') + ' / ' + (p.branchTG || '-')) : '-') + '</td>'; }, us = function (k) { var p = P[k]; return '<td>' + (p ? esc(p.unseong || '-') : '-') + '</td>'; };
    var table = '<table class="pil"><tr><th></th><th>시주</th><th>일주(나)</th><th>월주</th><th>연주</th></tr><tr><th>간지</th>' + cell('hour') + cell('day') + cell('month') + cell('year') + '</tr><tr><th>십성<small>(천간/지지)</small></th>' + tg('hour') + tg('day') + tg('month') + tg('year') + '</tr><tr><th>12운성</th>' + us('hour') + us('day') + us('month') + us('year') + '</tr></table>';
    var u = sd.usefulElements, yong = u ? u.yong + (u.hee ? ' · 희신 ' + u.hee : '') : '해당 없음';
    var chips = [['신강약', sd.strength.zone], ['용신', yong], ['원국 통근', sd.roots ? sd.roots.level : '확인 불가']].concat(sd.patterns && sd.patterns.length ? [['격국·구조', sd.patterns.map(function (p) { return p.name; }).join(' · ')]] : []).concat(sd.specialStars && sd.specialStars.length ? [['신살', sd.specialStars.map(function (s) { return s.name; }).join(' · ')]] : []);
    var box = chips.map(function (c) { return '<div class="fx"><small>' + esc(c[0]) + '</small><b>' + esc(c[1]) + '</b></div>'; }).join('');
    var dw = (sd.daewoon || []).length ? '<div class="dw" role="group" aria-label="대운 흐름">' + sd.daewoon.map(function (d) { var cur = sd.currentDaewoon === d; return '<div class="' + (cur ? 'cur' : '') + '"><small>' + d.startAge + '세</small><b>' + esc(d.ganzhi) + '</b><small>' + d.startYear + '~' + (cur ? ' (지금)' : '') + '</small></div>'; }).join('') + '</div>' : '';
    var Ch = R.Charts, ch = function (k) { return Ch ? '<div class="fch">' + Ch.html(k, sd) + '</div>' : ''; };
    return '<section class="ffacts" aria-label="내 사주 계산 결과"><h2 class="gd-h">내 사주 계산 결과 · 모두 무료</h2><p class="fine" style="margin:0 0 14px">원국과 오행·십성 분포처럼 만세력 계산으로 알 수 있는 값은 전부 무료로 보여 드립니다.</p>' +
      '<h3 class="gd-h2">사주 원국</h3>' + table + '<h3 class="gd-h2">오행 분포</h3>' + ch('elements') + '<h3 class="gd-h2">십성군 분포</h3>' + ch('groups') + '<h3 class="gd-h2">신강약 · 득령·득지·득세</h3>' + ch('strength') +
      '<div class="fxs">' + box + '</div>' + (dw ? '<h3 class="gd-h2">대운 흐름 (10년 단위)</h3>' + dw : '') +
      (sd.sewoon ? '<p class="fine" style="margin-top:12px">올해(' + sd.sewoon.year + '년)는 ' + esc(sd.sewoon.ganzhi) + ' 세운입니다.</p>' : '') + '</section>';
  }

  // info: { guardianUrl, title }   st: mergeStory 결과
  function html(sd, info, st) {
    st = st || {}; info = info || {};
    var Rz = st.result || {}, L = st.locked || {}, P = st.purchase || {}, price = (st.settings && st.settings.priceText) || '', ko = sd.dayPillar.ko, el = sd.dayMaster.el, col = EL_COLORS[el] || '#BC9C62';
    var cap = info.title ? String(Rz.guardianTitle || '{pillar}일주 · {title}').replace('{pillar}', ko).replace('{title}', info.title) : String(Rz.guardianTitleNoVideo || '{pillar}일주').replace('{pillar}', ko);
    var fig = info.guardianUrl ? '<img class="gd-img" src="' + esc(info.guardianUrl) + '" alt="' + esc(ko + '일주 수호신') + '" decoding="async">' : '<div class="gd-fb" role="img" aria-label="' + esc(ko + '일주') + '"><span>' + esc(sd.dayPillar.hanja) + '</span></div>';
    var row = function (it, lock) { return '<li class="' + (lock ? 'lk' : 'ok') + '"><span class="ic" aria-hidden="true">' + (lock ? '🔒' : '✓') + '</span><div><b>' + esc(it.label) + '</b>' + (it.note ? '<small>' + esc(it.note) + '</small>' : '') + '</div></li>'; };
    return '<div class="free"><p class="kicker">GUARDIAN</p><figure class="gd"><div class="gd-fig" style="--gc:' + col + '">' + fig + '</div><figcaption class="gd-cap">' + esc(cap) + '</figcaption></figure>' +
      '<p class="gd-pot">' + esc(potentialLine(sd, Rz.potentialLine)) + '</p>' + facts(sd) +
      '<p class="gd-turn">' + esc(TURN) + '</p><p class="fine" style="margin:-12px 0 22px">계산으로 알 수 있는 값은 위에서 모두 보셨습니다. 아래는 그 값을 어떻게 읽고 어떻게 쓰는지에 대한 풀이입니다.</p>' +
      '<h2 class="gd-h">' + esc(L.title || '앞으로 열리는 이야기') + '</h2><ul class="lst">' + (L.free || []).map(function (i) { return row(i, false); }).join('') + (L.locked || []).map(function (i) { return row(i, true); }).join('') + '</ul>' +
      '<div class="pay"><h3 class="gd-h2">' + esc(P.title || '') + '</h3>' + ((P.includes || []).length ? '<ul class="inc">' + P.includes.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : '') + (price ? '<p class="price">' + esc(price) + '</p>' : '') +
      '<button type="button" class="btn gold big" id="freeBuy">전체 리포트 열기</button>' +
      '<form class="wl" id="freeWl" hidden novalidate><h3 class="gd-h2">' + esc(P.waitlistTitle || '') + '</h3><p class="fine" style="text-align:left;margin:0 0 10px">' + esc(P.waitlistText || '') + '</p>' +
      '<div class="inl"><input type="email" name="email" placeholder="이메일 주소" autocomplete="email" aria-label="이메일 주소"><button type="submit" class="btn">알림 받기</button></div>' +
      '<label class="chk"><input type="checkbox" name="consent"><i>' + esc(P.consent || '') + '</i></label><input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">' +
      '<p class="msg" id="freeMsg" role="status"></p></form></div>' +
      '<div class="gd-share"><button type="button" class="btn" id="freeLink">공유 링크 복사</button><button type="button" class="btn" id="freeCard">공유 카드 만들기</button></div></div>';
  }

  // 브라우저: 실루엣 → 1.2초 밝아짐, 결제 버튼(Paywall 과 같은 동작), 공유. o: { settings, track, toast, shareLink, onCard }
  function mount(box, o) {
    o = o || {};
    var im = box.querySelector('.gd-img');
    if (im) { var go = function () { void im.offsetWidth; setTimeout(function () { im.classList.add('on'); }, 60); }; if (im.complete && im.naturalWidth) go(); else { im.addEventListener('load', go); im.addEventListener('error', function () { var f = im.parentNode; if (f) f.innerHTML = '<div class="gd-fb"><span>' + esc(o.hanja || '') + '</span></div>'; }); } }
    var buy = box.querySelector('#freeBuy'), f = box.querySelector('#freeWl'), cfg = (o.settings && o.settings.purchase) || {};
    if (buy) buy.addEventListener('click', function () {
      o.track && o.track('purchase_clicked', { mode: cfg.mode || 'waitlist' });
      if (cfg.mode === 'link' && /^(\/|https:\/\/)/.test(cfg.href || '')) { location.href = cfg.href; return; }
      f.hidden = false; buy.hidden = true; f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (f) f.addEventListener('submit', function (e) {
      e.preventDefault(); var msg = f.querySelector('#freeMsg'), email = f.email.value.trim(), sb = f.querySelector('button[type=submit]'), say = function (t, c) { msg.textContent = t; msg.className = 'msg ' + (c || ''); };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return say('이메일 형식을 확인해 주세요', 'err');
      if (!f.consent.checked) return say('개인정보 수집·이용에 동의해 주세요', 'err');
      sb.disabled = true; say('신청 중입니다…');
      fetch('/api/waitlist', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: email, consent: true, website: f.website.value }) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (res) { if (res.ok) { say(o.done || '신청되었습니다.', 'ok'); f.reset(); } else say(res.d.error || '신청에 실패했습니다. 잠시 후 다시 시도해 주세요', 'err'); })
        .catch(function () { say('네트워크 오류입니다. 잠시 후 다시 시도해 주세요', 'err'); }).then(function () { sb.disabled = false; });
    });
    var lk = box.querySelector('#freeLink'); if (lk) lk.addEventListener('click', function () {
      copyText(o.shareLink || '').then(function () { o.toast && o.toast('링크를 복사했습니다. 생년월일·이름은 들어가지 않습니다.'); o.track && o.track('guardian_shared', { from: 'result' }); }).catch(function () { o.toast && o.toast('복사하지 못했습니다. 주소를 직접 복사해 주세요: ' + (o.shareLink || '')); });
    });
    var cd = box.querySelector('#freeCard'); if (cd) cd.addEventListener('click', function () { o.onCard && o.onCard(); });
  }

  R.Free = { html: html, mount: mount, mergeStory: mergeStory, potential: potential, potentialLine: potentialLine, shareUrl: shareUrl, copy: copyText, POTENTIAL: POTENTIAL, TURN: TURN };
})(typeof window !== 'undefined' ? window : globalThis);
