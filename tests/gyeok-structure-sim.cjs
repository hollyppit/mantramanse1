// 사주 격국 분석(gyeok-structure.js) 검증 — 오행·강약 탭 '사주 격국 분석' 카드
//   node tests/gyeok-structure-sim.cjs
// 1) 경계 사례 고정(취격·성립·복수 후보·판정 유보·안정성·특수격·오행 구조·십성 작용·예외)
// 2) 무작위 600명 불변식(대표 1개·주요 항목 0~3개·성립한 것만·특수격 우선·근거 존재·엔진 취격과 일치율)
// 3) 문안(존댓말·단정 표현 금지·undefined 없음) 4) 표시 전용(원국·용신·점수 불변, 모듈이 차트를 바꾸지 않음, 엔진 기준선)
// 5) 화면·관리자·스위치 연결. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm'), cp = require('child_process');
const root = path.join(__dirname, '..');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'gyeok-structure.js')); const GS = globalThis.MantraGyeokStructure;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const C = (y, m, d, h, mi, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: mi, gender: g || 'M', calendar: 'solar' });
const pil = ch => ['year', 'month', 'day', 'hour'].map(k => ch.pillars[k] ? M.STEM[ch.pillars[k].s] + M.BR[ch.pillars[k].b] : '--').join(' ');
const item = (a, k) => a.items.find(o => o.key === k);

