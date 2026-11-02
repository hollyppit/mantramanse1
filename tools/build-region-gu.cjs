// 시·군·구 중심 좌표 생성: node tools/build-region-gu.cjs <skorea-municipalities-2018-geo.json> [출력=region-gu-data.js]
// 원본: 통계청(KOSTAT) 센서스용 행정구역경계 2018 — southkorea/southkorea-maps (GeoJSON, 250개 시·군·구). 18MB라 저장소에는 넣지 않고 이 스크립트와 결과만 둔다.
// 중심 = 각 행정구역 면적 중심(구멍 제외, 경도에 cos(위도) 보정한 평면 근사). 시·도 기준점 = 소속 시·군·구 면적 중심의 면적 가중 평균.
//   기준점이 청사가 아니라 "행정구역 면적 중심"인 이유: 외부 기억에 의존하지 않고 같은 데이터로 누구나 재현할 수 있게 하기 위해서다.
const fs = require('fs'), path = require('path');
const src = process.argv[2]; if (!src) { console.error('사용법: node tools/build-region-gu.cjs <geojson> [출력]'); process.exit(1); }
const out = process.argv[3] || path.join(__dirname, '..', 'region-gu-data.js');
const g = JSON.parse(fs.readFileSync(src, 'utf8'));
const PROV = { 11: '서울특별시', 21: '부산광역시', 22: '대구광역시', 23: '인천광역시', 24: '광주광역시', 25: '대전광역시', 26: '울산광역시', 29: '세종특별자치시', 31: '경기도', 32: '강원특별자치도', 33: '충청북도', 34: '충청남도', 35: '전북특별자치도', 36: '전라남도', 37: '경상북도', 38: '경상남도', 39: '제주특별자치도' };
const K = Math.cos(36 * Math.PI / 180);   // 한반도 중위도 경도 보정
function ringArea(r) { let a = 0, cx = 0, cy = 0; for (let i = 0; i < r.length - 1; i++) { const x0 = r[i][0] * K, y0 = r[i][1], x1 = r[i + 1][0] * K, y1 = r[i + 1][1], c = x0 * y1 - x1 * y0; a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c; } a /= 2; return { a, cx: a ? cx / (6 * a) : 0, cy: a ? cy / (6 * a) : 0 }; }
function centroid(geom) {
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.coordinates; let A = 0, X = 0, Y = 0;
  for (const p of polys) p.forEach((ring, i) => { const r = ringArea(ring), s = i === 0 ? 1 : -1, a = Math.abs(r.a) * s; A += a; X += r.cx * a; Y += r.cy * a; });
  return { area: A, lon: X / A / K, lat: Y / A };
}
const rows = g.features.map(f => { const c = centroid(f.geometry); return { code: String(f.properties.code), name: f.properties.name, lat: c.lat, lon: c.lon, area: c.area }; }).sort((a, b) => a.code.localeCompare(b.code));
const prov = {};
rows.forEach(r => { const p = r.code.slice(0, 2); (prov[p] = prov[p] || { A: 0, X: 0, Y: 0, rows: [] }); const q = prov[p]; q.A += r.area; q.X += r.lon * r.area; q.Y += r.lat * r.area; q.rows.push(r); });
const provOut = Object.keys(prov).sort().map(p => { const q = prov[p], lat = q.Y / q.A, lon = q.X / q.A, rad = Math.max(...q.rows.map(r => Math.hypot((r.lon - lon) * K, r.lat - lat))); return [p, PROV[+p], +lat.toFixed(4), +lon.toFixed(4), +rad.toFixed(4)]; });
const guOut = rows.map(r => [r.code, r.name, +r.lat.toFixed(4), +r.lon.toFixed(4)]);
if (guOut.length !== 250 || provOut.length !== 17) throw new Error('예상과 다른 개수: ' + guOut.length + '/' + provOut.length);
fs.writeFileSync(out, `/* 시·군·구 중심 좌표 (자동 생성 — 직접 고치지 마세요. tools/build-region-gu.cjs)
   원본: 통계청(KOSTAT) 센서스용 행정구역경계 2018, southkorea/southkorea-maps. 사용 전 공공데이터 이용 조건(출처 표시)을 확인하세요.
   PROVINCES: [시·도 코드, 이름, 기준점 위도, 기준점 경도, 반경(도)]  기준점 = 소속 시·군·구 면적 중심의 면적 가중 평균(청사 위치 아님)
   GU: [시·군·구 코드, 이름, 면적 중심 위도, 경도] */
(function (G) {
  'use strict';
  var data = { source: 'KOSTAT 센서스용 행정구역경계 2018 (southkorea/southkorea-maps)', PROVINCES: ${JSON.stringify(provOut)}, GU: ${JSON.stringify(guOut)} };
  G.MantraRegionGu = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(typeof window !== 'undefined' ? window : globalThis);
`);
console.log('생성:', out, guOut.length + '개 시·군·구,', provOut.length + '개 시·도');
