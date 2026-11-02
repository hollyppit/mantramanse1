// 읍·면·동 중심 좌표 생성: node tools/build-region-dong.cjs <skorea-submunicipalities-2018-geo.json> [출력=region-dong-data.js]
// 원본: 통계청(KOSTAT) 센서스용 행정구역경계 2018 — southkorea/southkorea-maps (GeoJSON, 3,504개 읍·면·동, 34MB라 저장소에는 넣지 않는다).
// 중심 = 각 행정구역 면적 중심(구멍 제외, 경도에 cos(위도) 보정한 평면 근사). 동의 방위 기준점 = 소속 시·군·구의 면적 중심(소속 동 면적 가중 평균).
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('사용법: node tools/build-region-dong.cjs <geojson> [출력]'); process.exit(1); }
const out = process.argv[3] || path.join(__dirname, '..', 'region-dong-data.js');
const guCodes = new Set(require('../region-gu-data.js').GU.map(g => g[0]));
const g = JSON.parse(fs.readFileSync(src, 'utf8'));
const K = Math.cos(36 * Math.PI / 180);
function ringArea(r) { let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const x0 = r[i][0] * K, y0 = r[i][1], x1 = r[i + 1][0] * K, y1 = r[i + 1][1], c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; } a /= 2; return { a, cx: a ? cx / (6 * a) : 0, cy: a ? cy / (6 * a) : 0 }; }
function centroid(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let A = 0, X = 0, Y = 0;
  for (const p of polys) p.forEach((ring, i) => { const r = ringArea(ring), s = i === 0 ? 1 : -1, a = Math.abs(r.a) * s; A += a; X += r.cx * a; Y += r.cy * a; });
  return { area: A, lon: X / A / K, lat: Y / A };
}
const rows = g.features.map(f => { const c = centroid(f.geometry); return { code: String(f.properties.code), name: f.properties.name, lat: c.lat, lon: c.lon, area: c.area }; }).sort((a, b) => a.code.localeCompare(b.code));
if (rows.length < 3000 || rows.some(r => !guCodes.has(r.code.slice(0, 5)) || !isFinite(r.lat) || !isFinite(r.lon))) throw new Error('예상과 다른 데이터');
const by = {}; rows.forEach(r => { const k = r.code.slice(0, 5); (by[k] = by[k] || { A: 0, X: 0, Y: 0, rows: [] }); const q = by[k]; q.A += r.area; q.X += r.lon * r.area; q.Y += r.lat * r.area; q.rows.push(r); });
const guRef = Object.keys(by).sort().map(k => { const q = by[k], lat = q.Y / q.A, lon = q.X / q.A, rad = Math.max(...q.rows.map(r => Math.hypot((r.lon - lon) * K, r.lat - lat))); return [k, +lat.toFixed(4), +lon.toFixed(4), +rad.toFixed(4)]; });
const dong = rows.map(r => [r.code, r.name, +r.lat.toFixed(4), +r.lon.toFixed(4)]);
fs.writeFileSync(out, `/* 읍·면·동 중심 좌표 (자동 생성 — 직접 고치지 마세요. tools/build-region-dong.cjs)
   원본: 통계청(KOSTAT) 센서스용 행정구역경계 2018, southkorea/southkorea-maps. 사용 전 공공데이터 이용 조건(출처 표시)을 확인하세요.
   GUREF: [시·군·구 코드, 기준점 위도, 기준점 경도, 반경(도)]  기준점 = 소속 읍·면·동 면적 중심의 면적 가중 평균
   DONG: [읍·면·동 코드(7자리, 앞 5자리 = 시·군·구 코드), 이름, 면적 중심 위도, 경도] */
(function (G) {
  'use strict';
  var data = { source: 'KOSTAT 센서스용 행정구역경계 2018 (southkorea/southkorea-maps)', GUREF: ${JSON.stringify(guRef)}, DONG: ${JSON.stringify(dong)} };
  G.MantraRegionDong = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log('생성:', out, dong.length + '개 읍·면·동,', guRef.length + '개 시·군·구 기준점');
