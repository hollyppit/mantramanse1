# 7. 정합성 개선 1차 — 운영 반영 준비 (2026-11-26)

- 사용자 결정(2026-11-26): 대체 문단 문안 검수를 생략하고 "바로 반영 준비"
- 현재 상태: **운영 폴더 변경 없음 · 커밋 없음 · 배포 없음**
  - 반영할 내용은 개발 사본 `../manse-dev-myeongri-fix-1`(브랜치 `dev/myeongri-fix-1`)과 패치 파일 `data-fix1/release.patch`에 준비돼 있다.
- 근거 보고: `06_FIRST_IMPROVEMENT_REPORT.md`

## 1. 반영할 파일(9개)

| 파일 | 줄 | 운영 기준 해시(sha256 앞 16자리) | 내용 |
|---|---|---|---|
| `engine.js` | +72 −14 | 9ccc17faefd9beea | M1 공통 구조 판정 · M3 · M4 · M7, 스위치 3개 |
| `ten-god-roles.js` | +13 −4 | ac5fa2d4422b844a | 십성 카드 7종 구조를 공통 판정으로, `agreePatterns` 공통 결과 사용 |
| `index.html` | +4 −4 | af5972948a39e78d | 구조 후보 줄 · 십성 카드 안내 · M7 문구 변환 |
| `report/v2/reading-insight.js` | +6 −1 | 741b48e6d8fdbe16 | 빈 장 대체 단계(용신·기신·희신 오행) |
| `report/v2/reading-insight-data-3.js` | +75 | 826d455ac2a11151 | 대체 문단 60문장(`FALLBACK`) |
| `report/v2/index.html` | +2 −2 | fa98c1f9f1abfad0 | 두 스크립트 버전 표시 `20261126-fallback` |
| `tests/ten-god-roles-sim.cjs` | +3 −1 | 4ad6850bdac2b71f | 자체 조건 판정·공통 판정 연결을 모두 단언 |
| `tests/reading-insight-sim.cjs` | +3 −2 | 62cd21753b13c54a | 대체 문단 표를 형식·중복 검사에 추가 |
| `tests/engine-baseline.txt` | +7 −7 | 34b81a084b47d785 | 엔진 기준선 갱신(운 점수 계열 6개 해시만, 원인 M3) |

- 반영 직전에는 운영 폴더 9개 파일의 해시가 위 '운영 기준 해시'와 같은지 다시 확인한다. 공유 폴더라 그 사이 다른 작업이 같은 파일을 고쳤을 수 있다.
- `git apply --check`(공백 무시)로 패치 적용 가능 여부를 점검했고, 통과했다.

## 2. 반영 방법(승인 뒤)
1. 운영 폴더 9개 파일의 해시가 위 표와 같은지 확인한다. 다르면 멈추고 보고한다.
2. 개발 사본의 9개 파일을 운영 폴더 같은 경로에 복사한다(바이트 그대로).
3. 운영 폴더에서 다음 테스트를 돌린다.
   - `node tests/engine-baseline-sim.js`
   - `ten-god-roles-sim`
   - `reading-insight-sim`
   - `gyeok-structure-sim`
   - 전체 시뮬레이션 테스트
4. 9개 파일만 `git add` 한 뒤 diff를 확인하고 커밋한다.
5. `main`에 푸시한다(= Cloudflare Pages 자동 배포). 배포 결과는 Cloudflare API로 커밋별 성공 여부를 확인한다(사이트 잠금 때문에 curl로는 확인할 수 없음).
6. 운영 화면을 확인한다.
   - 만세력 원국 탭의 구조 진단(성립·후보 줄)
   - 오행·강약 탭의 십성 작용 카드(관리자 스위치 tenGodRoles가 켜져 있을 때)
   - 상세풀이 '이 사주에서만 읽히는 포인트'
   - 타임라인

## 3. 캐시
- 별도 캐시 규칙 파일(`_headers`)이 없어 Cloudflare Pages 기본값(매번 다시 확인)을 따른다.
- `engine.js`·`ten-god-roles.js`는 지금까지 버전 표시 없이 반영돼 왔다.
- 상세풀이 두 스크립트는 버전 표시를 올렸다.
- 새 엔진과 옛 화면 스크립트가 섞여도 깨지지 않는다.
  - 새 `ten-god-roles.js`는 `ch.patterns.named`가 없으면 예전 방식으로 동작한다.
  - 옛 `ten-god-roles.js`는 새 엔진의 `list`(성립만)를 그대로 쓴다.

## 4. 되돌리기
- 반영 커밋 하나를 `git revert` 한 뒤 푸시하면 이전 상태로 돌아간다. 기준선 파일도 같은 커밋에 들어 있다.
- 일부만 끄기
  - `engine.js`의 `LUCK_CFG.structure.commonStatus = false`: M1을 끈다. 점수는 원래부터 같다.
  - `UNIFIED_CFG.jehwaEstablishedOnly`, `jehwaDedup` = false: M3·M4를 끈다. 엔진 기준선은 이전 값으로 돌아간다.

## 5. 반영 시 바뀌는 것(06 보고서 요약)
- 300개 명식 기준
  - 구조 표시가 바뀌는 명식 262개
  - 점수가 바뀌는 명식 6개(평균 +0.21, 등급 변경 36건)
  - 용신·격국·종격 변화 0
- 상세풀이 포인트
  - 빈 장: 6 → 0
  - 대체 문단은 240개 표본 15,120개 장 중 17곳에 쓰인다.
- 대체 문단 60문장은 **검수하지 않은 초안**인 채로 반영된다(사용자 결정).

## 6. 반영 전 전체 테스트(개발 사본, 기준선 갱신 후)
- 결과: `data-fix1/tests-release.json`(아래 7절에 요약)

## 7. 전체 테스트 요약
- 시뮬레이션 테스트 342개
  - 운영 폴더: 통과 336
  - 개발 사본(반영 후보): 통과 316
- 운영과 결과가 다른 20개는 **모두 폴더 환경 원인**이다.
  - `tests-control.json`의 목록과 같다.
  - 개발 사본에서 수정 파일을 원본으로 되돌려도 똑같이 실패한다(저장소에 없는 `output/` 자료·체크아웃 차이).
- 코드 때문에 실패한 테스트: **0**
  - 엔진 기준선을 갱신해 `engine-baseline-sim`·`gyeok-structure-sim`도 통과한다.
  - 환경 원인을 빼면 336/336이다.
- 양쪽 모두 실패하는 6개는 이번 반영과 무관하다(운영에서도 실패).
  - content-db · saju-house · samjae · tarot-symbols · unseong-cycle · ux-writing-copy-audit
- `tests/ten-god-roles-sim.cjs`
  - 개발 사본 체크아웃본이 운영 폴더 파일과 내용이 달랐다.
  - 그래서 운영 파일을 기준으로 같은 수정을 다시 얹었고, 단독 실행으로 통과를 확인했다.
  - 전체 실행은 그 전에 시작해 이전 판으로 돌았고, 그 판도 통과했다.
