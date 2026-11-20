// 무료 타로 "카드 그림으로 읽기" 검사(2026-11-16): 78장 × 정/역 × 분야 5종 문안이 빠짐없이 있고, 존댓말·단정 표현 금지·중복 없음,
// FreeCore.composeTarot / TarotRead 자리별 풀이에 연결되고, 화면·로드 목록·카드 이름 띠(역방향은 그림만 회전)가 맞는지 확인한다.
const assert = require('assert/strict');
const fs = require('fs'), path = require('path');
globalThis.window = globalThis;
const root = path.join(__dirname, '..'), rd = p => fs.readFileSync(path.join(root, p), 'utf8');
const core = require('../shared-core.js');
const Tarot = (globalThis.MantraCore || core).Tarot;
require('../report/hub/tarot-symbols.js');
require('../report/hub/free-core.js');
require('../report/hub/tarot-read.js');
const TS = globalThis.TarotSymbols, FC = globalThis.FreeCore, TR = globalThis.TarotRead;
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };

// 1. 카드 78장 전부, 형식
const ids = Tarot.cards.map(c => c.id);
ok(ids.length === 78, '카드 78장');
assert.deepEqual(Object.keys(TS.cards).sort(), ids.slice().sort(), '상징 문안 카드 목록 = 카드 DB');
const all = [];
for (const id of ids) {
  const c = TS.cards[id];
  ok(Array.isArray(c) && c.length === 7, id + ' 항목 7개');
  [0, 1, 2, 3].forEach(i => ok(typeof c[i] === 'string' && c[i].length >= 30, id + ' 문장 ' + i));
  [4, 5, 6].forEach(i => ok(Array.isArray(c[i]) && c[i].length === 2 && c[i].every(s => typeof s === 'string' && s.length >= 20), id + ' 주제 ' + i));
  ok(/^정방향/.test(c[2]) && /^역방향/.test(c[3]), id + ' 정/역 읽기 시작');
  ok(/뜻합니다\.$/.test(c[1]), id + ' 상징 풀이는 "…을 뜻합니다."');
  ok(c[2] !== c[3] && c[4][0] !== c[4][1] && c[5][0] !== c[5][1] && c[6][0] !== c[6][1], id + ' 정/역 문장이 다르다');
  all.push(c[0], c[1], c[2], c[3], ...c[4], ...c[5], ...c[6]);
}
// 2. 존댓말·단정 표현 금지·중복 없음
const sentences = all.flatMap(s => s.split(/(?<=[.?!])\s+/));
const polite = /(니다|세요|어요|아요|해요|예요|이에요|주세요)\.$/;
const notPolite = sentences.filter(s => !polite.test(s.trim()));
assert.deepEqual(notPolite, [], '모든 문장은 존댓말로 끝난다');
const BAN = /반드시|무조건|절대로|틀림없|100%|운명적으로|망합니다|파멸|죽습니다|저주/;
assert.deepEqual(all.filter(s => BAN.test(s)), [], '단정적·공포 표현 없음');
const dup = all.filter((s, i) => all.indexOf(s) !== i);
assert.deepEqual(dup, [], '같은 문장이 두 번 쓰이지 않는다');
ok(!/'[^']*'(이\(가\)|을\(를\))/.test(all.join(' ')), '조사 자리표시 없음');
for (const t of [...Object.values(TS.TODAY).flat(), ...Object.values(TS.YESNO)]) ok(polite.test(t.trim()) && !BAN.test(t), '공용 문장 존댓말: ' + t.slice(0, 20));

// 3. 조합기 연결: 78 × 정/역 × 분야 5
const LEAD = { love: '관계에 비춰 보면, ', money: '돈에 비춰 보면, ', work: '일에 비춰 보면, ', today: '오늘 하루로 옮겨 보면, ', yesno: '질문의 답으로 옮겨 보면, ' };
for (const id of ids) for (const rev of [false, true]) for (const m of Object.keys(LEAD)) {
  const r = FC.composeTarot(Tarot, id, rev, m, 'seed', null);
  ok(r && r.art && r.art.scene === TS.cards[id][0] && r.art.orient === TS.cards[id][rev ? 3 : 2], id + rev + m + ' 그림 읽기');
  ok(r.art.bridge.startsWith(LEAD[m]), id + rev + m + ' 주제 연결 머리말');
}
// 상징 파일이 없어도 기존 풀이는 그대로(art 만 null)
const saved = globalThis.TarotSymbols; delete globalThis.TarotSymbols;
const r0 = FC.composeTarot(Tarot, 'W12', true, 'money', 'seed', null);
ok(r0 && r0.art === null && r0.headline && r0.detail.length === 2, '상징 파일 없으면 art 없음, 기존 문장 유지');
globalThis.TarotSymbols = saved;

// 4. 여러 장 배열: 자리마다 그림 읽기가 들어간다(장애물·조언처럼 요약이 없는 자리 포함)
const deck = Tarot.draw(78);
for (const [key, k] of [['one', 1], ['three', 3], ['four', 4]]) {
  const rs = Tarot.readSpread(key, deck.slice(0, k), 'love');
  const list = TR.readings(rs.rows, { FC, Tarot, mode: 'love', spread: key, seed: 's', ov: null, plain: false });
  list.forEach(x => ok(x.blocks.some(b => b.t === 'p' && b.text === TS.cards[x.row.card.id][0]), key + '/' + x.row.k + ' 그림 장면 포함'));
}

// 5. 화면·로드 목록·카드 이름 띠
const hub = rd('report/hub/hub-tarot.js'), css = rd('report/hub/hub.css'), story = rd('report/story/story.js');
ok(hub.includes("sec('카드 그림으로 읽기'"), '단일 카드 화면에 그림 읽기 섹션');
ok(/tarot-symbols\.js' \+ HV\], \[base \+ 'free-core\.js'/.test(story), '허브 로드 목록: tarot-symbols → free-core');
ok(/<script src="tarot-symbols\.js"><\/script>\s*<script src="free-core\.js(\?v=[^"]*)?">/.test(rd('report/hub/index.html')), '허브 단독 페이지 로드');
ok(/<script src="\/report\/hub\/tarot-symbols\.js"><\/script>\s*<script src="\/report\/hub\/free-core\.js">/.test(rd('index.html')), '만세력 앱 로드');
const hv = /HV = '(\?v=[^']+)'/.exec(story)[1];
ok(rd('report/index.html').includes('story/story.js' + hv), 'story.js 버전과 허브 HV 일치');
ok(/#hub \.rev \.fx \.fa\{ transform: rotate\(180deg\); \}/.test(css) && !/#hub \.rev \.fx\{ transform: rotate/.test(css), '역방향은 그림 창만 회전(이름 띠는 바로 선다)');
const fnm = /#hub \.fx \.fnm\{([^}]*)\}/.exec(css)[1];
ok(/color: #2a1a08/.test(fnm) && /font-weight: 700/.test(fnm), '이름 띠 글씨는 한지 바탕 위 먹색 굵은 글씨');
ok(/#hub \.face \.fx\{ container-type: inline-size; \}/.test(css) && !/#hub \.fx\{ container-type/.test(css), 'container-type 은 카드 앞면 안에서만(#screen.fx 제외)');

console.log('PASS tarot-symbols-sim: ' + n + '건 (78장 × 정/역 × 분야 5, 문장 ' + sentences.length + '개)');
