# 주역 64괘 통합 — Phase 1 기존 시스템 분석 및 신규 모듈 설계 (2026-10-29)

코드만 읽어 확인한 사실이다. 운영 DB·운영 환경은 조사하지 않았다(읽기 전용 접근 없음). 확인되지 않은 것은 "미확인"으로 적었다.

## 1. 확인된 구조

| 항목 | 확인 결과 |
|---|---|
| 스택 | 정적 HTML/JS(번들러 없음) + Cloudflare Pages Functions(`functions/api/*.js`, 공용 `functions/_*.js`) + Supabase(`kv` 한 테이블) |
| 사주 엔진 | 루트 `engine.js`, `shared-core.js` (브라우저·서버 공용). 무빙툰은 `readingVisualData`(일간·groups·strength·daewoon 등)를 챕터에 실어 사용 |
| DB | `supabase/schema.sql` 기준 **`public.kv` 하나**(key/value/expires_at). RLS 켜고 정책 0개 → service_role(서버)만 접근. 사용자별 테이블 없음 |
| 관리자 인증 | `Authorization: Bearer <ADMIN_PASSWORD>` 단일 비밀번호(`functions/_lib.js isAdmin`) |
| **회원 인증** | **저장소에서 확인되지 않음.** 로그인·세션·사용자 ID 코드 없음 |
| **결제·이용권** | **저장소에서 확인되지 않음.** 결제 연동·이용권 판정 코드 없음. 코드의 "유료"는 세계(주제) 카드의 `access:'paid'` 표시와, 무빙툰 `pdfUnlocked`(챕터를 일정 비율 읽으면 클라이언트에서 켜지는 값)뿐 |
| 무빙툰 | `report/v2/viewer.js`가 챕터 배열(`S.rep.chapters`)을 세계(`explore.js`)에 매핑, `reader.js`/`moving.js`가 자동 진행. 챕터 id는 `timeline_self_NN`, `timeline_wealth_NN`, `timeline_career_NN`, `timeline_love_NN` 형식 |
| 4단계 타임라인 | `report/hub/hub-timeline.js` (birth/flow/now/themes). 4단계 "인생의 주요 주제"는 `themesHtml`이 세계(`/api/worlds`) 타일로 만든다 |
| 관리자 | `report/admin/v2-*.js` 탭 구조(`navigation.js`), 서버는 `functions/api/*`에서 `isAdmin` 검사 |
| 풀이 문구 | AI 없이 사전 문안 조합(`functions/_reading-*.js`, 게시 라이브러리는 kv `ik:blocks:*`). 게시 절차는 별도 승인 |
| 기능 플래그 | 범용 플래그 시스템 없음(RAG 쪽 개별 플래그만). 주역용 플래그를 새로 정의해야 함 |
| 테스트 | `tests/*.js|cjs` 256개, `node tests/xxx.js` 개별 실행(package.json 없음) |

## 2. 지시서와 충돌하는 점 (임의로 바꾸지 않고 결정을 요청)

1. **회원·결제 시스템이 없다.** "기존 회원 인증·결제 재사용", "회원 홈/마이페이지", "환불·만료 처리", "RLS로 사용자별 기록 분리"는 전제가 될 시스템이 이 저장소에 없다. 대안:
   - A. 인증·결제를 별도 프로젝트로 먼저 만들고 주역은 그 뒤에 붙인다(주역 모듈은 `entitlement` 판정 인터페이스만 정의).
   - B. 결제/회원 시스템이 다른 저장소·서비스에 있다면 그 위치와 API를 알려 준다.
   - C. 1차는 "무빙툰 안에서 이용 + 기기 저장" 범위로 만들고, 유료 권한 판정은 어댑터 자리(항상 거부 또는 관리자 토큰)로 둔다. **클라이언트 값(`pdfUnlocked` 등)으로는 유료 권한을 판정하지 않는다**(지시서 7-2).
