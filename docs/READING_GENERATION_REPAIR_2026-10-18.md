# 본문 생성 복구 운영 반영 — 2026-10-18

- 운영 배포: 80531721-1aa1-4150-8776-196f22461dd1
- 이전 배포: output/reading-repair-deploy/deployment.json 참고. Cloudflare 설정 변경 없음.
- 원인: 검수 거절 후 유효한 후보 본문 없이 다른 제공사에서 전체 재생성하던 흐름과 부족한 요청 시간. 현재/이미 방문한 장의 완료 본문 갱신도 차단되어 있었음.
- 수정: 필수 항목의 개인 원국 적용 지시, 이전 후보·검수 사유·누락 항목을 전달하는 보완 및 독립 재검수, 서버/클라이언트 시간 제한 조정. 선택한 장 우선 생성과 중복 요청 방지. 열린 대기 본문 갱신과 잔여 대기 문구 제거.
- 검수·근거·문체 기준은 유지. 근거가 없는 항목을 임의 해석으로 채우지 않음.

## 실제 운영 검증

- 남성 샘플 재물운: 실제 OpenAI 생성, 독립 검수 passed, 본문 7문단. 최초 새 생성 성공 후 최종 배포에서 동일 실제 결과의 캐시 응답까지 확인.
- 여성 샘플 모바일 인연운: 최종 배포에서 실제 새 생성, 독립 검수 passed, 본문 7문단.
- PC 1280px / 모바일 390px: 대기 화면을 열어 둔 상태에서 응답을 받아 본문 갱신 확인. JavaScript 오류 및 가로 넘침 없음.
- 자료: output/reading-repair-deploy/actual-ai-response.json, actual-1280.json, actual-390.json, browser-result.json, actual-1280.png, actual-390.png.
- 공개 파일 165개가 배포 패키지와 일치: assets-verified.json.
- 테스트: chapter-output-schema, chapter-interpretation, reading-failure, reading-priority, reading-renewal, timeline84, ux-writing 및 검수 거절→후보 보완→독립 재검수 통과 회귀 검사.
- 모든 84개 챕터·모든 원국의 AI 결과를 생성한 검증은 아님. 브라우저 검증은 대상 샘플 외의 추가 AI 요청을 보류하여 불필요한 생성을 제한함.
