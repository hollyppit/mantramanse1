// 주역 검수·게시 저장소와 작업 처리. 순수 규칙은 report/iching/review-core.js, 여기는 저장(KV)·동시 수정 검사·이력만 맡는다.
// 저장 키(GLOSSARY_KV, 접두어 'iching:' — 지금은 Supabase 로 옮기지 않는다):
//   iching:review:state      { version, items:{키:{status,contentHash,by,at,note}}, updatedAt }
//   iching:review:overrides  { 키:{content,by,at,baseHash,note} }   관리자가 고친 문구(없으면 코드의 초안)
//   iching:release:current   현재 게시본 { version, items:{키:해시}, count, createdAt, by, note, reviewVersion, restoredFrom }
//   iching:release:v<N>      게시본 스냅샷(불변, 롤백 원본)
//   iching:log:<시각>-<난수> 변경 이력(항목 키는 최대 1000개까지 기록)
//   iching:flags             { enabled, categories }  기본 꺼짐
// 동시 수정: 요청의 expectVersion 이 저장된 버전과 다르면 409. KV 는 원자적 비교-쓰기를 제공하지 않아 두 요청이 같은 순간에 겹치면 뒤의 쓰기가 이길 수 있다
//            (관리자 한두 명이 쓰는 도구라 허용하고, 어떤 쓰기든 이력에 남는다).
import { Ic } from './_iching-runtime.js';

const K_STATE = 'iching:review:state', K_OV = 'iching:review:overrides', K_REL = 'iching:release:current', K_FLAGS = 'iching:flags', P_LOG = 'iching:log:', P_REL = 'iching:release:v';
const now = () => new Date().toISOString();
const rd = async (kv, k, d) => { const v = await kv.get(k, 'json'); if (v == null) return d; return typeof v === 'string' ? JSON.parse(v) : v; };
const wr = (kv, k, v) => kv.put(k, JSON.stringify(v));
const cleanBy = h => 'admin' + (h ? ':' + String(h).replace(/[^\w가-힣 .@-]/g, '').slice(0, 30) : '');

export async function load(kv) {
  const { Review } = Ic();
  const [state, overrides, release, flags] = await Promise.all([rd(kv, K_STATE, Review.emptyState()), rd(kv, K_OV, {}), rd(kv, K_REL, null), rd(kv, K_FLAGS, { enabled: false, categories: [] })]);
  return { state, overrides, release, flags };
}
const hydrate = store => Ic().Review.hydrate(store);

async function log(kv, entry) { await wr(kv, P_LOG + String(Date.now()).padStart(14, '0') + '-' + Math.random().toString(36).slice(2, 6), entry); }
export async function readLog(kv, { key, limit = 50 } = {}) {
  const l = await kv.list({ prefix: P_LOG, limit: 1000 }), names = ((l && l.keys) || []).map(k => k.name).sort().reverse(), out = [];
  for (const n of names) { const e = await rd(kv, n, null); if (!e) continue; if (key && !(e.keys || []).includes(key)) continue; out.push(e); if (out.length >= limit) break; }
  return out;
}

const itemRow = (K, R, store, key) => {
  const i = R.info(key), st = K.status(key), ov = store.overrides[key], r = store.state.items[key];
  return { key, type: i.type, num: i.num, hex: i.hex, cat: i.cat, pos: i.pos, label: i.label, status: st, released: K.released(key), edited: !!ov, reviewedBy: r ? r.by : null, at: r ? r.at : null, note: r ? r.note : '' };
};

export async function getState(kv) {
  const { Content: K, Review: R } = Ic(), store = await load(kv); hydrate(store);
  return { ok: true, summary: R.summary(store.state, store.release), readiness: R.readiness(store.release, { categories: K.CATEGORIES }), flags: store.flags, release: store.release ? { version: store.release.version, count: store.release.count, createdAt: store.release.createdAt, by: store.release.by, note: store.release.note, restoredFrom: store.release.restoredFrom } : null, reviewVersion: store.state.version };
}

