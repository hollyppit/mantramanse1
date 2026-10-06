// INTRO(EPIC_WUXIA_JOURNEY) · BODY 분리 검증:  node tests/journey-sim.js [--show]
// 카피 순서 · 만세력 값 사용 · 애니메이션 어휘(4개 이하·의미 고정) · TTS/SFX 없음 · INTRO/BODY 코드 분리 · 배속
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'cinema', 'epic-intro', 'translator', 'cinema-render', 'reader', 'moving'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, K = R.EpicIntro, T = R.Translator, fails = [];
const ok = (c, m) => { if (!c && fails.length < 40) fails.push(m); };
const show = process.argv.includes('--show'), now = Date.UTC(2026, 9, 6);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: h == null ? 0 : 20, calendar: 'solar', leap: false, gender: g, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
const birthOf = ch => ({ y: ch.solar.y, m: ch.solar.m, d: ch.solar.d, hour: ch.hourKnown ? ch.solar.h : null, minute: ch.hourKnown ? ch.solar.mi : 0, hourKnown: !!ch.hourKnown, place: '서울' });
const segsOf = sc => sc.reduce((a, s) => a.concat(s.cinema.segments || []), []);
const flat = sc => sc.map(s => (s.cinema.segments || []).map(g => g.text).join(' ') + ' ' + (s.sub || '')).join(' ').replace(/\s+/g, '');
const prologue = (ch, name, gender) => { const sd = R.SajuData.build(ch, { now }); if (gender === null) sd.gender = undefined; return { sd, sc: T.prologue(sd, name, R.Narrator.heroVars(sd, name), { style: 'EPIC_WUXIA_JOURNEY', birth: birthOf(ch), nowYear: sd.nowYear }) }; };
const cases = [[1992, 8, 5, 1, 'M'], [1985, 11, 3, 7, 'F'], [1978, 2, 20, 22, 'M'], [2001, 8, 9, 14, 'F'], [1969, 12, 25, null, 'M']];

console.log('1. 카피 순서(요청서 최종 INTRO 카피)와 만세력 값');
const ORDER = ['때는,', '년.', '年', '月', '어느새벽.', '서울.', '한사람이세상에첫발을내디뎠다.', '태어났으니—', '그이름.', '누구에게나태어나며주어진것이있다.', '命', '태어난시간.', '태어난계절.', '타고난기질.', '세상을바라보는방식.', '그시작을명이라부른다.',
  '그러나—', '태어난것이전부는아니다.', '運', '시간이흐르면운도흐른다.', '어떤길은열리고.', '어떤길은막힌다.', '어떤사람은찾아오고.', '어떤사람은떠난다.', '어떤선택은삶의방향을바꾼다.',
  '그렇게사람은', '수많은길을지나고.', '수많은선택을하며.', '자신의시간을살아간다.', '그리고—', '누구에게나한번쯤이런순간이찾아온다.', '나는지금어디쯤와있는가.', '지나온길에는무엇이있었는가.', '지금내앞에는어떤운이흐르고있는가.', '산너머에는무엇이기다리고있는가.',
  '그래서이제.', '지나온운을거슬러', '아직오지않은때를향해간다.', '재물이흐르는곳.', '인연이기다리는곳.', '기회가열리는때.', '그리고', '피해야할길까지.', '그길을찾기위해.', '네개의기둥.', '여덟개의글자를펼친다.', '四柱八字',
  '이것은정답이아니다.', '길을대신걸어주지도않는다.', '다만—', '지나온흐름을살피고.', '지금서있는곳을확인하고.', '앞으로마주할길을헤아리기위한', '하나의지도다.',
  '이제.', '길을나선다.', '지나온운을넘어.', '아직오지않은', '나의때를향해.', '산너머', '무엇이기다리고있는지는', '아직알수없다.', '다만—', '길은이미열렸다.', '運路', '백진우의운이흐르는길', '백진우에게는,백진우의때가있다.', '이제,', '출발한다.'];
