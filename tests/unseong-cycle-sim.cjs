// 12운성 생명주기(원국 '내 사주의 12운성' · 운세 흐름 '대운의 12운성 변화') 검증
//   node tests/unseong-cycle-sim.cjs
// 1) 천간별 12운성 배속표를 손으로 적은 전통 표와 120칸 모두 대조 2) 원국 봉법·좌법·대운 값이 엔진과 같고 대운은 일간 기준인지
// 3) 해석 네 칸(의미·전통·자리·주의)과 금지 표현 4) 원국·대운 화면 조각 5) 12운성이 운세 점수에 섞이지 않았는지 6) 화면 연결. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
require(path.join(root, 'unseong-cycle.js')); const U = globalThis.MantraUnseong;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

// 1. 전통 배속표(행: 천간 甲~癸, 열: 지지 子~亥). 화토동법·양간 순행·음간 역행
const T = {
  甲: '목욕 관대 건록 제왕 쇠 병 사 묘 절 태 양 장생', 乙: '병 쇠 제왕 건록 관대 목욕 장생 양 태 절 묘 사',
  丙: '태 양 장생 목욕 관대 건록 제왕 쇠 병 사 묘 절', 丁: '절 묘 사 병 쇠 제왕 건록 관대 목욕 장생 양 태',
  戊: '태 양 장생 목욕 관대 건록 제왕 쇠 병 사 묘 절', 己: '절 묘 사 병 쇠 제왕 건록 관대 목욕 장생 양 태',
  庚: '사 묘 절 태 양 장생 목욕 관대 건록 제왕 쇠 병', 辛: '장생 양 태 절 묘 사 병 쇠 제왕 건록 관대 목욕',
  壬: '제왕 쇠 병 사 묘 절 태 양 장생 목욕 관대 건록', 癸: '건록 관대 목욕 장생 양 태 절 묘 사 병 쇠 제왕',
};
let cellsChecked = 0;
Object.keys(T).forEach((stem, s) => T[stem].split(' ').forEach((want, b) => {
  cellsChecked++;
  ok(M.unseong(s, b) === want, `엔진 배속 오류: ${stem}${'子丑寅卯辰巳午未申酉戌亥'[b]} 엔진 ${M.unseong(s, b)} ≠ 표 ${want}`);
  ok(U.stageOf(s, b) === want, `모듈 사본 배속 오류: ${stem}${'子丑寅卯辰巳午未申酉戌亥'[b]}`);
}));
ok(cellsChecked === 120, '배속표 120칸이 아님');
// 녹(건록)·양인(양간 제왕) 대표 자리
[[0, 2, '건록'], [2, 5, '건록'], [6, 8, '건록'], [8, 11, '건록'], [0, 3, '제왕'], [2, 6, '제왕'], [6, 9, '제왕'], [8, 0, '제왕']].forEach(([s, b, n]) => ok(M.unseong(s, b) === n, `녹·양인 자리 오류 ${M.STEM[s]}${M.BR[b]}`));
ok(JSON.stringify(U.ORDER) === JSON.stringify(['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양']), '단계 순서가 다름');

