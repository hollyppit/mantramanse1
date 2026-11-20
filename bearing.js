/* 공통 방위 입력: 건물 향 각도를 표준 방위 기록으로 정리한다. 브라우저·Node 공용, 네트워크 없음.
   원칙
   · 기존 '향 각도(facing)'의 의미는 바꾸지 않는다. 현공비성 엔진에는 지금까지처럼 사용자가 넣은 각도(azimuth)를 그대로 넘긴다.
     나경(羅經)은 자침이 가리키는 자북을 기준으로 읽으므로, 풍수 계산은 자북 기준 각도를 쓰는 것이 기본이다.
   · 자기편각을 모르면 임의 값을 넣지 않는다. correctedAzimuth 는 null, 상태는 '미보정'으로 둔다.
   · 센서 값은 휴대폰 나침반 앱 수준의 참고 값이다. 측량 수준 정확도로 표현하지 않는다.
   · 좌 = (향 + 180) % 360. 현공 엔진(mountainAt(facing + 180))과 같은 방식이다.
   사용: MantraBearing.record({ azimuth, referenceNorth, magneticDeclination, measurementSource, measuredAt }) */
(function (G) {
  'use strict';
  var VERSION = 'bearing-20261121-1';
  var norm = function (d) { return ((d % 360) + 360) % 360; };
  var round1 = function (d) { return Math.round(d * 10) / 10; };
  var REF = { magnetic: '자북(나침반이 가리키는 북쪽)', true: '진북(지도·위성의 북쪽)', unknown: '기준 모름' };
  var SRC = { manual: '직접 입력', select: '8방위 바로 고르기', sensor: '휴대폰 방향 센서', unknown: '입력 방법 모름' };

  // 숫자로 읽을 수 있으면 0 이상 360 미만으로 정리한다. 360 은 0, -1 은 359. 읽을 수 없으면 null
  function normalize(v) {
    if (v === '' || v == null) return null;
    var n = +v; if (!isFinite(n)) return null;
    return round1(norm(n)) === 360 ? 0 : round1(norm(n));
  }
  function sitting(facing) { var f = normalize(facing); return f == null ? null : round1(norm(f + 180)); }
  function validDecl(v) { if (v === '' || v == null) return null; var n = +v; return isFinite(n) && Math.abs(n) <= 30 ? n : null; }

  // 표준 방위 기록. bearingType 은 'facing'(향)만 쓰고, 좌는 계산값으로 함께 둔다.
  //   referenceNorth: 'magnetic' | 'true' | 'unknown'
  //   magneticDeclination: 동편각 +, 서편각 − (한국은 대략 −8~−9°). 모르면 null
  //   correctedAzimuth: 반대 기준으로 바꾼 값(자북→진북 또는 진북→자북). 편각을 모르면 null
  function record(o) {
    o = o || {};
    var az = normalize(o.azimuth), ref = REF[o.referenceNorth] ? o.referenceNorth : 'unknown';
    var decl = validDecl(o.magneticDeclination), src = SRC[o.measurementSource] ? o.measurementSource : 'unknown';
    var out = { version: VERSION, azimuth: az, bearingType: 'facing', sittingAzimuth: sitting(az), referenceNorth: ref, referenceLabel: REF[ref],
      magneticDeclination: decl, correctedAzimuth: null, correctedReference: null, correction: 'none', measurementSource: src, sourceLabel: SRC[src],
      measuredAt: typeof o.measuredAt === 'string' && o.measuredAt ? o.measuredAt : null, notes: [] };
    if (az == null) { out.notes.push('향 각도가 없어 방위 계산을 하지 않았습니다.'); return out; }
    if (decl == null) {
      out.correction = 'uncorrected';
      out.notes.push('자기편각을 입력하지 않아 자북·진북 보정을 하지 않았습니다(미보정). 입력한 각도를 그대로 씁니다.');
    } else if (ref === 'magnetic') { out.correctedAzimuth = round1(norm(az + decl)); out.correctedReference = 'true'; out.correction = 'corrected'; }
    else if (ref === 'true') { out.correctedAzimuth = round1(norm(az - decl)); out.correctedReference = 'magnetic'; out.correction = 'corrected'; }
    else { out.correction = 'uncorrected'; out.notes.push('각도가 자북 기준인지 진북 기준인지 몰라 보정하지 않았습니다.'); }
    if (src === 'sensor') out.notes.push('휴대폰 센서 값은 주변 철물·전자기기에 따라 몇 도씩 달라질 수 있는 참고 값입니다. 측량 수준의 정확도가 아닙니다.');
    if (src === 'select') out.notes.push('8방위 바로 고르기는 45° 단위 대략값입니다. 24산 경계 부근이면 실제로 재서 입력해 주세요.');
    return out;
  }
  // 풍수(현공) 계산에 넘길 각도: 기존 동작과 같게 사용자가 입력한 각도 그대로. 보정값으로 바꾸지 않는다.
  function forFengshui(rec) { return rec && rec.azimuth != null ? rec.azimuth : null; }
  // 자북과 진북 차이 안내 문장
  function northText(rec) {
    if (!rec || rec.azimuth == null) return '';
    if (rec.correction !== 'corrected') return '입력 기준: ' + rec.referenceLabel + ' · 자기편각 미보정. 한국은 자북이 진북보다 서쪽으로 약 8~9° 기울어 있어, 같은 집도 지도 앱(진북)과 나침반(자북) 각도가 그만큼 다를 수 있습니다.';
    return '입력 ' + rec.azimuth + '°(' + (rec.referenceNorth === 'magnetic' ? '자북' : '진북') + ') = ' + rec.correctedAzimuth + '°(' + (rec.correctedReference === 'true' ? '진북' : '자북') + '), 자기편각 ' + rec.magneticDeclination + '° 적용. 풍수 계산은 입력 각도를 그대로 씁니다.';
  }

  var api = { VERSION: VERSION, normalize: normalize, sitting: sitting, record: record, forFengshui: forFengshui, northText: northText, REF: REF, SRC: SRC };
  G.MantraBearing = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
