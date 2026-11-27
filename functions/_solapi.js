// 솔라피(SOLAPI) 카카오 알림톡 발송. 2026-11-27
// 알림톡에는 파일을 붙일 수 없어서, PDF 는 R2 에 잠시 올리고 템플릿 버튼 링크(/api/pdf/<코드>)로 내려받게 한다.
// 필요한 Secret: SOLAPI_API_KEY · SOLAPI_API_SECRET · SOLAPI_PFID(카카오 채널 연동 ID) · SOLAPI_TEMPLATE_ID(검수 통과한 템플릿) · SOLAPI_SENDER(솔라피에 등록한 발신번호)
// 선택: SOLAPI_SMS_FALLBACK=1 이면 알림톡 실패 시 문자(LMS)로 대신 보낸다(문자 요금 발생). 기본은 보내지 않는다.
// 받는 번호·이름은 로그에 남기지 않는다.
export const SHARE_DAYS = 7;
export const solapiReady = env => !!(env && env.SOLAPI_API_KEY && env.SOLAPI_API_SECRET && env.SOLAPI_PFID && env.SOLAPI_TEMPLATE_ID && env.SOLAPI_SENDER);
export const solapiMissing = env => ['SOLAPI_API_KEY', 'SOLAPI_API_SECRET', 'SOLAPI_PFID', 'SOLAPI_TEMPLATE_ID', 'SOLAPI_SENDER'].filter(k => !(env && env[k]));
// 휴대폰 번호: 숫자만 남기고 010·011·016~019 로 시작하는 10~11자리
export const normPhone = s => { const d = String(s || '').replace(/[^0-9]/g, ''); return /^01[016789][0-9]{7,8}$/.test(d) ? d : null; };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
export const randomHex = n => hex(crypto.getRandomValues(new Uint8Array(n)));

async function authHeader(env) {
  const date = new Date().toISOString(), salt = randomHex(16);
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(env.SOLAPI_API_SECRET)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = hex(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(date + salt)));
  return `HMAC-SHA256 apiKey=${env.SOLAPI_API_KEY}, date=${date}, salt=${salt}, signature=${sig}`;
}

// variables: 템플릿의 #{변수} → 값. 반환 { ok, code, message }
export async function sendAlimtalk(env, to, variables) {
  const message = {
    to, from: String(env.SOLAPI_SENDER).replace(/[^0-9]/g, ''),
    kakaoOptions: { pfId: env.SOLAPI_PFID, templateId: env.SOLAPI_TEMPLATE_ID, variables, disableSms: String(env.SOLAPI_SMS_FALLBACK || '') !== '1' },
  };
  try {
    const r = await fetch('https://api.solapi.com/messages/v4/send', {
      method: 'POST', body: JSON.stringify({ message }), signal: AbortSignal.timeout(10000),
      headers: { authorization: await authHeader(env), 'content-type': 'application/json' },
    });
    const d = await r.json().catch(() => ({}));
    if (r.ok && (!d.statusCode || /^2/.test(String(d.statusCode)))) return { ok: true };
    return { ok: false, code: String(d.errorCode || d.statusCode || r.status), message: String(d.errorMessage || d.statusMessage || '').slice(0, 200) };
  } catch (e) { return { ok: false, code: 'network', message: String(e && e.message || e).slice(0, 200) }; }
}
