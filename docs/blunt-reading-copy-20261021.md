# 풀이 문구 전면 재작성 · 솔직하고 생활밀착형으로 · 2026-10-21

## 왜 고쳤나

"~한 모습으로 드러날 수 있지만 ~에서는 장점이 될 수 있습니다" 같은 보고서식 문장이 읽는 사람에게 와닿지 않았다. 그래서 AI 호출 없이 사전 작성 문안을 고르는 구조는 그대로 두고, 문안 자체를 다시 썼다.

- 추상적인 조건 나열 → 카톡 읽씹, 월급날, 회식 같은 장면으로 바로 말한다.
- "~할 수 있어요" 식 유보 → "~하죠?", "~예요"처럼 솔직하게 말하고, 현실적인 결말로 맺는다.
- 십성·신강신약 같은 용어는 본문에서 뺀다(근거 접기 영역에는 남아 있다).
- 모든 챕터는 후킹 문구(첫 문장)로 시작한다. 화면의 큰 제목(`.reading-hook`)이 이 첫 문장이다.

## 무엇을 바꿨나

| 구간 | 파일 | 내용 |
|---|---|---|
| 본문 5개 역할 | `functions/_reading-conditional-bodies.js` | 76챕터 × 3구간(강·중·약) × 5문단 = 1,140문단 전부 재작성 |
| 오프닝(후킹) | `_reading-direct-openings.js`, `_reading-narrative-openings.js` | 76챕터 × 3 = 228개. 모두 "후킹 문장 + 이어지는 문장" 2문장 이상 |
| 프로필 조합 문안 | `_reading-profile-copy.js`(신규), `_reading-focus-eight.js`, `_reading-detail-profiles.js` | 5개 프로필 × 9개 챕터 + 대운 전환점 9개 조합. 십성 용어와 `〔슬롯〕`식 조립 제거 |
| 건강·안전 장 | `_reading-guide-copy.js` | 10챕터 × 6문단. 질병·사고 예측 없이 생활 습관·안전 점검 중심 |
| 신살 | `report/v2/everyday-reading.js` | 현침살 5개 장 재작성 + 홍염살·괴강살·양인살·천을귀인·문창귀인·학당귀인 추가. 차트에 해당 신살이 있을 때만 표시 |
| 운 흐름 | `report/v2/luck-reading.js` | 십성 풀이 문장을 쉬운 말로. 장 주제(자기·재물·직업·연애)에 맞는 예시로 분리 |
| 전성기 장 | `report/v2/reading-peak.js` | "기운" 계열 설명을 쉬운 말로 |
| 화면 문구 | `report/v2/reading-text.js` | 소제목 정리, 건강 장도 첫 문장을 후킹 제목으로 |
| 기계적 치환 | `report/v2/plain-copy.js`, `polite-text.js` | "~하는 편이에요 → ~하는 특성을 갖고 있어요", "정하세요 → 정해 두면 좋아요" 등 문장을 딱딱하게 만들던 치환 제거. 물음표 문장의 어미 오변환 방지 |

일상 장면의 일반 예시를 본문 뒤에 또 붙이던 동작은 줄였다. 본문이 이미 장면을 담고 있기 때문이다. 짧은 예전 캐시 문장(60자 미만)과 창작 장에서만 예전처럼 덧붙인다.

## 예전 문장 → 지금 문장

> 사주에 현침살이 있어요. 이 이름을 생활에 빗대면 작은 차이가 눈에 잘 들어와 신경이 쓰이는 모습이에요. 예를 들어, 미용사가 머리 길이를 세밀하게 맞추거나…

> 사주에 현침살이 있어요. 바늘 같은 별이라 작은 말투와 표정, 어긋난 약속이 남들보다 따갑게 와닿아요. 예민하다는 소리를 듣지만 유별난 게 아니라 촉이 좋은 거예요. 이 촉은 미용사나 의료인, 정밀 세공처럼 세밀함이 실력인 일에서 장점이 돼요. 다만 알아챈 걸 그대로 말로 꺼내면 가까운 사람이 찔려요. 한 템포 늦춰서 말하세요.

