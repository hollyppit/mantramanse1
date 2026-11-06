# 운명의 타임라인 주제별 장 — 문안 겹침률 (2026-11-06)

가상 사주 600명 × 84장 · rebuild 문안 925개 · 다시 만들기: `node tools/reading-overlap.cjs 600`

**겹침률** = 무작위로 고른 두 사람이 그 장에서 **똑같은 문안 조합**을 받을 확률입니다. 0%에 가까울수록 사람마다 다르고, 100%면 모두 같은 글을 읽습니다.

측정은 오프라인 조립기(`editorial/rebuild-20261022/compose.mjs`)로 했습니다. 운영 화면과 같은 문안·같은 조건 계산(`deriveFacts`)을 쓰지만 고르는 개수·순서 규칙은 다를 수 있어, "조건 설계가 사람을 얼마나 가르는가"를 보는 지표입니다.

## 1. 한눈에 보기

| 항목 | 값 |
|---|---|
| 장 평균 겹침률 | **12%** |
| 두 사람이 똑같은 글을 받는 장 (실제 쌍 2,993개 평균) | 84장 중 **10.3장** (12%) |
| 겹침률 50% 이상인 장 | 1장 |
| 겹침률 25% 이상인 장 | 4장 |
| 장마다 나오는 서로 다른 결과 수 (중앙값) | 30가지 |
| 둘 다 글을 받은 경우만 본 겹침률 | 10% |
| **한 사람이 한 장에서 맞는 후보 문안 수 (평균)** | **1.2개** |
| **문안이 하나도 안 걸리는 장 보기 (평균)** | **15%** · 한 번이라도 비는 장 63개 |
| 1순위가 동점 해시로만 정해진 비율 (평균) | 19% · 50% 넘는 장 7개 |

### 읽는 법

- **겹침 자체는 낮습니다.** 두 사람이 같은 글을 받는 장은 84장 중 평균 10.3장입니다.
- **문제는 깊이와 빈칸입니다.** 한 사람이 한 장에서 맞는 문안이 평균 1.2개라, 장 하나가 사실상 문안 한 편(평균 1213자)으로 끝납니다. "여러 근거가 겹쳐 내 얘기 같다"는 느낌이 나기 어렵습니다.
- **장 보기의 15%는 맞는 문안이 없습니다.** 조건이 좁은 문안만 있어서 해당하지 않는 사람은 빈 장(또는 운영에서는 일반 문구)을 봅니다.
- **동점 해시 비율이 높은 장은 다양성이 가짜입니다.** 같은 조건에 걸린 문안 여러 개 중 하나를 생년 해시로 돌려 줄 뿐, 사주 차이로 갈린 것이 아닙니다.

## 2. 주제별

| 주제 | 장 | 평균 겹침률 | 맞는 후보(평균) | 빈 장 보기 | 동점 해시 | 평균 길이(자) |
|---|---:|---:|---:|---:|---:|---:|
| 커리어운 | 12 | 13% | 1.1 | 21% | 20% | 1240 |
| 창작·전생 | 8 | 14% | 1.3 | 7% | 0% | 1019 |
| 건강 | 10 | 14% | 1.1 | 19% | 20% | 1296 |
| 인연운 | 12 | 9% | 1.4 | 12% | 22% | 1289 |
| 개운법 | 8 | 10% | 1.1 | 8% | 21% | 1284 |
| 종합풀이(나) | 22 | 9% | 1.4 | 9% | 29% | 1171 |
| 재물운 | 12 | 20% | 0.9 | 32% | 11% | 1202 |

## 3. 장별 — 빈 장이 많은 순

"장 문안 수"는 그 장에 쓰인 문안 전체, "맞는 후보"는 한 사람에게 실제로 걸리는 평균 개수입니다.

