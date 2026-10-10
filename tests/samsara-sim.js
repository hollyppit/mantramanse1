// 윤회의 문(report/v2/samsara.js) 검증:  node tests/samsara-sim.js
// 전생 챕터 장면 → 컷 추출 · 문장을 새로 만들지 않음(원문 그대로) · 에셋 슬롯 해석(성별/무성별 대체/영상) · 창작 표시 · 컷 체류 시간
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose', 'deep', 'deep-life', 'deep-time', 'samsara']
  .forEach(n => vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2', n + '.js'), 'utf8'), { filename: n + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, S = R.Samsara;
const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
const now = Date.UTC(2026, 9, 6), cfg = R.Chapters.forProject(null, 'full'), lib = R.Compose.library(null);
const mk = (y, m, d, h, g) => M.compute({ year: y, month: m, day: d, hour: h, minute: 0, calendar: 'solar', leap: false, gender: g, city: '서울' });
const BANNED = /(실제로 그랬|역사적 사실이다|틀림없|반드시|확실히|100%)/;
const slots = new Set(), titles = new Set();
[[1992, 6, 23, 1, 'M'], [1985, 3, 14, 9, 'F'], [1978, 11, 2, 18, 'M'], [2001, 8, 30, 12, 'F'], [1969, 2, 8, 6, 'F'], [1999, 10, 21, 22, 'M']].forEach(([y, mo, d, h, g], i) => {
  const ch = mk(y, mo, d, h, g), tag = '#' + (i + 1), sd = R.SajuData.build(ch, { now }), rep = R.Compose.build(sd, lib, cfg, { name: '백진우' });
  const assets = {}; assets['past:' + 'x'] = 'noop';
  R.Deep.augment(rep, { M, ch, sd, now, name: '백진우', assets, videos: {} });
  const m = S.extract(rep);
  ok(m && m.id === 'deep_past', tag + ' 전생 챕터 추출');
  if (!m) return;
  ok(m.frames.length >= 5 && m.frames.every(f => f.cap && f.paras.length >= 1), tag + ' 컷 5개 이상·제목/문단 ' + m.frames.length);
  ok(/^past:(비겁|식상|재성|관성|인성):(목|화|토|금|수):(F|M)$/.test(m.slot) && m.slot.endsWith(':' + g), tag + ' 에셋 슬롯 ' + m.slot);
  // 원문 보존: 챕터 장면의 모든 문단이 컷에 그대로 들어 있다
  const src = rep.chapters.find(c => c.id === 'deep_past').scenes.map(s => s.html || '').join('');
  const un = s => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const all = [...src.matchAll(/<p class="lead">([^<]*)<\/p>/g)].map(x => un(x[1])), got = m.frames.flatMap(f => f.paras);
  ok(all.length === got.length && all.every((p, k) => p === got[k]), tag + ' 문단 원문 그대로(' + got.length + '/' + all.length + ')');
  const text = m.frames.map(f => f.cap + f.paras.join('')).join('');
  ok(!BANNED.test(text), tag + ' 단정 표현 없음');
  ok(/창작 판타지/.test(m.notice) && /역사적 사실이나 검증된/.test(m.notice), tag + ' 창작 표시');
  ok(m.frames.every(f => S.dwell(f, 1) >= 4000 && S.dwell(f, 1) <= 16000) && S.dwell(m.frames[0], 2) < S.dwell(m.frames[0], 1), tag + ' 체류 시간·배속');
  slots.add(m.slot); titles.add(m.hero);
  // 에셋 해석
  const base = m.slot.replace(/:[FM]$/, '');
  ok(S.imageOf(m, { [m.slot]: '/a.webp', [base]: '/b.webp' }) === '/a.webp', tag + ' 성별 슬롯 우선');
  ok(S.imageOf(m, { [base]: '/b.webp' }) === '/b.webp', tag + ' 무성별 대체');
  ok(S.imageOf(m, {}) === '', tag + ' 에셋 없으면 빈 값(색 바탕으로 대체)');
  ok(S.videoOf(m, { [m.slot]: '/a.webp' }, { [m.slot]: '/v.mp4', [base]: '/w.mp4' }) === '/v.mp4', tag + ' 영상 슬롯');
  ok(S.videoOf(m, { [m.slot]: '/a.webp' }, { [base]: '/w.mp4' }) === '', tag + ' 성별 이미지가 있으면 무성별 영상은 쓰지 않음');
  const card = S.card(m, {}, null);
  ok(/창작 전생 서사/.test(card) && /data-smopen/.test(card) && !/undefined|NaN/.test(card), tag + ' 시작 카드');
});
ok(slots.size >= 4, '서로 다른 사주는 서로 다른 전생 에셋 슬롯: ' + slots.size);
ok(titles.size >= 4, '서로 다른 전생 이야기: ' + titles.size);
ok(S.extract({ chapters: [] }) === null && S.card(null, {}, null).indexOf('만들지 못했습니다') > 0, '전생 챕터가 없을 때 안전하게 처리');
console.log('윤회의 문 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
