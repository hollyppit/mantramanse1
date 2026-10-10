# 풀이 DB 계층화 설계안 (NEXT_PLAN 5-A)

작성 기준: `main` (a93c829), 코드 변경 없음. 아래 수치는 이 저장소의 코드를 실제로 불러와 측정한 값이며, 측정 스크립트는 문서 끝 §11 에 방법만 적었다.
상태: **설계안 — D1·D5 확정, 단계 0·1 구현 완료(아래 §13). 단계 2 이후는 미착수.** 확인하지 못한 항목은 "확인 못함"으로 표시했다(§12).

## 0. 결론 요약

1. 해석 모듈은 **678개**(content 157 + content-pro 35 + content-pro2 255 + topics 231)이고, 그 중 **312개는 `content-v3.js` 가 부팅 시 문장을 덮어쓴다**. 모듈 한 객체에 조건·우선순위·문장·이미지 태그·extra 가 함께 있다.
2. 근거 계층은 **없다**. 출처·승인자·버전 필드가 0개이고, 문장 안에 고전 서명(적천수·자평진전 등)이 등장하는 횟수도 0회다. "근거"로 쓸 수 있는 것은 *조건 일치 내역*(`why`)뿐이며 이는 "어떤 계산값 때문에 골랐나"이지 "왜 이 문장이 그렇게 말하나"가 아니다.
3. **모듈 DB 밖에도 풀이 문장 저장소가 3곳** 있다(`StoryComposer.TOPICS`, `Remedy.LIBRARY` 129개, `intro-text`·`ilju-data`·`deep*.js`·`verdict.js`). 무빙툰 본문의 주력(`life-doc.js`)은 `StoryComposer` 쪽이며, 모듈 DB 는 기존 챕터(c01~c20)·PDF·주제 카드를 먹인다. 계층화는 모듈 DB 만 하면 절반이다.
4. 추가 필드는 **전부 선택 항목**으로 얹고(`rule`·`evidence`·`narrative`·`status`), 기존 11개 필드는 이름·의미 모두 보존한다. 선택은 이미 `Rules.rank` 한 곳을 지나므로 `status` 필터도 한 곳에서 걸 수 있다.
5. 가장 큰 위험은 **서버 저장 화이트리스트**다. `functions/api/report-content.js` 의 `cleanModule` 이 모르는 필드를 버리므로 필드를 추가하지 않으면 관리자 저장 때 새 필드가 사라진다(§4.3). 반대로 이 한 곳이 호환성 검문소이기도 하다.
6. 기존 678개를 하루아침에 "근거 부족"으로 돌리면 서비스가 비므로, **전량을 `legacy` 로 이관(허용)하고 점검 탭에서만 경고**하는 3단계 정책을 제안한다(§7).

## 1. 조사 범위

읽은 코드: `report/v2/{content,content-pro,content-pro2,topics,content-v3,rules,compose,story-composer,consistency,timeline,quality,remedy}.js`, `report/admin/v2-content.js`, `functions/api/report-content.js`, 기존 테스트(`content-v3-sim`, `life-doc-sim`, `engine-baseline-sim`).
실행으로 확인: 위 파일을 `vm` 으로 `index.html` 과 같은 순서로 불러와 모듈 배열을 측정, 무작위 400개 사주로 `Compose.build` 를 돌려 사용 빈도를 측정.

## 2. 현재 문장 저장소 지도

| 저장소 | 규모(실측) | 위치 | 관리자 편집 | 무빙툰 본문(life-doc) | 기존 챕터·PDF |
|---|---|---|---|---|---|
| 해석 모듈 DB | 678개 · 58개 카테고리 | `content*.js`, `topics.js` (+`content-v3.js` 덮어쓰기) | 가능("해석 모듈", `v2:content`) | 간접(주제·c01~c20 이어붙임) | 주력 |
| StoryComposer.TOPICS | 6주제 × 십성군 5 = **30칸** (돈·직업·연애·결혼·관계·나) | `story-composer.js` | **불가(코드 전용)** | **주력** | — |
| 개운법 라이브러리 | 129개 (action 67·place 20·people 13·environment 11·growth 9·timing 9) | `remedy.js` `LIBRARY` | 가능(`remedies`) | 성역 세계 | 챕터 |
| 생성 문장 데이터 | `intro-text.js`(일간·지지·십성 표) · `ilju-data.js` · `deep*.js` 5개(합 약 190KB) · `verdict.js` | 코드 | 불가 | 일부 | 일부 |

의미: "풀이 DB 계층화"의 대상 범위를 정해야 한다. 이 문서는 **1단계 대상 = 모듈 DB(678)**, **2단계 대상 = StoryComposer.TOPICS·Remedy**, 생성 문장 데이터는 제외(조합식 템플릿이라 모듈 스키마에 맞지 않음, §10 결정 사항)로 제안한다.

## 3. 모듈 스키마 실측

### 3.1 필드 (678개 전수)

| 필드 | 타입 | 존재 | 비고 |
|---|---|---|---|
| `id` | string | 678 | 중복 id 0. 접두: `pro2_` 255 · `tp_` 231 · `pro_` 35 · `pastlife_` 15 · `plan_` 12 · `elements_` 11 · `talent_`/`shadow_` 각 11 … |
| `category` | string | 678 | 58종. 일반 20종 + 챕터별 주제 `t_cNN_*` 38종(231개) |
| `conditions` | `{키:[허용값]}` | 678 | 비어 있으면 "상관없음" |
| `priority` | number | 678 | 아래 분포 |
| `headline` / `summary` / `detail` | string | 678 | `detail` 이 빈 문자열인 모듈 **256개** |
| `keywords` / `imageTags` / `actionTags` | string[] | 678 | 값이 있는 모듈: 282 / 405 / 184 |
| `extra` | object\|null | 678 | 객체가 있는 모듈 78개(키 약 40종: env·caution·archetype·season·opportunity 등) |
| `enabled` | boolean | 678 | 전부 true (기본 시드에 false 없음) |
| `layer` | string | **521** | 없으면 157 (아래) |
| `v3` | true | **312** | `content-v3.js` 가 문장을 덮어쓴 표시 |

`layer` 값: `topic` 231 · `month` 120 · `stem` 100 · `pillar` 60 · `groupHigh` 5 · `groupZero` 5. 코드에서 의미를 갖는 것은 `groupHigh`/`groupZero` 뿐(`compose.js:61` 총평 후보 추출). 나머지는 분류 표지다.
`choice` 는 `compose.js` `view()` 가 읽지만 **현재 시드에 값이 있는 모듈은 0개**(스키마에만 존재).

