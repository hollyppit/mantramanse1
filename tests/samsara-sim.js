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
  ok(m.frames.every(f => S.dwell(f, 1) >= 4000 && S.dwell(f, 1) <= 120000) && S.dwell(m.frames[0], 2) < S.dwell(m.frames[0], 1), tag + ' 체류 시간·배속');
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
// 일반 챕터·세계 무빙툰(렌더된 HTML 에서 컷 추출)
{
  const html = '<section class="scene rd-sec"><div class="cap">일간 · 庚金</div><p class="lead">나의 중심은 경금입니다. 단단하고 결단이 빠릅니다. 쉽게 흔들리지 않습니다.</p><img src="/a.webp"><button>누르세요</button></section>' +
    '<section class="scene rd-sec"><div class="cap">장단점</div><ul><li>맺고 끊음이 분명해 일을 빨리 정리합니다.</li><li>날이 서면 주변이 다칩니다.</li></ul></section>' +
    '<section class="scene rd-sec"><div class="cap">그래프</div><svg><text>가나다라마바사</text></svg></section>';
  const m = S.fromHtml(html, { id: 'x', title: '테스트' });
  ok(m && m.frames.length >= 3 && m.frames.every(f => f.paras.length === 1 && f.paras[0].length >= 8), '일반 챕터 컷 추출: ' + (m && m.frames.length));
  ok(m.frames[0].img === '/a.webp' && m.frames[m.frames.length - 1].img === '/a.webp', '이미지 이어 쓰기');
  ok(!m.frames.some(f => /누르세요|가나다라마바사/.test(f.paras[0] + f.cap)), '버튼·그래프 텍스트 제외');
  ok(m.frames.every(f => f.paras[0].split(/(?<=[.!?])s+/).length <= 2), '컷당 두 문장 이하');
  ok(S.fromHtml('<section><p class="lead">짧</p></section>', {}) === null, '컷이 부족하면 null');
  const w = S.fromChapters([{ id: 'a', title: '챕터A', html }, { id: 'b', title: '챕터B', html }], { id: 'world:w1', title: '세계', bg: '/bg.webp', per: 2, max: 3 });
  ok(w && w.frames.length === 3 && /^챕터A/.test(w.frames[0].cap) && w.frames.every(f => f.img), '세계 무빙툰: 챕터별 앞 컷·상한·이미지');
  // 이미지가 챕터 뒤쪽에서야 나오는 경우(실제 챕터는 첫 3컷에 삽화가 없다): 컷마다 자기 챕터의 이미지를 나눠 받는다
  const txt = n => '<section class="scene rd-sec"><div class="cap">컷' + n + '</div><p class="lead">이 문장은 충분히 길어서 한 컷으로 읽히는 설명입니다 ' + n + '번째.</p></section>';
  const withImg = (id, a, b) => txt(1) + txt(2) + txt(3) + '<section class="scene rd-sec"><figure><img src="' + a + '"></figure><div class="cap">삽화</div><p class="lead">삽화가 붙은 장면의 설명 문장입니다 ' + id + '.</p></section><section class="scene rd-sec"><figure><img src="' + b + '"></figure><div class="cap">삽화2</div><p class="lead">두 번째 삽화가 붙은 장면의 설명 문장입니다 ' + id + '.</p></section>';
  const wv = S.fromChapters([{ id: 'a', title: '챕터A', html: withImg('a', '/a1.webp', '/a2.webp') }, { id: 'b', title: '챕터B', html: withImg('b', '/b1.webp', '/b1.webp') }, { id: 'c', title: '챕터C', html: txt(1) + txt(2) + txt(3) }], { id: 'world:w9', title: '세계', bg: '/bg.webp', per: 3, max: 36 });
  const imgsOf = id => wv.frames.filter(f => new RegExp('^챕터' + id).test(f.cap)).map(f => f.img);
  ok(wv && wv.frames.length === 9, '챕터 3개 × 3컷: ' + (wv && wv.frames.length));
  ok(imgsOf('A').join() === '/a1.webp,/a2.webp,/a2.webp', '챕터A: 자기 이미지를 앞에서부터 나눠 받음: ' + imgsOf('A'));
  ok(imgsOf('B').every(x => x === '/b1.webp'), '챕터B: 이미지가 하나면 그 이미지');
  ok(imgsOf('C').every(x => x === '/bg.webp'), '이미지가 없는 챕터는 세계 배경');
  ok(new Set(wv.frames.map(f => f.img)).size === 4, '세계 전체 이미지가 한 장으로 뭉치지 않음: ' + new Set(wv.frames.map(f => f.img)).size);
  // 관리자가 지정한 컷 이미지(meta.cut)는 본문 삽화보다 우선하고, 컷 순서대로 쓰며 모자라면 돌려 쓴다
  const wo = S.fromChapters([{ id: 'a', title: '챕터A', html: withImg('a', '/a1.webp', '/a2.webp') }, { id: 'b', title: '챕터B', html: withImg('b', '/b1.webp', '/b1.webp') }, { id: 'c', title: '챕터C', html: txt(1) + txt(2) + txt(3) }],
    { id: 'world:w9', title: '세계', bg: '/bg.webp', per: 3, max: 36, cut: { a: ['/o1.webp', '/o2.webp'], c: ['/o3.webp'] } });
  const ofCh = id => wo.frames.filter(f => new RegExp('^챕터' + id).test(f.cap)).map(f => f.img);
  ok(ofCh('A').join() === '/o1.webp,/o2.webp,/o1.webp', '지정 이미지가 본문 삽화보다 우선·컷 순서·돌려 쓰기: ' + ofCh('A'));
  ok(ofCh('B').join() === '/b1.webp,/b1.webp,/b1.webp', '지정하지 않은 챕터는 본문 삽화 그대로');
  ok(ofCh('C').every(x => x === '/o3.webp'), '삽화가 없는 챕터도 지정 이미지를 쓴다(그래프 챕터 등)');
  ok(/data-wtoon="w1"/.test(S.toonCard({ wid: 'w1', name: '세계', frames: 3 })), '세계 카드 버튼');
}
ok(S.dwell({paras:['가'.repeat(1000)],cap:''},1)>16000,'긴 본문은 16초 안에 넘기지 않는다');
ok(S.dwell({paras:['짧은 글'],cap:''},0.5)===S.dwell({paras:['짧은 글'],cap:''},1)*2,'0.5배속은 두 배 머문다');
console.log('윤회의 문 검증 완료');
if (fails.length) { console.log('실패 ' + fails.length + '건\n' + fails.slice(0, 20).map(f => ' ✗ ' + f).join('\n')); process.exit(1); }
console.log('모두 통과');
