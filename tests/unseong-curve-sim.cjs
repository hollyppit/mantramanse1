// 12운성 에너지 곡선 검증
//   node tests/unseong-curve-sim.cjs
// 세기 표(상징값)의 순서·구간, 엔진의 12운성 순서와의 일치, 원국·대운·용어 팝업 곡선의 내용, 화면 연결을 단언한다. 하나라도 어기면 종료 코드 1.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const eng = fs.readFileSync(path.join(root, 'engine.js'), 'utf8'); const ea = eng.indexOf('var MANSE_DATA'), eb = eng.indexOf('})(typeof window', ea);
vm.runInThisContext(eng.slice(ea, eng.indexOf('\n', eb))); const M = globalThis.Manse;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

const a = html.indexOf('  // ───────────── 12운성 에너지 곡선 ─────────────'), b = html.indexOf('  // ───────────── 차트 ─────────────', a);
ok(a > 0 && b > a, 'index.html에서 12운성 곡선 코드를 찾지 못함');
const S = { ch: null };
const ctx = { M, S, NS: 'http://www.w3.org/2000/svg', Math, esc: x => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), term: (t, l) => l ?? t };
vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + ';this.X={UN_ORDER,UN_POW,UN_MEAN,UN_PHASE,unTier,unCurve,unNatalHTML,unDaeunHTML,unSheetHTML,unSmooth};', ctx);
const X = ctx.X;

// 1. 단계 순서는 엔진과 같다: 갑(양간)은 亥에서 장생, 이후 지지 순서대로 12단계
const seq = []; for (let k = 0; k < 12; k++) seq.push(M.unseong(0, (11 + k) % 12));
ok(JSON.stringify(seq) === JSON.stringify(X.UN_ORDER), '곡선의 단계 순서가 엔진(M.unseong)과 다름: ' + seq.join(','));
ok(new Set(X.UN_ORDER).size === 12, '단계가 12개가 아님');

// 2. 세기 표(상징값)
const P = X.UN_POW;
ok(X.UN_ORDER.every(n => Number.isInteger(P[n]) && P[n] >= 0 && P[n] <= 100 && X.UN_MEAN[n]), '세기 값이 0~100 정수가 아니거나 뜻풀이가 없음');
ok(Math.max(...Object.values(P)) === P['제왕'] && P['제왕'] === 100, '제왕이 가장 세지 않음');
ok(Math.min(...Object.values(P)) === P['절'], '절이 가장 약하지 않음');
ok(P['건록'] > P['관대'] && P['관대'] > P['장생'] && P['장생'] > P['쇠'] && P['쇠'] > P['병'] && P['병'] > P['사'], '올라감·내려감 순서가 맞지 않음');
ok(P['절'] < P['태'] && P['태'] < P['양'] && P['양'] < P['장생'], '새 출발 구간(절→태→양→장생)이 올라가는 모양이 아님');
const tiers = n => X.unTier(P[n]);
ok(['장생', '관대', '건록', '제왕'].every(n => tiers(n) === '강'), '장생·관대·건록·제왕은 강이어야 함');
ok(['병', '사', '묘', '절', '태'].every(n => tiers(n) === '약'), '병·사·묘·절·태는 약이어야 함');
ok(['목욕', '쇠', '양'].every(n => tiers(n) === '중'), '목욕·쇠·양은 중이어야 함');
// 용어 사전의 설명과 어긋나지 않는다("장생·관대·건록·제왕은 힘이 좋은 단계, 쇠·병·사·묘·절은 힘이 약해지는 단계")
ok(X.UN_PHASE.map(p => p[0]).join() === '올라가는 때,내려가는 때,갈무리,새 출발 준비', '단계 구간 이름이 다름');
ok(X.UN_PHASE[0][1] === 0 && X.UN_PHASE[0][2] === 4 && X.UN_PHASE[3][2] === 11, '단계 구간 범위가 12단계를 덮지 않음');

// 3. 곡선 SVG
const svg = X.unCurve({ marks: [{ stage: '병', lab: '월지', color: 'red' }, { stage: '병', lab: '일지', color: 'blue', ring: true }, { stage: '제왕', lab: '년지', color: 'green' }], hi: '제왕' });
ok((svg.match(/class="term unst"/g) || []).length === 12, '단계 12개가 모두 눌러 볼 수 있게 그려지지 않음');
ok(!/NaN|undefined/.test(svg), 'SVG에 NaN/undefined가 있음');
ok(/월지/.test(svg) && /일지/.test(svg) && /년지/.test(svg), '표시한 점 이름이 SVG에 없음');
ok(X.UN_ORDER.every(n => svg.includes(`data-term="${n}"`)), '단계별 용어 연결이 빠짐');
ok(/opacity:0\.14/.test(svg), '강조한 단계(hi) 표시가 없음');
ok(!/NaN/.test(X.unSmooth([[0, 0], [10, 20], [20, 5], [30, 40]])), '곡선 경로 계산에 NaN');
ok(X.unCurve().includes('viewBox'), '빈 곡선이 그려지지 않음');

