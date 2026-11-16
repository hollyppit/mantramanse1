// 8단계: 인연의 광장 정식 공개 조건 점검표. 공용 계산 — 관리자 ① 공개 단계 카드·/api/community/launch·/api/community/status(정식 공개 전환)
// 원칙: 개발이 끝나도 운영자가 승인하기 전까지 비공개. 정식 공개는 관리자 비밀번호 + 확인 문구 '정식 공개' 로만(기능 플래그 KV community:stage).
//       점검표를 다 통과하지 못했으면 정식 공개를 막고, 그래도 열려면 '기준 미달 공개' 사유를 따로 적어야 한다(감사 로그에 점검 결과와 함께 남음).
// 기준값은 운영 데이터에 맞게 관리자가 바꾼다(KV 'community:launch'). 사람이 확인해야 하는 항목(개인정보·보안·성능·운영 점검)은 체크 + 메모로 남긴다.
//
// 점검 8항목(지시문 8단계 순서)
//   1 회원 규모: 전체 가입자 · 최근 30일 활성 회원(심층 분석+광장)
//   2 출시 알림 신청자 수
//   3 비공개 베타 참여율: 베타·테스터 권한 회원 중 최근 30일 광장을 쓴 비율
//   4 활동량(30일): 글 · 댓글 · 공감(좋아요)
//   5 재방문율: 광장 7일 · 30일
//   6 초기 콘텐츠: 보이는 글 수 · 글이 기준 이상 있는 카테고리 수
//   7 신고·차단·관리: 가장 오래 묵은 미처리 신고 시간 + 운영 점검(사람 확인)
//   8 개인정보·보안·성능 테스트 완료(사람 확인)
import { sbRest, supabaseReady } from './_commerce.js';
import { kstDay } from './_daily.js';
import { CATS } from './_plaza.js';

export const LAUNCH_KEY = 'community:launch';
export const DEFAULT_TARGETS = {
  members: 300, mau: 100,            // 1
  alerts: 200,                       // 2
  betaRate: 40, betaMin: 10,         // 3 (%) · 베타·테스터가 이 수보다 적으면 미달
  posts30: 50, comments30: 100, reactions30: 200,   // 4
  ret7: 25, ret30: 15,               // 5 (%) — 광장
  seedPosts: 100, seedPerCat: 5,     // 6 · 카테고리마다 seedPerCat 개 이상
  reportHours: 48,                   // 7 · 미처리 신고가 이 시간보다 오래 묵으면 미달
};
export const TARGET_LIMITS = { members: [0, 1e7], mau: [0, 1e7], alerts: [0, 1e7], betaRate: [0, 100], betaMin: [0, 10000], posts30: [0, 1e6], comments30: [0, 1e6], reactions30: [0, 1e6], ret7: [0, 100], ret30: [0, 100], seedPosts: [0, 1e6], seedPerCat: [0, 10000], reportHours: [1, 720] };
export const MANUAL = {
  moderation: '신고·숨김·제재·차단을 테스트 계정으로 직접 해 보고 정상 동작을 확인',
  privacy: '개인정보 점검(공개 프로필·원국 분리, 동의·철회, 탈퇴 후 삭제, 처리방침 최신)',
  security: '보안 점검(권한 우회·잠금·업로드 검사·스팸 제한·관리자 접근)',
  performance: '성능 점검(모바일 첫 화면 속도, 피드·대화 응답, 동시 접속)',
};

