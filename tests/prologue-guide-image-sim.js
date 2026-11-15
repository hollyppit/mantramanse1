// 안내자 프롤로그 이미지·주제(w8 포함) 저장/선택 검증:  node tests/prologue-guide-image-sim.js
const assert = require('assert'), fs = require('fs'), vm = require('vm'), path = require('path'), { pathToFileURL } = require('url');
(async () => {
  const api = await import(pathToFileURL(path.resolve('functions/api/prologue.js')).href);
  let saved = { on: true, M: '/api/clipfile?k=common-m.mp4', F: '', worlds: { w2: { M: '/api/clipfile?k=w2-m.mp4', F: '' } } };
  const env = { ADMIN_PASSWORD: 'test-only', GLOSSARY_KV: { get: async () => saved, put: async (k, v) => { saved = JSON.parse(v); } } };
  const put = body => api.onRequestPut({ env, request: new Request('https://test/api/prologue', { method: 'PUT', headers: { authorization: 'Bearer test-only' }, body: JSON.stringify(body) }) });
  // 1. 건강(w8)·두 자리 주제 id 보존, 이미지 슬롯·시간 저장
  assert.equal((await put({ ...saved, MI: '/api/clipfile?k=common-m.webp', FI: 'https://cdn.example.com/f.png', imgSec: 9, worlds: { ...saved.worlds, w8: { M: '', F: '', MI: '', FI: '/api/clipfile?k=w8-f.webp' }, w12: { MI: '/api/clipfile?k=w12.png' }, bad: { M: '/api/clipfile?k=x.mp4' } } })).status, 200);
  assert.equal(saved.worlds.w8.FI, '/api/clipfile?k=w8-f.webp'); assert.equal(saved.worlds.w12.MI, '/api/clipfile?k=w12.png'); assert(!saved.worlds.bad);
  assert.equal(saved.MI, '/api/clipfile?k=common-m.webp'); assert.equal(saved.imgSec, 9); assert.equal(saved.worlds.w2.M, '/api/clipfile?k=w2-m.mp4');
  // 2. 예전 관리자처럼 영상만 보내도 이미지·시간·주제는 보존
  await put({ on: true, M: '/api/clipfile?k=new-m.mp4', F: '' });
  assert.equal(saved.M, '/api/clipfile?k=new-m.mp4'); assert.equal(saved.MI, '/api/clipfile?k=common-m.webp'); assert.equal(saved.imgSec, 9); assert.equal(saved.worlds.w8.FI, '/api/clipfile?k=w8-f.webp');
  // 3. 잘못된 주소·시간 거르기
  const c = api.clean({ MI: 'javascript:alert(1)', imgSec: 99, worlds: { w3: { FI: 'data:image/png;base64,xx' } } });
  assert.equal(c.MI, ''); assert.equal(c.imgSec, 6); assert.equal(c.worlds.w3.FI, '');
  // 4. 뷰어: 안내자별 이미지 선택(주제 → 공통), 꺼지면 없음
  const src = fs.readFileSync('report/v2/viewer.js', 'utf8'), ctx = {};
  vm.runInNewContext(src.slice(src.indexOf('  function prologueUrl('), src.indexOf('  function hasProVideo(')), ctx);
  assert.equal(ctx.prologueImage(saved, 'w8', 'female'), '/api/clipfile?k=w8-f.webp');
  assert.equal(ctx.prologueImage(saved, 'w8', 'male'), saved.MI);
  assert.equal(ctx.prologueImage(saved, 'w2', 'female'), saved.FI);
  assert.equal(ctx.prologueImage({ ...saved, on: false }, 'w8', 'female'), '');
  assert.equal(ctx.prologueUrl(saved, 'w8', 'female'), '', '해독관 공통 영상이 없으면 영상 없음 → 이미지 프롤로그');
  assert(src.includes('stillImage: !S.proVid && S.proImg') && src.includes('posterUrl: S.proImg'), '영상 없으면 이미지, 있으면 포스터');
  assert(/function hasProVideo\(\) \{ return !PREVIEW && !!\(S\.proVid \|\| S\.proImg\); \}/.test(src));
  console.log('prologue-guide-image-sim PASS: w8·두 자리 주제, 이미지 슬롯·시간, 예전 저장 보존, 주소 검증, 안내자별 이미지 선택');
})().catch(e => { console.error(e); process.exit(1); });
// 결제 이후에만: 주제 프롤로그는 잠긴 장이 있으면 띄우지 않는다(뷰어 소스 검사)
{ const src = require('fs').readFileSync('report/v2/viewer.js', 'utf8'); const assert = require('assert');
  assert(/function worldPrologue\(wid, next\)[\s\S]{0,900}PW\.lockOf\(c\)[\s\S]{0,200}if \(locked\)/.test(src), '잠긴 주제는 프롤로그 보류');
  assert(src.includes("worldPrologue(S.wmap && S.wmap.idx[resumeIndex]") && src.includes('worldPrologue(g.world.id') && src.includes('worldPrologue(S.wmap.idx[ci]'), '주제 진입·결제 후 복귀·같은 화면 결제 완료 세 곳');
  assert(src.includes("if(R.ReadingText){if(LIFE)lifeBegin();else beginReader();return;}"), '첫 진입(startGate)에서는 주제 프롤로그를 띄우지 않음');
  console.log('prologue paid-gate checks PASS'); }
