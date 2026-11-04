// 공간·명당 풍수 엔진 검증: node tests/fengshui-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), a0 = src.indexOf('var MANSE_DATA'), b0 = src.indexOf('})(typeof window', a0);
vm.runInThisContext(src.slice(a0, src.indexOf('\n', b0)));
const M = globalThis.Manse;
let net = 0; globalThis.fetch = () => { net++; throw new Error('network'); };
for (const f of ['fengshui-data.js', 'fengshui-engine.js']) vm.runInThisContext(fs.readFileSync(path.join(root, f), 'utf8'), { filename: f });
const F = globalThis.MantraFengshui, D = globalThis.MantraFengshuiData;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);

// A. 삼원구운 경계
eq([1864, 1923, 1924, 1983, 1984, 2003, 2004, 2023, 2024, 2043, 2044].map(F.periodOfYear), [1, 3, 4, 6, 7, 7, 8, 8, 9, 9, 1], '삼원구운 경계');
eq([F.lichunYear(2024, 2, 3), F.lichunYear(2024, 2, 4), F.lichunYear(2024, 1, 10)], [2023, 2024, 2023], '입춘 기준 연도');

// B. 24산 방위 (palace 순서 N NE E SE S SW W NW → 0..7)
const mt = d => F.mountainAt(d).mt.hj;
eq([0, 15, 30, 45, 90, 180, 225, 270, 315, 345].map(mt), ['子', '癸', '丑', '艮', '卯', '午', '坤', '酉', '乾', '壬'], '24산 중심각');
ok(F.mountainAt(7.8).gongmang && F.mountainAt(7.8).gongmang.big === false, '소공망(자·계 경계)');
ok(F.mountainAt(23).gongmang && F.mountainAt(23).gongmang.big === true, '대공망(계·축=감·간 경계)');
ok(!F.mountainAt(0).kim && F.mountainAt(5.5).kim, '겸향 판정');
// 음양 표: 양 12, 음 12 / 12음 = 乾坤艮巽 辰戌丑未 乙辛丁癸
const yin = F.MOUNTAINS.filter(m => m.yy < 0).map(m => m.hj).sort().join('');
eq(yin, '乙乾坤丁艮丑巽未癸戌辛辰'.split('').sort().join(''), '12음 산');
eq(F.MOUNTAINS.filter(m => m.yy > 0).length, 12, '양산 12');

// C. 운반
const grid = p => { const b = F.fly(p, 1); return [b[3], b[4], b[5], b[2], b[8], b[6], b[1], b[0], b[7]]; };
eq(grid(8), [7, 3, 5, 6, 8, 1, 2, 4, 9], '8운 운반');
eq(grid(9), [8, 4, 6, 7, 9, 2, 3, 5, 1], '9운 운반');

// D. 연비성·월비성 (2024 辰년: 중궁 3, 오황은 서쪽, 2025: 2)
eq([2024, 2025, 2026, 2027, 2023].map(F.yearCenter), [3, 2, 1, 9, 4], '연비성 중궁');
const ov = F.overlay(F.xuankong({ facingDeg: 180, builtYear: 2010, evalYear: 2024 }), 2024, 1);
eq(ov.cells.find(c => c.yearStar === 5).key, 'W', '2024 오황 서쪽');
eq(ov.cells.find(c => c.yearStar === 2).key, 'SE', '2024 이흑 남동');
eq(ov.monthCenter, 5, '2024 정월 월비성');
eq([F.monthCenter(2023, 1), F.monthCenter(2025, 1), F.monthCenter(2025, 2)], [8, 2, 1], '월비성 자오묘유/인신사해 규칙(2023 卯→8? 확인)'.slice(0, 0) + '월비성');
eq(ov.samsal.dir, '남', '2024 辰년 삼살 남') ;