필드 조합은 4종뿐이다(layer 유무 × v3 유무: 341 / 180 / 132 / 25).

### 3.2 조건 키 사용

모듈당 조건 수: 0개 **63**(폴백) · 1개 **484** · 2개 **131**. 최대 2개.

| 조건 키 | 모듈 수 | 키 | 모듈 수 |
|---|---|---|---|
| dayMasterStem | 220 | seunSeason | 42 |
| dominantGroup | 129 | daewoonSeason | 36 |
| monthBranch | 120 | strength | 19 |
| dayMasterEl | 69 | monthSeason | 12 |
| dayPillar | 60 | yongEl | 10 |
| | | dominantEl·lackEl·groupHigh·groupZero·weakestGroup | 각 5 |
| | | project 3 · star 1 | |

`rules.js` 의 `FIELDS` 는 23개 조건 키를 정의하지만, 서버 `COND_KEYS` 는 19개만 허용한다(`monthBranch`·`dayBranch`·`groupHigh`·`groupZero` 가 서버 목록에 **없다**). 즉 관리자가 이 4개 조건을 저장하면 서버에서 지워진다 — 기본 시드는 코드에서 오기 때문에 지금은 드러나지 않을 뿐이다. (§4.3 위험 R1)

### 3.3 우선순위 분포

60 → 289 · 80 → 180 · 50 → 67 · 1 → 58 · 40 → 37 · 70 → 27 · 30 → 8 · 20 → 5 · 65 → 3 · 95 → 3 · 55 → 1.
priority 1 의 58개는 대부분 조건 없는 폴백(63개 중)이다. 선택 점수는 `구체성 × 100 + priority` 이므로 priority 는 동점 해소 수단이다.

### 3.4 문장 길이 (글자 수)

| | 최소 | 중앙 | 90% | 최대 |
|---|---|---|---|---|
| headline | 6 | 21 | 32 | 38 |
| summary | 16 | 67 | 109 | 154 |
| detail | 0 | 40 | 82 | 139 |

`{자리표시자}` 가 들어간 모듈 30개(문장 치환 `Rules.tpl`).

### 3.5 사용 실측 (무작위 400개 사주, 기본 프로젝트 `full`)

- 한 번이라도 뽑힌 모듈 **617개**, 한 번도 안 뽑힌 모듈 **61개**(38 topic · 19 layer 없음 · month 3 · groupZero 1).
- 안 뽑힌 카테고리별: identity 6 · personality 4 · remedy 4 · pastLife 3 · talent/relationship/compatibility/currentCycle/sewoon/actionPlan 각 1.
- 안 뽑힌 예: 카테고리 폴백(`identity_fallback`…)은 정상(다른 모듈이 항상 이김). 그러나 `identity_el_목·화·토` 처럼 **v3 에서 문장을 새로 쓴 모듈이 400개 사주에서 0회** 선택된 사례가 있다. 원인(더 구체적인 `pro2_iju_*` 가 항상 이김 등)은 **확인 못함**.
- 같은 카테고리·같은 조건이 겹치는 모듈 쌍은 **0**(조건 충돌 없음). 단정 표현(반드시·무조건·확정·100%·틀림없) 포함 모듈 0.

표본이 400개라 "사실상 도달 불가"가 아니라 "표본에서 안 나옴"이다. 근거 보강 우선순위나 정리 대상으로 쓸 때는 1,000개 이상·조건 조합 열거로 재확인해야 한다.

## 4. 병합·저장 규칙 (현재 동작)

### 4.1 우선순위 체인

```
코드 시드(content → content-pro → content-pro2 → topics, 같은 배열에 push)
   → content-v3.js 가 id 로 찾아 headline/summary/detail 을 제자리 덮어쓰고 v3=true
   → Compose.library(saved): id 기준 Object.assign({}, 시드, 저장본)  ← 저장본이 이김
   → Rules.rank/pick: enabled===false 제외 → conditions 평가 → score 정렬 → id·headline 중복 제거
```

- 저장본은 **필드 단위 병합**이다. 저장본에 `headline` 만 있으면 나머지는 시드 값이 남는다(`Object.assign`). 그러므로 `layer`·`v3` 같이 서버가 버린 필드는 **기존 id 에 대해서는** 시드에서 살아남는다. 관리자가 *새로 만든* 모듈만 이 필드들을 잃는다.
- 관리자 화면(`v2-content.js` `mix`)도 같은 병합을 쓰고, `ST.saved` 에는 서버가 정리한 값이 들어온다.
- `version`: 저장 때마다 `c<ts>` 로 바뀌어 리포트 캐시 키가 갱신된다. 새 필드를 넣을 때도 이 규칙을 그대로 쓴다.

### 4.2 선택 게이트는 한 곳

모듈을 고르는 호출은 `Rules.pick`/`Rules.rank` 로 모인다(`compose.js:61,62,70,83,89`, `topics.js:285`). `rank` 안의 `if (m.enabled === false) return;` 가 유일한 활성 검사다. → `status` 정책은 이 줄 옆에 한 줄로 걸 수 있다.
관리자 "조합 테스트"(`condTest`)·"서비스 점검"(`quality.js`)은 이 경로를 그대로 쓰므로 정책이 점검 화면에도 자동 반영된다. `functions/` 쪽에서 `lib.modules` 를 직접 읽는 곳은 **확인 못함**(`_lifeai.js`·`_reading-answer.js` 는 문장 템플릿 입력을 받는 구조로 추정, 미확인).

### 4.3 서버 화이트리스트(`cleanModule`) — 위험 R1

저장 시 보존되는 필드: `id, category, conditions, priority, headline(≤120), summary(≤600), detail(≤2000), keywords, imageTags, actionTags, extra, enabled`.
버려지는 필드: `layer`, `v3`, `choice`, 그리고 앞으로 추가할 모든 필드.
한도: 모듈 3000개 · 저장본 전체 3MB. 현재 시드 모듈 JSON 은 약 400KB 이고 저장본은 *수정·추가한 모듈만* 들어가므로 여유가 있다. `evidence`(출처 목록)를 붙여도 모듈당 수백 바이트 수준이라 3MB 안에 충분히 들어가나, 678개 전부를 저장본으로 이관하면 한도에 가까워질 수 있어 **이관 시 저장본이 아니라 시드(코드)에 두는 방식을 우선** 제안한다(§8 단계 2).

## 5. 6계층 대응표

