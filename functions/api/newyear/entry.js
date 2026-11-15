// GET /api/newyear/entry — 운명의 타임라인 입구 카드(누구나). 관리자 › 신년운세 › 공개 범위 카드에서 정한 값.
// 응답: { ok, entry: null | { year, paid, price, kick, title, line, go } } — 비공개 해·카드 끈 해는 null.
import { json } from '../../_lib.js';
import { loadProducts, ANNUAL_WORLD } from '../../_commerce.js';
import { loadNewyearConfig, entryOf } from '../../_newyear.js';

export async function onRequestGet({ env }) {
  let entry = null;
  try {
    const cfg = await loadNewyearConfig(env);
    let prods = []; try { prods = await loadProducts(env); } catch { prods = []; }
    entry = entryOf(cfg, y => prods.find(p => p.id === ANNUAL_WORLD(y)) || null);
  } catch { entry = null; }
  const res = json({ ok: true, entry }, 200);
  try { res.headers.set('cache-control', 'public, max-age=60'); } catch { }
  return res;
}
