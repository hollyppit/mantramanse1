// 주역 모듈(순수 계산·콘텐츠·검수 코어)을 Pages Functions 에서 쓰도록 의존 순서대로 불러온다. 파일은 UMD 형태라 불러오기만 해도 globalThis 에 올라간다.
// 새 괘 해석 파일(packs-ext-N.js)을 추가하면 아래 목록에도 추가한다(tests/iching-review-sim.cjs 가 목록과 폴더가 같은지 검사한다).
import '../report/iching/hexagrams.js';
import '../report/iching/engine.js';
import '../report/iching/texts/classics.js';
import '../report/iching/texts/modern-1.js';
import '../report/iching/texts/modern-2.js';
import '../report/iching/texts/modern-3.js';
import '../report/iching/texts/modern-4.js';
import '../report/iching/texts/packs-sample.js';
import '../report/iching/texts/packs-banks.js';
import '../report/iching/texts/packs-ext-1.js';
import '../report/iching/texts/packs-ext-2.js';
import '../report/iching/texts/packs-ext-3.js';
import '../report/iching/texts/packs-ext-4.js';
import '../report/iching/texts/packs-ext-5.js';
import '../report/iching/texts/packs-ext-6.js';
import '../report/iching/texts/packs-extended.js';
import '../report/iching/content.js';
import '../report/iching/saju-link.js';
import '../report/iching/compose.js';
import '../report/iching/result-schema.js';
import '../report/iching/quality.js';
import '../report/iching/review-core.js';
import '../report/iching/ai-detail.js';

export const Ic = () => ({ Hexagrams: globalThis.IchingHexagrams, Engine: globalThis.Iching, Content: globalThis.IchingContent, Compose: globalThis.IchingCompose, Schema: globalThis.IchingResultSchema, Quality: globalThis.IchingQuality, Review: globalThis.IchingReview });
