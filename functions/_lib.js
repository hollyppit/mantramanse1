// Pages Functions 공용 도우미. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 필요한 설정: KV 바인딩 GLOSSARY_KV, Secret ADMIN_PASSWORD
export const KV_KEY = 'overrides';

export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
});

// Authorization: Bearer <비밀번호>를 상수 시간으로 비교
export function isAdmin(request, env) {
  const pw = env.ADMIN_PASSWORD;
  if (!pw) return false;
  const h = request.headers.get('authorization') || '';
  const got = h.startsWith('Bearer ') ? h.slice(7) : '';
  const a = new TextEncoder().encode(got), b = new TextEncoder().encode(pw);
  let diff = a.length ^ b.length;
  for (let i = 0; i < b.length; i++) diff |= (a[i] ?? 0) ^ b[i];
  return diff === 0;
}

export function configError(env) {
  if (!env.GLOSSARY_KV) return 'KV 바인딩(GLOSSARY_KV)이 설정되지 않았습니다';
  if (!env.ADMIN_PASSWORD) return 'Secret ADMIN_PASSWORD가 설정되지 않았습니다';
  return null;
}
