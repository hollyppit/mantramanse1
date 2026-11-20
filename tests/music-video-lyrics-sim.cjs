// 내 사주 뮤직비디오 가사 조합 검사: 실제 엔진으로 만든 여러 사주에서 빈 값 없음·사람마다 다름·금지 표현 없음·3분 구성·일레븐랩스 제한
const fs = require('fs'), vm = require('vm'), assert = require('assert/strict'); global.window = globalThis;
for (const f of ['engine.js', 'report/v2/saju-data.js', 'report/v2/music-video-lyrics-topics.js', 'report/v2/music-video-lyrics.js', ...[1, 2, 3, 4, 5, 6].map(i => 'report/newyear/texts/tojeong-modern-' + i + '.js')]) vm.runInThisContext(fs.readFileSync(f, 'utf8'), { filename: f });
const L = ReportV2.MusicVideoLyrics;

// 1) 조각 원문 전체: 금지 표현·빈 줄·줄 길이(일레븐랩스 한 줄 200자)·조각끼리 중복
const frags = L.allFragments();
assert(frags.length > 650, '조각 수 ' + frags.length);
for (const t of frags) { assert(t.trim().length > 0, '빈 조각'); assert.deepEqual(L.bannedIn(t), [], '금지 표현: ' + t); assert(t.length <= 200); }
const dup = frags.filter((t, i) => frags.indexOf(t) !== i); assert.deepEqual(dup, [], '조각끼리 같은 줄');

// 2) 실제 엔진 사주 400개
const songs = [], now = Date.UTC(2026, 10, 18);
for (let n = 0; n < 400; n++) {
  const gender = n % 2 ? 'F' : 'M';
  const sd = ReportV2.SajuData.build(Manse.compute({ year: 1955 + (n * 7) % 60, month: 1 + (n * 5) % 12, day: 1 + (n * 11) % 28, hour: n % 4 === 0 ? null : (n * 3) % 24, minute: 0, gender, calendar: 'solar', city: '서울' }), { now });
  const s = L.compose(sd); assert(s, '곡을 만들지 못함 #' + n);
  assert.deepEqual(s.sections.map(x => x.id), ['intro', 'verse1', 'hook', 'verse2', 'hook2', 'bridge', 'outro']);
  assert.equal(s.sections[0].lines.length, 4); assert.equal(s.sections[1].lines.length, 12); assert.equal(s.sections[3].lines.length, 12); assert.equal(s.sections[6].lines.length, 4);
  assert(s.sections[5].lines.length >= 4);
  for (const sec of s.sections) {
    for (const l of sec.lines) { assert(l && l.trim() && !/undefined|null|NaN|\{|\}/.test(l), '빈 값/자리표시 남음: ' + l); assert.deepEqual(L.bannedIn(l), []); }
    assert(/^mv-(intro|verse1|hook|verse2|bridge|outro)-[a-z]+-[a-z]+-[fm]$/.test(sec.panel) && L.parsePanelId(sec.panel), sec.panel);
    assert(sec.durationMs >= 3000 && sec.durationMs <= 120000);
  }
  assert.deepEqual(s.sections[2].lines, s.sections[4].lines, '훅 반복');
  const once = s.sections.filter(x => x.id !== 'hook2').flatMap(x => x.lines); assert.equal(new Set(once).size, once.length, '한 곡 안에서 같은 줄이 두 번 나온다');
  assert(s.title && s.title.length <= 80 && !/undefined/.test(s.title));
  assert.equal(s.totalMs, 180000, '곡 길이는 3분');
  assert.equal(L.bannedIn(s.lyrics).length, 0);
  assert.equal(L.fromInputs(L.inputsOf(sd)).lyrics, s.lyrics, '같은 입력이면 같은 곡');
  assert(!s.lyrics.includes(sd.birth.solarY + '년') || sd.birth.solarY === s.inputs.year, '생년이 가사에 들어감');
  // 기본 비트: 그루비한 최신 K-힙합(94~108bpm 바운스, 느린 발라드·로파이·우울한 분위기는 빼기), 오행마다 그루브 색깔이 다름
  assert(s.style.includes('upbeat') && s.style.includes('trendy modern k-hip hop') && /\d{2,3} bpm/.test(s.style.join(' ')) && +s.style.join(' ').match(/(\d{2,3}) bpm/)[1] >= 90 && s.style.includes('groovy'));
  for (const neg of ['slow ballad', 'lo-fi', 'sad mood']) assert(s.negativeStyle.includes(neg));
  const plan = L.toElevenPlan(s); assert.equal(plan.chunks.length, 7); assert.equal(plan.chunks.reduce((a, c) => a + c.duration_ms, 0), 180000);
  for (const c of plan.chunks) { assert(c.text.split('\n').length <= 31); for (const l of c.text.split('\n')) assert(l.length <= 200); assert(c.positive_styles.length > 0); assert(c.duration_ms >= 3000 && c.duration_ms <= 120000); }
  const cue = L.cueAt(s, s.sections[1].startMs + 1); assert.equal(cue.section.id, 'verse1'); assert.equal(cue.lineIndex, 0);
  assert.equal(L.cueAt(s, s.totalMs - 1).section.id, 'outro'); assert.equal(L.cueAt(s, s.totalMs - 1).lineIndex, 3);
  songs.push(s);
}

