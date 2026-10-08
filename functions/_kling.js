// Kling AI 이미지 → 영상(image2video) 클라이언트 — Cloudflare Pages Functions(WebCrypto)용. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 환경 변수: KLING_ACCESS_KEY · KLING_SECRET_KEY (Kling 개발자 콘솔의 AK/SK) · 선택: KLING_API_BASE(기본 https://api.klingai.com) · KLING_MODEL(기본 kling-v1-6)
// 인증: AK/SK 로 만든 JWT(HS256, iss=AK, exp=30분)를 Authorization: Bearer 로 보낸다. 작업은 비동기(제출 → 상태 조회).
//   POST {base}/v1/videos/image2video            body { model_name, image(base64, data: 접두사 없이), prompt, negative_prompt, cfg_scale, mode(std|pro), duration("5"|"10") } → data.task_id
//   GET  {base}/v1/videos/image2video/{task_id}  → data.task_status(submitted|processing|succeed|failed), data.task_result.videos[0].url
// 이미지는 JPG/PNG · 10MB 이하(webp 는 거부될 수 있어 관리자 화면이 JPEG 로 바꿔서 올린다).
const enc = s => new TextEncoder().encode(s);
const b64url = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).split('+').join('-').split('/').join('_').split('=').join(''); };
export const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

export const klingEnabled = env => !!(env && env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY);
export const KLING_ENV_HELP = 'Cloudflare 환경 변수 KLING_ACCESS_KEY 와 KLING_SECRET_KEY 를 설정해야 합니다(Kling 개발자 콘솔에서 발급한 Access Key · Secret Key).';
const baseOf = env => { let b = String(env.KLING_API_BASE || 'https://api.klingai.com').trim(); while (b.endsWith('/')) b = b.slice(0, -1); return /^https:\/\//.test(b) ? b : 'https://api.klingai.com'; };

export async function klingJwt(env, now) {
  const t = now || Math.floor(Date.now() / 1000), head = b64url(enc(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))), pay = b64url(enc(JSON.stringify({ iss: env.KLING_ACCESS_KEY, exp: t + 1800, nbf: t - 5 })));
  const key = await crypto.subtle.importKey('raw', enc(env.KLING_SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return head + '.' + pay + '.' + b64url(await crypto.subtle.sign('HMAC', key, enc(head + '.' + pay)));
}
async function call(env, method, path, body) {
  const r = await fetch(baseOf(env) + path, { method, signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', authorization: 'Bearer ' + await klingJwt(env) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* JSON 아님 */ }
  if (!r.ok || !j || (j.code != null && j.code !== 0)) throw new Error('kling ' + r.status + ' ' + ((j && (j.message || j.msg)) || text.slice(0, 200)));
  return j.data || {};
}
// 제출: opts { imageB64, prompt, negative, mode } → task_id
export async function klingSubmit(env, opts) {
  const d = await call(env, 'POST', '/v1/videos/image2video', { model_name: env.KLING_MODEL || 'kling-v1-6', image: opts.imageB64, prompt: String(opts.prompt || '').slice(0, 2500), negative_prompt: String(opts.negative || '').slice(0, 2500), cfg_scale: 0.5, mode: opts.mode === 'pro' ? 'pro' : 'std', duration: '5' });
  if (!d.task_id) throw new Error('kling 응답에 task_id 가 없습니다'); return d.task_id;
}
// 조회: { status: 'processing' | 'done' | 'failed', url?, msg? }
export async function klingQuery(env, taskId) {
  const d = await call(env, 'GET', '/v1/videos/image2video/' + encodeURIComponent(taskId));
  if (d.task_status === 'succeed') { const v = d.task_result && d.task_result.videos && d.task_result.videos[0]; if (!v || !v.url) throw new Error('kling 결과에 영상 주소가 없습니다'); return { status: 'done', url: v.url }; }
  if (d.task_status === 'failed') return { status: 'failed', msg: d.task_status_msg || 'Kling 생성에 실패했습니다' };
  return { status: 'processing' };
}
