# 운세 흐름 고도화 + 나의 운명 지도 — 사전 전수 조사 (2026-11-02)

코드 수정 없음. 조사만 수행. 구현 전에 아래 결정 사항 확인 필요.

## 1. 현재 구조

### 1-1. 계산 엔진 (`engine.js`, 2,905줄)
- 원국·절기·시간대: `pillarsFor`, `jieList`, `localSolar`(경도·균시차), `TZ` 표 — 출생지는 **경도(lon)만** 사용 (`index.html` CITIES 34개, 한국 도시 + 평양).
- 구조: `elementWeights → strength → climate → yongsin(school) → patterns`, `relationsAmong`(합충형해파), `sinsalFor`.
- 학파 분기는 이미 설정화되어 있음: `ch.school`(eokbu/johu/tonggwan/병행), `model`, `combinationMode`, `climatePalaceMode`, `sinsalBase`, `timeMode`, `jasi`.
- 운: `daeun()`(3일=1년, 교운 `startMs`), `seunRange`, `wolun`(입춘~소한, 절기 기준 `monthsOfYear`), `ilun`.
- **네 단계가 하나의 엔진을 공유함**: `luckItem → evaluateLuck(ch, p, level, {parent})` (`engine.js:890`). 단계별 차이는 `LUCK_CFG.levels`(stemW·parent·mul)뿐.
- 상위 운 참조: 세운·월운은 대운 `ev`를 `parent`로 40% 혼합. **일진은 `parent:0` — 월운·세운을 참조하지 않음** (명세 4-4와 불일치).

### 1-2. 점수 체계
- `fitScore`(−100~100, 억부·조후·관계·구조 가중합) / `volatilityScore`(합충 변화 세기) / `defenseLoad` / 4개 활성도(기회·확장·수확·축적) / `condition`(순풍·보통·주의·부담). **적합도와 활성도가 이미 분리**돼 있어 명세 5장의 "활성도 ≠ 유불리"와 합치.
- 분야 지수 15종(`evaluateDomainLuck`): 애정·재물·건강·사고수 + 세부 11종. 신호등 컷(`SIG_CUTS`)은 사주 수백 개 분포에서 뽑은 상대값.
- 삼재는 참고 정보로만 표시, 점수 미반영(명세와 합치).

### 1-3. UI (`index.html` `renderLuck`, 6376행)
- 순서: 지금의 운 → 대운 → 세운 → 월운 → 일진 달력 (유지 대상). 선택 시 `detailHTML`(점수 근거·`phaseBox/dayBox`·`domainBox`·`rootBox`·`luckEffects`) 표시.
- `luckEffects`가 이미 "들어오는 오행·원국과의 작용·신살"을 보여 주나, **생활 환경/상황 서술(명세 3장 A~H)은 없음**.
- 별도 경로: `report/hub/hub-timeline.js`(타임라인), `report/v2/luck-reading.js`(12개 장 한정 십성별 문구).

### 1-4. 해석 DB/관리자
- 저장소는 Supabase `kv(key,value,expires_at)` 단일 테이블 + 읽기 전용 RPC. 해석 문안은 `ik:blocks:chapter:library.*`, 편집은 `report/admin/`, 운영 본문은 rebuild 게시본(DB) — 기존 메모리 기록과 동일.
- **거주지·출생지 지역 데이터 저장 구조는 전무**(grep 결과 거주 관련 처리는 장 문구 일부뿐).

## 2. 발견된 문제
1. `tests/engine-baseline-sim.js` **현 HEAD에서 실패** — weights/strength/yong 등 원국 해시까지 기준선과 다름. 직전 엔진 변경(`232590a` 등) 이후 기준선 미갱신으로 추정. 이번 작업 전에 "의도된 변경인지" 확인하고 기준선을 갱신해야 회귀 감시가 의미 있음.
2. `tests/volatility-sim.js` 1건 실패: 문구에 "전환기/전환일"이 남아 있다는 검사. 단, 실제 매치는 `index.html` 용어 사전 문구(1476·1575·3557·3570행)로, 엔진 phase 이름 문제가 아니라 **검사 범위 과다**로 보임(확인 필요).
3. 일진이 월운·세운 맥락을 참조하지 않음(위 1-1).
4. 지역 데이터/지도/거주지 입력 UI 없음. 출생지는 도시→경도 변환용 34개뿐이고 위도·시간대·국가 개념 없음.

