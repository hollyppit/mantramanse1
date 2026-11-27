// 알림톡으로 보낸 만세력 PDF 내려받기. 2026-11-27  GET /api/pdf/<32자리 코드>
// 코드는 추측할 수 없는 무작위 값(128비트)이고, 7일이 지나면 지우고 '기한 지남'을 보여 준다. 검색 엔진에 남지 않게 noindex.
const page = (status, msg) => new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>만트라 만세력</title><body style="font-family:sans-serif;padding:40px 20px;text-align:center;color:#333"><p>${msg}</p></body>`, { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });

export async function onRequestGet({ params, env }) {
  const code = String(params.code || '').replace(/\.pdf$/, '');
  if (!/^[0-9a-f]{32}$/.test(code)) return page(404, '파일을 찾을 수 없습니다.');
  if (!env.CLIPS_R2) return page(503, '잠시 후 다시 열어 주세요.');
  const key = 'share-pdf/' + code + '.pdf', o = await env.CLIPS_R2.get(key);
  if (!o) return page(404, '파일이 없거나 보관 기한이 지나 삭제되었습니다. 다시 요청해 주세요.');
  const exp = +(o.customMetadata && o.customMetadata.exp);
  if (!exp || exp < Date.now()) { try { await env.CLIPS_R2.delete(key); } catch { } return page(410, '보관 기한(7일)이 지나 삭제되었습니다. 다시 요청해 주세요.'); }
  const name = (o.customMetadata && o.customMetadata.filename) || '만세력.pdf';
  return new Response(o.body, { headers: {
    'content-type': 'application/pdf', 'content-length': String(o.size),
    'content-disposition': `inline; filename="manse.pdf"; filename*=UTF-8''${encodeURIComponent(name)}`,
    'cache-control': 'private, no-store', 'x-robots-tag': 'noindex', 'referrer-policy': 'no-referrer',
  } });
}
