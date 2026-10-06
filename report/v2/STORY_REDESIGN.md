# 인생 지도 흐름(Life Flow) — 설계·매핑·남은 계산 모델

열기: `/report/v2/?flow=life` (QA: `&qa=1992-06-23,01:30,M`, 잠금 시험: `&gate=1`). 기본 흐름(`?flow` 없음)은 그대로다.
관리자: "스토리 플로우" 탭(report/admin/v2-story.js). 검증: `node tests/story-director-sim.js`.

## 계층
```
Manse(engine.js, 변경 없음) → SajuData(sd) → StoryDirector(story-director.js, 순수 함수)
→ life.js(그리기) / 기존 reader(챕터 재생) / 관리자 미리보기
```
- StoryDirector 는 엔진 값을 읽기만 한다. 관심 분야는 **순서·무료/잠금·강조**만 바꾸고 원국·대운·세운·점수는 바꾸지 않는다(테스트로 확인).
- 시간축 값 출처: 대운/세운/월운 = `evaluateLuck`의 계절(flow), 돈·사랑 = `evaluateDomainLuck(...).wealth/love`, 직업 = `careerLuckActivation × careerProfile 상위 3분야`.

## 흐름
PROLOGUE(첫 질문 → 인생 전체 지도, 대운 10개 → 10년 → 연도 → 12개월 확대, 종합/돈/직업/사랑/관계 탭)
→ ACT1 YOU ARE HERE(현실 언어 + [왜 이렇게 나오나요?] 근거)
→ ACT2 관심 분야 7종 → ACT3 이야기 순서(StoryDirector.flow) → 각 단계 = 기존 챕터 재생 또는 엔진 시간축 카드
→ FINAL 버릴 것/지킬 것/시작할 것(1~3개) → 개운·사용설명서(c19·c20)

## 기존 챕터 → 질문 모듈 매핑
| 기존 챕터 | 질문 모듈(분야) |
|---|---|
| c00 총평 | prologue_verdict(선택) |
| c01 일주 | self_who |
| c02 오행 | self_force |
| c03 성격 | self_who |
| c04 재능 | career_talent, self_talent |
| c05 약점·그림자 | money_leak, self_shadow |
| c06 직업 적성 | career_style, money_style |
| c07 성공 방식 | career_success |
| c08 재물 | money_nature |
| c09 연애 | love_style |
| c10 결혼 | marriage_who |
| c11 대인관계 | relation_style |
| c12 궁합 | love_match, relation_match |
| c13 가족 | relation_family |
| c14 오래된 뿌리 | self_root |
| c15 인생 계절(대운) | future_cycle |
| c16 현재 대운 | future_now |
| c17 올해 | future_year |
| c18 12개월 | future_months |
| c19 개운 / c20 사용설명서 | act_remedy |

시간축 신규 모듈(엔진 실데이터): money_timing, career_timing, love_timing, marriage_timing(연애 지수 대용), future_3_5_10.

## 아직 없는 것 (가짜 값 대신 비활성/대용으로 표시)
1. **관계 탭** — 인간관계 시간축 점수 모델 없음. 탭은 비활성. 필요: 비겁·관성·인성의 시기별 활성/충돌 모델(`DOMAIN_KEYS`에 relation 추가, 원국 적합도·활성도·안정성 3성분).
2. **결혼 전용 시기** — 배우자성·배우자궁 활성 모델 없음. 지금은 연애 지수를 "인연·관계 변화"로만 표기(proxy 표시). 필요: 배우자성(남 재성/여 관성)·일지 합충 시기 점수.
3. **세부 질문 콘텐츠** — c08 안에 "돈이 안 모이는 이유/반복 실수/직장·사업 비교" 등이 한 챕터로 묶여 있음. 질문별 전용 모듈은 관리자 "해석 모듈"에 추가해야 완전 분리됨.
4. **결제** — v2 뷰어에는 결제 시스템이 없다(story 온보딩의 구매 버튼만 있음). 잠금은 `?gate=1`일 때만 화면에 표시되고 "전체 열기" CTA 는 안내만 한다. 결제 연결 지점: `life.js` 의 `lfOpenAll`/`life_locked_click`.
5. **직업 시간축** — 활성도만 반영(분야 적합도는 원국 고정값). 직업 시기 점수의 가중치 검증(분포 시뮬레이션) 필요.
6. **PDF 역할 분리** — pdf.js 는 그대로(명리 근거·그래프). 무빙툰↔PDF 중복 정리는 다음 단계.

## 2차 구현 (관계·결혼 AI 추정, 새 문체 카드, 개인화 순서)
- **관계·결혼 시기** — 사용자 결정으로 AI 가 추정한다. `functions/api/life-ai.js` + `functions/_lifeai.js`(검증·프롬프트·sanitize·캐시). 입력은 간지·십성·합충 요약뿐(생년월일·이름 없음), 응답은 범위·금지어·미성년 해를 걸러 낸다. 서버 키가 없거나 실패하면 `StoryDirector.social()` 의 규칙 추정(배우자성·일지 합충, 비겁/관성/인성+합충)을 쓴다. 화면·관리자에는 항상 "AI 추정/규칙 추정"을 표시한다. 설정: ANTHROPIC_API_KEY/OPENAI_API_KEY, KV GLOSSARY_KV(30일 캐시), LIFEAI_HOURLY_LIMIT(기본 6).
- **새 문체** — `story-composer.js`: 돈·일·연애·결혼·인간관계·나 자신 × 십성군 5종, 한 장면 한 주장(결론→현실→예시→장점→함정→행동→근거). 직장인/프리랜서/사업자 예시는 돈·일에서 2개만. 끝에서 기존 챕터로 "더 깊이 읽기".
- **개인화 순서** — `StoryDirector.personalize`: 방어·전환기엔 올해·앞날을, 기회·확장·수확기엔 "언제" 카드를 앞으로(구성·무료 규칙은 동일, 이유 표시).
- **용어 UX** — 심화 챕터 제목을 질문형으로, 명리 용어는 부제로(예: 나는 왜 이렇게 행동할까? / 경오일주 · 庚午).
- **아직 안 한 것**: 결제 연동, PDF↔무빙툰 역할 분리, 기존 챕터 본문 문체 전면 재작성(기존 챕터는 그대로 재생), 실서버 AI 호출 검증(키 필요).