export function cleanConfig(c) {
  c = c && typeof c === 'object' ? c : {};
  const t = { ...DEFAULT_TARGETS };
  for (const [k, [lo, hi]] of Object.entries(TARGET_LIMITS)) { const v = c.targets && c.targets[k]; if (v != null && Number.isFinite(+v) && +v >= lo && +v <= hi) t[k] = Math.round(+v); }
  const manual = {};
  for (const k of Object.keys(MANUAL)) { const m = c.manual && c.manual[k]; manual[k] = m && m.done ? { done: true, by: String(m.by || '').slice(0, 40), at: m.at || null, note: String(m.note || '').slice(0, 200) } : { done: false, by: m && m.by || null, at: m && m.at || null, note: m && m.note ? String(m.note).slice(0, 200) : '' }; }
  return { targets: t, manual, at: c.at || null, by: c.by || null };
}
export async function loadLaunch(env) {
  let d = null; try { d = env && env.GLOSSARY_KV ? await env.GLOSSARY_KV.get(LAUNCH_KEY, 'json') : null; } catch { d = null; }
  return cleanConfig(d);
}

// 행 개수: PostgREST 의 count=exact 를 머리말(content-range)로 받는다(본문은 한 줄만)
export async function countRows(env, path) {
  const base = String(env.SUPABASE_URL).replace(/\/+$/, '');
  const r = await fetch(base + '/rest/v1/' + path + (path.includes('?') ? '&' : '?') + 'limit=1', { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, prefer: 'count=exact' }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('count-' + r.status);
  const m = /\/(\d+)$/.exec(r.headers.get('content-range') || ''); if (!m) throw new Error('count-range');
  return +m[1];
}

const enc = encodeURIComponent;
// 점검에 쓰는 숫자를 모은다. 실패한 값은 null(→ 그 항목 미달)
export async function gather(env, now = Date.now()) {
  const day = kstDay(now), since30 = new Date(now - 30 * 86400000).toISOString(), from30 = kstDay(now - 29 * 86400000);
  const safe = async f => { try { return await f(); } catch { return null; } };
  const m = await safe(() => sbRest(env, 'rpc/cm_metrics', { method: 'POST', body: JSON.stringify({ p_day: day }) }));
  const holders = (await safe(() => sbRest(env, 'community_access?revoked_at=is.null&role=in.(beta,tester)&select=user_id'))) || null;
  let betaActive = null;
  if (Array.isArray(holders)) {
    if (!holders.length) betaActive = 0;
    else { const ids = [...new Set(holders.map(h => h.user_id))]; const rows = await safe(() => sbRest(env, `cm_activity?surface=eq.community&day=gte.${from30}&user_id=in.(${ids.map(enc).join(',')})&select=user_id`)); betaActive = Array.isArray(rows) ? new Set(rows.map(r => r.user_id)).size : null; }
  }
  const [reactions30, seedPosts, cats, oldest] = await Promise.all([
    safe(() => countRows(env, `cm_reactions?kind=eq.like&created_at=gte.${enc(since30)}&select=post_id`)),
    safe(() => countRows(env, 'cm_posts?status=eq.visible&select=id')),
    Promise.all(Object.keys(CATS).map(c => safe(() => countRows(env, `cm_posts?status=eq.visible&category=eq.${c}&select=id`)))),
    safe(() => sbRest(env, 'cm_reports?status=eq.open&select=created_at&order=created_at.asc&limit=1')),
  ]);
  const oldestAt = Array.isArray(oldest) ? (oldest[0] ? oldest[0].created_at : '') : null;
  return { day, metrics: m && typeof m === 'object' ? m : null, betaHolders: Array.isArray(holders) ? new Set(holders.map(h => h.user_id)).size : null, betaActive, reactions30, seedPosts, cats: Object.fromEntries(Object.keys(CATS).map((c, i) => [c, cats[i]])), oldestOpenReport: oldestAt };
}

const pctOf = (n, b) => b > 0 ? Math.round((n / b) * 1000) / 10 : null;
// 점검표 만들기(순수 함수 — 테스트하기 쉽게). 반환 { items:[{ id, no, title, pass, rows:[{ label, value, target, pass, unit }] }], ready, failing:[제목] }
export function evaluate(g, cfg, now = Date.now()) {
  const t = cfg.targets, m = g.metrics || {}, a = (m.active || {}), all = a.all || {}, com = a.community || {}, e = m.engage || {}, mem = m.members || {};
  const ge = (v, target) => v != null && v >= target;
  const row = (label, value, target, pass, unit = '') => ({ label, value, target, pass: !!pass, unit });
  const items = [];
  const add = (no, id, title, rows) => items.push({ no, id, title, rows, pass: rows.every(r => r.pass) });
  add(1, 'members', '회원 규모', [row('전체 가입자', mem.total ?? null, t.members, ge(mem.total, t.members), '명'), row('최근 30일 활성 회원', all.mau ?? null, t.mau, ge(all.mau, t.mau), '명')]);
  add(2, 'alerts', '출시 알림 신청자', [row('신청 중', mem.alerts ?? null, t.alerts, ge(mem.alerts, t.alerts), '명')]);
  const br = g.betaHolders ? pctOf(g.betaActive || 0, g.betaHolders) : null;
  add(3, 'beta', '비공개 베타 참여율', [row('베타·테스터 회원', g.betaHolders, t.betaMin, ge(g.betaHolders, t.betaMin), '명'), row('최근 30일 광장 이용 비율', br, t.betaRate, ge(br, t.betaRate), '%')]);
  add(4, 'activity', '활동량(최근 30일)', [row('글', e.posts ?? null, t.posts30, ge(e.posts, t.posts30), '개'), row('댓글', e.comments ?? null, t.comments30, ge(e.comments, t.comments30), '개'), row('공감', g.reactions30, t.reactions30, ge(g.reactions30, t.reactions30), '개')]);
  const r7 = com.ret7 && com.ret7.base ? pctOf(com.ret7.back, com.ret7.base) : null, r30 = com.ret30 && com.ret30.base ? pctOf(com.ret30.back, com.ret30.base) : null;
  add(5, 'retention', '광장 재방문율', [row('7일 재방문', r7, t.ret7, ge(r7, t.ret7), '%'), row('30일 재방문', r30, t.ret30, ge(r30, t.ret30), '%')]);
  const catsOk = Object.values(g.cats || {}).filter(v => v != null && v >= t.seedPerCat).length, catsAll = Object.keys(CATS).length;
  add(6, 'content', '초기 콘텐츠', [row('보이는 글', g.seedPosts, t.seedPosts, ge(g.seedPosts, t.seedPosts), '개'), row('글이 ' + t.seedPerCat + '개 이상인 주제', catsOk, catsAll, catsOk >= catsAll, '/' + catsAll)]);
  const hrs = g.oldestOpenReport === '' ? 0 : g.oldestOpenReport ? Math.floor((now - Date.parse(g.oldestOpenReport)) / 3600000) : null;
  const mm = cfg.manual || {};
  add(7, 'moderation', '신고·차단·관리', [row('가장 오래된 미처리 신고', hrs, t.reportHours, hrs != null && hrs <= t.reportHours, '시간 이내'), row('운영 점검(사람 확인)', mm.moderation && mm.moderation.done ? '완료' : '미완료', '완료', mm.moderation && mm.moderation.done)]);
  add(8, 'safety', '개인정보·보안·성능 테스트', ['privacy', 'security', 'performance'].map(k => row({ privacy: '개인정보 점검', security: '보안 점검', performance: '성능 점검' }[k], mm[k] && mm[k].done ? '완료' : '미완료', '완료', mm[k] && mm[k].done)));
  const failing = items.filter(i => !i.pass).map(i => i.no + '. ' + i.title);
  return { items, ready: !failing.length, failing };
}
export async function checklist(env, now = Date.now()) {
  const cfg = await loadLaunch(env);
  if (!supabaseReady(env)) return { ...evaluate({}, cfg, now), cfg, day: kstDay(now), error: 'supabase' };
  const g = await gather(env, now);
  return { ...evaluate(g, cfg, now), cfg, day: g.day, metricsOk: !!g.metrics };
}
