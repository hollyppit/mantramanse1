// 주역 AI 상세 풀이 서버 처리. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md §9.
// 흐름: 개방·동의·제한 확인 → 서버가 게시된 문구로 결과를 다시 계산(클라이언트가 보낸 결과는 믿지 않는다) → 그 결과를 근거로 AI 에게 "보충 풀이"만 요청
//       → JSON 구조·문구 규칙·다른 괘 언급 검사(실패하면 1회 재시도, 그래도 실패하면 내주지 않음) → 통과한 풀이만 응답.
// 기본값은 꺼짐(관리자가 켠다). 질문·응답·IP 는 저장하지 않는다(일별 횟수 카운터만, IP 는 해시로).
import { Ic } from './_iching-runtime.js';
import { interpret } from './_iching-public.js';
import { generate as realGenerate } from './api/movingtoon-reading.js';
import { loadSettings } from './_interpretation-store.js';

const K_AI = 'iching:ai', DEFAULT_AI = { enabled: false, dailyLimit: 200, perIpLimit: 5, maxOutputTokens: 1400 };
const day = () => new Date().toISOString().slice(0, 10);
const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
const rd = async (kv, k, d) => { const v = await kv.get(k, 'json'); if (v == null) return d; return typeof v === 'string' ? JSON.parse(v) : v; };
const providerOf = env => (env.OPENAI_API_KEY ? 'openai' : env.ANTHROPIC_API_KEY ? 'anthropic' : null);

export async function loadAiConfig(kv) { return { ...DEFAULT_AI, ...(await rd(kv, K_AI, {})) }; }
export async function aiPublicState(kv, env) { const c = await loadAiConfig(kv); return { enabled: !!c.enabled && !!providerOf(env) }; }

export async function aiAdminState(kv, env) {
  const c = await loadAiConfig(kv), used = +(await rd(kv, 'rl:iching-ai:' + day() + ':all', 0)) || 0;
  return { ok: true, config: c, provider: providerOf(env), keysPresent: { openai: !!env.OPENAI_API_KEY, anthropic: !!env.ANTHROPIC_API_KEY }, usedToday: used };
}
export async function setAiConfig(kv, b, by) {
  const cur = await loadAiConfig(kv), next = { enabled: !!b.enabled, dailyLimit: num(b.dailyLimit, 0, 5000, cur.dailyLimit), perIpLimit: num(b.perIpLimit, 1, 50, cur.perIpLimit), maxOutputTokens: num(b.maxOutputTokens, 400, 3000, cur.maxOutputTokens), at: new Date().toISOString(), by };
  await kv.put(K_AI, JSON.stringify(next)); return { ok: true, config: next };
}

async function hashIp(ip) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('iching-ai|' + ip)); return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); }
// 횟수 확인 + 증가. 시도마다 센다(실패·재시도 포함) — 남용과 비용 폭주를 막는 쪽이 우선이다.
async function takeSlot(kv, ipHash, cfg) {
  const d = day(), kAll = 'rl:iching-ai:' + d + ':all', kIp = 'rl:iching-ai:' + d + ':' + ipHash;
  const all = +(await rd(kv, kAll, 0)) || 0, mine = +(await rd(kv, kIp, 0)) || 0;
  if (all >= cfg.dailyLimit) return { ok: false, error: 'daily-limit', status: 429 };
  if (mine >= cfg.perIpLimit) return { ok: false, error: 'ip-limit', status: 429 };
  await kv.put(kAll, JSON.stringify(all + 1), { expirationTtl: 172800 }); await kv.put(kIp, JSON.stringify(mine + 1), { expirationTtl: 172800 });
  return { ok: true };
}

// ctx: { ip, generate } — 테스트에서 generate 를 가짜로 바꿔 끼운다.
export async function detail(kv, env, body, ctx = {}) {
  const A = globalThis.IchingAiDetail, gen = ctx.generate || realGenerate, cfg = await loadAiConfig(kv), provider = providerOf(env);
  if (!cfg.enabled) return { ok: false, error: 'ai-off', status: 403 };
  if (!provider) return { ok: false, error: 'ai-unavailable', status: 503 };
  if (!body || body.consent !== true) return { ok: false, error: 'consent-required', status: 400 };
  const base = await interpret(kv, body); if (!base.ok) return base; // 개방 전·잘못된 입력·미게시 문구는 여기서 걸러진다
  const slot = await takeSlot(kv, await hashIp(ctx.ip || 'unknown'), cfg); if (!slot.ok) return slot;
  const input = A.buildInput(base.result), payload = JSON.stringify(input);
  // 비용 상한: 사이트의 기존 AI 설정(maxRequestCost·단가)을 그대로 따른다. 단가를 모르는데 상한이 있으면 호출하지 않는다.
  let settings = {}; try { settings = await loadSettings(kv); } catch { settings = {}; }
  const est = settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? ((new TextEncoder().encode(payload + A.SYSTEM).length * 2 + 512) * settings.inputPricePerMillion + cfg.maxOutputTokens * settings.outputPricePerMillion) / 1e6 : null;
  if (settings.maxRequestCost != null && (est == null || est * 2 > settings.maxRequestCost)) return { ok: false, error: 'cost-limit', status: 429 };
  let note = '', lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    let out; try { out = await gen(env, provider, payload, A.SYSTEM + note, { ...settings, maxOutputTokens: cfg.maxOutputTokens, telemetryPurpose: 'iching-detail', disableThinking: true }); } catch (e) { return { ok: false, error: 'ai-failed', status: 502 }; }
    const d = A.parse(out && out.text), v = d ? A.validate(d, input, base.result) : { ok: false, errors: ['JSON 파싱 실패'] };
    if (v.ok) return { ok: true, detail: A.clean(d), attempts: attempt + 1 };
    lastErrors = v.errors; note = '\n[재작성 요청] 직전 출력이 다음 규칙을 어겼습니다. 같은 JSON 형식으로 다시 쓰되 이 문제를 모두 고치십시오: ' + lastErrors.slice(0, 6).join(' / ');
  }
  return { ok: false, error: 'ai-invalid', status: 502 };
}
