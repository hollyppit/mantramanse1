# 무빙툰 해석 조합 개편 조사·구현 보고서 — 2026-10-21

## 상태

전면 개편 전체 완료 또는 배포 승인 상태가 아니다. 기존 경로 조사와 새 검수 블록의 구조화·결정론적 선택·관리자 연결을 로컬에 구현했다. 운영 DB 읽기/쓰기, 배포, 외부 AI 호출은 실행하지 않았다. 기존 만세력 엔진·DB·RAG·관리자·영상 파일은 삭제하지 않았다. 기존 작업자의 미추적 파일은 유지했다.

## 실제 호출 경로 및 출처

- `report/v2/full-reading.js` → `POST /api/movingtoon-reading` → `functions/_reviewed-reading.js:serveReviewed/prepareReviewed` → `functions/_reviewed-library.js:composeReviewed`.
- 공개 요청은 `__READING_ADMIN_GENERATION === true`인 내부 실행 환경이 아니면 무조건 검수 라이브러리 경로로 들어간다. 요청 body의 force/mode 또는 API 키 존재로 유료 생성을 켤 수 없다.
- `prepareReviewed`: 기존 카탈로그와 챕터 계약 → 연결된 서비스 규칙·차단 문서·학파 설정 → 원문 인덱스 → `analyze` → 현재 게시 라이브러리 → 게시본에 없는 ID의 시드 문안 보충 → 결정론적 조합.
- 게시본 저장 키 `ik:blocks:chapter:library.<chapter>`가 같은 ID의 시드 문안보다 우선한다. 최신 소스의 문안 개정만으로 운영 DB가 교체되지는 않는다.
- 핵심 문장은 title, 근거 why/evidence, 본문 reality/strength/risk, 활용 reinforce, 실천 practice로 나뉜다. 게시 작성 문안, 조건별 guide, 연결 규칙의 판단·강점·위험·행동 순으로 해당 역할의 문장을 구성한다. 부족한 근거는 pending/안내로 남긴다.
- `functions/_reading-library-seed.js`, `_reading-conditional-bodies.js`, `_reading-direct-openings.js`, `_reading-narrative-openings.js`, `_reading-profile-copy.js`, `_reading-guide-copy.js`가 사전 문안 계층이다. `renderFlow`, `EverydayReading`은 표시 문구 후처리에 관여한다.
- `_interpretation-engine.js`는 일주·월주·분포·강약·통근·합충·용신 학파·운·자미 명반 등 계산 산출물을 받아 검수 규칙을 평가한다. 기존 근거 검증·출처 철회·학파별 관점과 counter_evidence를 유지한다. 새로운 명리 계산이나 문헌 근거를 임의로 만들지 않았다.
- `report/v2/past-story.js` → `/api/past-story`: 공개 생성 차단(409). 관리자 내부 생성 함수는 보존했다. 기존 창작 챕터는 검수 문안 경로의 fiction 구분과 허구 안내를 유지한다.
- 관리자 `/api/reading-library`: 인증 → 초안 저장/검사/미리보기/게시/복원. 게시에는 직접 검수와 조건문별 정례·반례, CAS가 필요하다. 관리자 UI는 `report/admin/v2-reading-library.js`.

## 이번 수정 모듈

1. `_reading-composition-policy.js` (신규): opt-in 구조화 스키마, 복합 조건 상세 수, 구체성 → 우선순위 → 저장 순서의 안정적 정렬, 동일 의미·반대 판정·기존 근거 간 상충 억제. 명리/자미/일반/창작 관점은 독립 관리.
2. `_reviewed-library.js`: 신규 메타데이터 검증·저장, 조합 선택과 근거 대체 문장의 상충 억제, 제외 이유 기록. 새 메타데이터가 없는 기존 라이브러리는 기존 정렬 유지.
3. `_reading-library-audit.js`: 조건 구체성·편집 정책·여섯 생활 요소·제외 이유 제공.
4. `_reviewed-reading.js`: 내부 선택 트레이스를 공개 응답에서 제외. 관리자 미리보기는 기존 audit을 통해 확인.
5. `report/admin/v2-reading-library.js`: 구조화 정책 JSON 편집·저장 및 미리보기의 생활 요소와 우선순위 확인.
6. `tests/reading-composition-policy-sim.cjs`: 신규 정책 단위·실제 조합기 회귀 검사.

새 필드는 관리자 검수를 거쳐 게시된 블록에만 적용된다. 시드 일괄 교체와 자동 게시는 하지 않았다. 의미 중복·모순은 관리자가 정의한 키와 기존 근거의 counter_evidence를 사용한다. 임의 문장의 의미를 AI 없이 완전히 판별한다고 주장하지 않는다.

## 관리자 사용 방법

1. 검수 풀이 관리에서 챕터를 선택하고 문안 보기 `전체`를 선택한다.
2. 대상 문안의 `생활 해석 구조·선택 정책`을 펼친다. 아래 JSON을 실제 근거·본문에 맞춰 입력한다. 조건은 기존 `추가 적용·제외 조건`에서 편집한다. 개인 풀이에는 두 가지 이상 조건과 검수 원문 연결이 필요하다.
3. 여섯 life 필드는 검수용 구조화 자료다. 실제 방문자 문장은 기존 `서비스 본문`에 자연스러운 완성 문단으로 작성한다. 여섯 필드를 자동으로 이어 붙이지 않는다. 본문과 자료의 의미 일치는 사람이 확인해야 한다.
4. 가상 사주 미리보기에서 문장과 적용 이유·충돌 제외 이유를 확인한다. 다른 성별·일주·강약·시각 미상·조건 불충족 반례도 비교한다.
5. 초안 저장 → 정례·반례 추가 → 적용·반례 검증 → 직접 검수 체크 → 게시 순서. 이전 판은 기존 이력·복원 기능을 이용한다. 게시 전 방문자는 현재 게시본을 받는다.

