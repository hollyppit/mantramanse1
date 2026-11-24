// POST /api/newyear/months — 만세력 월운 그래프의 토정비결 월별 보조지표(2026-11-25). AI 호출 없음.
// 요청: { birth: { year, month, day, calendar, leap, hour?, minute?, gender? }, year } + 선택 Authorization(관리자), x-content-mode: preview(관리자 미리보기)
// 응답: { ok, year, access: { state, reason }, gua, reading: { chapters: [{ id: 'months', months: [{ lunarMonth, label, solar, tojeongTone, paras }] }] } }
//   · 어느 해든 괘를 계산한다(괘 공식·원문·현대어 풀이는 연도와 무관 — 연도 자료 pack 은 신년운세 읽을거리 화면용이라 여기선 쓰지 않음).
//   · 판정(tone)·현대어 풀이는 관리자가 검수한 괘만(공개 모드). 검수 전 괘는 원문만, 월별 원문이 없는 괘는 빈 달.
//   · 잠금 없음(2026-11-25 사용자: 토정비결 선은 만세력에서만 쓰고, 유료 상품은 만트라 포춘에서만) — 모든 해 공개. 출생 입력은 저장하지 않는다.
import { json, isAdmin } from '../../_lib.js';
import { cleanBirth } from '../../_commerce.js';
import { NY } from '../../_newyear-runtime.js';
import { loadContent, applyContent } from '../../_newyear-content.js';

const DAY = 86400000;
const iso = ms => new Date(ms).toISOString().slice(0, 10);
// 음력 Y년 m월의 양력 시작·끝(작은달 29·큰달 30) — report/newyear/saju-link.js lunarMonthSpan 과 같은 규칙
function lunarMonthSpan(M, Y, m) {
  const s = M.lunarToSolar(Y, m, 1, false); let len = 29;
  try { M.lunarToSolar(Y, m, 30, false); len = 30; } catch { len = 29; }
  const startMs = Date.UTC(s[0], s[1] - 1, s[2]);
  return { start: iso(startMs), end: iso(startMs + (len - 1) * DAY) };
}

export async function onRequestPost({ request, env }) {
  let body; try { body = await request.json(); } catch { return json({ ok: false, error: 'bad-payload' }, 400); }
  const birth = cleanBirth(body && body.birth);
  if (!birth) return json({ ok: false, error: 'invalid-birth' }, 400);
  const year = Number(body && body.year);
  if (!Number.isInteger(year) || year < 1901 || year > 2099) return json({ ok: false, error: 'bad-year' }, 400);
  const deps = NY(), M = deps.Manse;
  const access = { state: 'open', reason: 'manse' };
  const admin = isAdmin(request, env), mode = admin && (request.headers.get('x-content-mode') || '') === 'preview' ? 'preview' : 'public';
  let tj; try { tj = deps.TojeongEngine.compute({ birth, targetYear: year }, M); }
  catch (e) { return json({ ok: false, error: 'compute-failed', message: String((e && e.message) || e).slice(0, 120) }, 400); }
  const g = tj.gua, src = (deps.TojeongText.gua || {})[g] || null;
  const live = applyContent(deps, await loadContent(env), mode), mod = live.TojeongModern[g] || null;
  const modOk = mod && (mode === 'preview' || mod.status === 'reviewed');
  const months = [];
  for (let m = 1; m <= 12; m++) {
    let span; try { span = lunarMonthSpan(M, year, m); } catch { continue; }
    const base = { lunarMonth: m, label: '음력 ' + m + '월', solar: span.start + ' ~ ' + span.end };
    const tjm = src && src.months ? src.months[m] || src.months[String(m)] : null, mm = modOk && mod.months ? mod.months[m] : null;
    const paras = [];
    if (tjm) paras.push({ role: 'tojeong', text: '토정비결 ' + m + '월: ' + tjm.map(p => p.join(' ')).join(' / ') });
    if (mm && mm.gist) paras.push({ role: 'tojeong', text: mm.gist });
    months.push({ ...base, tojeongTone: mm ? mm.tone || null : null, paras });
  }
  return json({ ok: true, year, access, gua: g, reading: { chapters: [{ id: 'months', title: '토정비결 열두 달', months }] }, admin: admin ? { mode } : undefined }, 200);
}
