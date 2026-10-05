// 일간 소개 영상(10일간 × 성별 = 20) — "이 이야기의 주인공" 캐릭터 소개 오프닝에 쓴다.
// 예전 "일주 각성(수호신) 영상 120개"는 DEPRECATED_GUARDIAN 으로 분리했다: 저장본은 롤백을 위해 KV 에 그대로 보존하지만
//   공개 API 로는 절대 내보내지 않고, 새 무빙툰은 선택하지 않으며, 관리자 목록에서도 기본으로 숨긴다(?all=1&deprecated=1 로만 열람).
// GET  /api/awakening?pillar=갑자&gender=M — 공개. 그 일간·성별의 "일간 소개" 영상 1개만. 전체를 한 번에 내려보내지 않는다.
// GET  /api/awakening?all=1               — 관리자. { ilgan, publicBase, deprecatedGuardian: <보존 개수> }
// GET  /api/awakening?all=1&deprecated=1  — 관리자. 보존 중인 수호신 영상 원본 { videos, fallback } (복구·최종 삭제 전 확인용)
// PUT  /api/awakening                      — 관리자. { ilgan?: [...], publicBase? } 저장. 보존 중인 수호신 영상은 건드리지 않는다.
// 저장: GLOSSARY_KV 'awakening:index' → { ilgan, publicBase, videos(DEPRECATED_GUARDIAN), fallback(DEPRECATED_GUARDIAN) }
import { json, isAdmin, configError } from '../_lib.js';
import { cleanIlgan, normStem, cleanPublicBase, publicizeClip } from '../_media.js';

const KEY = 'awakening:index';
export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ ilgan: null });
  const q = new URL(request.url).searchParams, d = (await env.GLOSSARY_KV.get(KEY, 'json')) || { videos: [], ilgan: [], fallback: null };
  if (q.get('all')) {
    if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
    if (q.get('deprecated')) return json({ state: 'DEPRECATED_GUARDIAN', videos: d.videos || [], fallback: d.fallback || null });
    return json({ ilgan: d.ilgan || [], publicBase: d.publicBase || '', deprecatedGuardian: (d.videos || []).length });
  }
  const stem = normStem(q.get('pillar')), g = /^(m|male|남)/i.test(q.get('gender') || '') ? 'M' : /^(f|female|여)/i.test(q.get('gender') || '') ? 'F' : null;
  const ig = stem && g && (d.ilgan || []).find(x => x.stem === stem && x.gender === g && x.enabled && (x.videoUrl || x.videoWebm));
  const base = cleanPublicBase(d.publicBase); // 설정돼 있으면 영상·이미지 주소를 R2 공개 도메인으로 바로 내보낸다(함수 호출 없이 재생)
  return json({ ilgan: publicizeClip(base, ig) || null });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  const im = new Map(); for (const v of Array.isArray(b.ilgan) ? b.ilgan.slice(0, 40) : []) { const c = cleanIlgan(v); if (c) im.set(c.stem + c.gender, c); }
  const prev = (await env.GLOSSARY_KV.get(KEY, 'json')) || {}; // 공개 주소를 안 보낸 저장 요청은 기존 값을 유지한다
  const publicBase = 'publicBase' in b ? cleanPublicBase(b.publicBase) : cleanPublicBase(prev.publicBase);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify({ ilgan: [...im.values()], publicBase, videos: prev.videos || [], fallback: prev.fallback || null })); // videos·fallback = DEPRECATED_GUARDIAN 보존분
  return json({ ok: true, ilgan: im.size });
}
