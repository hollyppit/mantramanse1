// 영향 측정(가정 계산, 운영 엔진 변경 없음): 제화 판정이 '이름만 일치한 구조'를 쓰지 않으면 통합 용신 결과가 얼마나 바뀌는가
//   방법: 같은 명식을 계산한 뒤 ch.patterns.list 에서 성립 조건(B안 patEstablished)을 못 넘은 구조를 뺀 사본으로 M.integrateYongsin 을 다시 부른다
//   사용: node tools/myeongri-audit-20261125/impact.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..', '..');
const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); vm.runInContext(fs.readFileSync(path.join(ROOT, 'engine.js'), 'utf8'), ctx);
const M = ctx.Manse, mod = (a, n) => ((a % n) + n) % n, stemEl = s => Math.floor(s / 2);
const dev = [...Array(300)].map((_, i) => ({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }));
function patEstablished(ch, name) {   // engine.js 1025~1032 사본
  const G = ch.weights.groups, help = ch.strength.help, dEl = stemEl(ch.pillars.day.s), tp = ch.weights.tgPct, rv = i => ch.unified.roleV[mod(dEl + i, 5)];
  if (name === '관살혼잡') return (tp['정관'] || 0) >= 5 && (tp['편관'] || 0) >= 5 && !((tp['식신'] || 0) >= 8) && !(help < 50 && G[4] >= 15);
  if (name === '상관견관') return rv(3) > 0 && (tp['정인'] || 0) < 8 && (tp['상관'] || 0) >= 5 && (tp['정관'] || 0) >= 5;
  if (name === '효신탈식(도식)') return rv(1) > 0 && G[2] < 10 && (tp['편인'] || 0) >= 8;
  if (name === '군겁쟁재') return G[3] < 10 && G[1] < 10;
  return true;
}
let changedRoleV = 0, changedYong = 0, changedRoles = 0, maxDelta = 0; const ex = [];
dev.forEach((inp, i) => {
  const ch = M.compute(inp), u0 = ch.unified;
  const keep = ch.patterns.list.filter(p => patEstablished(ch, p.name));
  if (keep.length === ch.patterns.list.length) return;
  const saved = ch.patterns; ch.patterns = { list: keep, tuchul: saved.tuchul };
  const u1 = M.integrateYongsin(ch); ch.patterns = saved;
  const d = u0.roleV.map((v, e) => Math.abs(v - u1.roleV[e])), md = Math.max(...d);
  if (md > 1e-9) { changedRoleV++; maxDelta = Math.max(maxDelta, md); }
  if (u0.yong !== u1.yong) changedYong++;
  if ([0, 1, 2, 3, 4].some(e => u0.roles[e] !== u1.roles[e])) changedRoles++;
  if (md > 1e-9 && ex.length < 8) ex.push({ idx: i, removed: ch.patterns.list.filter(p => !keep.includes(p)).map(p => p.name), roleV0: u0.roleV, roleV1: u1.roleV });
});
const out = { runAt: new Date().toISOString(), n: 300, changedRoleV, changedRoles, changedYong, maxRoleVDelta: maxDelta, examples: ex };
fs.writeFileSync(path.join(ROOT, 'docs', 'myeongri-audit-2026-11-25', 'data', 'impact-jehwa.json'), JSON.stringify(out, null, 1));
console.log(JSON.stringify(out, null, 1));