2. **"회원 홈"이 없다.** 허브(`#/my`, MY 운명 홈)는 있으나 로그인된 회원 개념이 없다. 위 1번이 정해져야 위치가 정해진다.
3. **지시서의 "4단계 + 종합풀이/재물/커리어/인연"**: 코드상 4단계는 허브 타임라인, 네 가지 풀이는 챕터 id 접두(`self/wealth/career/love`)와 세계(w1~w6)에 대응한다. 삽입 위치는 챕터 id 기준으로 잡을 수 있다(장면 id는 챕터 안에서 `sceneId`로 존재).
4. **원문·번역 데이터**: 괘사·효사 한문 원문은 퍼블릭 도메인이지만, 현대어 번역·해설은 저작권이 있는 자료가 많다. 출처 확인 없이 저장하지 않는다. 구조 데이터(괘 번호·이름·상하괘·효 음양)는 검증 가능하므로 먼저 구축하고, 문장 데이터는 `reviewStatus: draft`로만 넣어 게시를 차단한다.
5. **지시서 본문이 마지막 문장에서 끊겼다**("만트라 만세력은 사주와 주역의 계산·해석 기반을…"). 이어질 내용이 있다면 알려 달라.

## 3. 신규 모듈 설계 (기존 코드 수정 최소)

원칙: 사주 엔진(`engine.js`, `shared-core.js`)은 읽기만 하고 수정하지 않는다. 모든 신규 파일은 `iching` 이름공간.

```
report/iching/engine.js        # 순수 함수(브라우저·서버 공용): 동전 점법, 본괘·변효·변괘 (AI·네트워크·저장 없음)
report/iching/hexagrams.js     # 64괘 구조 데이터(번호·한글/한자명·상하괘·효 음양). 문장 데이터는 별도
report/iching/texts/*.js       # 괘사·효사·해석 문장(상태 draft/reviewed, 출처 필드 필수). 미검수는 게시 차단
report/iching/compose.js       # 질문 분야 × 괘 × 변효 → 사전 문구 조합(결정론), 사주 연계 층은 별도 함수
report/iching/saju-link.js     # engine 결과를 읽기 전용으로 받아 "참고 해석" 생성. 괘를 사주에서 도출하지 않음
functions/api/iching.js        # 점괘 기록 저장·조회(권한 어댑터 경유). 플래그 꺼져 있으면 404
functions/_iching-entitlement.js # 이용 권한 판정 인터페이스(결정 1번 결과에 따라 구현)
tests/iching-engine-sim.cjs    # 지시서 3-2의 테스트 전체
```

- **계산**: 세 동전(각 2/3) 합 6/7/8/9 → 아래에서 위로 6효. 난수는 서버/클라이언트 `crypto.getRandomValues`. 같은 6효 값이면 항상 같은 결과(재현성 테스트용으로 동전 값을 주입 가능).
- **괘 번호**: 하괘 3효·상괘 3효 → 문왕괘서 번호표(64칸)로 조회. 번호표는 데이터와 로직을 분리하고, 64개 패턴 유일성·8괘 매핑·변괘 반전 테스트로 검증.
- **복수 변효**: 전통 규칙이 여럿이다(주희 『주역본의』 변효 개수별 규칙: 0=본괘 괘사, 1=그 효사, 2=두 효사 중 위쪽 중심, 3=본괘·변괘 괘사, 4=변괘의 불변효 중 아래, 5=불변효 하나, 6=건·곤은 용구·용육, 나머지는 변괘 괘사). 규칙 id·출처를 데이터에 남기고 관리자에서 버전 선택. 기본값은 본의 규칙으로 제안하며 **사용자 확인 후 확정**.
- **저장**: 지금 DB는 kv뿐이다. 선택지는 (a) kv에 `iching:session:<id>` 키로 저장(인증 없이는 소유자 분리 불가) 또는 (b) 인증이 정해진 뒤 `iching_*` 전용 테이블+RLS 마이그레이션. 1단계는 기기 저장(localStorage)+서버 저장 없음을 권장.
- **기능 플래그**: kv `iching:flags`(기본 모두 false) + 클라이언트는 서버 응답으로만 켠다.
- **무빙툰 삽입**: `viewer.js` 챕터 진행 훅에서 지정한 `chapterId/sceneId` 뒤에 선택 장면을 끼우고, 시작 시 `S.mv.pause()`, 종료 시 같은 위치에서 재개(기존 `showHome/resumeReader` 패턴 재사용). 관리자 설정 전에는 플래그 꺼짐.
- **관리자**: `report/admin/v2-iching.js` 탭 추가(64괘 목록·6효 편집·검수 상태·삽입 위치). 서버는 `isAdmin` 사용.
- **통계**: 이벤트는 id·분야·완료 여부만, 질문 원문은 전송하지 않는다.

