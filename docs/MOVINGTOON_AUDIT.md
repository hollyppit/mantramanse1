# 무빙툰 개선 분석 보고서 (2026-10-13)

## 조사 범위와 증거
로컬 소스와 tests를 조사했다. 운영 DB·R2의 실제 데이터 수량과 배포 상태는 조회하지 않았으므로 확인되지 않았다. NEXT_PLAN.md의 운영 기록은 과거 기록이며 현재 상태로 단정하지 않는다. 사용자 변경인 NEXT_PLAN.md와 외부툴_프롬프트는 보존한다.

| 영역 | 구현 근거 | 실제 구현 / 한계 |
|---|---|---|
| 원국·달력 | engine.js pillarsFor, yearPillarAt, monthPillarAt, lunarToSolar, localSolar | 입춘·절입·한국 시간대·지역 태양시·야자시 옵션·음력·시간 미상 구현. 독립 천문 역법 정답과 일치하는지는 별도 검증 필요 |
| 대운·세운·월운 | engine.js daeun, seunRange, wolun, evaluateLuckFlow | 계산과 원국/운 관계 평가 구현. 점수는 모델의 값이며 실제 사건 확률이 아님 |
| 신강약·통근 | engine.js strength 및 natalRoots/currentRootSupport, report/v2/saju-data.js roots/currentRoots | 원국과 현재 운 보강을 분리. 임계값·가중치는 모델 해석 |
| 조후·억부·용신 | engine.js climate, yongsin, methodAdvice; saju-data.js usefulElementMethods | 학파별 후보·근거 제공. _movingtoon-reading.js는 AI가 기준을 종합 선택하도록 허용하여 계산 확정값과 혼동 가능 |
| 십성·신살·격국·합충형해파 | engine.js tenGod, sinsalFor, patterns, relationsAmong | 룰 기반 구현. 모든 학파·문헌을 포괄하거나 검증했다고 할 수 없음 |
| 풀이 모듈 DB | content*.js, rules.js, content-meta.js, /api/report-content | 조건 선택·템플릿·검수 계층 구현. 근거 정책 off 기본으로 미검수 레거시 노출 가능 |
| 별도 지식 DB | functions/_ik.js, _ikstore.js, /api/ik, /api/src | 조건·제외·보정·충돌·검수·출처·theory 구현. 모듈 DB와 병행 |
| AI | _compose.js, _lifeai.js, _reading-answer.js, _movingtoon-reading.js, _guard.js | 원국 입력·근거 refs·공급자 폴백·캐시·일부 모순 거부 구현. refs만으로 모든 문장의 진실성을 증명하지 못함 |
| 화면 | chapters.js → compose.js → Deep.augment → LifeDoc.build → viewer.js → reader.js | 기본 21개(c00 포함), 심층/인생 챕터 추가. 관심사 순서와 세계 지도 사용. 15주제 고정 흐름과 공통 8요소는 미구현 |
| 보존 기능 | hub-onboard.js, char-intro.js, epic-intro.js, media.js, reader.js | 입력 슬라이드·소개·인트로·영상 매핑·자동 스크롤 구현. 관리자 설정 유지 필요 |
| 관리자 | report/admin/v2-content.js, v2-ik.js, v2-style.js, v2-quality.js, v2-assets.js | 조건·해석·장단점·행동·검수·충돌·에셋·문체·속도 점검 구현. 공통 설명 완성도 검사는 미구현 |
| 저장 | functions/_store.js, _ikstore.js, supabase/schema.sql | KV 호환 Supabase kv 테이블 및 Cloudflare KV/R2. 로컬만으로 운영 데이터 검증 불가 |
| PDF | report/v2/pdf.js, viewer.js repPdf/plainRep | 브라우저 A4 HTML 래스터화. 웹과 다른 기본 챕터 사용; 고정 높이 overflow:hidden은 긴 내용 누락 위험 |
| 오디오 | bgm.js, functions/api/tts.js, 관리자 음성 실험 | 기존 코드 존재. 이번 작업에서 TTS·효과음 추가/활성화 없음 |

## 확인한 문제
1. deep_proscons는 일간 고정 성격과 단일 비중으로 단정하는 문장이 있어 원국 조건 결합이 부족하다.
2. LifeDoc는 인생 지도를 먼저 보여주고 건강은 시간축 뒤에 배치; 요청 순서와 다르다.
3. 웹과 PDF가 다른 문서로 구성된다.
4. AI는 챕터별 병렬 생성이므로 다른 챕터에서 실제 생성한 문장과 비교하지 못한다.
5. 신살·격국 명칭의 미등록 생성은 일반 refs 검사만으로 충분히 차단되지 않는다.
6. 기존 엔진 120명식 기준선 일치 확인. 이는 기존 결과 보존 증거이며 역법의 외부 정답 검증은 아니다.
