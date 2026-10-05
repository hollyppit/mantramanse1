// 일주 캐릭터 영상 120개 (60일주 × 성별) + 일간 소개 영상 20개(10일간 × 성별). 일반 미디어 라이브러리와 분리해 정확한 일주·성별로만 매칭한다.
// GET  /api/awakening?pillar=갑자&gender=M — 공개. 해당 일주 캐릭터 영상 1개 + 그 일간의 소개 영상 1개(+ 기본 영상 fallback). 전체를 한 번에 내려보내지 않는다.
// GET  /api/awakening?all=1               — 관리자. 전체 목록
// PUT  /api/awakening                      — 관리자. { videos: [...], ilgan?: [...], fallback?: {...} } 전체 저장
// 저장: GLOSSARY_KV 'awakening:index' → { videos, ilgan, fallback }
import { json, isAdmin, configError } from '../_lib.js';
import { cleanAwakening, cleanIlgan, normStem, MEDIA_OK, cleanPublicBase, publicizeClip } from '../_media.js';

const KEY = 'awakening:index';
const ok = v => (MEDIA_OK.test(v || '') ? v : '');
const cleanFb = f => (f && typeof f === 'object' ? { videoUrl: ok(f.videoUrl), videoWebm: ok(f.videoWebm), posterUrl: ok(f.posterUrl), title: String(f.title || '').slice(0, 60) } : null);

export async function onRequestGet({ request, env }) {
  if (!env.GLOSSARY_KV) return json({ video: null, ilgan: null, fallback: null });
  const q = new URL(request.url).searchParams, d = (await env.GLOSSARY_KV.get(KEY, 'json')) || { videos: [], ilgan: [], fallback: null };
  if (q.get('all')) return isAdmin(request, env) ? json(d) : json({ error: '관리자 인증이 필요합니다' }, 401);
  const c = cleanAwakening({ dayPillar: q.get('pillar'), gender: q.get('gender') });
  const v = c && d.videos.find(x => x.dayPillar === c.dayPillar && x.gender === c.gender && x.enabled && (x.videoUrl || x.videoWebm || x.posterUrl));
  const stem = c ? c.dayPillar[0] : normStem(q.get('pillar')), ig = stem && (d.ilgan || []).find(x => x.stem === stem && x.gender === (c ? c.gender : null) && x.enabled && (x.videoUrl || x.videoWebm));
  const base = cleanPublicBase(d.publicBase); // 설정돼 있으면 영상·이미지 주소를 R2 공개 도메인으로 바로 내보낸다(함수 호출 없이 재생)
  const pub = c => { const o = publicizeClip(base, c); if (o && typeof o === 'object') { const { guardianImageUrl, ...rest } = o; return rest; } return o || null; }; // 예전에 저장된 수호신 이미지 필드는 내보내지 않는다
  return json({ video: pub(v), ilgan: pub(ig), fallback: pub(d.fallback) });
}

export async function onRequestPut({ request, env }) {
  if (!isAdmin(request, env)) return json({ error: '관리자 인증이 필요합니다' }, 401);
  const ce = configError(env); if (ce) return json({ error: ce }, 501);
  let b; try { b = await request.json(); } catch { return json({ error: '잘못된 요청 형식입니다' }, 400); }
  if (!Array.isArray(b.videos) || b.videos.length > 240) return json({ error: 'videos 는 240개 이하 배열이어야 합니다' }, 400);
  const map = new Map(); for (const v of b.videos) { const c = cleanAwakening(v); if (c) map.set(c.dayPillar + c.gender, c); }
  const im = new Map(); for (const v of Array.isArray(b.ilgan) ? b.ilgan.slice(0, 40) : []) { const c = cleanIlgan(v); if (c) im.set(c.stem + c.gender, c); }
  const prev = await env.GLOSSARY_KV.get(KEY, 'json'); // 공개 주소를 안 보낸 저장 요청은 기존 값을 유지한다
  const publicBase = 'publicBase' in b ? cleanPublicBase(b.publicBase) : cleanPublicBase(prev && prev.publicBase);
  await env.GLOSSARY_KV.put(KEY, JSON.stringify({ videos: [...map.values()], ilgan: [...im.values()], fallback: cleanFb(b.fallback), publicBase }));
  return json({ ok: true, count: map.size, ilgan: im.size });
}