## 4. 영향도

- 기존 파일 수정이 필요한 곳은 (1) `viewer.js` 삽입 훅 1곳, (2) `report/v2/index.html` 스크립트 태그, (3) 관리자 `navigation.js` 탭 1개 — Phase 5·4에서만. Phase 2~3은 신규 파일만 추가하므로 기존 기능 영향 0.
- 사주 계산 회귀: 기존 `tests/engine-baseline-sim.js` 등을 각 Phase 끝에 실행해 비교한다.

## 5. 다음 단계 제안

- **Phase 2(바로 시작 가능, 기존 영향 0)**: `report/iching/engine.js` + `hexagrams.js` 구조 데이터 + `tests/iching-engine-sim.cjs`. 문장 데이터 없음.
- Phase 3 이후는 **결정 1(회원·결제)·복수 변효 규칙·문장 자료의 출처** 확정 후 진행.

## 6. 추가 지시 반영 — 해석 출력 8개 섹션과 결과 데이터 구조

출력 UI와 해석 로직을 분리한다. 엔진은 아래 구조의 JSON 하나만 반환하고, 무빙툰·회원 홈·PDF는 같은 JSON을 각자 렌더링한다. 구현 위치는 `report/iching/result-schema.js`(런타임 검증, 의존성 없는 자체 검증기 — 이 저장소에 번들러·패키지가 없으므로 Ajv 대신 사용)와 `report/iching/compose.js`.

### 6-1. 최상위 필드

| 필드 | 필수 | 내용 |
|---|---|---|
| `result_id`, `generated_at`, `question`, `question_category` | 필수 | 질문 원문은 기록용(분석 도구로 전송 안 함). 분야는 사용자가 선택(`wealth/career/love/general` …) |
| `hexagram` | 필수 | 번호·한글/한자명·상괘/하괘·6효 값(6/7/8/9, 아래→위)·키워드 3개·괘사 원문·현대어 |
| `changing_lines` | 필수(빈 배열 가능) | 위치(1~6)·효사 원문·현대어·`rule_id` |
| `transformed_hexagram` | 변효 0개면 `null` | 번호·이름·본괘와의 관계 |
| `interpretation_rule_version`, `content_version` | 필수 | 복수 변효 규칙 id·콘텐츠 버전 |
| `conclusion`(S01) | 필수 | `direction`(실행 검토/준비 우선/현상 유지/재검토/신중한 접근 중 하나)·`summary`·`conditions[]`. 직접 답할 수 없으면 `direction=null`과 `conditions`만 |
| `hexagram_explanation`(S02) | 필수 | 괘 일반 설명(간결)·질문 연결 의미. 원문/현대어는 별도 필드 |
| `situation_analysis`(S03) | 필수 | `issue`·`favorable[]`·`unfavorable[]`·`judgment_errors[]`·`improve_conditions[]` |
| `transformation_analysis`(S04) | 필수 | 변효 개수 0 → `status:'none'`(본괘 중심 문구), 1 → 해당 효 중심, 2 이상 → `rule_id` 적용 결과. "반드시 일어날 일" 표현 금지 |
| `saju_cross_analysis`(S05) | 사주 없으면 `null` 또는 `{status:'no-saju'}` | `luck_context`(대운·세운)·`category_traits`·`common[]`·`divergent[]`·`reference_judgment`. 값은 기존 엔진 결과를 읽기만 함 |
| `scenarios`(S06) | 필수 | `favorable{conditions[],actions[]}`·`unfavorable{gaps[],repeats[]}`. 확률·확정 표현 금지 |
| `action_plan`(S07) | 필수 | `do[3]`·`avoid[2]`·`check_before[]`·`review_criteria[]` |
| `final_message`(S08) | 필수 | 한 문장. 괘 상징 + 질문 연결 |