// 2. 단계 데이터: 12단계 모두 아이콘·색·키워드·네 칸 해석·자리별 문안
const PIL = ['year', 'month', 'day', 'hour'];
U.ORDER.forEach((n, i) => {
  const st = U.STAGES[n];
  ok(st && st.kw && st.motif && st.state && st.trad && st.jwa && st.dae && st.care && st.short && st.h, `${n} 데이터 칸 누락`);
  ok(PIL.every(k => st.at[k] && st.at[k].length > 15), `${n} 자리별 문안 누락`);
  ok(U.PHASE_OF[n], `${n} 단계 구간 없음`);
  const ic = U.icon(n);
  ok(/^<svg class="us-ic" viewBox="0 0 64 64" aria-hidden="true"/.test(ic) && !/NaN|undefined/.test(ic) && ic.includes('us-orb') && ic.includes('us-soil'), `${n} 아이콘이 공통 틀을 따르지 않음`);
  ok(U.vars(n) === `--usc:var(--us-c${i});--usk:var(--us-k${i})`, `${n} 색 변수 오류`);
  ok(html.includes(`--us-c${i}:`) && html.includes(`--us-k${i}:`), `${n} 색 토큰이 CSS에 없음`);
});
ok(new Set(U.ORDER.map(n => U.icon(n))).size === 12, '아이콘이 단계마다 다르지 않음');
ok(U.PHASES.reduce((a, p) => a + p.stages.length, 0) === 12, '단계 구간이 12단계를 덮지 않음');
// 금지 표현: 제왕 = 성공·행운, 쇠·병·사·절 = 실패·질병·죽음으로 잇지 않는다(부정문 '뜻하지 않습니다'·'단정하지 않습니다' 안에서만 허용)
const allText = U.ORDER.map(n => { const s = U.STAGES[n]; return [n, s.state, s.trad, s.jwa, s.dae, s.short, ...PIL.map(k => s.at[k])].join(' '); });
U.ORDER.forEach((n, i) => ok(!/성공|행운|대길|실패|질병|죽음|사망|흉하|불길|나쁜 운|좋은 운|점수/.test(allText[i].replace(n, '')), `${n} 문안에 길흉·질병·죽음 연결 표현`));
['병', '사'].forEach(n => ok(/뜻하지 않습니다/.test(U.STAGES[n].care), `${n} 주의사항에 이름 오해 안내가 없음`));
ok(/보장하는 표시가 아닙니다/.test(U.STAGES['제왕'].care), '제왕 주의사항에 성공·행운 오해 안내가 없음');
ok(/단정하지 않습니다/.test(U.STAGES['절'].care), '절 주의사항 누락');
// 존댓말: 문장 끝이 '-니다.'
U.ORDER.forEach(n => { const s = U.STAGES[n]; [s.state, s.trad, s.jwa, s.dae, s.care, ...PIL.map(k => s.at[k])].forEach(t => ok(/니다\.$/.test(t.trim()), `${n} 존댓말이 아님: ${t.slice(0, 30)}`)); });

