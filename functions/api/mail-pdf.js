// 만세력 PDF 를 원하는 주소로 메일 발송(관리자 전용). 2026-11-26
// POST /api/mail-pdf  (Authorization: Bearer ADMIN_PASSWORD)  { to, filename, content: PDF base64 }
// 필요: Secret RESEND_API_KEY · ADMIN_PASSWORD (선택 MAIL_FROM). 받는 주소·사주 정보는 로그에 남기지 않는다.
import { json, isAdmin } from '../_lib.js';
import { mailReady, mailPdf, PDF_B64_MAX } from '../_mail.js';

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 로그인이 필요합니다' }, 401);
  if (!mailReady(env)) return json({ error: 'RESEND_API_KEY 가 설정되지 않았습니다' }, 503);
  const tooBig = () => json({ error: 'PDF 가 너무 큽니다. 섹션을 나눠 보내 주세요' }, 413);
  if (+request.headers.get('content-length') > PDF_B64_MAX + 4096) return tooBig();
  let b; try { b = await request.json(); } catch { return json({ error: '요청 형식이 올바르지 않습니다' }, 400); }
  const to = String(b && b.to || '').trim();
  if (to.length > 254 || !/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(to)) return json({ error: '받는 메일 주소를 확인해 주세요' }, 400);
  const content = typeof b.content === 'string' ? b.content : '';
  if (content.length > PDF_B64_MAX) return tooBig();
  // 'JVBERi0' = base64('%PDF-'): PDF 만 붙인다
  if (!content.startsWith('JVBERi0') || !/^[A-Za-z0-9+/]+={0,2}$/.test(content)) return json({ error: 'PDF 파일만 보낼 수 있습니다' }, 400);
  const filename = (String(b.filename || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/\.pdf$/i, '').slice(0, 80) || '만세력') + '.pdf';
  const ok = await mailPdf(env, to, filename, content);
  return ok ? json({ ok: true }) : json({ error: '메일 발송에 실패했습니다. Resend 대시보드에서 도메인 인증과 발송 기록을 확인해 주세요' }, 502);
}
