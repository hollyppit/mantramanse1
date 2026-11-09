// 깊이 읽기 AI(타로 깊이 읽기 · 주역 AI 상세 풀이) 공통 하루 횟수.
//   · 사람(기기) 기준 하루 perDevice 회(기본 2) — 타로와 주역을 합쳐서 센다. 기기 ID 는 브라우저가 만든 임의 값이고 서버에는 해시만 남는다.
//   · 같은 IP 하루 perIpLimit 회(기본 6) — 모바일 데이터는 여러 사람이 IP 하나를 같이 쓰므로 IP 는 남용 방지용으로만 넉넉하게 둔다.
//   · 사이트 전체 하루 dailyLimit 회 — 비용 차단용. 이것만 실패·재시도를 포함한 "시도"를 센다.
//   · 사람·IP 횟수는 풀이를 실제로 받았을 때만 줄어든다(실패하면 차감하지 않는다).
//   · 하루는 한국 시간 자정에 바뀐다.
// 설정은 기존 주역 AI 설정 키(iching:ai)에 함께 둔다(관리자 주역 탭의 "AI 깊이 읽기" 상자).
const K_CFG = 'iching:ai';
export const DEFAULT_DEEP = { enabled: false, tarotEnabled: false, dailyLimit: 200, perIpLimit: 6, perDevice: 2, maxOutputTokens: 1400 };
const num = (v, lo, hi, d) => (Number.isFinite(+v) ? Math.max(lo, Math.min(hi, Math.round(+v))) : d);
const rd = async (kv, k, d) => { const v = await kv.get(k, 'json'); if (v == null) return d; return typeof v === 'string' ? JSON.parse(v) : v; };
export const kstDay = (now = Date.now()) => new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
export const providerOf = env => (env.OPENAI_API_KEY ? 'openai' : env.ANTHROPIC_API_KEY ? 'anthropic' : null);

export async function loadDeepConfig(kv) { return { ...DEFAULT_DEEP, ...(await rd(kv, K_CFG, {})) }; }
export async function saveDeepConfig(kv, b) {
  const cur = await loadDeepConfig(kv);
  const next = { enabled: !!b.enabled, tarotEnabled: b.tarotEnabled == null ? !!cur.tarotEnabled : !!b.tarotEnabled,
    dailyLimit: num(b.dailyLimit, 0, 5000, cur.dailyLimit), perIpLimit: num(b.perIpLimit, 1, 50, cur.perIpLimit), perDevice: num(b.perDevice, 1, 20, cur.perDevice),
    maxOutputTokens: num(b.maxOutputTokens, 400, 3000, cur.maxOutputTokens), at: new Date().toISOString() };
  await kv.put(K_CFG, JSON.stringify(next)); return next;
}

async function h(salt, v) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('deep-ai|' + salt + '|' + v)); return [...new Uint8Array(d)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join(''); }
// 기기 ID: 브라우저가 만든 임의 값(영숫자 16~40자). 없거나 이상하면 IP 로 대신 센다.
export const cleanDevice = v => (typeof v === 'string' && /^[a-z0-9]{16,40}$/i.test(v) ? v.toLowerCase() : '');
export async function who(ctx) { const ip = await h('ip', (ctx && ctx.ip) || 'unknown'), dev = cleanDevice(ctx && ctx.device); return { ip, dev: dev ? await h('dev', dev) : 'ip-' + ip }; }
const keys = (w, d) => ({ all: 'rl:deep-ai:' + d + ':all', dev: 'rl:deep-ai:' + d + ':dev:' + w.dev, ip: 'rl:deep-ai:' + d + ':ip:' + w.ip });
const TTL = { expirationTtl: 172800 };

export async function usedToday(kv) { return +(await rd(kv, 'rl:deep-ai:' + kstDay() + ':all', 0)) || 0; }
// 남은 횟수(화면 표시용)
export async function remaining(kv, cfg, ctx) {
  const w = await who(ctx), k = keys(w, kstDay()), mine = +(await rd(kv, k.dev, 0)) || 0;
  return { left: Math.max(0, cfg.perDevice - mine), limit: cfg.perDevice };
}
// 호출 전: 한도 확인 + 사이트 전체 시도 1 증가. 반환 slot 은 성공 뒤 commit 에 넘긴다.
export async function reserve(kv, cfg, ctx) {
  const w = await who(ctx), k = keys(w, kstDay());
  const all = +(await rd(kv, k.all, 0)) || 0, mine = +(await rd(kv, k.dev, 0)) || 0, ipN = +(await rd(kv, k.ip, 0)) || 0;
  if (all >= cfg.dailyLimit) return { ok: false, error: 'daily-limit', status: 429 };
  if (mine >= cfg.perDevice) return { ok: false, error: 'device-limit', status: 429 };
  if (ipN >= cfg.perIpLimit) return { ok: false, error: 'ip-limit', status: 429 };
  await kv.put(k.all, JSON.stringify(all + 1), TTL);
  return { ok: true, k };
}
// 풀이를 실제로 내준 뒤: 사람·IP 횟수 1 증가. 남은 횟수를 돌려준다.
export async function commit(kv, cfg, slot) {
  const mine = (+(await rd(kv, slot.k.dev, 0)) || 0) + 1, ipN = (+(await rd(kv, slot.k.ip, 0)) || 0) + 1;
  await kv.put(slot.k.dev, JSON.stringify(mine), TTL); await kv.put(slot.k.ip, JSON.stringify(ipN), TTL);
  return { left: Math.max(0, cfg.perDevice - mine), limit: cfg.perDevice };
}