```json
{
  "version": 1,
  "meaningKey": "work.scope.review",
  "priority": 20,
  "perspective": "saju",
  "conflictKey": "work.expansion",
  "verdict": "limit",
  "life": {
    "judgment": "검수 근거에 따른 핵심 판정을 구체적으로 적습니다.",
    "behavior": "일상에서 관찰할 수 있는 행동 장면을 적습니다.",
    "risk": "지나쳤을 때 생기는 현실적 부담을 적습니다.",
    "sublimation": "같은 기질이 도움이 되는 업무나 활동을 적습니다.",
    "structuralDifference": "함께 성립한 조건과 예외가 해석을 바꾸는 이유를 적습니다.",
    "action": "오늘 실행할 행동과 확인할 항목을 구체적으로 적습니다."
  }
}
```

이 예시는 입력 형식이며 게시할 풀이 원고가 아니다. conflictKey가 같은 같은 관점의 블록은 verdict가 다르면 동시에 선택하지 않는다. meaningKey가 같으면 표현이 달라도 중복으로 본다. 다른 체계의 해석은 같은 결론으로 강제 합치지 않는다. 서로 다른 life 역할은 필요한 경우 서로 다른 meaningKey를 부여한다.

## 확인한 테스트

- 신규 정책: 스키마, 여섯 요소 누락, 복합 조건, 구체성/우선순위, 기존 순서 유지, 의미 중복, 반대 판정, 관점 분리, 근거 충돌, 저장 보존, 실제 조합 출력 억제 PASS.
- `reviewed-library-sim.cjs`: 4 명조 × 84 챕터, 네트워크/AI 호출 0회, 강제 플래그 차단, 초안 분리, CAS·직접 검수·정례/반례, 근거 변경/철회 PASS.
- `interpretation-engine-sim.js`: 40 명조, 출처 확인, 상충 보존, 참조, API/캐시/비용/인증/복원 PASS. 분석층의 반대 근거 보존과 표시층의 동시 출력 억제는 별개다.
- `reading-focus-eight-sim.cjs`: 실제 계산 3,640건, 53검사, 352문안, 대표 8챕터 정례/반례·시드·관리자/공개 경로 PASS, providerCalls 0.
- `admin-adjustment-comparison-sim.cjs`: 보정 전후·공개 일치·초안 분리·저장 0 PASS.
- 관리자 JS와 조합기 문법 검사, git diff --check PASS.
- `conditional-reading-library-sim.cjs`: `wrong bundle role selected` FAIL. 수정 전 HEAD 조합기/공개 경로로 별도 비교해 동일 실패 재현. 기존 테스트가 현재 bundle-focus 선택을 반영하지 못할 가능성이 있으나 이번 작업에서 정답을 바꾸지 않았다.
- `compound-reading-sim.cjs`: `weak:reality got 1` 본문 다양성 FAIL. 수정 전 비교 실행 결과는 아래 후속 기록 참조. 이 실패로 전체 문안 품질 통과를 선언하지 않는다.
- 관리자 화면의 브라우저 시각 검증은 수행하지 않았다. 테스트는 합성 명조와 규칙 정합성 검사이며 독립 명리 전문가 검수나 예측 정확도 검증이 아니다.

## 남은 필수 작업

- 운영 DB의 실제 승인 문안·조건·우선순위·변경 이력 전수 덤프와 챕터별 정밀 대조. 이번 세션은 로컬 조사이며 과거 인계의 운영 상태를 현재 조회 결과로 간주하지 않는다.
- 전체 원고를 새 여섯 요소 스키마로 재편집하고 첫 문장 후킹·주제 집중·행동 구체성·근거와의 의미 일치를 직접 검수. 기존 문구 전부가 새 스키마를 충족한다고 주장하지 않는다.
- 구형 게시본과 최신 시드 사이 비교판 준비, 게시 전 신규/구형 전체 출력 비교. 현재 같은 ID의 구형 DB 문구가 우선하는 호환 정책 유지.
- 본문 다양성 실패 원인 분석, 조건부 선택 테스트와 현재 챕터 구성의 기준 정리. 단순 기대값 완화로 품질 통과 처리하지 않을 것.
- 미승인 새 규칙 생성 금지. 월령·위치·실효 강도·통근·합충형파해·학파·운 상호작용과 자미 조합별 원문 근거 보강은 별도 검수가 필요하다.
- 전 챕터 일괄 사용자 입력 시뮬레이터·자동 품질 점수판·브라우저 검수 확대는 아직 미구현. 현재는 기존 챕터별 시뮬레이터를 이용한다.
- 관리자가 비교와 정례·반례 검수를 마친 뒤 게시하고, 배포 후 실제 서비스의 무AI 경로·출력·롤백을 확인해야 한다.
`compound-reading-sim.cjs` 후속: 수정 전 HEAD 조합기를 별도 임시 모듈로 실행한 비교에서도 `weak:reality got 1` 동일 실패를 재현했다. 이번 변경으로 새로 발생한 실패는 아니지만 전면 개편 품질 과제로 남긴다.
최신 후속 결과(2026-10-21): 전체 원고·운영 게시본 대조와 두 실패 테스트 해결은 `movingtoon-full-review-20261021.md`를 참조하세요. 아래 내용은 앞선 조사 시점의 기록이며, 테스트 실패·미완료 상태는 후속 보고서가 대체합니다.