export async function listItems(kv, q) {
  const { Content: K, Review: R } = Ic(), store = await load(kv); hydrate(store);
  const type = q.type || '', status = q.status || '', hex = +q.hex || 0, cat = q.cat || '', text = (q.q || '').trim().toLowerCase();
  const offset = Math.max(0, +q.offset || 0), limit = Math.min(200, Math.max(1, +q.limit || 50));
  let rows = K.allKeys().map(k => itemRow(K, R, store, k));
  if (type) rows = rows.filter(r => r.type === type); if (status) rows = rows.filter(r => r.status === status || (status === 'released' && r.released));
  if (hex) rows = rows.filter(r => r.num === hex); if (cat) rows = rows.filter(r => r.cat === cat);
  if (text) rows = rows.filter(r => (r.hex + ' ' + r.label + ' ' + r.key).toLowerCase().includes(text));
  return { ok: true, total: rows.length, offset, items: rows.slice(offset, offset + limit) };
}

export async function getItem(kv, key) {
  const { Content: K, Review: R } = Ic(), store = await load(kv); hydrate(store);
  if (!R.info(key) || !(K.builtin(key) || store.overrides[key])) return { ok: false, error: 'not-found', status: 404 };
  const eff = K.effective(key), v = R.validateContent(key, eff), ov = store.overrides[key];
  const meta = key.startsWith('classics:') ? { source: K.classics.meta, variants: (eff && eff.variants) || [] } : null;
  return { ok: true, item: itemRow(K, R, store, key), content: eff, builtin: K.builtin(key) || null, override: ov ? { by: ov.by, at: ov.at, note: ov.note, builtinChanged: ov.baseHash != null && ov.baseHash !== K.hash(K.canon(K.builtin(key))) } : null, hash: K.currentHash(key), validation: v, source: meta, history: await readLog(kv, { key, limit: 20 }) };
}

function conflict(have, want) { return want != null && +want !== have ? { ok: false, error: 'version-conflict', current: have, status: 409 } : null; }

export async function review(kv, b, by) {
  const { Review: R } = Ic(), store = await load(kv), c = conflict(store.state.version, b.expectVersion); if (c) return c;
  const ctx = { by, now: now(), note: String(b.note || '').slice(0, 300) }, r = R.applyReview(store.state, { action: b.action, keys: b.keys, note: ctx.note }, ctx);
  if (!r.changed.length) return { ok: r.errors.length === 0, changed: 0, errors: r.errors, version: store.state.version, status: r.errors.length ? 422 : 200 };
  await wr(kv, K_STATE, r.state);
  await log(kv, R.logEntry(r.state.version, b.action, r.changed.map(x => x.key), ctx, { to: r.changed[0].to, errorCount: r.errors.length }));
  return { ok: true, changed: r.changed.length, errors: r.errors, version: r.state.version };
}

export async function edit(kv, b, by) {
  const { Review: R } = Ic(), store = await load(kv), c = conflict(store.state.version, b.expectVersion); if (c) return c;
  const ctx = { by, now: now(), note: String(b.note || '').slice(0, 300) }, r = R.applyEdit(store, String(b.key || ''), b.content, ctx);
  if (r.errors.length) return { ok: false, error: 'validation-failed', errors: r.errors, status: 422 };
  await Promise.all([wr(kv, K_OV, r.overrides), wr(kv, K_STATE, r.state)]);
  await log(kv, R.logEntry(r.state.version, 'edit', [b.key], ctx));
  return { ok: true, version: r.state.version, warnings: r.warnings };
}