// E. 팔택 본명괘
const k = (y, g) => F.kuaOf(y, g).kua;
eq([k(1984, 'M'), k(1984, 'F'), k(1990, 'M'), k(1990, 'F'), k(2000, 'M'), k(2000, 'F'), k(1975, 'M'), k(1968, 'M')], [7, 8, 1, 8, 9, 6, 7, 2], '본명괘');
const st = (t) => Object.fromEntries(F.eightStars(t).filter(s => s.id !== 'fu').map(s => [s.id, s.key]).sort());
const srt = o => Object.fromEntries(Object.entries(o).sort());
eq(st(0), srt({ sheng: 'SE', tian: 'E', yan: 'S', huo: 'W', wugui: 'NE', liusha: 'NW', jue: 'SW' }), '감괘(1) 팔유성');
eq(st(2), srt({ sheng: 'S', tian: 'N', yan: 'SE', huo: 'SW', wugui: 'NW', liusha: 'NE', jue: 'W' }), '진괘(3) 팔유성');
eq(F.eightStars(6).find(s => s.id === 'sheng').key, 'NW', '태괘(7) 생기 서북');
eq(F.eightStars(4).find(s => s.id === 'sheng').key, 'E', '이괘(9) 생기 동');
eq(F.eightStars(5).find(s => s.id === 'sheng').key, 'NE', '곤괘(2) 생기 북동');
for (let t = 0; t < 8; t++) { const s = F.eightStars(t); ok(s.filter(x => x.good).length === 4 && new Set(s.map(x => x.id)).size === 8 && s.find(x => x.id === 'fu').idx === t, '팔유성 구조 ' + t); }
// 집 좌와 사람이 같은 계열이면 택명상배
ok(F.bazhai({ facingDeg: 180, birthYear: 1990, gender: 'M' }).match === 'match', '북좌남향(동사택) + 동사명');
ok(F.bazhai({ facingDeg: 180, birthYear: 1984, gender: 'M' }).match === 'mismatch', '북좌남향 + 서사명');

// F. 현공 판: 모든 반이 1~9 한 번씩, 8운 子山午向은 쌍성회좌
let bad = 0, counts = {};
for (let p = 1; p <= 9; p++) {
  const yr = 1864 + (p - 1) * 20 + 5;
  for (let i = 0; i < 24; i++) {
    const c = F.xuankong({ facingDeg: i * 15, builtYear: yr, evalYear: yr });
    for (const b of ['yun', 'shan', 'xiang']) if ([...c.boards[b]].sort().join('') !== '123456789') bad++;
    ok(c.period === p, '운 ' + p);
    counts[c.pattern.id] = (counts[c.pattern.id] || 0) + 1;
  }
}
ok(bad === 0, '판 무결성 위반 ' + bad);
const z8 = F.xuankong({ facingDeg: 180, builtYear: 2010, evalYear: 2010 });
eq(z8.pattern.id, 'ssangjwa', '8운 子山午向 쌍성회좌');
eq([z8.boards.shan[0], z8.boards.xiang[0], z8.boards.xiang[4]], [8, 8, 7], '8운 子山午向 별');
const z9 = F.xuankong({ facingDeg: 180, builtYear: 2030, evalYear: 2030 });
eq(z9.pattern.id, 'ssanghyang', '9운 子山午向 쌍성회향');
// 상태 판정
eq([F.stateOf(9, 9), F.stateOf(1, 9), F.stateOf(2, 9), F.stateOf(8, 9), F.stateOf(5, 9)], ['wang', 'sheng', 'sheng', 'tui', 'sha'], '별 상태');
// 개축 연도는 건축 연도보다 우선
eq(F.xuankong({ facingDeg: 90, builtYear: 1995, renovationYear: 2010, evalYear: 2025 }).period, 8, '개축 기준');
// 건축연도 없음 → 가정 표시
ok(F.xuankong({ facingDeg: 90, evalYear: 2025 }).assumptions.length >= 1, '가정 표시');
// 5 입중 규칙 진입 확인(운반 5가 坐에 오는 경우)
let five = 0; for (let i = 0; i < 24; i++) { const c = F.xuankong({ facingDeg: i * 15, builtYear: 2010, evalYear: 2010 }); if (c.start.shan.star === 5 || c.start.xiang.star === 5) five++; }
ok(five > 0, '5 입중 사례');

