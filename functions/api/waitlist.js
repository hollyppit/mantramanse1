// POST /api/waitlist — { email, consent, website } 출시 알림 신청 저장 (website는 봇 함정 필드)
// GET  /api/waitlist — 신청 목록 (관리자 전용)
// 저장 위치: GLOSSARY_KV의 'waitlist:<이메일>' 키. 용어 수정 데이터(overrides)와 키가 겹치지 않는다.
import { json, isAdmin, configError } from '../_lib.js';
import { kvOf } from '../_store.js';

const PREFIX = 'waitlist:';
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}\.[^\s@]{2,}$/;

export async function onRequestPost({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ error: '지금은 신청을 받을 수 없습니다. 잠시 후 다시 시도해 주세요' }, 500);

  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const { email, consent, website } = body || {};

  if (website) return json({ ok: true }); // 봇은 성공한 것처럼 돌려보낸다
  if (consent !== true) return json({ error: '개인정보 수집·이용에 동의해 주세요' }, 400);
  const addr = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (addr.length > 254 || !EMAIL_RE.test(addr)) return json({ error: '이메일 형식을 확인해 주세요' }, 400);

  const key = PREFIX + addr;
  const kv = kvOf(env);
  if (!(await kv.get(key))) {
    await kv.put(key, JSON.stringify({ at: new Date().toISOString() }));
  }
  return json({ ok: true }); // 이미 신청한 주소도 같은 응답 (가입 여부 노출 방지)
}

export async function onRequestGet({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);

  const list = [];
  let cursor;
  do {
    const page = await kvOf(env).list({ prefix: PREFIX, cursor });
    for (const k of page.keys) list.push(k.name.slice(PREFIX.length));
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return json({ count: list.length, emails: list });
}
