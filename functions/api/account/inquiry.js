// POST /api/account/inquiry — 마이페이지 1:1 문의(로그인 회원만, 헤더 x-member-token). 2026-11-13
//   { action: 'send', category, subject, body, orderId? } → 저장(support_inquiries) + 관리자 알림 메일(회신 주소 = 회원 이메일) + 회원 접수 확인 메일
//   { action: 'list' } → 내 문의 목록(최근 20건, 문의 본문·관리자 답변 포함)
// 답변은 관리자 화면(결제·상품 → 1:1 문의)에서 써서 회원에게 메일로 보내고 answer 칸에 남긴다(functions/api/commerce/admin.js inquiry-answer). 테이블: supabase/migrations/20261113_support_inquiries.sql
// 저장이 실패해도(테이블이 아직 없을 때 등) 메일이 갔으면 접수로 본다. 저장·메일이 둘 다 안 되면 실패를 돌려준다.
import { json } from '../../_lib.js';
import { memberOf, supabaseReady, sbRest } from '../../_commerce.js';
import { mailInquiry, inquiryReady, INQ_CAT } from '../../_mail.js';

const DAY_LIMIT = 5;   // 회원당 24시간 안에 보낼 수 있는 문의 수(스팸 방지)
const clean = (s, max) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let b; try { b = await request.json(); } catch { b = null; }
  if (!b || typeof b !== 'object') return json({ error: 'bad-payload' }, 400);
  const uid = encodeURIComponent(member.id);

  if (b.action === 'list') {
    let rows = null;
    try { rows = await sbRest(env, `support_inquiries?select=*&user_id=eq.${uid}&order=created_at.desc&limit=20`); } catch { return json({ ok: true, items: [], stored: false }); }
    const items = (rows || []).map(r => ({ id: r.id, category: r.category, subject: r.subject, body: r.body, status: r.status, created_at: r.created_at, answered_at: r.answered_at, answer: r.answer || null }));   // 본인 문의만(회원 이메일·관리자 이름은 내려 보내지 않는다)
    return json({ ok: true, items, stored: true, mail: inquiryReady(env) });
  }
  if (b.action !== 'send') return json({ error: 'bad-action' }, 400);

  const category = INQ_CAT[b.category] ? b.category : 'etc';
  const subject = clean(b.subject, 80).replace(/\n/g, ' '), body = clean(b.body, 2000);
  const orderId = /^[\w-]{4,64}$/.test(String(b.orderId || '')) ? String(b.orderId) : null;
  if (!subject) return json({ error: 'subject-required' }, 400);
  if (body.length < 5) return json({ error: 'body-too-short' }, 400);

  // 하루 한도: 저장된 기록으로 센다. 표를 못 읽으면 KV 로 센다
  const since = new Date(Date.now() - 86400000).toISOString();
  let stored = true, recent = 0;
  try { recent = ((await sbRest(env, `support_inquiries?select=id&user_id=eq.${uid}&created_at=gt.${encodeURIComponent(since)}&limit=${DAY_LIMIT + 1}`)) || []).length; } catch { stored = false; }
  const kvKey = 'inquiry:rate:' + member.id;
  if (!stored && env.GLOSSARY_KV) { try { recent = +(await env.GLOSSARY_KV.get(kvKey)) || 0; } catch { } }
  if (recent >= DAY_LIMIT) return json({ error: 'too-many', limit: DAY_LIMIT }, 429);

  const email = member.email && /@/.test(member.email) ? member.email : '';
  let id = null;
  if (stored) {
    try {
      const r = await sbRest(env, 'support_inquiries', { method: 'POST', headers: { prefer: 'return=representation' }, body: JSON.stringify([{ user_id: member.id, email: email || '(이메일 없음)', category, subject, body, order_id: orderId }]) });
      id = r && r[0] && r[0].id || null;
    } catch (e) { stored = false; console.log('[inquiry] store failed', String(e && e.message || e).slice(0, 120)); }
  }
  if (!stored && env.GLOSSARY_KV) { try { await env.GLOSSARY_KV.put(kvKey, String(recent + 1), { expirationTtl: 86400 }); } catch { } }

  const mailed = await mailInquiry(env, { id, category, subject, body, email, provider: member.provider, order_id: orderId });
  if (id && mailed) { try { await sbRest(env, `support_inquiries?id=eq.${id}`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ mailed: true }) }); } catch { } }
  if (!id && !mailed) return json({ error: 'not-received' }, 503);
  return json({ ok: true, id, mailed, email: email || null });
}