export async function revert(kv, b, by) {
  const { Review: R } = Ic(), store = await load(kv), c = conflict(store.state.version, b.expectVersion); if (c) return c;
  const ctx = { by, now: now(), note: String(b.note || '').slice(0, 300) }, r = R.applyRevert(store, String(b.key || ''), ctx);
  if (r.errors.length) return { ok: false, error: 'not-edited', errors: r.errors, status: 422 };
  await Promise.all([wr(kv, K_OV, r.overrides), wr(kv, K_STATE, r.state)]);
  await log(kv, R.logEntry(r.state.version, 'revert', [b.key], ctx));
  return { ok: true, version: r.state.version };
}

// 게시: dryRun 이면 저장하지 않고 무엇이 달라지는지(추가·제거·변경·건너뜀)만 보여 준다.
export async function publish(kv, b, by) {
  const { Review: R } = Ic(), store = await load(kv);
  const cur = store.release ? store.release.version : 0, c = conflict(cur, b.expectReleaseVersion); if (c) return { ...c, error: 'release-conflict' };
  const c2 = conflict(store.state.version, b.expectReviewVersion); if (c2) return c2;
  const ctx = { by, now: now(), note: String(b.note || '').slice(0, 300) }, built = R.buildRelease(store.state, store.release, ctx), diff = R.diffRelease(store.release, built.release);
  const out = { ok: true, dryRun: !!b.dryRun, version: built.release.version, count: built.release.count, diff: { added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length, sampleAdded: diff.added.slice(0, 10), sampleRemoved: diff.removed.slice(0, 10) }, skipped: built.skipped.slice(0, 20), skippedCount: built.skipped.length };
  if (b.dryRun) return out;
  if (!diff.added.length && !diff.removed.length && !diff.changed.length) return { ...out, ok: false, error: 'nothing-to-publish', status: 409 };
  await Promise.all([wr(kv, P_REL + built.release.version, built.release), wr(kv, K_REL, built.release)]);
  await log(kv, R.logEntry(store.state.version, 'publish', diff.added.concat(diff.changed), ctx, { releaseVersion: built.release.version, added: diff.added.length, removed: diff.removed.length, changed: diff.changed.length }));
  return out;
}

export async function rollback(kv, b, by) {
  const { Review: R } = Ic(), store = await load(kv), cur = store.release ? store.release.version : 0, c = conflict(cur, b.expectReleaseVersion); if (c) return { ...c, error: 'release-conflict' };
  const target = await rd(kv, P_REL + (+b.toVersion || 0), null); if (!target) return { ok: false, error: 'release-not-found', status: 404 };
  const ctx = { by, now: now(), note: String(b.note || '').slice(0, 300) || '롤백 v' + target.version }, next = R.rollbackRelease(store.release, target, ctx);
  await Promise.all([wr(kv, P_REL + next.version, next), wr(kv, K_REL, next)]);
  await log(kv, R.logEntry(store.state.version, 'rollback', [], ctx, { releaseVersion: next.version, restoredFrom: target.version }));
  return { ok: true, version: next.version, restoredFrom: target.version, count: next.count };
}

export async function listReleases(kv) {
  const l = await kv.list({ prefix: P_REL, limit: 200 }), out = [];
  for (const k of (l && l.keys) || []) { const r = await rd(kv, k.name, null); if (r) out.push({ version: r.version, count: r.count, createdAt: r.createdAt, by: r.by, note: r.note, restoredFrom: r.restoredFrom }); }
  return { ok: true, releases: out.sort((a, b) => b.version - a.version) };
}

// 서비스 개방 플래그: 게시본이 모든 괘·선택한 분야를 채우기 전에는 켤 수 없다(부분 개방 금지).
export async function setFlags(kv, b, by) {
  const { Review: R, Content: K } = Ic(), store = await load(kv); hydrate(store);
  const cats = (Array.isArray(b.categories) ? b.categories : []).filter(c => K.CATEGORIES.includes(c));
  if (b.enabled) {
    if (!cats.length) return { ok: false, error: 'no-category', status: 422 };
    const ready = R.readiness(store.release, { categories: cats });
    if (!ready.ready) return { ok: false, error: 'not-ready', missing: ready.missing, sample: ready.sample, status: 409 };
  }
  const flags = { enabled: !!b.enabled, categories: cats, at: now(), by };
  await wr(kv, K_FLAGS, flags); await log(kv, R.logEntry(store.state.version, 'flags', [], { by, now: flags.at, note: JSON.stringify({ enabled: flags.enabled, categories: cats }) }));
  return { ok: true, flags };
}

