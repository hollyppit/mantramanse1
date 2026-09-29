// GET /api/glossary — 관리자가 수정한 용어 설명 { 용어: 설명 }
// PUT /api/glossary — { term, text } 저장, text가 null이면 기본 문구로 되돌림 (관리자 전용)
import { KV_KEY, json, isAdmin, configError } from '../_lib.js';

const MAX_TERM = 40, MAX_TEXT = 4000, MAX_ENTRIES = 2000;

export async function onRequestGet({ env }) {
  if (!env.GLOSSARY_KV) return json({});
  return json((await env.GLOSSARY_KV.get(KV_KEY, 'json')) || {});
}

export async function onRequestPut({ request, env }) {
  const err = configError(env);
  if (err) return json({ error: err }, 500);
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);

  let body;
  try { body = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const { term, text } = body || {};
  if (typeof term !== 'string' || !term.trim() || term.length > MAX_TERM) return json({ error: '용어 이름이 올바르지 않습니다' }, 400);
  if (text !== null && (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT)) return json({ error: `설명은 1~${MAX_TEXT}자로 입력하세요` }, 400);

  const data = (await env.GLOSSARY_KV.get(KV_KEY, 'json')) || {};
  if (text === null) delete data[term];
  else {
    if (!(term in data) && Object.keys(data).length >= MAX_ENTRIES) return json({ error: '저장 가능한 항목 수를 넘었습니다' }, 400);
    data[term] = text.trim();
  }
  await env.GLOSSARY_KV.put(KV_KEY, JSON.stringify(data));
  return json({ ok: true, term, text: data[term] ?? null });
}
