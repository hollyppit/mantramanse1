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
// 오프닝 카드: 일간 한 문장(2줄) · 일주 카드 4요소. 60일주 전부 유효하고 서로 다르다
stems.forEach(s => { const c = T.ilganCard(s); ok(c && /^[一-鿿]+ · .+/.test(c.title) && c.line.split('\n').length === 2 && c.line.length <= 30 && !BAN.test(c.line), '일간 카드 ' + s); });
const seenC = new Set();
ps.forEach(p => { const c = T.ijuCard(p, '백진우', 'M'); ok(c && c.name === '백진우.' && c.film.endsWith('남자.') && /^[一-鿿]{2} · .+일주$/.test(c.title) && c.trait.includes('지만, ') && c.trait.length <= 60 && !BAN.test(c.film + c.trait) && !/undefined/.test(JSON.stringify(c)), '일주 카드 ' + p); if (c) seenC.add(c.film + c.trait); });
ok(seenC.size === 60, '일주 카드 60개가 모두 서로 다름: ' + seenC.size);
ok(T.ijuCard('경오', '', 'F').name === '오늘 이야기의 주인공.' && T.ijuCard('경오', '', 'F').film.endsWith('여자.') && T.ijuCard('갑축') === null, '이름 없음/여성/잘못된 입력');
console.log('카드 예) ' + JSON.stringify(T.ilganCard('경')) + '\n' + JSON.stringify(T.ijuCard('경오', '백진우', 'M'), null, 1));
console.log(fails.length ? '\n실패 ' + fails.length + '건\n' + fails.map(f => ' ✗ ' + f).join('\n') : '\n모두 통과 (일간 10 · 일주 60, 각 4줄)'); process.exit(fails.length ? 1 : 0);