| 계층 | 지시서 의미 | 현재 위치(확인) | 갭 | 제안 |
|---|---|---|---|---|
| ① 계산 | 만세력 수치·판정 | `engine.js`, `saju-data.js`(`SajuData.build`) | 없음. 변경 금지 | 그대로. 모듈은 계산을 하지 않고 `facts` 만 읽음(`Rules.flatten`) |
| ② 규칙 | 어떤 조건에서 어떤 문장 | 모듈 `conditions`·`priority`, `Rules.evaluate/rank`, 챕터별 `moduleCategories` | 표현력 부족: 허용값 OR, 키 간 AND 만. **예외·제외·선행 조건 불가**. 서버가 일부 키를 버림(R1) | `rule` 객체 신설 — 1단계는 `conditions` 를 *그대로 참조*, 예외(`except`)는 3단계 |
| ③ 근거 | 왜 이 해석인가(출처) | **없음**. 조건 일치 내역 `why` 만 있음(화면용, 비저장). 고전 서명 0회 | 출처·버전·승인자 부재. 해석 근거 vs 계산 근거 구분 없음 | `evidence` 신설(§6.2) |
| ④ 해석 | 현실 언어 풀이 | 모듈 `headline/summary/detail`(+`extra`), `StoryComposer.TOPICS` | 한 객체에 ⑤와 혼재 | 필드는 그대로 두고 *의미*를 해석 계층으로 정의 |
| ⑤ 서사 | 비유·톤·도입 | `content-v3.js`(문체 일괄 재작성), `story-composer.js`, `intro-text.js`, 챕터 `introText`, `topics.js` 해요체 | v3 가 해석 문장 자체를 덮어써서 **원문과 서사 문장 분리 불가**. 톤 정의가 파일 머리 주석에만 있음 | `narrative`(비유·도입 문장) 신설 — 해석 문장은 건드리지 않음(§6.3) |
| ⑥ 표현 | 이미지·연출·차트 | `imageTags`·`actionTags`, `scenes.js`, `cinema*.js`, `charts.js`, `media.js` | 모듈 객체에 `imageTags` 가 붙어 있어 표현이 해석에 섞임 | 이동하지 않음(호환). `presentation` 별칭만 문서화 |

## 6. 추가 필드 제안 (기존 필드 보존)

모든 신규 필드는 **없어도 동작**한다(없으면 `status: 'legacy'` 로 간주). 이름은 camelCase, 값 범위는 서버에서 검증한다.

### 6.1 `status` — 노출 가능 여부

```
status: 'approved' | 'legacy' | 'draft' | 'needs_evidence' | 'retired'
```

| 값 | 의미 | 사용자 노출 |
|---|---|---|
| `approved` | 근거(`evidence`)가 있고 승인됨 | 가능 |
| `legacy` | 이관 시 기본값. 근거 미검증 | 가능(점검 탭에서 "미검증"으로 집계) |
| `draft` | 초안(자료 업로드 분석 결과 등, NEXT_PLAN 5-B) | **불가** |
| `needs_evidence` | 문장은 있으나 근거 부족 판정 | 정책에 따름(§7) |
| `retired` | 폐기(삭제하지 않음) | 불가 |

`enabled` 는 유지한다. 유효 노출 = `enabled !== false && status ∉ {draft, retired}` (+ 정책이 `needs_evidence` 를 막는 경우). 두 필드가 어긋나면 **더 막는 쪽**이 이긴다.

### 6.2 `evidence` — 근거

```
evidence: {
  basis: 'engine' | 'tradition' | 'editorial' | 'legacy',
  refs:  [{ id, kind: 'classic'|'modern'|'internal', title, locator, note }],   // ≤ 5
  checkedBy: string,   // 관리자 표시 이름(개인정보 아님)
  checkedAt: 'YYYY-MM-DD',
  rev: number          // 근거 개정 번호. 문장이 바뀌면 올림
}
```

- `engine` : 문장이 엔진 수치를 서술할 뿐인 경우(예: 대운 계절 문장). `rule.when` 이 곧 근거.
- `tradition` : 전통 이론 문헌에 근거. `refs` 필수.
- `editorial` : 서비스 편집 원칙(현실 언어 변환·행동 제안). 문헌 근거 없음을 *명시*한다.
- `legacy` : 이관 시 기본값.
- `refs[].id` 는 별도 **출처 목록**(신규 `v2:sources`, 모듈과 분리)의 키를 가리킨다 — 같은 문헌을 678번 복사하지 않기 위해서다. 출처 목록 자체의 내용(어떤 문헌을 쓸지)은 **사용자 결정 사항**이며 이 문서는 정하지 않는다.

### 6.3 `narrative` — 서사

```
narrative: { voice: 'haeyo'|'hapsyo'|'novel', hook?: string, metaphor?: string }
```
`hook`·`metaphor` 는 도입·비유 한 문장. 해석 문장(`headline/summary/detail`)은 이 필드로 옮기지 않는다 — 옮기는 순간 출력이 바뀌기 때문이다. `voice` 는 현재 파일별로 암묵적인 톤(`content-pro` 소설체, `topics` 해요체, `content-v3` 합쇼체)을 명시화하는 용도이며 렌더링에는 쓰지 않는다.

### 6.4 `rule` — 규칙

```
rule: { when?: <conditions 와 같은 모양>, except?: { 키: [값] }, note?: string }
```
- 1단계: `rule.when` 을 **쓰지 않는다**(conditions 가 유일한 원천). `rule.note`(관리자 메모)만 허용.
- 3단계: `except` 도입 시 `Rules.evaluate` 변경이 필요하므로 별도 비교 테스트와 함께 진행(§8).

## 7. "근거 부족" 처리 정책

원칙: **근거 없는 문장이 확정 문장처럼 나가지 않게 한다.** 다만 현재 678개 전부가 근거 미검증이므로 즉시 차단하면 챕터가 빈다(폴백 63개로 대체되지만 품질이 급락).

정책 모드(관리자 설정 `v2:content.evidencePolicy`, 기본 `off`):

| 모드 | 동작 | 사용자 화면 변화 |
|---|---|---|
| `off` | 필터 없음. `status` 는 기록만 | 없음 (기본·롤백 상태) |
| `warn` | 노출은 그대로. 서비스 점검 탭에 미검증·needs_evidence 목록·카테고리별 비율 표시 | 없음 |
| `hide_unverified` | `draft`·`retired`·`needs_evidence` 제외. `legacy` 는 노출 | 해당 모듈만 사라지고 다음 후보·폴백으로 대체 |
| `strict` | `approved` 만 노출 | 대규모 변화 — 카테고리별 `approved` 비율이 충분할 때만 |

