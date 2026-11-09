// 타로 깊이 읽기 서버 처리. 주역 AI 상세 풀이(_iching-ai.js)와 같은 흐름:
//   켜짐·동의·입력 확인 → 서버가 카드 배열을 다시 계산(MantraCore.Tarot.readSpread — 클라이언트가 보낸 해석은 믿지 않는다)
//   → 하루 횟수 확인(_deep-quota.js) → AI 에게 "보충 풀이"만 요청 → 구조·문구 규칙·뽑지 않은 카드 언급 검사(실패하면 1회 재시도) → 통과한 풀이만 응답.
// 질문·응답·IP 는 저장하지 않는다(일별 횟수 카운터만, 기기·IP 는 해시로).
import '../shared-core.js';
import '../report/iching/quality.js';
import '../report/v2/tarot-deep-ai.js';
import { generate as realGenerate } from './api/movingtoon-reading.js';
import { loadSettings } from './_interpretation-store.js';
import { loadDeepConfig, providerOf, reserve, commit } from './_deep-quota.js';

const MODES = ['today', 'love', 'money', 'work'];
const SPREAD_N = { one: 1, three: 3, four: 4 };

export function checkInput(body) {
  const T = globalThis.MantraCore && globalThis.MantraCore.Tarot;
  if (!T) return { ok: false, error: 'server-error', status: 500 };
  const b = body || {}, mode = MODES.includes(b.mode) ? b.mode : null, spread = SPREAD_N[b.spread] ? b.spread : null;
  if (!mode || !spread) return { ok: false, error: 'invalid-spread', status: 400 };
  const picks = Array.isArray(b.picks) ? b.picks : [];
  if (picks.length !== SPREAD_N[spread]) return { ok: false, error: 'invalid-cards', status: 400 };
  const seen = {};
  for (const p of picks) { if (!p || typeof p.id !== 'string' || !T.byId[p.id] || seen[p.id] || typeof p.rev !== 'boolean') return { ok: false, error: 'invalid-cards', status: 400 }; seen[p.id] = 1; }
  const rs = T.readSpread(spread, picks.map(p => ({ id: p.id, rev: p.rev })), mode);
  if (!rs) return { ok: false, error: 'invalid-cards', status: 400 };
  return { ok: true, rs, deck: T.cards.map(c => c.nameKo) };
}

// ctx: { ip, device, generate } — 테스트에서 generate 를 가짜로 바꿔 끼운다.
export async function tarotDetail(kv, env, body, ctx = {}) {
  const A = globalThis.TarotDeepAi, gen = ctx.generate || realGenerate, cfg = await loadDeepConfig(kv), provider = providerOf(env);
  if (!cfg.tarotEnabled) return { ok: false, error: 'ai-off', status: 403 };
  if (!provider) return { ok: false, error: 'ai-unavailable', status: 503 };
  if (!body || body.consent !== true) return { ok: false, error: 'consent-required', status: 400 };
  const c = checkInput(body); if (!c.ok) return c;
  const input = A.buildInput(c.rs, body.question, body.saju), payload = JSON.stringify(input);
  let settings = {}; try { settings = await loadSettings(kv); } catch { settings = {}; }
  const est = settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? ((new TextEncoder().encode(payload + A.SYSTEM).length * 2 + 512) * settings.inputPricePerMillion + cfg.maxOutputTokens * settings.outputPricePerMillion) / 1e6 : null;
  if (settings.maxRequestCost != null && (est == null || est * 2 > settings.maxRequestCost)) return { ok: false, error: 'cost-limit', status: 429 };
  const slot = await reserve(kv, cfg, { ip: ctx.ip, device: ctx.device || body.device }); if (!slot.ok) return slot;
  let note = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    let out; try { out = await gen(env, provider, payload, A.SYSTEM + note, { ...settings, maxOutputTokens: cfg.maxOutputTokens, telemetryPurpose: 'tarot-deep', disableThinking: true }); } catch (e) { return { ok: false, error: 'ai-failed', status: 502 }; }
    const d = A.parse(out && out.text), v = d ? A.validate(d, input, c.deck) : { ok: false, errors: ['JSON 파싱 실패'] };
    if (v.ok) return { ok: true, detail: A.clean(d), attempts: attempt + 1, quota: await commit(kv, cfg, slot) };
    note = '\n[재작성 요청] 직전 출력이 다음 규칙을 어겼습니다. 같은 JSON 형식으로 다시 쓰되 이 문제를 모두 고치십시오: ' + v.errors.slice(0, 6).join(' / ');
  }
  return { ok: false, error: 'ai-invalid', status: 502 };
}
