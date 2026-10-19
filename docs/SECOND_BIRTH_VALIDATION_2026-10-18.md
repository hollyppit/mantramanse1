# 다른 생년월일 전체 챕터 검증 — 2026-10-18

입력: 1988-11-05 14:30, 여성, 서울, 양력(합성 검증 입력).
이전 입력: 1992-06-23 01:00, 남성, 서울, 양력.
계산 결과는 경오/경금에서 갑자/갑목으로 바뀌었고, 새 입력의 원국과 근거로 실제 본문을 생성했다. 이전 입력의 본문이 재사용되지 않았는지 별도로 비교한다.

완료: 개인 풀이 73/73장의 실제 본문 7문단·독립 검수·요청 주제 일치를 확인했다. 개인 풀이 73장은 모두 이전 생년월일의 본문과 다르다. 일반 건강 안내 3장(15문단)과 실제 새로 생성된 창작 서사 8장도 확인했다. PC 1280px와 모바일 390px에서 7개 주제, 전체 84개 장의 실제 본문 표시를 통과했다. 빈 본문·대기 문구·JavaScript 오류·가로 넘침 없음. 기존 시간당 요청 한도는 유지했고 자연 갱신 후 남은 검증을 완료했다.

추가 발견 및 수정:
- 새 입력의 최초 창작 서사 요청은 review-rejected로 실패했다.
- 진단에서 긍정적인 검토 이유를 issues(실제 문제 목록)에 넣는 형식 모순을 확인했다.
- 긍정적인 평가는 issues에 넣지 않도록 지시를 명확히 하고, 모든 평가가 true인데 issues가 비어 있지 않은 모순은 본문을 임의 승인하지 않고 독립 재검수하도록 보완했다.
- 회귀 검사에서 유효한 본문을 다시 쓰지 않고 독립 재검수를 수행하는 것과 실제 부정적 검토를 계속 거절하는 것을 확인했다.
- 수정 배포: 7c063939-6c69-40de-9f8c-8e4c67ca0544. 같은 새 입력의 재생성에서 실제 8장 서사 통과.
- 최초 실패와 진단은 fiction-attempt-1.json, fiction-diagnostic-attempt-1.json으로 보존했다.

실제 응답 및 화면 기록: output/second-birth-verification/.
플랜 확보 단계의 모의 실패 응답은 실제 생성/화면 검증 성공 수에 포함하지 않는다. 실제 검증에서는 성공 응답을 모방하거나 임시 본문을 끼워 넣지 않는다.


추가 발견 2: reading_section_4 등 일부 구형 화면 ID가 주제에 연결되지 않아 일반 풀이가 별도 생성되고 실제 화면에서는 캐시를 재사용하지 못했다. 알 수 없는 구형 ID는 정확한 제목이 유일한 활성·공개 주제에만 대응할 때 연결하고, 그 경우 문체도 동일한 주제 ID를 사용하도록 수정했다. 비활성·초안·중복 제목은 허용하지 않는다. 신규 및 기존 입력에서 두 ID 경로가 같은 주제의 동일 검수 본문을 재사용하는지 운영에서 확인했다. 최초 일반 풀이 기록도 remedy06-unbound-contract-before.json으로 보존했다.

최종 배포: 8ad091e8-3ce4-4dc6-9a6c-245a0e80981c
최종 증거: output/second-birth-verification/complete-verification.json, all-73-profile-comparison.json, legacy-contract-reuse-proof.json, client-rejection-audit-final.json, final-deployment-proof.json 및 browser-w*-1280.json/browser-w*-390.json.

회귀 검사: past-story-sim(형식 모순 독립 재검수 및 실제 부정 판정 유지), editorial-contract-alias-sim(유일한 활성 제목·초안/비활성/모호함 차단), editorial-sim, chapter-interpretation-sim 통과.