보조 규칙:
1. **폴백 보장**: 어떤 카테고리도 필터 후 후보가 0이 되면 안 된다. 현재 58개 카테고리 모두에 조건 없는 모듈이 있음을 확인했다(§3). 정책 적용 전 "폴백도 막히는가"를 점검 탭이 사전 계산한다.
2. **문체 보호**: `needs_evidence` 가 선택되는 경우(`warn` 모드)에는 화면에 "참고용 해석" 표시를 붙이는 방안은 사용자 화면 변경이므로 **별도 결정**(§10 D3).
3. **AI 합성 경계**: `_lifeai.js`·`_movingtoon-reading.js` 에 넘기는 입력에는 `approved`/`legacy` 모듈만 포함(AI 가 근거 없는 문장을 재서술해 확정 문장으로 만드는 경로 차단). 해당 서버 코드의 입력 구성 위치는 **확인 못함** — 구현 전 확인 필요.
4. **자료 업로드(5-B) 연결**: 분석 결과는 항상 `draft` 로 들어가고 승인 시 `approved` + `evidence` 가 채워진다. `draft` 는 `Rules.rank` 에서 어떤 정책 모드에서도 제외된다.

### 서비스 점검 탭 연동

`quality.js` 에 읽기 전용 점검 항목 추가(저장·수정 없음):
- 상태별 모듈 수, 카테고리별 `approved` 비율
- `enabled` 와 `status` 불일치 목록
- 조건 키가 서버 허용 목록 밖인 모듈(R1)
- 400개 사주 표본에서 한 번도 안 뽑힌 모듈 목록(§3.5)
- 문장 변경 후 `evidence.rev` 가 안 올라간 모듈(문장 해시 비교, §9)

## 8. 마이그레이션 단계와 비교 테스트

원칙: 각 단계는 **출력 바이트가 같아야** 통과한다. 엔진은 건드리지 않는다.

| 단계 | 변경 | 출력 변화 | 롤백 |
|---|---|---|---|
| 0 | **기준선 먼저**: 모듈 조립 결과 스냅샷 `tests/content-db-baseline.txt` 생성 | 없음 | 파일 삭제 |
| 1 | 서버 `cleanModule` 이 신규 필드와 누락된 4개 조건 키(`monthBranch`·`dayBranch`·`groupHigh`·`groupZero`)·`layer`·`choice` 를 보존(**값 범위 검증 포함**) | 없음(필드가 있어도 읽는 코드 없음) | 서버 이전 버전 재배포. 저장본의 신규 필드는 무시됨 |
| 2 | 시드에 `status:'legacy'`·`evidence:{basis:'legacy'}` 를 일괄 부여(스크립트가 코드 파일을 직접 수정하지 않고 **`content-meta.js` 신규 파일**이 id→메타를 부착) | 없음 | `content-meta.js` 로드 제거 |
| 3 | `Rules.rank` 에 정책 필터 1줄(기본 `off`) + `Compose.view` 가 신규 필드를 **출력에 넣지 않음** | 없음(`off`) | 필터 줄 제거 |
| 4 | 점검 탭 항목(§7), 관리자 모듈 편집기에 status·evidence 입력란 | 없음 | UI 파일 되돌림 |
| 5 | 승인 작업이 쌓인 카테고리부터 정책 `hide_unverified` 시험 적용 | **있음(의도)** — 별도 비교·승인 | 정책 `off` |
| 6 | `except` 도입(`Rules.evaluate` 확장) | 별도 비교 테스트 필수 | 엔진 규칙 되돌림 |

### 8.1 비교 테스트 방식 (`tests/content-db-sim.js`, 신규 제안)

- 입력: 시드 고정 난수(`content-v3-sim.js` 와 같은 LCG)로 **120개 이상** 사주(성별 번갈아, 시간 모름 포함) × 프로젝트 `full`(실측에 사용) 외에 `R.Chapters` 가 제공하는 프로젝트 전부(목록은 구현 시 확인) × `now = Date.UTC(2026,9,6)` 고정. 400개 규모도 2초대에 끝난다(측정).
- 출력: 각 사주의 `Compose.build()` 결과에서 **모듈 id 목록·`headline`·`interpretation`·`meaning`·`details`·`topics`** 를 `Rules.stable()` 로 직렬화해 사주별 FNV 해시 한 줄씩 → `engine-baseline.txt` 와 같은 텍스트 형식, 기준선과 문자열 비교.
- 신규 필드 누출 검사: 결과 JSON 문자열에 `evidence`·`status`·`narrative`·`rule` 키가 나타나지 않아야 한다(단계 3 의 `view()` 규약).
- **저장본 시나리오**: 합성 저장본(문장 수정 1·모듈 비활성 1·신규 모듈 1·`status:'draft'` 1)을 `Compose.library(saved)` 에 넣고 (a) 단계 전 코드와 (b) 단계 후 코드에서 같은 결과인지 비교. 병합 규칙(`Object.assign`) 의 회귀를 잡는다.
- 서버 정리 시나리오: `cleanModule` 의 입력→출력을 신규 필드 포함/미포함 쌍으로 단위 비교(함수가 `export` 되어 있지 않으면 `functions/api/report-content.js` 를 `vm` 으로 읽어 추출 — 구현 시 확인).
- 재사용: `content-v3-sim.js` 의 60명 조립·금지어 검사, `life-doc-sim.js` 의 무빙툰 조립 검사는 그대로 병행 실행. 엔진 기준선(`engine-baseline-sim.js`)도 함께 통과해야 한다.
- 단계 5 는 의도된 변화이므로 "기준선 일치"가 아니라 *변화 목록 리뷰*(어느 모듈이 어느 폴백으로 대체됐는지)를 산출물로 한다.

### 8.2 첫 이관 스크립트가 지켜야 할 것

1. 입력 id 집합과 출력 id 집합이 같음(추가·삭제 0).
2. 기존 12개 필드(`id`~`enabled`)의 `JSON.stringify` 가 이관 전후 동일(`content-v3-sim.js` 의 `before` 스냅샷 방식 재사용).
3. 이관 스크립트 실행을 두 번 해도 결과 동일(멱등).

## 9. 본문 문장별 "근거 확인" 팝업 데이터 모델

### 9.1 현재

- 타임라인만 있다: `Timeline.evidence(M, ch, item)` 가 엔진 값에서 즉석으로 `{ title, natal, chain, comps, parts, relations, triggers, six, rule, ... }` 를 만들고 `#evDlg` 가 표시한다. 저장 데이터가 아니라 *계산 결과의 표시*다.
- 본문 문장에는 `StoryComposer.evidence(id, sd)` 가 있다(가장 큰 십성군·신강약·일주·용신·약한 십성군 5항목). 주제 단위이고, 모듈 단위 근거는 아니다.
- 모듈 선택 이유는 `Compose.view().why`("일간 오행 = 목 ✓")가 화면용으로 생성된다.

