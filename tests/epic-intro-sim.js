// INTRO(EPIC_WUXIA_PARODY) 검증:  node tests/epic-intro-sim.js [--show]
const fs = require('fs'), path = require('path'), vm = require('vm'), os = require('os'), url = require('url');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'cinema', 'epic-intro', 'translator'].forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const M = globalThis.Manse, R = globalThis.ReportV2, K = R.EpicIntro, T = R.Translator, C = R.Cinema;
const fails = []; const ok = (c, m) => { if (!c && fails.length < 40) fails.push(m); };
const now = Date.UTC(2026, 9, 6), show = process.argv.includes('--show');
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: h == null ? 0 : 20, calendar: 'solar', leap: false, gender: g, lon: 126.98, timeMode: 'lmt', jasi: 'jeong', sinsalBase: 'year', model: 'season', school: 'eokbu' });
const birthOf = ch => ({ y: ch.solar.y, m: ch.solar.m, d: ch.solar.d, hour: ch.hourKnown ? ch.solar.h : null, minute: ch.hourKnown ? ch.solar.mi : 0, hourKnown: !!ch.hourKnown, place: '서울' });
const texts = sc => sc.map(s => (s.cinema.segments || []).map(g => g.text).join(' ') + ' ' + (s.sub || '')).join(' ');
const PUNCH_TEXT = ['하늘은 평소와 다름없이', '본인조차', '생년월일시를 입력했다', '한 사람의 수많은 고민', '십 년이다', '수많은 선택을 지나'];

console.log('1. 시각 표기');
[[1, 20, '새벽 1시 20분'], [0, 0, '자정'], [14, 30, '오후 2시 30분'], [13, 0, '오후 1시'], [12, 0, '낮 12시'], [23, 5, '밤 11시 5분'], [7, 0, '아침 7시']].forEach(([h, m, disp]) => { const t = K.timeWords(h, m); ok(t && t.disp === disp, `timeWords ${h}:${m} → ${JSON.stringify(t)}`); });
ok(K.timeWords(null, 0) === null, '시 모름 → 시각 없음');