## 3. 재사용 가능 모듈
- `evaluateLuck` 결과 구조(관계·reasons·parts)를 "근거 보기"와 "근거 규칙 ID"의 원천으로 사용 가능.
- `luckRelations`, `groupPull`, `relWhere`, `TG_GROUP`, 분야 지수 → 환경 5영역(직업·재물·인연·이동·학습) 매핑 가능(직업/재물/애정/이사·이직/학업 세부 지수가 이미 대응).
- `luck-reading.js`의 십성 문구 패턴·`gods` 표(조건부 문장 스타일 참고).

## 4. 제안 설계
### Phase A — 해석 계층 (엔진은 그대로, 읽기 전용 추가)
- 새 순수 함수 `buildLuckInterpretation(ch, level, item, ancestors)` → 명세 2-2 구조(간지·십성·지장간·원국 작용·상위 운 관계·유리/불리 조건·불확실성·**rule ID**) 반환. 점수는 건드리지 않음.
- 환경 5영역은 기존 분야 지수·십성 묶음에서 **상위 2~3개만** 선택, 수치 대신 강조/보통/약함.
- 문안은 `functions/_luck-env-copy.js`(신규)에 조건부 템플릿 + rule ID. 근거 부족 시 생성 생략.
- 일진에 `parent` 컨텍스트(월운·세운) 전달해 관계 문장만 추가(점수 계산 변경은 별도 결정).
### Phase B — UI
- `detailHTML` 위에 "핵심 기운 → 환경 → 상황 → 조건 → 대응" 카드 + `<details>` 근거. 상단 요약 바(대운·연·월·일 선택 연동, 7-1).
### Phase C — 나의 운명 지도
- 신규 `report/map/`(모듈) + 지역 DB는 **기존 `kv`에 `region:*` 키**로 저장(스키마 변경·기존 데이터 영향 없음). 전통 해석과 통계 데이터를 키로 분리, 출처·갱신일 필수, 빈 항목은 비움.
- 출생지는 기존 경도 로직 유지, 거주지는 별도 필드(원국 불변).
- 지도: 국내 광역시·주요 시 중심. 타일/라이브러리는 아래 결정 필요.

## 5. 변경 예정 파일
`engine.js`(일진 parent 옵션만, 선택) · `index.html`(renderLuck 주변) · `functions/_luck-env-copy.js`(신규) · `shared-core.js`(필요 시) · `report/map/*`(신규) · `functions/api/region.js`(신규) · 관리자 지역 편집 탭 · `tests/luck-env-sim.cjs`·`tests/region-sim.cjs`(신규). **DB 마이그레이션은 신규 `region:*` 키 추가뿐이며 기존 행 삭제·초기화 없음.**

## 6. 확인이 필요한 결정
1. **명세 전달이 7-4(연속 탐색)에서 끊김** — 이후 항목(8장 이하: DB·AI·테스트·배포 등으로 추정)을 다시 받아야 함.
2. 지도: Leaflet+OpenStreetMap(무료, 사용량 정책 준수 필요) vs 카카오/네이버 지도(키·쿼터) vs 도시 좌표 SVG 자체 지도(비용 0, 국내 한정).
3. 지역 통계: 공공데이터(KOSIS 등) 수집 자동화 여부, 아니면 관리자 수동 입력으로 시작할지.
4. engine-baseline 기준선 갱신 여부.
5. 일진의 점수에 월운·세운을 섞을지(분포가 바뀌어 기준선·신호등 컷 재산출 필요) vs 문장 맥락만 추가할지.
