// 회원 동의(2단계). 공용 규칙: functions/_consent.js · 표: supabase/migrations/20261116_member_stage2.sql
// POST { action:'get' }                                   회원 본인 현재 동의·문서 버전·휴대폰(가림)·카카오 채널 주소
// POST { action:'set', changes:{kind:bool}, versions:{kind:version}, via?, phone? }
//        광고성 항목이 바뀌면 계정 이메일로 처리 결과를 알린다(법정 안내). 필수 항목은 동의만 받고 철회는 받지 않는다
// GET  (관리자) 항목별 동의 수·2년 재확인 대상·최근 변경(회원 id 없이)
import { json, isAdmin } from '../../_lib.js';
import { memberOf, supabaseReady, sbRest } from '../../_commerce.js';
import { DOCS, KINDS, readConsents, setConsents, requiredOk, docsPublic, stateBrief, phoneOf, maskPhone } from '../../_consent.js';
import { mailConsentResult } from '../../_mail.js';

const channelUrl = env => { const u = String(env.KAKAO_CHANNEL_URL || ''); return /^https:\/\/pf\.kakao\.com\/[A-Za-z0-9_]+\/?$/.test(u) ? u : null; };

async function snapshot(env, userId) {
  const [state, phone] = await Promise.all([readConsents(env, userId), phoneOf(env, userId)]);
  return { docs: docsPublic(), state: stateBrief(state), requiredOk: requiredOk(state), phone: maskPhone(phone), kakaoChannel: channelUrl(env) };
}

export async function onRequestPost({ request, env }) {
  if (!supabaseReady(env)) return json({ error: '지금은 설정을 불러올 수 없습니다. 잠시 후 다시 시도해 주세요' }, 503);
  const member = await memberOf(request, env); if (!member) return json({ error: '로그인이 필요합니다', need: 'login' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  body = body && typeof body === 'object' ? body : {};
  try {
    if (body.action === 'set') {
      const r = await setConsents(env, member.id, body.changes, { versions: body.versions || {}, via: body.via, phone: body.phone });
      if (!r.ok) return json({ error: r.error, needPhone: r.needPhone, docs: r.docs }, r.status || 400);
      const ads = r.changed.filter(c => !DOCS[c.kind].required).map(c => ({ title: DOCS[c.kind].title, action: c.action }));
      const mailed = ads.length ? await mailConsentResult(env, member.email, ads, r.at) : false;
      return json({ ok: true, changed: r.changed, mailed: !!mailed, ...(await snapshot(env, member.id)) });
    }
    return json(await snapshot(env, member.id));
  } catch (e) {
    return json({ error: '잠시 후 다시 시도해 주세요' }, 502);
  }
}

export async function onRequestGet({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  if (!supabaseReady(env)) return json({ error: 'Supabase 설정이 없습니다' }, 503);
  const rows = (await sbRest(env, 'member_consents?agreed=is.true&select=kind,version,granted_at&limit=100000')) || [];
  const due = Date.now() - (730 - 30) * 864e5;   // 동의한 지 2년이 되기 30일 전부터 재확인 통지 대상
  const byKind = {}; KINDS.forEach(k => { byKind[k] = { agreed: 0, current: 0, renewDue: 0 }; });
  rows.forEach(r => { const b = byKind[r.kind]; if (!b) return; b.agreed++; if (r.version === DOCS[r.kind].version) b.current++; if (!DOCS[r.kind].required && Date.parse(r.granted_at) <= due) b.renewDue++; });
  const ev = (await sbRest(env, 'consent_events?select=kind,action,version,at,via&order=at.desc&limit=40')) || [];
  return json({ docs: docsPublic(), byKind, recent: ev });
}
