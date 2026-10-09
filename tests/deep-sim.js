// 깊이 풀이(Deep) 검증:  node tests/deep-sim.js
// 여러 사주(남·여·시간 모름 포함)로 모든 섹션을 만들어 오류 없이 나오는지, 핵심 문구가 들어 있는지 확인한다. 엔진은 읽기만 한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['saju-data', 'deep', 'deep-life', 'deep-time'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, D = R.Deep, fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 8), strip = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const births = [[1992, 6, 23, 1, 'M'], [1988, 11, 2, 14, 'F'], [1975, 3, 9, 7, 'M'], [2001, 8, 30, 22, 'F'], [1964, 12, 25, 0, 'F'], [1999, 1, 1, 12, 'M'], [1999, 1, 1, null, 'F']];
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });

console.log('1. 모든 섹션 생성');
const ids = Object.keys(D.SECTIONS);
ok(ids.length === 14 && D.PLACEMENT.length === 14, '섹션 14개 · 배치 14곳: ' + ids.length);
births.forEach(b => {
  const ch = mk(...b), sd = R.SajuData.build(ch, { now }), H = { M, ch, sd, now, name: '홍길동', assets: { 'car:경': '/x/car.webp' } }, tag = b.join('-');
  ids.forEach(id => {
    let o; try { o = D.SECTIONS[id](H); } catch (e) { fails.push(tag + ' ' + id + ' 오류: ' + e.message); return; }
    ok(o && o.title && o.scenes.length >= 1, tag + ' ' + id + ' 비어 있음');
    const all = o.scenes.map(s => s.html).join('');
    ok(!/undefined|NaN|\[object/.test(all), tag + ' ' + id + ' 에 undefined/NaN: ' + (all.match(/.{20}(undefined|NaN|\[object).{20}/) || [''])[0]);
    ok(o.scenes.every(s => /^<section /.test(s.html) && s.sceneType === 'life'), tag + ' ' + id + ' 화면 조각 형식');
  });
});

console.log('2. 내용 점검(1992-06-23 01시 남)');
{
  const ch = mk(1992, 6, 23, 1, 'M'), sd = R.SajuData.build(ch, { now }), H = { M, ch, sd, now, name: '', assets: {} }, T = id => strip(D.SECTIONS[id](H).scenes.map(s => s.html).join(' '));
  ok(/경\(庚金\)/.test(T('deep_car')) && /강철|오프로더|지프/.test(T('deep_car')), '자동차: 일간 경금 → 강철 오프로더');
  ok(/엔진 출력/.test(T('deep_car')) && /브레이크/.test(T('deep_car')) && /단점/.test(T('deep_car')) && /장점/.test(T('deep_car')), '자동차: 부품(엔진·브레이크)과 장·단점');
  ok(/장점/.test(T('deep_proscons')) && /단점/.test(T('deep_proscons')) && /근거 ·/.test(T('deep_proscons')), '솔직한 장단점: 근거 포함');
  ok(/12운성/.test(T('deep_stages')) && /목욕/.test(T('deep_stages')) && /연살\(도화살\)|재살|지살/.test(T('deep_stages')) && /타고났으니/.test(T('deep_stages')), '12운성·12신살 쉬운 설명 + "타고났으니"');
  ok(/창작|기술|교육/.test(T('deep_jobs')) && /적합도/.test(T('deep_jobs')) && /부담/.test(T('deep_jobs')), '직업 후보: 적합도·부담도');
  ok(/상|호랑이|토끼|사슴|강아지|여우|곰|공룡|수달|고양이|늑대|판다|다람쥐/.test(T('deep_spouse')) && /직업/.test(T('deep_spouse')) && /만날 가능성/.test(T('deep_spouse')) && /인연이 움직이는 시기/.test(T('deep_spouse')), '배우자: 동물상·직업·만날 곳·시기');
  const ij = T('deep_ilju'); ok(/TOP 5/.test(ij) && (ij.match(/점/g) || []).length >= 15 && /서로 끌리는/.test(ij) && /부딪히/.test(ij), '일주 궁합: 잘 맞는·끌리는·부딪히는 후보와 점수');
  ok(/전생/.test(T('deep_past')) && /결말/.test(T('deep_past')) && /드라마/.test(T('deep_past')), '전생: 이야기·결말');
  const dw = D.SECTIONS.deep_daewoon(H), dwt = strip(dw.scenes.map(s => s.html).join(' ')); ok(dw.rows.length === 10 && /대운/.test(dwt) && /20대|30대/.test(dwt) && /기회를 잡을 대운 후보/.test(dwt) && /방어해야 할 대운 후보/.test(dwt) && /<svg/.test(dw.scenes[0].html), '대운: 10개 · 나이대 · 기회/방어 후보 · 그래프');
  ok(/시기|운/.test(dw.rows[0].title) && dw.rows.every(r => r.title.length > 10), '대운 제목이 문장으로 붙는다: ' + dw.rows[2].title);
  const sw = D.SECTIONS.deep_seun(H); ok(sw.rows.length === 10 && sw.rows[0].year === 2026 && /기회의 해/.test(strip(sw.scenes[2].html)) && /방어의 해/.test(strip(sw.scenes[2].html)), '세운: 앞으로 10년');
  const wl = D.SECTIONS.deep_wolun(H); ok(wl.rows.length === 12 && /월/.test(strip(wl.scenes[1].html)) && /기회의 달/.test(strip(wl.scenes[2].html)) && /대운/.test(strip(wl.scenes[0].html)), '월운: 12개월 + 대운→세운→월운 연결');
  const rm = T('deep_remedy'); ok(/명리 근거/.test(rm) && /용신/.test(rm) && /조후|기후/.test(rm), '개운법: 명리 근거');
  const pl = D.SECTIONS.deep_places(H), plt = strip(pl.scenes.map(s => s.html).join(' ')); ok((pl.scenes[1].html.match(/dp-place/g) || []).length === 7 && /점/.test(plt) && /용신|희신|한신|구신|기신/.test(plt), '명소: 순위·점수·명리 이유');
  ok(/car:경/.test(D.SECTIONS.deep_car({ ...H, assets: { 'car:경': '/a.webp' } }).scenes[0].html) && /src="\/a.webp"/.test(D.SECTIONS.deep_car({ ...H, assets: { 'car:경': '/a.webp' } }).scenes[0].html), '이미지 슬롯: 있으면 그림, 없으면 자리표시');
  ok(/dp-ph/.test(D.SECTIONS.deep_car(H).scenes[0].html), '이미지가 없으면 자리표시');
}

console.log('3. 챕터 끼워 넣기');
{
  const ch = mk(1992, 6, 23, 1, 'M'), sd = R.SajuData.build(ch, { now }), H = { M, ch, sd, now, name: '', assets: {} };
  const rep = { meta: {}, chapters: ['c01', 'c02', 'c03', 'c04', 'c05', 'c06', 'c10', 'c12', 'c14', 'c15', 'c17', 'c18', 'c19', 'c20'].map((b, i) => ({ id: b, base: b, no: i + 1, act: 1 + (i > 8 ? 3 : 0), project: 'full', scenes: [] })) };
  R.Deep.augment(rep, H); const bases = rep.chapters.map(c => c.base);
  ok(bases[bases.indexOf('c03') + 1] === 'deep_car', '자동차 챕터는 타고난 성격(c03) 바로 뒤');
  ok(rep.chapters.length === 14 + 14 - 1 && rep.chapters.every((c, i) => c.no === i + 1), '상세 전생이 이전 요약을 대체하고 번호가 다시 매겨짐');
  ok(!bases.includes('c14') && bases.filter(b => b === 'deep_past').length === 1, '전생 이야기는 상세 챕터 하나만 남음');
  ok(bases.indexOf('deep_places') === bases.indexOf('deep_remedy') + 1 && bases.indexOf('deep_remedy') === bases.indexOf('c19') + 1, '개운법 근거·명소가 개운 챕터 뒤');
  const n = rep.chapters.length; R.Deep.augment(rep, H); ok(rep.chapters.length === n, '두 번 불러도 중복되지 않는다');
  const small = { chapters: [{ id: 'c20', base: 'c20', no: 1, act: 5, scenes: [] }] }; R.Deep.augment(small, H); ok(small.chapters.length === 1, '앵커가 없으면 아무것도 끼우지 않는다');
}
if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.slice(0, 40).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\n깊이 풀이 검증 모두 통과');
