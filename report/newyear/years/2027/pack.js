/* 2027 정미년 신년운세 연도 자료. 엔진·문구 DB 는 연도와 무관하고, 해마다 바뀌는 것(해 이름·상징·소개·가능 괘·달력 메모)만 이 폴더에 둔다.
   2028년은 years/2028/pack.js 를 같은 모양으로 추가하면 된다. */
(function (root) {
  'use strict';
  var PACK = {
    year: 2027, gz: '丁未', name: '정미년', animal: '붉은 양',
    productTitle: '2027 정미년 토정비결 신년운세',
    // 해 상징: 천간 丁(불, 촛불·등불처럼 가까이를 비추는 작은 불)과 지지 未(흙, 늦여름의 마른 땅·양). 민간에서 丁의 붉은색과 未의 양을 묶어 '붉은 양의 해'라 부른다.
    symbol: {
      stem: { char: '丁', element: '불(화)', image: '촛불·등불처럼 가까이를 따뜻하게 비추는 불' },
      branch: { char: '未', element: '흙(토)', image: '늦여름 볕에 마른 땅, 무리 지어 다니는 양' },
      line: '작은 불이 마른 땅을 데우는 해예요. 크게 타오르기보다 오래 켜 두는 불빛이 힘을 얻습니다.',
    },
    intro: [
      '정미년은 큰 불꽃보다 꺼지지 않는 등불이 이기는 해예요.',
      '토정비결로는 올해 받은 괘의 옛 글귀를, 사주로는 태어난 날의 기운과 올해 기운이 만나는 방식을 따로 읽고, 두 풀이가 같은 말을 하는지 다른 말을 하는지까지 짚어 드려요.',
    ],
    calendarNotes: { seollal: '2027-02-07', ipchun: '2027-02-04', chuseok: '2027-09-15', lunarLeap: null },
    // 2027년에 실제로 나올 수 있는 괘(중괘 4 없음) — 엔진 yearTable(2027)로 테스트에서 다시 확인한다
    possibleMiddle: [1, 2, 3, 5, 6],
    basisLabels: { tojeongMonth: '음력 월(토정비결 기준)', sajuMonth: '절기 월(사주 기준, 입춘~)' },
    status: 'draft',
  };
  root.NewyearPacks = root.NewyearPacks || {};
  root.NewyearPacks[2027] = PACK;
  if (typeof module !== 'undefined' && module.exports) module.exports = PACK;
})(typeof window !== 'undefined' ? window : globalThis);