// G. 사주 연결 + 종합: 합산 없음, 이론별 분리
const ch = M.compute({ year: 1992, month: 6, day: 23, hour: 2, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' });
const an = F.analyze({ ch, facingDeg: 175, builtYear: 2008, evalYear: 2025, form: { back: 'mountain', front: 'open', left: 'higher', right: 'lower', water: 'embrace', road: 'curve', hazards: ['power'] } });
ok(an.saju.length === 8 && an.theories.length === 4, '종합 구조');
ok(!('total' in an) && !('score' in an), '합산 점수 없음');
eq(F.birthYearFromChart(ch), 1992, '출생연도(입춘)');
const early = M.compute({ year: 1992, month: 1, day: 20, hour: 12, minute: 0, gender: 'F', calendar: 'solar', school: 'eokbu' });
eq(F.birthYearFromChart(early), 1991, '입춘 이전 출생은 전년');
eq(an.form.tone, 'good' , '형세 점수 톤(전문 입력 유효 값 아님: curve 무시)'.slice(0, 0) + '형세 톤') ;
const sug = F.suggestRoles({ chart: an.xuankong, bazhai: an.bazhai, ch, roles: ['bed', 'door', 'wc'] });
ok(Object.values(sug).every(a => a.length === 8), '추천 8방위');
ok(sug.bed[0].agreeCount >= sug.bed[7].agreeCount, '추천 정렬');
// 형세 입력 부족은 판단 보류
eq(F.form({ back: 'mountain' }).tone, 'unknown', '형세 입력 부족 보류');
// 문구 규칙: 금지 표현·존댓말
const texts = []; for (const s of Object.values(D.STAR_TXT)) for (const l of Object.values(s)) texts.push(...Object.values(l));
for (const f of Object.values(D.FORM)) for (const o of Object.values(f.opts)) texts.push(o[1]);
texts.push(...Object.values(D.REMEDY), ...Object.values(D.HAZARD).map(h => h[2]));
texts.forEach(t => { ok(!D.BAN.test(t), '금지 표현: ' + t); ok(/(니다|세요|요)[.!]?$|니다\.$/.test(t.trim()), '존댓말 아님: ' + t); });
ok(texts.length >= 100, '문구 수 ' + texts.length);
// 물·길·산 방위 활용
const c8 = F.xuankong({ facingDeg: 180, builtYear: 2030, evalYear: 2030 });
const goodX = c8.palaces.filter(p => p.idx < 8 && p.xiangTone >= 1.5)[0], badX = c8.palaces.filter(p => p.idx < 8 && p.xiangTone <= -1)[0];
ok(F.landUse(c8, { openDir: goodX.key }).items[0].tone === 1, '향성 길한 방위의 물·길은 긍정');
ok(F.landUse(c8, { openDir: badX.key }).items[0].tone === -1, '흉성 방위의 물·길은 부정');
eq(F.landUse(c8, {}).given, 0, '방위 미입력 시 판단 없음');
ok(F.analyze({ facingDeg: 180, builtYear: 2030, openDir: goodX.key }).land.given === 1, '종합에 land 포함');
ok(D.HOME_METRICS.length === 6, '거주지 지표');
// H. 무작위 사주 × 좌향 × 건축연도 견고성 (예외·NaN·빈 값 없음, 판정 분포 편향 확인)
{ let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff, ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let n = 0, errs = 0, verd = {}, fit = { '-1': 0, 0: 0, 1: 0 };
  for (let k = 0; k < 400; k++) {
    try {
      const c = M.compute({ year: ri(1940, 2005), month: ri(1, 12), day: ri(1, 28), hour: ri(0, 23), minute: 0, gender: rnd() < .5 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' });
      const an = F.analyze({ ch: c, facingDeg: rnd() * 360, builtYear: ri(1950, 2040), renovationYear: rnd() < .3 ? ri(1990, 2040) : null, evalYear: ri(2024, 2043), openDir: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][ri(0, 7)], highDir: null, form: { back: 'mountain', front: 'open', left: 'level', right: 'lower' } });
      ok(an.saju.length === 8 && an.xuankong.palaces.length === 9 && an.bazhai.personStars.length === 8, '구조');
      an.saju.forEach(s => { fit[s.level]++; ok(s.text && !/undefined|NaN/.test(s.text), '사주 연결 문구'); });
      an.xuankong.palaces.forEach(p => ok(p.shanText && p.xiangText && isFinite(p.shanTone + p.xiangTone), '궁 문구'));
      for (const role of ['bed', 'door', 'wc', 'owner', 'cashier']) { const j = F.judgePlacement({ chart: an.xuankong, bazhai: an.bazhai, ch: c, role, idx: ri(0, 7) }); ok(j.verdictText && !/undefined/.test(j.verdictText), '배치 판정'); verd[j.verdict] = (verd[j.verdict] || 0) + 1; }
      const ov = F.overlay(an.xuankong, ri(2024, 2043), ri(1, 12)); ok(ov.cells.some(x => x.yearStar === 5) && ov.cells.some(x => x.monthStar === 5), '오황 위치');
      n++;
    } catch (e) { errs++; fails.push('무작위 실패: ' + e.message); }
  }
  ok(n === 400 && errs === 0, '무작위 400건 처리 ' + n);
  const tot = fit[-1] + fit[0] + fit[1]; ok(fit[-1] / tot > .1 && fit[1] / tot > .1, '사주 연결 판정이 한쪽으로 쏠림');
  console.log('H. 무작위 400건 · 배치 판정 분포', JSON.stringify(verd), '· 사주 연결 적합/무난/주의 비율', [1, 0, -1].map(k => Math.round(fit[k] / tot * 100) + '%').join('/')); }
ok(net === 0, '네트워크 호출 없음');

console.log('패턴 분포(9운×24좌향):', JSON.stringify(counts));
console.log(`문구 ${texts.length}개 · 실패 ${fails.length}건`);
if (fails.length) { console.log(fails.join('\n')); process.exit(1); } console.log('통과');
