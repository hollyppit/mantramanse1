// 온보딩 일러스트(SVG 문자열). 이미지·영상 자산이 없어도 시네마틱한 장면이 되도록 사례·명리학 소개마다 한 장면씩 그린다.
// 관리자가 이미지·영상 주소를 넣으면 hub-onboard.js 가 이 그림 대신 그것을 쓴다. 색은 허브 변수(--gold 등)를 따른다.
(function (root) {
  'use strict';
  var G = 'var(--gold)', GL = 'var(--gold-l)', INK3 = 'var(--ink-3)', JADE = 'var(--jade)';
  var open = '<svg class="cn-svg" viewBox="0 0 600 260" role="img" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">';
  var defs = '<defs><linearGradient id="gA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EBD9AA" stop-opacity=".95"/><stop offset="1" stop-color="#8E7849" stop-opacity=".55"/></linearGradient>' +
    '<radialGradient id="gG"><stop offset="0" stop-color="#EBD9AA" stop-opacity=".9"/><stop offset="1" stop-color="#CDB27A" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="gL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#EBD9AA" stop-opacity=".0"/><stop offset=".5" stop-color="#EBD9AA" stop-opacity=".55"/><stop offset="1" stop-color="#EBD9AA" stop-opacity="0"/></linearGradient></defs>';
  var t = function (x, y, s, a, c) { return '<text x="' + x + '" y="' + y + '" text-anchor="' + (a || 'middle') + '" fill="' + (c || INK3) + '" font-size="13" letter-spacing="2">' + s + '</text>'; };
  var wrap = function (inner) { return open + defs + inner + '</svg>'; };

  var CASE = {
    // 재능은 종 모양인데 성과는 소수에게 쏠린다
    bell: function () {
      var dots = ''; for (var i = 0; i < 26; i++) { var x = 60 + i * 9; var h = Math.exp(-Math.pow((x - 170) / 55, 2)) * 120; dots += '<circle cx="' + x + '" cy="' + (205 - h * Math.random() * 0.0 - 2) + '" r="0"/>'; }
      return wrap('<line x1="30" y1="205" x2="570" y2="205" stroke="' + INK3 + '" stroke-opacity=".5"/>' +
        '<path class="dr" d="M40 205 C 90 205 120 70 170 70 S 250 205 300 205" fill="none" stroke="' + G + '" stroke-width="3"/><path d="M40 205 C 90 205 120 70 170 70 S 250 205 300 205 Z" fill="url(#gA)" opacity=".18"/>' +
        '<path class="dr d2" d="M340 205 L340 40 C 350 150 400 196 560 203" fill="none" stroke="' + GL + '" stroke-width="3"/>' +
        '<circle class="pop" cx="340" cy="40" r="7" fill="' + GL + '"/><circle cx="340" cy="40" r="22" fill="url(#gG)"/>' + t(170, 232, '재능 — 고르게 퍼진다') + t(450, 232, '성과 — 소수에게 쏠린다'));
    },
    // 성과가 몰리는 짧은 시기
    streak: function () {
      var d = '', xs = [40, 82, 124, 166, 208, 250, 292, 334, 376, 418, 460, 502, 544];
      xs.forEach(function (x, i) { var hot = i >= 6 && i <= 8; d += hot ? '<circle class="pop" style="--i:' + (i - 5) + '" cx="' + x + '" cy="140" r="' + (11 + (i === 7 ? 6 : 0)) + '" fill="url(#gA)"/><circle cx="' + x + '" cy="140" r="30" fill="url(#gG)"/>' : '<circle cx="' + x + '" cy="140" r="5" fill="' + INK3 + '" opacity=".7"/>'; });
      return wrap('<line class="dr" x1="30" y1="140" x2="570" y2="140" stroke="' + INK3 + '" stroke-opacity=".6"/>' + d + '<path d="M250 90 q42 -34 84 0" fill="none" stroke="' + G + '" stroke-width="1.5" stroke-dasharray="3 5"/>' + t(292, 74, 'HOT STREAK', 'middle', GL) + t(40, 200, '경력의 시작', 'start') + t(560, 200, '현재', 'end'));
    },
    // 같은 곡, 다른 세계
    worlds: function () {
      var sets = [[30, 70, 40, 160, 55], [90, 50, 150, 40, 65], [45, 130, 35, 60, 150], [140, 40, 70, 90, 35]], hi = [3, 2, 4, 0], out = '';
      sets.forEach(function (s, w) {
        var ox = 40 + w * 140; out += '<g class="wd" style="--i:' + w + '">';
        s.forEach(function (h, i) { out += '<rect x="' + (ox + i * 22) + '" y="' + (190 - h) + '" width="16" height="' + h + '" rx="3" fill="' + (i === hi[w] ? 'url(#gA)' : 'var(--ink-3)') + '" opacity="' + (i === hi[w] ? 1 : .45) + '"/>'; });
        out += '<line x1="' + (ox - 6) + '" y1="190" x2="' + (ox + 112) + '" y2="190" stroke="' + INK3 + '" stroke-opacity=".5"/>' + t(ox + 52, 216, '세계 ' + (w + 1)) + '</g>';
      });
      return wrap(out);
    },
    // 자란 곳에 따라 달라지는 계단
    steps: function () {
      var a = '', b = '';
      for (var i = 0; i < 3; i++) a += '<rect x="' + (60 + i * 60) + '" y="' + (190 - (i + 1) * 28) + '" width="60" height="' + ((i + 1) * 28) + '" fill="var(--ink-3)" opacity=".4"/>';
      for (var j = 0; j < 6; j++) b += '<rect class="wd" style="--i:' + j + '" x="' + (330 + j * 44) + '" y="' + (190 - (j + 1) * 28) + '" width="44" height="' + ((j + 1) * 28) + '" fill="url(#gA)" opacity="' + (.35 + j * .1) + '"/>';
      return wrap('<line x1="30" y1="190" x2="570" y2="190" stroke="' + INK3 + '" stroke-opacity=".5"/>' + a + b +
        '<circle class="pop" cx="210" cy="82" r="8" fill="' + INK3 + '"/><circle class="pop" cx="572" cy="18" r="0"/><circle class="pop" cx="574" cy="14" r="0"/><circle class="pop" cx="545" cy="12" r="9" fill="' + GL + '"/><circle cx="545" cy="12" r="26" fill="url(#gG)"/>' + t(150, 216, '한 지역') + t(450, 216, '다른 지역'));
    },
    // 문틈으로 새어 나오는 빛
    door: function () {
      return wrap('<path d="M60 215 H540" stroke="' + INK3 + '" stroke-opacity=".5"/>' +
        '<polygon points="300,40 420,215 180,215" fill="url(#gG)" opacity=".5"/>' +
        '<rect x="240" y="40" width="120" height="175" rx="3" fill="none" stroke="' + G + '" stroke-width="2.5"/>' +
        '<polygon class="pop" points="240,40 300,52 300,205 240,215" fill="url(#gA)" opacity=".5"/>' +
        '<circle cx="150" cy="110" r="17" fill="var(--ink-3)" opacity=".75"/><path d="M118 215 q4 -70 32 -70 t32 70 z" fill="var(--ink-3)" opacity=".75"/>' +
        '<rect x="176" y="150" width="28" height="36" rx="2" fill="' + GL + '" opacity=".85" transform="rotate(-12 190 168)"/>' + t(300, 245, '문 하나, 대사 한 줄'));
    },
    // 오래 입은 이미지와 새로 드러난 얼굴
    mask: function () {
      return wrap('<circle cx="230" cy="125" r="78" fill="none" stroke="var(--ink-3)" stroke-width="2.5" opacity=".7"/><circle cx="215" cy="105" r="6" fill="var(--ink-3)"/><circle cx="245" cy="105" r="6" fill="var(--ink-3)"/><path d="M200 140 q30 28 60 0" fill="none" stroke="var(--ink-3)" stroke-width="3" stroke-linecap="round"/>' +
        '<circle class="pop" cx="370" cy="125" r="78" fill="url(#gG)"/><circle cx="370" cy="125" r="78" fill="none" stroke="' + G + '" stroke-width="3"/><path d="M340 108 h22 M378 108 h22" stroke="' + GL + '" stroke-width="4" stroke-linecap="round"/><path d="M345 152 h50" stroke="' + GL + '" stroke-width="4" stroke-linecap="round"/>' +
        '<path d="M300 125 h0" stroke="' + G + '"/>' + t(230, 232, '익숙한 이미지') + t(370, 232, '드러난 얼굴', 'middle', GL));
    },
    eye: function () {
      return wrap('<path class="dr" d="M110 130 Q300 20 490 130 Q300 240 110 130Z" fill="none" stroke="' + G + '" stroke-width="3"/><circle class="pop" cx="300" cy="130" r="46" fill="url(#gA)" opacity=".85"/><circle cx="300" cy="130" r="16" fill="#080A11"/><circle cx="312" cy="118" r="6" fill="#fff" opacity=".9"/><circle cx="300" cy="130" r="90" fill="url(#gG)" opacity=".5"/>');
    },
  };

  var INTRO = {
    // 산맥과 계절, 시간의 호
    time: function () {
      return wrap('<path class="dr" d="M60 200 A 240 170 0 0 1 540 200" fill="none" stroke="' + G + '" stroke-opacity=".7" stroke-width="1.5" stroke-dasharray="4 6"/>' +
        '<circle class="pop" cx="300" cy="46" r="22" fill="url(#gA)"/><circle cx="300" cy="46" r="62" fill="url(#gG)"/>' +
        '<polygon points="0,260 0,175 70,120 120,160 190,95 260,170 330,110 410,165 470,125 540,160 600,130 600,260" fill="#1a2231" opacity=".95"/>' +
        '<polygon points="0,260 0,205 90,170 160,200 250,150 330,195 420,160 500,200 600,175 600,260" fill="#0f1420"/>' +
        [['春', 92, 150], ['夏', 190, 78], ['秋', 410, 78], ['冬', 508, 150]].map(function (s) { return '<circle cx="' + s[1] + '" cy="' + s[2] + '" r="5" fill="' + GL + '"/>' + t(s[1], s[2] - 14, s[0], 'middle', GL); }).join(''));
    },
    // 네 기둥과 흐르는 운
    pillars: function () {
      var P = [['年', 90], ['月', 190], ['日', 290], ['時', 390]], out = '';
      P.forEach(function (p, i) { var h = 130 + (i === 2 ? 20 : 0); out += '<g class="rise" style="--i:' + i + '"><rect x="' + p[1] + '" y="' + (190 - h) + '" width="70" height="' + h + '" rx="4" fill="url(#gA)" opacity="' + (i === 2 ? .55 : .25) + '" stroke="' + G + '" stroke-opacity=".8"/><text x="' + (p[1] + 35) + '" y="' + (190 - h / 2 + 10) + '" text-anchor="middle" font-size="30" fill="' + GL + '" font-family="serif">' + p[0] + '</text></g>'; });
      var run = ''; for (var k = 0; k < 6; k++) run += '<rect class="wd" style="--i:' + (k + 3) + '" x="' + (60 + k * 82) + '" y="214" width="62" height="22" rx="4" fill="none" stroke="' + JADE + '" stroke-opacity=".7"/>' + (k < 5 ? '<path d="M' + (126 + k * 82) + ' 225 h14" stroke="' + JADE + '" stroke-opacity=".7"/>' : '');
      return wrap(out + '<line x1="60" y1="190" x2="540" y2="190" stroke="' + INK3 + '" stroke-opacity=".6"/>' + run + t(300, 254, '大運 — 10년씩 바뀌는 흐름', 'middle', JADE));
    },
    // 두 체계가 하나의 인생을 비춘다
    two: function () {
      var ticks = ''; for (var i = 0; i < 12; i++) { var a = i * Math.PI / 6; ticks += '<line x1="' + (410 + Math.cos(a) * 62) + '" y1="' + (130 + Math.sin(a) * 62) + '" x2="' + (410 + Math.cos(a) * 82) + '" y2="' + (130 + Math.sin(a) * 82) + '" stroke="' + JADE + '" stroke-width="2"/>'; }
      return wrap('<circle class="pop" cx="260" cy="130" r="82" fill="none" stroke="' + G + '" stroke-width="2.5"/><circle class="pop" cx="340" cy="130" r="82" fill="none" stroke="' + JADE + '" stroke-width="2.5"/>' +
        '<circle cx="300" cy="130" r="40" fill="url(#gG)"/><text x="300" y="142" text-anchor="middle" font-size="34" fill="' + GL + '" font-family="serif">命</text>' +
        [0, 1, 2, 3].map(function (i) { return '<rect x="' + (205 + i * 14) + '" y="' + (150 - (i === 2 ? 38 : 28)) + '" width="9" height="' + (i === 2 ? 38 : 28) + '" fill="' + G + '" opacity=".8"/>'; }).join('') +
        t(222, 236, '사주팔자', 'middle', G) + t(378, 236, '자미두수', 'middle', JADE) + '<g transform="translate(-110 0)" opacity="0">' + ticks + '</g>');
    },
    end: function () {
      return wrap('<circle class="pop" cx="300" cy="130" r="92" fill="url(#gG)"/><circle cx="300" cy="130" r="70" fill="none" stroke="' + G + '" stroke-opacity=".6"/><circle cx="300" cy="130" r="94" fill="none" stroke="' + G + '" stroke-opacity=".25" stroke-dasharray="3 7"/><text x="300" y="152" text-anchor="middle" font-size="62" fill="' + GL + '" font-family="serif">運</text>');
    },
  };

  root.OnboardArt = { forCase: function (k) { return (CASE[k] || CASE.bell)(); }, forIntro: function (k) { return (INTRO[k] || INTRO.end)(); } };
})(window);