for (const [y, m, d, h, g] of cases) {
  const ch = mk(y, m, d, h, g), { sd, sc } = prologue(ch, '백진우'), tx = flat(sc), tag = `${y}${g}`;
  let pos = 0; ORDER.forEach(p => { const i = tx.indexOf(p.replace(/\s+/g, ''), pos); ok(i >= 0, `${tag} 카피 순서가 어긋남/누락: ${p}`); if (i >= 0) pos = i; });
  const P = sd.pillars; ok(tx.includes(P.year.hanja + '年') && tx.includes(P.month.hanja + '月') && tx.includes(P.year.ko + '년'), `${tag} 연주·월주는 만세력 값 그대로`);
  const pc = sc.find(s => s.pillars); ok(pc && pc.pillars.map(p => p.hj).join('') === (h == null ? '' : P.hour.hanja) + P.day.hanja + P.month.hanja + P.year.hanja, `${tag} 명식 카드가 만세력 값(時日月年)과 같다`);
  ok(pc && /四柱八字/.test(pc.cinema.segments[pc.pillarsAt].text), `${tag} 명식은 四柱八字 제목이 나온 뒤에 펼쳐진다`);
  ok(sc[sc.length - 1].sceneId === 'ep_bridge' && /CHAPTER01/.test(flat([sc[sc.length - 1]])), `${tag} 마지막은 CHAPTER 01 로 이어지는 다리`);
  ok(sc[0].bg === 'black' && sc[0].cinema.segments[0].text === '때는,', `${tag} 검은 화면에서 "때는,"로 시작`);
  const hero = { M: '한 사내가 태어났으니—', F: '한 여인이 태어났으니—' }[g]; ok(segsOf(sc).some(s => s.text === hero), `${tag} 성별 문장: ${hero}`);
}

console.log('2. 성별·이름·시각 데이터가 없을 때');
{
  const ch = mk(1990, 3, 3, 12, 'M'), { sc } = prologue(ch, '백진우', null);
  ok(segsOf(sc).some(s => s.text === '한 사람이 태어났으니—') && !/사내|여인/.test(flat(sc)), '성별 데이터 없음 → "한 사람이", 이름으로 성별을 추측하지 않는다');
  const n0 = prologue(ch, '').sc; ok(!n0.some(s => s.sceneId === 'ep_j03') && !/그이름\./.test(flat(n0)) && /모든사람에게는/.test(flat(n0)), '이름 없음 → 이름 장면 건너뜀, 타이틀 문구는 일반형');
  const nh = prologue(mk(1969, 12, 25, null, 'M'), '백진우').sc; ok(!/時/.test(flat(nh.filter(s => s.sceneId === 'ep_j01'))) && nh.find(s => s.pillars).pillars[0].hj === '', '시 모름 → 時주를 만들어 내지 않는다');
}

console.log('3. 애니메이션: 어휘 4개 이하 · 의미별 고정');
{
  const used = new Set(), roles = {};
  for (const [y, m, d, h, g] of cases) { const { sc } = prologue(mk(y, m, d, h, g), '백진우'); segsOf(sc).forEach(s => { used.add(s.animation); roles[s.text] = s.animation; }); }
  ok(used.size <= 4 && [...used].every(a => ['fade', 'slow-scale-in', 'ink-reveal', 'cinematic-reveal'].includes(a)), 'INTRO 에서 쓰인 애니메이션: ' + [...used]);
  const A = { normal: 'fade', important: 'slow-scale-in', hanja: 'ink-reveal', cine: 'cinematic-reveal' };
  ['命', '運'].forEach(t => ok(roles[t] === A.hanja, `한자 ${t} → INK_REVEAL`)); ok(roles['四柱八字'] === A.cine && roles['運路'] === A.cine, '四柱八字·運路 → CINEMATIC_REVEAL');
  ok(roles['백진우'] === A.cine, '사용자 이름 → CINEMATIC_REVEAL');
  ['나는 지금', '하나의 지도다.', '나의 때를 향해.', '출발한다.'].forEach(t => ok(Object.keys(roles).some(k => k.indexOf(t) === 0 && roles[k] === A.important), `중요 문장 "${t}" → SLOW_SCALE_IN`));
  ok(roles['때는,'] === A.normal && roles['그러나—'] === A.normal && roles['어느 새벽.'] === A.normal, '일반 문장 → FADE_IN');
  ok(Object.keys(roles).filter(k => /^\d{4}년\.$/.test(k)).every(k => roles[k] === A.important), '연도 → 중요 문장');
  { const { sc } = prologue(mk(1992, 8, 5, 1, 'M'), '백진우'); sc.slice(0, -1).forEach(s => { const built = R.Cinema.build(s).segments.map(g => g.animation).join(), raw = s.cinema.segments.map(g => g.animation).join(); ok(built === raw, `${s.sceneId} 렌더 경로에서 프리셋이 문장 애니메이션을 덮어쓰지 않는다(${raw} → ${built})`); }); }
  ok(Object.values(roles).every(a => a !== 'blur-to-focus'), 'BLUR_TO_FOCUS 는 기본 연출에서 쓰지 않는다(0곳)');
}

