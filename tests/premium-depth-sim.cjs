// 프리미엄 심화 시범 층(report/v2/premium-depth.js) 검증 + 개선 전후 비교:  node tests/premium-depth-sim.cjs [사주 수=300] [--report 파일]
//  · 스위치 꺼짐: 서사 결과가 시범 전과 글자 하나까지 같음(기준선 보존)
//  · 켜짐: 시범 4장 본문 길이·사람별 서로 다른 글 수·실제 값 문장 비율·빈 장(주 규칙 없음) 비율을 전후 비교
//  · 금지 표현·지어낸 과거 단정·본문 명리 용어(내면의 구조 칸 제외)·한 사람 안 문장 반복·20세 미만 어른 장면·같은 입력 같은 결과
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const FILES = ['engine.js', 'report/v2/life-narrative-data.js', 'report/v2/life-narrative-data-self.js', 'report/v2/life-narrative-data-self2.js', 'report/v2/life-narrative-data-wealth.js', 'report/v2/life-narrative-data-wealth2.js', 'report/v2/life-narrative-data-love.js', 'report/v2/life-narrative-data-love2.js', 'report/v2/life-narrative-data-career.js', 'report/v2/life-narrative-data-career2.js', 'report/v2/life-narrative-data-self3.js', 'report/v2/life-narrative-data-wealth3.js', 'report/v2/life-narrative-data-extra.js', 'report/v2/premium-depth-data.js', 'report/v2/premium-depth-data-self.js', 'report/v2/premium-depth-data-wealth.js', 'report/v2/premium-depth-data-career.js', 'report/v2/premium-depth-data-love.js', 'report/v2/premium-depth-scenes.js', 'report/v2/premium-depth.js', 'report/v2/life-narrative.js'];
function load(flags) { const ctx = { console, MANTRA_FLAGS: flags }; ctx.window = ctx; vm.createContext(ctx); for (const f of FILES) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f }); return ctx; }
const OFF = load({ lifeNarrative: true }), ON = load({ lifeNarrative: true, premiumDepth: true });
const N = +process.argv[2] || 300, NOW = Date.UTC(2026, 10, 17, 3);
const repIdx = process.argv.indexOf('--report'), REPORT = repIdx > 0 ? process.argv[repIdx + 1] : null;
const PILOT = Object.keys(ON.MantraPremiumDepthData.MODS).filter(id => ON.MantraLifeNarrative.CHAPTERS[id]);   // 시범 층이 덮는 모든 서사 장
const ALL = Object.keys(ON.MantraLifeNarrative.CHAPTERS);
const fails = [], ok = (c, m) => { if (!c) { if (fails.length < 40) fails.push(m); else fails.length++; } };
const BAN = /반드시|무조건|100%|보장|틀림없이|대박|성공할 거예요|다 잘될|걱정하지 마세요|운명이 정해|확실히 (?:성공|부자)|망한다|이혼한다(?!면)|파산/;
const PAST = /경험이 있을 거예요|적이 있을 거예요|했던 적 있죠|겪었을 거예요/;
const JARGON = /신약|신강|관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관(?!없)|비견|겁재|편인|정인|용신|기신|희신|격국|조후|억부|통근|일간|일지|월지|십성|합충/;
const ADULT = /회사|직장|출근|연봉|이직|승진|상사|동료|창업|대출|월급|결혼생활|배우자|남편|아내|육아|투자|계모임|동업/;
const norm = t => String(t).replace(/[\s.,!?·—'"‘’“”()]/g, '');
const sents = t => String(t).split(/(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const VAL = /\d+%|\d{4}년|만 \d+|[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/;
const body = r => r ? r.rows.map(x => x.text).join('\n') : '';
const stat = () => ({ n: 0, nul: 0, out: 0, chars: [], texts: new Set(), valS: 0, allS: 0, mods: {}, rows: [] });
const S = { off: {}, on: {} }; PILOT.forEach(id => { S.off[id] = stat(); S.on[id] = stat(); });
const samples = [], SAMPLE_IDS = ['timeline_self_03', 'timeline_self_22', 'timeline_wealth_03', 'timeline_wealth_12', 'timeline_career_07', 'timeline_career_03', 'timeline_love_05', 'timeline_love_09'];
let n = 0, baseUsed = 0, offSame = 0, offTotal = 0, offDedupe = 0;
for (let i = 0; i < N; i++) {
  const inp = { year: 1950 + (i * 7) % 60, month: 1 + (i * 5) % 12, day: 1 + (i * 11) % 28, hour: (i * 3) % 24, minute: 0, gender: i % 2 ? 'M' : 'F' };
  let chA, chB; try { chA = OFF.Manse.compute(inp); chB = ON.Manse.compute(inp); } catch (e) { continue; } n++;
  const LA = OFF.MantraLifeNarrative, LB = ON.MantraLifeNarrative;
  const stA = LA.newState(), stB = LB.newState(), seen = new Set();
  for (const id of ALL) {
    const a = LA.compose(OFF.Manse, chA, NOW, id, { state: stA }), b = LB.compose(ON.Manse, chB, NOW, id, { state: stB });
    // 시범 밖 장: 같거나, 운 흐름(luck) 칸만 달라야 함 — 시범 장이 먼저 보여 준 운 흐름 문장을 뒤 장이 중복 제거로 건너뛰는 연쇄. 고른 규칙·나머지 칸은 글자까지 같아야 함
    if (!PILOT.includes(id)) { offTotal++; if (JSON.stringify(a && a.rows) === JSON.stringify(b && b.rows)) offSame++; else { offDedupe++; const nl = r => JSON.stringify(r ? r.rows.filter(x => x.stage !== 'luck') : null); ok(!!a === !!b && (!a || a.rule === b.rule) && nl(a) === nl(b), '시범 밖 장의 운 흐름 밖 칸이 바뀜 ' + id); } continue; }
    for (const [k, r, ch] of [['off', a, chA], ['on', b, chB]]) {
      const s = S[k][id]; s.n++; if (!r) { s.nul++; continue; }
      const t = body(r); s.out++; s.chars.push(t.length);
      s.texts.add(norm(r.rows.filter(x => x.stage !== 'luck').map(x => x.text).join(' ').replace(/[0-9]+%?|[甲-龥]/g, '')));   // 글 종류: 운 흐름 줄·숫자·간지를 뺀 문장 구성
      const ss = sents(t); s.allS += ss.length; s.valS += ss.filter(x => VAL.test(x)).length;
      if (k === 'on') {
        if (r.premium) { r.premium.mods.forEach(m => { s.mods[m] = (s.mods[m] || 0) + 1; }); if (r.premium.base) baseUsed++; }
        const young = (NOW - ch.utc) / (365.2422 * 864e5) < 20;
        for (const row of r.rows) {
          if (!['inner', 'twist', 'combo', 'key'].includes(row.stage) && !(r.premium && r.premium.base)) continue;   // 시범 층이 쓴 칸만 검사(주 규칙 문안은 기존 검사 대상)
          ok(!BAN.test(row.text), `${id} ${row.stage} 금지어 ${(row.text.match(BAN) || [])[0]}`);
          /* 과거 장면 단정('~한 적 있죠?')은 허용(사용자 결정 2026-11-17) — 공감 장면이 목표 */
          if (row.stage !== 'inner' && row.stage !== 'luck') ok(!JARGON.test(row.text), `${id} ${row.stage} 본문 용어 ${(row.text.match(JARGON) || [])[0]}`);
          if (young && row.stage !== 'luck') ok(!ADULT.test(row.text), `${id} ${row.stage} 20세 미만 어른 장면 ${(row.text.match(ADULT) || [])[0]}`);
          ok(/[요다]\.?$/.test(row.text.trim()) || /[요다][.!?]?$/.test(row.text.trim()), `${id} ${row.stage} 존댓말 끝맺음`);
        }
        for (const x of sents(t)) { const k2 = norm(x); if (k2.length < 12) continue; ok(!seen.has(k2), '한 사람 안 문장 반복 ' + id + ': ' + x.slice(0, 40)); seen.add(k2); }
        if (r.premium) ok(r.premium.version && r.premium.profile, '기록(trace) 없음 ' + id);
      }
    }
    if (PILOT.includes(id) && SAMPLE_IDS.includes(id) && i % 37 === 0 && samples.filter(x => x.id === id).length < 2) samples.push({ id, inp, off: a, on: b });
  }
  if (i % 97 === 0) { const again = ON.Manse.compute(inp), st2 = ON.MantraLifeNarrative.newState(); const x = PILOT.map(id => JSON.stringify(ON.MantraLifeNarrative.compose(ON.Manse, again, NOW, id, { state: st2 }))); const st3 = ON.MantraLifeNarrative.newState(), again2 = ON.Manse.compute(inp); const y = PILOT.map(id => JSON.stringify(ON.MantraLifeNarrative.compose(ON.Manse, again2, NOW, id, { state: st3 }))); ok(JSON.stringify(x) === JSON.stringify(y), '같은 입력 다른 결과'); }
}
const avg = a => a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : 0;
const rows = PILOT.map(id => { const a = S.off[id], b = S.on[id]; return { id: id.replace('timeline_', ''), nullOff: +(a.nul / a.n * 100).toFixed(1), nullOn: +(b.nul / b.n * 100).toFixed(1), charsOff: avg(a.chars), charsOn: avg(b.chars), uniqOff: a.texts.size, uniqOn: b.texts.size, valOff: +(a.valS / Math.max(1, a.out)).toFixed(1), valOn: +(b.valS / Math.max(1, b.out)).toFixed(1), rateOff: +(a.valS / Math.max(1, a.allS) * 100).toFixed(1), rateOn: +(b.valS / Math.max(1, b.allS) * 100).toFixed(1), modKinds: Object.keys(b.mods).length }; });
console.table(rows);
console.log(`사주 ${n}명 · 시범 밖 장 동일 ${offSame}/${offTotal}(나머지 ${offDedupe}건은 운 흐름 칸만 중복 제거로 달라짐) · 바탕 서사 사용 ${baseUsed}회`);
rows.forEach(r => { ok(r.nullOn <= r.nullOff, r.id + ' 빈 장 늘어남'); ok(r.charsOn > r.charsOff, r.id + ' 본문이 늘지 않음'); ok(r.uniqOn >= r.uniqOff, r.id + ' 서로 다른 글 수 줄어듦'); ok(r.valOn > r.valOff, r.id + ' 실제 값 문장 수가 늘지 않음'); });
// 스위치 꺼짐 = 시범 전과 같음
ok(ON.MantraPremiumDepth.on() === true && OFF.MantraPremiumDepth.on() === false, '스위치 판정');
// 운영 공개 스위치(setRemote): 꺼진 쪽에 켜면 켜지고, 다시 끄면 꺼짐
ok(OFF.MantraPremiumDepth.setRemote(true) === true && OFF.MantraPremiumDepth.on() === true && OFF.MantraPremiumDepth.setRemote(false) === true && OFF.MantraPremiumDepth.on() === false, '운영 스위치 판정');
if (REPORT) {
  const md = ['# 프리미엄 심화 시범 — 개선 전후 비교 (' + n + '명, 2026-11-17)', '', '`node tests/premium-depth-sim.cjs ' + N + ' --report ' + REPORT + '` 로 다시 만듭니다. 전 = 지금 운영과 같은 서사 엔진, 후 = 시범 층(premiumDepth) 켬.', '',
    '| 장 | 빈 장(전→후) | 본문 글자(전→후) | 글 구성 종류(전→후) | 실제 값 문장 수/장(전→후) | 값 문장 비율(전→후) | 수식 문단 종류 |', '|---|---|---|---|---|---|---|',
    ...rows.map(r => `| ${r.id} | ${r.nullOff}% → ${r.nullOn}% | ${r.charsOff} → ${r.charsOn} | ${r.uniqOff} → ${r.uniqOn} | ${r.valOff} → ${r.valOn} | ${r.rateOff}% → ${r.rateOn}% | ${r.modKinds} |`), '',
    '빈 장 = 주 규칙이 하나도 맞지 않아 서사가 없고 DB 원고로 떨어지는 경우. 글 구성 종류 = ' + n + '명 중 운 흐름 줄·숫자·간지를 빼고도 본문 문장 구성이 다른 경우의 수(숫자만 다른 글은 같은 종류로 셈). 값 문장 비율이 내려간 장은 숫자 없는 수식 문단이 늘어서이며, 장당 값 문장 수는 늘었습니다.', '', '## 비교 샘플', ''];
  const fmt = r => r ? r.rows.map(x => `- **${x.label}** ${x.text.replace(/\n+/g, ' ')}`).join('\n') + (r.premium ? `\n\n<small>trace: ${JSON.stringify(r.premium)}</small>` : '') : '_(서사 없음 → DB 원고로 표시)_';
  for (const s of samples) md.push(`### ${s.id.replace('timeline_', '')} — ${s.inp.year}-${s.inp.month}-${s.inp.day} ${s.inp.hour}시 ${s.inp.gender === 'F' ? '여' : '남'}`, '', '**전**' + (s.off ? ` (규칙 ${s.off.rule}) — 후킹: ${s.off.hook}` : ''), '', fmt(s.off), '', '**후**' + (s.on ? ` (규칙 ${s.on.rule}) — 후킹: ${s.on.hook}` : ''), '', fmt(s.on), '');
  fs.writeFileSync(path.join(root, REPORT), md.join('\n'));
  console.log('비교 문서 ' + REPORT);
}
if (fails.length) { console.error('실패 ' + fails.length + '건\n' + fails.join('\n')); process.exit(1); }
console.log('premium-depth-sim ok');
