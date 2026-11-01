# 봉인 웹툰 운영 배포 결과

사용자의 “배포해” 승인에 따라 기존 Cloudflare Pages 운영 프로젝트 mantramanse에 배포했습니다.

- 운영 주소: https://mantramanse.pages.dev/report/v2/
- 배포 ID: 8ff99271-f9b6-4457-8b6d-2e4406e2e8ae
- 배포별 주소: https://8ff99271.mantramanse.pages.dev
- 이전 배포/복구 기준: cd8a1788-be94-4eeb-a511-14fd7e0d8412
- 배포 상태: success, production
- 기존 운영 설정 해시 동일: true

기존 Wrangler 4.151.1로 Functions 전체를 운영 compatibility date 2026-09-29로 빌드했습니다. 승인된 정적 파일13개와 컴파일된 Worker를 반영했고, 다른212개 정적 파일 및 engine.js는 기존 운영 바이트 그대로 유지했습니다. 서버 Functions 소스는 정적 자산으로 업로드하지 않았습니다.

배포 후 공개 정적 파일 225개의 SHA-256이 모두 일치했습니다. /api/assets, /api/media, /api/free-content 응답은 배포 전과 동일합니다. /api/seal-scenes 공개 GET은200(별도 게시 메타데이터0개), 미인증 관리자 GET은401입니다. /functions 경로는 기존 SPA HTML 대체 응답이며 서버 소스가 노출되지 않음을 확인했습니다.

실제 운영 브라우저에서 가상 입력→기존 계산→세계 지도→봉인 개봉→다음 챕터의 비동기 검수 문안 응답→다음 봉인 개봉을 확인했습니다. 390px 화면에서 가로 넘침이 없었습니다. 운영 환경설정·DB 스키마·기존 검수 게시본·R2 원본 수정 명령은 수행하지 않았습니다. 관리자 인증값은 공급자가 공개하지 않아 인증 후 관리자 저장·게시 smoke test는 수행하지 않았습니다.

근거: output/sealed-webtoon/deploy/의 preflight.json, manifest.json, static-audit.json, deployment.json, post-deploy-verification.json, browser-verification.json, production-seal-mobile.png.

복구는 Cloudflare Pages에서 이전 배포 cd8a1788-be94-4eeb-a511-14fd7e0d8412로 rollback합니다. 새 배포가 추가된 경우 현재 canonical deployment ID를 먼저 대조하여 다른 작업을 덮어쓰지 않습니다. 원본 자산과 기존 검수 문안을 삭제하거나 DB 역마이그레이션하지 않습니다.