// ── 1. 경계 사례 ──
const CASES = [
  // [이름, 입력, 기대 원국, 검사]
  ['화면 사주: 정기 투출(시간) 정관격 성립 — 년간-시간 壬丁합은 떨어져 있어 합거 아님', [1992, 6, 23, 1, 45], '壬申 丙午 庚午 丁丑', a => a.rep.type === 'jeong' && a.jeong.name === '정관격' && a.jeong.establish === 'firm' && !a.jeong.order.some(o => o.hapGeo) && a.engineGyeok.kind === '정관격'],
  ['정기 투출 + 통근 → 성립', [2000, 8, 13, 5, 30], '庚辰 甲申 癸卯 甲寅', a => a.jeong.name === '정인격' && a.jeong.establish === 'firm' && a.jeong.role === '정기'],
  ['투출 없음 → 월령 본기 취격, 약하게 성립', [1960, 8, 1, 8, 45], '庚子 癸未 辛酉 壬辰', a => a.jeong.method === '정기' && a.jeong.establish === 'weak' && a.jeong.name === '편인격'],
  ['투출 격신이 붙은 천간과 합거, 다른 후보 없음 → 판정 유보', [1967, 12, 8, 18, 15, 'F'], '丁未 壬子 丙午 丁酉', a => a.jeong.method === '투출(합거)' && a.jeong.establish === 'hold' && a.rep.type === 'hold' && a.jeong.stability.status === 'hold' && a.rep.name === '판정 유보'],
  ['합거된 글자가 있어도 다른 투출 후보로 취격', [1960, 9, 18, 13, 15], '庚子 乙酉 己酉 辛未', a => a.jeong.order.some(o => o.hapGeo) && a.jeong.method === '투출' && a.jeong.establish !== 'hold' && a.jeong.basis.some(t => /다음 후보로 넘깁니다/.test(t))],
  ['왕지(午)에서 여기만 투출 → 복수 후보(정기 기준과 충돌)', [1996, 7, 5, 6, 45, 'F'], '丙子 甲午 癸卯 乙卯', a => a.jeong.establish === 'multi' && a.jeong.name === '정재격' && a.jeong.candidates.some(c => c.role === '정기' && c.name === '편재격')],
  ['정기 미투출 + 중기·여기 동시 투출 → 복수 후보', [1979, 8, 12, 21, 0, 'F'], '己未 壬申 辛亥 戊戌', a => a.jeong.establish === 'multi' && a.jeong.reasons.some(r => /중기·여기가 함께/.test(r)) && a.jeong.candidates.length >= 1],
  ['월지가 삼합 국(申子辰 수국)을 이루고 그 오행 투출 → 복수 후보(국)', [1992, 4, 23, 1, 30], '壬申 甲辰 己巳 甲子', a => a.jeong.name === '월겁격' && a.jeong.establish === 'multi' && a.jeong.candidates.some(c => c.role === '국(局)' && c.name === '정재격') && a.jeong.use === '정재'],
  ['시간 모름 + 투출 없음 → 판정 유보', [1958, 12, 12, '', 30], '戊戌 甲子 癸亥 --', a => !a.hasHour && a.jeong.establish === 'hold' && a.rep.type === 'hold' && a.caveats.length > 0],
  ['투출 없음 + 월지 충 → 판정 유보', [1952, 9, 15, 7, 0, 'F'], '壬辰 己酉 甲子 丁卯', a => a.jeong.establish === 'hold' && a.jeong.reasons.some(r => /월지가 충/.test(r))],
  ['양인격인데 격용(재·관·식상) 천간에 없음 → 판정 유보', [1992, 4, 8, 2, 0, 'F'], '壬申 甲辰 甲寅 乙丑', a => a.jeong.name === '양인격' && a.jeong.use === null && a.jeong.establish === 'hold'],
  ['종격 성립 → 특수격 대표, 정격은 참고', [1997, 7, 2, 2, 30], '丁丑 丙午 乙巳 丁丑', a => a.rep.type === 'special' && a.rep.name === '종아격' && a.special.priority === 'special' && /특수격을 우선 적용/.test(a.rep.relation) && a.jeong.name === '식신격'],
  ['화격 성립(丙辛합수, 子월) → 특수격 대표', [1984, 12, 23, 6, 15], '甲子 丙子 辛卯 辛卯', a => a.rep.type === 'special' && a.special.top.key === 'hwa' && /丙辛합/.test(a.rep.name) && a.special.top.conds.every(c => c.ok)],
  ['전왕 1행격(종혁격, 巳酉丑 금국) 성립', [2013, 9, 22, 2, 30], '癸巳 辛酉 辛卯 己丑', a => a.rep.type === 'special' && a.rep.name === '종혁격' && a.special.top.key === 'jeon'],
  ['특수격 가능성(쟁합)만 → 정격 대표 + 유보 안내, 특수격 붙이지 않음', [1988, 6, 7, 13, 15, 'F'], '戊辰 戊午 癸巳 戊午', a => a.rep.type === 'jeong' && a.special.possible && a.special.possible.status === 'ga' && !a.special.top && a.special.checks.find(c => c.key === 'hwa').conds[5].ok === false && a.summary.body.some(t => /특수격으로 단정하지 않습니다/.test(t))],
  ['특수격 성립 시 억부 전제 항목(재다신약 등)은 주요 구조에서 제외', [1967, 6, 8, 11, 45], '丁未 丙午 癸卯 戊午', a => a.rep.type === 'special' && a.items.some(o => o.suppressed && !o.on) && !a.major.some(o => ['jaeda', 'gwanda', 'gungeop', 'mowang'].includes(o.key))],
  ['금수쌍청 성립', [1970, 8, 21, 7, 15, 'F'], '庚戌 甲申 癸酉 乙卯', a => item(a, 'geumsu').on && a.major.some(o => o.name === '금수쌍청')],
  ['예외: 한겨울 냉기면 금수쌍청 대신 금한수냉', [2012, 1, 12, 22, 0], '辛卯 辛丑 壬申 辛亥', a => !item(a, 'geumsu').on && item(a, 'geumsu').conds.every(c => c.ok) && item(a, 'hanraeng').on],
  ['예외: 子午충이면 수화기제 대신 수화상전', [1967, 12, 8, 18, 15, 'F'], '丁未 壬子 丙午 丁酉', a => !item(a, 'gije').on && item(a, 'gije').blocks[0].hit && item(a, 'sangjeon').on],
  ['상호 배타: 상관패인이 서면 상관견관 해소', [1981, 8, 25, 19, 45], '辛酉 丙申 乙亥 丙戌', a => item(a, 'paein').on && !item(a, 'gyeongwan').on && item(a, 'gyeongwan').conds.every(c => c.ok)],
  ['상호 배타: 식신제살이 서면 관살혼잡 해소, 안정성은 구응으로 유지', [1983, 1, 9, 13, 30], '壬戌 癸丑 丁酉 丙午', a => item(a, 'jesal').on && !item(a, 'honjap').on && a.jeong.stability.status === 'rescued'],
  ['안정(성격): 상신 있고 파격 요인 없음', [1980, 5, 19, 18, 15], '庚申 辛巳 壬辰 己酉', a => a.jeong.stability.status === 'seong' && a.jeong.stability.sang.some(s => s.on) && !a.jeong.stability.pa.some(p => p.on)],
  ['불안정(패격): 구응 없는 파격 요인', [2007, 11, 3, 9, 45], '丁亥 庚戌 辛丑 癸巳', a => a.jeong.stability.status === 'pa' && a.jeong.stability.pa.some(p => p.on && !(p.rescue && p.rescue.on))],
  ['성립한 주요 구조가 없으면 출력하지 않음', [1996, 7, 5, 6, 45, 'F'], '丙子 甲午 癸卯 乙卯', a => a.major.length === 0],
  ['목화통명 성립', [1963, 5, 12, 7, 0], '癸卯 丁巳 乙卯 己卯', a => item(a, 'mokhwa').on],
  ['화염토조(시간 모름이면 안정성 유보)', [1997, 7, 17, '', 45, 'F'], '丁丑 丁未 庚申 --', a => item(a, 'yeomjo').on && a.jeong.stability.status === 'hold' && a.jeong.stability.statusRaw !== 'hold'],
  ['모왕자쇠(토다금매)', [1988, 4, 5, 5, 45, 'F'], '戊辰 丙辰 庚寅 己卯', a => item(a, 'mowang').on && item(a, 'mowang').name === '토다금매'],
];
CASES.forEach(([name, inp, want, chk]) => {
  const ch = C(...inp), a = GS.analyze(M, ch);
  ok(pil(ch) === want, `${name}: 원국이 바뀜 ${pil(ch)} ≠ ${want}`);
  let pass = false; try { pass = !!chk(a); } catch (e) { pass = false; }
  ok(pass, `${name}: 판정이 기대와 다름 → 대표 ${a.rep.name} · 정격 ${a.jeong.name}(${a.jeong.establish}/${a.jeong.stability.status}) · 주요 ${a.major.map(o => o.name).join(',')}`);
});

