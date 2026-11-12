// 거래 메일(구매 확인·환불 완료). 발송: Resend(https://resend.com). 전자상거래법상 계약 내용(상품·금액·환불 조건·판매자 정보)을 전자문서로 알린다.
// 환경변수: RESEND_API_KEY(비밀). 선택: MAIL_FROM(기본 '만트라 사주 무빙툰 <noreply@mantrafortune.com>').
// 키가 없으면 아무것도 보내지 않는다(결제·환불은 그대로 진행). 발송 실패도 결제·환불을 막지 않는다.
// 같은 주문으로 두 번 보내지 않도록, 부르는 쪽이 '이번 요청이 상태를 실제로 바꿨을 때'만 부른다.
// 판매자 정보는 report/legal/business.js 와 같아야 한다(주소·전화가 바뀌면 둘 다 고친다).
const BIZ = {
  service: '만트라 사주 무빙툰', name: '만트라 스튜디오', ceo: '백진우', bizNo: '775-24-01924', mailOrderNo: '제2026-전주덕진-0195호',
  address: '전북특별자치도 전주시 덕진구 만성중앙로 53-44, 3층 A-2호(만성동)', phone: '070-4519-6416', email: 'critical5114@naver.com',
};
const SITE = 'https://mantrafortune.com';
const WORLD = { w1: '종합풀이', w2: '재물운 심화', w7: '커리어운 심화', w3: '인연운 심화' };
export const mailReady = env => !!(env && env.RESEND_API_KEY);
// 결제사가 준 영수증(카드 매출전표) 주소: https 만 쓴다
export const safeHttps = u => { try { const x = new URL(String(u || '')); return x.protocol === 'https:' ? x.href : null; } catch { return null; } };
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const won = n => (+n || 0).toLocaleString('ko-KR') + '원';
const kst = t => { try { return new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch { return String(t || ''); } };

// 주문의 회원 이메일(네이버 회원은 네이버가 준 이메일). 내부용 주소면 보내지 않는다
async function recipientOf(env, userId) {
  if (!userId) return null;
  try {
    const r = await fetch(String(env.SUPABASE_URL).replace(/\/+$/, '') + '/auth/v1/admin/users/' + encodeURIComponent(userId), { headers: { apikey: env.SUPABASE_SERVICE_KEY, authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY }, signal: AbortSignal.timeout(8000) });
    if (!r.ok) return null;
    const u = await r.json(), m = u.user_metadata || {};
    const email = m.provider === 'naver' ? m.email : u.email;
    return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && !/@users\.mantrafortune\.com$/i.test(email) ? email : null;
  } catch { return null; }
}

function layout(title, rows, note) {
  const table = rows.map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b6b6b;white-space:nowrap;vertical-align:top">${esc(k)}</td><td style="padding:6px 0;color:#1c1b18">${v}</td></tr>`).join('');
  return `<!doctype html><html lang="ko"><body style="margin:0;background:#f7f5ef;font-family:-apple-system,'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
<div style="max-width:560px;margin:0 auto;padding:24px 16px"><div style="background:#fff;border:1px solid #e4dfd3;border-radius:14px;padding:22px 20px">
<p style="margin:0 0 4px;color:#9b3b2a;font-weight:700;font-size:13px">${esc(BIZ.service)}</p><h1 style="margin:0 0 14px;font-size:20px;color:#1c1b18">${esc(title)}</h1>
<table style="border-collapse:collapse;font-size:14px;line-height:1.5">${table}</table>${note}
<p style="margin:18px 0 0"><a href="${SITE}/report/my/" style="display:inline-block;background:#9b3b2a;color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:700">내 구매 내역 보기</a></p></div>
<p style="margin:14px 4px 0;color:#8a8577;font-size:12px;line-height:1.7">${esc(BIZ.name)} · 대표 ${esc(BIZ.ceo)} · 사업자등록번호 ${esc(BIZ.bizNo)} · 통신판매업 신고 ${esc(BIZ.mailOrderNo)}<br>${esc(BIZ.address)}<br>고객 문의 ${esc(BIZ.phone)} · ${esc(BIZ.email)}<br>이 메일은 구매·환불 내역을 알려 드리는 거래 안내 메일로, 수신 동의와 관계없이 발송됩니다.</p></div></body></html>`;
}

export function purchaseMail(order) {
  const worlds = (order.worlds || []).map(w => WORLD[w] || w).join(' · ');
  const rows = [['상품', esc(order.product_name)], ['결제 금액', '<b>' + won(order.amount) + '</b>'], ['결제 일시', esc(kst(order.paid_at))], ['결제 수단', esc(order.method || '-')],
    ['사주', esc(order.saju_label || '-')], ['열리는 주제', esc(worlds)], ['이용 기간', '결제 즉시 · 서비스 운영 기간 동안 제한 없이 다시 보기'], ['주문번호', esc(order.order_id)]];
  const receipt = safeHttps(order.receipt_url);
  if (receipt) rows.push(['영수증', `<a href="${esc(receipt)}" style="color:#9b3b2a">카드 매출전표 보기</a> <span style="color:#8a8577">(내 구매 내역에서도 볼 수 있습니다)</span>`]);
  const note = `<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#57524a"><b>환불 안내</b><br>구매 후 7일 이내이고 산 주제의 유료 장을 열지 않았다면, <a href="${SITE}/report/my/" style="color:#9b3b2a">내 구매 내역</a>의 <b>바로 환불</b>로 즉시 전액 환불됩니다. 유료 장을 열어 디지털 콘텐츠 제공이 시작된 뒤에는 환불이 제한되며(전자상거래법 제17조 제2항 제5호), 콘텐츠가 열리지 않는 등 회사 잘못이 있으면 기간·열람과 관계없이 전액 환불합니다. 자세한 기준: <a href="${SITE}/report/legal/refund.html" style="color:#9b3b2a">환불정책</a> · <a href="${SITE}/report/legal/terms.html" style="color:#9b3b2a">이용약관</a></p>`;
  const text = `[${BIZ.service}] 구매가 완료되었습니다\n상품: ${order.product_name}\n결제 금액: ${won(order.amount)}\n결제 일시: ${kst(order.paid_at)}\n사주: ${order.saju_label || '-'}\n열리는 주제: ${worlds}\n주문번호: ${order.order_id}\n${receipt ? '영수증: ' + receipt + '\n' : ''}\n구매 후 7일 이내·유료 장 미열람이면 내 구매 내역(${SITE}/report/my/)에서 바로 환불할 수 있습니다. 환불정책: ${SITE}/report/legal/refund.html\n\n${BIZ.name} · 사업자등록번호 ${BIZ.bizNo} · ${BIZ.phone} · ${BIZ.email}`;
  return { subject: `[${BIZ.service}] 구매가 완료되었습니다 · ${order.product_name}`, html: layout('구매가 완료되었습니다', rows, note), text };
}
export function refundMail(order, canceledAt) {
  const rows = [['상품', esc(order.product_name)], ['환불 금액', '<b>' + won(order.amount) + '</b>'], ['환불 일시', esc(kst(canceledAt || order.canceled_at))], ['결제 수단', esc(order.method || '-')], ['주문번호', esc(order.order_id)]];
  const note = `<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#57524a">결제 취소를 요청했습니다. 카드사·결제 수단에 따라 실제 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다. 이 주문으로 열렸던 주제는 다시 잠깁니다.</p>`;
  const text = `[${BIZ.service}] 환불이 완료되었습니다\n상품: ${order.product_name}\n환불 금액: ${won(order.amount)}\n주문번호: ${order.order_id}\n카드사·결제 수단에 따라 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.\n\n${BIZ.name} · ${BIZ.phone} · ${BIZ.email}`;
  return { subject: `[${BIZ.service}] 환불이 완료되었습니다 · ${order.product_name}`, html: layout('환불이 완료되었습니다', rows, note), text };
}

async function send(env, to, mail, tag, replyTo) {
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: AbortSignal.timeout(10000),
      headers: { authorization: 'Bearer ' + env.RESEND_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ from: env.MAIL_FROM || '만트라 사주 무빙툰 <noreply@mantrafortune.com>', to: [to], reply_to: replyTo || BIZ.email, subject: mail.subject, html: mail.html, text: mail.text, tags: [{ name: 'kind', value: tag }] }),
    });
    if (!r.ok) console.log('[mail]', tag, 'failed', r.status);
    return r.ok;
  } catch (e) { console.log('[mail]', tag, 'error', String(e && e.message || e).slice(0, 80)); return false; }
}
// 주문 하나에 대한 메일. order 는 결제 완료(또는 취소) 뒤의 값(paid_at·method·canceled_at 포함)
export async function mailPurchase(env, order) {
  if (!mailReady(env)) return false;
  const to = await recipientOf(env, order.user_id); if (!to) return false;
  return send(env, to, purchaseMail(order), 'purchase');
}
export async function mailRefund(env, order, canceledAt) {
  if (!mailReady(env)) return false;
  const to = await recipientOf(env, order.user_id); if (!to) return false;
  return send(env, to, refundMail(order, canceledAt), 'refund');
}