// 3) 사람마다 다름
const uniq = new Set(songs.map(s => s.lyrics)).size;
assert(uniq >= 398, '서로 다른 곡 ' + uniq + '/400');
const v1 = new Set(songs.map(s => s.sections[1].lines.join('|'))).size, v2 = new Set(songs.map(s => s.sections[3].lines.join('|'))).size, br = new Set(songs.map(s => s.sections[5].lines.join('|'))).size;
assert(v1 >= 250 && v2 >= 250 && br >= 150, '구간 다양성 ' + v1 + '/' + v2 + '/' + br);
const usedLines = new Set(songs.flatMap(s => s.sections.flatMap(x => x.lines.map(L.stripAdlibs))));   // 추임새(괄호)를 뺀 원래 조각으로 비교
// 영어 힙합 추임새: 곡마다 10개 안팎, 괄호로만, 오행별 묶음 안의 말만, 욕설·약물 없음, 훅 두 번이 똑같다
{ const all = Object.values(L.ADLIB).flatMap(a => a.items.concat(a.hype)).concat(Object.values(L.HOOK_TAG)).concat(['yeah, girl', 'yeah, boy', 'yeah, yeah', 'hold up', 'queen, peace out', 'king, peace out']);
  for (const s of songs.slice(0, 60)) {
    const tags = s.sections.flatMap(x => x.lines.flatMap(l => (l.match(/\(([^)]*)\)/g) || []).map(t => t.slice(1, -1))));
    assert(tags.length >= 8 && tags.length <= 16, '추임새 수 ' + tags.length);
    for (const t of tags) { assert(all.includes(t), '묶음 밖 추임새 ' + t); assert(!/fuck|shit|bitch|drug|gun|weed/i.test(t)); }
    assert(s.sections[2].lines.some(l => /\(yeah, yeah\)$/.test(l))); assert.deepEqual(s.sections[2].lines, s.sections[4].lines);
    assert(/\((queen|king), peace out\)$/.test(s.sections[6].lines[3]));
    for (const x of s.sections) for (const l of x.lines) assert.equal((l.match(/\(/g) || []).length <= 1, true);
  } }
const fragUse = frags.filter(t => usedLines.has(t) || /^\{year\}/.test(t)).length;


// 4) 패널 칸 30개, 모든 곡의 패널이 칸 목록 안에 있다
const ids = { has: id => !!L.parsePanelId(id) };   // 칸 이름이 일주·성별·주제·구간 규칙에 맞는지
for (const s of songs) for (const sec of s.sections) { assert(ids.has(sec.panel)); const pp = L.parsePanelId(sec.panel); assert.equal(pp.day, s.inputs.day, '주인공 = 사주 일주'); assert.equal(pp.gender, s.gender); }

// 5) 값이 모자란 사주는 곡을 만들지 않는다
assert.equal(L.compose(null), null); assert.equal(L.compose({}), null);

