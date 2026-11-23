// 지금 대운이 어떤 10년인지 모든 블록이 같은 판정을 쓰는지 검사(2026-11-24).
// 기준: 공통 엔진 groupPull(천간 0.4 + 지장간 0.6) — 시기표 카드(life-narrative pullOf)와 같은 함수.
// 대상: saju-data pull, 대운 과제 카드·한 장 요약(reading-plus), 깊이 블록(reading-depth), 인사이트(reading-insight dwg), 운 풀이(luck-reading).
const fs = require('fs'), vm = require('vm'), path = require('path'), assert = require('assert/strict');
const ROOT = path.resolve(__dirname, '..');
global.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js']) vm.runInThisContext(fs.readFileSync(path.join(ROOT, f), 'utf8'));
for (const f of ['chart-lines-stars', 'chart-lines-rest', 'chart-lines-fill', 'chart-lines-depth', 'chart-lines', 'signature-data', 'reading-plus']) require(path.join(ROOT, 'report/v2/' + f + '.js'));
const P = globalThis.ReportV2.ReadingPlus, M = globalThis.Manse;
const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
const LABEL = { 비겁: '내 힘을 세우는 10년', 식상: '꺼내 보이는 10년', 재성: '현실을 굴리는 10년', 관성: '책임을 맡는 10년', 인성: '배우고 다지는 10년' };
const TG_GROUP = { 비견: '비겁', 겁재: '비겁', 식신: '식상', 상관: '식상', 편재: '재성', 정재: '재성', 편관: '관성', 정관: '관성', 편인: '인성', 정인: '인성' };
let n = 0, differ = 0;
for (let i = 0; i < 300; i++) {
  const input = { year: 1950 + i % 60, month: 1 + i % 12, day: 1 + (i * 7) % 28, hour: i % 24, minute: 0, gender: i % 2 ? 'F' : 'M', calendar: 'solar', city: '서울' };
  const ch = M.compute(input), sd = globalThis.ReportV2.SajuData.build(ch, { now: Date.UTC(2026, 10, 24) }), dw = sd.currentDaewoon;
  if (!dw) continue;
  const x = ch.daeun.list.find(d => M.gzNameK(d) === dw.ganzhi && d.startYear === dw.startYear);
  const g = M.groupPull(M.stemEl(ch.pillars.day.s), x); let top = 0; g.forEach((v, k) => { if (v > g[top]) top = k; });
  assert.ok(dw.pull, 'pull 없음');
  assert.equal(dw.pull.group, GROUPS[top], 'saju-data pull = 엔진 groupPull ' + dw.ganzhi);
  if (dw.pull.tg) assert.equal(TG_GROUP[dw.pull.tg], dw.pull.group, '대표 십성이 같은 묶음');
  if (TG_GROUP[dw.stemTG] !== dw.pull.group) differ++;
  const h = P.html({ id: 'timeline_self_20', editorialContractId: 'timeline_self_20', readingVisualData: { ...sd, name: '테스트' } });
  if (/이번 대운 10년의 과제/.test(h)) {
    assert.ok(h.includes(LABEL[dw.pull.group]), '과제 카드 10년 이름 = 공통 판정 ' + dw.ganzhi + ' ' + dw.pull.group);
    for (const k of GROUPS) if (k !== dw.pull.group) assert.ok(!h.includes(dw.ganzhi + ' 대운 · ' + dw.startYear + '~' + dw.endYear + ' · ' + LABEL[k]), '다른 10년 이름 섞임');
    assert.ok(!/undefined|NaN/.test(h), '값 누락');
    n++;
  }
}
assert.ok(n >= 200, '과제 카드 표본 ' + n);
assert.ok(differ > 0, '천간 기준과 다른 사주가 표본에 있어야 검사가 의미 있음');
// 소스에서 대운 묶음을 천간 하나로만 읽는 곳이 남지 않았는지
const src = f => fs.readFileSync(path.join(ROOT, 'report/v2', f), 'utf8');
assert.ok(/dw\.pull&&dw\.pull\.group\|\|TG_GROUP\[dw\.stemTG\]/.test(src('reading-depth.js')), 'reading-depth 공통 판정');
assert.ok(/dw\.pull&&dw\.pull\.group\|\|TG_GROUP\[dw\.stemTG\]/.test(src('reading-insight.js')), 'reading-insight 공통 판정');
assert.ok(/gods\[dTG\(dw\)\]/.test(src('luck-reading.js')), 'luck-reading 공통 판정');
console.log('PASS daewoon-group-sync-sim: 과제 카드 ' + n + '명 · 천간 기준과 갈리던 사주 ' + differ + '명도 공통 판정으로 일치');
