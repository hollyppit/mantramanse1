// POST /api/account/inquiry — 마이페이지 1:1 문의(회원은 헤더 x-member-token). 2026-11-13
//   비회원(2026-11-26): 토큰 없이 { action:'send', email, agree:true, category, subject, body } → 저장하지 않고 운영자 메일로만 보낸다(회신 주소 = 입력한 이메일).
//   입력한 주소로는 아무것도 보내지 않는다(남의 주소를 넣어 스팸에 쓰는 것 방지). 같은 접속 주소 하루 3건 · 비회원 전체 하루 30건.
//   { action: 'send', category, subject, body, orderId? } → 저장(support_inquiries) + 관리자 알림 메일(회신 주소 = 회원 이메일) + 회원 접수 확인 메일
//   { action: 'list' } → 내 문의 목록(최근 20건, 문의 본문·관리자 답변 포함). 새 답변(isNew)은 이때 읽음 처리
//   { action: 'unread' } → 아직 안 본 답변 수(타임라인·마이페이지 '새 답변' 표시)
// 답변은 관리자 화면(결제·상품 → 1:1 문의)에서 써서 회원에게 메일로 보내고 answer 칸에 남긴다(functions/api/commerce/admin.js inquiry-answer). 테이블: supabase/migrations/20261113_support_inquiries.sql
// 저장이 실패해도(테이블이 아직 없을 때 등) 메일이 갔으면 접수로 본다. 저장·메일이 둘 다 안 되면 실패를 돌려준다.
import { json } from '../../_lib.js';
import { memberOf, supabaseReady, sbRest } from '../../_commerce.js';
import { mailInquiry, mailReady, inquiryReady, INQ_CAT } from '../../_mail.js';

const GUEST_LIMIT = 3, GUEST_TOTAL = 30;
const DAY_LIMIT = 5;   // 회원당 24시간 안에 보낼 수 있는 문의 수(스팸 방지)
const clean = (s, max) => String(s == null ? '' : s).replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max);

const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');

async function guestSend(request, env, b) {
  if (b.website) return json({ ok: true, guest: true });   // 사람에게 안 보이는 칸을 채우면 자동 프로그램: 보내지 않고 성공처럼 답한다
  const email = clean(b.email, 120);
  if (!/^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(email) || /@users\.mantrafortune\.com$/i.test(email)) return json({ error: 'email-required' }, 400);   // 회신 받을 메일은 필수
  if (b.agree !== true) return json({ error: 'agree-required' }, 400);
  const category = INQ_CAT[b.category] ? b.category : 'etc';
  const subject = clean(b.subject, 80).replace(/\n/g, ' '), body = clean(b.body, 2000);
  if (!subject) return json({ error: 'subject-required' }, 400);
  if (body.length < 5) return json({ error: 'body-too-short' }, 400);
  if (!mailReady(env) || !env.GLOSSARY_KV) return json({ error: 'not-received' }, 503);   // 횟수를 셀 곳이 없으면 열지 않는다
  const day = new Date().toISOString().slice(0, 10);
  const ipKey = 'inquiry:guest:' + day + ':' + await sha('inq:' + (request.headers.get('cf-connecting-ip') || 'unknown')), allKey = 'inquiry:guest:' + day + ':all';
  const mine = +(await env.GLOSSARY_KV.get(ipKey)) || 0, all = +(await env.GLOSSARY_KV.get(allKey)) || 0;
  if (mine >= GUEST_LIMIT || all >= GUEST_TOTAL) return json({ error: 'too-many', limit: GUEST_LIMIT }, 429);
  await env.GLOSSARY_KV.put(ipKey, String(mine + 1), { expirationTtl: 86400 });
  await env.GLOSSARY_KV.put(allKey, String(all + 1), { expirationTtl: 86400 });
  const mailed = await mailInquiry(env, { guest: true, category, subject, body, email });
  return mailed ? json({ ok: true, guest: true, email }) : json({ error: 'not-received' }, 503);
}

export async function onRequestPost({ request, env }) {
  if (!request.headers.get('x-member-token')) {
    let g; try { g = await request.clone().json(); } catch { g = null; }
    if (g && g.action === 'send') return guestSend(request, env, g);
  }
  if (!supabaseReady(env)) return json({ error: 'not-configured' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: 'login-required' }, 401);
  let b; try { b = await request.json(); } catch { b = null; }
  if (!b || typeof b !== 'object') return json({ error: 'bad-payload' }, 400);
  const uid = encodeURIComponent(member.id);

  if (b.action === 'list') {
    let rows = null;
    try { rows = await sbRest(env, `support_inquiries?select=*&user_id=eq.${uid}&order=created_at.desc&limit=20`); } catch { return json({ ok: true, items: [], stored: false }); }
    const items = (rows || []).map(r => ({ id: r.id, category: r.category, subject: r.subject, body: r.body, status: r.status, created_at: r.created_at, answered_at: r.answered_at, answer: r.answer || null, isNew: !!(r.answer && !r.answer_seen_at) }));   // 본인 문의만(회원 이메일·관리자 이름은 내려 보내지 않는다)
    // 목록을 열었으면 새 답변을 읽음으로 처리한다(이번 응답에는 isNew 를 그대로 실어 화면이 '새 답변'을 한 번 보여 준다)
    if (items.some(x => x.isNew)) { try { await sbRest(env, `support_inquiries?user_id=eq.${uid}&answer=not.is.null&answer_seen_at=is.null`, { method: 'PATCH', headers: { prefer: 'return=minimal' }, body: JSON.stringify({ answer_seen_at: new Date().toISOString() }) }); } catch { } }
    return json({ ok: true, items, stored: true, mail: inquiryReady(env) });
  }
  if (b.action === 'unread') {   // 새 답변 수(사이트 안 알림 표시용). 실패하면 0
    let n = 0;
    try { n = ((await sbRest(env, `support_inquiries?select=id&user_id=eq.${uid}&answer=not.is.null&answer_seen_at=is.null&limit=20`)) || []).length; } catch { n = 0; }
    return json({ ok: true, unread: n });
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