### 9.2 제안

팝업에 두 가지를 나눠 보여 준다.

```
문장 한 칸 → 근거 참조
sentenceRef = { moduleId, field: 'headline'|'summary'|'detail', rev }
```
1. **계산 근거(자동)** — `why`(조건 일치 내역) + 해당 계산값. 저장 데이터 불필요. 기존 `why` 를 구조화(`{key,label,want,have,hit}` — 이미 `Rules.evaluate().rows` 가 이 모양이다)해 뷰에 넘기면 된다.
2. **해석 근거(저장)** — 모듈의 `evidence.refs` → 출처 목록 항목. `basis` 가 `editorial`/`legacy` 면 "서비스 편집 원칙에 따른 해설" 처럼 *근거 종류를 숨기지 않고* 표시한다(근거 있는 척 하지 않기).

팝업에 나가는 데이터는 `{ calc: rows[], basis, refs: [{title, locator}], checkedAt, disclaimer }` 로 한정하고 출처 본문 전체는 나가지 않는다. `view()` 의 출력에는 위 구조를 `evidenceView` 같은 *별도 키*로 붙이되, §8.1 의 누출 검사는 이 키만 예외로 한다(단계 4 이후).

### 9.3 StoryComposer 문장

30칸(주제 6 × 십성군 5)은 모듈 id 가 없다. 1단계에서는 `MOD[id]`(챕터 모듈 → 주제 키)와 `dominantGroup` 로 만든 **합성 키** `sc:<topic>:<group>` 를 근거 참조 키로 쓰고, 2단계에서 필요하면 모듈 DB 로 옮긴다.

## 10. 위험과 결정이 필요한 사항

### 위험

| ID | 위험 | 완화 |
|---|---|---|
| R1 | 서버 `cleanModule` 이 신규 필드·일부 조건 키를 버림 | 단계 1 에서 가장 먼저 수정, 단위 비교 |
| R2 | `content-v3.js` 가 시드 문장을 덮어쓰는 구조 → "원문 vs v3" 구분 불가, `evidence.rev` 대응 불명확 | 근거는 *최종 노출 문장* 기준. `rev` 는 문장 해시가 바뀌면 올림 |
| R3 | 관리자 저장본이 id 로 시드를 덮어쓰면서 근거가 오래된 채 남음 | 점검 탭의 "문장 변경 후 rev 미갱신" 항목(§7) |
| R4 | 모듈 DB 만 계층화하면 무빙툰 본문 주력(StoryComposer)은 그대로 | §2 단계 구분. 2단계 범위를 사용자가 확정 |
| R5 | `strict` 정책을 서두르면 챕터 품질 급락 | 기본 `off`, 카테고리별 `approved` 비율 임계값 확인 후에만 승격 |
| R6 | CRLF 파일을 스크립트로 수정할 때 줄바꿈이 바뀜(NEXT_PLAN §4-7) | 시드 파일 직접 수정 대신 신규 파일(`content-meta.js`)로 부착 |
| R7 | 표본 400개로 "도달 불가"를 판정하면 오판 | 정리 전 조건 조합 열거로 재확인 |

### 결정 필요 (사용자)

- **D1** 계층화 대상 범위: 모듈 DB 678 만(제안 1단계) vs StoryComposer 30칸·Remedy 129 포함.
- **D2** 출처 목록에 올릴 문헌·자료의 기준(어떤 책·자료를 "근거"로 인정할지)과 승인자(누가 `approved` 로 바꾸는지).
- **D3** `needs_evidence` 문장이 `warn` 모드에서 노출될 때 사용자 화면에 "참고용" 표시를 붙일지.
- **D4** 단계 5(`hide_unverified`) 적용 시점과 카테고리 우선순위.
- **D5** `content-v3` 가 덮어쓴 312개를 "편집 원칙(`editorial`)"로 일괄 분류해도 되는지.

## 11. 측정 방법 (재현용)

`engine.js` 를 `vm.runInThisContext` 로 불러온 뒤 `globalThis.window = globalThis` 로 두고, `chapters → saju-data → rules → narrator → content → content-pro → content-pro2 → topics → intro-text → story-director → story-composer → content-v3 (→ verdict → remedy → media → scenes → compose)` 순서로 `report/v2/*.js` 를 실행한다(`tests/content-v3-sim.js` 와 같은 방식). 이후 `ReportV2.Content.modules` 를 집계했고, 사용 빈도는 고정 시드 LCG 로 400개 사주를 만들어 `Compose.build(sd, Compose.library(null), Chapters.forProject(null,'full'))` 의 `chapters[].modules`·`details[].id`·`topics` 에서 모듈 id 를 모았다. 측정 스크립트는 임시 폴더에 있었고 저장소에는 넣지 않았다(코드 변경 없음 요청).

## 12. 확인 못한 것

- `functions/_lifeai.js`·`_reading-answer.js`·`_movingtoon-reading.js` 가 모듈 문장을 입력으로 받는지, 어떤 경로로 받는지.
- 운영 KV(`v2:content`)에 실제로 저장된 모듈 수정본의 규모와 내용 — 로컬에는 없다(읽기 전용 조회 필요).
- `pro2_`·`pro_` 모듈 중 `choice`·`extra` 가 쓰이는 화면(PDF·무빙툰) 전수.
- `identity_el_*` 같은 v3 모듈이 표본에서 0회 선택된 정확한 원인.
- `deep*.js`·`intro-text.js` 등 조합식 문장 생성기의 문장 수(템플릿 조합이라 개수가 정의되지 않음).
- 관리자 "정합성 검사"(`consistency.js`)와 `evidence` 의 상호작용 — 이 문서는 출생 계절 규칙만 확인했다.
- 본 문서의 단계 일정·공수는 산정하지 않았다.

## 13. 진행 기록

### 결정(사용자 확정)
- **D1**: 계층화 대상은 **모듈 DB(678개)만**. StoryComposer 30칸·Remedy 129개는 이번 범위 밖.
- **D5**: `content-v3` 가 덮어쓴 312개를 포함해 기존 모듈은 단계 2 에서 `status:'legacy'`, v3 모듈은 `evidence.basis:'editorial'` 로 **일괄 분류**한다(근거 문헌이 있다고 표시하지 않는다).
- D2·D3·D4 는 아직 미결(단계 4~5 전에 필요).