// 미리보기: 실제 계산(엔진)으로 괘를 만들고 같은 조합기로 해석한다. mode=public 이면 사용자에게 실제로 보일 결과(게시본 기준)를 그대로 보여 준다.
export async function preview(kv, q) {
  const { Content: K, Review: R, Engine: E, Compose, Schema, Quality } = Ic(), store = await load(kv); hydrate(store);
  const values = String(q.values || '').split(',').map(Number); if (values.length !== 6 || !values.every(E.isLineValue)) return { ok: false, error: 'invalid-values', status: 400 };
  const cat = K.CATEGORIES.includes(q.cat) ? q.cat : 'general', mode = q.mode === 'public' ? 'public' : 'preview';
  const cast = E.resolve(values), saju = q.saju === '1' ? { dayMaster: { stem: '병', el: '화' }, strength: { band: '신약' }, nowYear: new Date().getFullYear(), daewoon: [{ startYear: new Date().getFullYear() - 3, endYear: new Date().getFullYear() + 6, ganzhi: '임인', season: 'accumulation' }] } : null;
  const result = Compose.compose({ question: String(q.question || '(미리보기 질문)').slice(0, 200), category: cat, cast, saju }, { mode });
  return { ok: true, result, validation: Schema.validate(result), quality: Quality.check(result, { cast, saju }), note: saju ? '사주 입력은 형식 확인용 예시 값입니다.' : null };
}

// 괘 단위 보기: 한 괘의 12개 항목(원문·현대어·분야 4·효 6)을 내용·상태·규칙 검사와 함께 한 번에 돌려준다.
export async function getHex(kv, num) {
  const { Content: K, Review: R } = Ic(), n = +num; if (!(n >= 1 && n <= 64)) return { ok: false, error: 'invalid-hex', status: 400 };
  const store = await load(kv); hydrate(store);
  const keys = ['classics:' + n, 'modern:' + n, ...K.CATEGORIES.map(c => 'pack:' + n + ':' + c), ...[1, 2, 3, 4, 5, 6].map(p => 'pack:' + n + ':line:' + p)];
  return { ok: true, num: n, hex: R.info(keys[0]).hex, reviewVersion: store.state.version, items: keys.map(k => ({ ...itemRow(K, R, store, k), content: K.effective(k), errors: R.validateContent(k, K.effective(k)).errors })) };
}

// 64괘 한눈에 보기: 괘마다 12개 항목의 상태를 한 글자씩(p 게시됨 · r 승인 · d 초안 · i 원문 가져옴 · s 수정됨(재검수) · x 반려)
export async function getGrid(kv) {
  const { Content: K, Review: R, Hexagrams: HX } = Ic(), store = await load(kv); hydrate(store);
  const L = { reviewed: 'r', draft: 'd', 'source-imported': 'i', stale: 's', rejected: 'x', missing: 'm' };
  const rows = []; for (let n = 1; n <= 64; n++) {
    const keys = ['classics:' + n, 'modern:' + n, ...K.CATEGORIES.map(c => 'pack:' + n + ':' + c), ...[1, 2, 3, 4, 5, 6].map(p => 'pack:' + n + ':line:' + p)];
    rows.push({ num: n, ko: HX.byNum(n).ko, hanja: HX.byNum(n).hanja, s: keys.map(k => (K.released(k) ? 'p' : L[K.status(k)] || 'd')).join('') });
  }
  return { ok: true, rows, reviewVersion: store.state.version };
}