// ── 관리자 알림 메일: 결제·환불이 생길 때, 그리고 사람이 손봐야 하는 실패(결제됐는데 권한 기록 실패·환불 취소 실패)
// 받는 주소: 환경변수 ADMIN_ALERT_EMAIL(쉼표로 여러 개). 없으면 보내지 않는다. 고객 이메일·출생 정보는 넣지 않는다.
// 같은 주문의 같은 실패 경보는 하루 한 번만(결제사가 웹훅을 여러 번 다시 보내도).
const ALERT = {
  paid: { title: '새 결제', urgent: false },
  refund: { title: '환불', urgent: false },
  'grant-failed': { title: '⚠ 결제됐는데 권한 기록 실패', urgent: true, todo: '관리자 → 결제·상품 → 이 주문의 "권한 다시 주기"를 눌러 주세요. 고객은 돈을 냈지만 아직 열람이 안 될 수 있습니다.' },
  'refund-failed': { title: '⚠ 환불(결제 취소) 실패', urgent: true, todo: '결제사 취소가 실패했습니다. 포트원 콘솔에서 결제 상태를 확인하고, 필요하면 관리자 화면에서 다시 취소해 주세요.' },
};
export const alertReady = env => mailReady(env) && adminAlertTo(env).length > 0;
function adminAlertTo(env) { return String((env && env.ADMIN_ALERT_EMAIL) || '').split(',').map(s => s.trim()).filter(s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)).slice(0, 5); }
export function adminAlertMail(kind, order, extra = {}) {
  const a = ALERT[kind] || { title: kind }, test = order.is_test ? ' [테스트]' : '';
  const rows = [['상품', esc(order.product_name)], ['금액', '<b>' + won(order.amount) + '</b>'], ['주문번호', esc(order.order_id)], ['결제 수단', esc(order.method || '-')], ['사주 이름표', esc(order.saju_label || '-')]];
  if (extra.reason) rows.push(['사유', esc(extra.reason)]);
  if (extra.detail) rows.push(['자세히', esc(extra.detail)]);
  if (order.is_test) rows.push(['테스트', '예 (매출 요약에서 빠짐)']);
  const note = a.todo ? `<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#9b3b2a"><b>할 일</b><br>${esc(a.todo)}</p>` : '';
  const html = layout(a.title + test, rows, note).replace(`${SITE}/report/my/" style="display:inline-block`, `${SITE}/report/admin/" style="display:inline-block`).replace('내 구매 내역 보기', '관리자 화면 열기');
  const text = `${a.title}${test}\n상품: ${order.product_name}\n금액: ${won(order.amount)}\n주문번호: ${order.order_id}${extra.reason ? '\n사유: ' + extra.reason : ''}${extra.detail ? '\n자세히: ' + extra.detail : ''}${a.todo ? '\n\n할 일: ' + a.todo : ''}\n\n${SITE}/report/admin/`;
  return { subject: `[관리자]${test} ${a.title} · ${order.product_name} ${won(order.amount)}`, html, text };
}
export async function mailAdmin(env, kind, order, extra = {}) {
  if (!alertReady(env) || !order) return false;
  if (ALERT[kind] && ALERT[kind].urgent && env.GLOSSARY_KV) {   // 실패 경보는 주문마다 하루 한 번
    const k = `commerce:alert:${kind}:${order.order_id}`;
    try { if (await env.GLOSSARY_KV.get(k)) return false; await env.GLOSSARY_KV.put(k, '1', { expirationTtl: 86400 }); } catch { }
  }
  const mail = adminAlertMail(kind, order, extra);
  let ok = true; for (const to of adminAlertTo(env)) ok = (await send(env, to, mail, 'admin-' + kind)) && ok;
  return ok;
}