> (돈이 안 남는 장, 약한 구간) 상황을 보고 지킬 건 지키고 넘길 건 넘겨요.

> 큰 소비는 없는데 편의점, 배달, 구독료가 쌓여 월말엔 통장이 허전해요. 하나하나는 작아서 낭비라고 느끼지 못하는데, 합쳐 보면 밥값 몇 번이에요.

## 검증

- 문안 린트(스크래치 도구): 금지어·용어 노출·평어체 종결·중복·길이 검사 0건.
- 22개 가상 명식 × 84챕터 = 1,848개 화면 렌더링에서 본문에 숨겨진(근거로 밀려난) 문장 0건, 후킹이 1문장인 챕터 0건, 운 흐름 장을 제외한 챕터 간 문장 중복 0건.
- 영향 범위 테스트 75개와 전체 204개를 실행해 기준선(원본 HEAD)과 비교. 기준선에서 이미 실패하던 테스트 외에 새 실패는 없다.
  - 이번에 문구에 맞춰 고친 테스트: `everyday-scenes-sim`, `luck-everyday-sim`, `frank-reading-sim`, `live85-editorial-review-sim`.
  - 기준선에서도 실패하는 테스트(이번 작업과 무관): coherent-reading-flow, complete-reading-library, compound-reading, conditional-reading-library, content-db, editorial-headline, editorial, everyday-reading-visuals, full-flow-usability, health-narrative-flow, narrative-reading, plain-reading-media, reader-continuity, style, timeline84 외.

## 운영에 반영하려면

코드(`functions/`, `report/v2/`)를 배포하면 화면 표시 로직과 신살·운 흐름 문구는 바로 바뀐다. 하지만 **본문·오프닝은 운영 DB에 게시된 라이브러리(`ik:blocks:chapter:library.*`)가 우선**이라, 기존 게시본은 `tools/prepare-*-upgrade.cjs` 방식의 게시 SQL(CAS)로 새 문안을 다시 게시해야 바뀐다. `SEED_VERSION`은 `everyday-all-84-20261021-14`로 올렸다. 게시 전에는 관리자 화면에서 수정된 문장이 있는지 확인해야 한다(이전 작업의 가드가 같은 방식으로 막는다).

## 이번에 손대지 않은 것

- 창작(전생) 8개 장의 이야기 본문, 심층 분석 쪽 `deep.js`·`life-doc.js`의 신살 설명, 풀이 근거 접기 영역의 설명문은 그대로다.
- 경금·신약 프로필 묶음(`_reading-coherent-bundles.js`)은 이미 장면형이라 그대로 두었고 후킹 구조만 확인했다.

## 운영 게시 SQL (준비만 했고 실행하지 않음)

```
node tools/dump-seed-passages.cjs <수정 전 HEAD 사본> output/blunt-copy-20261021/old.json
node tools/dump-seed-passages.cjs . output/blunt-copy-20261021/new.json
node tools/prepare-blunt-copy-publication.cjs
```

- 결과: `output/blunt-copy-20261021/sql/<chapter>.sql` 76개(창작 8개 장 제외), `rollback/` 동일 구성, `plan.json`(챕터별 변경 수, 총 2,891문단).
- 각 SQL은 `ik:blocks:chapter:library.<chapter>` 행을 잠그고 `public.reading_compare_and_swap`으로 교체한다. 버전은 현재 값 + 1, 이전 판은 `history`에 보존한다.
- 가드: 초안≠게시본(미게시 관리자 수정)이면 중단. 문단은 **게시본 문장이 예전 시드 문장과 정확히 같을 때만** 교체하고, 관리자가 고친 문단은 그대로 둔 채 알림만 남긴다. id·조건·근거·시나리오는 건드리지 않는다.
- 로컬에 PostgreSQL이 없어 SQL을 실제로 실행해 보지는 못했다. 첫 챕터 하나를 먼저 적용하고 `/api/reading-library` 또는 관리자 화면에서 확인한 뒤 나머지를 적용하는 것을 권한다.