console.log('4. TTS · SFX 없음');
{
  const cues = new Set(); let sfx = 0;
  for (const [y, m, d, h, g] of cases) { const { sc } = prologue(mk(y, m, d, h, g), '백진우'); sc.forEach(s => { if (s.sfx) sfx++; segsOf(s.cinema ? [s] : []).forEach(x => x.cue && cues.add(x.cue)); }); }
  ok(sfx === 0 && ![...cues].some(c => /drum|deepDrum|sfx/.test(c)), '여정 INTRO 데이터에 효과음 신호(drum·deepDrum·sfx)가 없다: ' + [...cues]);
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  ['report/v2/viewer.js', 'report/v2/reader.js', 'report/v2/cinema-render.js', 'report/v2/epic-intro.js'].forEach(f => ok(!/speechSynthesis|SpeechSynthesisUtterance|R\.Sfx|new Audio\(/.test(src(f).replace(/\/\/.*$/gm, '')), f + ' 에 음성·효과음 코드가 없다'));
  ok(!fs.existsSync(path.join(root, 'report/v2/intro-audio.js')) && !/intro-audio/.test(src('report/v2/index.html')), '효과음 합성기(intro-audio.js)를 불러오지 않는다');
  ok(!/data-audio|TTS 토글|data-k="tts"/.test(src('report/v2/reader.js')), '읽기 문서에 TTS 토글이 없다');
  ok(/bgmCut/.test(src('report/v2/viewer.js')) && !/\.dur\b.*Bgm|Bgm.*scrollTo/.test(src('report/v2/reader.js')), 'BGM 은 독립 레이어(신호만 받고 타이밍을 정하지 않는다)');
}

console.log('5. 길이 · 배속');
{
  const { sc } = prologue(mk(1992, 8, 5, 1, 'M'), '백진우'), ms = K.totalMs(sc.slice(0, -1));
  ok(ms >= 60000 && ms <= K.JOURNEY_CAP_MS, `INTRO 길이 ${Math.round(ms / 1000)}초는 1~2.5분 범위`);
  ok(sc.slice(0, -1).every(s => (s.cinema.segments || []).every(g => g.text.length <= 22)), '한 조각은 22자 이하(모바일 줄 길이)');
  const rt = R.Reading.clean({ playbackRate: 3 }), bad = R.Reading.clean({ playbackRate: 7 }), mv = R.Moving.clean({ playbackRate: 0.75 });
  ok(rt.playbackRate === 3 && bad.playbackRate === 1 && mv.playbackRate === 0.75 && R.Reading.RATES.join() === '0.5,0.75,1,1.25,1.5,2,3', '배속 값: 0.5·0.75·1·1.25·1.5·2·3 만 허용(그 밖은 1x)');
  const srv = fs.readFileSync(path.join(root, 'functions/api/report-content.js'), 'utf8'); ok(/\[0\.5, 0\.75, 1, 1\.25, 1\.5, 2, 3\]\.includes\(\+f\.playbackRate\)/.test(srv) && /EPIC_WUXIA_JOURNEY/.test(srv), '서버 검증이 같은 배속 목록·새 스타일을 받는다');
  const rd = fs.readFileSync(path.join(root, 'report/v2/reader.js'), 'utf8'); ok(/pageMs = function \(p\) \{ return p\.dur \* 1000 \/ rate/.test(rd) && /Math\.max\(260,/.test(rd), '본문 머묾은 배속으로 나누고, 이동은 최소 260ms 를 지킨다(3x 에서도 건너뛰지 않음)');
}

console.log('6. INTRO ↔ BODY 분리');
{
  const src = f => fs.readFileSync(path.join(root, f), 'utf8');
  ok(!/EpicIntro|EPIC_WUXIA|intro:\s*true/.test(src('report/v2/reader.js')), '읽기 문서(BODY)는 INTRO 코드를 참조하지 않는다');
  ok(/introMode = label === '프롤로그'/.test(src('report/v2/viewer.js')) && /intro: introMode/.test(src('report/v2/viewer.js')), 'allowTextAnimation: 프롤로그만 true, 엔딩·본문은 false');
  const body = R.CinemaRender.html({ cinema: { segments: [{ text: '命', animation: 'ink-reveal', block: 0 }] } }, {});
  ok(/data-a="fade"/.test(body) && !/ink-reveal/.test(body), '본문·엔딩 렌더러는 저장된 animation 값을 무시한다');
  ok(!/확정|반드시|운명이 정해/.test(flat(prologue(mk(1992, 8, 5, 1, 'M'), '백진우').sc)), '사주가 미래를 확정한다는 표현이 없다');
  if (show) prologue(mk(1992, 8, 5, 1, 'M'), '백진우').sc.forEach(s => console.log(s.sceneId, s.cinema.preset, (s.cinema.segments || []).map(g => g.text.replace(/\s+/g, ' ')).join(' | ').slice(0, 150)));
}

if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('\nINTRO 여정 · BODY 분리 검증 모두 통과');
