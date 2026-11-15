# 2027 정미년 토정비결 신년운세 — 최종 보고 (2026-11-15, 미커밋·미배포)

## 1. 한 줄 요약
규장각본 원문 판독(140괘)+국립중앙도서관 필사본 보충(4괘) → 판본 「數理法」으로 검증한 작괘 엔진 → 만세력 읽기 전용 사주 연결 → AI 없는 문구 DB(토정 현대어 144괘·사주 블록 131개)와 조합기 → 서버 잠금 API·연도 상품(tj2027) → 신년운세 화면 → 관리자 검수 탭까지 만들었다. **문구는 모두 검수 전(draft)이고, 공개 범위 기본값은 비공개**라 배포해도 사용자에게 바로 보이지 않는다.

## 2. 변경 파일
### 기존 파일 수정 (최소)
| 파일 | 내용 |
|---|---|
| `engine.js` | 7행: 서버(ES 모듈)에서 불러올 수 있게 `G.MANSE_DATA || MANSE_DATA`. 계산 결과 불변(엔진 기준선 120개 차트 일치) |
| `functions/_commerce.js` | 연도 상품 `tj2027`(kind annual, 기본 가격 0=판매 안 함), `ANNUAL_WORLD`·`isAnnualWorld`, `productWorlds` 가 annual 처리 |
| `functions/api/commerce/access.js` | 연도 상품을 무빙툰 구매 목록과 따로 `annual` 로 내려 줌 |
| `report/legal/products.html` | 상품 안내에 신년운세 설명·가격 표시 |
| `report/my/index.html` | tjYYYY 권한 사주에 'YYYY 신년운세 보기' 버튼 |
| `report/v2/paywall.js` | 공개 함수 4개(login·logout·buy·toast) 추가만, 기존 동작 그대로 |
| `report/admin/index.html`, `report/admin/navigation.js` | 관리자 메뉴 판매·타임라인에 '신년운세' 탭 등록 |
| `.gitignore` | 판독용 사진 폴더(`docs/tojeong-transcription/nl-capture/*/`) 제외 |
| `.claude/report-dev.js` | 로컬 개발 서버에서 신년운세 API·관리자 API 실행(확인용) |

### 새 파일
- 원문·판독: `report/newyear/texts/tojeong-kyu1077.js`(140괘), `tojeong-nl-supplement.js`(663·711·862·863), `docs/tojeong-transcription/`(1·2차 판독 JSON, 판정, 지침, 보충본 판독), `tools/build-tojeong-text.cjs`, `tools/build-tojeong-pdf.cjs`(원문 PDF: `output/tojeong/…pdf`, 커밋 제외 폴더)
- 엔진: `report/newyear/engine.js`(작괘), `report/newyear/saju-link.js`(사주 연결)
- 문구·조합: `report/newyear/texts/tojeong-modern-1~6.js`, `saju-blocks-{total,misc,domain,month}.js`, `report/newyear/years/2027/pack.js`, `report/newyear/compose.js`, `quality.js`, `node-loader.js`
- 서버: `functions/_newyear.js`(공개·잠금), `_newyear-runtime.js`, `_newyear-content.js`(검수·수정 덧입힘), `functions/api/newyear/reading.js`, `functions/api/newyear/admin.js`
- 화면: `report/newyear/index.html`, `newyear.css`, `newyear-app.js` / 관리자 `report/admin/v2-newyear.js`
- 문서: `docs/TOJEONG_2027_PLAN_2026-11-15.md`(계획+단계별 결과), `TOJEONG_SOURCE_…`(출처·판본), `TOJEONG_METHOD_…`(계산법), `NEWYEAR_COPY_SPEC.md`, `NEWYEAR_CONTENT_C_…`, `NEWYEAR_SAMPLE_2027.md`, 이 보고서
- 테스트: `tests/tojeong-text-sim.cjs`, `tojeong-engine-sim.cjs`, `newyear-saju-link-sim.cjs`, `newyear-compose-sim.cjs`, `newyear-api-sim.cjs`, `newyear-ui-sim.cjs` / 도구 `tools/newyear-sample.cjs`

