/* 사주 원국 자세히(2026-11-13) — 운명의 타임라인(#/timeline)과 주제별 풀이(/report/v2/) 맨 앞에서 함께 쓰는 원국 표.
   천간·지지(오행 색) · 십성 · 지장간 · 12운성(좌) · 12신살 · 신살(공망 포함). 값은 엔진(engine.js)의 ch.cells·ch.sinsal 그대로이며 새 계산은 없다.
   사용: MantraNatal.html(Manse, ch, { tip: function(용어){ return html } }) → 표 HTML. 스타일은 report/natal-table.css(.mt-natal 아래).
   브라우저·Node 공용(module.exports). */
(function (G) {
  'use strict';
  var EL_COL = ['#5E9E78', '#D0634A', '#BC9C62', '#AEB9C6', '#4A7AB5'];
  var TERMS = {
    '천간': '기둥 위쪽 글자. 겉으로 드러나는 기운이에요(갑을병정무기경신임계).',
    '지지': '기둥 아래쪽 글자. 바탕·환경이 되는 기운이에요(자축인묘…).',
    '십성': '나(일간)와 다른 글자의 관계를 열 가지로 나눈 것이에요. 비겁·식상·재성·관성·인성 다섯 묶음으로 봐요.',
    '지장간': '지지 속에 숨어 있는 천간이에요. 겉으로는 안 보여도 때가 되면 드러나는 잠재된 기운이에요.',
    '12운성': '일간의 힘이 그 자리에서 어느 단계인지(태어남·자람·전성·쇠퇴…)를 열두 단계로 본 것이에요. "좌"는 그 기둥 천간 자신의 기준이에요.',
    '12신살': '연지(또는 일지) 기준으로 각 자리에 붙는 열두 가지 신호예요. 길흉을 단정하지 않는 참고 표시예요.',
    '신살': '특정 글자 조합에 붙는 별칭이에요. 초록은 도움이 되는 신호, 붉은색은 주의 신호이며 참고용이에요.'
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  // 기본 용어 풀이: 누르면(포커스) 말풍선 — 호출한 쪽이 tip 을 주면 그것을 쓴다
  function defTip(w) { var t = TERMS[w]; return t ? '<span class="tip" tabindex="0" role="button" aria-label="' + esc(w + ': ' + t) + '" data-tip="' + esc(t) + '">' + esc(w) + '</span>' : esc(w); }
  function html(M, ch, opts) {
    opts = opts || {};
    var tip = opts.tip || defTip, order = ['hour', 'day', 'month', 'year'], lab = { hour: '시주', day: '일주', month: '월주', year: '연주' };
    var cell = function (k, fn, cls) { return '<div class="tq-nt-c' + (k === 'day' ? ' me' : '') + (cls ? ' ' + cls : '') + '">' + fn(ch.pillars[k], ch.cells && ch.cells[k], k) + '</div>'; };
    var row = function (label, fn, cls) { return '<div class="tq-nt-l">' + label + '</div>' + order.map(function (k) { return ch.pillars[k] ? cell(k, fn, cls) : '<div class="tq-nt-c none' + (cls ? ' ' + cls : '') + '">' + (cls === 'gz' ? '<span class="tq-unk">시각<br>미상</span>' : '') + '</div>'; }).join(''); };
    var glyph = function (g, el, sub) { return '<span class="tq-nt-g" style="--ec:' + EL_COL[el] + '"><b>' + g + '</b><small>' + esc(sub) + '</small></span>'; };
    return '<div class="tq-nt" role="table" aria-label="사주 원국">' +
      '<div class="tq-nt-l"></div>' + order.map(function (k) { var p = ch.pillars[k]; return '<div class="tq-nt-c hd' + (k === 'day' ? ' me' : '') + '"><b>' + lab[k] + '</b><small>' + (p ? esc(M.gzNameK(p)) : '') + '</small></div>'; }).join('') +
      row(tip('십성'), function (p, c, k) { return '<span class="tq-nt-t">' + esc(k === 'day' ? '나(일간)' : c ? c.stemTG : '') + '</span>'; }) +
      row(tip('천간'), function (p) { var e = M.stemEl(p.s); return glyph(M.STEM[p.s], e, M.STEM_K[p.s] + ' · ' + M.EL_K[e]); }, 'gz') +
      row(tip('지지'), function (p) { var e = M.BR_EL[p.b]; return glyph(M.BR[p.b], e, M.BR_K[p.b] + ' · ' + M.EL_K[e]); }, 'gz') +
      row(tip('십성'), function (p, c) { return '<span class="tq-nt-t">' + esc(c ? c.branchTG : '') + '</span>'; }) +
      row(tip('지장간'), function (p, c) { return (c && c.hidden || []).map(function (h) { return '<span class="tq-nt-h"><i style="--ec:' + EL_COL[M.stemEl(h.s)] + '">' + M.STEM[h.s] + '</i>' + esc(h.tg || '') + '</span>'; }).join(''); }) +
      row(tip('12운성'), function (p, c) { return c ? '<span class="tq-nt-t">' + esc(c.unseong) + '</span>' + (c.unseongJwa ? '<small class="tq-nt-s">좌 ' + esc(c.unseongJwa) + '</small>' : '') : ''; }) +
      row(tip('12신살'), function (p, c) { return '<span class="tq-nt-t">' + esc(c && c.sinsal12 || '—') + '</span>'; }) +
      row(tip('신살'), function (p, c, k) { var names = [], L = ((ch.sinsal && ch.sinsal[k]) || []).map(function (x) { names.push(x.name); return '<i class="tq-nt-ss ' + (x.good ? 'g' : 'b') + '" title="' + esc(x.basis || '') + '">' + esc(x.name) + '</i>'; }); if (c && c.gongmang && names.indexOf('공망') < 0) L.unshift('<i class="tq-nt-ss gm">공망</i>'); return L.join('') || '<span class="tq-nt-s">—</span>'; }) +
      '</div>' + (ch.hourKnown === false ? '<p class="tq-sub">출생 시각을 몰라 시주(時柱) 없이 계산했습니다. 일간·일주는 날짜 기준이라 그대로입니다.</p>' : '') +
      '<p class="tq-sub">색은 오행(목·화·토·금·수)이에요. ' + tip('지장간') + '은 지지 속에 숨은 천간, ' + tip('12운성') + '은 일간의 힘이 그 자리에서 어느 단계인지(좌는 그 기둥 천간 기준), 신살은 초록이 도움·붉은색이 주의 신호예요. 용어를 누르면 뜻이 열려요.</p>';
  }
  var api = { html: html, TERMS: TERMS, EL_COL: EL_COL };
  G.MantraNatal = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