// 3. 원국·대운: 여러 사주에서 엔진 값과 일치
let seed = 1115; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let n = 0, noHour = 0, duN = 0;
for (let i = 0; i < 120; i++) {
  let ch; try { ch = M.compute({ year: 1940 + Math.floor(rnd() * 75), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 9 === 0 ? '' : Math.floor(rnd() * 24), minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  n++; const d = ch.pillars.day.s, keys = PIL.filter(k => ch.cells[k]); if (keys.length < 4) noHour++;
  // 봉법 = 일간 기준, 좌법 = 그 기둥 천간 기준, 대운 = 일간 기준
  keys.forEach(k => { const p = ch.pillars[k]; ok(ch.cells[k].unseong === T[M.STEM[d]].split(' ')[p.b], `${k} 봉법이 일간 기준 표와 다름`); ok(ch.cells[k].unseongJwa === T[M.STEM[p.s]].split(' ')[p.b], `${k} 좌법이 기둥 천간 기준 표와 다름`); });
  ok(ch.cells.day.unseong === ch.cells.day.unseongJwa, '일주 봉법·좌법이 다름');
  ch.daeun.list.forEach(x => ok(x.unseong === T[M.STEM[d]].split(' ')[x.b], `대운 ${M.gzName(x)} 12운성이 일간 기준이 아님`));
  ['bong', 'jwa'].forEach(mode => {
    const h = U.natalHTML(M, ch, { mode, pick: PIL[i % 4] });
    ok((h.match(/class="us-card[ "]/g) || []).length === 4, '원국 카드가 4개가 아님');
    ok((h.match(/data-act="us-p:/g) || []).length === keys.length, '누를 수 있는 카드 수가 기둥 수와 다름');
    const order = ['hour', 'day', 'month', 'year'].filter(k => ch.cells[k]).map(k => h.indexOf(`data-act="us-p:${k}"`));
    ok(order.every((v, j) => j === 0 || v > order[j - 1]), '카드 순서가 시지·일지·월지·년지가 아님');
    keys.forEach(k => { const st = mode === 'jwa' ? ch.cells[k].unseongJwa : ch.cells[k].unseong; ok(h.includes(`data-act="us-p:${k}" aria-pressed="${(ch.cells[PIL[i % 4]] ? PIL[i % 4] : 'day') === k}" style="${U.vars(st)}"`), `${mode} ${k} 카드 색·선택 상태 오류`); ok(h.includes(`<span class="us-nm">${st}</span>`), `${mode} ${k} 카드 이름 없음`); });
    ok(h.includes(`data-act="un:${mode}" aria-pressed="true"`) && h.includes(`data-act="un:${mode === 'jwa' ? 'bong' : 'jwa'}" aria-pressed="false"`), '봉법·좌법 스위치 상태 오류');
    ok(['단계의 의미', '전통적 해석', '이 자리에서의 의미', '주의사항'].every(t => h.includes(`<b>${t}</b>`)), '원국 설명이 네 칸 구조가 아님');
    ok(/월령·통근·지장간/.test(h) && /좋고 나쁨이 아니라/.test(h), '원국에 강약 단정 금지·길흉 아님 안내가 없음');
    const sum = U.natalSummary(M, ch, mode); ok(sum.length >= 2 && sum.length <= 3, '핵심 해석이 2~3문장이 아님');
    ok(!/신강|신약|강하다|약하다/.test(sum.join(' ')), '핵심 해석이 강약을 단정함');
    ok(!/NaN|undefined|null/.test(h), '원국 조각에 빈 값');
    keys.forEach(k => { const x = U.natalExplain(M, ch, k, mode); ok(x && x.stage === (mode === 'jwa' ? ch.cells[k].unseongJwa : ch.cells[k].unseong) && x.place.includes(M.BR[ch.pillars[k].b]), `${mode} ${k} 자리 해석 오류`); });
  });
  if (!ch.cells.hour) ok(U.natalHTML(M, ch, {}).includes('시주 미상'), '시주 미상 카드 없음');
  const du = M.daeunAt(ch, Date.UTC(2026, 10, 15)), dh = U.daeunHTML(M, ch, du, { flowLabel: x => '판정' + x.ev.condition });
  ok((dh.match(/data-act="us-du:/g) || []).length === ch.daeun.list.length && ch.daeun.list.length === 10, '대운 타임라인이 10개가 아님');
  const ages = ch.daeun.list.map(x => dh.indexOf(`<span class="us-age">${x.startAge}~${x.startAge + 9}세</span>`)); ok(ages.every((v, j) => v > 0 && (j === 0 || v > ages[j - 1])), '대운이 시간순이 아님');
  ch.daeun.list.forEach(x => ok(dh.includes(M.gzName(x)) && dh.includes(U.vars(x.unseong)), `대운 ${M.gzName(x)} 표시 누락`));
  if (du) { duN++; ok((dh.match(/aria-current="true"/g) || []).length === 1 && dh.includes('<span class="us-now">현재</span>'), '현재 대운 강조가 하나가 아님'); ok(dh.includes(' · 현재</span>'), '기본 선택이 현재 대운이 아님'); }
  ok(['기운의 상태', '전통적 의미', '원국과의 관계', '주의사항'].every(t => dh.includes(`<b>${t}</b>`)), '대운 설명이 네 칸 구조가 아님');
  ok(dh.includes('운세 분석 엔진의 판정(12운성과 별개)') && /판정(순풍|보통|주의|부담)/.test(dh), '대운 운세 판정이 12운성과 분리돼 보이지 않음');
  ok(!/NaN|undefined|null/.test(dh), '대운 조각에 빈 값');
  const pick = i % 10, dp = U.daeunHTML(M, ch, du, { pick }); ok(dp.includes(`data-act="us-du:${pick}" aria-pressed="true"`), '대운 선택이 반영되지 않음');
  const r = U.daeunExplain(M, ch, ch.daeun.list[pick], {}); ok(r.relation.length >= 2 && r.relation.some(t => t.includes('원국 일지')), '원국과의 관계 설명이 부족');
}
ok(n >= 100 && noHour >= 8 && duN >= 50, `검증한 사주가 적음(${n}개, 시주 미상 ${noHour}개, 현재 대운 ${duN}개)`);
// 용어 팝업
const ch0 = M.compute({ year: 1990, month: 5, day: 17, hour: 9, minute: 30, gender: 'F', calendar: 'solar', school: 'eokbu' });
U.ORDER.forEach(n2 => { const s = U.stageSheetHTML(M, ch0, n2); ok(['단계의 의미', '전통적 해석', '내 사주에서는', '주의사항'].every(t => s.includes(`<b>${t}</b>`)) && s.includes('us-cyc'), `${n2} 용어 팝업 구조 오류`); ok(U.stageSheetHTML(M, null, n2).includes('사주를 입력하면'), `${n2} 사주 없는 팝업 오류`); });
ok(U.modeSheetHTML(M, ch0, 'jwa').includes(M.gzName(ch0.pillars.month)) && U.modeSheetHTML(M, ch0, 'bong').includes('us-mini'), '봉법·좌법 팝업 오류');

// 4. 12운성이 점수에 섞이지 않음: 엔진 점수 코드에 unseong 참조가 없고, 모듈은 점수를 쓰지 않는다
const engCode = eng.replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
const useLines = engCode.split('\n').filter(l => /unseong/.test(l));
ok(useLines.every(l => /const unseong =|unseong: unseong\(|unseongJwa: unseong\(|UNSEONG|unseong,/.test(l)), '엔진에서 12운성이 계산·표시 외로 쓰임: ' + useLines.filter(l => !/const unseong =|unseong: unseong\(|unseongJwa: unseong\(|UNSEONG|unseong,/.test(l)).map(l => l.trim().slice(0, 60)).join(' | '));
const mod = fs.readFileSync(path.join(root, 'unseong-cycle.js'), 'utf8').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');
ok(!/fitScore|ownFit|\.score\b|LUCK_CFG|weights/.test(mod), '공통 모듈이 운세 점수를 읽거나 씀');
// 같은 사주를 두 번 계산해 점수가 같고, 모듈 호출이 엔진 결과를 바꾸지 않음
const a1 = M.compute({ year: 1985, month: 3, day: 9, hour: 14, minute: 0, gender: 'M', calendar: 'solar', school: 'eokbu' }), snap = JSON.stringify(a1.daeun.list.map(x => [x.ev.fitScore, x.score.total, x.unseong]));
U.natalHTML(M, a1, {}); U.daeunHTML(M, a1, M.daeunAt(a1, Date.UTC(2026, 10, 15)), {}); U.natalHTML(M, a1, { mode: 'jwa' });
ok(JSON.stringify(a1.daeun.list.map(x => [x.ev.fitScore, x.score.total, x.unseong])) === snap, '화면 조각을 그린 뒤 엔진 값이 바뀜');

// 5. 화면 연결: 옛 곡선·세기 점수·강중약 제거, 새 카드 연결
for (const [pat, msg] of [
  [/<script src="engine\.js"><\/script>\n<script src="unseong-cycle\.js"><\/script>/, '공통 모듈 스크립트가 엔진 바로 뒤에 없음'],
  [/<h2>내 사주의 12운성<\/h2>[\s\S]{0,200}\$\{unNatalHTML\(ch\)\}/, '원국 탭에 내 사주의 12운성 카드가 없음'],
  [/\$\{renderEasy\(\)\}[\s\S]*<h2>사주 원국<\/h2>[\s\S]*\$\{table\}\s*<\/section>\s*<section class="card">\s*<div class="card-h"><h2>내 사주의 12운성/, '내 사주의 12운성이 원국 표 바로 아래가 아님'],
  [/\$\{unDaeunHTML\(ch, du\)\}/, '대운 카드에 12운성 변화가 없음'],
  [/a\.startsWith\('us-p:'\)[^\n]*usSwap\('natal'/, '원국 카드 선택 처리 없음'], [/a\.startsWith\('us-du:'\)[^\n]*usSwap\('daeun'/, '대운 선택 처리 없음'], [/a\.startsWith\('un:'\)[^\n]*usSwap\('natal'/, '봉법·좌법 전환이 카드 전체를 다시 그리지 않음'],
  [/unSheetHTML\(key\) : ''\}\s*\n\s*\$\{body\}/, '용어 팝업 연결 없음'], [/\.us-tl \{/, '타임라인 CSS 없음'], [/@media \(max-width: 560px\) \{\s*\n\s*\.us-cards \{ grid-template-columns: repeat\(2/, '모바일 2열 CSS 없음'],
  [/:root\[data-theme="dark"\] \{\s*\n\s*--us-c0/, '어두운 테마 색 토큰 없음']]) ok(pat.test(html), msg);
for (const [pat, msg] of [[/UN_POW|unCurve|unTier|에너지 곡선|class="unc"|세기 \$\{/, '옛 곡선·세기 점수 코드가 남음'], [/\.unc \{|\.unchip/, '옛 곡선 CSS가 남음']]) ok(!pat.test(html), msg);

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + [...new Set(fails)].slice(0, 25).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 배속표 ${cellsChecked}칸 · 사주 ${n}개(시주 미상 ${noHour}개, 현재 대운 ${duN}개) · 봉법/좌법/대운 기준 · 네 칸 해석 · 점수 분리 · 화면 연결`);
