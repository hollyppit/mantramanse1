// GET /api/newyear/look?year=2027 — 신년운세 화면 꾸미기(누구나): 배경 이미지·진입 프롤로그·패널 이미지 섞기 여부.
// 관리자 › 판매·타임라인 › 신년운세 › 화면 꾸미기에서 정한 값. 풀이 문구·출생 정보와 무관하고 파일 주소만 돌려준다.
import { json } from '../../_lib.js';
import { YEARS } from '../../_newyear-runtime.js';
import { loadNewyearConfig, yearConfig, cleanMedia } from '../../_newyear.js';

export async function onRequestGet({ request, env }) {
  const year = Number(new URL(request.url).searchParams.get('year'));
  if (!YEARS().includes(year)) return json({ ok: false, error: 'unknown-year' }, 404);
  let media; try { media = cleanMedia(yearConfig(await loadNewyearConfig(env), year).media); } catch { media = cleanMedia(null); }
  const res = json({ ok: true, year, media }, 200);
  try { res.headers.set('cache-control', 'public, max-age=60'); } catch { }
  return res;
}