// ── 2·3. 무작위 사주 불변식과 문안 ──
let seed = 1115, n = 0, agree = 0, special = 0, hold = 0, multi = 0, noMajor = 0;
const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
const honor = t => /(니다|세요)\.?(\(.*\))?\.?$/.test(String(t).trim());   // 끝에 (관인상생) 같은 괄호 이름이 붙어도 존댓말로 본다
for (let i = 0; i < 600; i++) {
  let ch; try { ch = M.compute({ year: 1935 + Math.floor(rnd() * 80), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 === 0 ? '' : Math.floor(rnd() * 24), minute: Math.floor(rnd() * 4) * 15, gender: i % 2 ? 'M' : 'F', calendar: 'solar' }); } catch (e) { continue; }
  n++;
  const before = JSON.stringify([ch.pillars, ch.weights.pct, ch.strength, ch.yong.roles, ch.unified && ch.unified.roles, ch.relations.length]);
  let a; try { a = GS.analyze(M, ch); } catch (e) { ok(false, `예외 ${pil(ch)}: ${e.message}`); continue; }
  ok(JSON.stringify([ch.pillars, ch.weights.pct, ch.strength, ch.yong.roles, ch.unified && ch.unified.roles, ch.relations.length]) === before, `모듈이 차트를 바꿈 ${pil(ch)}`);
  ok(GS.analyze(M, ch) === a, '같은 차트 결과가 캐시되지 않음');
  const tag = pil(ch);
  // 대표 1개 · 상태값
  ok(typeof a.rep.name === 'string' && a.rep.name.length > 0, `대표 이름 없음 ${tag}`);
  ok(['jeong', 'special', 'hold'].includes(a.rep.type), `대표 종류 오류 ${tag}`);
  ok(['firm', 'weak', 'multi', 'hold'].includes(a.jeong.establish), `성립 값 오류 ${tag}`);
  ok(['seong', 'rescued', 'plain', 'pa', 'hold'].includes(a.jeong.stability.status), `안정성 값 오류 ${tag}`);
  ok(a.jeong.establish !== 'multi' || a.jeong.candidates.length > 0, `복수 후보인데 후보 목록 없음 ${tag}`);
  ok(a.jeong.establish !== 'hold' || a.jeong.reasons.length > 0, `판정 유보인데 이유 없음 ${tag}`);
  ok(a.jeong.establish !== 'hold' || a.jeong.stability.status === 'hold', `성립 유보인데 안정성을 판정함 ${tag}`);
  ok(a.hasHour || a.jeong.stability.status === 'hold', `시간 모름인데 안정성을 판정함 ${tag}`);
  ok(a.hasHour || a.caveats.length > 0, `시간 모름 안내 없음 ${tag}`);
  // 특수격: 성립한 것만 대표, 가능성·유보는 대표가 되지 않음
  const jin = a.special.checks.filter(c => c.status === 'jin');
  ok((a.rep.type === 'special') === (jin.length > 0), `특수격 성립과 대표가 어긋남 ${tag}`);
  if (a.rep.type === 'special') { special++; ok(jin.some(c => c.name === a.rep.name), `대표 특수격이 성립 목록에 없음 ${tag}`); ok(a.rep.relation && a.rep.relation.includes(a.jeong.name), `특수격-정격 관계 설명 없음 ${tag}`); }
  if (!a.hasHour) ok(!a.special.checks.some(c => (c.key === 'hwa' || c.key === 'jeon') && (c.status === 'jin' || c.status === 'ga')), `시간 모름인데 화격·전왕격을 확정 ${tag}`);
  a.special.checks.forEach(c => ok(c.conds.length >= 4 && c.conds.every(x => x.label && x.detail != null), `특수격 근거 누락 ${c.name} ${tag}`));
  // 주요 구조: 성립한 것만, 0~3개, 점수 순
  ok(a.major.length <= 3, `주요 구조가 3개 초과 ${tag}`);
  ok(a.major.every(o => o.on), `불성립 항목이 주요 구조에 들어감 ${tag}`);
  ok(a.major.every((o, i) => i === 0 || a.major[i - 1].score >= o.score), `주요 구조가 점수 순이 아님 ${tag}`);
  ok(a.items.filter(o => o.on).length === 0 || a.major.length > 0, `성립 항목이 있는데 주요 구조가 비었음 ${tag}`);
  if (!a.major.length) noMajor++;
  // 상호 배타
  ok(!(item(a, 'gwanin').on && item(a, 'salin').on), `관인상생·살인상생 동시 성립 ${tag}`);
  ok(!(item(a, 'paein').on && item(a, 'gyeongwan').on), `상관패인·상관견관 동시 성립 ${tag}`);
  ok(!(item(a, 'jesal').on && item(a, 'honjap').on), `식신제살·관살혼잡 동시 성립 ${tag}`);
  ok(!(item(a, 'gije').on && item(a, 'sangjeon').on), `수화기제·수화상전 동시 성립 ${tag}`);
  ok(!(item(a, 'geumsu').on && item(a, 'hanraeng').on), `금수쌍청·금한수냉 동시 성립 ${tag}`);
  a.items.forEach(o => {
    ok(o.on === (o.conds.every(c => c.ok) && !(o.blocks || []).some(b => b.hit)) || o.suppressed, `성립 판정이 조건과 어긋남 ${o.name} ${tag}`);
    ok(o.why.length >= o.conds.length && o.score >= 0 && o.score <= 1, `항목 근거·점수 오류 ${o.name} ${tag}`);
  });
  // 문안
  const txt = [a.rep.easy, a.rep.txt.act, ...a.rep.txt.good, ...a.rep.txt.bad, ...a.summary.body, ...a.summary.good, ...a.summary.care, ...a.major.flatMap(o => [o.txt.easy, o.txt.act, ...o.txt.good, ...o.txt.bad]), a.rep.relation || '', a.disclaimer];
  txt.forEach(t => { ok(!GS.BANNED.test(t), `단정 표현: ${t.slice(0, 40)}`); ok(!/undefined|NaN|null|\[object/.test(t), `빈 값이 문장에 섞임: ${t.slice(0, 40)}`); });
  [...a.summary.body, ...a.summary.good, ...a.summary.care].forEach(t => ok(honor(t), `존댓말이 아님: ${t.slice(0, 40)}`));
  ok(a.summary.body.length >= 1 && a.summary.good.length >= 1 && a.summary.care.length >= 1, `종합 해석 칸이 비었음 ${tag}`);
  ok(!/이이|가이 |을를|은는/.test(a.summary.body.join(' ')), `조사 오류: ${a.summary.body.join(' ').slice(0, 60)}`);
  if (a.jeong.name === a.engineGyeok.kind) agree++;
  if (a.jeong.establish === 'hold') hold++; if (a.jeong.establish === 'multi') multi++;
}
ok(n >= 590, `무작위 사주 수 부족 ${n}`);
ok(agree / n >= 0.95, `엔진(gyeokCore) 취격과의 일치율이 낮음 ${agree}/${n}`);
ok(hold / n < 0.3, `판정 유보 비율이 너무 높음 ${hold}/${n}`);
ok(special / n < 0.05, `특수격 대표 비율이 너무 높음(억지로 붙임) ${special}/${n}`);

// 모든 고정 문안: 존댓말·금지 표현
Object.entries(GS.JEONG_TXT).forEach(([k, t]) => [t.easy, t.act, ...t.good, ...t.bad].forEach(s => { ok(honor(s), `정격 문안 존댓말 ${k}: ${s.slice(0, 30)}`); ok(!GS.BANNED.test(s), `정격 문안 단정 ${k}`); }));
Object.entries(GS.ITEM_TXT).forEach(([k, t]) => [t.act, ...t.good, ...t.bad].concat(t.easy ? [t.easy] : []).forEach(s => { ok(honor(s), `항목 문안 존댓말 ${k}: ${s.slice(0, 30)}`); ok(!GS.BANNED.test(s), `항목 문안 단정 ${k}`); }));
ok(/단정하지 않으며/.test(GS.analyze(M, C(1992, 6, 23, 1, 45)).disclaimer), '격국 단정 금지 고지 없음');

// ── 4. 표시 전용: 모듈 소스가 차트·엔진에 쓰지 않음, 엔진 기준선 일치 ──
const src = fs.readFileSync(path.join(root, 'gyeok-structure.js'), 'utf8');
ok(!/\bch\.[A-Za-z_]+(\.[A-Za-z_]+)*\s*=[^=]/.test(src) && !/\bM\.[A-Za-z_]+\s*=[^=]/.test(src), '모듈이 차트나 엔진 값에 대입함');
ok(!/gyeok-structure|MantraGyeokStructure/.test(eng), 'engine.js 가 격국 분석 모듈을 참조함(점수에 섞일 위험)');
let base = ''; try { base = cp.execFileSync(process.execPath, [path.join(__dirname, 'engine-baseline-sim.js')], { encoding: 'utf8' }); } catch (e) { base = String(e.stdout || '') + ' 실패'; }
ok(/엔진 기준선 일치/.test(base) && !/실패/.test(base), '엔진 기준선 불일치: ' + base.trim().slice(0, 120));

// ── 5. 화면·관리자·스위치 연결 ──
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(/<script src="gyeok-structure\.js"><\/script>/.test(html) && html.indexOf('src="engine.js"') < html.indexOf('src="gyeok-structure.js"'), 'index.html 이 engine.js 뒤에 gyeok-structure.js 를 불러오지 않음');
const ro = html.indexOf('function renderOhaeng()'), roEnd = html.indexOf('// ───────────── 용신', ro), ohSrc = html.slice(ro, roEnd);
ok(ohSrc.indexOf('분포') > 0 && ohSrc.indexOf('${renderGyeokAnalysis(ch)}') > ohSrc.indexOf('신강신약') && ohSrc.indexOf('${renderGyeokAnalysis(ch)}') < ohSrc.indexOf('${renderCompat(ch)}'), '격국 카드가 십성 분포·신강신약 바로 아래에 있지 않음');
const fn = html.slice(html.indexOf('const gxOn = '), html.indexOf('function renderOhaeng()'));
ok(/if \(!gxOn\(\)\) return '';/.test(fn), '스위치가 꺼지면 카드를 숨기지 않음');
ok(fn.indexOf('${hero}${rel}${major}${sum}') > 0 && fn.indexOf('${detail}') > fn.indexOf('${hero}${rel}${major}${sum}'), '화면 순서가 대표 → 주요 구조 → 종합 해석 → 상세 근거가 아님');
ok(/성립 근거/.test(fn) && /원국에서의 작용/.test(fn) && /유리한 조건/.test(fn) && /불리한 조건/.test(fn), '항목 펼침 네 칸이 없음');
ok(/r\.major\.length \?/.test(fn), '주요 구조가 없을 때 출력하지 않는 분기가 없음');
ok(/@media \(max-width: 600px\) \{ \.gx-body, \.gx-gc \{ grid-template-columns: 1fr; \}/.test(html), '모바일 1열 배치 CSS 없음');
ok(!/[|(]격국[|)]/.test((html.match(/const FOLD_EXPERT = [^\n]+/) || [''])[0]), '공통 접기 규칙이 새 카드를 처음부터 접음');
ok(/gyeokAnalysis: false/.test(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8')), '스위치 기본값이 꺼짐이 아님');
ok(/'gyeokAnalysis'/.test(fs.readFileSync(path.join(root, 'functions/api/luck-flags.js'), 'utf8')), '관리자 스위치 API 에 gyeokAnalysis 없음');
const adm = fs.readFileSync(path.join(root, 'report/admin/index.html'), 'utf8'), nav = require(path.join(root, 'report/admin/navigation.js'));
ok(adm.includes('data-t="gyeokcheck"') && adm.includes('id="t-gyeokcheck"') && adm.includes('src="/gyeok-structure.js"') && adm.includes('src="v2-gyeok.js"') && /V2Gyeok\.open/.test(adm), '관리자 화면 연결 누락');
ok(nav.groups.find(g => g[0] === 'qa')[2].includes('gyeokcheck') && nav.pages.gyeokcheck && nav.pages.gyeokcheck.label, '관리자 메뉴에 격국 판정 확인 없음');
ok(fs.existsSync(path.join(root, 'docs/GYEOK_ANALYSIS_DESIGN_2026-11-15.md')), '설계 문서 없음');

if (fails.length) { console.log(`gyeok-structure-sim 실패 ${fails.length}건`); fails.slice(0, 40).forEach(f => console.log(' - ' + f)); process.exit(1); }
console.log(`gyeok-structure-sim OK: 경계 사례 ${CASES.length}건 · 무작위 ${n}명(엔진 취격 일치 ${agree}명, 판정 유보 ${hold}·복수 후보 ${multi}·특수격 대표 ${special}·주요 구조 없음 ${noMajor}) · 문안·표시 전용·엔진 기준선·화면·관리자 연결`);
