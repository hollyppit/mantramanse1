// 서술 시점(전지적 관찰자, 소설체) 검증:  node tests/narrator-sim.js
// 주인공 호칭·조사 자동 선택, 이름의 서버 미전송(자리표시자), AI 응답 문체 검증.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'textstyle'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, N = R.Narrator;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const mk = g => M.compute({ year: 1990, month: 5, day: 15, hour: 14, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const now = Date.UTC(2026, 9, 5), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);

// 시놉시스 템플릿: 모든 변수·조사 쌍을 한 번씩 쓴다(소설체)
const SYN = '{hero은는} 새벽 골목을 걸었다. {hero이가} 붙잡은 것은 오래된 약속이었고, 사람들은 {hero을를} 조용히 지켜보았다. {hero의} 발걸음은 느렸다. 다음 장면에서 {hero이가} 해야 할 선택은 멈추는 일이다.';
console.log('1. 시놉시스 template 출력 (5가지)');
const cases = [['지수(받침 없음)', '지수', 'M'], ['민준(받침 있음)', '민준', 'M'], ['Jane(영문)', 'Jane', 'F'], ['이름 없음(남)', '', 'M'], ['이름 없음(여)', '', 'F']];
const WANT = { '지수': '지수는 새벽 골목을 걸었다. 지수가 붙잡은 것은 오래된 약속이었고, 사람들은 지수를 조용히 지켜보았다. 지수의 발걸음은 느렸다. 다음 장면에서 지수가 해야 할 선택은 멈추는 일이다.',
  '민준': '민준은 새벽 골목을 걸었다. 민준이 붙잡은 것은 오래된 약속이었고, 사람들은 민준을 조용히 지켜보았다. 민준의 발걸음은 느렸다. 다음 장면에서 민준이 해야 할 선택은 멈추는 일이다.',
  'Jane': 'Jane는 새벽 골목을 걸었다. Jane가 붙잡은 것은 오래된 약속이었고, 사람들은 Jane를 조용히 지켜보았다. Jane의 발걸음은 느렸다. 다음 장면에서 Jane가 해야 할 선택은 멈추는 일이다.',
  M: '그는 새벽 골목을 걸었다. 그가 붙잡은 것은 오래된 약속이었고, 사람들은 그를 조용히 지켜보았다. 그의 발걸음은 느렸다. 다음 장면에서 그가 해야 할 선택은 멈추는 일이다.',
  F: '그녀는 새벽 골목을 걸었다. 그녀가 붙잡은 것은 오래된 약속이었고, 사람들은 그녀를 조용히 지켜보았다. 그녀의 발걸음은 느렸다. 다음 장면에서 그녀가 해야 할 선택은 멈추는 일이다.' };
cases.forEach(([label, name, g]) => {
  const sd = R.SajuData.build(mk(g), { now }), out = R.Rules.tpl(SYN, N.heroVars(sd, name)), want = WANT[name || g];
  console.log('   [' + label + '] ' + out); ok(out === want, label + ' 조사 오류: ' + out); ok(!/\{hero/.test(out), label + ' 치환 안 된 변수');
});
console.log('2. josa 규칙');
[['민준', '은/는', '은'], ['지수', '은/는', '는'], ['영희', '이/가', '가'], ['철수', '이/가', '가'], ['길동', '을/를', '을'], ['서연', '과/와', '과'], ['하나', '과/와', '와'], ['민준', '이라/라', '이라'], ['지수', '이라/라', '라'], ['서울', '으로/로', '로'], ['집', '으로/로', '으로'], ['숲', '으로/로', '으로'], ['Tom', '은/는', '는'], ['A1', '이/가', '가']].forEach(([w, k, e]) => ok(N.josa(w, k) === e, 'josa ' + w + ' ' + k + ' → ' + N.josa(w, k) + ' (기대 ' + e + ')'));

console.log('3. 리포트 빌드 · 이름 미전송 · AI 검증');
const sdM = R.SajuData.build(mk('M'), { now }), repN = R.Compose.build(sdM, lib, cfg, { name: '지수' }), repX = R.Compose.build(sdM, lib, cfg);
const pay = JSON.stringify(R.Compose.aiPayload(repN));
ok(!/지수/.test(pay), 'AI 페이로드에 실제 이름이 없다');
ok(JSON.stringify(R.Compose.aiPayload(repN)) === JSON.stringify(R.Compose.aiPayload(repX)), '이름과 무관하게 같은 페이로드(캐시 키 동일)');
ok(!/지수/.test(JSON.stringify(repN.meta.key)) && repN.meta.key === repX.meta.key, 'meta.key 가 이름에 의존하지 않는다');
const c1 = repN.chapters[1], idc = c1.id, tplHead = (c1.tpl || {}).headline || c1.headline;
const goodAi = { chapters: [{ id: idc, headline: '{hero은는} 오래 마음에 담아 둔 사람이다', lead: '{hero이가} 먼저 입을 열지 못했던 이유가 있었다.' }] };
const r1 = R.Compose.build(sdM, lib, cfg, { name: '지수' }); R.Compose.applyAi(r1, goodAi);
ok(r1.chapters[1].headline === '지수는 오래 마음에 담아 둔 사람이다' && r1.chapters[1].interpretation === '지수가 먼저 입을 열지 못했던 이유가 있었다.', '응답의 {hero…} 를 로컬에서 치환');
const r1b = R.Compose.build(sdM, lib, cfg); R.Compose.applyAi(r1b, goodAi);
ok(r1b.chapters[1].headline === '그는 오래 마음에 담아 둔 사람이다', '이름 없으면 그는');
for (const [label, bad] of [['당신', { headline: '당신은 오래 마음에 담아 둔 사람입니다', lead: '좋은 흐름이다.' }], ['해요체', { headline: '{hero은는} 조용한 사람입니다', lead: '표현을 어려워해요.' }], ['~하세요', { headline: '{hero은는} 조용한 사람이다', lead: '오늘은 쉬어 가세요.' }], ['엉뚱한 자리표시자', { headline: '{name}은 조용한 사람이다', lead: '좋은 흐름이다.' }]]) {
  const r = R.Compose.build(sdM, lib, cfg, { name: '지수' }), before = r.chapters[1].headline + '|' + r.chapters[1].interpretation; R.Compose.applyAi(r, { chapters: [Object.assign({ id: idc }, bad)] });
  ok(r.chapters[1].headline + '|' + r.chapters[1].interpretation === before, label + ' 포함 응답은 template 유지');
}
console.log('4. 글자 스타일 역할 분리');
const T = R.TextStyle; ok(T.NARR.every(k => T.ROLES[k]) && T.NARR.join() === 'scene.caption,insight.lead,choice.line', '서술 역할 3종');
ok(Object.keys(T.ROLES).every(k => /^[a-z]+[.][a-z]+$/.test(k)), '역할 이름 형식');
ok(T.ROLES['explain.lead'] && T.NARR.indexOf('explain.lead') < 0 && T.NARR.indexOf('insight.fact') < 0, 'UI 역할은 서술 목록 밖');
const mv = R.Rules.tpl('다음 장면에서 {hero이가} 해야 할 선택은 쉬는 일이다.', R.Compose.build(sdM, R.Compose.library({ modules: [] }), cfg, { name: '민준' }).meta.heroVars); ok(mv === '다음 장면에서 민준이 해야 할 선택은 쉬는 일이다.', 'choice 형식 치환');
console.log(fails.length ? '\n실패 ' + fails.length + '건:\n - ' + fails.join('\n - ') : '\n모두 통과');
process.exit(fails.length ? 1 : 0);