각 섹션 항목에는 `text`(본문)와 `refs[]`(`line_id`/`rule_id`/`source_id`)를 두고, 문구 하나하나가 어느 검수 문구에서 왔는지 추적한다.

### 6-2. 생성 우선순위 (지시서 3번)

계산값(본괘·변효·변괘) → 선택한 복수 변효 규칙 → **검수 완료(`reviewed`)** 괘사·효사·현대어 → 분야별 해석 → 사주 결과 → 사전 문구 조합 → 스키마 검증. 어느 단계든 `reviewed` 문구가 없으면 문장을 채우지 않고 결과에 `missing[]`(섹션·괘·효·분야)을 남겨 관리자 화면에 표시하며, 사용자 화면은 해당 섹션을 숨기거나 "준비 중"으로 표시한다. AI는 계산에도 문구 생성에도 쓰지 않는다(초안 생성은 관리자 검수 전용).

### 6-3. 자동 품질 검사 (`tests/iching-quality-sim.cjs`, 관리자 미리보기에서도 실행)

1. 문장 중복: 섹션 간 정규화한 문장·n-gram 유사도 임계 초과 검출
2. 변효 위치·본괘/변괘 혼동: 결과의 번호·위치가 계산값과 같은지 대조
3. 사주 사실 대조: S05에 쓴 일간·대운·세운 값이 입력 `sd`와 일치하는지
4. 금지 패턴: 날짜·퍼센트·수익률·"반드시/확실히" 등 확정 표현, 지시서 지양 표현 목록
5. 모든 사용자 동일 결론 방지: 같은 괘라도 분야·변효·사주가 다르면 S01/S03/S07 문구가 달라지는지(조합 표본 검사)
6. 용어·추상도: 사전 정의한 전문 용어 목록 초과 여부 경고
7. 의미 일관성(괘사 충돌, 질문 무관)은 규칙으로 완전 판정할 수 없다. **대표 괘×분야 조합 샘플을 관리자에게 제시해 사람이 검수**하고, 자동 검사는 보조로만 쓴다.

### 6-4. 화면 (8단계 순차 표시)

결론 카드 → 본괘 6효 시각화 → 상황 → 변효·변괘 애니메이션 → 사주 교차 → 시나리오 2열 비교 → 행동 처방 → 최종 한마디. 원문·이론은 `<details>` 접기. 모바일 우선 단일 열. 무빙툰 안에서는 시작 시 자동 재생을 멈추고 종료 후 같은 위치로 복귀. 렌더러는 JSON만 입력으로 받는 순수 함수라 회원 홈·PDF에서 재사용한다.

### 6-5. 관리자

섹션별 문구는 "괘 × 분야 × 섹션" 단위로 편집, 상태는 `draft → reviewed → published`, 변경 이력·롤백, 누락 현황 표, 샘플 점괘 미리보기(실제 괘+분야 조합).

### 6-6. 이 범위에서 새로 생기는 결정 사항

- 384효·64괘 전부에 대해 **분야 4종(종합/재물/커리어/인연) × 섹션별 검수 문구**가 필요하다. 분량이 매우 커서 작성 주체(관리자 직접 / 초안 자동 생성 후 검수)와 우선 완성할 괘 범위를 정해야 한다. 문구가 없는 괘는 위 규칙대로 게시되지 않는다.
- `direction` 5종을 고르는 규칙(괘·변효·분야별 매핑표를 검수 데이터로 둘지)은 콘텐츠 설계가 필요하다. 자의적 점수식으로 만들지 않는다.
