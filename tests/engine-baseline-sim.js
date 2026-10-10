// 엔진 계산 결과가 기준선(tests/engine-baseline.txt)과 같은지 확인한다. 리뉴얼 중 engine.js 가 바뀌면 여기서 걸린다.
//   node tests/engine-baseline-sim.js            → 비교 (다르면 종료 코드 1)
//   node tests/engine-baseline-sim.js --update   → 기준선 갱신(계산 규칙을 일부러 바꾼 뒤에만)
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = path.join(__dirname, '..'), base = path.join(__dirname, 'engine-baseline.txt');
const run = () => cp.execFileSync(process.execPath, [path.join(__dirname, 'regression-snapshot.js'), path.join(root, 'engine.js'), '120'], { encoding: 'utf8' });
const cur = run();
if (process.argv.includes('--update')) { fs.writeFileSync(base, cur); console.log('기준선 갱신'); process.exit(0); }
const old = fs.readFileSync(base, 'utf8');
if (cur === old) { console.log('엔진 기준선 일치(120개 차트)'); process.exit(0); }
const o = old.split('\n'), c = cur.split('\n');
console.log('엔진 계산 결과가 기준선과 다릅니다:');
c.forEach((l, i) => { if (l !== o[i]) console.log('  기준 ' + (o[i] || '').trim() + '\n  현재 ' + l.trim()); });
process.exit(1);
