// 일간 소개·일주 각성 기본 설명 문구 검증:  node tests/intro-text-sim.js
const fs = require('fs'), path = require('path'), vm = require('vm');
globalThis.window = globalThis;
vm.runInThisContext(fs.readFileSync(path.join(__dirname, '..', 'report/v2/intro-text.js'), 'utf8'));
const T = globalThis.ReportV2.IntroText, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const BAN = /(반드시|무조건|확정|100%|틀림없|질병|사망|이혼|수명|자녀)/;
const stems = T.STEMS.split(''), ps = T.all60();
ok(stems.length === 10 && ps.length === 60, '10일간 · 60일주');
stems.forEach(s => { const l = T.ilgan(s); ok(l.length === 4 && l.every(x => x && x.length <= 40 && !BAN.test(x)), '일간 ' + s + ' 4줄'); });
const seen = new Set();
ps.forEach(p => { const l = T.iju(p); ok(l.length === 4 && l.every(x => x && x.length <= 52 && !BAN.test(x) && !/undefined|NaN/.test(x)), '일주 ' + p + ' 4줄'); const k = l.join('|'); ok(!seen.has(k), '일주 문구 중복 ' + p); seen.add(k); });
ok(T.iju('갑축').length === 0 && T.iju('xx').length === 0 && T.ilgan('x').length === 0, '잘못된 입력은 빈 배열');
console.log('일간 예) 경\n  ' + T.ilgan('경').join('\n  ')); console.log('일주 예) 경오\n  ' + T.iju('경오').join('\n  ')); console.log('일주 예) 갑자\n  ' + T.iju('갑자').join('\n  ')); console.log('일주 예) 계해\n  ' + T.iju('계해').join('\n  '));
console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n모두 통과 (일간 10 · 일주 60, 각 4줄)'); process.exit(fails.length ? 1 : 0);
