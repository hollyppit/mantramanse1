# 통합 운영 반영 — 2026-10-18

- 운영: https://mantramanse.pages.dev/report/
- 최종 배포: ec4d97a3 (전체 ID: output/cinematic-deploy/deployment.json)
- 챕터 CMS 공개 버전 11: 7개 주제, 활성 84개. 기존 79개는 보관.
- 구성: 종합풀이 22 / 재물운 12 / 커리어운 12 / 인연운 12 / 건강 및 사고수 10 / 전생 체험 8 / 개운법 8.
- 문체 공개 버전 2: 직설형, 직접성 3, 존댓말·이름+님, 전문 용어는 근거 영역으로 분리.
- 최근 온보딩 가독성, 붉은 활성 버튼, 무빙툰 상단 미디어 25vh와 이전·다음 탐색 변경도 포함.
- 고정 일반 건강·안전 안내 3개는 검수한 기존 문구 그대로 제공. 개인 건강 판단이나 전문가 승인으로 취급하지 않음.
- 고정 안내를 화면 진입 전 준비하도록 수정하여 열린 챕터에 준비 중 문구가 남는 현상 해결.

## 검증

- 공개 API 대조: output/integrated-release/public-verification.json
- 실제 운영 PC 1280px / 모바일 390px: 7개 주제·84개 목차, 주제별 이동, 건강 안내 본문 표시, JavaScript 오류 없음.
- 결과: output/integrated-release/mobile-results.json, timeline-browser.json
- 테스트: timeline84, timeline84-gaps, ux-writing, ux-writing-api, editorial-source-readiness, editorial, engine-baseline(120 charts), style, health-education-release, timeline84-local-health.
- 유료 AI 생성 호출은 브라우저 검증에서 대체 응답으로 차단. 새 개인별 AI 본문 전체를 생성·검수한 결과는 아님.
- 저장된 과거 AI 본문을 일괄 재작성하지 않음. 새 문체는 새 생성/재생성에 적용.

## 복구 자료

- CMS 변경 전 v6: output/integrated-release/editorial-before-v6.json (배포 제외)
- 이전/현재 배포 정보: output/cinematic-deploy/deployment.json
- unrelated research files were not packaged; only public allowlisted assets and compiled worker deployed.
