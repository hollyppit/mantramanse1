// Kling AI 이미지 → 영상(image-to-video) 클라이언트 — Cloudflare Pages Functions(WebCrypto)용. 파일명이 _로 시작해 라우트로 노출되지 않는다.
// 두 가지 API 를 지원한다(둘 다 비동기: 제출 → 상태 조회).
//
// ① 신형(Kling 3.0 계열, kling.ai 글로벌 개발자 콘솔의 "API Key") — 환경 변수 KLING_API_KEY 가 있으면 이 방식
//    인증  Authorization: Bearer <API_KEY>
//    제출  POST {base}/image-to-video/{모델}  (모델 기본 kling-3.0-turbo, env KLING_MODEL)
//          body { contents:[{type:'prompt',text},{type:'first_frame',url(이미지 URL 또는 base64)}], settings:{resolution:'720p'|'1080p', duration:5}, options:{external_task_id} }
//    조회  GET {base}/tasks?external_task_ids=<우리가 정한 id>  → data[0].status(submitted|processing|succeeded|failed), data[0].outputs[{type:'video',url}]
//    ※ 이 문서에는 negative_prompt 필드가 없어 프롬프트 끝에 "Avoid: …"로 붙인다.
// ② 구형(model_name 방식) — KLING_ACCESS_KEY + KLING_SECRET_KEY (AK/SK 로 만든 JWT HS256, iss=AK, exp=30분)
//    제출  POST {base}/v1/videos/image2video  body { model_name(기본 kling-v1-6), image(base64), prompt, negative_prompt, cfg_scale, mode, duration }
//    조회  GET {base}/v1/videos/image2video/{task_id}  → data.task_status(submitted|processing|succeed|failed), data.task_result.videos[0].url
//
// 선택: KLING_API_BASE (기본 https://api-singapore.klingai.com). 이미지는 JPG/PNG(webp 는 거부될 수 있어 관리자 화면이 JPEG 로 바꿔 올린다).
const enc = s => new TextEncoder().encode(s);
const b64url = buf => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s).split('+').join('-').split('/').join('_').split('=').join(''); };
export const toB64 = u8 => { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); };

const isNew = env => !!(env && env.KLING_API_KEY);
export const klingEnabled = env => isNew(env) || !!(env && env.KLING_ACCESS_KEY && env.KLING_SECRET_KEY);
export const KLING_ENV_HELP = 'Cloudflare 환경 변수 KLING_API_KEY 를 설정해야 합니다(Kling 개발자 콘솔에서 발급한 API Key). 구형 방식이면 KLING_ACCESS_KEY 와 KLING_SECRET_KEY 를 설정하세요.';
const baseOf = env => { let b = String(env.KLING_API_BASE || 'https://api-singapore.klingai.com').trim(); while (b.endsWith('/')) b = b.slice(0, -1); return /^https:\/\//.test(b) ? b : 'https://api-singapore.klingai.com'; };

export async function klingJwt(env, now) {
  const t = now || Math.floor(Date.now() / 1000), head = b64url(enc(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))), pay = b64url(enc(JSON.stringify({ iss: env.KLING_ACCESS_KEY, exp: t + 1800, nbf: t - 5 })));
  const key = await crypto.subtle.importKey('raw', enc(env.KLING_SECRET_KEY), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return head + '.' + pay + '.' + b64url(await crypto.subtle.sign('HMAC', key, enc(head + '.' + pay)));
}
const authOf = async env => 'Bearer ' + (isNew(env) ? env.KLING_API_KEY : await klingJwt(env));
async function call(env, method, path, body) {
  const r = await fetch(baseOf(env) + path, { method, signal: AbortSignal.timeout(60000), headers: { 'content-type': 'application/json', authorization: await authOf(env) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let j = null; try { j = JSON.parse(text); } catch { /* JSON 아님 */ }
  if (!r.ok || !j || (j.code != null && j.code !== 0)) throw new Error('kling ' + r.status + ' ' + ((j && (j.message || j.msg)) || text.slice(0, 200)));
  return j.data;
}
const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), x => x.toString(16).padStart(2, '0')).join('');

// 제출: opts { imageUrl?(공개 https 주소), b64?: async () => base64(접두사 없이), prompt, negative, mode('std'|'pro'), duration(5|10) } → 작업 핸들(조회에 쓰는 id)
export async function klingSubmit(env, opts) {
  const dur = [5, 10].includes(Number(opts.duration)) ? Number(opts.duration) : 5, prompt = String(opts.prompt || '').trim(), neg = String(opts.negative || '').trim();
  if (isNew(env)) {
    const ext = 'mt' + Date.now().toString(36) + rid(), model = String(env.KLING_MODEL || 'kling-3.0-turbo').replace(/[^\w.-]/g, '');
    const text = (neg ? prompt + ' Avoid: ' + neg + '.' : prompt).slice(0, 2500), url = opts.imageUrl || (opts.b64 ? await opts.b64() : '');
    if (!url) throw new Error('시작 프레임 이미지가 없습니다');
    const d = await call(env, 'POST', '/image-to-video/' + model, { contents: [{ type: 'prompt', text }, { type: 'first_frame', url }], settings: { resolution: opts.mode === 'pro' ? '1080p' : '720p', duration: dur }, options: { external_task_id: ext } });
    if (!d || !d.id) throw new Error('kling 응답에 작업 id 가 없습니다'); return ext;
  }
  const d = await call(env, 'POST', '/v1/videos/image2video', { model_name: env.KLING_MODEL || 'kling-v1-6', image: opts.b64 ? await opts.b64() : '', prompt: prompt.slice(0, 2500), negative_prompt: neg.slice(0, 2500), cfg_scale: 0.5, mode: opts.mode === 'pro' ? 'pro' : 'std', duration: String(dur) });
  if (!d || !d.task_id) throw new Error('kling 응답에 task_id 가 없습니다'); return d.task_id;
}
// 조회: { status: 'processing' | 'done' | 'failed', url?, msg? }
export async function klingQuery(env, handle) {
  if (isNew(env)) {
    const arr = await call(env, 'GET', '/tasks?external_task_ids=' + encodeURIComponent(handle)), d = Array.isArray(arr) ? arr[0] : null;
    if (!d) return { status: 'processing' };
    if (d.status === 'succeeded') { const o = (d.outputs || []).find(x => x && x.type === 'video' && x.url) || (d.outputs || []).find(x => x && x.url); if (!o) throw new Error('kling 결과에 영상 주소가 없습니다'); return { status: 'done', url: o.url }; }
    if (d.status === 'failed') return { status: 'failed', msg: d.message || 'Kling 생성에 실패했습니다' };
    return { status: 'processing' };
  }
  const d = await call(env, 'GET', '/v1/videos/image2video/' + encodeURIComponent(handle));
  if (d.task_status === 'succeed') { const v = d.task_result && d.task_result.videos && d.task_result.videos[0]; if (!v || !v.url) throw new Error('kling 결과에 영상 주소가 없습니다'); return { status: 'done', url: v.url }; }
  if (d.task_status === 'failed') return { status: 'failed', msg: d.task_status_msg || 'Kling 생성에 실패했습니다' };
  return { status: 'processing' };
}
