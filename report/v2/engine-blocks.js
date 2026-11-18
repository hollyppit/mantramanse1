/* 타임라인에 아직 안 쓰던 만세력 엔진을 맞는 장에 붙이는 블록(2026-11-15, 챕터 고도화 3묶음)
   · timeline_self_20 '전체 인생 흐름' ← /luck-cycle.js 대운 30년 구간(장기 분석 구간): 구간마다 중심 기운·흐름 모양·기회·주의
   · timeline_self_03 '나의 타고난 기질' ← /gyeok-structure.js 대표 격국·주요 구조 요약
   · timeline_self_02 '내 사주를 자동차로 비유하면' ← 같은 격국 판정을 '설계도'로(성립·안정성)
   · 표시 전용: 엔진 결과를 읽기만 한다. 점수·용신·DB 문안 변경 없음. 엔진 모듈이 없거나 계산이 실패하면 블록을 붙이지 않는다.
   · viewer 가 R.EngineBlocks.set(Manse, ch)로 지금 사주를 알려 준다(본문 객체에는 원국 계산값이 없어서). 검사: tests/engine-blocks-sim.cjs */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var cur = null;
  function set(M, ch) { cur = M && ch ? { M: M, ch: ch } : null; }
  var esc0 = function (t) { return String(t == null ? '' : t).replace(/[&<>"']/g, function (x) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[x]; }); };
  function box(kick, title, lead, body, note, E) {
    return '<section class="dp-embed dp fx eb-blk"><p class="fx-kick">' + E(kick) + '</p><h3 class="fx-title">' + E(title) + '</h3>' + (lead ? '<p class="fx-lead">' + E(lead) + '</p>' : '') + body + (note ? '<p class="fx-note">' + E(note) + '</p>' : '') + '</section>';
  }
  var TONE = { good: '순풍', mid: '보통', mixed: '도움과 부담이 섞임', bad: '맞바람' };
  var ROLE_PLAIN = { 용신: '가장 필요한 기운', 희신: '필요한 기운을 돕는 기운', 한신: '크게 돕지도 막지도 않는 기운', 기신: '넘치면 부담이 되는 기운', 구신: '부담을 거드는 기운' };
  function rolePlain(r) { var cond = /^조건부 /.test(r), k = String(r).replace(/^조건부 /, ''); return (ROLE_PLAIN[k] || k) + '(' + k + (cond ? ', 조건부' : '') + ')'; }
  function first(t) { var m = String(t || '').match(/^.*?[.!?](?=\s|$)/); return m ? m[0] : String(t || ''); }

  // 전체 인생 흐름: 장기 운세 요약(2026-11-18) — 대운 3개를 한 오행·한 길흉으로 묶지 않고 대운마다의 흐름과 사이 변화를 순서대로(luck-cycle.js longSummary)
  function cycle30(E) {
    var L = root.MantraLuckCycle; if (!L || !L.longSummary || !cur) return '';
    var r; try { r = L.longSummary(cur.M, cur.ch, { ms: cur.now }); } catch (e) { return ''; }
    if (!r || r.rows.length < 2) return '';
    var li = r.rows.map(function (x) { return '<li><b>' + E((x.tense === 'now' ? '지금 · ' : x.tense === 'past' ? '지난 · ' : '다음 · ') + x.startAge + '세 ' + x.gz + ' 대운') + '</b> ' + E(x.text) + '</li>'; }).join('');
    var sh = r.shifts.map(function (t) { return '<li>' + E(t.text) + '</li>'; }).join('');
    return box('運路 · 앞으로의 대운', '대운 세 개를 순서대로 놓고 보면', '대운 10년씩의 흐름과 그 사이에서 무엇이 바뀌는지를 차례로 짚어요.', '<ul class="fx-ul">' + li + '</ul>' + (sh ? '<p><b>대운이 바뀔 때</b></p><ul class="fx-ul">' + sh + '</ul>' : ''),
      '세 대운을 하나의 오행이나 하나의 점수로 묶지 않았어요. 대운마다의 흐름 상태는 운세 흐름 탭의 대운 막대와 같은 계산이에요.', E);
  }
  function gyeok() { var GS = root.MantraGyeokStructure; if (!GS || !cur) return null; try { return GS.analyze(cur.M, cur.ch); } catch (e) { return null; } }
  // 나의 타고난 기질: 격국 요약
  function gyeokSummary(E) {
    if (R.FlowChapters && R.FlowChapters.on) return '';   // 흐름·격국 장(timeline_self_gyeok)이 들어가 있으면 같은 내용이라 뺀다
    var g = gyeok(); if (!g) return '';
    var rep = g.rep, li = [];
    li.push('<li><b>' + E(rep.type === 'hold' ? '격국 판정 유보' : rep.name) + '</b> ' + E(rep.type === 'hold' ? '격국을 하나로 정할 근거가 부족해, 이름보다 오행 흐름과 강약으로 읽는 편이 정확해요.' : rep.easy.replace(/구조입니다\.$/, '구조예요.')) + (rep.type === 'jeong' ? '<small>' + E((rep.establishLabel || '') + ' · ' + (rep.stabilityLabel || '')) + '</small>' : '') + '</li>');
    g.major.slice(0, 2).forEach(function (o) { li.push('<li><b>' + E(o.name) + '</b> ' + E(String(o.txt.easy).replace(/흐름입니다\.$/, '흐름이에요.').replace(/구조입니다\.$/, '구조예요.')) + '</li>'); });
    return box('命簿 · 사주의 뼈대', '기질을 받치는 사주의 뼈대', '기질은 일간 하나보다 사주 전체의 짜임새(격국)에서 더 또렷하게 드러나요.', '<ul class="fx-ul">' + li.join('') + '</ul>',
      '격국은 짜임새를 읽는 한 가지 틀이라, 이것만으로 성격이나 길흉을 정하지 않아요.', E);
  }
  // 자동차 비유: 격국 = 설계도, 안정성 = 차체 상태
  var BODY = { seong: '설계를 받쳐 주는 부품이 갖춰져 차체가 안정적인 편이에요.', rescued: '흔드는 부품이 있지만 잡아 주는 장치도 있어 버티는 차예요.', plain: '특별히 돕거나 흔드는 부품이 없는 무난한 차예요. 운에서 맞는 연료가 들어올 때 성능이 또렷해져요.', pa: '흔드는 부품을 잡아 줄 장치가 약해, 길이 험할 때 흔들리기 쉬운 차예요. 정비(습관·도움)를 미리 챙겨 두면 충분해요.', hold: '설계도를 하나로 정하기 어려운 차라, 주행 습관(오행 흐름·강약)을 보는 편이 정확해요.' };
  function carPlan(E) {
    var g = gyeok(); if (!g) return '';
    var rep = g.rep, st = rep.type === 'special' ? 'seong' : rep.type === 'hold' ? 'hold' : (rep.stability || 'plain');
    var li = '<li><b>설계도 · ' + E(rep.type === 'hold' ? '판정 유보' : rep.name) + '</b> ' + E(rep.type === 'special' ? '한 방향으로 크게 쏠린 특수한 설계라, 그 흐름을 따라 달릴 때 힘이 나요.' : rep.type === 'hold' ? '' : '이 설계도에 맞는 길(' + (rep.txt && rep.txt.good && rep.txt.good[1] ? String(rep.txt.good[1]).replace(/니다\.$/, '니다').replace(/[.。]$/, '') : '맞는 환경') + ')에서 가장 잘 달려요.') + '</li>' +
      '<li><b>차체 상태</b> ' + E(BODY[st] || BODY.plain) + '</li>' +
      (g.major.length ? '<li><b>달린 장치</b> ' + E(g.major.map(function (o) { return o.name; }).join(' · ')) + '<small>' + E(g.major.map(function (o) { return o.txt.short || ''; }).filter(Boolean).join(' / ')) + '</small></li>' : '');
    return box('命簿 · 설계도', '이 차의 설계도와 차체 상태', '같은 엔진(일간)이라도 설계도(격국)와 차체(안정성)에 따라 달리는 방식이 달라져요.', '<ul class="fx-ul">' + li + '</ul>', '격국 판정은 오행·강약 탭의 사주 격국 분석과 같은 계산이에요.', E);
  }
  var MAP = { timeline_self_20: cycle30, timeline_self_03: gyeokSummary, timeline_self_02: carPlan };
  // 같은 계약 장이 옛 장 여러 개로 나뉘어 보일 때(게시 목차가 없는 기본 목차) 블록은 한 사람에게 한 번만
  function html(c, esc) { var id = c && (c.editorialContractId || c.id), f = MAP[id]; if (!f) return ''; var FO = R.FactOnce, sd = c.readingVisualData; if (FO && sd && c.id && !FO.own(sd, 'eb:' + id, c.id)) return ''; try { return f(esc || esc0) || ''; } catch (e) { return ''; } }
  R.EngineBlocks = { set: set, html: html, MAP: MAP };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.EngineBlocks;
})(typeof window !== 'undefined' ? window : globalThis);
