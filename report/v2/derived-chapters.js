/* 엔진 조립 장 목록(2026-11-15) — 게시 목차(챕터 계약)에는 없고, 만세력 엔진 값으로 화면에서 만들어 끼워 넣는 장들.
   관리자 '타임라인 구성'·'챕터 계약·현실 사례'·'챕터 감사 성적표'와 감사 도구(tools/timeline-chapter-audit.cjs)가 같은 목록을 쓰도록 한곳에 둔다.
   · 실제 장을 만드는 모듈: reading-peak.js(전성기) · flow-chapters.js(오행 흐름·격국) · health-chapters.js(건강·사고수)
   · after: 이 장이 붙는 바로 앞 장(계약 id). 'first:<주제>' 는 그 주제의 첫 장. flag: 공개 스위치(/api/luck-flags), null 이면 늘 보임
   · 모듈의 제목(TITLES)과 이 목록의 제목이 같은지는 tests/derived-chapters-sim.cjs 가 검사한다. */
(function (root) {
  'use strict';
  var R = root.ReportV2 = root.ReportV2 || {};
  var LIST = [
    { id: 'timeline_self_flow', title: '내 사주의 기운은 어떻게 흐를까?', topic: 'self', after: 'timeline_self_03', module: 'flow-chapters.js', flag: 'flowChapters', group: '오행 흐름·격국' },
    { id: 'timeline_self_gyeok', title: '내 사주의 뼈대, 격국과 주요 구조', topic: 'self', after: 'timeline_self_flow', module: 'flow-chapters.js', flag: 'flowChapters', group: '오행 흐름·격국' },
    { id: 'timeline_self_peak', title: '내 인생의 전성기는 언제?', topic: 'self', after: 'timeline_self_20', module: 'reading-peak.js', flag: null, group: '전성기' },
    { id: 'timeline_self_h1', title: '내 몸의 오행 지도', topic: 'self', after: 'timeline_self_35', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_self_h2', title: '나는 언제 쉽게 지칠까?', topic: 'self', after: 'timeline_self_h1', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_self_h3', title: '스트레스가 몸으로 오는 길', topic: 'self', after: 'timeline_self_h2', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_self_h4', title: '올해·이번 달 몸 챙길 때', topic: 'self', after: 'timeline_self_h3', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_self_h5', title: '사고수 신호 읽기 — 조심할 장면', topic: 'self', after: 'timeline_self_h4', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_self_h6', title: '앞으로 10년 안전 흐름과 삼재', topic: 'self', after: 'timeline_self_h5', module: 'health-chapters.js', flag: 'healthChapters', group: '건강·사고수' },
    { id: 'timeline_wealth_flow', title: '돈의 기운은 어떻게 흐를까?', topic: 'wealth', after: 'first:wealth', module: 'flow-chapters.js', flag: 'flowChapters', group: '오행 흐름·격국' },
    { id: 'timeline_career_flow', title: '일의 기운은 어떻게 흐를까?', topic: 'career', after: 'first:career', module: 'flow-chapters.js', flag: 'flowChapters', group: '오행 흐름·격국' },
    { id: 'timeline_love_flow', title: '인연의 기운은 어떻게 흐를까?', topic: 'love', after: 'first:love', module: 'flow-chapters.js', flag: 'flowChapters', group: '오행 흐름·격국' },
  ];
  var FLAG_NAME = { flowChapters: '오행 흐름·격국 장', healthChapters: '건강·사고수 장' };
  var topicOf = function (id) { var m = /^timeline_([a-z]+)_/.exec(id || ''); return m ? m[1] : ''; };
  // 계약 id 순서(order)에 엔진 장을 사용자 화면과 같은 자리로 끼워 넣는다. 앞 장이 없으면 그 주제 끝에 붙인다
  function insert(order, opts) {
    var out = (order || []).slice(), only = opts && opts.ids;
    LIST.forEach(function (d) {
      if (only && only.indexOf(d.id) < 0) return; if (out.indexOf(d.id) >= 0) return;
      var at = -1;
      if (/^first:/.test(d.after)) { var t = d.after.slice(6); at = out.findIndex(function (id) { return topicOf(id) === t; }); }
      else at = out.indexOf(d.after);
      if (at < 0) { for (var k = out.length - 1; k >= 0; k--) if (topicOf(out[k]) === d.topic) { at = k; break; } }
      out.splice(at + 1, 0, d.id);
    });
    return out;
  }
  function byId(id) { return LIST.find(function (d) { return d.id === id; }) || null; }
  function afterLabel(d, titleOf) { if (!d) return ''; if (/^first:/.test(d.after)) return '그 주제의 첫 장'; var t = titleOf ? titleOf(d.after) : ''; return t ? '“' + t + '”' : d.after.replace('timeline_', ''); }
  R.DerivedChapters = { LIST: LIST, FLAG_NAME: FLAG_NAME, insert: insert, byId: byId, afterLabel: afterLabel, topicOf: topicOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = R.DerivedChapters;
})(typeof window !== 'undefined' ? window : globalThis);