// 4. 원국·대운·용어 팝업 내용: 여러 사주에서 엔진 값과 일치
let seed = 1212; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
let n = 0, noHour = 0;
for (let i = 0; i < 80; i++) {
  let ch; try { ch = M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: i % 8 === 0 ? '' : Math.floor(rnd() * 24), minute: 0, gender: i % 2 ? 'M' : 'F', calendar: 'solar', school: 'eokbu' }); } catch (e) { continue; }
  S.ch = ch; n++;
  const keys = ['year', 'month', 'day', 'hour'].filter(k => ch.cells[k]); if (keys.length < 4) noHour++;
  const nat = X.unNatalHTML(ch), chips = (nat.match(/class="unchip"/g) || []).length;
  ok(chips === keys.length, `원국 곡선의 점 개수(${chips})가 기둥 수(${keys.length})와 다름`);
  keys.forEach(k => ok(nat.includes(`<b>${ch.cells[k].unseong}</b>`), `${k}지의 12운성 ${ch.cells[k].unseong}이 곡선 요약에 없음`));
  ok(/상징값/.test(nat) && /거꾸로 세는/.test(nat) && /좋고 나쁨이 아니라/.test(nat), '원국 곡선에 세기·길흉·음간 안내가 없음');
  const du = M.daeunAt(ch, Date.UTC(2026, 10, 2)), dae = X.unDaeunHTML(ch, du);
  ok((dae.match(/세<\/text>/g) || []).length >= ch.daeun.list.length, '대운 곡선에 10개의 나이 표시가 없음');
  if (du) ok(dae.includes(`${du.unseong}(세기 ${P[du.unseong]}`), '현재 대운의 12운성 설명이 없음');
  // 좌법(각 기둥 천간이 자기 지지에서 받는 힘)은 봉법(일간 기준)과 따로 찍는다: 원국 표의 작은 글씨 값(unseongJwa)과 같아야 한다
  const jw = X.unNatalHTML(ch, 'jwa');
  keys.forEach(k => ok(jw.includes(`<b>${ch.cells[k].unseongJwa}</b>`) && jw.includes(M.gzName(ch.pillars[k])), `${k}주의 좌법 ${ch.cells[k].unseongJwa}이 좌법 곡선 요약에 없음`));
  ok(jw.includes('data-act="un:jwa" aria-pressed="true"') && jw.includes('data-act="un:bong" aria-pressed="false"') && nat.includes('data-act="un:bong" aria-pressed="true"') && nat.includes('data-act="un:jwa" aria-pressed="false"'), '봉법·좌법 스위치 상태가 맞지 않음');
  const shJ = X.unSheetHTML('좌법'), shB = X.unSheetHTML('봉법');
  keys.forEach(k => { ok(shJ.includes(`<b>${ch.cells[k].unseongJwa}</b>`), `좌법 팝업이 ${k}주의 좌법 값을 쓰지 않음`); ok(shB.includes(`<b>${ch.cells[k].unseong}</b>`), `봉법 팝업이 ${k}지의 봉법 값을 쓰지 않음`); });
  // 봉법·좌법 차이 설명: 원국 카드와 봉법·좌법 팝업에만 붙고, 예시는 내 사주에서 두 값이 다른 기둥으로 만든다
  ok(nat.includes('봉법과 좌법의 차이') && shJ.includes('봉법과 좌법의 차이') && shB.includes('봉법과 좌법의 차이'), '봉법·좌법 차이 설명이 빠짐');
  ok(!X.unSheetHTML(X.UN_ORDER[i % 12]).includes('봉법과 좌법의 차이'), '단계 팝업에는 차이 설명이 붙지 않아야 함');
  const dk = ['month', 'year', 'hour'].find(q => ch.cells[q] && ch.cells[q].unseong !== ch.cells[q].unseongJwa);
  if (dk) ok(nat.includes('내 사주의 예') && nat.includes(`<b>${ch.cells[dk].unseong}</b>`) && nat.includes(`<b>${ch.cells[dk].unseongJwa}</b>`) && nat.includes(M.gzName(ch.pillars[dk])), `${dk}주 봉법·좌법 예시가 맞지 않음`);
  else ok(!nat.includes('내 사주의 예'), '두 값이 같은데 예시가 붙음');
  const key = X.UN_ORDER[i % 12], sh = X.unSheetHTML(key);
  ok(/봉법/.test(sh) && /좌법/.test(sh), `${key} 팝업에 봉법·좌법 구분 안내가 없음`);
  ok(sh.includes(`세기 <b>${P[key]}</b>`) && /내 사주에서는|내 사주의 네 지지에는 없습니다/.test(sh), `${key} 팝업 요약이 없음`);
  const mine = keys.filter(k => ch.cells[k].unseong === key).length; ok(mine === 0 || sh.includes('내 사주에서는'), `${key}: 내 사주에 있는데 안내가 없음`);
}
ok(n >= 60 && noHour >= 5, `검증한 사주가 적음(${n}개, 시주 미상 ${noHour}개)`);
S.ch = null; ok(/에너지 곡선/.test(X.unSheetHTML('장생')), '사주가 없을 때 팝업 곡선이 깨짐');

// 5. 화면 연결
for (const [pat, msg] of [
  [/<h2>12운성 에너지 곡선<\/h2>[\s\S]{0,200}\$\{unNatalHTML\(ch\)\}/, '원국 탭에 곡선 카드가 없음'], [/\$\{unDaeunHTML\(ch, du\)\}/, '대운 카드에 곡선이 없음'],
  [/unSheetHTML\(key\) : ''\}\s*\n\s*\$\{body\}/, '용어 팝업의 곡선이 설명 글 위에 있지 않음'], [/\.unc \{ display: block;/, '곡선 CSS가 없음'], [/\.unchip \{/, '요약 칩 CSS가 없음']]) ok(pat.test(html), msg);

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + fails.slice(0, 20).join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 사주 ${n}개(시주 미상 ${noHour}개) · 12단계 순서·세기 구간 · 원국/대운/용어 팝업 곡선 · 화면 연결`);