// ── 1:1 문의(마이페이지, functions/api/account/inquiry.js) 2026-11-13
// 관리자에게: ADMIN_ALERT_EMAIL 로 보내고 회신 주소를 회원 이메일로 둔다 → 메일 앱에서 '답장'하면 회원에게 바로 간다.
// 회원에게: 접수 확인 메일(답장은 관리자 메일 주소에서 온다는 안내). 출생 정보는 넣지 않는다.
export const INQ_CAT = { payment: '결제', refund: '환불', content: '풀이·콘텐츠', account: '계정·로그인', etc: '기타' };
const pre = s => esc(s).replace(/\r?\n/g, '<br>');
const okMail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e || '') && !/@users\.mantrafortune\.com$/i.test(e);
export function inquiryAdminMail(q) {
  const rows = [['문의 번호', q.id ? '#' + esc(q.id) : '(저장 실패 · 메일로만 접수)'], ['분류', esc(INQ_CAT[q.category] || q.category)], ['제목', esc(q.subject)], ['회원 이메일', esc(q.email)], ['로그인', esc(q.provider || '-')]];
  if (q.order_id) rows.push(['주문번호', esc(q.order_id)]);
  rows.push(['내용', pre(q.body)]);
  const note = okMail(q.email)
    ? '<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#9b3b2a"><b>답변 방법</b><br>관리자 화면 <b>결제·상품 → 1:1 문의</b>에서 답변을 쓰면 회원에게 메일로 가고 마이페이지 문의 내역에도 남습니다. 이 메일에 바로 답장해도 회원(' + esc(q.email) + ')에게 가지만, 그 내용은 마이페이지에 보이지 않습니다.</p>'
    : '<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#9b3b2a"><b>답변 방법</b><br>이 회원은 답장 받을 이메일이 확인되지 않았습니다. 회원 이메일 칸을 확인해 직접 연락해 주세요.</p>';
  const html = layout('새 1:1 문의', rows, note).replace(`${SITE}/report/my/" style="display:inline-block`, `${SITE}/report/admin/" style="display:inline-block`).replace('내 구매 내역 보기', '관리자 화면 열기');
  const text = `새 1:1 문의${q.id ? ' #' + q.id : ''}\n분류: ${INQ_CAT[q.category] || q.category}\n제목: ${q.subject}\n회원 이메일: ${q.email}${q.order_id ? '\n주문번호: ' + q.order_id : ''}\n\n${q.body}\n\n답변은 관리자 화면 결제·상품 → 1:1 문의에서 쓰면 회원 메일과 마이페이지 문의 내역에 함께 남습니다.\n${SITE}/report/admin/`;
  return { subject: `[1:1 문의${q.id ? ' #' + q.id : ''}] ${INQ_CAT[q.category] || ''} · ${q.subject}`, html, text };
}
export function inquiryUserMail(q) {
  const rows = [['문의 번호', q.id ? '#' + esc(q.id) : '-'], ['분류', esc(INQ_CAT[q.category] || q.category)], ['제목', esc(q.subject)], ['내용', pre(q.body)]];
  const note = '<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#57524a">문의를 잘 받았습니다. 영업일 기준 1~2일 안에 <b>이 메일 주소</b>와 <b>마이페이지 → 1:1 문의 내역</b>으로 답변을 드립니다. 추가로 알려 주실 내용이 있으면 이 메일에 답장해 주세요.</p>';
  const text = `[${BIZ.service}] 1:1 문의가 접수되었습니다${q.id ? ' (#' + q.id + ')' : ''}\n제목: ${q.subject}\n\n${q.body}\n\n영업일 기준 1~2일 안에 이 메일 주소와 마이페이지 1:1 문의 내역으로 답변을 드립니다.\n${BIZ.name} · ${BIZ.phone} · ${BIZ.email}`;
  return { subject: `[${BIZ.service}] 1:1 문의가 접수되었습니다 · ${q.subject}`, html: layout('1:1 문의가 접수되었습니다', rows, note), text };
}
export function inquiryAnswerMail(q) {
  const rows = [['문의 번호', '#' + esc(q.id)], ['문의 제목', esc(q.subject)], ['문의 내용', '<span style="color:#6b6b6b">' + pre(q.body) + '</span>'], ['답변', '<b>' + pre(q.answer) + '</b>']];
  const note = '<p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#57524a">답변은 <a href="' + SITE + '/report/#/me?inq=list" style="color:#9b3b2a">마이페이지 → 1:1 문의</a>에서도 다시 볼 수 있습니다. 더 궁금한 점이 있으면 이 메일에 답장하거나 마이페이지에서 새 문의를 남겨 주세요.</p>';
  const text = `[${BIZ.service}] 1:1 문의(#${q.id})에 답변드립니다\n문의 제목: ${q.subject}\n\n[답변]\n${q.answer}\n\n[문의 내용]\n${q.body}\n\n마이페이지에서도 다시 볼 수 있습니다: ${SITE}/report/#/me?inq=list\n${BIZ.name} · ${BIZ.phone} · ${BIZ.email}`;
  return { subject: `[${BIZ.service}] 1:1 문의에 답변드립니다 · ${q.subject}`, html: layout('1:1 문의 답변', rows, note).replace(`${SITE}/report/my/" style="display:inline-block`, `${SITE}/report/#/me?inq=list" style="display:inline-block`).replace('내 구매 내역 보기', '마이페이지에서 보기'), text };
}
// 관리자 화면에서 쓴 답변을 회원에게 보낸다(회신 주소 = 고객센터 메일)
export async function mailInquiryAnswer(env, q) {
  if (!mailReady(env) || !okMail(q.email)) return false;
  return send(env, q.email, inquiryAnswerMail(q), 'inquiry-answer');
}
export const inquiryReady = env => alertReady(env);
// 반환: 관리자 메일이 한 통이라도 갔는지. 회원 확인 메일은 실패해도 접수에 영향 없음
export async function mailInquiry(env, q) {
  if (!inquiryReady(env)) return false;
  const mail = inquiryAdminMail(q), reply = okMail(q.email) ? q.email : undefined; let any = false;
  for (const to of adminAlertTo(env)) any = (await send(env, to, mail, 'inquiry-admin', reply)) || any;
  if (reply) await send(env, reply, inquiryUserMail(q), 'inquiry-user');
  return any;
}
