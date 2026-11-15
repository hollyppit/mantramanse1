// Node(테스트·서버 조합)용 로더: 만세력 엔진과 신년운세 모듈·문구 DB를 전역에 올린다. 브라우저는 <script> 순서로 같은 전역을 만든다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const here = __dirname, root = path.join(here, '..', '..');
if (!globalThis.Manse) {
  const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8');
  const a = eng.indexOf('var MANSE_DATA'), b = eng.indexOf('})(typeof window', a);
  vm.runInThisContext(eng.slice(a, eng.indexOf('\n', b)));
}
const req = f => require(path.join(here, f));
req('engine.js'); req('saju-link.js'); req('compose.js');
req('texts/tojeong-kyu1077.js'); req('texts/tojeong-nl-supplement.js');
const textsDir = path.join(here, 'texts');
// 문구 파일은 있는 것만 읽는다(작성 중인 묶음이 빠져도 나머지로 동작)
globalThis.NewyearBlocks = [];
for (const f of fs.readdirSync(textsDir).sort()) {
  if (/^tojeong-modern-\d+\.js$/.test(f)) req('texts/' + f);
  if (/^saju-blocks-[\w-]+\.js$/.test(f)) req('texts/' + f);
}
for (const y of fs.readdirSync(path.join(here, 'years'))) if (/^\d{4}$/.test(y)) req(`years/${y}/pack.js`);
module.exports = globalThis;