### 단계 0 · 1 — 완료
- `tests/content-db-sim.js` + `tests/content-db-baseline.txt`: 사주 120개(시간 모름 12개 포함) × 프로젝트 4종(full·love·wealth·newyear)의 조립 결과 해시, 신규 필드 누출 검사, 저장본 병합 규칙, 서버 정리 규칙. 기준선 갱신은 `--update`.
- `functions/api/report-content.js`: 조건 키 4개(`monthBranch`·`dayBranch`·`groupHigh`·`groupZero`) 보존, `layer`·`choice` 보존, 신규 선택 필드 `status`·`evidence`·`narrative`·`rule.note` 를 값 범위 검증 후 보존. 값이 없으면 출력에 키가 생기지 않아 기존 모듈의 정리 결과는 같다. `rule.when/except`·`v3` 는 받지 않는다.
- 사용자 화면·`report/v2/*.js`·엔진은 변경 없음. 테스트: content-db-sim·engine-baseline·content-v3·life-doc·compose-api 통과. 조건 키 4개를 일부러 빼 보면 테스트가 실패하는 것도 확인했다.
- 확인한 한계: 서버 함수는 `export` 가 아니라서 테스트가 소스를 잘라 `new Function` 으로 실행한다. 운영 배포 후 관리자 저장→재조회 동작은 **확인 못함**(로컬 KV 없음).

### 단계 2 — 완료
- 신규 `report/v2/content-meta.js`: `content-v3.js` 다음에 로드되어 모든 모듈(678개)에 `status:'legacy'` 와 `evidence:{basis, refs:[], rev:0}` 를 붙인다. v3 로 문장이 바뀐 312개는 `basis:'editorial'`, 나머지 366개는 `'legacy'`. 문헌(`refs`)·승인자는 만들어 넣지 않는다. 시드 파일(`content*.js`·`topics.js`)은 수정하지 않았다. 멱등.
- `report/v2/index.html`, `report/admin/index.html` 에 스크립트 한 줄씩 추가(`content-v3.js` 바로 뒤).
- `report/admin/v2-content.js`: 저장 시 시드와 값이 같은 `status`·`evidence`·`narrative`·`rule` 은 저장본에 복사하지 않는다. 복사하면 나중에 시드 메타(예: `approved`)가 바뀌어도 오래된 저장본이 덮어쓰기 때문이다(위험 R3 대응).
- 검증(`tests/content-db-sim.js` 확장): id 집합·순서 불변, 기존 필드(문장·조건·우선순위·extra·layer·v3) 불변, 전 모듈 legacy, editorial = v3 312개만, 재실행 동일, status·evidence 유무가 `Rules.rank` 순서에 영향 없음, 조립 기준선(120사주×4프로젝트) 바이트 일치. 전체 `*-sim` 60개 통과, 실패 4개는 작업 전과 같은 `calendar-ui`·`free`·`panel`·`panel-edit`.
- 아직 안 한 것: 선택 게이트(`Rules.rank` 의 status 필터, 정책 `off` 기본)는 단계 3. 관리자 화면의 status·evidence 입력란은 단계 4. 브라우저 실화면·관리자 저장 동작은 확인하지 않았다(변경이 화면 출력에 영향을 주지 않도록 한 구조이고 테스트는 Node 에서만 돌렸다).

### 단계 3 — 완료 (선택 게이트, 정책 기본 off)
- **게이트 위치 수정**: §4.2 는 `Rules.rank` 한 줄을 제안했지만, `rank` 는 정책(라이브러리 단위 값)을 알 수 없고 호출처가 6곳이다. 그래서 `Rules.gate(mod, policy)`(순수 함수)를 `rules.js` 에 두고, **`Compose.library()` 가 라이브러리를 만들 때 한 번 적용**한다. 호출처 6곳은 `lib.modules` 를 그대로 쓰므로 변경 없다. `rank`·`pick` 은 수정하지 않았다.
- **동작**(`report/v2/rules.js`, `report/v2/compose.js`):
  - `draft`·`retired` 는 **모든 모드(off 포함)에서 숨김**. §7 표의 "off = 필터 없음"을 이 한 가지만 예외로 바로잡는다 — 초안이 사용자에게 나가는 일을 막기 위한 것이며 현재 시드에는 draft 가 0개라 출력이 바뀌지 않는다.
  - `off`·`warn`: 그 밖에는 안 막음. `hide_unverified`: `needs_evidence` 숨김. `strict`: `approved` 만 노출. `status` 없음은 `legacy`.
  - **폴백 보장**: 정책 때문에 조건 없는 모듈이 하나도 안 남는 카테고리는, 막힌 조건 없는 모듈(draft·retired 제외)을 다시 허용한다. 반환값에 `policy`·`hidden[{id,category,reason}]`·`restored[]` 를 실어 점검 탭이 쓸 수 있게 했다.
- **정책 저장**: `functions/api/report-content.js` PUT 이 `evidencePolicy`(`off|warn|hide_unverified|strict`)를 받는다. 잘못된 값은 400. `Compose.fromSaved` 가 `content.evidencePolicy` 를 라이브러리에 전달한다. 저장 때 `version` 이 바뀌므로 캐시 키도 갱신된다.
- **검증**(`tests/content-db-sim.js` 확장): 정책×status 진리표, draft 는 off 에서도 숨김, hide_unverified·strict 동작, strict 에서 58개 카테고리 모두 조건 없는 모듈 유지·4개 프로젝트 조립에서 빈 챕터 0·신규 필드 누출 0, 서버·규칙 엔진 정책 목록 일치, 기존 조립 기준선(120사주×4프로젝트) 바이트 일치. 전체 `*-sim` 60개 통과(실패 4개는 작업 전과 같음).
- **알려진 점**: 관리자 화면 중 `Compose.library(...)` 를 정책 없이 호출하는 곳(`v2-ik.js`·`v2-shell.js` 통계·`v2-check.js`·`v2-quality.js`)은 정책 off 로 동작한다(draft·retired 만 빠짐). 정책을 쓰는 점검 화면은 단계 4 에서 `content.evidencePolicy` 를 넘기도록 바꾼다.
- **미착수**: 관리자에서 정책·status·evidence 를 바꾸는 화면(단계 4). 현재 정책을 바꾸는 방법은 PUT API 뿐이고, 운영에 값이 없으면 off 다.

