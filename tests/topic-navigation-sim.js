const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync('report/v2/viewer.js', 'utf8');
const backCode = src.split('\n').find(s => s.includes("var hb = $('#hubBack')"));
for (const [hub, world] of [[true, 'w2'], [false, 'w3'], [true, '']]) {
  const link = {};
  vm.runInNewContext(backCode, { $: () => link, HUB: hub, WORLD: world, PREVIEW: false });
  assert.equal(link.href, '/report/#/timeline?z=themes');
  assert.equal(link.textContent, '‹ 운명의 타임라인');
}
const nav = { style: { setProperty() {} }, querySelector: () => null }, steps = {};
const app = { dataset: { view: 'reader' } }, props = {};
const ctx = {
  document: { getElementById: id => id === 'wsteps' ? steps : nav, documentElement: { style: { setProperty(k, v) { props[k] = v; }, removeProperty() {} } } },
  $: () => app, pinned: () => null, esc: s => s, barLabel() {}, TOOL_LABEL: {},
  S: { idx: 1, cur: true, readerWorld: 'w2', ended: {}, rep: { chapters: [{ title: 'Other' }, { title: 'First' }, { title: 'Middle' }, { title: 'Last' }] }, wmap: { idx: ['w1', 'w2', 'w2', 'w2'], by: { w2: [1, 2, 3] }, list: [{ id: 'w2' }] } }
};
vm.runInNewContext(src.slice(src.indexOf('  function renderStrip()'), src.indexOf('  /* 세계 무빙툰:')), ctx);
ctx.renderStrip();
assert(steps.innerHTML.includes('data-step="1" disabled'));
assert(steps.innerHTML.includes('data-step="2" title="Middle"'));
assert.equal(props['--bar-h'], '154px');
ctx.S.idx = 2; ctx.renderStrip();
assert(steps.innerHTML.includes('data-step="1" title="First"'));
assert(steps.innerHTML.includes('data-step="3" title="Last"'));
ctx.S.idx = 3; ctx.renderStrip();
assert(steps.innerHTML.includes('data-step="3" disabled'));
app.dataset.view = 'home'; ctx.S.xpWorld = 'w2'; ctx.renderStrip();
assert(steps.hidden);
assert(nav.innerHTML.includes('읽던 곳으로 돌아가기'));
assert.equal(props['--bar-h'], '62px');
console.log('Topic navigation: timeline return, scoped previous/next, boundaries, header spacing and resume passed');
