/* 삼재(三災) 보조 지표 공용 문안·계산(2026-11-24)
   만세력 운세 흐름 탭(index.html)과 운명의 타임라인(report/hub/hub-timeline.js)이 같은 문장·같은 계산을 쓴다.
   계산은 엔진 M.getSamjae(입춘 기준 연지)만 읽는다. 흐름 점수·신호 등급에는 쓰지 않는 표시 전용 층이다. */
(function (G) {
  var STAGES = ['들삼재', '눌삼재', '날삼재'];
  // 단계별 [별칭, 생활 조심 장면]. 겁주는 말 대신 "이런 장면에서 한 번 더 확인"으로 쓴다
  var STAGE = {
    '들삼재': ['들어오는 해', '새로 시작하는 일·이사·계약·큰 지출이 몰리기 쉬운 해예요. 서명 전에 조건을 한 번 더 읽고, 남의 보증이나 급하게 권유받은 투자는 한 템포 미루면 충분해요.'],
    '눌삼재': ['머무는 해', '이미 벌여 놓은 일이 무겁게 느껴지기 쉬운 해예요. 일을 늘리기보다 지금 하는 일을 안정시키고, 건강검진·쉬는 날·운전 안전 같은 기본기를 챙기면 좋아요.'],
    '날삼재': ['나가는 해', '정리하고 빠져나오는 해예요. 미뤄 둔 서류·빚·관계를 깔끔하게 마무리하고, 끝났다고 방심해 막판에 서두르지만 않으면 다음 해 출발이 가벼워져요.']
  };
  var WHAT = '삼재(三災)는 띠를 기준으로 12년마다 한 번 돌아오는 3년의 조심 시기를 가리키는 전통 민속이에요. 셋이 한 묶음인 띠(삼합)끼리는 삼재 해가 같아요.';
  var NOTE = '삼재는 보조 지표로만 보여 주고 흐름 점수에는 넣지 않아요. 삼재인 해라도 흐름이 좋음이면 "확인을 한 번 더 하는 좋은 해", 조심이면 "두 신호가 겹친 해"로 읽으면 됩니다.';
  var mod = function (a, n) { return ((a % n) + n) % n; };
  function at(M, br, Y) { try { var s = M.getSamjae(br, Y); return s && s.active ? s : null; } catch (e) { return null; } }
  // 띠(br = 출생년 지지 번호) 기준, Y가 삼재 안이면 그 3년, 아니면 다음에 올 3년
  function cycle(M, br, Y) {
    var s = at(M, br, Y), pos = s ? STAGES.indexOf(s.stage) : -1, start = s ? Y - pos : null;
    if (!s) for (var k = 1; k <= 12; k++) { var q = at(M, br, Y + k); if (q && q.stage === STAGES[0]) { start = Y + k; s = q; break; } }
    if (start == null) return null;
    var brK = function (y) { return M.BR_K ? M.BR_K[mod(y - 4, 12)] : ''; };
    return { group: s.group, pos: pos, start: start, gap: pos >= 0 ? 0 : start - Y, next: start + 12,
      years: [0, 1, 2].map(function (i) { return { year: start + i, stage: STAGES[i], nick: STAGE[STAGES[i]][0], tip: STAGE[STAGES[i]][1], br: brK(start + i) }; }) };
  }
  G.MantraSamjae = { STAGES: STAGES, STAGE: STAGE, WHAT: WHAT, NOTE: NOTE, at: at, cycle: cycle };
})(typeof window !== 'undefined' ? window : globalThis);