### 단계 4 — 완료 (관리자 입력란 · 서비스 점검 항목)
- **관리자 모듈 편집기**(`report/admin/v2-content.js`): "풀이 DB 계층" 접이식 영역 — 상태(status), 근거 종류(evidence.basis), 출처(한 줄에 `id | 종류 | 제목 | 위치`, 최대 5), 확인한 사람·날짜, 서사(말투·도입·비유), 규칙 메모. 비워 두면 기존과 같다.
- **편집 검토 규칙**(`R.Quality.reviewEdit`, 순수 함수·Node 테스트 대상): ① 근거 종류가 legacy 이거나 tradition 인데 출처가 없으면 승인 불가(이전 상태로 되돌림) ② 승인된 모듈의 문장을 고치면(상태를 일부러 바꾸지 않은 경우) `needs_evidence` 로 내리고 `evidence.rev`+1 ③ 승인 저장 시 문장 해시를 `evidence.textHash` 에 기록. 서버 `cleanEvidence` 가 8자리 16진수 해시만 보존한다.
- **근거 정책 패널**: 해석 모듈 편집 화면 상단. 정책 선택 시 "저장된 모듈 기준 숨김 N개(폴백 복원 M개)"를 미리 보여 주고, hide_unverified·strict 저장 전에는 확인창을 띄운다. `evidencePolicy` 저장.
- **서비스 점검 탭**(`report/admin/v2-quality.js`, `report/v2/quality.js` `evidence()`): 상태별·근거 종류별 개수, 카테고리별 승인 비율(낮은 순), 정책별 숨김 예상 수, 점검 항목 3종 — 사용 중인데 draft·retired / 승인인데 근거 비어 있음 / 알 수 없는 조건 키 / 승인 후 문장이 바뀐 모듈. 마크다운 내보내기에도 포함. 점검용 문서는 이제 저장된 모듈·정책이 반영된 라이브러리로 만든다(이전: 시드만). `Compose.library()` 가 정책 적용 전 전체 목록 `all` 을 추가로 돌려준다.
- **검증**: `tests/content-db-sim.js` 확장(근거 집계·합성 문제 탐지·reviewEdit 7개 시나리오·textHash 보존), 조립 기준선 일치, 전체 `*-sim` 60개 통과(실패 4개는 작업 전과 같음), 엔진 기준선 일치. **브라우저 확인**(로컬 개발 서버, 시험용 비밀번호): 모듈 편집기에 계층 영역·정책 패널 표시, legacy 근거 승인 거절, editorial 근거 승인 시 해시 기록, 승인 문장 수정 시 needs_evidence·rev 1, 서비스 점검 탭에 근거 상태 표시, 콘솔 오류 없음. 저장 동작(PUT)은 눌러 보지 않았다.
- **알려진 점**: 정책 패널은 챕터별 "해석 모듈" 탭마다 한 줄로 나타난다(저장 값은 하나). 출처 목록(`v2:sources`)은 만들지 않았고 `refs[].id` 는 자유 입력이다(D2 결정 후). "표본에서 한 번도 안 뽑힌 모듈" 점검은 비용(400 사주 조립)이 커서 넣지 않았다.
- **다음**: 단계 5(승인 작업이 쌓인 카테고리부터 hide_unverified 시험 적용)는 D2(근거 문헌 기준·승인자)·D4(시점·카테고리)가 정해져야 한다. 단계 6(`except`)은 `Rules.evaluate` 변경이라 별도 비교 테스트가 선행된다.

### 단계 6 — 완료 (제외 조건 `rule.except`)
단계 5(정책 시험 적용)는 D2(근거 문헌 기준·승인자)·D4(시점·카테고리)가 미결이라 보류하고, 막히지 않은 단계 6 을 먼저 진행했다.
- **규칙 엔진**(`report/v2/rules.js` `evaluate`): 모듈에 `rule.except = { 조건키: [값…] }` 가 있고 사실(facts)이 그 값 중 하나라도 맞으면 매칭 실패(배열 사실은 하나라도 겹치면 제외). 통과한 경우 구체성 점수·순위에는 영향이 없다. 사실에 없는 키는 걸리지 않는다. 제외된 모듈은 `rows` 에 `except:true` 행(제외 사유)을 남겨 관리자 "조합 테스트"에서 이유가 보인다.
- **서버**(`cleanModule`): `rule = { note?, except? }`. `except` 는 선택 조건과 같은 키·값 검증을 거친다. `rule.when` 은 여전히 받지 않는다(선택 조건은 `conditions` 가 유일한 원천).
- **관리자**: 계층 영역에 "제외 조건" 체크박스 묶음(선택 조건과 같은 입력 컴포넌트).
- **점검**: 선택 조건 값이 전부 제외 조건에 들어 있어 어떤 사주에서도 선택되지 않는 모듈을 "충돌"로 표시(점검 탭·마크다운).
- **검증**: `tests/content-db-sim.js` 에 except 시나리오 9건(없음/빈 값/불통과/통과 시 점수 불변/제외/배열 사실/없는 키/pick 에서 다음 후보 승격/충돌 탐지) + 서버 정리. 시드 모듈에 except 가 하나도 없음을 확인해 조립 기준선(120사주×4프로젝트)이 그대로 일치. 전체 `*-sim` 60개 통과(실패 4개는 작업 전과 같음), 엔진 기준선 일치. 브라우저(개발 서버): 제외 조건 체크 후 적용 시 값 유지 확인. 저장은 눌러 보지 않았다.
- **주의**: 이 단계부터는 관리자가 except 를 쓰는 순간 선택 결과가 바뀔 수 있다(의도). 운영 반영 전, except 를 쓴 모듈은 "조합 테스트"로 영향 범위를 확인하는 것이 좋다.

## 14. 정정·발견: 풀이 지식(IK) 시스템과 자료 학습 파이프라인은 이미 있다 (5-B 착수 전 조사)

NEXT_PLAN 5-B(자료 업로드 분석·승인)를 설계하려고 `functions/` 를 조사하다가, 이 문서 §2 가 **다섯 번째 문장 저장소를 빠뜨렸고**, 5-B 의 대부분이 이미 구현돼 있음을 확인했다.

### 14.1 §2 정정 — 문장 저장소는 5곳
| 저장소 | 위치 | 상태 모델 | 서비스 연결 |
|---|---|---|---|
| (추가) **풀이 지식 IK** | KV `ik:d:<DOMAIN>`(8개 분야), `functions/_ik.js`·`_ikstore.js`·`api/ik.js`, 관리자 "풀이 지식" | `draft→review→approved→published→archived` + `reviewed`(검수 완료) 플래그, `sourceType`, `confidence`, `evidence[]`, `modifiers[]`(강화·완화·대체·예외), `exclusions`, `alsoWhen`, 충돌 감지 | `POST /api/ik?a=deep`: 게시+검수 완료 항목만으로 "더 깊이 보기" 풀이 생성(AI 호출 없음). 클라이언트 `report/v2/ik-deep.js` 가 6초 제한으로 호출, 실패·꺼짐이면 `null` 이라 기존 리포트가 그대로 진행 |
| 자료 `src:*` | KV `src:idx`·`src:chunks:<id>`·`src:cand:<id>`, R2 `src/<id>`, `functions/_src.js`·`api/src.js`, 관리자 "풀이 자료" | 자료 상태 `need→analyzed→review→done`, 후보 결정 `approve·approveEdited·hold·discard·addEvidence·merge` | IK 항목의 근거(evidence)로만 연결 |

