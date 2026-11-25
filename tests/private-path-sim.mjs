// 배포 제외 경로(/validation/…) 차단 검증 — node tests/private-path-sim.mjs
//   · 대소문자·중복 슬래시·%인코딩 우회까지 404, 서비스 경로는 통과, 사이트 잠금보다 먼저 막힘(관리자·잠금 쿠키와 무관)
import assert from 'node:assert/strict';
import { isPrivatePath, onRequest } from '../functions/_middleware.js';
const block = ['/validation/celebrity/reports/report.html', '/validation/celebrity/data/raw/sports.json', '/Validation/x', '//validation/a', '/%76alidation/a', '/validation', '/VALIDATION/',
  // 2026-11-26: 유료 원고·내부 문서·도구·테스트·DB 구조·설정·숨김 파일·설명 문서
  '/editorial/rebuild-20261022/wealth-01-04.mjs', '/docs/MOVINGTOON_LIVE_AUDIT.json', '/docs/READING_CONSISTENCY_AUDIT.md', '/supabase/schema.sql', '/tools/security-audit.sql', '/tests/occult-panels-fixture.json',
  '/.claude/launch.json', '/.gitignore', '/.git/config', '/config/agentic-rag.production-safe.json', '/workers/x.js', '/output/a.json', '/%EC%99%B8%EB%B6%80%ED%88%B4_%ED%94%84%EB%A1%AC%ED%94%84%ED%8A%B8/a.md',
  '/report/v2/NEXT_PLAN.md', '/report/hub/tarot/README.md', '/Docs/x', '/%64ocs/x', '//editorial/a.js', '/report.zip'];
const pass = ['/', '/report/', '/validationx/a', '/api/luck-flags', '/index.html', '/report/admin/',
  '/report/v2/viewer.js', '/engine.js', '/report/hub/hub.js', '/community/cm.js', '/gate/gate.js', '/report/legal/terms.html', '/.well-known/security.txt', '/report/admin/vendor/mp4box.LICENSE', '/docsx/a', '/report/docs.js', '/api/reading-editorial'];
block.forEach(p => assert.ok(isPrivatePath('https://mantramanse.pages.dev' + p), '막혀야 함: ' + p));
pass.forEach(p => assert.ok(!isPrivatePath('https://mantramanse.pages.dev' + p), '통과해야 함: ' + p));
const r = await onRequest({ request: new Request('https://mantramanse.pages.dev/validation/celebrity/README.md'), env: {}, next: () => new Response('ok') });
assert.equal(r.status, 404);
assert.equal(r.headers.get('x-robots-tag'), 'noindex');
console.log(`private-path-sim OK: 차단 ${block.length} · 통과 ${pass.length} · 잠금보다 먼저 404`);
