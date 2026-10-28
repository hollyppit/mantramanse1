/* Node(테스트·도구) 전용 로더: 주역 모듈과 데이터 파일을 의존 순서대로 불러와 globalThis 에 올린다. 브라우저는 script 태그, Worker 는 functions/_iching-runtime.js 가 같은 순서로 불러온다. */
'use strict';
const path = require('path'), fs = require('fs');
const base = __dirname, texts = path.join(base, 'texts');
['hexagrams.js', 'engine.js', 'texts/classics.js', 'texts/modern-1.js', 'texts/modern-2.js', 'texts/modern-3.js', 'texts/modern-4.js', 'texts/packs-sample.js', 'texts/packs-banks.js']
  .forEach(f => require(path.join(base, f)));
fs.readdirSync(texts).filter(f => /^packs-ext-\d+\.js$/.test(f)).sort().forEach(f => require(path.join(texts, f)));
['texts/packs-extended.js', 'content.js', 'saju-link.js', 'compose.js', 'result-schema.js', 'quality.js', 'review-core.js']
  .forEach(f => { if (fs.existsSync(path.join(base, f))) require(path.join(base, f)); });
module.exports = { Hexagrams: globalThis.IchingHexagrams, Engine: globalThis.Iching, Content: globalThis.IchingContent, Compose: globalThis.IchingCompose, Schema: globalThis.IchingResultSchema, Quality: globalThis.IchingQuality, Review: globalThis.IchingReview };
