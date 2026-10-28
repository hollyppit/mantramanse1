// 주제별 풀이 중간의 주역 카드(report/v2/iching-card.js) 검증: 개방 여부에 따른 노출, 삽입 위치, 카드 마크업(자동 진행 멈춤 표식·건너뛰기), 이스케이프, 결과·AI 렌더, 사주 입력 모양.
const assert = require('assert/strict');
const store = new Map();
globalThis.localStorage = { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)) };
globalThis.fetch = async () => { throw new Error('이 테스트는 네트워크를 쓰지 않는다'); };
const L = require('../report/iching/node-loader.js'); // 서버가 만드는 것과 같은 결과를 얻기 위해 로더 사용
const Card = require('../report/v2/iching-card.js');
const { compose } = L.Compose, E = L.Engine;

// ── 개방 전에는 카드가 나오지 않는다 ──
Card._setStatus(null); globalThis.Iching = E;
for (const w of ['w1', 'w2', 'w3', 'w7']) assert.equal(Card.offered(w), false, '상태를 모르면 카드를 넣지 않는다');
Card._setStatus({ open: false, categories: [] }); assert.equal(Card.offered('w2'), false);
Card._setStatus({ open: true, categories: ['wealth'], ai: { enabled: false } });
assert.equal(Card.offered('w2'), true); assert.equal(Card.offered('w7'), false, '열리지 않은 분야는 카드가 없다'); assert.equal(Card.offered('w5'), false, '점괘 대상이 아닌 세계(전생·개운법 등)는 카드가 없다'); assert.equal(Card.offered('w1'), false);
Card._setStatus({ open: true, categories: ['general', 'wealth', 'career', 'love'] });
assert.deepEqual(['w1', 'w2', 'w7', 'w3'].map(Card.categoryOf), ['general', 'wealth', 'career', 'love']);
delete globalThis.Iching; delete globalThis.window; assert.equal(Card.offered('w2'), false, '점괘 계산 모듈이 없으면 카드를 넣지 않는다'); globalThis.Iching = E;

// ── 삽입 위치: 세계 챕터의 절반 지점 뒤 ──
assert.equal(Card.anchorFor([]), -1); assert.equal(Card.anchorFor(null), -1);
assert.equal(Card.anchorFor([5]), 5); assert.equal(Card.anchorFor([5, 9]), 5); assert.equal(Card.anchorFor([2, 4, 7, 8]), 4);
assert.equal(Card.anchorFor(Array.from({ length: 20 }, (_, i) => i)), 9, '20장 → 10번째 챕터 뒤');
assert.equal(Card.anchorFor([3, 6, 8]), 3);

// ── 첫 화면: 자동 진행을 멈추는 표식(.vd), 건너뛰기, 동의 고지 ──
let h = Card.html('w2');
assert.match(h, /class="rd-answer rd-iching"/); assert.match(h, /data-completed="0"/); assert.match(h, /class="vd rd-answer-choices"/, '읽기 엔진이 .vd 를 보고 자동 진행을 멈춘다');
assert.match(h, /data-ic-start/); assert.match(h, /data-ic-skip/); assert.match(h, /건너뛰고 이어 읽기/); assert.match(h, /재물 주제로 주역 점괘/);
assert.ok(!/AI 상세 풀이가 함께/.test(h), 'AI 가 꺼져 있으면 AI 고지를 보이지 않는다'); assert.match(h, />점괘 보기</);
assert.equal((h.match(/data-ic-q=/g) || []).length, 3, '재물 분야 추천 질문 3개');
// AI 가 켜져 있으면 전송 고지와 "동의하고" 버튼
Card._setStatus({ open: true, categories: ['wealth'], ai: { enabled: true } }); delete require.cache[require.resolve('../report/v2/iching-card.js')];
const Card2 = require('../report/v2/iching-card.js'); Card2._setStatus({ open: true, categories: ['wealth', 'career'], ai: { enabled: true } });
h = Card2.html('w7'); assert.match(h, /동의하고 점괘 보기/); assert.match(h, /OpenAI 또는 Anthropic/); assert.match(h, /이름·생년월일·출생지는 보내지 않으며/); assert.match(h, /관리자 검수를 거치지 않습니다/); assert.match(h, /커리어 주제/);
// 질문 입력은 이스케이프된다
Card2._state.w7.q = '"><script>alert(1)</script>'; h = Card2.html('w7'); assert.ok(!h.includes('<script>'), '질문이 HTML 로 해석되지 않는다'); assert.match(h, /&lt;script&gt;/);

