// 저장소 어댑터: Cloudflare KV 와 같은 모양(get/put/delete/list)으로 Supabase 를 쓴다.
//   · 환경변수 SUPABASE_URL + SUPABASE_SERVICE_KEY(service_role, 서버 전용 Secret) 가 있으면 아래 ROUTED 접두어의 키는 Supabase 테이블 public.kv 에 읽고 쓴다.
//   · 없으면 지금처럼 전부 KV(GLOSSARY_KV)를 쓴다 — 환경변수를 지우면 바로 원복된다.
//   · 쓰기가 잦은 것(관리자 편집·방문자 호출 횟수·AI 합성 캐시·대기자)만 옮긴다. 이미지·홈 설정처럼 드물게 쓰는 키와 R2 는 그대로.
//   · 이전은 따로 하지 않는다: Supabase 에 없는 키는 KV 의 기존 값을 읽어 온다(읽기 전용 폴백). 삭제는 묘비(value=null)를 남겨 폴백이 되살리지 않게 한다.
// 테이블: supabase/schema.sql
const ROUTED = ['ik:', 'src:', 'free:', 'rl:', 'ai:', 'compose:', 'lifeai:', 'waitlist:'];
const FALLBACK = ['ik:', 'src:', 'free:', 'waitlist:']; // 기존 KV 데이터가 있을 수 있는 접두어
const MEMO_PREFIX = ['ik:', 'src:', 'free:'], MEMO_MS = 20000; // 공개(방문자) 읽기에서만 짧게 기억한다
const startsWith = (k, list) => list.some(p => k.startsWith(p));

const memoAll = new Map(); // isolate 단위: key → { v, exp }
const cache = new WeakMap();

export const supabaseOn = env => !!(env && env.SUPABASE_URL && env.SUPABASE_SERVICE_KEY);

async function sb(env, path, init) {
  const r = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/rest/v1/' + path, {
    ...init, signal: AbortSignal.timeout(+env.SUPABASE_TIMEOUT_MS || 10000),
    headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY, 'content-type': 'application/json', ...((init && init.headers) || {}) },
  });
  if (!r.ok) throw new Error('supabase ' + r.status + ' ' + String(await r.text().catch(() => '')).slice(0, 200));
  return r;
}
const parse = (txt, type) => (txt == null ? null : type === 'json' ? JSON.parse(txt) : txt);

// opts.cache === true: 방문자용 읽기 경로(공개 API) — 같은 isolate 에서 20초 동안 읽은 값을 다시 쓴다. 관리자 경로는 항상 최신.
export function kvOf(env, opts) {
  const raw = env && env.GLOSSARY_KV; if (!raw || !supabaseOn(env)) return raw;
  const slot = (opts && opts.cache) ? 'c' : 'n'; let m = cache.get(env); if (!m) { m = {}; cache.set(env, m); } if (m[slot]) return m[slot];
  const memo = !!(opts && opts.cache);
  const adapter = {
    async get(key, type) {
      if (!startsWith(key, ROUTED)) return raw.get(key, type);
      const useMemo = memo && startsWith(key, MEMO_PREFIX), hit = useMemo && memoAll.get(key);
      if (hit && hit.exp > Date.now()) return parse(hit.v, type);
      const rows = await (await sb(env, 'kv?select=value,expires_at&limit=1&key=eq.' + encodeURIComponent(key))).json();
      let txt;
      if (rows.length) { const row = rows[0]; txt = row.expires_at && Date.parse(row.expires_at) <= Date.now() ? null : row.value; }
      else if (startsWith(key, FALLBACK)) { txt = await raw.get(key); } // 아직 옮겨지지 않은 기존 값
      else txt = null;
      if (useMemo) memoAll.set(key, { v: txt, exp: Date.now() + MEMO_MS });
      return parse(txt, type);
    },
    async put(key, value, o) {
      if (!startsWith(key, ROUTED)) return raw.put(key, value, o);
      memoAll.delete(key);
      const exp = o && o.expirationTtl ? new Date(Date.now() + o.expirationTtl * 1000).toISOString() : null;
      await sb(env, 'kv?on_conflict=key', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value: String(value), expires_at: exp, updated_at: new Date().toISOString() }) });
    },
    async delete(key) {
      if (!startsWith(key, ROUTED)) return raw.delete(key);
      memoAll.delete(key);
      if (startsWith(key, FALLBACK)) await sb(env, 'kv?on_conflict=key', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ key, value: null, expires_at: null, updated_at: new Date().toISOString() }) }); // 묘비
      else await sb(env, 'kv?key=eq.' + encodeURIComponent(key), { method: 'DELETE', headers: { prefer: 'return=minimal' } });
    },
    async list(o) { // 대기자 명단용: 접두어로 찾는다. Supabase 의 키 + 아직 KV 에 남은 기존 키를 합친다.
      const prefix = (o && o.prefix) || '';
      if (!startsWith(prefix, ROUTED)) return raw.list(o);
      const page = await raw.list(o), seen = new Set(page.keys.map(k => k.name)), keys = page.keys.slice();
      if (!(o && o.cursor)) {
        const rows = await (await sb(env, 'kv?select=key,value&order=key.asc&limit=100000&key=like.' + encodeURIComponent(prefix.replace(/[*%]/g, '') + '*'))).json();
        for (const r of rows) if (r.value != null && !seen.has(r.key)) { keys.push({ name: r.key }); seen.add(r.key); }
      }
      return { keys, list_complete: page.list_complete, cursor: page.cursor };
    },
  };
  m[slot] = adapter; return adapter;
}

// 관리자 점검: 어느 저장소를 쓰는지, 쓰고 읽는 데 걸리는 시간
export async function storeCheck(env) {
  const out = { backend: supabaseOn(env) ? 'supabase' : 'kv', kvBound: !!(env && env.GLOSSARY_KV) };
  if (!out.kvBound) return { ...out, ok: false, error: 'KV 바인딩(GLOSSARY_KV)이 없습니다' };
  const t0 = Date.now(), kv = kvOf(env), key = 'ik:ping', val = String(t0);
  try { await kv.put(key, val); const back = await kv.get(key); out.ok = back === val; out.ms = Date.now() - t0; if (!out.ok) out.error = '쓴 값을 다시 읽지 못했습니다'; }
  catch (e) { out.ok = false; out.error = String((e && e.message) || e).slice(0, 240); }
  return out;
}
