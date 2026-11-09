// 주역 AI 상세 풀이 서버 처리. 설계: docs/ICHING_REVIEW_ADMIN_DESIGN.md §9.
// 흐름: 개방·동의·제한 확인 → 서버가 게시된 문구로 결과를 다시 계산(클라이언트가 보낸 결과는 믿지 않는다) → 그 결과를 근거로 AI 에게 "보충 풀이"만 요청
//       → JSON 구조·문구 규칙·다른 괘 언급 검사(실패하면 1회 재시도, 그래도 실패하면 내주지 않음) → 통과한 풀이만 응답.
// 기본값은 꺼짐(관리자가 켠다). 질문·응답·IP 는 저장하지 않는다(일별 횟수 카운터만, IP 는 해시로).
import { Ic } from './_iching-runtime.js';
import { interpret } from './_iching-public.js';
import { generate as realGenerate } from './api/movingtoon-reading.js';
import { loadSettings } from './_interpretation-store.js';

// 횟수 제한은 타로 깊이 읽기와 같이 쓰는 _deep-quota.js(기기당 하루 N회 · 한국 시간 자정 · 받은 풀이만 차감)를 따른다.
import { loadDeepConfig, saveDeepConfig, providerOf, reserve, commit, usedToday } from './_deep-quota.js';

export async function loadAiConfig(kv) { return loadDeepConfig(kv); }
export async function aiPublicState(kv, env) { const c = await loadAiConfig(kv); return { enabled: !!c.enabled && !!providerOf(env) }; }

export async function aiAdminState(kv, env) {
  const c = await loadAiConfig(kv), used = await usedToday(kv);
  return { ok: true, config: c, provider: providerOf(env), keysPresent: { openai: !!env.OPENAI_API_KEY, anthropic: !!env.ANTHROPIC_API_KEY }, usedToday: used };
}
export async function setAiConfig(kv, b, by) { const next = await saveDeepConfig(kv, b); return { ok: true, config: { ...next, by } }; }

// ctx: { ip, device, generate } — 테스트에서 generate 를 가짜로 바꿔 끼운다.
export async function detail(kv, env, body, ctx = {}) {
  const A = globalThis.IchingAiDetail, gen = ctx.generate || realGenerate, cfg = await loadAiConfig(kv), provider = providerOf(env);
  if (!cfg.enabled) return { ok: false, error: 'ai-off', status: 403 };
  if (!provider) return { ok: false, error: 'ai-unavailable', status: 503 };
  if (!body || body.consent !== true) return { ok: false, error: 'consent-required', status: 400 };
  const base = await interpret(kv, body); if (!base.ok) return base; // 개방 전·잘못된 입력·미게시 문구는 여기서 걸러진다
  const slot = await reserve(kv, cfg, { ip: ctx.ip, device: ctx.device || body.device }); if (!slot.ok) return slot;
  const input = A.buildInput(base.result), payload = JSON.stringify(input);
  // 비용 상한: 사이트의 기존 AI 설정(maxRequestCost·단가)을 그대로 따른다. 단가를 모르는데 상한이 있으면 호출하지 않는다.
  let settings = {}; try { settings = await loadSettings(kv); } catch { settings = {}; }
  const est = settings.inputPricePerMillion != null && settings.outputPricePerMillion != null ? ((new TextEncoder().encode(payload + A.SYSTEM).length * 2 + 512) * settings.inputPricePerMillion + cfg.maxOutputTokens * settings.outputPricePerMillion) / 1e6 : null;
  if (settings.maxRequestCost != null && (est == null || est * 2 > settings.maxRequestCost)) return { ok: false, error: 'cost-limit', status: 429 };
  let note = '', lastErrors = [];
  for (let attempt = 0; attempt < 2; attempt++) {
    let out; try { out = await gen(env, provider, payload, A.SYSTEM + note, { ...settings, maxOutputTokens: cfg.maxOutputTokens, telemetryPurpose: 'iching-detail', disableThinking: true }); } catch (e) { return { ok: false, error: 'ai-failed', status: 502 }; }
    const d = A.parse(out && out.text), v = d ? A.validate(d, input, base.result) : { ok: false, errors: ['JSON 파싱 실패'] };
    if (v.ok) return { ok: true, detail: A.clean(d), attempts: attempt + 1, quota: await commit(kv, cfg, slot) };
    lastErrors = v.errors; note = '\n[재작성 요청] 직전 출력이 다음 규칙을 어겼습니다. 같은 JSON 형식으로 다시 쓰되 이 문제를 모두 고치십시오: ' + lastErrors.slice(0, 6).join(' / ');
  }
  return { ok: false, error: 'ai-invalid', status: 502 };
}
