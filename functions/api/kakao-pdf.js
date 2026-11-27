// 만세력 PDF 를 휴대폰 번호로 카카오 알림톡 발송(상담자용). 2026-11-27
// 보낼 수 있는 사람: 사이트 입장 비밀번호로 들어온 브라우저(쿠키) 또는 관리자 — /api/mail-pdf 와 같다(누구나 보내면 문자 요금·스팸에 쓰인다).
// POST /api/kakao-pdf  { to: 휴대폰 번호, name?: 받는 분 이름, label?: 내용(탭 이름), filename, content: PDF base64 }
//   → PDF 를 R2 'share-pdf/<코드>.pdf' 에 7일 보관 → 알림톡 버튼 링크 https://<사이트>/api/pdf/<코드>
// GET /api/kakao-pdf?status=1 → 설정 상태(빠진 Secret 이름만, 값은 보이지 않음)
import { json, isAdmin } from '../_lib.js';
import { PDF_B64_MAX } from '../_mail.js';
import { gatePassed } from '../_site-gate.js';
import { rateAdd } from '../_rate.js';
import { solapiReady, solapiMissing, normPhone, randomHex, sendAlimtalk, SHARE_DAYS } from '../_solapi.js';

const DAY_MAX = 200;   // 하루 발송 상한(전체). 실수·악용으로 요금이 쌓이지 않게
const allowed = async (request, env) => isAdmin(request, env) || await gatePassed(request, env);
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f<>#{}]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);

export async function onRequestGet({ request, env }) {
  if (!await allowed(request, env)) return json({ error: 'site locked' }, 401);
  return json({ ready: solapiReady(env) && !!env.CLIPS_R2, missing: [...solapiMissing(env), ...(env.CLIPS_R2 ? [] : ['CLIPS_R2'])] });
}

// 기한이 지난 공유 PDF 를 조금씩 지운다(링크를 아무도 안 열어도 쌓이지 않게)
async function sweep(env) {
  try {
    const p = await env.CLIPS_R2.list({ prefix: 'share-pdf/', limit: 100, include: ['customMetadata'] });
    const now = Date.now(), old = p.objects.filter(o => +(o.customMetadata && o.customMetadata.exp) < now || (!o.customMetadata && o.uploaded && now - new Date(o.uploaded).getTime() > SHARE_DAYS * 864e5)).map(o => o.key);
    if (old.length) await env.CLIPS_R2.delete(old);
  } catch { /* 정리는 다음 발송 때 다시 */ }
}

export async function onRequestPost({ request, env, waitUntil }) {
  if (!await allowed(request, env)) return json({ error: '사이트 입장 비밀번호 확인이 필요합니다. 주소 끝에 /__gate 를 붙여 다시 들어온 뒤 보내 주세요' }, 401);
  if (!solapiReady(env)) return json({ error: '솔라피 설정이 비어 있습니다: ' + solapiMissing(env).join(', ') }, 503);
  if (!env.CLIPS_R2) return json({ error: 'R2(CLIPS_R2)가 연결되어 있지 않아 PDF 를 보관할 수 없습니다' }, 503);
  const tooBig = () => json({ error: 'PDF 가 너무 큽니다. 섹션을 나눠 보내 주세요' }, 413);
  if (+request.headers.get('content-length') > PDF_B64_MAX + 4096) return tooBig();
  let b; try { b = await request.json(); } catch { return json({ error: '요청 형식이 올바르지 않습니다' }, 400); }
  const to = normPhone(b && b.to);
  if (!to) return json({ error: '휴대폰 번호를 확인해 주세요(010으로 시작하는 번호)' }, 400);
  const content = typeof b.content === 'string' ? b.content : '';
  if (content.length > PDF_B64_MAX) return tooBig();
  if (!content.startsWith('JVBERi0') || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) return json({ error: 'PDF 파일만 보낼 수 있습니다' }, 400);
  const n = await rateAdd(env, 'kakao-pdf:' + new Date().toISOString().slice(0, 10), 1, 2 * 86400);
  if (n != null && n > DAY_MAX) return json({ error: `오늘 보낼 수 있는 알림톡 수(${DAY_MAX}건)를 넘었습니다` }, 429);

  const filename = (String(b.filename || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\.pdf$/i, '').slice(0, 80) || '만세력') + '.pdf';
  const code = randomHex(16), key = 'share-pdf/' + code + '.pdf', exp = Date.now() + SHARE_DAYS * 864e5;
  const bytes = Uint8Array.from(atob(content), c => c.charCodeAt(0));
  await env.CLIPS_R2.put(key, bytes, { httpMetadata: { contentType: 'application/pdf' }, customMetadata: { exp: String(exp), filename } });
  const until = new Date(exp).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric' });
  const r = await sendAlimtalk(env, to, { '#{이름}': clean(b.name, 20) || '고객', '#{내용}': clean(b.label, 40) || '만세력', '#{기한}': until, '#{코드}': code });
  if (!r.ok) {
    try { await env.CLIPS_R2.delete(key); } catch { }
    return json({ error: `알림톡 발송에 실패했습니다(${r.code}${r.message ? ': ' + r.message : ''}). 솔라피 콘솔의 발송 내역·템플릿 변수를 확인해 주세요` }, 502);
  }
  if (waitUntil) waitUntil(sweep(env)); else await sweep(env);
  return json({ ok: true, until });
}