| 장 | 빈 장 보기 | 맞는 후보 | 장 문안 수 | 동점 해시 | 겹침률 | 서로 다른 결과 | 가장 흔한 조합 |
|---|---:|---:|---:|---:|---:|---:|---|
| career_04 | 69% | 0.3 | 8 | 3% | 50% | 13 | `c04-leader` |
| wealth_06 | 64% | 0.5 | 7 | - | 43% | 9 | `w06-daewoon-mid` |
| self_19 | 52% | 0.6 | 19 | 1% | 28% | 54 | `self19-need-wood` |
| wealth_02 | 48% | 0.8 | 8 | 22% | 25% | 31 | `w02-expert` |
| love_06 | 48% | 0.7 | 8 | 19% | 26% | 26 | `l06-silent` |
| career_09 | 46% | 0.7 | 9 | 11% | 25% | 28 | `c09-team` |
| wealth_09 | 45% | 0.8 | 8 | 10% | 22% | 33 | `w09-friend-A` |
| wealth_04 | 44% | 0.7 | 7 | 10% | 23% | 19 | `w04-org-B` |
| wealth_11 | 39% | 0.7 | 7 | 4% | 25% | 16 | `w11-share-A` |
| health_01 | 38% | 1.0 | 9 | 27% | 17% | 33 | `h01-earth-over-water` |
| wealth_03 | 38% | 0.8 | 7 | 21% | 18% | 25 | `w03-share` |
| health_03 | 37% | 1.0 | 8 | 28% | 16% | 35 | `h03-eat` |
| wealth_08 | 37% | 0.8 | 7 | 12% | 18% | 16 | `w08-aggressive-B` |
| career_03 | 35% | 1.1 | 10 | 32% | 14% | 40 | `c03-paein-A` |
| self_17 | 33% | 0.8 | 12 | 2% | 17% | 26 | `self17-bigeop-siksang-lead` |
| health_08 | 32% | 1.1 | 8 | 28% | 13% | 44 | `h08-duty-over` |
| self_12 | 31% | 1.1 | 10 | 27% | 13% | 51 | `self12-bigeop-jaeseong` |
| wealth_07 | 29% | 1.0 | 8 | 22% | 14% | 37 | `w07-partner-A` |
| health_07 | 28% | 1.3 | 7 | - | 12% | 16 | `h07-daewoon-A` |
| love_02 | 27% | 1.1 | 10 | 32% | 9% | 78 | `l02-pyeonin` |
| remedy_06 | 27% | 1.1 | 10 | 32% | 9% | 74 | `r06-pyeonin` |
| career_07 | 25% | 1.0 | 8 | 20% | 12% | 35 | `c07-obey` |
| career_06 | 25% | 0.9 | 8 | 17% | 12% | 27 | `c06-team` |
| self_02 | 25% | 1.0 | 12 | 20% | 11% | 25 | `self02-weak-fuelburn` |
| wealth_05 | 24% | 1.0 | 9 | 21% | 14% | 25 | `w05-balanced` |
| career_02 | 21% | 1.3 | 10 | 41% | 6% | 76 | `c02-pyeongwan` |
| health_04 | 20% | 0.9 | 6 | 11% | 20% | 16 | `h04-rival-A` |
| love_08 | 20% | 1.3 | 14 | - | 7% | 52 | `l08-seun-day-fric-steady` |
| love_05 | 19% | 0.9 | 12 | 9% | 9% | 20 | `l05-m-weak-steady` |
| health_06 | 18% | 1.4 | 8 | 46% | 7% | 32 | `h06-chung-steady` |
| remedy_01 | 17% | 1.3 | 8 | 39% | 7% | 32 | `r01-siksang-steady` |
| career_10 | 14% | 1.6 | 10 | 51% | 5% | 48 | `c10-hwagae-steady` |
| self_07 | 9% | 1.5 | 12 | 48% | 4% | 66 | `self07-siksang-weak-steady` |
| career_05 | 7% | 1.3 | 10 | 31% | 5% | 47 | `c05-earth-steady` |
| career_11 | 7% | 1.3 | 10 | 31% | 10% | 36 | `c11-bigeop-steady` |
| creative_01 | 7% | 1.3 | 10 | - | 14% | 10 | `cr01-bigeop-lead` |
| creative_02 | 7% | 1.3 | 10 | - | 14% | 10 | `cr02-bigeop-lead` |
| creative_03 | 7% | 1.3 | 10 | - | 14% | 10 | `cr03-bigeop-lead` |
| creative_04 | 7% | 1.3 | 10 | - | 14% | 10 | `cr04-bigeop-lead` |
| creative_05 | 7% | 1.3 | 10 | - | 14% | 10 | `cr05-bigeop-lead` |
| creative_06 | 7% | 1.3 | 10 | - | 14% | 10 | `cr06-bigeop-lead` |
| creative_07 | 7% | 1.3 | 10 | - | 14% | 10 | `cr07-bigeop-lead` |
| creative_08 | 7% | 1.3 | 10 | - | 14% | 10 | `cr08-bigeop-lead` |
| health_02 | 7% | 1.3 | 10 | 31% | 10% | 35 | `h02-bigeop-steady` |
| health_10 | 7% | 1.3 | 10 | 31% | 10% | 35 | `h10-bigeop-steady` |
| love_01 | 7% | 1.3 | 10 | 31% | 10% | 37 | `l01-bigeop-steady` |
| love_04 | 7% | 1.3 | 10 | 31% | 10% | 36 | `l04-bigeop-steady` |
| love_12 | 7% | 1.3 | 10 | 31% | 10% | 35 | `l12-bigeop-steady` |
| remedy_02 | 7% | 1.3 | 10 | 31% | 10% | 37 | `r02-bigeop-steady` |
| remedy_03 | 7% | 1.3 | 10 | 31% | 10% | 37 | `r03-bigeop-steady` |
| remedy_07 | 7% | 1.3 | 10 | 31% | 10% | 37 | `r07-bigeop-steady` |
| self_05 | 7% | 1.3 | 25 | 31% | 4% | 86 | `self05-bi-bi` |
| self_06 | 7% | 1.3 | 10 | 31% | 10% | 36 | `self06-bigeop-steady` |
| self_10 | 7% | 1.3 | 10 | 31% | 5% | 47 | `self10-earth-steady` |
| self_15 | 7% | 1.3 | 10 | 31% | 9% | 42 | `self15-bigeop-rooted` |
| self_04 | 7% | 2.0 | 22 | 58% | 4% | 122 | `self04-gungeopjaengjae-steady` |
| love_09 | 7% | 2.2 | 14 | 30% | 3% | 70 | `l09-day-friction-steady+l09-day-hyeong-steady` |
| wealth_12 | 6% | 0.9 | 9 | - | 13% | 9 | `w12-weak-mid` |
| wealth_01 | 6% | 1.5 | 12 | 9% | 8% | 35 | `w01-bowl-weak-steady` |
| self_09 | 5% | 2.9 | 14 | 81% | 2% | 93 | `self09-hyeong-steady+self09-chung-steady` |
| self_11 | 3% | 2.7 | 14 | 84% | 2% | 94 | `self11-hwagae-steady+self11-cheonmun-steady` |
| love_03 | 1% | 1.8 | 6 | 80% | 10% | 14 | `l03-chung-steady+l03-hap-steady` |
| self_08 | 0% | 2.9 | 8 | 95% | 2% | 56 | `self08-gwanseong-mid+self08-jaeseong-mid` |
| career_01 | - | 1.0 | 10 | - | 11% | 10 | `c01-metal-steady` |
| health_05 | - | 1.0 | 8 | - | 13% | 8 | `h05-autumn-rooted` |
| health_09 | - | 1.0 | 7 | - | 16% | 7 | `h09-wood` |
| remedy_04 | - | 1.0 | 8 | - | 13% | 8 | `r04-autumn-steady` |
| remedy_05 | - | 1.0 | 10 | - | 11% | 10 | `r05-metal-steady` |
| remedy_08 | - | 1.0 | 12 | - | 10% | 12 | `r08-fire-steady` |
| self_01 | - | 1.0 | 30 | - | 4% | 30 | `self01-byeong-weak` |
| self_03 | - | 1.0 | 30 | - | 6% | 25 | `self03-bigyeon-strong` |
| self_13 | - | 1.0 | 12 | - | 10% | 12 | `self13-fire-steady` |
| self_14 | - | 1.0 | 12 | - | 10% | 12 | `self14-fire-steady` |
| self_18 | - | 1.0 | 8 | - | 13% | 8 | `self18-autumn-steady` |
| self_22 | - | 1.0 | 6 | - | 19% | 6 | `self22-balanced-rooted` |
| career_12 | - | 1.2 | 18 | - | 5% | 30 | `c12-jaeseong-now` |
| self_20 | - | 1.2 | 20 | - | 6% | 28 | `self20-gwanseong-weak` |
| self_21 | - | 1.2 | 18 | - | 5% | 30 | `self21-jaeseong-now` |
| wealth_10 | - | 1.2 | 9 | - | 13% | 18 | `w10-good-steady` |
| love_10 | - | 1.2 | 12 | - | 9% | 19 | `l10-parent-inseong-steady` |
| career_08 | - | 1.4 | 13 | - | 5% | 30 | `c08-jaeseong-steady` |
| love_07 | - | 1.9 | 16 | - | 2% | 67 | `l07-palace-siksang-steady+l07-f-star-mid` |
| self_16 | - | 2.0 | 10 | 98% | 6% | 29 | `self16-bi-strong-steady+self16-gwan-mid-steady` |
| love_11 | - | 2.1 | 18 | - | 2% | 72 | `l11-palace-gwanseong-steady+l11-m-child-mid` |

