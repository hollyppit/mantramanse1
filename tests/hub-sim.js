// 무료 콘텐츠 허브 검증:  node tests/hub-sim.js
// ① 공용 타로 모듈(78장·이미지 파일명 규칙·읽기 조합·YES/NO·뽑기) ② 만세력 앱이 같은 데이터를 그대로 쓰는지 ③ 오늘의 운세가 엔진 값만 읽는지 ④ 확정 예언 금지어가 없는지
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const BANNED = /(반드시|무조건|확정|100%|틀림없|결혼합니다|파산|사망|이혼합니다|합격합니다|대박)/;

/* ① 타로 */
const Core = require(path.join(root, 'shared-core.js')), T = Core.Tarot;
ok(T.cards.length === 78, '카드는 78장이어야 한다: ' + T.cards.length);
ok(new Set(T.cards.map(c => c.id)).size === 78, '카드 id 중복');
ok(new Set(T.cards.map(c => c.file)).size === 78, '이미지 파일명 중복');
ok(T.cards.filter(c => c.suit === 'M').length === 22, '메이저 22장');
ok(T.cards.filter(c => c.suit === 'M').every(c => /^\d\d-[a-z-]+\.webp$/.test(c.file)), '메이저 파일명 규칙(00-fool.webp)');
ok(T.cards.filter(c => c.suit !== 'M').every(c => /^(wands|cups|swords|pentacles)-\d\d\.webp$/.test(c.file)), '마이너 파일명 규칙(wands-01.webp)');
ok(T.byId.M0.file === '00-fool.webp' && T.byId.M17.file === '17-star.webp' && T.byId.M21.file === '21-world.webp', '메이저 대표 파일명');
ok(T.cards.every(c => c.upright && c.reversed && Number.isInteger(c.scoreUp) && Number.isInteger(c.scoreRev) && c.imageUrl.startsWith('/report/hub/tarot/')), '카드 필드 누락');
let n = 0;
for (const c of T.cards) for (const rev of [false, true]) for (const m of Object.keys(T.modes)) {
  const r = T.read(c.id, rev, m); n++;
  ok(r && r.sections.length === 3 && r.sections.every(s => s[0] && s[1]) && r.headline && r.oneLine, `읽기 구조 ${c.id}/${rev}/${m}`);
  ok(!BANNED.test(JSON.stringify(r.sections) + r.headline), `금지어 ${c.id}/${rev}/${m}`);
  if (m === 'yesno') ok(['YES', 'MAYBE', 'NO'].includes(r.verdict) && r.verdictLabel, `YES/NO ${c.id}`);
}
// YES/NO 는 한 장의 점수 구간으로만 가른다: 가장 밝은 카드 → YES, 가장 어두운 카드 → NO
ok(T.read('M17', false, 'yesno').verdict === 'YES', 'The Star 정방향은 YES'); // 점수 +2
ok(T.read('M16', false, 'yesno').verdict === 'NO', 'The Tower 정방향은 NO'); // 점수 -2
ok(T.read('M0', false, 'today').score === 1, '점수는 기존 데이터 그대로');
// 뽑기: 겹치지 않고, rnd 를 주입하면 재현된다
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const d1 = T.draw(5, rnd); ok(d1.length === 5 && new Set(d1.map(x => x.id)).size === 5, '5장 중복 없음');
seed = 7; ok(JSON.stringify(T.draw(5, rnd)) === JSON.stringify(d1), '같은 난수면 같은 결과');
let rev = 0, tot = 0; for (let i = 0; i < 400; i++) T.draw(5).forEach(x => { tot++; if (x.rev) rev++; }); ok(rev / tot > 0.2 && rev / tot < 0.4, '역방향 비율 약 30%: ' + (rev / tot).toFixed(2));