console.log('2. 샘플 × 설정 조합');
let n = 0, minMs = 1e9, maxMs = 0, worst = '', punchRuns = 0, punchDropped = 0;
const cases = [[1992, 8, 5, 1, 'M'], [1985, 11, 3, 7, 'F'], [1978, 2, 20, 22, 'M'], [2001, 8, 9, 14, 'F'], [1969, 12, 25, null, 'M'], [1990, 1, 3, 0, 'F'], [1955, 6, 30, 12, 'M']];
for (const [y, m, d, h, g] of cases) {
  const ch = mk(y, m, d, h, g), sd = R.SajuData.build(ch, { now }), b = birthOf(ch);
  for (const humor of ['OFF', 'SUBTLE', 'PARODY']) for (const L of [1, 3, 5]) for (const nm of ['백진우', '']) {
    n++; const sc = K.build(sd, nm, R.Narrator.heroVars(sd, nm), b, { humor, epicLevel: L, nowYear: sd.nowYear }), tag = `${y}${g}/${humor}/L${L}/${nm ? '이름' : '무명'}`;
    const ms = K.totalMs(sc); minMs = Math.min(minMs, ms); if (ms > maxMs) { maxMs = ms; worst = tag; }
    ok(ms <= K.CAP_MS, `${tag} 길이 ${ms}ms > ${K.CAP_MS}`);
    sc.forEach(s => (s.cinema.segments || []).forEach(x => ok(x.text.length <= 22, `${tag} ${s.sceneId} 22자 초과: ${x.text}`)));
    const tx = texts(sc);
    ok(!K.FORBIDDEN.test(tx), `${tag} 입증할 수 없는 주장: ${tx.match(K.FORBIDDEN)}`);
    ok(!T.BAD_VOICE.test(tx) && !/\{hero/.test(tx), `${tag} 금지 호칭 또는 미치환 자리표시자`);
    ok(!/ㅋ|ㅎㅎ|[\u{1F300}-\u{1FAFF}]/u.test(tx), `${tag} 금지된 개그(밈·이모티콘)`);
    // 데이터 정확성: 화면 글자(한자)와 읽는 말(한글)이 만세력 값 그대로
    const P = sd.pillars, s2 = sc.find(s => s.sceneId === 'ep_02').cinema.segments, s3 = sc.find(s => s.sceneId === 'ep_03').cinema.segments;
    ok(s2[0].text === '서기 ' + b.y + '年', `${tag} 서기 연도`);
    ok(s2[1].text === P.year.hanja + '年', `${tag} 년주 표시`);
    ok(s3.some(x => x.text === P.month.hanja + '月') && s3.some(x => x.text === P.day.hanja + '日'), `${tag} 월일 간지`);
    ok(s3.some(x => x.text === (P.hour && P.hour.hanja) + '時') === !!(b.hourKnown && P.hour), `${tag} 시주는 시각을 알 때만`);
    ok(s3.some(x => x.text.indexOf(b.m + '월 ' + b.d + '일') === 0), `${tag} 양력 출생일`);
    ok(s3.some(x => x.text === '서울'), `${tag} 출생지`);
    const pil = sc.find(s => s.sceneId === 'ep_06').pillars;
    ok(pil.length === 4 && pil[0].label === '時' && pil[3].hj === P.year.hanja && pil[2].hj === P.month.hanja && pil[1].hj === P.day.hanja && (b.hourKnown ? pil[0].hj === P.hour.hanja : pil[0].hj === ''), `${tag} 명식 표`);
    // 성별: 이름으로 추측하지 않고 만세력 입력의 성별만
    ok(new RegExp(g === 'M' ? '한 사내가—' : '한 여인이—').test(tx), `${tag} 성별 호칭`);
    // 이름
    const nameSeg = sc.find(s => s.sceneId === 'ep_05').cinema.segments.filter(x => x.name);
    ok(nm ? nameSeg.length === 1 && nameSeg[0].text === nm : nameSeg.length === 0, `${tag} 이름 장면`);
    ok(sc.find(s => s.sceneId === 'ep_05').cinema.nameEmphasis === (nm ? ['NORMAL', 'NORMAL', 'STRONG', 'TITLE', 'MAXIMUM'][L - 1] : 'NONE'), `${tag} 이름 강조 단계`);
    // 유머: PARODY 만 펀치라인 1~2개
    const cnt = PUNCH_TEXT.filter(p => tx.includes(p)).length;
    ok(humor === 'PARODY' ? cnt <= 2 : cnt === 0, `${tag} 펀치라인 수 ${cnt}`); if (humor === 'PARODY') { punchRuns++; if (cnt === 0) punchDropped++; }
    // 핵심 대사는 어떤 설정에서도 나온다
    const must = ['때는.', '바로 이날 태어났다.', '그 이름.', '언제 풀리는가.']; ok(must.every(m => sc.some(s => s.cinema.segments.some(x => x.text === m))) && /훗날 자신의 운을 확인하기 위해 생년월일시를 입력할 한 (사내가|여인이|사람이)—/.test(sc.find(s => s.sceneId === 'ep_04').cinema.segments.map(x => x.text).join(' ')), `${tag} 핵심 대사 누락`);
    // 낮은 레벨은 북 신호가 적다
    const drums = sc.reduce((a, s) => a + s.cinema.segments.filter(x => /^drum$/i.test(x.cue || '')).length, 0); if (L === 1) ok(drums === 0, `${tag} L1 에는 일반 북 신호 없음`);
    if (show && y === 1992 && humor === 'PARODY' && L === 5 && nm) { console.log('\n── ' + tag + ' · ' + ms + 'ms'); sc.forEach(s => console.log(`[${s.sceneId}] ` + s.cinema.segments.map(x => (x.cue ? '(' + x.cue + ')' : '') + x.text.replace(/\n/g, '/')  + '~' + x.hold).join(' | '))); }
  }
}
console.log(`   ${n}가지 조합 · 길이 ${(minMs / 1000).toFixed(1)}~${(maxMs / 1000).toFixed(1)}초 (최장: ${worst}) · PARODY 중 펀치라인이 길이 때문에 빠진 경우 ${punchDropped}/${punchRuns}`);

console.log('3. 성별 데이터가 없을 때 · 본편 다리 · 스타일 분기');
{
  const ch = mk(1992, 8, 5, 1, 'M'), sd = R.SajuData.build(ch, { now }), b = birthOf(ch); sd.gender = 'X';
  const t = texts(K.build(sd, '', R.Narrator.heroVars(sd, ''), b, {})); ok(/한 사람이—/.test(t) && !/한 사내|한 여인/.test(t), '성별 없음 → 한 사람');
  const sd2 = R.SajuData.build(ch, { now }), bt = K.bridge().cinema.segments;
  ok(bt[0].text === 'CHAPTER 01' && bt[1].text === '나의 기본 사주', '본편 다리 문구');
  const vars = R.Narrator.heroVars(sd2, '백진우'), epic = T.prologue(sd2, '백진우', vars, { style: 'EPIC_WUXIA_PARODY', birth: b, nowYear: sd2.nowYear }), old = T.prologue(sd2, '백진우', vars), mini = T.prologue(sd2, '백진우', vars, { style: 'MINIMAL' });
  ok(epic[0].sceneId === 'ep_01' && epic[epic.length - 1].sceneId === 'ep_bridge' && epic.length === 11, 'EPIC: INTRO 10장면 + 다리 (' + epic.length + ')');
  ok(old[0].sceneId === 'pro_1' && mini.map(s => s.sceneId).join() === 'pro_6,pro_title', '기본(CINEMATIC)·MINIMAL 분기');
  ok(!/"say"|voice/i.test(JSON.stringify(epic)), 'TTS 관련 필드 없음');
}

console.log('4. 스키마 확장(hold·cue·big·lead·tail·MAXIMUM)이 정리 단계에서 살아남는지 + 서버 미러');
{
  const seg = { text: '壬申年', hold: 1200, cue: 'deepDrum', big: true, block: 0, emphasis: 'impact', animation: 'fade' };
  const c = C.clean({ segments: [seg, { text: 'x', cue: 'evil', hold: 99999 }], lead: 300, tail: 99999, nameEmphasis: 'MAXIMUM' });
  ok(c.segments[0].hold === 1200 && c.segments[0].cue === 'deepDrum' && c.segments[0].big === true, 'clean: 확장 필드 유지');
  ok(c.segments[1].cue === undefined && c.segments[1].hold === 8000, 'clean: 허용 밖 값 제거/상한');
  ok(c.lead === 300 && c.tail === 3000 && c.nameEmphasis === 'MAXIMUM', 'clean: lead/tail/MAXIMUM');
  const tm = C.build({ cinema: { segments: [{ text: 'a', hold: 1000, block: 0 }, { text: 'b', hold: 500, block: 1 }], lead: 300, tail: 100, pacing: 'SLOW' } }).timing;
  ok(tm.at[0] === 300 && tm.at[1] === 1300 && tm.total === 1800 + 100, 'timing: lead/hold/tail ' + JSON.stringify(tm));
  const tmp = path.join(os.tmpdir(), 'cinema-srv2.mjs'); fs.writeFileSync(tmp, fs.readFileSync(path.join(root, 'functions/_cinema.js'), 'utf8'));
  import(url.pathToFileURL(tmp).href).then(S => {
    const sc = S.cleanSceneCopy({ ep_02: { segments: [{ text: '{hero}', hold: 900, cue: 'drum', big: true, name: true }, { text: 'x', cue: 'nope' }], nameEmphasis: 'MAXIMUM' } });
    const g0 = sc.ep_02 && sc.ep_02.segments[0], g1 = sc.ep_02 && sc.ep_02.segments[1];
    ok(g0 && g0.hold === 900 && g0.cue === 'drum' && g0.big === true && g1.cue === undefined && sc.ep_02.nameEmphasis === 'MAXIMUM', '서버: sceneCopy 확장 필드');
    const cc = S.cleanCinema({ lead: 400, tail: 9999, nameEmphasis: 'MAXIMUM' }); ok(cc.lead === 400 && cc.tail === 3000 && cc.nameEmphasis === 'MAXIMUM', '서버: lead/tail/MAXIMUM');
    finish();
  });
}

function finish() {
  console.log('5. 본편과의 분리: INTRO 문구·프리셋이 본편 생성 코드로 새지 않는다');
  const body = ['report/v2/compose.js', 'report/v2/content.js', 'report/v2/content-pro.js', 'report/v2/content-pro2.js', 'report/v2/topics.js', 'report/v2/reality.js', 'report/v2/remedy.js', 'report/v2/narrator.js', 'functions/_compose.js', 'functions/api/compose.js'];
  body.forEach(f => { const t = fs.readFileSync(path.join(root, f), 'utf8'); ok(!/EpicIntro|EPIC_WUXIA/.test(t), f + ' 가 INTRO 코드를 참조'); ok(!K.BODY_BAN.test(t), f + ' 에 INTRO 어휘(' + (t.match(K.BODY_BAN) || [])[0] + ')'); });
  if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 25).join('\n')); process.exit(1); }
  console.log('모두 통과');
}
