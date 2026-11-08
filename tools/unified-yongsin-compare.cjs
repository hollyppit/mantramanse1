// 통합 용신 엔진 전후 비교:  node tools/unified-yongsin-compare.cjs [기준 커밋=HEAD] [차트 수=2000]
//  기준 커밋의 engine.js·compat-pair.js(옛 방식)와 작업 폴더의 것(새 방식)을 같은 사주로 돌려
//  용신 변화·판정 방식·운세 흐름(대운·세운·월운·일진)·궁합 점수 변화를 docs/UNIFIED_YONGSIN_2026-11-08.md 로 남긴다.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..'), ref = process.argv[2] || 'HEAD', N = +process.argv[3] || 2000;
const src = f => cp.execFileSync('git', ['show', `${ref}:${f}`], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
function load(get) { const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); for (const f of ['engine.js', 'compat-pair.js']) vm.runInContext(get(f), ctx, { filename: f }); return { M: ctx.Manse, P: ctx.PairCompat }; }
const OLD = load(src), NEW = load(f => fs.readFileSync(path.join(root, f), 'utf8'));
let seed = 4242; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const inputs = [];
while (inputs.length < N) { const inp = { year: 1935 + Math.floor(rnd() * 80), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: Math.floor(rnd() * 24), minute: Math.floor(rnd() * 60), gender: rnd() < 0.5 ? 'M' : 'F' }; try { OLD.M.compute(inp); inputs.push(inp); } catch (e) { } }
const EL = ['목', '화', '토', '금', '수'], pct = (a, b) => (b ? (100 * a / b).toFixed(1) : '0.0') + '%';
const S = { n: 0, yongChanged: 0, heeChanged: 0, byAdvice: {}, byMode: {}, byPrimary: {}, oldSchool: {}, examples: [], errors: 0 };
const L = { daeun: [0, 0, 0], seun: [0, 0, 0], wolun: [0, 0, 0], ilun: [0, 0, 0] };   // [|차이| 합, 상태 변화 수, 개수]
const cond = v => v >= 18 ? '순풍' : v > -12 ? '보통' : v > -35 ? '주의' : '부담';
const pairsOld = [], pairsNew = [];
const keep = [];
for (let i = 0; i < inputs.length; i++) {
  const inp = inputs[i]; let o, n;
  try { o = OLD.M.compute(inp); n = NEW.M.compute(inp); } catch (e) { S.errors++; continue; }
  S.n++;
  const adv = n.schoolAdvice, u = n.unified, yc = o.yong.yong !== n.yong.yong;
  if (yc) S.yongChanged++; if (o.yong.hee !== n.yong.hee) S.heeChanged++;
  const A = S.byAdvice[adv] = S.byAdvice[adv] || { n: 0, changed: 0, eokbu: 0, johu: 0, other: 0 }; A.n++; if (yc) A.changed++; if (u.primary === 'eokbu') A.eokbu++; else if (u.primary === 'johu') A.johu++; else A.other++;
  const B = S.byMode[u.mode] = S.byMode[u.mode] || { n: 0, changed: 0 }; B.n++; if (yc) B.changed++;
  S.byPrimary[u.primary] = (S.byPrimary[u.primary] || 0) + 1; S.oldSchool[o.school] = (S.oldSchool[o.school] || 0) + 1;
  if (yc && S.examples.length < 400) S.examples.push({ inp, adv, old: `${o.school === 'johu' ? '조후' : '억부'} ${EL[o.yong.yong]}`, now: u.headline, mode: u.mode, why: u.steps[0] });
  if (i < 150) {
    const add = (k, a, b) => { L[k][0] += Math.abs(a - b); if (cond(a) !== cond(b)) L[k][1]++; L[k][2]++; };
    o.daeun.list.forEach((x, j) => add('daeun', x.ev.fitScore, n.daeun.list[j].ev.fitScore));
    const so = OLD.M.seunRange(o, 2024, 2030), sn = NEW.M.seunRange(n, 2024, 2030); so.forEach((x, j) => add('seun', x.ev.fitScore, sn[j].ev.fitScore));
    const wo = OLD.M.wolun(o, 2026), wn = NEW.M.wolun(n, 2026); wo.forEach((x, j) => add('wolun', x.ev.fitScore, wn[j].ev.fitScore));
    const io = OLD.M.ilun(o, 2026, 11), inn = NEW.M.ilun(n, 2026, 11); io.forEach((x, j) => add('ilun', x.ev.fitScore, inn[j].ev.fitScore));
  }
  if (keep.length < 120) keep.push([o, n]);
}
// 궁합
const cpDiff = { n: 0, abs: 0, big: 0, gradeChanged: 0, partYong: 0 };
for (let k = 0; k < 600; k++) {
  const i = k % keep.length, j = (k * 37 + 11) % keep.length; if (i === j) continue;
  const ro = OLD.P.evaluate(OLD.M, keep[i][0], keep[j][0], 'lover'), rn = NEW.P.evaluate(NEW.M, keep[i][1], keep[j][1], 'lover');
  cpDiff.n++; cpDiff.abs += Math.abs(ro.score - rn.score); if (Math.abs(ro.score - rn.score) >= 10) cpDiff.big++; if (ro.grade.name !== rn.grade.name) cpDiff.gradeChanged++;
  cpDiff.partYong += Math.abs(ro.parts[0].score - rn.parts[0].score);
  pairsOld.push(ro.score); pairsNew.push(rn.score);
}
const q = (a, p) => { a = [...a].sort((x, y) => x - y); return a[Math.floor(p * (a.length - 1))]; };
// 대표 사례: 판정 방식별로 고루
const pick = []; for (const m of ['conflict', 'bridge', 'agree', 'single', 'jong']) pick.push(...S.examples.filter(e => e.mode === m).slice(0, m === 'conflict' ? 4 : 2));
const md = [];
md.push('# 통합 용신 판단 엔진 — 전후 비교 (2026-11-08)', '');
md.push(`기준: \`${ref}\`의 engine.js·compat-pair.js(옛 방식) ↔ 작업 폴더(새 방식). 같은 무작위 사주 ${S.n}개(1935~2014년생, 자동 용신 기준)를 두 엔진에 넣었습니다. 생성: \`node tools/unified-yongsin-compare.cjs\`.`, '');
md.push('## 무엇이 바뀌었나', '');
md.push('- **옛 방식**: methodAdvice 판정이 조후·병행이면 조후용신, 그 밖에는 억부용신. 격국·통관·병약·종격은 화면에 보여 주기만 했습니다.');
md.push('- **새 방식**: 억부·조후·격국·통관·제화 각각의 근거와 필요도(해당 없음·참고·필요·급함)를 따로 매기고, 규칙 순서로 주 기준·보조 기준을 정합니다(점수 평균 없음). 종격이 충족되면 세력을 따르는 배치를 씁니다. 주 기준이 아닌 기준이 원하는 오행은 기신·구신이어도 조건부로 세기를 줄이고 이유를 남깁니다.');
md.push('- 운세 흐름(대운·세운·월운·일진)과 궁합(나와 맞는 오행·일주, 두 사람 궁합)이 같은 통합 판단(역할값)을 씁니다. 월운은 세운을, 일진은 월운을 상위 운으로 이어받고, 상위 운 기둥과 이번 운 기둥의 합·충을 따로 봅니다.', '');
md.push('## 용신 변화', '');
md.push(`| 항목 | 값 |`, `|---|---|`, `| 사주 수 | ${S.n} |`, `| 용신이 바뀐 사주 | ${S.yongChanged} (${pct(S.yongChanged, S.n)}) |`, `| 희신이 바뀐 사주 | ${S.heeChanged} (${pct(S.heeChanged, S.n)}) |`, `| 계산 오류 | ${S.errors} |`, '');
md.push('### methodAdvice 판정별', '', '| 판정 | 사주 수 | 용신 바뀜 | 새 주 기준: 억부 | 조후 | 격국·통관·종격 |', '|---|---|---|---|---|---|');
for (const [k, v] of Object.entries(S.byAdvice)) md.push(`| ${k} | ${v.n} | ${v.changed} (${pct(v.changed, v.n)}) | ${v.eokbu} | ${v.johu} | ${v.other} |`);
md.push('', '병행 사주를 모두 조후로 보내던 규칙이 없어져, 병행 사주 중 강약이 더 급한 사주는 억부가 주 기준이 됩니다.', '');
md.push('### 새 판정 방식별', '', '| 방식 | 뜻 | 사주 수 | 용신 바뀜 |', '|---|---|---|---|');
const MODE = { single: '조후 해당 없음 — 억부(중화면 격국·통관)', agree: '조후·억부 같은 방향', conflict: '조후·억부 충돌 — 더 급한 쪽', bridge: '충돌 — 두 기준 모두 만족하는 겸용 오행', jong: '종격 충족 — 세력을 따름' };
for (const [k, v] of Object.entries(S.byMode)) md.push(`| ${k} | ${MODE[k] || k} | ${v.n} | ${v.changed} (${pct(v.changed, v.n)}) |`);
md.push('', `주 기준 분포: ${Object.entries(S.byPrimary).map(([k, v]) => `${k} ${v} (${pct(v, S.n)})`).join(' · ')}. 옛 방식: ${Object.entries(S.oldSchool).map(([k, v]) => `${k} ${v}`).join(' · ')}.`, '');
md.push('### 대표 사례(용신이 바뀐 사주)', '', '| 생년월일시 | 판정 | 옛 용신 | 새 판정 | 첫 근거 |', '|---|---|---|---|---|');
for (const e of pick) md.push(`| ${e.inp.year}-${e.inp.month}-${e.inp.day} ${e.inp.hour}시 ${e.inp.gender} | ${e.adv} | ${e.old} | ${e.now} | ${e.why} |`);
md.push('', '## 운세 흐름 변화 (사주 150개)', '', '| 단위 | 비교 개수 | 흐름 점수 평균 차이 | 상태(순풍·보통·주의·부담)가 바뀐 비율 |', '|---|---|---|---|');
for (const [k, v] of Object.entries(L)) md.push(`| ${{ daeun: '대운', seun: '세운 2024~2030', wolun: '월운 2026', ilun: '일진 2026-11' }[k]} | ${v[2]} | ${(v[0] / Math.max(1, v[2])).toFixed(1)} | ${pct(v[1], v[2])} |`);
md.push('', '일진은 이제 월운(→세운→대운)을 25% 이어받으므로 다른 단위보다 많이 바뀝니다. 세운·월운은 상위 운과의 합·충(최대 ±12)이 더해집니다.', '');
md.push('## 두 사람 궁합 변화 (600쌍, 연인·부부)', '');
md.push(`| 항목 | 값 |`, `|---|---|`, `| 총점 평균 차이 | ${(cpDiff.abs / cpDiff.n).toFixed(1)} |`, `| 10점 이상 바뀐 쌍 | ${cpDiff.big} (${pct(cpDiff.big, cpDiff.n)}) |`, `| 등급이 바뀐 쌍 | ${cpDiff.gradeChanged} (${pct(cpDiff.gradeChanged, cpDiff.n)}) |`, `| 오행·조후 보완 항목 평균 차이 | ${(cpDiff.partYong / cpDiff.n).toFixed(1)} |`);
md.push(`| 총점 분포(10·25·50·75·90%) 옛 | ${[0.1, 0.25, 0.5, 0.75, 0.9].map(p => q(pairsOld, p)).join(' · ')} |`, `| 총점 분포 새 | ${[0.1, 0.25, 0.5, 0.75, 0.9].map(p => q(pairsNew, p)).join(' · ')} |`, '');
md.push('오행 보완은 상대의 여덟 글자(지장간 포함)를 통합 역할값으로 보고, 조후 보완(상대 기후가 내 치우침을 풀어 주는지)과 상대 일간(뿌리·조습·일간끼리의 합)을 함께 봅니다. 상대 일간이 기신이라는 이유 하나로 점수가 바닥이 되지 않습니다. 강약 균형 항목에는 두 사람의 기후 치우침(덥다·춥다, 건조·습함)이 서로 맞춰 주는지가 더해졌습니다. 전체 점수 분포는 옛 분포에 맞춰 두었습니다.', '');
md.push('## 검증', '', '- `node tests/unified-yongsin-sim.cjs` — 4,000개 사주: 격국·종격 판정이 화면용 모듈과 일치, 역할 배치, 판정 규칙 독립 재계산, 조건부 역할, 직접 고른 학파, 운 연계, 궁합, 문장(조사·금지어).', '- 기존 테스트 전체를 변경 전후로 돌려 새로 실패한 테스트가 없는지 확인했습니다(기존 실패 38개는 변경 전부터 실패).', '');
fs.writeFileSync(path.join(root, 'docs', 'UNIFIED_YONGSIN_2026-11-08.md'), md.join('\n'));
console.log(md.slice(0, 40).join('\n'));
