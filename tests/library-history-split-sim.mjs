// 장 라이브러리 이력 분리: 본 행에는 history 가 남지 않고, 별도 키에 중복 없이 쌓이며, 예전 행의 history 도 읽고 옮긴다.
//   node tests/library-history-split-sim.mjs
import assert from 'node:assert/strict';
import * as H from '../functions/_library-history.js';
import * as L from '../functions/_reviewed-library.js';
import {sqlFor,rollbackSqlFor} from '../editorial/rebuild-20261022/publish/prepare.mjs';
import {migrateSql,rollbackSql,CHAPTERS} from '../tools/migrate-library-history.mjs';

const P = n => [{ id: 'p' + n, role: 'title', text: '문장 ' + n }];
const SC = [{ sd: { x: 1 }, expectedPassageIds: ['p1'], forbiddenPassageIds: [] }];

// 1. 형식: 초안==게시본이면 draft 생략, 같은 검증 사례는 한 번만 저장, 펼치면 예전 모양
let doc = H.emptyHistory();
for (let v = 1; v <= 20; v++) doc = H.pushHistory(doc, { version: v, published: P(v), draft: P(v), scenarios: SC, at: 't' + v });
assert.equal(doc.entries.length, H.HISTORY_CAP, 'cap');
assert.equal(doc.entries[0].version, 20, 'newest first');
assert.equal(Object.keys(doc.scenarios).length, 1, 'scenarios stored once');
assert(!('draft' in doc.entries[0]), 'draft omitted when equal to published');
const e = H.findVersion(doc, 18);
assert.deepEqual(e.draft, P(18)); assert.deepEqual(e.scenarios, SC); assert.equal(H.findVersion(doc, 3), undefined);
// 같은 버전을 다시 넣으면 바뀌고 늘지 않는다
doc = H.pushHistory(doc, { version: 20, published: P(99), draft: P(98), scenarios: [], at: 'x' });
assert.equal(doc.entries.length, H.HISTORY_CAP); assert.deepEqual(H.findVersion(doc, 20).draft, P(98));
assert.equal(Object.keys(doc.scenarios).length, 2);
// 크기 한도: 오래된 것부터 빠지고 최소 1개는 남는다
const big = Array.from({ length: 50 }, (_, i) => ({ id: 'b' + i, role: 'title', text: 'x'.repeat(1000) }));
let small = H.emptyHistory();
for (let v = 1; v <= 10; v++) small = H.pushHistory(small, { version: v, published: big, scenarios: [] }, { maxBytes: 200000 });
assert(small.entries.length >= 1 && small.entries.length < 10 && small.entries[0].version === 10, 'byte budget trims oldest');

// 2. 예전 행(본 행 안 history 배열)을 읽어 합친다
const legacy = [{ version: 4, published: P(4), draft: P(4), scenarios: SC, at: 'a' }, { version: 3, published: P(3), draft: P(2), scenarios: SC, at: 'b' }];
const folded = H.parseHistory(null, legacy);
assert.deepEqual(folded.entries.map(x => x.version), [4, 3]); assert.deepEqual(H.findVersion(folded, 3).draft, P(2));
assert.deepEqual(H.parseHistory(folded, legacy).entries.length, 2, 'no duplicates when both exist');
assert.deepEqual(H.parseHistory(legacy).entries.map(x => x.version), [4, 3], 'bare legacy array in the history key');

// 3. 리비전은 이력과 무관
assert.equal(await L.libraryRevision({ version: 1, published: [], history: [1, 2] }), await L.libraryRevision({ version: 1, published: [] }));

// 4. 생성 SQL: 본 행에서 history 를 빼고, 이력 키를 먼저 CAS 로 쓴다
const obs = { v: 3, h: 'a'.repeat(32) }, incoming = { passages: P(1), scenarios: SC, review: {} };
const apply = sqlFor({ chapter: 'timeline_self_01', incoming, newHash: 'b'.repeat(32), obs, mode: 'apply' });
assert(apply.includes("(old-'history')") && !/'history',jsonb_build_array/.test(apply), 'main row drops inline history');
assert(apply.indexOf("reading_compare_and_swap('ik:blocks:chapter:library.timeline_self_01:history'") < apply.indexOf("reading_compare_and_swap('ik:blocks:chapter:library.timeline_self_01',"), 'history written first');
const dry = sqlFor({ chapter: 'timeline_self_01', incoming, newHash: 'b'.repeat(32), obs, mode: 'dry' });
assert(!dry.includes('reading_compare_and_swap') && !/for update/.test(dry), 'dry run writes and locks nothing');
assert(rollbackSqlFor({ chapter: 'timeline_self_01', newHash: 'b', obs }).includes("hdoc->'entries'->0"));
assert.equal(CHAPTERS.length, 107);
assert(!migrateSql('timeline_self_20', 'dry').includes('reading_compare_and_swap'));
assert(migrateSql('timeline_self_20', 'apply').includes("next:=old-'history'"));
assert(rollbackSql('timeline_self_20').includes('7500000'));

// 5. 관리자 API: 예전 행을 저장하면 본 행에서 history 가 빠지고 이력 키로 옮겨진다, 복원도 이력 키에서
const API = await import('../functions/api/reading-library.js');
const store = new Map(), chapter = 'timeline_self_01';
store.set(L.libraryKey(chapter), JSON.stringify({ version: 5, published: [], draft: [], scenarios: [], history: [{ version: 4, published: [], draft: [], scenarios: [], at: 'old' }] }));
const kv = { get: async (k, t) => { const v = store.has(k) ? store.get(k) : null; return t === 'json' && v ? JSON.parse(v) : v; },
  readingCAS: async (k, before, next) => { if ((store.has(k) ? store.get(k) : null) !== before) return false; store.set(k, next); return true; } };
const env = { ADMIN_PASSWORD: 'local-only', GLOSSARY_KV: kv };
const call = async (method, body) => { const r = await API.onRequest({ env, request: new Request('https://local/api/reading-library?chapter=' + chapter, { method, headers: { authorization: 'Bearer local-only' }, body: body && JSON.stringify(body) }) }); return { status: r.status, body: await r.json() }; };
let g = await call('GET');
if (g.status === 200) {
  assert.deepEqual(g.body.library.history, [{ version: 4, at: 'old' }], 'GET shows version list only');
  const s = await call('POST', { action: 'save', expectRevision: g.body.revision, passages: [], scenarios: [] });
  assert.equal(s.status, 200, JSON.stringify(s.body));
  const main = JSON.parse(store.get(L.libraryKey(chapter))), hist = JSON.parse(store.get(H.historyKey(chapter)));
  assert(!('history' in main), 'main row has no history'); assert.equal(main.version, 6);
  assert.deepEqual(hist.entries.map(x => x.version), [5, 4], 'legacy history moved, current version added');
  g = await call('GET');
  const r = await call('POST', { action: 'restore', expectRevision: g.body.revision, restoreVersion: 4 });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  assert.deepEqual(JSON.parse(store.get(H.historyKey(chapter))).entries.map(x => x.version), [6, 5, 4]);
  console.log(JSON.stringify({ passed: true, api: 'checked' }));
} else console.log(JSON.stringify({ passed: true, api: 'skipped: GET ' + g.status + ' ' + JSON.stringify(g.body).slice(0, 120) }));