## 3. 테스트 결과
- 신규 6개 모두 통과: 원문 구조(144=140+보충4, 4자 구·순서·주역명), 엔진(1964 甲辰 속견표 대조·윤달·설/입춘·작은달 30일·오류), 사주 연결(120명 다양성·읽기 전용), 조합(금지 표현 0·50명 겹침률 평균 16.7%·최대 52.9%), API(closed/free/paid·맛보기 서버 절단·회원×사주 권한·첫 열람 기록·관리자 검수·rev 충돌), 화면 정적 검사.
- 전체 테스트(tests/ 350여 개)를 변경 전(HEAD 사본)·후로 비교: **회귀 0**. 처음 비교에서 실패로 보인 11개는 USB 드라이브 동시 접근 오류(errno -4094)였고 하나씩 다시 실행하면 모두 통과. 양쪽에서 똑같이 실패하는 74개는 기존 실패(브라우저·라이브 서버 필요 등, 예: coherent-reading-flow·journey·quest·ik).
- 엔진 기준선(`engine-baseline-sim`) 일치, 결제·회원(`commerce`·`account`·`naver/google-login`), 관리자 메뉴 검사 통과.
- 로컬 화면(내장 브라우저): 신년운세 입력→맛보기→관리자 전체→12개월→이어보기→연결 끊김 복구→PDF용 화면, 모바일 375px 가로 넘침 없음 / 관리자 탭 수정·승인·미리보기 / 상품 안내·무빙툰 화면 정상.
- 참고: 전체 테스트 실행 중 일부 테스트가 결과 파일 6개(`docs/AGENTIC_RAG_*`, `MOVINGTOON_*`, `INDEPENDENT_32_…`, `READING_CONSISTENCY_AUDIT.md`)를 다시 썼다(작업 전부터 수정 상태였던 테스트 출력 파일). 커밋 대상 아님.

## 4. 미해결 문제·남은 결정
### 원문
1. 규장각본 판독 불가 21칸(□, 보수 종이·찢김) — 보충본은 계통이 달라 대신 채우지 않음.
2. 보충 4괘(663·711·862·863)는 계통이 다른 필사본이라 총론·짧은 구만 있고 월별 구 없음. 네 괘 모두 2027년에 나올 수 있음 → 이 괘를 받은 사람은 월별 토정 구 없이 사주 월운으로만 12개월이 채워짐.
3. 862·863의 같은 글자(扌+丰 꼴: 聲/擧/拜) 미확정(□).
4. 이 활자본은 '이미(已)'를 己 꼴로 찍음(28구) — 원문은 인쇄대로, 현대어는 뜻으로.
### 계산
5. 윤달생(같은 번호 평달)·그해 작은달 30일생(그믐 일진)은 판본 규정이 없어 정한 임시안 — 옵션으로 바꿀 수 있음.
### 콘텐츠
6. **검수 0건**: 2027년에 나오는 120괘 현대어와 사주 블록 131개를 사람이 읽고 관리자에서 승인해야 공개 화면이 채워짐.
7. 민감 원문 구절(상복·약·성씨·이성/자녀) 노출 방식, 방향(tone) 판단이 엇갈린 괘(253·532·851·343·353 등) 결정.
8. 사주 블록 말투 다듬기("~수 있어요" 빈도, '원국' 용어 잔존).
### 상품·결제·법무
9. 실제 결제창·로그인 이동은 로컬에 키가 없어 미확인 → 배포 후 테스트 채널 결제 1회 필요.
10. 연도 상품 판매 기간 자동 종료 없음(관리자에서 수동 '판매 안 함').
11. KPN 서브몰 심사에 신규 상품 신고 필요 여부 확인(사용자 몫), 약관·환불정책에 신년운세 문구 추가(배포 때).
12. 김혁제 한글 풀이는 저작권 확인 전이라 쓰지 않음. 규장각·국립중앙도서관 이미지는 판독에만 썼고 서비스에 싣지 않음(이미지 이용 조건 기관 문의 권장).
13. 1차 판독 중 보조 에이전트 1개가 승인 없이 규장각 이미지 몇 장을 내려받음(저장소 밖 scratchpad `tojeong/imgA_031/`) — 지울지 결정.
### 화면
14. 정미년 연출은 CSS(붉은 달·불씨·능선·양 별자리)로만 — 무빙툰 영상·삽화 에셋은 별도 제작 필요.
15. PDF는 브라우저 인쇄 창의 'PDF로 저장' 방식(서버 PDF 아님), 실제 저장 단계는 미확인.
### 관리자
16. 검수자 이름은 자기 신고(이 브라우저의 검수자 이름 설정)이며, 승인=즉시 공개(별도 게시 스냅샷·롤백은 없고 이력만 남음).

## 5. 배포 전 순서(제안)
1) 커밋(내 파일만, 판독 사진 제외) → 2) "배포해 줘" 승인 시 main 푸시·Cloudflare 배포 확인 → 3) 관리자에서 문구 검수·승인 → 4) 결제·상품에서 tj2027 가격 입력 → 5) 신년운세 공개 범위 '유료' → 6) 테스트 결제 1회·환불 확인 → 7) 약관·KPN 정리.
2028년: `report/newyear/years/2028/pack.js` 추가 + `functions/_newyear-runtime.js` import·목록에 추가 + 상품 `tj2028` 추가. 2028년은 중괘 2·3·4·6만 나와 가능한 괘가 96개.