### 동점 해시로 갈리는 장 (50% 이상)

| 장 | 동점 해시 | 맞는 후보 |
|---|---:|---:|
| self_16 | 98% | 2.0 |
| self_08 | 95% | 2.9 |
| self_11 | 84% | 2.7 |
| self_09 | 81% | 2.9 |
| love_03 | 80% | 1.8 |
| self_04 | 58% | 2.0 |
| career_10 | 51% | 1.6 |

## 4. 너무 많은 사람에게 나오는 문안 (40% 이상)

한 문안이 사람의 40% 이상에게 나오면, 그 장은 사실상 공통 문장으로 시작합니다. 조건 열은 그 문안이 거는 조건입니다.

| 문안 ID | 장 | 받는 사람 | 조건 |
|---|---|---:|---|
| `l03-hap-steady` | love_03 | 51% | strength, relation |
| `self15-bigeop-rooted` | self_15 | 45% | group, rootLevel |
| `h04-rival-A` | health_04 | 44% | strength, group |
| `self16-bi-strong-steady` | self_16 | 44% | strength, group |
| `c11-bigeop-steady` | career_11 | 44% | strength, group |
| `h02-bigeop-steady` | health_02 | 44% | strength, group |
| `h10-bigeop-steady` | health_10 | 44% | strength, group |
| `l01-bigeop-steady` | love_01 | 44% | strength, group |
| `l04-bigeop-steady` | love_04 | 44% | strength, group |
| `l12-bigeop-steady` | love_12 | 44% | strength, group |
| `r02-bigeop-steady` | remedy_02 | 44% | strength, group |
| `r03-bigeop-steady` | remedy_03 | 44% | strength, group |
| `r07-bigeop-steady` | remedy_07 | 44% | strength, group |
| `self06-bigeop-steady` | self_06 | 44% | strength, group |