// ── 결과 화면: 서버와 같은 조합기로 만든 실제 결과로 렌더 ──
L.Content.setReviewState(Object.fromEntries(L.Content.allKeys().map(k => [k, { status: 'reviewed', contentHash: L.Content.currentHash(k) }])));
const cast = E.resolve([7, 7, 9, 8, 7, 8]), saju = { dayMaster: { stem: '경', el: '금' }, strength: { band: '신약' }, nowYear: 2026, daewoon: [{ startYear: 2017, endYear: 2026, ganzhi: '기유', season: 'accumulation' }] };
const result = compose({ question: '지금 투자를 시작해도 될까요?', category: 'wealth', cast, saju }, { mode: 'public', resultId: 'r-1', now: '2026-10-29T00:00:00Z' });
assert.equal(result.publishable, true);
const AI = { answer: '지금 당장 시작하기보다 손실 한도를 먼저 정하는 편이 현실적입니다.', reading: ['본괘는 기다림을 말합니다.', '변효는 조급함을 경계하라는 신호입니다.'], saju_note: '사주 쪽에서는 지금이 실력을 쌓는 구간입니다.', steps: ['손실 한도를 숫자로 적으십시오.', '수수료를 비교하십시오.', '한 달 뒤 기록을 점검하십시오.'], ask_yourself: ['잃어도 되는 금액은 얼마입니까?', '근거는 무엇입니까?', '서두르는 이유는 무엇입니까?'], caution: '이 풀이는 참고 자료입니다.' };
Card2._state.w2 = { phase: 'result', result, ai: { phase: 'done', detail: AI }, q: result.question };
h = Card2.html('w2');
assert.match(h, /제5괘 수\(需\)/); assert.match(h, /→ 절/); assert.match(h, /AI 상세 풀이/); assert.match(h, /AI 작성/); assert.match(h, /관리자가 한 줄씩 검수한 문장은 아닙니다/); assert.match(h, /손실 한도를 먼저 정하는/);
assert.ok(/<details class="rdic-more">/.test(h) && !/<details class="rdic-more" open>/.test(h), 'AI 풀이가 있으면 검수된 풀이는 접어 둔다');
assert.match(h, /data-ic-continue/); assert.match(h, /data-ic-again/); assert.match(h, /읽던 곳으로 돌아가 이어 읽기/); assert.match(h, /class="vd rd-answer-choices"/);
assert.ok(h.includes('有孚，光亨') || h.includes('rdic-orig'), '괘사 원문이 검수된 풀이 안에 있다');
for (const must of ['핵심 결론', '현재 상황', '변효와 변괘', '사주와 주역을 함께 보면', '최선과 최악의 시나리오', '현실적인 행동 처방', '최종 한마디']) assert.ok(h.includes(must), must);
assert.equal((h.match(/rdic-ln on/g) || []).length, 6, '여섯 효가 모두 그려진다'); assert.equal((h.match(/rdic-ln on chg/g) || []).length, 1, '변효 하나가 표시된다');
// AI 가 없거나 실패하면 검수된 풀이가 펼쳐진다
Card2._state.w2.ai = null; h = Card2.html('w2'); assert.match(h, /<details class="rdic-more" open>/, 'AI 가 없으면 검수된 풀이를 펼친다');
Card2._state.w2.ai = { phase: 'err', err: 'AI 서비스에 연결하지 못했습니다.' }; h = Card2.html('w2'); assert.match(h, /<details class="rdic-more" open>/); assert.match(h, /AI 서비스에 연결하지 못했습니다/); assert.match(h, /data-ic-ai/); assert.match(h, /AI 풀이 다시 요청/);
Card2._state.w2.ai = { phase: 'loading' }; h = Card2.html('w2'); assert.match(h, /풀이를 쓰는 중/);
// AI 응답의 HTML 은 이스케이프된다
Card2._state.w2.ai = { phase: 'done', detail: { ...AI, answer: '<img src=x onerror=alert(1)>' } }; h = Card2.html('w2'); assert.ok(!h.includes('<img src=x'), 'AI 출력도 이스케이프'); assert.match(h, /&lt;img/);