해석 모듈 DB(이 문서의 대상)는 챕터·PDF·주제 카드를 먹이고, IK 는 심화 풀이를 먹인다. 두 DB 는 **서로 다른 경로로 사용자에게 간다**.

### 14.2 NEXT_PLAN 5-B 요구와 현재 구현
| 5-B 요구 | 현재 | 근거 |
|---|---|---|
| MD/PDF/TXT 업로드 | **있음** — `FILE_TYPES = pdf·md·txt·text`, 텍스트 3MB·업로드 40MB·청크 1500개 한도 | `_src.js`, `api/src.js` MAX_UPLOAD |
| AI 가 분석해 기존 DB 와 비교(신규·중복·충돌) | **있음(IK 항목 대상)** — `compareCandidate` 결과 `new·similar·identical·reinforce…`, 충돌·원문 불일치 검증(`validateCandidate`), 원문 주장과 AI 정리를 따로 저장 | `_src.js` |
| 승인 전에는 서비스 DB 에 반영하지 않음 | **있음** — 후보는 `src:cand:*` 에만 저장, production 검색에 쓰이지 않음. AI 초안은 검수 없이 게시 불가(`cleanItem`) | `api/src.js` 머리 주석, `_ik.js` `cleanItem` |
| 초안 영역 분리 | **있음** — 후보 / IK `draft·review` / `published` 3단계 | 위와 같음 |
| 승인 시 근거 연결 | **있음** — 승인하면 IK 항목 + `evidence[{docId, chunkId, pageStart, quote…}]` | `candidateToItem`, `cleanEvidence` |
| 일괄 처리·영향 확인 | 있음 — `batch`, `impact`, `gaps` | `api/src.js` |
| 테스트 | `tests/src-sim.js`, `tests/ik-sim.js` — 이 브랜치에서 실행해 **둘 다 통과** | 실행 확인 |

→ **5-B 를 새로 만들 필요는 없다.** 남은 갭은 아래 §14.4 이다.

### 14.3 이번 작업(단계 1~6)과의 관계
| 이 문서의 개념 | IK 의 대응 개념 | 비고 |
|---|---|---|
| 모듈 `status`(legacy·approved·needs_evidence·draft·retired) | IK `status` + `reviewed` | 이름·단계가 다르다. 두 모델이 따로 존재 |
| 모듈 `evidence.refs[{id,kind,title,locator}]` | IK `evidence[{docId,chunkId,pageStart,pageEnd,heading,quote}]` | 모듈 쪽 `refs[].id` 에 자료 `docId` 를 쓰면 호환 가능(ID 형식 `d[a-z0-9]{3,24}` 이 모듈 쪽 허용 문자 안에 들어감) |
| 모듈 `rule.except`(단계 6) | IK `exclusions`·`modifiers[effect:'exception']` | 개념 중복. 모듈 DB 의 선택 경로(`Rules.evaluate`)에서 필요해 별도 구현했지만, 두 DB 를 일원화하면 이관 대상 |
| 근거 정책 `off·warn·hide_unverified·strict` | IK 는 `published && reviewed` 만 서비스 노출(항상 strict) | 정책이 다르다 |
| D2 "근거 문헌 기준·승인자" | 자료 등록 시 `sourceKind`(서적·전문가·내부·연구)·`grade`(A/B/C)·`theoryTags`·`publisher` 입력 이미 있음 | **D2 의 문헌 기준 절반은 이미 데이터 모델이 있다** — 어떤 자료에 어떤 등급을 줄지가 남은 결정 |
| 모듈 → IK 이관 | `fromLegacyModule`·`?a=import`: 모듈 → "검수 필요" IK 초안(이미 가져온 것은 건너뜀). 조건 이름·시즌 표기를 변환 | 단방향. 승인된 IK 가 모듈 DB 로 돌아오는 경로는 없음 |

### 14.4 남은 갭 (확인된 것만)
1. **모듈 DB ↔ 자료 연결 없음**: 모듈 편집기의 출처 입력(`refs`)은 자유 입력이라 `src:idx` 의 자료·청크와 연결되지 않는다. 자료 선택기(자료 목록 `a=list` → docId 채우기)와 원문 위치 보기가 없다.
2. **업로드 분석의 비교 대상이 IK 항목뿐**: 해석 모듈 678개는 `import` 로 IK 초안이 된 뒤에야 비교 대상이 된다. 모듈을 먼저 import 하지 않았다면 업로드 자료가 "새로운 풀이"로 보일 수 있다 — **운영에서 import 가 어디까지 되어 있는지는 확인 못함**.
3. **두 DB 의 일원화 방향이 정해지지 않음**: 모듈이 정본인지, IK 가 정본인지, 병행인지. 지금은 병행이며 상태·근거 모델이 이중이다.
4. **IK → 서비스 연결의 실제 켜짐 여부**: `a=deep` 의 `enabled` 값(서비스 연결 ON/OFF)과 운영 IK 항목 수·게시 수는 로컬에 없어 **확인 못함**.

### 14.5 선택지 (사용자 결정 필요)
- **A. 연결만 보강(권장 후보, 소규모)**: 모듈 편집기에 "자료에서 고르기"(src 자료 목록·청크 검색)를 추가해 `evidence.refs` 가 실제 자료·청크를 가리키게 한다. 상태·정책 모델은 그대로. 새 저장 구조 없음.
- **B. 일원화**: IK 를 정본으로 삼아 모듈을 점진 이관(`import` 는 이미 있음)하고 모듈 DB 는 폴백으로 축소. 효과는 크지만 사용자 화면(챕터·PDF) 변화와 `rule.except`·정책 모델 폐기가 따른다 — 별도 설계·비교 테스트가 필요하고 위험이 크다.
- **C. 현상 유지**: 이중 구조를 문서화만 하고 각각 운영.
- 어느 쪽이든 먼저 **운영 데이터 확인**이 필요하다: IK 항목 수와 상태 분포, 자료 수와 등급 분포, `import` 완료 범위, 서비스 연결(`deep`) ON/OFF. 관리자 화면의 "풀이 지식"·"풀이 자료" 통계에서 읽기 전용으로 확인할 수 있다.
