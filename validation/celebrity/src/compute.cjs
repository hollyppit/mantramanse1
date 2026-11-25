// 2단계(블라인드 계산): data/persons.json 의 출생 정보만으로 엔진 값을 계산한다. 사건 파일은 열지 않는다(아래 가드).
//   · 실제 명식: 연도별 흐름 점수·등급·변동성·분야 지표·세운 십성·주요 오행·합충·용신 역할(엔진 값 그대로)
//   · 무작위 기준(가짜 명식) N개: 같은 출생 연도 안에서 월·일(시간을 아는 사람은 시도)을 무작위로 바꾼다(시드 = 사람 id)
//   · 결과: out/computed/<id>.json · out/null/<id>.json · out/computed/_manifest.json(엔진 해시·입력 해시)
//   · 사용: node validation/celebrity/src/compute.cjs [가짜 명식 수=200]
const fs = require('fs'), path = require('path'), crypto = require('crypto');
// ── 블라인드 가드: 이 단계에서 사건 데이터를 읽으면 즉시 멈춘다
const _read = fs.readFileSync;
fs.readFileSync = function (p, ...a) { const s = String(p); if (/events\.json|[\\/]raw[\\/]/.test(s)) throw new Error('블라인드 위반: 계산 단계에서 사건 데이터를 읽으려 함 — ' + s); return _read.call(fs, p, ...a); };
const A = require('./adapter.cjs');
const BASE = process.env.CV_BASE || path.join(__dirname, '..'), N = +process.argv[2] || 200;
const persons = JSON.parse(fs.readFileSync(path.join(BASE, 'data', 'persons.json'), 'utf8')).filter(p => !p.excluded);
const OUT = path.join(BASE, 'out'); ['computed', 'null'].forEach(d => fs.mkdirSync(path.join(OUT, d), { recursive: true }));
const E = A.engine();
const seedOf = id => crypto.createHash('sha256').update(id).digest().readUInt32LE(0);
const rng = s => () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const slim = s => { const y = {}; Object.keys(s.years).forEach(k => { const r = s.years[k]; y[k] = { f: r.flow, v: r.vol, d: r.dom }; }); return y; };
const t0 = Date.now();
for (const p of persons) {
  const real = A.series(E, p, { detail: true });
  fs.writeFileSync(path.join(OUT, 'computed', p.id + '.json'), JSON.stringify(Object.assign({ id: p.id, birthTimeConfidence: p.birth_time_confidence }, real)));
  const R = rng(seedOf(p.id)), base = A.toInput(p), nulls = [];
  for (let i = 0; i < N; i++) {
    const m = 1 + Math.floor(R() * 12), d = 1 + Math.floor(R() * dim(base.year, m));
    const over = { month: m, day: d }; if (base.hour != null) { over.hour = Math.floor(R() * 24); over.minute = Math.floor(R() * 60); }
    try { nulls.push(slim(A.series(E, p, { input: Object.assign({}, base, over) }))); } catch (e) { nulls.push(null); }
  }
  fs.writeFileSync(path.join(OUT, 'null', p.id + '.json'), JSON.stringify(nulls));
  process.stdout.write('.');
}
const h = f => crypto.createHash('sha256').update(_read(f)).digest('hex').slice(0, 16);
fs.writeFileSync(path.join(OUT, 'computed', '_manifest.json'), JSON.stringify({ computedAt: new Date().toISOString(), engineHash: A.engineHash(), personsHash: h(path.join(BASE, 'data', 'persons.json')), nullCount: N, persons: persons.length, note: '사건 데이터를 읽지 않고 계산함(가드)' }, null, 1));
console.log(`\n계산 ${persons.length}명 · 가짜 명식 ${N}개씩 · ${Math.round((Date.now() - t0) / 1000)}초`);
