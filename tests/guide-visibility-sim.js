const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('report/guide-control.js', 'utf8'), ctx = {};
vm.runInNewContext(source.slice(source.indexOf('  function canShow('), source.indexOf('  function updateVisibility(')), ctx);
for (const guide of [null, 'male', 'female']) {
  assert.equal(ctx.canShow(guide, 'welcome', null, false), false);
  assert.equal(ctx.canShow(guide, '', null, false), false);
  for (const step of [null, 'seal', 'guide']) assert.equal(ctx.canShow(guide, 'begin', step, false), false);
}
for (const guide of ['male', 'female']) {
  assert(ctx.canShow(guide, 'begin', 'name', false));
  assert(ctx.canShow(guide, 'timeline', null, false));
  assert(ctx.canShow(guide, '', null, true));
}
assert.equal(ctx.canShow(null, 'begin', 'name', false), false);
assert.equal(ctx.canShow(null, '', null, true), false);
console.log('Guide visibility: landing, welcome, selection, post-selection, return visits and viewer passed');
