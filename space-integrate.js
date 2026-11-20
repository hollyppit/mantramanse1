/* 통합 공간 해석: 현공비성 결과와 28수 결과를 나란히 놓고 공통점·차이·판단 불가 항목만 정리한다.
   · 어느 쪽 결과도 바꾸지 않는다(입력 객체를 읽기만 한다). 점수를 합치지 않는다. 28수가 현공 판정을 뒤집거나 보정하지 않는다.
   · 개인 명식(용신 등)과의 연결은 이번 범위가 아니다. 나중에 personal 칸에 붙일 수 있게 자리만 둔다.
   문구 순서: 결과 → 쉬운 설명 → 근거 → 적용 전통 → 한계 */
(function (G) {
  'use strict';
  var VERSION = 'space-integrate-20261121-2';
  function integrate(o) {
    o = o || {}; var xk = o.xuankong || null, ms = o.mansions || null, br = o.bearing || null;
    var out = { version: VERSION, xuankong: null, mansions: null, common: [], differ: [], basis: [], undetermined: [], personal: null };
    if (xk) {
      out.xuankong = { result: xk.pattern.name + ' · ' + xk.period + '운 건물(지금 ' + xk.nowPeriod + '운)', easy: xk.pattern.text,
        basis: '향 ' + xk.facing.mt.label + ' · 좌 ' + xk.sitting.mt.label + ' · 기준 연도 ' + xk.basisYear + '년', school: xk.school,
        limit: '체괘·반음 등 일부 규칙은 계산하지 않습니다(계산 기준과 예외 참고).' };
      out.basis.push('현공비성: 건물 향 각도 + 준공·개축 연도 → 삼원구운 운반·산성·향성(' + xk.school + ')');
    } else out.undetermined.push('향 각도가 없어 현공비성 결과가 없습니다.');
    if (ms) {
      var det = ms.status === 'determined' && ms.results.length;
      out.mansions = det ? { result: ms.results.map(function (r) { return r.mansions.map(function (m) { return m.label; }).join('·') + '(' + r.school + ')'; }).join(' / '), easy: '출전이 확인된 나경 대응표(유파별)로 이 방위에 걸치는 수를 찾았습니다. 유파마다 결과를 따로 둡니다.', basis: ms.results.map(function (r) { return r.source; }).join(' / '), school: '나경 유파별 대응표', limit: ms.limits[0] }
        : { result: '건물 방위의 수는 판정하지 않음(나경 대응표 미확정)', easy: '28수의 이름·사신·상징과 고전 적도 도수는 보여 드리지만, 이 건물 방위가 어느 수인지는 정하지 않았습니다.', basis: (ms.degreeProfile ? '원형도 도수: ' + ms.degreeProfile.title + '. ' : '') + '건물 방위를 수로 바꾸는 나경 대응표는 출전 확인 전입니다.', school: '동양 전통 천문(사신 배속·적도 수도)', limit: ms.limits[0] };
      out.basis.push('28수: ' + (det ? '나경 대응 프로필(유파별)' : (ms.degreeProfile ? '고전 적도 도수 프로필(원형도 배치용) · 방위 판정 없음' : '사신 배속 분류만')));
      ms.undetermined.forEach(function (t) { out.undetermined.push('28수 — ' + t); });
      if (!ms.links.available) out.undetermined.push('24산과 28수의 연계 — ' + ms.links.text);
    }
    if (xk && ms) {
      out.common.push('두 체계 모두 같은 향 각도' + (br && br.azimuth != null ? '(' + br.azimuth + '°)' : '') + '를 입력으로 씁니다.');
      out.differ.push('현공비성은 땅 위 방위(24산)와 건물의 시기(운)를 보고, 28수는 하늘의 별자리 구분을 봅니다. 같은 각도라도 뜻하는 바가 다릅니다.');
      if (ms.status !== 'determined') out.differ.push('현공비성은 이 건물에 대해 결과가 있지만, 28수는 나경 대응표가 미확정이라 서로 맞대어 비교할 결과가 아직 없습니다.');
      if (ms.mountain) out.common.push('공통 나침반에서 이 향은 24산의 ' + ms.mountain.hanja + '(' + ms.mountain.center + '° 중심)에 속합니다. 현공은 이 24산으로 계산하고, 28수와의 대응은 하지 않았습니다.');
      out.differ.push('28수 결과는 현공 판정을 바꾸거나 보정하지 않습니다. 두 결과를 하나의 점수로 합치지 않습니다.');
    }
    if (br && br.correction !== 'corrected') out.undetermined.push('자북·진북 보정 — 자기편각을 입력하지 않아 미보정 상태입니다. 풍수 계산은 입력 각도를 그대로 씁니다.');
    return out;
  }
  var api = { VERSION: VERSION, integrate: integrate };
  G.MantraSpaceIntegrate = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