console.log('music-video-lyrics-sim ok: 사주 400개, 서로 다른 곡 ' + uniq + '개, 벌스1 ' + v1 + '종·벌스2 ' + v2 + '종·브리지 ' + br + '종, 조각 ' + frags.length + '줄 중 ' + fragUse + '줄 쓰임, 곡 길이 3:00');
if (process.argv.includes('--show')) for (const i of [0, 7]) console.log('\n예시 곡: ' + songs[i].title + '\n' + songs[i].lyrics);

// 6) 주제별(종합·연애·재물·커리어·토정 신년운세): 같은 사람이라도 주제마다 다른 곡, 주제다운 줄이 들어가고 3분 구성 유지
const GUAS = Object.keys(globalThis.TojeongModern).map(Number); assert.equal(GUAS.length, 144, '토정 144괘');
const byTopic = { self: [], love: [], wealth: [], career: [], newyear: [] };
for (let n = 0; n < 200; n++) {
  const sd = ReportV2.SajuData.build(Manse.compute({ year: 1960 + (n * 3) % 55, month: 1 + (n * 7) % 12, day: 1 + (n * 13) % 28, hour: (n * 5) % 24, minute: 0, gender: n % 2 ? 'F' : 'M', calendar: 'solar', city: '서울' }), { now });
  const songs5 = {};
  for (const t of L.TOPICS) {
    const extra = t === 'newyear' ? { year: 2027, gua: GUAS[n % GUAS.length] } : null;
    const s = L.compose(sd, t, extra); assert(s, t + ' 곡을 만들지 못함');
    assert.equal(s.topic, t); assert.equal(s.totalMs, 180000);
    assert.deepEqual(s.sections.map(x => x.lines.length).slice(0, 5), [4, 12, 4, 12, 4], t + ' 줄 수');
    for (const sec of s.sections) for (const l of sec.lines) { assert(l && !/undefined|null|NaN|\{|\}/.test(l), t + ' 빈 값: ' + l); assert.deepEqual(L.bannedIn(l), [], t + ' 금지: ' + l); assert(l.length <= 200); }
    const once = s.sections.filter(x => x.id !== 'hook2').flatMap(x => x.lines); assert.equal(new Set(once).size, once.length, t + ' 같은 줄 반복');
    for (const sec of s.sections) { assert(ids.has(sec.panel), sec.panel); assert(ids.has(sec.panelFallback)); }
    assert.equal(L.fromInputs(L.inputsOf(sd, t, extra)).lyrics, s.lyrics);
    songs5[t] = s; byTopic[t].push(s.lyrics); for (const sec of s.sections) for (const l of sec.lines) usedLines.add(L.stripAdlibs(l));
  }
  assert.equal(new Set(Object.values(songs5).map(s => s.lyrics)).size, 5, '주제마다 다른 곡');
  assert(songs5.love.sections[2].lines[0].includes('우리 쪽으로'), '연애 훅');
  assert(songs5.wealth.sections[2].lines[0].includes('통장'), '재물 훅');
  assert(songs5.career.sections[2].lines[0].includes('책상'), '커리어 훅');
  const ny = songs5.newyear, e = globalThis.TojeongModern[GUAS[n % GUAS.length]];
  assert(ny.sections[0].lines[3].includes(e.theme.replace(/["“”]/g, '').slice(0, 10)), '신년운세 인트로에 괘 제목');
  assert(ny.lyrics.includes('2027년'), '신년운세 연도'); assert(ny.title.startsWith('2027 '));
}
for (const t of L.TOPICS) assert(new Set(byTopic[t]).size >= 199, t + ' 사람마다 다름 ' + new Set(byTopic[t]).size);
assert.equal(L.compose({ dayMaster: { stem: '갑', el: '목' } }, 'newyear', null), null, '괘 없으면 신년운세 곡 없음');
{ let n = 0; for (const d of L.DAYS) for (const g of L.GENDERS) for (const t of L.TOPICS) for (const sl of L.panelSlots(t, g, d)) { assert(sl && L.parsePanelId(sl.id)); n++; } assert.equal(n, 3600); assert.equal(L.DAYS.length, 60); assert.equal(L.parsePanelId('mv-hook-gap-chuk-f'), null, '60갑자 아님'); }
const unused = frags.filter(t => !usedLines.has(t) && !/{(year|m)}/.test(t)); assert(unused.length / frags.length <= 0.08, '쓰이지 않는 조각 ' + unused.length + '/' + frags.length + ': ' + unused.slice(0, 8).join(' / '));
console.log('주제별 ok: 5주제 × 사주 200개, 주제마다 서로 다른 곡, 토정 144괘 반영, 패널 칸 3,600개(일주×성별×주제×구간), 전체 조각 ' + frags.length + '줄 중 쓰이지 않은 줄 ' + unused.length + '개');
if (process.argv.includes('--show')) for (const t of ['love', 'newyear']) { const sd = ReportV2.SajuData.build(Manse.compute({ year: 1992, month: 3, day: 9, hour: 14, minute: 0, gender: 'F', calendar: 'solar', city: '서울' }), { now }); const s = L.compose(sd, t, { year: 2027, gua: 111 }); console.log('\n[' + s.topicKo + '] ' + s.title + '\n' + s.lyrics); }

// 7) 자막 맞추기(음성 인식 단어 시각 → 줄 시각): 받아쓰기 오타·빠진 단어·전주가 있어도 줄 순서대로 실제 시각을 찾는다
{
  let rnd = 7; const rand = () => (rnd = (rnd * 16807) % 2147483647) / 2147483647;
  let checked = 0, good = 0;
  for (let n = 0; n < 60; n++) {
    const sd = ReportV2.SajuData.build(Manse.compute({ year: 1970 + n % 40, month: 1 + n % 12, day: 1 + (n * 3) % 27, hour: n % 24, minute: 0, gender: n % 2 ? 'F' : 'M', calendar: 'solar', city: '서울' }), { now });
    const s = L.compose(sd, ['self', 'love', 'wealth', 'career'][n % 4]);
    // 가짜 받아쓰기: 전주 6~10초, 줄마다 실제 시각(구간 안에서 고르지 않게), 글자 8% 틀림, 단어 10% 빠짐, 띄어쓰기·문장부호 섞임
    let t = 6 + rand() * 4; const words = [], truth = [];
    s.sections.forEach((sec, si) => sec.lines.forEach((line, li) => {
      truth.push({ s: si, l: li, t: Math.round(t * 1000) });
      for (const w of line.split(' ')) {
        if (rand() < 0.10) { t += 0.3; continue; }
        const txt = [...w].map(c => rand() < 0.08 && /[가-힣]/.test(c) ? '가' : c).join('');
        words.push({ text: txt, start: t, end: t + 0.25, type: 'word' }, { text: ' ', start: t + 0.25, end: t + 0.3, type: 'spacing' }); t += 0.32;
      }
      t += 0.4 + rand() * 2.5;
    }));
    const tm = L.alignToTranscript(s, words); assert(tm, '맞추기 실패 #' + n);
    assert.equal(tm.length, truth.length); for (let i = 1; i < tm.length; i++) assert(tm[i].t >= tm[i - 1].t, '순서');
    tm.forEach((x, i) => { checked++; if (Math.abs(x.t - truth[i].t) <= 700) good++; });
    // 화면: 전주에는 자막 없음, 줄 시각에 그 줄
    const song2 = Object.assign({}, s, { timing: tm });
    assert.equal(L.cueAt(song2, 1000).line, ''); assert.equal(L.cueAt(song2, 1000).sung, false);
    const mid = tm[10]; assert.equal(L.cueAt(song2, mid.t + 50).line, s.sections[mid.s].lines[mid.l]);
  }
  assert(good / checked >= 0.9, '0.7초 안에 맞은 줄 ' + good + '/' + checked);
  assert.equal(L.alignToTranscript(L.compose(ReportV2.SajuData.build(Manse.compute({ year: 1990, month: 1, day: 1, hour: 1, minute: 0, gender: 'F', calendar: 'solar', city: '서울' }), { now }), 'self'), [{ text: '전혀 상관없는 영어 가사 hello world baby', start: 1, end: 2, type: 'word' }]), null, '안 맞으면 null');
  console.log('자막 맞추기 ok: 사주 60곡, 오타 8%·빠진 단어 10%에서 0.7초 안에 맞은 줄 ' + Math.round(good / checked * 1000) / 10 + '%');
}

// 8) 성별: 같은 사주라도 여자·남자면 보컬 지시·추임새·패널 칸·곡(캐시 열쇠가 되는 가사·스타일)이 달라진다
{
  let n = 0;
  for (let i = 0; i < 40; i++) {
    const inp = { year: 1975 + i, month: 1 + i % 12, day: 1 + (i * 5) % 27, hour: (i * 7) % 24, minute: 0, calendar: 'solar', city: '서울' };
    const f = ReportV2.SajuData.build(Manse.compute(Object.assign({ gender: 'F' }, inp)), { now }), m = ReportV2.SajuData.build(Manse.compute(Object.assign({ gender: 'M' }, inp)), { now });
    for (const t of ['self', 'love', 'wealth', 'career']) {
      const sf = L.compose(f, t), sm = L.compose(m, t); n++;
      assert.equal(sf.gender, 'F'); assert.equal(sm.gender, 'M');
      assert(sf.style.includes('female rapper') && sf.negativeStyle.includes('male vocals') && !sf.style.includes('male rapper'), '여자 보컬');
      assert(sm.style.includes('male rapper') && sm.negativeStyle.includes('female vocals') && !sm.style.includes('female rapper'), '남자 보컬');
      assert(sf.sections.every(x => /-f$/.test(x.panel) && /-f$/.test(x.panelFallback)) && sm.sections.every(x => /-m$/.test(x.panel)), '패널 칸 성별');
      assert(/yeah, girl/.test(sf.lyrics) && /queen, peace out/.test(sf.lyrics) && /yeah, boy/.test(sm.lyrics) && /king, peace out/.test(sm.lyrics), '성별 추임새');
      assert.notEqual(sf.lyrics + sf.style, sm.lyrics + sm.style, '다른 곡');
      for (const x of L.toElevenPlan(sf).chunks) assert(x.positive_styles.includes('female rapper'));
      assert(L.toElevenV1Plan(sm).positive_global_styles.includes('male rapper'));
    }
  }
  assert.equal(L.compose({ dayMaster: { stem: '갑', el: '목' } }, 'self').gender, 'M', '성별 값이 없으면 남자로');
  { const h = L.heroOf('경오', 'F'); assert.equal(h.nameKo, '흰 말'); assert.deepEqual(h.crewKo, ['호랑이', '개']); assert.equal(h.partnerKo, '양'); const h2 = L.heroOf('병인', 'M'); assert.equal(h2.nameKo, '붉은 호랑이'); assert.deepEqual(h2.crewKo, ['말', '개']); assert.equal(h2.partnerKo, '돼지'); assert.equal(L.heroOf('임자', 'F').nameKo, '검은 쥐'); }
  console.log('성별 ok: ' + n + '쌍(같은 사주 여·남)에서 보컬·추임새·패널 칸·곡이 모두 갈림');
}

// 9) 60갑자 일주: 아웃트로 끝 2줄이 그 일주 전용 대목(60개 모두 서로 다름), 주인공 정보에 일주 상징 풍경
{
  assert.equal(Object.keys(L.DAY_OUTRO).length, 60); assert.deepEqual(L.DAYS.filter(d => !L.DAY_OUTRO[d]), []);
  const dl = Object.values(L.DAY_OUTRO).flat(); assert.equal(new Set(dl).size, 120);
  for (const l of dl) { assert.deepEqual(L.bannedIn(l), []); assert(l.length <= 40); }
  const seenDays = new Set();
  for (const s of songs) {
    const d = s.inputs.day, o = s.sections[6].lines; seenDays.add(d);
    assert.equal(L.stripAdlibs(o[2]), L.DAY_OUTRO[d][0], '아웃트로 3줄째 = 일주 대목'); assert.equal(L.stripAdlibs(o[3]), L.DAY_OUTRO[d][1]);
  }
  assert(seenDays.size >= 50, '검사한 곡의 일주 종류 ' + seenDays.size);
  assert.equal(L.heroOf('경오', 'F').motifKo, '달리는 말 위에 빛나는 쇠의 결');
  console.log('일주 ok: 60갑자 마무리 대목 120줄, 곡 ' + songs.length + '개에서 일주 ' + seenDays.size + '종 확인');
}