## 5. 실제로 고른 문안이 맞춘 조건

뽑힌 문안이 어떤 조건으로 맞았는지 셌습니다. 위쪽 몇 개에 몰려 있을수록 "같은 유형끼리 같은 글"이 됩니다.

| 조건 | 비율 |
|---|---:|
| strength | 34% |
| group | 29% |
| tenGod | 6% |
| positionTG | 4% |
| methodDifference | 2% |
| el | 2% |
| relation | 2% |
| pattern | 2% |
| star | 2% |
| yongEl | 2% |
| season | 2% |
| gender | 2% |
| daewoonStemTG | 2% |
| rootLevel | 2% |
| dayMaster | 2% |
| daewoonChangeIn | 1% |
| seunSeason | 1% |
| daewoonSeason | 1% |
| natalDayRelation | 1% |
| daewoonNextStemTG | 1% |
| seunStemTG | 1% |
| seunDayRelation | 0% |
| daewoonDayRelation | 0% |

## 6. 두 사람 사이 같은 장 비율 분포

| 같은 글을 받는 장 비율 | 쌍 비율 |
|---|---:|
| 0~9% | 59% |
| 10~19% | 25% |
| 20~29% | 5% |
| 30~39% | 5% |
| 40~49% | 5% |
| 50~59% | 1% |
| 60~69% | 0% |

## 7. 다음에 할 일

1. **빈 장부터 메우기** — 빈 장 보기가 30% 넘는 17개 장에, 누구에게나 걸리는 넓은 조건의 바탕 문안(예: 일간·월지·용신 오행)을 하나씩 둡니다. 가장 급한 주제는 **재물운**(빈 장 32%, 맞는 후보 0.9개)입니다.
2. **장마다 층을 쌓기** — 한 장에 바탕(넓은 조건) + 특징(좁은 조건: 일주·신살·일지 합충·공망) + 시기(대운·세운 연도) 세 층이 함께 걸리게 해서, 맞는 후보를 1.2개에서 3개 이상으로 올립니다.
3. **동점 해시 장 정리** — 동점 해시가 50% 넘는 7개 장은 같은 조건 문안들의 조건을 서로 다르게 나눠, 사주 차이로 갈리게 합니다.
4. **넓게 걸리는 공통 문안 손보기** — 4번 표의 문안(14개)은 조건이 신강·신약과 십성 묶음뿐이라 사람 40% 이상에게 같은 글로 나옵니다. 두 번째 조건을 더해 갈래를 나눕니다.

운영 화면은 게시된 라이브러리로 조립하므로, 빈 장에 실제로 무엇이 보이는지(일반 문구 대체 여부)는 운영 화면에서 따로 확인해야 합니다.