/* ② 만세력 앱이 같은 데이터를 쓴다 */
const idx = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
ok(/<script src="shared-core\.js"><\/script>/.test(idx), 'index.html 이 shared-core.js 를 불러와야 한다');
ok(/window\.MantraCore\.Tarot\.legacy/.test(idx) && !/const TR_MAJ = \[/.test(idx), 'index.html 에 타로 데이터가 중복되면 안 된다');
ok(!/const DAYMODE = \{/.test(idx) && /window\.MantraCore\.DAYMODE/.test(idx), 'DAYMODE 는 공용 모듈에서 읽는다');
for (const k of ['TR_MAJ', 'TR_SUIT', 'TR_RANK', 'TR_MIN', 'TR', 'TR_TOPIC', 'TR_SPREAD', 'TR_BAND', 'TR_ADV']) ok(T.legacy[k] != null, '공용 모듈 legacy.' + k);
ok(Object.keys(T.legacy.TR).length === 78, 'legacy TR 78장');

/* ③ 오늘의 운세: 엔진 값만 읽는다 */
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis; globalThis.document = { createElement() { return {}; }, addEventListener() { }, querySelector() { return null; }, head: { appendChild() { } } };
globalThis.location = { hostname: 'x', search: '', hash: '' };
globalThis.MantraCore = Core;
vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'hub', 'free-core.js'), 'utf8'), { filename: 'free-core.js' });
for (const f of ['hub', 'hub-tarot', 'hub-saju']) vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'hub', f + '.js'), 'utf8'), { filename: f + '.js' });
const M = globalThis.Manse, H = globalThis.Hub;
['', 'tarot', 'tarot/play', 'input', 'today', 'awaken', 'my', 'go'].forEach(r => ok(typeof H.routes[r] === 'function', '라우트 ' + r));
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
for (const [y, m, d, h, g] of [[1990, 5, 15, 14, 'M'], [1985, 11, 3, 6, 'F'], [2001, 2, 4, 23, 'F'], [1972, 8, 20, 12, 'M']]) {
  const ch = mk(y, m, d, h, g), t = H.Saju.todayData(ch);
  ok(t.score >= 0 && t.score <= 100, `점수 범위 ${y}`);
  ok(['opportunity', 'expansion', 'harvest', 'accumulation'].includes(t.flowKey) && Core.DAYMODE[t.phase], `주 흐름 ${y}: ${t.flowKey}/${t.phase}`);
  ok(t.line && t.todo && t.meaning, `문구 ${y}`);
  ok(['순풍', '보통', '주의', '부담'].includes(t.cond), `적합 상태 ${y}: ${t.cond}`);
  for (const k of ['money', 'love', 'health']) ok(t.fields[k] && t.fields[k].s >= 0 && t.fields[k].s <= 100, `분야 ${k} ${y}`);
  ok(!BANNED.test(t.line + t.notes.join('')), '금지어(오늘)');
}
// 같은 사주·같은 날이면 같은 값(임의 값 없음)
const c1 = mk(1990, 5, 15, 14, 'M'); ok(JSON.stringify(H.Saju.todayData(c1)) === JSON.stringify(H.Saju.todayData(c1)), '오늘의 운세 재현성');
// 저장 정보 → 엔진 입력 변환(만세력 앱과 같은 모양)
const store = {}; globalThis.localStorage = { getItem: k => store[k] || null, setItem: (k, v) => { store[k] = v; } };
H.profile.save({ name: '테스트', gender: 'M', calendar: 'solar', leap: false, year: 1990, month: 5, day: 15, hour: 12, minute: 0, hourUnknown: true, lon: 126.98 });
const pin = H.profile.toInput(); ok(pin.hour === null && pin.year === 1990 && pin.school === 'eokbu', '시간 모름 → hour null');
ok(H.profile.has() && H.profile.name() === '테스트', '프로필 저장/읽기');
H.profile.save({ name: '테스트', year: 1990 }); ok(JSON.parse(store['mantra-manse-v1']).gender === 'M', '저장은 병합(다른 필드 보존)');
ok(!H.profile.awakened(), '처음에는 각성 전'); H.profile.markAwakened(); ok(H.profile.awakened(), '각성 표시'); H.profile.save({ day: 16 }); ok(!H.profile.awakened(), '생일이 바뀌면 다시 각성');

/* ④ 랜딩 연결 */
const story = fs.readFileSync(path.join(root, 'report', 'story', 'story.js'), 'utf8');
ok(/hubUrl\(\)/.test(story) && /explore_click/.test(story) && /landing_view/.test(story), '랜딩 → 허브 연결과 이벤트');
ok(/hub: \{ enabled: true/.test(fs.readFileSync(path.join(root, 'report', 'story', 'content.js'), 'utf8')), '허브 기본 설정');

console.log(fails.length ? 'FAIL\n' + fails.join('\n') : `PASS  (읽기 ${n}건, 카드 ${T.cards.length}장)`);
process.exit(fails.length ? 1 : 0);