// ── 동전 던지는 중 ──
Card2._state.w3 = { phase: 'casting', coins: [[3, 3, 2], [2, 2, 3]], values: [8, 7], q: '' }; Card2._setStatus({ open: true, categories: ['love'], ai: { enabled: false } });
h = Card2.html('w3'); assert.match(h, /2번째 효 · 동전 합 7 → 소양/); assert.equal((h.match(/rdic-ln on/g) || []).length, 2); assert.equal((h.match(/class="rdic-coin /g) || []).length, 3);

// ── 실패 화면은 건너뛰기를 남긴다 ──
Card2._state.w1 = { phase: 'err', err: '점괘 풀이가 아직 준비되지 않았습니다. 건너뛰고 이어 읽어 주세요.', q: '' }; Card2._setStatus({ open: true, categories: ['general'] }); h = Card2.html('w1');
assert.match(h, /아직 준비되지 않았습니다/); assert.match(h, /data-ic-skip/);

// ── 이전 점괘 복원(24시간) ──
store.set('mt_iching_last_w3', JSON.stringify({ at: Date.now() - 3600e3, result, ai: AI })); delete Card2._state.w3;
h = Card2.html('w3'); assert.match(h, /제5괘 수\(需\)/, '새로고침해도 방금 본 점괘가 복원된다'); assert.match(h, /AI 상세 풀이/);
store.set('mt_iching_last_w1', JSON.stringify({ at: Date.now() - 2 * 86400e3, result })); delete Card2._state.w1; h = Card2.html('w1'); assert.match(h, /data-ic-start/, '하루가 지난 기록은 복원하지 않는다');
store.set('mt_iching_last_w1', '{깨진 JSON'); delete Card2._state.w1; assert.match(Card2.html('w1'), /data-ic-start/, '깨진 저장값은 무시');

// ── 읽기 문서 연결: viewer.js 가 카드를 넣고 클릭을 넘기는지(정적 확인) ──
const fs = require('fs'), v = fs.readFileSync(require('path').join(__dirname, '../report/v2/viewer.js'), 'utf8'), idx = fs.readFileSync(require('path').join(__dirname, '../report/v2/index.html'), 'utf8');
assert.ok(v.includes('R.IchingCard.offered(S.readerWorld)') && v.includes('R.IchingCard.anchorFor(S.wmap.by[S.readerWorld])'), '세계 읽기에서만 카드를 넣는다');
assert.ok(v.includes('R.IchingCard.handleClick(e.target,') && v.includes('onContinue: function () { if (S.mv) S.mv.play(); }'), '이어 읽기는 같은 자리에서 재생을 다시 시작한다');
assert.ok(v.includes('R.IchingCard.init()'));
['iching-card.css', '/report/iching/hexagrams.js', '/report/iching/engine.js', 'iching-card.js'].forEach(f => assert.ok(idx.includes(f), f + ' 가 report/v2/index.html 에 없습니다'));
assert.ok(idx.indexOf('iching-card.js') < idx.indexOf('viewer.js'), '카드 모듈은 뷰어보다 먼저 로드');
console.log('PASS: 개방 여부별 노출, 절반 지점 삽입, 자동 진행 멈춤 표식·건너뛰기, 동의 고지, 이스케이프, 결과·AI 렌더와 폴백, 던지는 중·실패·복원, 읽기 문서 연결');
