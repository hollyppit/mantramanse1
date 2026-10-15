// Hub topic links must select a world and render only that world's chapters.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('report/v2/viewer.js', 'utf8');
const declaration = name => source.split('\n').find(line => line.includes('var ' + name + ' ='));
for (const world of ['w1', 'w2', 'w3', 'w4', 'w5', 'w6']) {
  const context = { location: { search: '?from=hub&world=' + world }, PREVIEW: false, R: { Explore: {} }, MAPQ: false, projectId: () => 'full' };
  vm.runInNewContext(declaration('WORLD') + '\n' + declaration('EXPLORE'), context);
  assert.equal(context.WORLD, world);
  assert.equal(context.EXPLORE, true);
}
for (const [search, preview, expected] of [['', false, false], ['?explore=1', false, true], ['?world=w2&preview=1', true, false]]) {
  const context = { location: { search }, PREVIEW: preview, R: { Explore: {} }, MAPQ: false, projectId: () => 'full' };
  vm.runInNewContext(declaration('WORLD') + '\n' + declaration('EXPLORE'), context);
  assert.equal(context.EXPLORE, expected);
}
const chapters = Array.from({ length: 6 }, (_, i) => ({ id: 'topic' + i, title: 'Topic ' + i, scenes: [{ text: 'Unique content ' + i }] }));
const chapter = { innerHTML: '' };
const context = {
  S: { rep: { chapters }, wmap: { idx: chapters.map((_, i) => 'w' + (i + 1)) } },
  $: () => chapter, planPanels() {}, sceneHtml: (c, s) => s.text,
  secWrap: html => html, esc: s => s, chapterTags() {}, linkBasisReferences() {}, emphasize() {}, moDetail() {}
};
const buildDoc = source.slice(source.indexOf('  function buildDoc()'), source.indexOf('  function openDoc('));
vm.runInNewContext(buildDoc, context);
for (let i = 0; i < 6; i++) {
  context.S.readerWorld = 'w' + (i + 1);
  context.buildDoc();
  assert(chapter.innerHTML.includes('Unique content ' + i));
  assert.equal((chapter.innerHTML.match(/<article/g) || []).length, 1);
  assert(chapter.innerHTML.includes('data-ch="' + i + '"'));
}
context.S.readerWorld = null;
context.buildDoc();
assert.equal((chapter.innerHTML.match(/<article/g) || []).length, 6);
// The 15-section summary folds past-life content into relationships; world mode
// must retain the original chapters so the past-life world stays independent.
assert(source.includes('!PREVIEW && !EXPLORE && R.ReadingFlow'));
console.log('World entry: six topic links, scoped content, original indices, full report and preview passed');
