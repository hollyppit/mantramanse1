/* 신년운세 화면 꾸미기(2026-11-16): 관리자 › 신년운세 › 화면 꾸미기 값(/api/newyear/look)을 화면에 입힌다.
   ① 배경 이미지: 기본 하늘(달·양) 대신 관리자가 올린 이미지(PC·모바일)
   ② 진입 프롤로그: 들어올 때 한 번(같은 탭에서는 한 번만) — 영상이 있으면 영상(이미지는 포스터), 이미지만 있으면 정한 시간 동안. 건너뛰기 가능, 움직임 줄이기면 정지 화면.
   ③ 패널 이미지: 미디어 라이브러리의 패널 삽화(panel-<오행>-<주제>[-F|-M])에서 사용자 일간 오행·성별과 장 주제에 맞는 것을 골라 장 사이사이에 넣는다.
      같은 그림이 한 풀이 안에서 겹치지 않게 하고, 장마다 일간 오행 · 올해(丁火·未土) 오행을 번갈아 섞는다. 맞는 그림이 없으면 넣지 않는다(글만). */
(function (root) {
  'use strict';
  var L = { media: null, panels: null, used: {}, assign: {}, elDay: '', gender: '' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var reduce = root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobile = function () { return (root.innerWidth || 1024) < 768; };
  var ssGet = function (k) { try { return root.sessionStorage.getItem(k); } catch (e) { return null; } }, ssPut = function (k, v) { try { root.sessionStorage.setItem(k, v); } catch (e) { } };
  var STEM_EL = { '甲': 'wood', '乙': 'wood', '丙': 'fire', '丁': 'fire', '戊': 'earth', '己': 'earth', '庚': 'metal', '辛': 'metal', '壬': 'water', '癸': 'water' };
  var EL_CYCLE = { wood: ['wood', 'fire', 'water'], fire: ['fire', 'earth', 'wood'], earth: ['earth', 'fire', 'metal'], metal: ['metal', 'earth', 'water'], water: ['water', 'metal', 'wood'] };
  // 장·절 → 패널 주제(관리자 패널 이미지의 15주제)
  var CH_THEME = { open: ['sewoon', 'identity'], total: ['sewoon', 'daewoon', 'identity', 'action'], wealth: ['wealth'], career: ['career', 'talent'], love: ['love', 'relationship', 'marriage'], health: ['remedy', 'shadow'], months: ['monthly'], peak: ['daewoon', 'sewoon'], action: ['action', 'remedy'] };

  function fetchJson(u) { return fetch(u).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  // ① 배경 ② 프롤로그
  function boot(year, done) {
    done = done || function () { };
    fetchJson('/api/newyear/look?year=' + year).then(function (d) {
      var m = d && d.ok && d.media; L.media = m || null;
      if (!m) { done(); return; }
      var bg = (mobile() && m.bgMobile) || m.bg;
      if (bg) { var sky = document.querySelector('.ny-sky'); if (sky) { sky.classList.add('ny-sky-img'); sky.style.backgroundImage = 'url(' + JSON.stringify(bg) + ')'; } }
      var vid = (mobile() && m.proVideoMobile) || m.proVideo, img = (mobile() && m.proImageMobile) || m.proImage, key = 'mt_ny_pro:' + year;
      if (m.proOn === false || !(vid || img) || ssGet(key) === '1' || /[?&]pay=/.test(root.location.search)) { done(); return; }
      ssPut(key, '1'); prologue(vid, img, Math.max(2, Math.min(30, +m.proSec || 6)) * 1000, done);
    });
  }
  function prologue(vid, img, hold, done) {
    var el = document.createElement('div'), ended = false, t1 = 0, t2 = 0;
    el.className = 'ny-pro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '신년운세 프롤로그');
    el.innerHTML = '<div class="ny-pro-media"></div><button type="button" class="ny-pro-skip">건너뛰기 ›</button>';
    document.body.appendChild(el); document.documentElement.classList.add('ny-pro-on');
    var box = el.querySelector('.ny-pro-media');
    function finish() { if (ended) return; ended = true; clearTimeout(t1); clearTimeout(t2); el.classList.add('out'); setTimeout(function () { el.remove(); document.documentElement.classList.remove('ny-pro-on'); done(); }, reduce ? 0 : 700); }
    el.querySelector('.ny-pro-skip').onclick = finish;
    document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { document.removeEventListener('keydown', esc); finish(); } });
    function still() {
      if (!img) { finish(); return; }
      var im = new Image(); im.alt = ''; im.decoding = 'async'; im.src = img; box.innerHTML = ''; box.appendChild(im);
      var show = function () { if (ended) return; void im.offsetWidth; im.classList.add('in'); t1 = setTimeout(finish, hold); };
      if (im.complete && im.naturalWidth) show(); else { im.onload = show; im.onerror = finish; }
    }
    if (!vid) { still(); return; }
    var v = document.createElement('video'); v.muted = true; v.defaultMuted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'auto'; v.src = vid; if (img) v.poster = img;
    box.appendChild(v);
    v.addEventListener('playing', function () { v.classList.add('in'); });
    v.addEventListener('ended', finish); v.addEventListener('error', function () { v.remove(); still(); });
    var p = v.play(); if (p && p.catch) p.catch(function () { v.remove(); still(); });
    t2 = setTimeout(function () { if (!ended && v.currentTime === 0) { v.remove(); still(); } }, 6000);   // 6초가 지나도 시작하지 않으면 이미지(또는 바로 본문)
  }

  // ③ 패널 이미지
  function setPerson(stemHanja, gender) { L.elDay = STEM_EL[stemHanja] || ''; L.gender = gender === 'F' || gender === 'M' ? gender : ''; L.used = {}; L.assign = {}; }
  function loadPanels() {
    if (L.panels) return Promise.resolve(L.panels);
    return fetchJson('/api/media').then(function (d) {
      var list = (d && (d.media || d.items || d)) || [], by = {};
      (Array.isArray(list) ? list : []).forEach(function (m) {
        var x = /^panel-(wood|fire|earth|metal|water)-([a-z]+)(?:-([FM]))?$/.exec(m && m.id || ''), u = m && (m.url || m.posterUrl);
        if (!x || !u || m.type === 'video') return; (by[x[1] + '.' + x[2]] = by[x[1] + '.' + x[2]] || []).push({ id: m.id, url: u, g: x[3] || '', title: m.title || '' });
      });
      L.panels = by; return by;
    });
  }
  function pick(themes, n, tn) { // n: 오행 섞기 순번(장 순서+칸), tn: 주제 순번(같은 장의 두 번째 칸은 다음 주제)
    if (!L.panels || !L.media || L.media.panels === false) return null;
    var els = EL_CYCLE[L.elDay] || ['fire', 'earth', 'wood'], order = [];
    // 일간 오행 → 올해 오행 순서를 장마다 돌려 가며 섞는다
    // 일간 오행을 절반쯤, 나머지는 올해·도와주는 오행으로(0,1,0,2 순서) 장마다 번갈아 섞는다
    order.push(els[[0, 1, 0, 2][n % 4]]); els.forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });
    ['wood', 'fire', 'earth', 'metal', 'water'].forEach(function (x) { if (order.indexOf(x) < 0) order.push(x); });   // 맞는 오행 그림이 없으면 다른 오행이라도(주제는 지킨다)
    for (var t = 0; t < themes.length; t++) for (var e = 0; e < order.length; e++) {
      var cands = (L.panels[order[e] + '.' + themes[(t + (tn || 0)) % themes.length]] || []).filter(function (c) { return !L.used[c.id] && (!c.g || !L.gender || c.g === L.gender); });
      cands.sort(function (a, b) { return (b.g === L.gender) - (a.g === L.gender); });
      if (cands.length) { L.used[cands[0].id] = 1; return cands[0]; }
    }
    return null;
  }
  // 장 하나에 넣을 패널: 장 첫머리 1장, 절(section)이 3개 이상이면 중간에 1장 더
  function panelHtml(chId, slot) {
    var key = chId + ':' + (slot || 0), c = L.assign[key], order = Object.keys(CH_THEME).indexOf(chId); // 한 풀이 안에서는 장을 다시 열어도 같은 그림
    if (c === undefined) { c = L.assign[key] = pick(CH_THEME[chId] || ['sewoon'], Math.max(0, order) + (slot || 0), slot || 0); }
    if (!c) return '';
    return '<figure class="ny-panel' + (reduce ? '' : ' kb') + '"><img src="' + esc(c.url) + '" alt="" loading="lazy" decoding="async"></figure>';
  }
  function resetUsed() { L.used = {}; L.assign = {}; }

  root.NewyearLook = { boot: boot, setPerson: setPerson, loadPanels: loadPanels, panelHtml: panelHtml, resetUsed: resetUsed, _state: L };
})(typeof window !== 'undefined' ? window : globalThis);
