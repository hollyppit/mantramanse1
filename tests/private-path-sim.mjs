// 배포 제외 경로(/validation/…) 차단 검증 — node tests/private-path-sim.mjs
//   · 대소문자·중복 슬래시·%인코딩 우회까지 404, 서비스 경로는 통과, 사이트 잠금보다 먼저 막힘(관리자·잠금 쿠키와 무관)
import assert from 'node:assert/strict';
import { isPrivatePath, onRequest } from '../functions/_middleware.js';
const block = ['/validation/celebrity/reports/report.html', '/validation/celebrity/data/raw/sports.json', '/Validation/x', '//validation/a', '/%76alidation/a', '/validation', '/VALIDATION/'];
const pass = ['/', '/report/', '/validationx/a', '/api/luck-flags', '/index.html', '/report/admin/'];
block.forEach(p => assert.ok(isPrivatePath('https://mantramanse.pages.dev' + p), '막혀야 함: ' + p));
pass.forEach(p => assert.ok(!isPrivatePath('https://mantramanse.pages.dev' + p), '통과해야 함: ' + p));
const r = await onRequest({ request: new Request('https://mantramanse.pages.dev/validation/celebrity/README.md'), env: {}, next: () => new Response('ok') });
assert.equal(r.status, 404);
assert.equal(r.headers.get('x-robots-tag'), 'noindex');
console.log(`private-path-sim OK: 차단 ${block.length} · 통과 ${pass.length} · 잠금보다 먼저 404`);
