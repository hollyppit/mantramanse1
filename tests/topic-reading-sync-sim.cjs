// 주제별 상세풀이 ↔ 만세력 공통 계산 동기화 검증(2026-11-20 전수 검토):  node tests/topic-reading-sync-sim.cjs [사주 수=150]
//  ① 해마다 운 블록(fx:years·fx:actcal)은 엔진 세운(입춘 기준 간지)·흐름 점수를 그대로 쓴다(직접 (y-4)%10 계산·오행 역할 점수 아님)
//  ② 교운기(fx:cross) 오르막·내리막은 엔진 대운 흐름 점수
//  ③ 재물 장 재성 뿌리(통근)는 지장간(엔진 일반 지장간) 기준
//  ④ 강약 단어(서사·심화)는 엔진 강약 구간 그대로
//  ⑤ 공통 데이터에 계절·월령 세 지표(sd.seasonal), 오행 그래프 아래 계절 한 줄
//  ⑥ 재물·커리어 장 오행 전략 블록(esBlock) = 엔진 통합 용신 역할, 서사 문단(plainNote)과 같은 문장 없음
//  ⑦ '글자 수가 가장 적은' 같은 개수 표현 없음 · 고친 파일 캐시 버전 올림
const fs = require('fs'), path = require('path'), vm = require('vm'), assert = require('assert/strict');
const root = path.join(__dirname, '..'), N = +process.argv[2] || 150, src = f => fs.readFileSync(path.join(root, f), 'utf8');
const files = ['engine.js', 'element-strategy.js', 'report/v2/saju-data.js', 'report/v2/deep.js', 'report/v2/deep-wealth.js', 'report/v2/deep-jobs.js', 'report/v2/fate-blocks.js', 'report/v2/fate-blocks-4.js', 'report/v2/reading-feature.js'].filter(f => fs.existsSync(path.join(root, f)));
const c = { console }; c.window = c; vm.createContext(c); files.forEach(f => vm.runInContext(src(f), c, { filename: f }));
const M = c.Manse, R = c.ReportV2, ES = c.MantraElementStrategy, NOW = Date.UTC(2026, 10, 20, 3);
const strip = h => String(h || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const feat = (id, ch, sd) => { const o = { id, editorialContractId: id }; Object.defineProperty(o, 'readingFeature', { value: { M, ch, sd, now: NOW, name: '', assets: {} } }); return o; };
const STEM_EL = { 갑: '목', 을: '목', 병: '화', 정: '화', 무: '토', 기: '토', 경: '금', 신: '금', 임: '수', 계: '수' };
let n = 0, rootedHiddenOnly = 0, yrsN = 0;
for (let i = 0; i < N; i++) {
  const ch = M.compute({ year: 1950 + (i * 7) % 55, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar' });
  const sd = R.SajuData.build(ch, { now: NOW }); n++;
  // ① 세운: annualLuck 간지 = 엔진 seunRange, fit = 엔진 흐름 점수
  const Y = sd.nowYear, se = M.seunRange(ch, Y, Y + 9);
  sd.annualLuck.forEach((a, k) => { assert.equal(a.ganzhi, M.gzNameK(se[k]), '세운 간지 = 엔진(입춘 기준)'); assert.equal(a.fit, Math.round(se[k].ev.fitScore * 10) / 10, '세운 흐름 점수'); });
  const yrs = R.FateBlocks.render({ custom: 'fx:years', topic: 'wealth' }, { sd, M, ch }, 'timeline_wealth_06');
  if (yrs) yrsN++;
  if (yrs) { sd.annualLuck.forEach(a => assert.ok(yrs.includes(a.ganzhi), 'fx:years 가 엔진 세운 간지를 씀 ' + a.ganzhi));
    sd.annualLuck.forEach(a => { const cls = a.fit >= 18 ? 'is-good' : a.fit <= -12 ? 'is-bad' : 'is-mid'; assert.ok(new RegExp('class="' + cls + '"><b>' + a.year + '<').test(yrs), a.year + ' 칸 색 = 흐름 점수'); }); }
  // ③ 재물 장 뿌리: 지장간에만 재성 오행이 있어도 통근
  const jaeEl = sd.groupEl && sd.groupEl.재성, inHidden = ['year', 'month', 'day', 'hour'].some(k => sd.pillars[k] && (sd.pillars[k].hidden || []).some(h => STEM_EL[h.stem] === jaeEl));
  const mainOnly = ['year', 'month', 'day', 'hour'].some(k => sd.pillars[k] && STEM_EL[(sd.pillars[k].hidden || []).slice(-1)[0]?.stem] === jaeEl);
  if (inHidden && !mainOnly) rootedHiddenOnly++;
  // ④ 강약: 서사 태그 = 엔진 구간
  if (c.MantraLifeNarrative) { /* 서사는 이 테스트에서 따로 불러오지 않음 — premium/life 는 소스 검사 */ }
  // ⑤ 계절 세 지표
  assert.ok(sd.seasonal && sd.seasonal.command && sd.seasonal.states, 'sd.seasonal');
  ['목', '화', '토', '금', '수'].forEach((e, k) => { assert.ok(Math.abs(sd.seasonal.appearance[e] - Math.round(ch.weights.seasonal.appearance[k] * 10) / 10) < 1e-9); assert.equal(sd.seasonal.states[e], ch.weights.seasonal.states[k].state); });
  // ⑥ 오행 전략 블록
  const nat = ES.natal(M, ch);
  for (const [id, lens] of [['timeline_wealth_02', 'wealth'], ['timeline_career_01', 'career']]) {
    const out = R.ReadingFeature.build(feat(id, ch, sd)), h = JSON.stringify(out || {}), at = h.indexOf('dp-es');
    if (!nat || !nat.core) { assert.ok(at < 0, '용신 없으면 블록 없음'); continue; }
    assert.ok(at >= 0, id + ' 오행 전략 블록');
    const txt = strip(h.slice(at, at + 4000).split('<\\/section>')[0]);
    assert.ok(txt.includes(nat.core.elName), id + ' 핵심 = 용신 ' + nat.core.elName);
    nat.expand.slice(0, 1).forEach(x => assert.ok(txt.includes(x.elName), id + ' 확장 = 희신'));
    const pn = ES.plainNote(M, ch, lens); if (pn) pn.text.split(/(?<=[.요])\s+/).filter(s => s.length > 20).forEach(s => assert.ok(!txt.includes(s), id + ' 서사 문장과 중복: ' + s));
    assert.ok(!/반드시|무조건|하세요\./.test(txt), '단정 표현');
  }
}
assert.ok(yrsN === n, 'fx:years 가 모든 사주에서 그려짐 ' + yrsN + '/' + n);
// ② 교운기: fit 비교 사용(소스)
const fb4 = src('report/v2/fate-blocks-4.js');
assert.ok(/cur\.assessment && typeof cur\.assessment\.fitScore === 'number'/.test(fb4) && /var up = cf != null && nf != null \? nf >= cf/.test(fb4), '교운기 = 대운 흐름 점수');
assert.ok(/AL\.length\) return AL\.slice/.test(fb4), '세운 블록 = 엔진 세운');
// ③ 소스: 지장간 기준 뿌리
assert.ok(/rooted: rootedIn\(sd, el, br\)/.test(src('report/v2/deep-wealth.js')), '재물 장 뿌리 = 지장간');
// ④ 강약 단어 = 엔진 구간
assert.ok(/ZW\[st\.zone\]/.test(src('report/v2/life-narrative.js')) && /STR_W\[zone\]|zone in STR_W/.test(src('report/v2/premium-depth.js')), '강약 = 엔진 구간');
// ⑦ 개수 표현·버전
assert.ok(!/글자 수가 가장 적은/.test(src('report/v2/reading-depth.js')), '개수 표현 제거');
assert.ok(/function seasonalCaption\(sd\)/.test(src('report/v2/reading-text.js')) && /seasonalCaption\(sd\)\+'<\/figure>'/.test(src('report/v2/reading-text.js')), '오행 그래프 계절 한 줄');
const idx = src('report/v2/index.html');
['saju-data.js', 'reading-text.js', 'reading-feature.js', 'fate-blocks-4.js', 'deep-wealth.js', 'premium-depth.js', 'reading-depth.js', 'life-narrative.js', 'element-strategy.js'].forEach(f => assert.ok(idx.includes(f + '?v=20261120-rv'), f + ' 캐시 버전'));
assert.ok(!/\?\?v=/.test(idx), '버전 표기 깨짐 없음');
console.log(`topic-reading-sync-sim PASS · 사주 ${n}명 · 세운 간지·흐름 점수 = 엔진 · 재물 뿌리 지장간 기준(지장간에만 재성 있는 사주 ${rootedHiddenOnly}) · 계절 세 지표 · 오행 전략 블록 = 용희신 · 서사와 중복 없음`);
