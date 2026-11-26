// 신년운세(토정비결) 모듈을 Pages Functions 에서 쓰도록 의존 순서대로 불러온다. 파일은 UMD 라 불러오기만 해도 globalThis 에 올라간다.
// 문구 파일(tojeong-modern-N.js·saju-blocks-*.js)이나 연도 자료(years/YYYY/pack.js)를 추가하면 아래 목록에도 추가한다
// (tests/newyear-api-sim.cjs 가 목록과 폴더가 같은지 검사한다).
import '../engine.js';
import '../report/newyear/engine.js';
import '../report/newyear/saju-link.js';
import '../report/newyear/compose.js';
import '../report/newyear/quality.js';
import '../report/newyear/texts/tojeong-kyu1077.js';
import '../report/newyear/texts/tojeong-nl-supplement.js';
import '../report/newyear/texts/tojeong-month-deep.js';   // 월별 심화 해설(손 해설 3괘)
import '../report/newyear/texts/tojeong-verse.js';   // 괘사 원문 줄별 해석(고전체)
import '../report/newyear/texts/tojeong-modern-1.js';
import '../report/newyear/texts/tojeong-modern-2.js';
import '../report/newyear/texts/tojeong-modern-3.js';
import '../report/newyear/texts/tojeong-modern-4.js';
import '../report/newyear/texts/tojeong-modern-5.js';
import '../report/newyear/texts/tojeong-modern-6.js';
import '../report/newyear/texts/tojeong-month-motif.js';   // 손 해설 없는 괘를 핵심어로 채움 — 현대어 풀이 뒤에 불러야 함
import '../report/newyear/texts/saju-blocks-domain.js';
import '../report/newyear/texts/saju-blocks-misc.js';
import '../report/newyear/texts/saju-blocks-month.js';
import '../report/newyear/texts/saju-blocks-total.js';
import '../report/newyear/years/2027/pack.js';

export const RUNTIME_FILES = [
  'texts/tojeong-modern-1.js', 'texts/tojeong-modern-2.js', 'texts/tojeong-modern-3.js', 'texts/tojeong-modern-4.js', 'texts/tojeong-modern-5.js', 'texts/tojeong-modern-6.js',
  'texts/saju-blocks-domain.js', 'texts/saju-blocks-misc.js', 'texts/saju-blocks-month.js', 'texts/saju-blocks-total.js', 'years/2027/pack.js',
];
export const NY = () => ({
  Manse: globalThis.Manse, TojeongEngine: globalThis.TojeongEngine, TojeongText: globalThis.TojeongText, TojeongSupplement: globalThis.TojeongSupplement,
  TojeongModern: globalThis.TojeongModern, NewyearSajuLink: globalThis.NewyearSajuLink, NewyearBlocks: globalThis.NewyearBlocks, NewyearPacks: globalThis.NewyearPacks,
  NewyearCompose: globalThis.NewyearCompose, TojeongMonthDeep: globalThis.TojeongMonthDeep,
});
export const YEARS = () => Object.keys(globalThis.NewyearPacks || {}).map(Number).sort();
