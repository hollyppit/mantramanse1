// M3·M4 추적: 감사에서 '제화가 불성립 구조를 근거로 씀'(106)·'이중 감점'(6)으로 잡힌 명식이 수정 후 어떻게 바뀌었는지 하나씩 본다.
//   사용: node tools/myeongri-fix-20261125/trace-m3m4.cjs → docs/myeongri-audit-2026-11-25/data-fix1/trace-m3m4.json
const fs = require('fs'), path = require('path'), vm = require('vm');
const OPS = path.join(__dirname, '..', '..'), DEV = path.resolve(OPS, '..', 'manse-dev-myeongri-fix-1');
const load = root => { const c = { console }; c.window = c; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), c); return c.Manse; };
const A = load(OPS), B = load(DEV);
const audit = JSON.parse(fs.readFileSync(path.join(OPS, 'docs', 'myeongri-audit-2026-11-25', 'data', 'checks300.json'), 'utf8')).checks;
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
const pat = t => t.applicable ? t.why.split(' 구조(')[0] : null;
const rows = [];
dev.forEach((inp, i) => {
  const a = A.compute(inp), b = B.compute(inp), ja = a.unified.theories.jehwa, jb = b.unified.theories.jehwa;
  const pa = pat(ja), pb = pat(jb), stA = pa ? (b.patterns.named.find(p => p.name === pa) || {}).status : null;
  rows.push({ idx: i, before: pa, beforeStatus: stA, after: pb, afterStatus: pb ? (b.patterns.named.find(p => p.name === pb) || {}).status : null, auditNameOnly: audit[i].flags.jehwaOnNameOnly, auditDouble: audit[i].flags.jehwaDoublePenalty, dedup: (b.unified.dedup || []).map(d => d.pattern) });
});
const f106 = rows.filter(r => r.auditNameOnly), ok = rows.filter(r => r.before && r.beforeStatus === '성립');
const out = {
  runAt: new Date().toISOString(),
  m3: {
    auditFlagged: f106.length,
    afterNoJehwa: f106.filter(r => !r.after).length,
    afterSwitchedToEstablished: f106.filter(r => r.after && r.after !== r.before).length,
    afterSamePatternStillCandidate: f106.filter(r => r.after === r.before).length,   // 0 이어야 함(후보를 근거로 쓰지 않음)
    afterUsesCandidateAnywhere: rows.filter(r => r.after && r.afterStatus !== '성립').length,
    normalKept: { beforeEstablished: ok.length, afterSame: ok.filter(r => r.after === r.before).length, lost: ok.filter(r => r.after !== r.before).map(r => r.idx) },
    switched: f106.filter(r => r.after && r.after !== r.before).map(r => ({ idx: r.idx, from: r.before, to: r.after })),
  },
  m4: {
    auditFlagged: rows.filter(r => r.auditDouble).map(r => r.idx),
    dedupAfter: rows.filter(r => r.dedup.length).map(r => r.idx),
    auditFlaggedDetail: rows.filter(r => r.auditDouble).map(r => ({ idx: r.idx, jehwaBefore: r.before, jehwaAfter: r.after, afterStatus: r.afterStatus, dedup: r.dedup })),
  },
};
fs.writeFileSync(path.join(OPS, 'docs', 'myeongri-audit-2026-11-25', 'data-fix1', 'trace-m3m4.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(Object.assign({}, out, { m3: Object.assign({}, out.m3, { switched: out.m3.switched.length }) }), null, 1));
