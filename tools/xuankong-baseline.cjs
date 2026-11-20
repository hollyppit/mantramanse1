// 현공비성 회귀 기준선 만들기/비교: node tools/xuankong-baseline.cjs [--write]
// 28수 등 새 기능을 붙이기 전의 xuankong() 결과를 고정해 두고, 이후 같은 입력에서 결과가 한 글자도 바뀌지 않았는지 비교한다.
const fs = require('fs'), path = require('path'), vm = require('vm'), crypto = require('crypto');
const root = path.join(__dirname, '..');
for (const f of ['fengshui-data.js', 'fengshui-engine.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const F = globalThis.MantraFengshui;
const CASES = [];
const years = [[1990, null], [2003, null], [2004, null], [2010, null], [2023, null], [2024, null], [1995, 2021], [2010, 2025], [null, null]];
const degs = []; for (let d = 0; d < 360; d++) degs.push(d); degs.push(359.9, 360, 7.4, 7.5, 7.6, 352.5, 352.4, 22.5, 37.5, 172.5, 187.5);
for (const [b, r] of years) for (const d of degs) CASES.push({ facingDeg: d, builtYear: b, renovationYear: r, evalYear: 2026 });
const rows = CASES.map(o => { const x = F.xuankong(o); return [o.facingDeg, o.builtYear, o.renovationYear, x.period, x.facing.mt.hj, x.sitting.mt.hj, x.pattern.id, x.patternNow.id, x.boards.shan.join(''), x.boards.xiang.join(''), x.fuyin ? 1 : 0, x.warnings.length].join('|'); });
const full = crypto.createHash('sha256').update(JSON.stringify(CASES.map(o => F.xuankong(o)))).digest('hex');
const out = { note: '2026-11-21 28수 추가 전 xuankong() 기준선. 엔진 ' + F.VERSION, engine: F.VERSION, cases: CASES.length, fullSha256: full, rows };
const file = path.join(root, 'tests', 'fixtures', 'xuankong-baseline-20261121.json');
if (process.argv.includes('--write')) { fs.writeFileSync(file, JSON.stringify(out)); console.log('기준선 저장', CASES.length, '건', full.slice(0, 12)); }
else { const base = JSON.parse(fs.readFileSync(file, 'utf8')); const diff = base.rows.filter((r, i) => r !== rows[i]); console.log(diff.length || base.fullSha256 !== full ? '불일치 ' + diff.length + '건' : '기준선과 같음 ' + rows.length + '건'); if (diff.length || base.fullSha256 !== full) process.exit(1); }
