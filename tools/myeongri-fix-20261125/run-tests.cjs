// 저장소의 시뮬레이션 테스트(tests/*-sim.{cjs,js,mjs})를 한 폴더 기준으로 모두 돌려 종료 코드를 기록한다(브라우저·외부 연결 테스트 제외).
//   사용: node tools/myeongri-fix-20261125/run-tests.cjs <저장소 폴더> <출력 json>
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');
const ROOT = path.resolve(process.argv[2]), OUTF = path.resolve(process.argv[3]);
const files = fs.readdirSync(path.join(ROOT, 'tests')).filter(f => /-sim\.(cjs|js|mjs)$/.test(f) && !/browser|live|e2e/.test(f)).sort();
const res = [], t0 = Date.now();
for (const f of files) {
  const t = Date.now(), r = spawnSync(process.execPath, [path.join(ROOT, 'tests', f)], { cwd: ROOT, encoding: 'utf8', timeout: 180000, maxBuffer: 64 * 1024 * 1024 });
  const tail = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').slice(-3).join(' | ').slice(0, 400);
  res.push({ test: f, code: r.status, signal: r.signal || null, ms: Date.now() - t, tail });
}
fs.mkdirSync(path.dirname(OUTF), { recursive: true });
fs.writeFileSync(OUTF, JSON.stringify({ runAt: new Date().toISOString(), root: ROOT, n: res.length, pass: res.filter(x => x.code === 0).length, sec: Math.round((Date.now() - t0) / 1000), results: res }, null, 1));
console.log(res.length, 'tests', res.filter(x => x.code === 0).length, 'pass');
