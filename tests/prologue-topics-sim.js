const assert = require('assert'), fs = require('fs'), vm = require('vm'), { pathToFileURL } = require('url'), path = require('path');
(async () => {
  const api = await import(pathToFileURL(path.resolve('functions/api/prologue.js')).href);
  let saved = { on: true, M: '/api/clipfile?k=common.mp4', F: '/api/clipfile?k=common-f.mp4', worlds: {} };
  for (let i = 1; i <= 6; i++) saved.worlds['w' + i] = { M: '/api/clipfile?k=w' + i + '.mp4', F: '' };
  const env = { ADMIN_PASSWORD: 'test-only', GLOSSARY_KV: { get: async () => saved, put: async (k, v) => { saved = JSON.parse(v); } } };
  const put = body => api.onRequestPut({ env, request: new Request('https://test/api/prologue', { method: 'PUT', headers: { authorization: 'Bearer test-only' }, body: JSON.stringify(body) }) });
  assert.equal((await put(saved)).status, 200);
  assert.equal(Object.keys(saved.worlds).length, 6);
  const source = fs.readFileSync('report/v2/viewer.js', 'utf8'), ctx = {};
  vm.runInNewContext(source.slice(source.indexOf('  function prologueUrl('), source.indexOf('  function hasProVideo(')), ctx);
  for (let i = 1; i <= 6; i++) {
    assert.equal(ctx.prologueUrl(saved, 'w' + i, 'male'), '/api/clipfile?k=w' + i + '.mp4');
    assert.equal(ctx.prologueUrl(saved, 'w' + i, 'female'), saved.F);
  }
  assert.equal(ctx.prologueUrl(saved, '', 'male'), saved.M);
  assert.equal(ctx.prologueUrl({ ...saved, on: false }, 'w2', 'male'), '');
  assert.equal(ctx.prologueUrl({}, 'w2', 'male'), '');
  assert(source.includes('prologueUrl(a[5], WORLD, selectedGuide())'));
  const guideCtx = { S: {}, localStorage: { getItem: () => JSON.stringify('female') } };
  vm.runInNewContext(source.slice(source.indexOf('  function selectedGuide('), source.indexOf('  function prologueUrl(')), guideCtx);
  assert.equal(guideCtx.selectedGuide(), 'female');
  guideCtx.S.guide = 'male'; assert.equal(guideCtx.selectedGuide(), 'male');
  guideCtx.S.guide = null; guideCtx.localStorage.getItem = () => null;
  assert.equal(guideCtx.selectedGuide(), 'male');
  await put({ on: true, M: '/api/clipfile?k=updated.mp4', F: '' });
  assert.equal(saved.worlds.w2.M, '/api/clipfile?k=w2.mp4', 'old admin saves preserve topic videos');
  const clean = api.clean({ worlds: { w2: { M: 'javascript:alert(1)', F: '/api/clipfile?k=ok.webm' }, invalid: { M: 'https://example.com/x.mp4' } } });
  assert.equal(clean.worlds.w2.M, ''); assert.equal(clean.worlds.w2.F, '/api/clipfile?k=ok.webm'); assert(!clean.worlds.invalid);
  const denied = await api.onRequestPut({ env, request: new Request('https://test/api/prologue', { method: 'PUT', body: '{}' }) });
  assert.equal(denied.status, 401);
  const response = await api.onRequestGet({ env, request: new Request('https://test/api/prologue') });
  assert.equal((await response.json()).worlds.w6.M, '/api/clipfile?k=w6.mp4');
  console.log('Prologue topics: six worlds, guide fallback, legacy preservation, validation and admin authorization passed');
})().catch(e => { console.error(e); process.exit(1); });
