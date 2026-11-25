# 유명인 생애 데이터 기반 운세 흐름 검증 — 1차 보고서

생성: 2026-11-25 · 엔진 해시 2d586294046803fe · 사람 30명 · 분석 사건 360건(중요도 2 이상, 출처 확인) · 가짜 명식 200개/사람

> 이 보고서는 사후 대조입니다. 유명인의 공개 사건과 엔진 값이 맞아 보이는 것을 예측 성공으로 보지 않습니다. 통계적 연관성은 인과가 아닙니다. 표본이 작아(30명 안팎) 수치는 방향을 보는 정도로만 읽어야 합니다.

## 1. 핵심 결과

| 가설 | 실제 값 | 95% 구간(사람 단위 부트스트랩) | 가짜 명식 평균 | 판정 |
|---|---|---|---|---|
| H1 긍정 사건 해 흐름 백분위 − 부정 사건 해 | 4.4점 (긍정 57.8 · 부정 53.4, n=112/118) | -4.1 ~ 12.1 | -0.2 | 무작위 기준보다 약간 큰 편이나 우연과 구분되지 않음(p 0.149) |
| H2 분야 지표 방향 일치율 | 48.4% (n=275) | 41.9 ~ 53.9% | 48.1% | 무작위 기준과 구분되지 않음(p 0.507, 가짜 명식 평균 0.481) |
| H3 변화 사건 해 변동성 백분위 | 48.1 (n=145) | — | 50.1 | 무작위 기준과 구분되지 않음(p 0.841, 가짜 명식 평균 50.13) |
| H4 나이·경력 기준 대비 AUC 증가 | -0.018 (기준 0.593 → +흐름 0.575, n=230) | — | -0.012 | 무작위 기준과 구분되지 않음(p 0.723, 가짜 명식 평균 -0.012) |

사건 전후 점수 변화(사건 해 흐름 − 직전 2년 평균): 긍정 4.1(n=112) · 부정 2.6(n=118) · 변화 -0.5(n=129)

### 1-1. 탐색적 결과(사전 등록 가설 아님)

- 긍정 사건 해의 흐름 백분위 평균: 실제 명식 **57.8** vs 가짜 명식 49.9 (가짜 명식 중 실제 이상인 비율 기준 경험적 p 0.005).
- 부정 사건 해: 실제 53.4 vs 가짜 50.1 — 부정 사건 해가 낮게 나오지 않음(기대와 반대 방향, p 0.866).
- 방향 일관성: dev 긍정 55.9 · test 긍정 60.1 · 스포츠 58.7 · 기업 60.6 · 문화예술 54.7 · 출생시간 앎 59.6 / 미상 51.6
- 민감도(같은 사람·같은 해·같은 성격 사건은 한 번만): 긍정 57.2(108건) · 부정 52.8(109건) · 변화 46.7(124건)
- 해석: 긍정 사건 해가 그 사람 평생 중 흐름 점수가 높은 쪽에 놓이는 경향은 무작위 명식보다 뚜렷했지만, 부정 사건 해도 낮지 않아 **흐름 점수가 "좋고 나쁨"보다 "사건·활동이 많은 해"를 따라가는지** 구분되지 않습니다. 사전 등록한 차이(H1)는 우연과 구분되지 않았으므로, 이 결과는 100명 이상 확대 검증에서 새 가설로 미리 등록해 확인해야 합니다. 여러 값을 본 뒤 고른 결과라 우연히 나왔을 가능성도 있습니다.

## 2. 나눠 본 결과

| 구분 | 그룹 | H1(점) | 긍정/부정 n | H2 일치율 | H2 n |
|---|---|---|---|---|---|
| 직업군 | 스포츠 | 4.8 | 41/42 | 48.5% | 101 |
| 직업군 | 기업 | 8.4 | 32/34 | 46.2% | 78 |
| 직업군 | 문화예술 | 0.8 | 39/42 | 50% | 96 |
| 나이대 | <30 | 5.7 | 45/30 | 44.1% | 93 |
| 나이대 | 30-44 | 4.1 | 36/48 | 50.9% | 106 |
| 나이대 | 45+ | 2.7 | 31/40 | 50% | 76 |
| 출생시간 | 시간 앎 | 5.9 | 88/99 | 50% | 226 |
| 출생시간 | 시간 미상 | -0.4 | 24/19 | 40.8% | 49 |
| 분할 | dev | 3.5 | 60/57 | 48.9% | 141 |
| 분할 | test(최종) | 5.8 | 52/61 | 47.8% | 134 |

> 그룹마다 사건 수가 적어 그룹 간 차이는 우연일 가능성이 큽니다. test 그룹은 방법 점검(dev)에 쓰지 않은 사람들입니다.

## 3. 인물별 출생정보 신뢰도

| 사람 | 직업 | 출생 | 출생시간 | 신뢰도 | 출처 | 분할 | 사주 |
|---|---|---|---|---|---|---|---|
| 로버트 다우니 주니어 (Robert Downey Jr.) | actor | 1965-04-04 Manhattan, New York | 13:10 | 진술(A) | https://www.astro.com/astro-databank/Downey,_Robert_Jr. (Rod | dev | 乙巳 己卯 戊子 己未 (통관) |
| 브리트니 스피어스 (Britney Spears) | pop singer | 1981-12-02 McComb, Mississippi | 01:30 | 진술(A) | https://www.astro.com/astro-databank/Spears,_Britney (Rodden | test | 辛酉 己亥 甲寅 乙丑 (조후) |
| 휘트니 휴스턴 (Whitney Houston) | singer, actress | 1963-08-09 Newark, New Jersey | 20:55 | 확인(AA) | https://www.astro.com/astro-databank/Houston,_Whitney (Rodde | dev | 癸卯 庚申 甲申 甲戌 (격국) |
| 엘비스 프레슬리 (Elvis Presley) | singer, actor | 1935-01-08 Tupelo, Mississippi | 04:35 | 확인(AA) | https://www.astro.com/astro-databank/Presley,_Elvis (Rodden  | test | 甲戌 丁丑 甲申 丙寅 (억부) |
| 마릴린 먼로 (Marilyn Monroe) | actress | 1926-06-01 Los Angeles, California | 09:30 | 확인(AA) | https://www.astro.com/astro-databank/Monroe,_Marilyn (Rodden | test | 丙寅 癸巳 辛酉 癸巳 (억부) |
| 마돈나 (Madonna) | singer, songwriter, actress | 1958-08-16 Bay City, Michigan | 07:05 | 확인(AA) | https://www.astro.com/astro-databank/Madonna (Rodden AA, &quot;Qu | dev | 戊戌 庚申 乙丑 己卯 (억부) |
| 스티븐 킹 (Stephen King) | novelist | 1947-09-21 Portland, Maine | 01:30 | 진술(A) | https://www.astro.com/astro-databank/King,_Stephen (Rodden A | dev | 丁亥 己酉 癸卯 壬子 (억부) |
| 스티븐 스필버그 (Steven Spielberg) | film director, producer | 1946-12-18 Cincinnati, Ohio | 18:16 | 확인(AA) | https://www.astro.com/astro-databank/Spielberg,_Steven (Rodd | test | 丙戌 庚子 丙寅 丁酉 (억부) |
| 윤여정 (Youn Yuh-jung) | actress | 1947-06-19 unverified (commonly reported Kaesong; not confirmed in cited sources) | — | 미상 | — | dev | 丁亥 丙午 己巳 ?? (조후) |
| 봉준호 (Bong Joon Ho) | film director, screenwriter | 1969-09-14 Daegu (Bongdeok-dong) | — | 미상 | — | dev | 己酉 癸酉 壬辰 ?? (억부) |
| 스티브 잡스 (Steve Jobs) | Technology; co-founder/CEO of Apple, CEO of NeXT, chairman of Pixar | 1955-02-24 San Francisco | 19:15 | 확인(AA) | https://www.astro.com/astro-databank/Jobs,_Steve (Rodden AA, | test | 乙未 戊寅 丙辰 戊戌 (억부) |
| 빌 게이츠 (Bill Gates) | Software; co-founder/CEO of Microsoft, philanthropist | 1955-10-28 Seattle | 22:00 | 진술(A) | https://www.astro.com/astro-databank/Gates,_Bill (Rodden A,  | dev | 乙未 丙戌 壬戌 辛亥 (억부) |
| 워런 버핏 (Warren Buffett) | Investing; chairman/CEO of Berkshire Hathaway | 1930-08-30 Omaha | 15:00 | 진술(A) | https://www.astro.com/astro-databank/Buffett,_Warren (Rodden | test | 庚午 甲申 壬子 丁未 (억부) |
| 마사 스튜어트 (Martha Stewart) | Media/lifestyle; founder of Martha Stewart Living Omnimedia | 1941-08-03 Jersey City | 13:33 | 확인(AA) | https://www.astro.com/astro-databank/Stewart,_Martha (Rodden | test | 辛巳 乙未 癸未 戊午 (조후) |
| 리 아이아코카 (Lee Iacocca) | Automotive; president of Ford, chairman/CEO of Chrysler | 1924-10-15 Allentown | 17:00 | 확인(AA) | https://www.astro.com/astro-databank/Iacocca,_Lee (Rodden AA | test | 甲子 甲戌 丁卯 戊申 (격국) |
| 리처드 브랜슨 (Richard Branson) | Conglomerate; founder of Virgin Group (records, airlines, space) | 1950-07-18 Blackheath, London | 07:00 | 진술(A) | https://www.astro.com/astro-databank/Branson,_Richard (Rodde | dev | 庚寅 癸未 甲寅 丁卯 (억부) |
| 루퍼트 머독 (Rupert Murdoch) | Media; founder/chairman of News Corp and Fox Corp | 1931-03-11 Melbourne | 23:59 | 진술(A) | https://www.astro.com/astro-databank/Murdoch,_Rupert (Rodden | test | 辛未 辛卯 丙寅 戊子 (억부) |
| 베르나르 아르노 (Bernard Arnault) | Luxury goods; chairman/CEO of LVMH | 1949-03-05 Roubaix | 17:00 | 확인(AA) | https://www.astro.com/astro-databank/Arnault,_Bernard (Rodde | dev | 己丑 丙寅 甲午 壬申 (억부) |
| 일론 머스크 (Elon Musk) | Technology; founder of Zip2, X.com/PayPal, SpaceX; CEO of Tesla | 1971-06-28 Pretoria | — | 미상 | https://www.astro.com/astro-databank/Musk,_Elon lists 07:30  | dev | 辛亥 甲午 甲申 ?? (조후) |
| 이건희 (Lee Kun-hee) | Conglomerate; chairman of Samsung Group | 1942-01-09 Daegu | — | 미상 | — | test | 辛巳 辛丑 壬戌 ?? (조후) |
| 무하마드 알리 (Muhammad Ali) | boxing / heavyweight | 1942-01-17 Louisville, Kentucky | 18:35 | 확인(AA) | Rodden AA (birth certificate/record, contributor Gauquelin)  | test | 辛巳 辛丑 庚午 乙酉 (억부) |
| 마이클 조던 (Michael Jordan) | basketball / shooting guard | 1963-02-17 Brooklyn, New York | 13:40 | 확인(AA) | Rodden AA (birth certificate/record, contributor Lois Rodden | test | 癸卯 甲寅 辛卯 乙未 (종격) |
| 타이거 우즈 (Tiger Woods) | golf | 1975-12-30 Long Beach, California (hometown Cypress) | 22:50 | 확인(AA) | Rodden AA (birth certificate/record, contributor Lois Rodden | test | 乙卯 戊子 庚戌 丁亥 (억부) |
| 슈테피 그라프 (Steffi Graf) | tennis | 1969-06-14 Mannheim | 04:40 | 확인(AA) | Rodden AA (birth certificate/record) via https://www.astroth | dev | 己酉 庚午 庚申 戊寅 (억부) |
| 디에고 마라도나 (Diego Maradona) | football / attacking midfielder | 1960-10-30 Lanús (Policlínico Evita), Buenos Aires Province | 07:05 | 확인(AA) | Rodden AA (birth certificate/record, contributor Sy Scholfie | dev | 庚子 丙戌 辛卯 辛卯 (억부) |
| 로저 페더러 (Roger Federer) | tennis | 1981-08-08 Basel | 08:40 | 진술(A) | Rodden A (from memory/autobiography) via https://www.astroth | dev | 辛酉 丙申 戊午 丙辰 (격국) |
| 세리나 윌리엄스 (Serena Williams) | tennis | 1981-09-26 Saginaw, Michigan | 20:28 | 확인(AA) | Rodden AA (birth certificate/record, contributor Shelley Ack | dev | 辛酉 丁酉 丁未 己酉 (억부) |
| 마이클 펠프스 (Michael Phelps) | swimming | 1985-06-30 Baltimore, Maryland | — | 미상 | Rodden C on https://www.astrotheme.com/astrology/Michael_Phe | dev | 乙丑 壬午 庚子 ?? (억부) |
| 김연아 (Kim Yuna) | figure skating (ladies' singles) | 1990-09-05 Bucheon, Gyeonggi | — | 미상 | — | test | 庚午 甲申 癸酉 ?? (억부) |
| 박지성 (Park Ji-sung) | football / midfielder | 1981-03-30 Seoul | — | 미상 | — | test | 辛酉 辛卯 丁未 ?? (통관) |

## 4. 긍정적 일치 사례(사후 대조, 예측 아님)

| 사람 | 날짜 | 사건 | 성격 | 흐름 점수(백분위) | 등급 | 세운·대운 |
|---|---|---|---|---|---|---|
| arts-01-robert-downey-jr | 2004 | Divorce from Deborah Falconer finalized | 부정 | -12.9 (25) | 조심 | 甲申·丙子 |
| arts-03-whitney-houston | 2000-01-11 | Marijuana found in her bag at Kona airport, Hawaii | 부정 | -3.9 (24.3) | 무난 | 己卯·癸亥 |
| arts-03-whitney-houston | 2001 | Arista contract renewed for $100 million | 긍정 | 33.5 (90) | 좋음 | 辛巳·癸亥 |
| arts-04-elvis-presley | 1956-01-27 | &quot;Heartbreak Hotel&quot; released; national breakthrough | 긍정 | 18.9 (94.6) | 좋음 | 乙未·己卯 |
| arts-04-elvis-presley | 1973-01-14 | Aloha from Hawaii broadcast live via satellite | 긍정 | 16.4 (91.1) | 무난 | 壬子·庚辰 |
| arts-05-marilyn-monroe | 1954-01 | Suspended by Fox for refusing The Girl in Pink Tights | 부정 | -17.3 (25) | 조심 | 癸巳·辛卯 |
| arts-05-marilyn-monroe | 1954-10 | Files for divorce from DiMaggio (final 1955) | 부정 | -23.1 (15.9) | 조심 | 甲午·辛卯 |
| arts-06-madonna | 1984-11-12 | Like a Virgin released; first US number-one album | 긍정 | 27.9 (78.3) | 좋음 | 甲子·丁巳 |
| arts-06-madonna | 1989-01-05 | Files for divorce from Sean Penn | 부정 | -10.8 (25.5) | 무난 | 戊辰·丁巳 |
| arts-06-madonna | 1989-04 | Pepsi pulls commercial and ends sponsorship over &quot;Like a Prayer&quot; video | 부정 | -17.5 (16) | 조심 | 己巳·丁巳 |
| arts-06-madonna | 1993 | Body of Evidence and Dangerous Game poorly received | 부정 | -27.7 (6.6) | 조심 | 癸酉·丙辰 |
| arts-06-madonna | 2007-10 | Signs 10-year, $120 million 360 deal with Live Nation | 긍정 | 38 (95.3) | 좋음 | 丁亥·乙卯 |
| arts-06-madonna | 2024-05 | Free Copacabana Beach concert draws 1.6 million (record) | 긍정 | 27.2 (74.5) | 좋음 | 甲辰·癸丑 |
| arts-07-stephen-king | 1977 | The Shining published | 긍정 | 39.5 (93) | 좋음 | 丁巳·丙午 |
| arts-08-steven-spielberg | 1975 | Jaws sets domestic box-office record | 긍정 | 54.4 (99.2) | 좋음 | 乙卯·癸卯 |
| arts-08-steven-spielberg | 1989-04 | Divorce from Amy Irving | 부정 | -6.8 (25.4) | 무난 | 己巳·甲辰 |
| arts-08-steven-spielberg | 1989 | Divorce settlement reportedly about $100 million | 부정 | -6.8 (25.4) | 무난 | 己巳·甲辰 |
| arts-08-steven-spielberg | 1994-03-21 | Schindler's List wins Best Picture; first Best Director Oscar | 긍정 | 19.8 (82.3) | 좋음 | 甲戌·乙巳 |
| arts-08-steven-spielberg | 1995 | AFI Life Achievement Award | 긍정 | 38.4 (94.6) | 좋음 | 乙亥·乙巳 |
| arts-08-steven-spielberg | 1999-03-21 | Second Best Director Oscar for Saving Private Ryan | 긍정 | 21.1 (86.9) | 좋음 | 己卯·乙巳 |
| arts-08-steven-spielberg | 2016-07-01 | The BFG box-office failure | 부정 | -14.7 (11.5) | 조심 | 丙申·丁未 |
| arts-08-steven-spielberg | 2021-12 | West Side Story box-office bomb | 부정 | -19.7 (6.9) | 조심 | 辛丑·丁未 |
| arts-09-youn-yuh-jung | 1971 | Film debut Woman of Fire: Blue Dragon and Sitges Best Actress | 긍정 | 29 (71.1) | 좋음 | 辛亥·戊申 |
| arts-09-youn-yuh-jung | 1987 | Divorces Jo Young-nam; works to support two sons | 부정 | -21.1 (14.8) | 조심 | 丁卯·庚戌 |
| arts-09-youn-yuh-jung | 2021-04 | SAG and BAFTA supporting actress awards for Minari | 긍정 | 31.9 (72.7) | 좋음 | 辛丑·癸丑 |
| arts-09-youn-yuh-jung | 2021-04-25 | Academy Award Best Supporting Actress for Minari (first Korean) | 긍정 | 31.9 (72.7) | 좋음 | 辛丑·癸丑 |
| arts-10-bong-joon-ho | 2006 | The Host becomes highest-grossing South Korean film | 긍정 | 34.9 (91.7) | 좋음 | 丙戌·己巳 |
| business-01-steve-jobs | 1980-12 | 애플 기업공개로 백만장자 | 긍정 | 30.7 (91.7) | 좋음 | 庚申·丙子 |
| business-01-steve-jobs | 1985-09 | 스컬리·이사회와 권력 다툼 끝에 애플에서 밀려남 | 부정 | -18.4 (17.9) | 조심 | 乙丑·乙亥 |
| business-02-bill-gates | 1980 | IBM PC 운영체제 계약 | 긍정 | 29.4 (95.5) | 좋음 | 庚申·甲申 |
| business-03-warren-buffett | 2009-11 | BNSF 철도 인수(최대 거래) | 긍정 | 17.5 (88.3) | 무난 | 己丑·壬辰 |
| business-03-warren-buffett | 2012-04-11 | 1기 전립선암 진단·방사선 치료 | 부정 | -21.1 (17.9) | 조심 | 壬辰·壬辰 |
| business-05-lee-iacocca | 1964-04 | 포드 머스탱 개발·출시 | 긍정 | 29.6 (96.9) | 좋음 | 甲辰·戊寅 |
| business-05-lee-iacocca | 1978-07-13 | 헨리 포드 2세에 의해 해고 | 부정 | -7.2 (29) | 무난 | 戊午·己卯 |
| business-05-lee-iacocca | 1983 | 정부 보증 대출 7년 조기 상환 | 긍정 | 17.9 (83.3) | 무난 | 癸亥·庚辰 |
| business-05-lee-iacocca | 1983-11 | 미니밴 출시, 25년간 판매 1위 | 긍정 | 17.9 (83.3) | 무난 | 癸亥·庚辰 |
| business-06-richard-branson | 1973 | 버진 레코드 첫 음반 튜블러 벨스 대히트 | 긍정 | 22 (91) | 좋음 | 癸丑·乙酉 |
| business-06-richard-branson | 1992 | 버진 레코드를 손 EMI에 매각 | 긍정 | 23.8 (92.6) | 좋음 | 壬申·丁亥 |
| business-06-richard-branson | 2000-03 | 기업가 정신 공로로 기사 작위 | 긍정 | 12.7 (74.6) | 무난 | 庚辰·戊子 |
| business-06-richard-branson | 2014-10-31 | 스페이스십투 시험비행 추락(조종사 1명 사망) | 부정 | -9.8 (18.9) | 무난 | 甲午·己丑 |
| business-07-rupert-murdoch | 1969 | 영국 News of the World·The Sun 인수 | 긍정 | 14.8 (85.6) | 무난 | 己酉·丁亥 |
| business-07-rupert-murdoch | 1985 | 20세기 폭스 인수·미국 시민권 취득 | 긍정 | 9.6 (76.9) | 무난 | 乙丑·乙酉 |
| business-07-rupert-murdoch | 2013-06 | 웬디 덩과 이혼 신청 | 부정 | -20.1 (19.4) | 조심 | 癸巳·壬午 |
| business-07-rupert-murdoch | 2022-06 | 제리 홀과 이혼 | 부정 | -20.2 (18.1) | 조심 | 壬寅·壬午 |
| business-08-bernard-arnault | 1984 | 디올을 보유한 부삭 그룹 인수 | 긍정 | 44.9 (97.6) | 좋음 | 甲子·癸亥 |
| business-08-bernard-arnault | 1990 | 첫 부인과 별거·이혼 | 부정 | -2.9 (23.4) | 무난 | 庚午·壬戌 |
| business-08-bernard-arnault | 2021-12 | 스카르치니 첩보 사건 LVMH 1000만 유로 합의 | 부정 | -2 (28.2) | 무난 | 辛丑·己未 |
| business-09-elon-musk | 2002 | 이베이가 페이팔을 15억 달러에 인수, 최대 주주로 큰 수익 | 긍정 | 16.1 (76.3) | 무난 | 壬午·辛卯 |
| business-09-elon-musk | 2006-03 | 팰컨1 첫 발사 실패(이후 2회 더 실패) | 부정 | -19.4 (6.3) | 조심 | 丙戌·辛卯 |
| business-09-elon-musk | 2008-09 | 팰컨1 궤도 진입 성공, 연말 NASA 16억 달러 계약 | 긍정 | 22.6 (86.3) | 좋음 | 戊子·辛卯 |
| business-09-elon-musk | 2018-09-29 | &quot;자금 확보&quot; 트윗으로 SEC 합의, 벌금 2천만 달러·의장 사임 | 부정 | -36.4 (1.3) | 조심 | 戊戌·庚寅 |
| sports-01-muhammad-ali | 1971-03-08 | First professional loss, to Joe Frazier (Fight of the Century) | 부정 | -25.9 (14.2) | 조심 | 辛亥·戊戌 |
| sports-01-muhammad-ali | 1974-10-30 | Regained heavyweight title vs George Foreman (Rumble in the Jungle) | 긍정 | 34.7 (89.2) | 좋음 | 甲寅·戊戌 |
| sports-01-muhammad-ali | 1975-10-01 | Beat Joe Frazier in Thrilla in Manila | 긍정 | 28.3 (79.2) | 좋음 | 乙卯·戊戌 |
| sports-01-muhammad-ali | 1980-10-02 | Comeback loss to Larry Holmes; corner stopped the fight | 부정 | -34.8 (5.8) | 조심 | 庚申·丁酉 |
| sports-01-muhammad-ali | 1984-09 | Diagnosed with Parkinson's syndrome | 부정 | -19.7 (20.8) | 조심 | 甲子·丁酉 |
| sports-02-michael-jordan | 1984 | Los Angeles Olympics basketball gold | 긍정 | 49.5 (96.9) | 좋음 | 甲子·壬子 |
| sports-02-michael-jordan | 2006-12-29 | Divorce from Juanita Vanoy, reported $168M settlement | 부정 | -20.6 (19.8) | 조심 | 丙戌·庚戌 |
| sports-02-michael-jordan | 2023-08 | Sold majority stake in Charlotte Hornets (~$3B valuation) | 긍정 | 7.3 (78.1) | 무난 | 癸卯·戊申 |
| sports-03-tiger-woods | 1997-04-13 | First major: Masters by record 12 shots | 긍정 | 26.4 (90.3) | 좋음 | 丁丑·丙戌 |
| sports-03-tiger-woods | 2001-04 | Completed 'Tiger Slam' (four straight majors) at 2001 Masters | 긍정 | 27.7 (93.1) | 좋음 | 辛巳·丙戌 |
| sports-04-steffi-graf | 1987-06 | First Grand Slam: French Open | 긍정 | 20.7 (84.5) | 좋음 | 丁卯·壬申 |
| sports-04-steffi-graf | 1987-08-17 | Became world No. 1 | 긍정 | 20.7 (84.5) | 좋음 | 丁卯·壬申 |
| sports-04-steffi-graf | 1990 | Lost French Open and US Open finals; tabloid scandal about father | 부정 | -26.6 (10.7) | 조심 | 庚午·壬申 |
| sports-04-steffi-graf | 1997-06 | Reconstructive left knee surgery, months out | 부정 | -17.6 (22.6) | 조심 | 丁丑·癸酉 |
| sports-05-diego-maradona | 1983-09-24 | Ankle broken by Andoni Goikoetxea tackle | 부정 | -28.5 (14.1) | 조심 | 癸亥·己丑 |
| sports-05-diego-maradona | 1986-06-29 | Captained Argentina to World Cup title | 긍정 | 20.6 (90.2) | 좋음 | 丙寅·己丑 |
| sports-05-diego-maradona | 1987-05 | Napoli's first Serie A title (1986-87) | 긍정 | 22.6 (96.7) | 좋음 | 丁卯·己丑 |
| sports-05-diego-maradona | 2020-11-03 | Brain surgery for subdural hematoma; died 2020-11-25 | 부정 | -29 (9.8) | 조심 | 庚子·壬辰 |
| sports-06-roger-federer | 2008-08 | Beijing Olympic doubles gold (with Wawrinka) | 긍정 | 22.8 (85) | 좋음 | 戊子·癸巳 |
| sports-06-roger-federer | 2016-02 | Left knee surgery; season cut short (half-year out) | 부정 | 1.1 (25) | 무난 | 丙申·壬辰 |
| sports-07-serena-williams | 1999-09-12 | First Grand Slam: US Open | 긍정 | 18.2 (98.3) | 좋음 | 己卯·己亥 |
| sports-07-serena-williams | 2003-01 | 'Serena Slam' (four straight majors) completed at Australian Open | 긍정 | 5.2 (85) | 무난 | 壬午·己亥 |
| sports-07-serena-williams | 2009-09-12 | US Open semifinal outburst; record fine and probation | 부정 | -20.2 (28.3) | 조심 | 己丑·庚子 |
| sports-07-serena-williams | 2010-07-07 | Foot cut on broken glass; two surgeries | 부정 | -21.6 (15) | 조심 | 庚寅·庚子 |
| sports-08-michael-phelps | 2001-03-30 | First world record (200m butterfly), youngest male WR holder | 긍정 | 25.8 (90.4) | 좋음 | 辛巳·辛巳 |
| sports-08-michael-phelps | 2004-11 | First DUI arrest at 19; 18 months probation | 부정 | -11.4 (17.3) | 무난 | 甲申·庚辰 |
| sports-08-michael-phelps | 2014-09-30 | Second DUI; 6-month suspension, removed from 2015 Worlds team; sought treatment | 부정 | -11 (25) | 무난 | 甲午·己卯 |
| sports-09-kim-yuna | 2006-12 | First senior Grand Prix Final title (St. Petersburg) | 긍정 | 23.3 (88.1) | 좋음 | 丙戌·癸未 |
| sports-10-park-ji-sung | 2009-05-27 | Lost Champions League final to Barcelona (first Asian to play in a final) | 부정 | -11.8 (15) | 무난 | 己丑·戊子 |
| sports-10-park-ji-sung | 2011-05 | Fourth Premier League title (2010-11) | 긍정 | 14 (71.7) | 무난 | 辛卯·戊子 |

## 5. 부정적 불일치 사례(반례 — 지우지 않음)

| 사람 | 날짜 | 사건 | 성격 | 흐름 점수(백분위) | 등급 | 세운 십성 | 용신 역할(천간/지지) | 합충 |
|---|---|---|---|---|---|---|---|---|
| arts-01-robert-downey-jr | 1993-03 | Chaplin: Academy Award Best Actor nomination and BAFTA Best Actor win | 긍정 | -27 (7.6) | 조심 | 정재/상관 | 기신/구신 | 戊癸합火, 卯酉충, 子酉파, 子酉귀문, 巳酉 반합金 |
| arts-01-robert-downey-jr | 1996-06 | Arrested for drug possession on Sunset Boulevard; start of repeated arrests | 부정 | 6.2 (77.2) | 무난 | 편인/정재 | 용신/기신 | 卯子형(무례지형), 未子해, 未子원진 |
| arts-01-robert-downey-jr | 2001-01 | Golden Globe for Ally McBeal (supporting TV actor) | 긍정 | -17.7 (20.7) | 조심 | 식신/비견 | 구신/한신 | 乙庚합金, 卯辰해, 辰子 반합水 |
| arts-01-robert-downey-jr | 2010-01 | Golden Globe Best Actor (Musical/Comedy) for Sherlock Holmes | 긍정 | -20.7 (14.1) | 조심 | 겁재/겁재 | 한신/한신 | 子丑합土, 未丑충, 未丑형 |
| arts-02-britney-spears | 2006-11 | Files for divorce from Federline (finalized July 2007) | 부정 | 13.2 (88.3) | 무난 | 식신/편재 | 용신/한신 | 辛丙합水, 酉戌해, 丑戌형 |
| arts-02-britney-spears | 2013-12-27 | Las Vegas residency Britney: Piece of Me begins (later extended) | 긍정 | -10.8 (25) | 무난 | 정인/식신 | 기신/용신 | 亥巳충, 寅巳해, 寅巳형, 巳酉丑 삼합金국 |
| arts-02-britney-spears | 2024 | Divorce from Sam Asghari | 부정 | 10.9 (81.7) | 무난 | 비견/편재 | 희신/한신 | 己甲합土, 酉辰합金, 亥辰원진, 亥辰귀문, 丑辰파 |
| arts-03-whitney-houston | 1986-02 | First Grammy: Best Female Pop Vocal for &quot;Saving All My Love for You&quot; | 긍정 | -19.6 (4.3) | 조심 | 식신/비견 | 구신/한신 | 申寅충, 申寅형, 申寅충, 申寅형 |
| arts-03-whitney-houston | 2002-12 | Just Whitney released amid drug-use stories; image tarnished | 부정 | 25 (78.6) | 좋음 | 편인/상관 | 용신/구신 | 卯午파, 戌午 반합火 |
| arts-03-whitney-houston | 2007-04-24 | Divorce from Bobby Brown granted | 부정 | 24 (75.7) | 좋음 | 상관/편인 | 구신/용신 | 癸丁충, 申亥해, 申亥해, 亥卯 반합木 |
| arts-03-whitney-houston | 2012-02-11 | Accidental drowning at Beverly Hilton; heart disease and cocaine contributing | 부정 | 34.7 (92.9) | 좋음 | 편인/편재 | 용신/기신 | 卯辰해, 戌辰충 |
| arts-04-elvis-presley | 1956-09-09 | First Ed Sullivan Show appearance | 긍정 | -6.9 (23.2) | 무난 | 식신/편관 | 한신/기신 | 寅申충, 寅申형 |
| arts-04-elvis-presley | 1969-07-31 | Begins Las Vegas International Hotel engagement (57 shows) | 긍정 | -48.2 (1.8) | 조심 | 정재/정관 | 구신/기신 | 甲己합土, 甲己합土, 戌酉해, 寅酉원진, 丑酉 반합金, 申酉戌 방합金 |
| arts-05-marilyn-monroe | 1953 | Niagara, Gentlemen Prefer Blondes, How to Marry a Millionaire make her a top star | 긍정 | -17.3 (25) | 조심 | 식신/정관 | 구신/한신 | 寅巳해, 寅巳형 |
| arts-05-marilyn-monroe | 1957 | Ectopic pregnancy (mid-1957), miscarriage a year later | 부정 | 4.1 (79.5) | 무난 | 편관/비견 | 한신/희신 | 癸丁충, 癸丁충, 寅酉원진, 酉酉자형 |
| arts-05-marilyn-monroe | 1961-02 | The Misfits released and fails at box office | 부정 | 20.8 (93.2) | 좋음 | 비견/편인 | 희신/용신 | 丙辛합水, 巳酉丑 삼합金국 |
| arts-05-marilyn-monroe | 1961 | Admitted to Payne Whitney Psychiatric Clinic | 부정 | 20.8 (93.2) | 좋음 | 비견/편인 | 희신/용신 | 丙辛합水, 巳酉丑 삼합金국 |
| arts-06-madonna | 2002 | Swept Away critical and commercial failure | 부정 | 31.9 (85.8) | 좋음 | 정인/식신 | 희신/한신 | 丑午해, 丑午원진, 丑午귀문, 卯午파, 戌午 반합火 |
| arts-06-madonna | 2008 | Divorce from Guy Ritchie | 부정 | 31.9 (84) | 좋음 | 정재/편인 | 구신/희신 | 丑子합土, 卯子형(무례지형), 申子 반합水 |
| arts-06-madonna | 2023-06-24 | Serious bacterial infection, several days in ICU; tour postponed | 부정 | 34.3 (91.5) | 좋음 | 편인/비견 | 희신/용신 | 戊癸합火, 戌卯합火, 申卯원진, 申卯귀문 |
| arts-07-stephen-king | 2003-11 | National Book Foundation Medal for Distinguished Contribution to American Letters | 긍정 | -21.2 (27.3) | 조심 | 비견/편관 | 구신/용신 | 丁癸충, 子未해, 子未원진, 亥卯未 삼합木국 |
| arts-10-bong-joon-ho | 2019-05-25 | Parasite wins Palme d'Or (first Korean film) | 긍정 | -15.1 (13.1) | 조심 | 정관/비견 | 한신/기신 | 辰亥원진, 辰亥귀문 |
| arts-10-bong-joon-ho | 2020-02-09 | Parasite wins Best Picture, Director, Original Screenplay, International Feature | 긍정 | -37.4 (1.2) | 조심 | 편인/겁재 | 구신/기신 | 酉子파, 酉子귀문, 酉子파, 酉子귀문, 辰子 반합水 |
| arts-10-bong-joon-ho | 2025-03 | Mickey 17 grosses $133.5M against $118M budget; not immediately profitable | 부정 | 45.6 (98.8) | 좋음 | 상관/편재 | 희신/용신 | 巳酉 반합金 |
| business-01-steve-jobs | 1995-11 | 픽사 토이 스토리 흥행·평단 성공 | 긍정 | -20.4 (15.5) | 조심 | 정인/편관 | 구신/한신 | 寅亥합木, 寅亥파, 辰亥원진, 辰亥귀문 |
| business-01-steve-jobs | 2004-07 | 췌장 신경내분비종양 휘플 수술 | 부정 | 26.4 (84.5) | 좋음 | 편인/편재 | 구신/용신 | 寅申충, 寅申형 |
| business-01-steve-jobs | 2009-03 | 멤피스에서 간 이식 수술 | 부정 | 35.6 (94) | 좋음 | 상관/상관 | 희신/희신 | 未丑충, 未丑형, 辰丑파, 戌丑형, 丑戌未 삼형 — 지세지형(축술미) |
| business-01-steve-jobs | 2011-01-17 | 건강 문제로 두 번째 병가 | 부정 | 28.6 (86.9) | 좋음 | 편재/편인 | 용신/구신 | 乙庚합金, 未寅귀문 |
| business-02-bill-gates | 1986-03-13 | 마이크로소프트 기업공개 | 긍정 | -30.2 (2.7) | 조심 | 편재/식신 | 기신/구신 | 壬丙충, 辛丙합水, 未寅귀문, 亥寅합木, 亥寅파 |
| business-02-bill-gates | 1995-08-24 | 윈도 95 출시 | 긍정 | -14.9 (27.7) | 조심 | 상관/비견 | 구신/희신 | 辛乙충, 亥亥자형 |
| business-02-bill-gates | 2021-05-03 | 27년 결혼 끝에 이혼 발표(8월 확정) | 부정 | 25.8 (90.2) | 좋음 | 정인/정관 | 용신/한신 | 乙辛충, 丙辛합水, 未丑충, 未丑형, 戌丑형, 戌丑형, 丑戌未 삼형 — 지세지형(축술미) |
| business-05-lee-iacocca | 1995 | 커코리언의 크라이슬러 적대적 인수 시도 실패 | 부정 | 26.8 (95.7) | 좋음 | 편인/정관 | 용신/희신 | 申亥해, 亥卯 반합木 |
| business-06-richard-branson | 2020-04-21 | 코로나로 버진 오스트레일리아 법정관리 | 부정 | 15.2 (82.8) | 무난 | 편관/정인 | 한신/용신 | 甲庚충, 未子해, 未子원진, 卯子형(무례지형) |
| business-06-richard-branson | 2023-04-04 | 버진 오빗 파산 신청 | 부정 | 16.2 (84.4) | 무난 | 정인/겁재 | 용신/희신 | 丁癸충 |
| business-07-rupert-murdoch | 2007 | 다우존스(월스트리트저널) 인수 | 긍정 | -15.1 (24.4) | 조심 | 겁재/편관 | 기신/한신 | 寅亥합木, 寅亥파, 亥卯未 삼합木국 |
| business-08-bernard-arnault | 2013-06-25 | 에르메스 지분 은밀 매집으로 AMF 800만 유로 제재 | 부정 | 22.9 (84.7) | 좋음 | 정인/식신 | 용신/구신 | 寅巳해, 寅巳형, 申巳합水, 申巳파, 申巳형, 寅巳申 삼형 — 무은지형(인사신) |
| business-09-elon-musk | 2008-06 | 첫 부인 저스틴과 이혼 | 부정 | 22.6 (86.3) | 좋음 | 편재/정인 | 기신/용신 | 午子충, 申子 반합水 |
| business-09-elon-musk | 2010-06-29 | 테슬라 나스닥 상장 | 긍정 | -12.4 (18.8) | 조심 | 편관/비견 | 한신/희신 | 甲庚충, 甲庚충, 亥寅합木, 亥寅파, 申寅충, 申寅형, 寅午 반합火 |
| business-10-lee-kun-hee | 2014-05 | 급성 심근경색으로 쓰러져 와병 | 부정 | 30.5 (86.7) | 좋음 | 식신/정재 | 희신/용신 | 丑午해, 丑午원진, 丑午귀문, 戌午 반합火 |
| sports-01-muhammad-ali | 1960 | Rome Olympics light-heavyweight gold | 긍정 | -52.2 (0.8) | 조심 | 비견/상관 | 구신/기신 | 乙庚합金, 丑子합土, 午子충, 酉子파, 酉子귀문 |
| sports-01-muhammad-ali | 1967-04-28 | Refused army induction; stripped of title and boxing license (exile until 1970) | 부정 | 40.9 (95.8) | 좋음 | 정관/정인 | 용신/한신 | 丑未충, 丑未형, 午未합火, 巳午未 방합火 |
| sports-01-muhammad-ali | 1971-06-28 | US Supreme Court overturned draft-evasion conviction | 긍정 | -25.9 (14.2) | 조심 | 겁재/식신 | 구신/기신 | 乙辛충, 巳亥충 |
| sports-02-michael-jordan | 1985-10-29 | Broke left foot; missed 64 games | 부정 | 21 (86.5) | 좋음 | 편재/편인 | 용신/기신 | 辛乙충, 未丑충, 未丑형 |
| sports-03-tiger-woods | 2009-11-27 | SUV crash, infidelity scandal, loss of sponsors | 부정 | 39 (98.6) | 좋음 | 정인/정인 | 용신/용신 | 子丑합土, 戌丑형, 亥子丑 방합水 |
| sports-03-tiger-woods | 2021-02-23 | Rollover car crash, open fractures of right leg | 부정 | 18.3 (84.7) | 좋음 | 겁재/정인 | 희신/용신 | 乙辛충, 子丑합土, 戌丑형, 亥子丑 방합水 |
| sports-04-steffi-graf | 1988 | Golden Slam: all four majors plus Seoul Olympic gold | 긍정 | -20.4 (17.9) | 조심 | 편인/편인 | 구신/구신 | 酉辰합金 |
| sports-04-steffi-graf | 1995-08 | Father/manager Peter Graf arrested for tax evasion on her earnings | 부정 | 33.3 (91.7) | 좋음 | 정재/식신 | 용신/희신 | 庚乙합金, 庚乙합金, 申亥해, 寅亥합木, 寅亥파 |
| sports-05-diego-maradona | 1978 | Left out of Argentina's 1978 World Cup squad | 부정 | 18.5 (88) | 좋음 | 정인/편관 | 한신/용신 | 子午충, 卯午파, 卯午파, 戌午 반합火 |
| sports-05-diego-maradona | 1990-07-08 | Lost 1990 World Cup final to West Germany | 부정 | 7 (70.7) | 무난 | 겁재/편관 | 구신/용신 | 子午충, 卯午파, 卯午파, 戌午 반합火 |
| sports-05-diego-maradona | 1994-06 | Sent home from 1994 World Cup for ephedrine | 부정 | 13.2 (81.5) | 무난 | 정재/정인 | 희신/한신 | 庚甲충, 卯戌합火, 卯戌합火 |
| sports-06-roger-federer | 2008 | Mononucleosis in 2008 season | 부정 | 22.8 (85) | 좋음 | 비견/정재 | 기신/용신 | 酉子파, 酉子귀문, 午子충, 申子辰 삼합水국 |
| sports-06-roger-federer | 2008-07 | Lost Wimbledon final to Rafael Nadal | 부정 | 22.8 (85) | 좋음 | 비견/정재 | 기신/용신 | 酉子파, 酉子귀문, 午子충, 申子辰 삼합水국 |
| sports-06-roger-federer | 2017-01 | Australian Open comeback title (18th major) at 35 | 긍정 | 1.1 (25) | 무난 | 편인/식신 | 구신/희신 | 辛丙합水 |
| sports-06-roger-federer | 2020 | Two knee surgeries in 2020 (third after Wimbledon 2021) | 부정 | 41.8 (98.3) | 좋음 | 식신/정재 | 희신/용신 | 酉子파, 酉子귀문, 午子충, 申子辰 삼합水국 |
| sports-07-serena-williams | 2003-08-01 | Left knee tendon surgery; months out | 부정 | -1.1 (71.7) | 무난 | 편관/식신 | 기신/한신 | 丁癸충, 丁癸충 |
| sports-07-serena-williams | 2012-08 | London Olympic singles and doubles gold | 긍정 | -26.6 (8.3) | 조심 | 정관/상관 | 기신/한신 | 丁壬합木, 丁壬합木, 酉辰합金, 酉辰합金, 酉辰합金 |
| sports-08-michael-phelps | 2004-08 | Six golds at Athens 2004 | 긍정 | -11.4 (17.3) | 무난 | 편재/비견 | 기신/희신 | 庚甲충, 申子 반합水 |
| sports-08-michael-phelps | 2009-02 | Marijuana pipe photo; 3-month USA Swimming suspension | 부정 | 45.2 (98.1) | 좋음 | 정인/정인 | 용신/용신 | 午丑해, 午丑원진, 午丑귀문, 子丑합土 |
| sports-09-kim-yuna | 2007-01 | Lumbar disc herniation; withdrew from national championships | 부정 | 23.3 (88.1) | 좋음 | 정재/정관 | 용신/한신 | 酉戌해, 戌午 반합火, 申酉戌 방합金 |
| sports-09-kim-yuna | 2013-03 | Second World title (London, Ontario) | 긍정 | -9.7 (21.4) | 무난 | 비견/정재 | 기신/용신 | 申巳합水, 申巳파, 申巳형, 巳酉 반합金 |
| sports-09-kim-yuna | 2014-02-20 | Sochi Olympic silver behind Sotnikova; Korean protest rejected | 부정 | 28.3 (92.9) | 좋음 | 상관/편재 | 희신/용신 | 庚甲충, 午午자형 |
| sports-10-park-ji-sung | 2002-06-14 | Winning goal vs Portugal at 2002 World Cup; Korea reached semifinal | 긍정 | -6.8 (28.3) | 무난 | 정관/비견 | 용신/구신 | 丁壬합木, 卯午파, 未午합火 |
| sports-10-park-ji-sung | 2008-05 | Premier League title; United won Champions League but he was left out of final squad | 긍정 | -7.3 (21.7) | 무난 | 상관/편관 | 기신/용신 | 酉子파, 酉子귀문, 卯子형(무례지형), 未子해, 未子원진 |
| sports-10-park-ji-sung | 2011-05-28 | Lost Champions League final to Barcelona at Wembley | 부정 | 14 (71.7) | 무난 | 편재/편인 | 희신/한신 | 酉卯충 |

## 6. 계산 엔진 취약점 후보(서술, 표본 작음)

긍정·부정 사건 중 불일치(긍정인데 하위 30% · 부정인데 상위 30%) 비율:

| 세운 지지 십성 묶음 | 사건 | 불일치 | 비율 |
|---|---|---|---|
| 식상 | 50 | 13 | 26% |
| 재성 | 48 | 12 | 25% |
| 관성 | 43 | 12 | 27.9% |
| 비겁 | 38 | 12 | 31.6% |
| 인성 | 51 | 15 | 29.4% |

| 통합 용신 방식 | 사건 | 불일치 | 비율 |
|---|---|---|---|
| single | 179 | 53 | 29.6% |
| conflict | 8 | 3 | 37.5% |
| agree | 36 | 7 | 19.4% |
| jong | 7 | 1 | 14.3% |

해석 주의: 그룹마다 사건이 몇 건 안 되어, 특정 십성·방식이 약하다고 결론 내리려면 100명 이상 확대 검증이 필요합니다.

### 6-1. 사건 종류별 흐름 백분위와 분야 지표 방향 일치율

| 사건 종류 | 성격 | 건수 | 흐름 백분위 평균 | 분야 지표 방향 일치 |
|---|---|---|---|---|
| achievement | 긍정 | 99 | 57.9 | 49.5% (99) |
| career_change | 변화 | 63 | 45.9 | — |
| failure | 부정 | 56 | 48.8 | 46.4% (56) |
| marriage | 변화 | 39 | 44 | 41% (39) |
| health_event | 부정 | 34 | 60.6 | 44.1% (34) |
| retirement | 변화 | 22 | 53.3 | — |
| divorce | 부정 | 21 | 49.1 | 47.6% (21) |
| financial_gain | 긍정 | 13 | 57.6 | 76.9% (13) |
| financial_loss | 부정 | 7 | 68.1 | 57.1% (7) |
| child_birth | 변화 | 6 | 31.5 | 50% (6) |

> 50이 그 사람의 평생 중간입니다. 부정 사건인 부상·질병(health_event)·재물 손실이 흐름 상위에 놓이는 경향은, 흐름 점수가 "좋고 나쁨"이 아니라 "기운이 크게 움직이는 해"를 반영할 가능성을 시사합니다(건수가 적어 확인 필요).

## 7. 개선이 필요한 명리학적 판정 로직(검토 후보)

- 불일치 사례의 세운 십성·용신 역할·합충 목록(5절)을 감사 문서(docs/luck-engine-audit-2026-11-25)의 A안(합화 성립도·충 종류)과 대조해, 같은 원인이 반복되는지 확인합니다.
- 시간 미상 그룹과 시간 앎 그룹의 차이가 크면, 시주 없이 계산할 때의 강약·용신 판정 안정성을 따로 점검해야 합니다.
- 부정 사건(부상·실패)이 흐름 상위 구간에 자주 있으면, 흐름 점수가 "체감 좋고 나쁨"보다 "활동량"에 가깝게 움직이는지 변동성 지표와 함께 다시 봐야 합니다.

## 7-1. 데이터 한계(이번 1차)

- 사건 근거의 상당수가 위키백과와 그 인용 기사에서 왔습니다. 수집자가 모든 인용 기사를 직접 열어 확인하지는 않았습니다(문화예술 134건 중 108건이 단일 출처 medium).
- 스포츠 선수의 출생시간은 astro.com 직접 조회가 막혀 Rodden 등급을 인용한 Astrotheme 에서 가져왔습니다. 문화예술·기업인은 Astro-Databank 를 브라우저로 직접 확인했습니다.
- 마돈나 출생 시각은 출처 기록(EST, UTC−5)대로 고정 시차를 썼습니다(data/overrides.json).
- 2026년 사건과 15세 미만 사건은 계산 범위(15세~2025년) 밖이라 빠졌습니다.
- 유명인은 공개된 사건 위주라 성공 사건과 큰 사건 쪽으로 치우쳐 있습니다. 사건이 없는 해가 정말 "아무 일 없는 해"인지 알 수 없습니다.

## 8. 추가 검증이 필요한 항목

- 탐색 결과(긍정 사건 해 흐름 상위 경향)와 "흐름 점수가 활동량을 따라간다"는 해석을 새 가설로 미리 등록하고, 확대 표본(100명 이상)의 test 군에서만 확인
- 100명 이상으로 확대(직업군별 30명 이상), 출생시간 확인 인물 비율 확대
- 사건 날짜를 월 단위까지 확보해 월운 대조
- 일반인 동의 표본(06 블라인드 검증 계획)으로 유명인 선택 편향(공개 사건·성공 편중) 보정
- 사건 성격 분류의 평가자 간 일치도(두 사람이 독립 분류) 측정

## 9. 실제 사건과 운세 점수 대조표(전체)

| 사람 | 날짜(사주 연도) | 나이 | 사건 | 성격 | 중요도 | 흐름(백분위) | 등급 | 전후 변화 | 변동성 백분위 | 대응 분야 | 분야 백분위 | 방향 일치 | 근거 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| arts-01-robert-downey-jr | 1992-05-29 (1992) | 27 | Marries Deborah Falconer | 변화 | 2 | -28.5 (5.4) | 조심 | -38.1 | 34.8 | marriage·love | 93 | 예 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 1993-03 (1993) | 28 | Chaplin: Academy Award Best Actor nomination and BAFTA Best Actor win | 긍정 | 2 | -27 (7.6) | 조심 | -11.8 | 90.2 | career | 50 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 1996-06 (1996) | 31 | Arrested for drug possession on Sunset Boulevard; start of repeated arrests | 부정 | 2 | 6.2 (77.2) | 무난 | 0 | 50 | career | 92 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 1999-08-05 (1999) | 34 | Sentenced to three years in state prison (Corcoran) for probation violation | 부정 | 3 | 4.4 (68.5) | 무난 | -4.1 | 54.3 | career | 34 | 예 | [출처](https://archive.seattletimes.com/archive/19990806/2975873/robert-downey-jr-gets-three-year-prison-sentence) |
| arts-01-robert-downey-jr | 2001-01 (2000) | 35 | Golden Globe for Ally McBeal (supporting TV actor) | 긍정 | 2 | -17.7 (20.7) | 조심 | -21.3 | 27.2 | career | 47 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2001-04-24 (2001) | 36 | Arrested in Culver City and fired from Ally McBeal | 부정 | 3 | -4.1 (44.6) | 무난 | 2.6 | 7.6 | career | 88 | 아니오 | [출처](https://www.foxnews.com/story/robert-downey-jr-fired-from-ally-mcbeal-after-another-arrest) |
| arts-01-robert-downey-jr | 2004 (2004) | 39 | Divorce from Deborah Falconer finalized | 부정 | 2 | -12.9 (25) | 조심 | -12.6 | 40.2 | marriage | 77 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2005-08-27 (2005) | 40 | Marries producer Susan Levin | 변화 | 2 | -12.6 (27.2) | 조심 | -4.6 | 84.8 | marriage·love | 32 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2008-05-02 (2008) | 43 | Iron Man released; career revival as MCU lead | 변화 | 3 | -20.4 (16.3) | 조심 | -34 | 50 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2010-01 (2009) | 44 | Golden Globe Best Actor (Musical/Comedy) for Sherlock Holmes | 긍정 | 2 | -20.7 (14.1) | 조심 | -13.4 | 68.5 | career | 1 | 아니오 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2013 (2013) | 48 | Named Forbes highest-paid actor (2013–2015) | 긍정 | 2 | -1.4 (53.3) | 무난 | 16.9 | 22.8 | wealth | 95 | 예 | [출처](https://en.wikipedia.org/wiki/Robert_Downey_Jr.) |
| arts-01-robert-downey-jr | 2024-03-10 (2024) | 59 | Academy Award Best Supporting Actor for Oppenheimer (first Oscar) | 긍정 | 3 | -4.1 (46.7) | 무난 | -3.6 | 29.3 | career | 22 | 아니오 | [출처](https://abc7.com/post/robert-downey-jr-oscars-2024-oppenheimer-oscar/14491118/) |
| arts-02-britney-spears | 1999-01 (1998) | 17 | Debut album ...Baby One More Time released | 긍정 | 3 | 6.9 (68.3) | 무난 | 8 | 33.3 | career | 57 | 예 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2004-10-06 (2004) | 23 | Legally marries Kevin Federline | 변화 | 2 | -2.8 (48.3) | 무난 | 4.9 | 85 | marriage·love | 8 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2005-02 (2005) | 24 | First Grammy: Best Dance Recording for &quot;Toxic&quot; | 긍정 | 2 | 2.3 (55) | 무난 | 9.7 | 28.3 | career | 22 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2006-11 (2006) | 25 | Files for divorce from Federline (finalized July 2007) | 부정 | 2 | 13.2 (88.3) | 무난 | 13.4 | 41.7 | marriage | 53 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2007-02 (2007) | 26 | Rehab stay and public head-shaving breakdown | 부정 | 2 | 3 (61.7) | 무난 | -4.7 | 65 | health·accident | 32 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2007-09 (2007) | 26 | &quot;Gimme More&quot; MTV VMA performance widely panned | 부정 | 2 | 3 (61.7) | 무난 | -4.7 | 65 | career | 47 | 예 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2008-02-01 (2007) | 26 | Psychiatric hold followed by court-ordered temporary conservatorship under her father | 부정 | 3 | 3 (61.7) | 무난 | -4.7 | 65 | health·accident | 32 | 아니오 | [출처](https://www2.ljworld.com/news/2008/feb/02/spears_father_given_temporary_control/) |
| arts-02-britney-spears | 2008-12 (2008) | 27 | Album Circus released after conservatorship made indefinite | 변화 | 2 | -23.2 (8.3) | 조심 | -31.3 | 68.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2013-12-27 (2013) | 32 | Las Vegas residency Britney: Piece of Me begins (later extended) | 긍정 | 2 | -10.8 (25) | 무난 | 1.6 | 91.7 | career | 28 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2019-01-04 (2018) | 37 | Announces indefinite work hiatus, cancels Domination residency | 변화 | 3 | 8.2 (71.7) | 무난 | 0.8 | 38.3 | career | — | — | [출처](https://www.grammy.com/news/britney-spears-announces-indefinite-work-hiatus-including-upcoming-vegas-residency) |
| arts-02-britney-spears | 2021-11-12 (2021) | 40 | Judge terminates 13-year conservatorship | 변화 | 3 | -10.4 (28.3) | 무난 | 13.5 | 5 | move·job | — | — | [출처](https://www.pbs.org/newshour/arts/judge-dissolves-britney-spears-conservatorship) |
| arts-02-britney-spears | 2022 (2022) | 41 | Marries Sam Asghari | 변화 | 2 | -17.4 (11.7) | 조심 | 4 | 33.3 | marriage·love | 18 | 아니오 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-02-britney-spears | 2024 (2024) | 43 | Divorce from Sam Asghari | 부정 | 2 | 10.9 (81.7) | 무난 | 22.5 | 18.3 | marriage | 33 | 예 | [출처](https://en.wikipedia.org/wiki/Britney_Spears) |
| arts-03-whitney-houston | 1985-02-14 (1985) | 22 | Debut album Whitney Houston released (best-selling album of 1986) | 긍정 | 3 | 2.1 (32.9) | 무난 | -23.5 | 38.6 | career | 79 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 1986-02 (1986) | 23 | First Grammy: Best Female Pop Vocal for &quot;Saving All My Love for You&quot; | 긍정 | 2 | -19.6 (4.3) | 조심 | -32.5 | 92.9 | career | 19 | 아니오 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 1992-07-18 (1992) | 29 | Marries Bobby Brown | 변화 | 2 | 23.1 (67.1) | 좋음 | 21.7 | 1.4 | marriage·love | 64 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 1992-11 (1992) | 29 | The Bodyguard film and soundtrack (best-selling soundtrack of all time) | 긍정 | 3 | 23.1 (67.1) | 좋음 | 21.7 | 1.4 | career | 31 | 아니오 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 1994-03-01 (1994) | 31 | Grammy Album of the Year and Record of the Year (The Bodyguard) | 긍정 | 3 | 7.4 (41.4) | 무난 | -22.8 | 35.7 | career | 53 | 예 | [출처](https://www.grammy.com/awards/categories/album-of-the-year/1994/) |
| arts-03-whitney-houston | 2000-01-11 (1999) | 36 | Marijuana found in her bag at Kona airport, Hawaii | 부정 | 2 | -3.9 (24.3) | 무난 | -1.7 | 41.4 | career | 69 | 아니오 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2000-03 (2000) | 37 | Dropped from Academy Awards performance by Burt Bacharach | 부정 | 2 | 14.3 (50) | 무난 | 25.8 | 84.3 | career | 41 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2001 (2001) | 38 | Arista contract renewed for $100 million | 긍정 | 2 | 33.5 (90) | 좋음 | 28.3 | 87.1 | wealth | 59 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2002-12 (2002) | 39 | Just Whitney released amid drug-use stories; image tarnished | 부정 | 2 | 25 (78.6) | 좋음 | 1.1 | 12.9 | career | 24 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2007-04-24 (2007) | 44 | Divorce from Bobby Brown granted | 부정 | 2 | 24 (75.7) | 좋음 | 11.4 | 44.3 | marriage | 24 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2009 (2009) | 46 | Comeback album I Look to You | 변화 | 2 | -9.6 (15.7) | 무난 | -33.5 | 58.6 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2011-05 (2011) | 48 | Re-enters rehabilitation for drug and alcohol problems | 부정 | 2 | 15.8 (55.7) | 무난 | 23.3 | 10 | health·accident | 83 | 예 | [출처](https://en.wikipedia.org/wiki/Whitney_Houston) |
| arts-03-whitney-houston | 2012-02-11 (2012) | 49 | Accidental drowning at Beverly Hilton; heart disease and cocaine contributing | 부정 | 3 | 34.7 (92.9) | 좋음 | 29.5 | 55.7 | health·accident | 41 | 아니오 | [출처](https://www.npr.org/sections/thetwo-way/2012/03/22/149174735/coroner-whitney-houstons-death-ruled-accidental-drowning) |
| arts-04-elvis-presley | 1954-07-05 (1954) | 19 | Sun Records session produces &quot;That's All Right&quot; | 변화 | 3 | 7.7 (69.6) | 무난 | -2.5 | 46.4 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1955-11-21 (1955) | 20 | Contract bought by RCA Victor for $40,000 | 변화 | 2 | 18.9 (94.6) | 좋음 | 8.7 | 92.9 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1956-01-27 (1955) | 20 | &quot;Heartbreak Hotel&quot; released; national breakthrough | 긍정 | 3 | 18.9 (94.6) | 좋음 | 8.7 | 92.9 | career | 41 | 아니오 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1956-09-09 (1956) | 21 | First Ed Sullivan Show appearance | 긍정 | 2 | -6.9 (23.2) | 무난 | -20.1 | 53.6 | career | 34 | 아니오 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1958-03-24 (1958) | 23 | Drafted into US Army; career paused until 1960 | 변화 | 2 | -12.5 (16.1) | 조심 | 6.6 | 33.9 | career | — | — | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1967-05-01 (1967) | 32 | Marries Priscilla Beaulieu in Las Vegas | 변화 | 2 | -3.6 (48.2) | 무난 | -3.2 | 92.9 | marriage·love | 35 | 아니오 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1968-12-03 (1968) | 33 | NBC '68 Comeback Special airs, reviving career | 변화 | 3 | -22.1 (12.5) | 조심 | -18.1 | 53.6 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1969-07-31 (1969) | 34 | Begins Las Vegas International Hotel engagement (57 shows) | 긍정 | 2 | -48.2 (1.8) | 조심 | -35.4 | 66.1 | career | 80 | 예 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1973-01-14 (1972) | 37 | Aloha from Hawaii broadcast live via satellite | 긍정 | 2 | 16.4 (91.1) | 무난 | 31 | 30.4 | career | 52 | 예 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1973-10-09 (1973) | 38 | Divorce from Priscilla finalized | 부정 | 2 | 6.6 (62.5) | 무난 | 1.3 | 26.8 | marriage | 68 | 아니오 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1973 (1973) | 38 | Hospitalized from effects of pethidine addiction (late 1973) | 부정 | 2 | 6.6 (62.5) | 무난 | 1.3 | 26.8 | health·accident | 21 | 아니오 | [출처](https://en.wikipedia.org/wiki/Elvis_Presley) |
| arts-04-elvis-presley | 1977-08-16 (1977) | 42 | Dies at Graceland, aged 42 | 부정 | 3 | -5.2 (30.4) | 무난 | -7.5 | 78.6 | health·accident | 80 | 예 | [출처](https://www.history.com/this-day-in-history/elvis-presley-dies) |
| arts-05-marilyn-monroe | 1942-06-19 (1942) | 16 | Marries James Dougherty at 16 | 변화 | 2 | -1.3 (68.2) | 무난 | -11.5 | 29.5 | marriage·love | 82 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1946-08 (1946) | 20 | Signs Fox contract; adopts name Marilyn Monroe | 변화 | 3 | -8.3 (52.3) | 무난 | 10.5 | 43.2 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1946-09 (1946) | 20 | Divorces James Dougherty | 부정 | 2 | -8.3 (52.3) | 무난 | 10.5 | 43.2 | marriage | 61 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1953 (1953) | 27 | Niagara, Gentlemen Prefer Blondes, How to Marry a Millionaire make her a top star | 긍정 | 3 | -17.3 (25) | 조심 | 8.7 | 15.9 | career | 52 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1954-01 (1953) | 27 | Suspended by Fox for refusing The Girl in Pink Tights | 부정 | 2 | -17.3 (25) | 조심 | 8.7 | 15.9 | career | 52 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1954-01-14 (1953) | 27 | Marries Joe DiMaggio | 변화 | 2 | -17.3 (25) | 조심 | 8.7 | 15.9 | marriage·love | 23 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1954-10 (1954) | 28 | Files for divorce from DiMaggio (final 1955) | 부정 | 2 | -23.1 (15.9) | 조심 | -3.3 | 9.1 | marriage | 50 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1956-06-29 (1956) | 30 | Marries Arthur Miller | 변화 | 2 | -8.9 (47.7) | 무난 | 8.9 | 97.7 | marriage·love | 55 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1957 (1957) | 31 | Ectopic pregnancy (mid-1957), miscarriage a year later | 부정 | 2 | 4.1 (79.5) | 무난 | 14.8 | 75 | health·accident | 90 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1960-03 (1960) | 34 | Golden Globe Best Actress (Comedy) for Some Like It Hot | 긍정 | 2 | -1.3 (68.2) | 무난 | -14.3 | 9.1 | career | 34 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1961-01 (1960) | 34 | Mexican divorce from Arthur Miller | 부정 | 2 | -1.3 (68.2) | 무난 | -14.3 | 9.1 | marriage | 27 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1961-02 (1961) | 35 | The Misfits released and fails at box office | 부정 | 2 | 20.8 (93.2) | 좋음 | 25.1 | 61.4 | career | 66 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1961 (1961) | 35 | Admitted to Payne Whitney Psychiatric Clinic | 부정 | 2 | 20.8 (93.2) | 좋음 | 25.1 | 61.4 | health·accident | 32 | 아니오 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1962-06 (1962) | 36 | Fired from Something's Got to Give and sued for $750,000 | 부정 | 3 | -9 (43.2) | 무난 | -18.8 | 65.9 | career | 43 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-05-marilyn-monroe | 1962-08-04 (1962) | 36 | Dies of barbiturate overdose at home, aged 36 | 부정 | 3 | -9 (43.2) | 무난 | -18.8 | 65.9 | health·accident | 67 | 예 | [출처](https://en.wikipedia.org/wiki/Marilyn_Monroe) |
| arts-06-madonna | 1983-07 (1983) | 25 | Debut album Madonna (Sire Records) | 변화 | 3 | 24.6 (70.8) | 좋음 | 60.2 | 23.6 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1984-11-12 (1984) | 26 | Like a Virgin released; first US number-one album | 긍정 | 3 | 27.9 (78.3) | 좋음 | 16.2 | 70.8 | career | 76 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1985-08-16 (1985) | 27 | Marries Sean Penn | 변화 | 2 | 10 (55.7) | 무난 | -16.2 | 25.5 | marriage·love | 48 | 아니오 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1989-01-05 (1988) | 30 | Files for divorce from Sean Penn | 부정 | 2 | -10.8 (25.5) | 무난 | -15.4 | 36.8 | marriage | 26 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1989-04 (1989) | 31 | Pepsi pulls commercial and ends sponsorship over &quot;Like a Prayer&quot; video | 부정 | 2 | -17.5 (16) | 조심 | -16.4 | 58.5 | career | 34 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1993 (1993) | 35 | Body of Evidence and Dangerous Game poorly received | 부정 | 2 | -27.7 (6.6) | 조심 | -18.4 | 82.1 | career | 91 | 아니오 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 1997-01 (1996) | 38 | Golden Globe Best Actress for Evita | 긍정 | 2 | 19.8 (65.1) | 좋음 | 0 | 43.4 | career | 88 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 2000-12-22 (2000) | 42 | Marries Guy Ritchie at Skibo Castle | 변화 | 2 | -20.7 (12.3) | 조심 | -31.7 | 53.8 | marriage·love | 84 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 2002 (2002) | 44 | Swept Away critical and commercial failure | 부정 | 2 | 31.9 (85.8) | 좋음 | 49 | 28.3 | career | 67 | 아니오 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 2007-10 (2007) | 49 | Signs 10-year, $120 million 360 deal with Live Nation | 긍정 | 2 | 38 (95.3) | 좋음 | 34.3 | 18.9 | wealth | 88 | 예 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 2008 (2008) | 50 | Divorce from Guy Ritchie | 부정 | 2 | 31.9 (84) | 좋음 | 8 | 43.4 | marriage | 97 | 아니오 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-06-madonna | 2023-06-24 (2023) | 65 | Serious bacterial infection, several days in ICU; tour postponed | 부정 | 2 | 34.3 (91.5) | 좋음 | 32.3 | 8.5 | health·accident | 3 | 아니오 | [출처](https://www.npr.org/2023/06/28/1184907749/madonna-tour-infection) |
| arts-06-madonna | 2024-05 (2024) | 66 | Free Copacabana Beach concert draws 1.6 million (record) | 긍정 | 2 | 27.2 (74.5) | 좋음 | -3.7 | 55.7 | career | 50 | 아니오 | [출처](https://en.wikipedia.org/wiki/Madonna) |
| arts-07-stephen-king | 1971 (1971) | 24 | Marries Tabitha Spruce | 변화 | 2 | -6.1 (41.4) | 무난 | -31.5 | 7 | marriage·love | 56 | 예 | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 1974 (1974) | 27 | Debut novel Carrie published by Doubleday | 변화 | 3 | 7.5 (64.8) | 무난 | 22.6 | 11.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 1977 (1977) | 30 | The Shining published | 긍정 | 2 | 39.5 (93) | 좋음 | 23.7 | 83.6 | career | 34 | 아니오 | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 1987 (1987) | 40 | Family intervention for alcohol/drug addiction; enters treatment | 부정 | 2 | 5.5 (61.7) | 무난 | -4.5 | 97.7 | health·accident | 48 | 아니오 | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 1999-06-19 (1999) | 52 | Struck by a minivan while walking in Maine; severe injuries | 부정 | 3 | -0.8 (50.8) | 무난 | -12.2 | 80.5 | health·accident | 48 | 아니오 | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 2003-11 (2003) | 56 | National Book Foundation Medal for Distinguished Contribution to American Letters | 긍정 | 2 | -21.2 (27.3) | 조심 | -15.4 | 75.8 | career | 9 | 아니오 | [출처](https://en.wikipedia.org/wiki/Stephen_King) |
| arts-07-stephen-king | 2015-09-10 (2015) | 68 | 2014 National Medal of Arts presented by President Obama | 긍정 | 2 | -5.6 (43) | 무난 | 3.6 | 69.5 | career | 62 | 예 | [출처](https://www.npr.org/sections/thetwo-way/2015/09/10/439200712/a-medal-for-a-king-and-for-many-of-americas-greatest-living-artists) |
| arts-08-steven-spielberg | 1971 (1971) | 25 | Directorial debut Duel (TV film) | 변화 | 3 | 12.4 (68.5) | 무난 | 23.9 | 54.6 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1975 (1975) | 29 | Jaws sets domestic box-office record | 긍정 | 3 | 54.4 (99.2) | 좋음 | 32.4 | 76.2 | career | 99 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1982 (1982) | 36 | E.T. the Extra-Terrestrial | 긍정 | 2 | 2 (48.5) | 무난 | 8.7 | 70 | career | 64 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1985-11 (1985) | 39 | Marries Amy Irving | 변화 | 2 | 16.5 (70) | 무난 | -5.4 | 39.2 | marriage·love | 43 | 아니오 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1989-04 (1989) | 43 | Divorce from Amy Irving | 부정 | 2 | -6.8 (25.4) | 무난 | -27.7 | 60 | marriage | 12 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1989 (1989) | 43 | Divorce settlement reportedly about $100 million | 부정 | 2 | -6.8 (25.4) | 무난 | -27.7 | 60 | wealth | 58 | 아니오 | [출처](https://hellomagazine.com/brides/823914/steven-spielberg-unconventional-relationship-ex-wife-amy-irving-100m-divorce) |
| arts-08-steven-spielberg | 1991-10-12 (1991) | 45 | Marries Kate Capshaw | 변화 | 2 | -0.6 (42.3) | 무난 | 1.7 | 43.8 | marriage·love | 74 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1993-06 (1993) | 47 | Jurassic Park becomes highest-grossing film at the time | 긍정 | 3 | 4.5 (56.2) | 무난 | 12.9 | 42.3 | career | 64 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1994-03-21 (1994) | 48 | Schindler's List wins Best Picture; first Best Director Oscar | 긍정 | 3 | 19.8 (82.3) | 좋음 | 25.7 | 22.3 | career | 76 | 예 | [출처](https://www.oscars.org/oscars/ceremonies/1994/memorable-moments) |
| arts-08-steven-spielberg | 1994 (1994) | 48 | Co-founds DreamWorks with Katzenberg and Geffen | 변화 | 2 | 19.8 (82.3) | 좋음 | 25.7 | 22.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1995 (1995) | 49 | AFI Life Achievement Award | 긍정 | 2 | 38.4 (94.6) | 좋음 | 26.2 | 28.5 | career | 94 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 1999-03-21 (1999) | 53 | Second Best Director Oscar for Saving Private Ryan | 긍정 | 3 | 21.1 (86.9) | 좋음 | 18.7 | 72.3 | career | 78 | 예 | [출처](https://en.wikipedia.org/wiki/Steven_Spielberg) |
| arts-08-steven-spielberg | 2016-07-01 (2016) | 70 | The BFG box-office failure | 부정 | 2 | -14.7 (11.5) | 조심 | -34 | 93.1 | career | 5 | 예 | [출처](https://en.wikipedia.org/wiki/The_BFG_(2016_film)) |
| arts-08-steven-spielberg | 2021-12 (2021) | 75 | West Side Story box-office bomb | 부정 | 2 | -19.7 (6.9) | 조심 | -14.1 | 52.3 | career | 37 | 예 | [출처](https://en.wikipedia.org/wiki/West_Side_Story_(2021_film)) |
| arts-09-youn-yuh-jung | 1967 (1967) | 20 | TV acting debut in Mister Gom after TBC audition | 변화 | 2 | -47.5 (0.8) | 조심 | -19 | 71.1 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 1971 (1971) | 24 | Film debut Woman of Fire: Blue Dragon and Sitges Best Actress | 긍정 | 3 | 29 (71.1) | 좋음 | 35.9 | 91.4 | career | 72 | 예 | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 1974 (1974) | 27 | Marries singer Jo Young-nam (some sources say 1975) | 변화 | 2 | -6.5 (32) | 무난 | -46.1 | 82 | marriage·love | 87 | 예 | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 1975 (1975) | 28 | Retires from acting at career peak and emigrates to the US | 변화 | 2 | 1.3 (43) | 무난 | -9.3 | 30.5 | career | — | — | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 1984 (1984) | 37 | Returns to Korea and gradually rebuilds acting career | 변화 | 2 | 23.6 (60.2) | 좋음 | -8 | 93 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 1987 (1987) | 40 | Divorces Jo Young-nam; works to support two sons | 부정 | 2 | -21.1 (14.8) | 조심 | -4.9 | 30.5 | marriage | 61 | 아니오 | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 2021-04 (2021) | 74 | SAG and BAFTA supporting actress awards for Minari | 긍정 | 2 | 31.9 (72.7) | 좋음 | -12.9 | 19.5 | career | 57 | 예 | [출처](https://en.wikipedia.org/wiki/Youn_Yuh-jung) |
| arts-09-youn-yuh-jung | 2021-04-25 (2021) | 74 | Academy Award Best Supporting Actress for Minari (first Korean) | 긍정 | 3 | 31.9 (72.7) | 좋음 | -12.9 | 19.5 | career | 57 | 예 | [출처](https://www.npr.org/sections/live-updates-oscars-2021/2021/04/25/989638064/youn-yuh-jung-is-first-korean-to-win-oscar-for-best-supporting-actress) |
| arts-10-bong-joon-ho | 2000 (2000) | 31 | Feature debut Barking Dogs Never Bite | 변화 | 3 | -2.2 (27.4) | 무난 | -27.3 | 64.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Bong_Joon_Ho) |
| arts-10-bong-joon-ho | 2003 (2003) | 34 | Memories of Murder sells over five million tickets | 긍정 | 3 | 1.3 (34.5) | 무난 | -10.1 | 11.9 | career | 26 | 아니오 | [출처](https://en.wikipedia.org/wiki/Bong_Joon_Ho) |
| arts-10-bong-joon-ho | 2006 (2006) | 37 | The Host becomes highest-grossing South Korean film | 긍정 | 3 | 34.9 (91.7) | 좋음 | 28 | 98.8 | career | 94 | 예 | [출처](https://en.wikipedia.org/wiki/The_Host_(2006_film)) |
| arts-10-bong-joon-ho | 2013 (2013) | 44 | Snowpiercer, English-language debut and Hollywood co-production | 변화 | 2 | -4.7 (22.6) | 무난 | 2.9 | 35.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Bong_Joon_Ho) |
| arts-10-bong-joon-ho | 2017 (2017) | 48 | Revealed as named on government artist blacklist (Lee/Park administrations) | 부정 | 2 | 6.6 (41.7) | 무난 | -12.1 | 94 | career | 87 | 아니오 | [출처](https://en.wikipedia.org/wiki/Bong_Joon_Ho) |
| arts-10-bong-joon-ho | 2019-05-25 (2019) | 50 | Parasite wins Palme d'Or (first Korean film) | 긍정 | 3 | -15.1 (13.1) | 조심 | -18.6 | 11.9 | career | 39 | 아니오 | [출처](https://www.rogerebert.com/festivals/cannes-2019-bong-joon-ho-wins-palme-dor-for-parasite) |
| arts-10-bong-joon-ho | 2020-02-09 (2020) | 51 | Parasite wins Best Picture, Director, Original Screenplay, International Feature | 긍정 | 3 | -37.4 (1.2) | 조심 | -30.1 | 48.8 | career | 16 | 아니오 | [출처](https://www.pbs.org/newshour/arts/parasite-becomes-first-non-english-language-film-to-win-best-picture-oscar) |
| arts-10-bong-joon-ho | 2025-03 (2025) | 56 | Mickey 17 grosses $133.5M against $118M budget; not immediately profitable | 부정 | 2 | 45.6 (98.8) | 좋음 | 25.6 | 35.7 | career | 46 | 예 | [출처](https://en.wikipedia.org/wiki/Mickey_17) |
| business-01-steve-jobs | 1976-04-01 (1976) | 21 | 워즈니악과 애플 컴퓨터 공동 창업 | 변화 | 3 | -16.9 (22.6) | 조심 | 16.8 | 64.3 | move·job | — | — | [출처](http://edition.cnn.com/2010/TECH/web/06/24/apple.forgotten.founder/index.html) |
| business-01-steve-jobs | 1980-12 (1980) | 25 | 애플 기업공개로 백만장자 | 긍정 | 3 | 30.7 (91.7) | 좋음 | 31.3 | 89.3 | wealth | 80 | 예 | [출처](http://content.time.com/time/magazine/article/0,9171,953633,00.html) |
| business-01-steve-jobs | 1985-09 (1985) | 30 | 스컬리·이사회와 권력 다툼 끝에 애플에서 밀려남 | 부정 | 3 | -18.4 (17.9) | 조심 | -7.7 | 51.2 | business | 8 | 예 | [출처](https://www.bloomberg.com/news/articles/2011-10-06/steve-jobs-the-wilderness-1985-1997) |
| business-01-steve-jobs | 1985 (1985) | 30 | 넥스트(NeXT) 창업 | 변화 | 2 | -18.4 (17.9) | 조심 | -7.7 | 51.2 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Steve_Jobs) |
| business-01-steve-jobs | 1986 (1986) | 31 | 루카스필름 그래픽 부문(픽사) 인수 | 변화 | 2 | -31.9 (6) | 조심 | -13.7 | 3.6 | move·job | — | — | [출처](https://www.infoworld.com/article/2309242/steve-jobs-a-look-back-at-his-career.html) |
| business-01-steve-jobs | 1991-03-18 (1991) | 36 | 로린 파월과 요세미티에서 결혼 | 변화 | 2 | 5.7 (56) | 무난 | 3.9 | 41.7 | marriage·love | 75 | 예 | [출처](https://money.cnn.com/2008/03/02/news/companies/elkind_jobs.fortune/index2.htm) |
| business-01-steve-jobs | 1995-11 (1995) | 40 | 픽사 토이 스토리 흥행·평단 성공 | 긍정 | 2 | -20.4 (15.5) | 조심 | -19.3 | 21.4 | business·wealth | 17 | 아니오 | [출처](https://www.latimes.com/archives/la-xpm-1995-10-24-fi-60492-story.html) |
| business-01-steve-jobs | 1997-09 (1997) | 42 | 넥스트 인수 뒤 애플 임시 CEO로 복귀 | 변화 | 3 | -14.8 (25) | 조심 | 1.7 | 51.2 | move·job | — | — | [출처](https://www.eweek.com/de/mobile/eweek-at-30-steve-jobs-returns-in-1997-to-revive-a-moribund-apple/) |
| business-01-steve-jobs | 2007-01-09 (2006) | 51 | 아이폰 발표 | 긍정 | 2 | 10.8 (65.5) | 무난 | -21.1 | 81 | business·wealth | 75 | 예 | [출처](https://www.apple.com/newsroom/2007/01/09Apple-Reinvents-the-Phone-with-iPhone/) |
| business-01-steve-jobs | 2004-07 (2004) | 49 | 췌장 신경내분비종양 휘플 수술 | 부정 | 3 | 26.4 (84.5) | 좋음 | 9.7 | 86.9 | health·accident | 73 | 예 | [출처](https://www.theguardian.com/technology/2011/oct/21/steve-jobs-cancer-surgery-regret) |
| business-01-steve-jobs | 2009-03 (2009) | 54 | 멤피스에서 간 이식 수술 | 부정 | 3 | 35.6 (94) | 좋음 | 14.1 | 51.2 | health·accident | 63 | 예 | [출처](http://www.cnn.com/2009/US/06/23/steve.jobs.liver.transplant/index.html) |
| business-01-steve-jobs | 2011-01-17 (2010) | 55 | 건강 문제로 두 번째 병가 | 부정 | 2 | 28.6 (86.9) | 좋음 | -4.5 | 8.3 | health·accident | 2 | 아니오 | [출처](https://www.nytimes.com/2011/01/18/technology/18apple.html) |
| business-01-steve-jobs | 2011-08-24 (2011) | 56 | 애플 CEO 사임 | 변화 | 3 | 10.6 (63.1) | 무난 | -21.6 | 91.7 | career | — | — | [출처](https://www.apple.com/newsroom/2011/08/24Letter-from-Steve-Jobs/) |
| business-02-bill-gates | 1975-04-04 (1975) | 20 | 폴 앨런과 마이크로소프트 창업 | 변화 | 3 | -20.8 (20.5) | 조심 | -21.6 | 68.8 | move·job | — | — | [출처](https://news.bbc.co.uk/2/hi/business/5085630.stm) |
| business-02-bill-gates | 1980 (1980) | 25 | IBM PC 운영체제 계약 | 긍정 | 2 | 29.4 (95.5) | 좋음 | 36.7 | 8 | business·wealth | 63 | 예 | [출처](https://www.forbes.com/forbes/2002/1223/258_print.html) |
| business-02-bill-gates | 1986-03-13 (1986) | 31 | 마이크로소프트 기업공개 | 긍정 | 3 | -30.2 (2.7) | 조심 | -30.7 | 67 | wealth | 71 | 예 | [출처](https://www.reuters.com/article/rbssTechMediaTelecomNews/idUSN1748882920080917) |
| business-02-bill-gates | 1994-01-01 (1993) | 38 | 멀린다 프렌치와 하와이 라나이에서 결혼 | 변화 | 2 | 11.8 (77.7) | 무난 | 2.5 | 9.8 | marriage·love | 44 | 아니오 | [출처](https://www.bbc.com/news/world-us-canada-56975466) |
| business-02-bill-gates | 1995-08-24 (1995) | 40 | 윈도 95 출시 | 긍정 | 2 | -14.9 (27.7) | 조심 | -14.6 | 40.2 | business·wealth | 73 | 예 | [출처](https://en.wikipedia.org/wiki/Microsoft) |
| business-02-bill-gates | 2000-01-13 (1999) | 44 | CEO를 발머에게 넘기고 최고소프트웨어설계자로 | 변화 | 2 | -28 (4.5) | 조심 | -1.8 | 64.3 | move·job | — | — | [출처](https://news.bbc.co.uk/2/hi/business/5085630.stm) |
| business-02-bill-gates | 2000-06-07 (2000) | 45 | 반독점 1심 판결에서 회사 분할 명령(2001 항소심에서 파기) | 부정 | 2 | -2.8 (49.1) | 무난 | 23.8 | 92 | business | 10 | 예 | [출처](https://www.justice.gov/atr/memorandum-opinion-us-v-microsoft-corp) |
| business-02-bill-gates | 2008-06-27 (2008) | 53 | 마이크로소프트 상근 업무에서 물러남 | 변화 | 3 | 14.8 (83) | 무난 | 26.8 | 1.8 | career | — | — | [출처](http://www.microsoft.com/presspass/press/2006/jun06/06-15CorpNewsPR.mspx) |
| business-02-bill-gates | 2014-02-04 (2014) | 59 | 이사회 의장에서 물러나 기술 고문으로 | 변화 | 2 | -22.6 (15.2) | 조심 | -27.8 | 17.9 | move·job | — | — | [출처](https://news.microsoft.com/2014/02/04/microsoft-board-names-satya-nadella-as-ceo/) |
| business-02-bill-gates | 2020-03-13 (2020) | 65 | 마이크로소프트·버크셔 이사회에서 사임 | 변화 | 2 | 29 (93.8) | 좋음 | 23.8 | 6.3 | move·job | — | — | [출처](https://www.cnbc.com/2020/03/13/bill-gates-leaves-microsoft-board.html) |
| business-02-bill-gates | 2021-05-03 (2021) | 66 | 27년 결혼 끝에 이혼 발표(8월 확정) | 부정 | 2 | 25.8 (90.2) | 좋음 | 6.8 | 93.8 | marriage | 12 | 예 | [출처](https://www.bbc.com/news/world-us-canada-56975466) |
| business-03-warren-buffett | 1952 (1952) | 22 | 수전 톰프슨과 결혼 | 변화 | 2 | -9.6 (41.4) | 무난 | -10.2 | 55.6 | marriage·love | 90 | 예 | [출처](https://www.washingtonpost.com/wp-dyn/articles/A26094-2004Jul29.html) |
| business-03-warren-buffett | 1956 (1956) | 26 | 버핏 파트너십 설립 | 변화 | 2 | -3.6 (57.4) | 무난 | 8.1 | 46.9 | move·job | — | — | [출처](https://www.cnn.com/2014/06/11/us/charlie-munger-fast-facts/index.html) |
| business-03-warren-buffett | 1965 (1965) | 35 | 버크셔 해서웨이 경영권 확보 | 변화 | 3 | -10.8 (38.9) | 무난 | 16 | 76.5 | move·job | — | — | [출처](https://www.wsj.com/finance/investing/read-the-wsjs-early-coverage-of-warren-buffett-01b09b9c) |
| business-03-warren-buffett | 1991-08 (1991) | 61 | 국채 입찰 스캔들 뒤 살로몬 임시 회장 | 변화 | 2 | 4.7 (69.8) | 무난 | -10.4 | 6.8 | move·job | — | — | [출처](https://www.c-span.org/video/?21029-1/securities-trading-investigation) |
| business-03-warren-buffett | 2006-08-30 (2006) | 76 | 76세 생일에 애스트리드 멩크스와 재혼 | 변화 | 2 | 8.3 (75.9) | 무난 | 33.7 | 70.4 | marriage·love | 75 | 예 | [출처](https://www.nytimes.com/2006/09/01/business/01buffett.html) |
| business-03-warren-buffett | 2009-11 (2009) | 79 | BNSF 철도 인수(최대 거래) | 긍정 | 2 | 17.5 (88.3) | 무난 | 32.3 | 64.2 | business·wealth | 43 | 아니오 | [출처](https://www.reuters.com/article/business/buffett-buying-burlington-rail-in-his-biggest-deal-idUSTRE5A22A7/) |
| business-03-warren-buffett | 2012-04-11 (2012) | 82 | 1기 전립선암 진단·방사선 치료 | 부정 | 2 | -21.1 (17.9) | 조심 | -0.5 | 55.6 | health·accident | 31 | 아니오 | [출처](https://www.bbc.co.uk/news/world-us-canada-17751171) |
| business-03-warren-buffett | 2019-02 (2019) | 89 | 크래프트 하인즈 과대 지불 인정·대규모 상각 | 부정 | 2 | -0.8 (61.1) | 무난 | -14.2 | 9.9 | wealth | 20 | 예 | [출처](https://www.reuters.com/article/business/warren-buffett-says-berkshire-overpaid-for-kraft-heinz-idUSKCN1QE1EV/) |
| business-03-warren-buffett | 2025-05-03 (2025) | 95 | 연말 CEO 은퇴·그레그 에이블 승계 발표 | 변화 | 3 | -3.8 (56.2) | 무난 | 16.5 | 76.5 | career | — | — | [출처](https://berkshirehathaway.com/news/may0525.pdf) |
| business-04-martha-stewart | 1961-07 (1961) | 20 | 앤드루 스튜어트와 결혼 | 변화 | 2 | 22 (75) | 좋음 | 0.3 | 97.1 | marriage·love | 4 | 아니오 | [출처](http://www.cbsnews.com/htdocs/troubled_companies/imclone/html/timeline_martha.html) |
| business-04-martha-stewart | 1982-12-13 (1982) | 41 | 첫 책 Entertaining 출간 | 긍정 | 2 | 16.4 (66.4) | 무난 | -13.5 | 84.3 | business·wealth | 47 | 아니오 | [출처](http://www.people.com/people/archive/article/0,,20101736,00.html) |
| business-04-martha-stewart | 1990 (1990) | 49 | 앤드루 스튜어트와 이혼(1987 별거) | 부정 | 2 | 12.5 (55) | 무난 | 12.6 | 63.6 | marriage | 98 | 아니오 | [출처](http://www.people.com/people/archive/article/0,,20101736,00.html) |
| business-04-martha-stewart | 1997 (1997) | 56 | 마사 스튜어트 리빙 옴니미디어 출범 | 변화 | 3 | 0 (37.9) | 무난 | -24.7 | 99.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Martha_Stewart_Living_Omnimedia) |
| business-04-martha-stewart | 1999-10-19 (1999) | 58 | MSLO 뉴욕증시 상장, 첫 자수성가 여성 억만장자 | 긍정 | 3 | -1 (33.6) | 무난 | 8.4 | 20.7 | wealth | 61 | 예 | [출처](https://money.cnn.com/2005/10/31/news/newsmakers/stewart_fortune_111405/) |
| business-04-martha-stewart | 2003-06-04 (2003) | 62 | 기소 직후 CEO·회장직 사임 | 변화 | 2 | 11.6 (50.7) | 무난 | -1.9 | 15 | move·job | — | — | [출처](https://money.cnn.com/2004/03/05/news/companies/martha_verdict/) |
| business-04-martha-stewart | 2004-03-05 (2004) | 63 | 임클론 사건 사법방해 등 유죄 평결 | 부정 | 3 | 9.7 (47.9) | 무난 | -2 | 28.6 | business | 62 | 아니오 | [출처](https://money.cnn.com/2004/03/05/news/companies/martha_verdict/) |
| business-04-martha-stewart | 2004-10-08 (2004) | 63 | 앨더슨 연방교도소 수감(5개월) | 부정 | 3 | 9.7 (47.9) | 무난 | -2 | 28.6 | business | 62 | 아니오 | [출처](http://www.bop.gov/news/press/press_releases/ipaprmsarrival.pdf) |
| business-04-martha-stewart | 2005-09 (2005) | 64 | 출소 후 새 TV 쇼 두 편으로 복귀 | 긍정 | 2 | 19.5 (69.3) | 좋음 | 8.8 | 26.4 | business·wealth | 84 | 예 | [출처](https://www.forbes.com/2005/11/14/martha-stewart-apprentice-cx_vc_1114autofacescan10.html) |
| business-04-martha-stewart | 2015-12-04 (2015) | 74 | MSLO를 시퀀셜 브랜즈에 매각 | 긍정 | 2 | -0.8 (35) | 무난 | -12.4 | 19.3 | wealth | 86 | 예 | [출처](http://www.prnewswire.com/news-releases/martha-stewart-living-omnimedia-announces-closing-of-merger-with-sequential-brands-group-300188338.html) |
| business-05-lee-iacocca | 1964-04 (1964) | 40 | 포드 머스탱 개발·출시 | 긍정 | 3 | 29.6 (96.9) | 좋음 | 9.8 | 82.1 | business·wealth | 20 | 아니오 | [출처](https://www.nytimes.com/2019/07/02/obituaries/lee-iacocca-dead.html) |
| business-05-lee-iacocca | 1970-12 (1970) | 46 | 포드 자동차 사장 취임 | 변화 | 2 | -17 (13) | 조심 | 5.9 | 53.7 | move·job | — | — | [출처](https://www.latimes.com/archives/la-xpm-1990-03-02-fi-1691-story.html) |
| business-05-lee-iacocca | 1978-07-13 (1978) | 54 | 헨리 포드 2세에 의해 해고 | 부정 | 3 | -7.2 (29) | 무난 | -14.7 | 48.1 | business | 88 | 아니오 | [출처](https://www.latimes.com/archives/la-xpm-1990-03-02-fi-1691-story.html) |
| business-05-lee-iacocca | 1978-11 (1978) | 54 | 파산 위기 크라이슬러 사장 취임(1979 회장) | 변화 | 3 | -7.2 (29) | 무난 | -14.7 | 48.1 | move·job | — | — | [출처](https://www.nytimes.com/2019/07/02/obituaries/lee-iacocca-dead.html) |
| business-05-lee-iacocca | 1983 (1983) | 59 | 정부 보증 대출 7년 조기 상환 | 긍정 | 3 | 17.9 (83.3) | 무난 | 33.3 | 71 | business·wealth | 34 | 아니오 | [출처](http://www.foxnews.com/story/0,2933,476344,00.html) |
| business-05-lee-iacocca | 1983-11 (1983) | 59 | 미니밴 출시, 25년간 판매 1위 | 긍정 | 2 | 17.9 (83.3) | 무난 | 33.3 | 71 | business·wealth | 34 | 아니오 | [출처](http://www.foxnews.com/story/0,2933,476344,00.html) |
| business-05-lee-iacocca | 1992-12-31 (1992) | 68 | 크라이슬러 회장·CEO 은퇴 | 변화 | 3 | -1.9 (40.1) | 무난 | 11.8 | 17.9 | career | — | — | [출처](https://money.cnn.com/magazines/fortune/fortune_archive/1992/04/20/76315/index.htm) |
| business-05-lee-iacocca | 1995 (1995) | 71 | 커코리언의 크라이슬러 적대적 인수 시도 실패 | 부정 | 2 | 26.8 (95.7) | 좋음 | 42.2 | 14.8 | business | 33 | 예 | [출처](http://www.detnews.com/specialreports/2002/iacocca/a08-442452.htm) |
| business-06-richard-branson | 1968-01 (1967) | 17 | 잡지 Student 창간 | 변화 | 2 | -8.4 (23.8) | 무난 | -1.8 | 21.3 | move·job | — | — | [출처](http://www.businessinsider.com/richard-branson-fails-virgin-companies-that-went-bust-2012-4?op=1) |
| business-06-richard-branson | 1972 (1972) | 22 | 크리스틴 토마시와 첫 결혼 | 변화 | 2 | 30.6 (95.9) | 좋음 | 26.3 | 27 | marriage·love | 37 | 아니오 | [출처](https://www.newyorker.com/magazine/2007/05/14/bransons-luck) |
| business-06-richard-branson | 1973 (1973) | 23 | 버진 레코드 첫 음반 튜블러 벨스 대히트 | 긍정 | 3 | 22 (91) | 좋음 | -1.9 | 84.4 | business·wealth | 19 | 아니오 | [출처](http://www.biography.com/people/richard-branson-9224520) |
| business-06-richard-branson | 1984 (1984) | 34 | 버진 애틀랜틱 항공 설립 | 변화 | 3 | 15 (81.1) | 무난 | 1.6 | 35.2 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Virgin_Atlantic) |
| business-06-richard-branson | 1989 (1989) | 39 | 조앤 템플먼과 네커섬에서 결혼 | 변화 | 2 | -4.5 (28.7) | 무난 | -13.2 | 69.7 | marriage·love | 89 | 예 | [출처](https://www.travelandleisure.com/travel-tips/celebrity-travel/richard-branson-shares-romance-tips) |
| business-06-richard-branson | 1992 (1992) | 42 | 버진 레코드를 손 EMI에 매각 | 긍정 | 3 | 23.8 (92.6) | 좋음 | 19.6 | 94.3 | wealth | 71 | 예 | [출처](https://en.wikipedia.org/wiki/Virgin_Records) |
| business-06-richard-branson | 1999 (1999) | 49 | 버진 모바일 출범 | 변화 | 2 | 3.6 (48.4) | 무난 | 1.6 | 18 | move·job | — | — | [출처](https://news.bbc.co.uk/1/hi/special_report/1999/12/99/new_years_honours/584131.stm) |
| business-06-richard-branson | 2000-03 (2000) | 50 | 기업가 정신 공로로 기사 작위 | 긍정 | 2 | 12.7 (74.6) | 무난 | 12 | 73 | business·wealth | 39 | 아니오 | [출처](https://news.bbc.co.uk/2/hi/uk_news/695511.stm) |
| business-06-richard-branson | 2004 (2004) | 54 | 우주관광 회사 버진 갤럭틱 설립 | 변화 | 2 | 10.1 (68) | 무난 | -0.8 | 97.5 | move·job | — | — | [출처](http://www.spacenews.com/article/features/38109profile-sir-richard-branson-founder-virgin-galactic) |
| business-06-richard-branson | 2014-10-31 (2014) | 64 | 스페이스십투 시험비행 추락(조종사 1명 사망) | 부정 | 2 | -9.8 (18.9) | 무난 | -20.2 | 33.6 | business | 83 | 아니오 | [출처](https://www.nytimes.com/2014/11/01/science/virgin-galactics-spaceshiptwo-crashes-during-test-flight.html) |
| business-06-richard-branson | 2020-04-21 (2020) | 70 | 코로나로 버진 오스트레일리아 법정관리 | 부정 | 3 | 15.2 (82.8) | 무난 | 16.3 | 66.4 | wealth | 51 | 아니오 | [출처](https://newsroom.virginaustralia.com/release/virgin-australia-enters-voluntary-administration) |
| business-06-richard-branson | 2021-07-11 (2021) | 71 | 자사 우주선으로 우주 경계 비행 | 긍정 | 2 | 2.7 (45.1) | 무난 | -11.8 | 79.5 | business·wealth | 16 | 아니오 | [출처](https://www.nytimes.com/2021/07/11/science/richard-branson-virgin-galactic-space.html) |
| business-06-richard-branson | 2023-04-04 (2023) | 73 | 버진 오빗 파산 신청 | 부정 | 2 | 16.2 (84.4) | 무난 | 9.9 | 13.9 | wealth | 12 | 예 | [출처](https://www.reuters.com/business/aerospace-defense/bransons-virgin-orbit-files-bankruptcy-2023-04-04/) |
| business-07-rupert-murdoch | 1953 (1953) | 22 | 부친 사망 후 애들레이드 The News 경영 승계 | 변화 | 3 | 5.7 (65.6) | 무난 | -1.1 | 46.3 | move·job | — | — | [출처](http://news.bbc.co.uk/2/hi/world/analysis/61122.stm) |
| business-07-rupert-murdoch | 1969 (1969) | 38 | 영국 News of the World·The Sun 인수 | 긍정 | 2 | 14.8 (85.6) | 무난 | 22 | 61.9 | business·wealth | 90 | 예 | [출처](http://news.bbc.co.uk/2/hi/world/analysis/61122.stm) |
| business-07-rupert-murdoch | 1985 (1985) | 54 | 20세기 폭스 인수·미국 시민권 취득 | 긍정 | 2 | 9.6 (76.9) | 무난 | 5.7 | 58.1 | business·wealth | 25 | 아니오 | [출처](http://news.bbc.co.uk/2/hi/world/analysis/61122.stm) |
| business-07-rupert-murdoch | 1999-06 (1999) | 68 | 두 번째 부인 애나와 이혼(12억 달러 합의) | 부정 | 2 | -2.7 (44.4) | 무난 | -0.1 | 11.3 | marriage | 18 | 예 | [출처](https://www.theguardian.com/media/2022/jun/22/the-merry-wives-of-rupert-murdoch-marriage-to-jerry-hall-is-reportedly-over) |
| business-07-rupert-murdoch | 1999-06-25 (1999) | 68 | 웬디 덩과 결혼 | 변화 | 2 | -2.7 (44.4) | 무난 | -0.1 | 11.3 | marriage·love | 12 | 아니오 | [출처](https://www.theguardian.com/media/2022/jun/22/the-merry-wives-of-rupert-murdoch-marriage-to-jerry-hall-is-reportedly-over) |
| business-07-rupert-murdoch | 2000-04 (2000) | 69 | 저등급 전립선암 진단·치료 | 부정 | 2 | 3 (61.9) | 무난 | 3 | 68.8 | health·accident | 46 | 아니오 | [출처](https://www.scmp.com/article/314325/rupert-murdoch-diagnosed-prostate-cancer) |
| business-07-rupert-murdoch | 2007 (2007) | 76 | 다우존스(월스트리트저널) 인수 | 긍정 | 2 | -15.1 (24.4) | 조심 | -11.6 | 78.8 | business·wealth | 37 | 아니오 | [출처](http://news.bbc.co.uk/2/hi/world/analysis/61122.stm) |
| business-07-rupert-murdoch | 2011-07-10 (2011) | 80 | 전화 해킹 스캔들로 News of the World 폐간 | 부정 | 3 | -0.7 (51.9) | 무난 | -6.4 | 27.5 | business | 54 | 아니오 | [출처](http://www.cnn.com/2011/WORLD/europe/07/10/uk.phonehacking/index.html) |
| business-07-rupert-murdoch | 2013-06 (2013) | 82 | 웬디 덩과 이혼 신청 | 부정 | 2 | -20.1 (19.4) | 조심 | -19.1 | 46.3 | marriage | 23 | 예 | [출처](https://world.time.com/2013/06/14/rupert-and-wendi-the-rise-and-fall-of-a-media-couple/slide/born-again-rupert/) |
| business-07-rupert-murdoch | 2016-03-04 (2016) | 85 | 제리 홀과 런던에서 결혼 | 변화 | 2 | -21 (15) | 조심 | 14.7 | 97.5 | marriage·love | 8 | 아니오 | [출처](https://www.smh.com.au/entertainment/celebrity/rupert-murdoch-and-jerry-hall-announce-engagement-20160112-gm40nm.html) |
| business-07-rupert-murdoch | 2019-03-20 (2019) | 88 | 21세기 폭스 자산을 디즈니에 매각 완료 | 긍정 | 3 | -7 (38.1) | 무난 | 3.9 | 78.8 | wealth | 49 | 아니오 | [출처](https://variety.com/2019/biz/news/disney-21st-century-fox-brazil-approval-sports-1203150861/) |
| business-07-rupert-murdoch | 2022-06 (2022) | 91 | 제리 홀과 이혼 | 부정 | 2 | -20.2 (18.1) | 조심 | -25.7 | 51.3 | marriage | 42 | 예 | [출처](https://www.theguardian.com/media/2022/jun/22/rupert-murdoch-jerry-hall-divorce-report) |
| business-07-rupert-murdoch | 2023-04-18 (2023) | 92 | 폭스뉴스, 도미니언에 7억8750만 달러 명예훼손 합의금 | 부정 | 2 | -2 (46.9) | 무난 | 4.5 | 15 | wealth | 49 | 예 | [출처](https://www.nytimes.com/live/2023/04/18/business/fox-news-dominion-trial-settlement/the-787-5-million-deal-is-one-of-the-largest-defamation-settlements-in-us-history) |
| business-07-rupert-murdoch | 2023-09-21 (2023) | 92 | 폭스·뉴스코프 회장직 사퇴 발표 | 변화 | 3 | -2 (46.9) | 무난 | 4.5 | 15 | career | — | — | [출처](https://www.cnn.com/2023/09/21/business/gallery/rupert-murdoch/index.html) |
| business-08-bernard-arnault | 1973 (1973) | 24 | 안 드와브랭과 결혼 | 변화 | 2 | 27 (89.5) | 좋음 | -10.7 | 6.5 | marriage·love | 41 | 아니오 | [출처](https://www.france24.com/en/20200122-bernard-arnault-france-s-wolf-in-cashmere-billionaire) |
| business-08-bernard-arnault | 1984 (1984) | 35 | 디올을 보유한 부삭 그룹 인수 | 긍정 | 3 | 44.9 (97.6) | 좋음 | 9.7 | 70.2 | business·wealth | 50 | 아니오 | [출처](https://www.france24.com/en/20200122-bernard-arnault-france-s-wolf-in-cashmere-billionaire) |
| business-08-bernard-arnault | 1989-01 (1988) | 39 | LVMH 경영권 장악(회장 취임) | 긍정 | 3 | 5 (46) | 무난 | -8.2 | 0.8 | business·wealth | 74 | 예 | [출처](https://www.nytimes.com/1989/12/17/magazine/a-luxury-fight-to-the-finish.html) |
| business-08-bernard-arnault | 1990 (1990) | 41 | 첫 부인과 별거·이혼 | 부정 | 2 | -2.9 (23.4) | 무난 | 0.8 | 83.1 | marriage | 41 | 예 | [출처](https://www.france24.com/en/20200122-bernard-arnault-france-s-wolf-in-cashmere-billionaire) |
| business-08-bernard-arnault | 1991 (1991) | 42 | 피아니스트 엘렌 메르시에와 재혼 | 변화 | 2 | 1.4 (37.9) | 무난 | 9.1 | 49.2 | marriage·love | 98 | 예 | [출처](https://www.france24.com/en/20200122-bernard-arnault-france-s-wolf-in-cashmere-billionaire) |
| business-08-bernard-arnault | 2001-09 (2001) | 52 | 구찌 인수전에서 피노(PPR)에 패배 | 부정 | 2 | 13.3 (66.9) | 무난 | 11.8 | 84.7 | business | 11 | 예 | [출처](https://www.nytimes.com/2001/09/11/business/pinault-wins-long-battle-to-control-gucci-group.html) |
| business-08-bernard-arnault | 2013-06-25 (2013) | 64 | 에르메스 지분 은밀 매집으로 AMF 800만 유로 제재 | 부정 | 2 | 22.9 (84.7) | 좋음 | 9.3 | 75 | wealth | 39 | 예 | [출처](https://www.hsfkramer.com/notes/fsrandcorpcrime/2013-07/french-amfs-e8m-fine-for-lvmhs-disclosure-failures-that-concealed-stakebuilding-in-hermes) |
| business-08-bernard-arnault | 2021-01 (2020) | 71 | 티파니 인수 완료 | 긍정 | 2 | 2.1 (39.5) | 무난 | 16.2 | 97.6 | business·wealth | 48 | 아니오 | [출처](https://www.reuters.com/article/us-lvmh-tiffany-changes-focus/more-carats-and-sparkle-how-lvmh-plans-to-change-tiffany-idUSKBN29V0JH) |
| business-08-bernard-arnault | 2021-12 (2021) | 72 | 스카르치니 첩보 사건 LVMH 1000만 유로 합의 | 부정 | 2 | -2 (28.2) | 무난 | 3.5 | 16.9 | business | 52 | 아니오 | [출처](https://www.ft.com/content/1688b150-49b8-45f7-8b00-b37d3e518675) |
| business-08-bernard-arnault | 2023-04-04 (2023) | 74 | 포브스 세계 부호 1위(프랑스인 최초) | 긍정 | 3 | 6.3 (47.6) | 무난 | 10.8 | 12.9 | business·wealth | 63 | 예 | [출처](https://www.thenationalnews.com/business/money/2023/04/05/bernard-arnault-crowned-the-worlds-richest-person-in-2023) |
| business-09-elon-musk | 1995 (1995) | 24 | 동생과 Zip2 창업 | 변화 | 2 | 39 (98.8) | 좋음 | 22.3 | 53.8 | move·job | — | — | [출처](https://www.cnbc.com/2018/06/19/how-elon-musk-founded-zip2-with-his-brother-kimbal.html) |
| business-09-elon-musk | 1999-02 (1999) | 28 | 컴팩이 Zip2를 3억700만 달러에 인수 | 긍정 | 2 | -1.4 (43.8) | 무난 | -0.3 | 66.3 | wealth | 11 | 아니오 | [출처](https://www.britannica.com/money/Zip2) |
| business-09-elon-musk | 1999 (1999) | 28 | 온라인 금융 X.com 공동 창업 | 변화 | 2 | -1.4 (43.8) | 무난 | -0.3 | 66.3 | move·job | — | — | [출처](https://www.cnbc.com/2018/06/19/how-elon-musk-founded-zip2-with-his-brother-kimbal.html) |
| business-09-elon-musk | 2000-09 (2000) | 29 | 신혼여행 중 이사회가 X.com(페이팔) CEO에서 해임 | 부정 | 3 | -0.3 (48.8) | 무난 | 4.5 | 73.8 | business | 23 | 예 | [출처](https://www.snopes.com/fact-check/was-elon-musk-fired-from-paypal/) |
| business-09-elon-musk | 2002 (2002) | 31 | 이베이가 페이팔을 15억 달러에 인수, 최대 주주로 큰 수익 | 긍정 | 3 | 16.1 (76.3) | 무난 | 16.8 | 60 | wealth | 71 | 예 | [출처](https://www.sec.gov/Archives/edgar/data/1103415/000091205702009834/a2073071z10-k405.htm) |
| business-09-elon-musk | 2002-05 (2002) | 31 | 스페이스X 창업 | 변화 | 3 | 16.1 (76.3) | 무난 | 16.8 | 60 | move·job | — | — | [출처](https://www.bloomberg.com/graphics/2015-elon-musk-spacex/) |
| business-09-elon-musk | 2006-03 (2006) | 35 | 팰컨1 첫 발사 실패(이후 2회 더 실패) | 부정 | 2 | -19.4 (6.3) | 조심 | -27.8 | 38.8 | business | 86 | 아니오 | [출처](https://spacenews.com/griffin-reiterates-commitment-commercial-services/) |
| business-09-elon-musk | 2008-06 (2008) | 37 | 첫 부인 저스틴과 이혼 | 부정 | 2 | 22.6 (86.3) | 좋음 | 24.7 | 68.8 | marriage | 93 | 아니오 | [출처](https://www.ibtimes.com/spacexs-elon-musk-once-married-divorced-actress-twice-3194912) |
| business-09-elon-musk | 2008-09 (2008) | 37 | 팰컨1 궤도 진입 성공, 연말 NASA 16억 달러 계약 | 긍정 | 3 | 22.6 (86.3) | 좋음 | 24.7 | 68.8 | business·wealth | 34 | 아니오 | [출처](https://www.nasa.gov/exploration/news/COTS_selection.html) |
| business-09-elon-musk | 2008-10 (2008) | 37 | 테슬라 CEO 취임 | 변화 | 2 | 22.6 (86.3) | 좋음 | 24.7 | 68.8 | move·job | — | — | [출처](https://www.cnet.com/news/tesla-ceo-steps-down-as-possible-delays-loom/) |
| business-09-elon-musk | 2010 (2010) | 39 | 탈룰라 라일리와 결혼 | 변화 | 2 | -12.4 (18.8) | 조심 | -13.5 | 98.8 | marriage·love | 1 | 아니오 | [출처](https://www.theguardian.com/technology/2016/mar/21/elon-musk-talulah-riley-file-divorce-second-marriage) |
| business-09-elon-musk | 2010-06-29 (2010) | 39 | 테슬라 나스닥 상장 | 긍정 | 3 | -12.4 (18.8) | 조심 | -13.5 | 98.8 | wealth | 5 | 아니오 | [출처](https://www.bloomberg.com/news/articles/2010-06-29/tesla-motors-raises-226-million-in-first-ipo-of-u-s-carmaker-in-54-years) |
| business-09-elon-musk | 2018-09-29 (2018) | 47 | &quot;자금 확보&quot; 트윗으로 SEC 합의, 벌금 2천만 달러·의장 사임 | 부정 | 2 | -36.4 (1.3) | 조심 | -22.3 | 30 | business | 64 | 아니오 | [출처](https://www.sec.gov/news/press-release/2018-226) |
| business-09-elon-musk | 2022-10-27 (2022) | 51 | 트위터 인수 완료 | 긍정 | 2 | 8 (66.3) | 무난 | 0.4 | 90 | business·wealth | 51 | 예 | [출처](https://www.bbc.com/news/business-60979656) |
| business-10-lee-kun-hee | 1987-12 (1987) | 45 | 부친 별세 후 삼성그룹 회장 취임 | 변화 | 3 | 43.3 (99.2) | 좋음 | 26.6 | 60.2 | move·job | — | — | [출처](https://www.forbes.com/profile/lee-kun-hee/) |
| business-10-lee-kun-hee | 1993-06 (1993) | 51 | 프랑크푸르트 신경영 선언(&quot;마누라·자식 빼고 다 바꿔라&quot;) | 변화 | 2 | -18.9 (16.4) | 조심 | -3 | 68 | move·job | — | — | [출처](https://www.theverge.com/2012/11/30/3709688/samsung-25-years-lee-kun-hee) |
| business-10-lee-kun-hee | 1995 (1995) | 53 | 삼성자동차 설립 | 변화 | 2 | 5.5 (49.2) | 무난 | 2.6 | 61.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Renault_Korea) |
| business-10-lee-kun-hee | 1996-08 (1996) | 54 | 노태우 비자금(뇌물) 사건 유죄·집행유예(후에 사면) | 부정 | 2 | 11.8 (57) | 무난 | -3.3 | 71.1 | business | 95 | 아니오 | [출처](https://www.forbes.com/profile/lee-kun-hee/) |
| business-10-lee-kun-hee | 2000-09 (2000) | 58 | 외환위기 뒤 법정관리 삼성자동차를 르노에 매각 | 부정 | 2 | 3 (43) | 무난 | -24.5 | 81.3 | business | 4 | 예 | [출처](https://en.wikipedia.org/wiki/Renault_Korea) |
| business-10-lee-kun-hee | 2008-04-21 (2008) | 66 | 특검 수사 책임지고 회장직 사퇴 | 변화 | 3 | -5.3 (35.2) | 무난 | -40.9 | 8.6 | move·job | — | — | [출처](http://english.hani.co.kr/arti/english_edition/e_national/281425.html) |
| business-10-lee-kun-hee | 2008-07-16 (2008) | 66 | 조세포탈 유죄, 벌금·징역 3년 집행유예 | 부정 | 3 | -5.3 (35.2) | 무난 | -40.9 | 8.6 | business | 87 | 아니오 | [출처](https://www.theverge.com/2012/11/30/3709688/samsung-25-years-lee-kun-hee) |
| business-10-lee-kun-hee | 2010-03-24 (2010) | 68 | 특별사면(2009-12-29) 후 삼성전자 회장 복귀 | 변화 | 2 | 31.1 (89.8) | 좋음 | 29 | 20.3 | move·job | — | — | [출처](https://www.koreatimes.co.kr/www/tech/2019/05/693_62923.html) |
| business-10-lee-kun-hee | 2012-11 (2012) | 70 | 삼성전자 세계 최대 휴대폰·메모리 업체로 | 긍정 | 2 | -5.7 (33.6) | 무난 | -36.8 | 81.3 | business·wealth | 50 | 아니오 | [출처](https://www.theverge.com/2012/11/30/3709688/samsung-25-years-lee-kun-hee) |
| business-10-lee-kun-hee | 2014-05 (2014) | 72 | 급성 심근경색으로 쓰러져 와병 | 부정 | 3 | 30.5 (86.7) | 좋음 | 37.3 | 26.6 | health·accident | 19 | 아니오 | [출처](https://www.bloomberg.com/news/articles/2020-10-25/samsung-electronics-says-chairman-lee-kun-hee-has-died) |
| sports-01-muhammad-ali | 1960 (1960) | 18 | Rome Olympics light-heavyweight gold | 긍정 | 3 | -52.2 (0.8) | 조심 | -40.7 | 84.2 | career | 19 | 아니오 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1960-10-29 (1960) | 18 | Professional debut vs Tunney Hunsaker | 변화 | 2 | -52.2 (0.8) | 조심 | -40.7 | 84.2 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1964-02-25 (1964) | 22 | Won world heavyweight title vs Sonny Liston | 긍정 | 3 | 5.3 (52.5) | 무난 | 10.5 | 74.2 | career | 80 | 예 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1964 (1964) | 22 | Married Sonji Roi (divorced 1966) | 변화 | 2 | 5.3 (52.5) | 무난 | 10.5 | 74.2 | marriage·love | 48 | 아니오 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1967-04-28 (1967) | 25 | Refused army induction; stripped of title and boxing license (exile until 1970) | 부정 | 3 | 40.9 (95.8) | 좋음 | 15.2 | 94.2 | career | 98 | 아니오 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1971-03-08 (1971) | 29 | First professional loss, to Joe Frazier (Fight of the Century) | 부정 | 3 | -25.9 (14.2) | 조심 | -7.3 | 45.8 | career | 13 | 예 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1971-06-28 (1971) | 29 | US Supreme Court overturned draft-evasion conviction | 긍정 | 2 | -25.9 (14.2) | 조심 | -7.3 | 45.8 | career | 13 | 아니오 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1974-10-30 (1974) | 32 | Regained heavyweight title vs George Foreman (Rumble in the Jungle) | 긍정 | 3 | 34.7 (89.2) | 좋음 | 63.5 | 77.5 | career | 75 | 예 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-01-muhammad-ali | 1975-10-01 (1975) | 33 | Beat Joe Frazier in Thrilla in Manila | 긍정 | 2 | 28.3 (79.2) | 좋음 | 20.8 | 82.5 | career | 63 | 예 | [출처](https://www.espn.com/blog/statsinfo/post/_/id/109975/looking-back-thrilla-in-manila-and-ali-holmes-40-and-35-years-later) |
| sports-01-muhammad-ali | 1978-02-15 (1978) | 36 | Lost title to Leon Spinks (split decision) | 부정 | 2 | 13.6 (65.8) | 무난 | -10.4 | 48.3 | career | 68 | 아니오 | [출처](https://www.history.com/this-day-in-history/ali-defeats-spinks-to-win-world-heavyweight-championship) |
| sports-01-muhammad-ali | 1978-09-15 (1978) | 36 | Beat Spinks in rematch; first three-time heavyweight champion | 긍정 | 3 | 13.6 (65.8) | 무난 | -10.4 | 48.3 | career | 68 | 예 | [출처](https://www.history.com/this-day-in-history/ali-defeats-spinks-to-win-world-heavyweight-championship) |
| sports-01-muhammad-ali | 1980-10-02 (1980) | 38 | Comeback loss to Larry Holmes; corner stopped the fight | 부정 | 2 | -34.8 (5.8) | 조심 | -47.9 | 27.5 | career | 3 | 예 | [출처](https://www.espn.com/blog/statsinfo/post/_/id/109975/looking-back-thrilla-in-manila-and-ali-holmes-40-and-35-years-later) |
| sports-01-muhammad-ali | 1981-12-11 (1981) | 39 | Final fight, loss to Trevor Berbick; retired | 변화 | 3 | -33 (9.2) | 조심 | -22 | 42.5 | career | — | — | [출처](https://www.the-star.co.ke/news/2016-06-04-factbox-key-bouts-in-late-muhammad-alis-boxing-career/) |
| sports-01-muhammad-ali | 1984-09 (1984) | 42 | Diagnosed with Parkinson's syndrome | 부정 | 3 | -19.7 (20.8) | 조심 | 5.3 | 90.8 | health·accident | 68 | 예 | [출처](https://www.vanguardngr.com/2016/06/key-dates-in-muhammad-alis-life-and-career/amp/) |
| sports-01-muhammad-ali | 1986 (1986) | 44 | Married Yolanda 'Lonnie' Williams (after divorcing Veronica Porché, 1986) | 변화 | 2 | 37.6 (90.8) | 좋음 | 47 | 44.2 | marriage·love | 86 | 예 | [출처](https://en.wikipedia.org/wiki/Muhammad_Ali) |
| sports-02-michael-jordan | 1984 (1984) | 21 | Los Angeles Olympics basketball gold | 긍정 | 3 | 49.5 (96.9) | 좋음 | 13.5 | 46.9 | career | 26 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 1984-06 (1984) | 21 | Drafted 3rd overall by Chicago Bulls | 변화 | 2 | 49.5 (96.9) | 좋음 | 13.5 | 46.9 | move·job | — | — | [출처](https://www.espn.com/nba/player/bio/_/id/1035/michael-jordan) |
| sports-02-michael-jordan | 1985-10-29 (1985) | 22 | Broke left foot; missed 64 games | 부정 | 3 | 21 (86.5) | 좋음 | -30.5 | 86.5 | health·accident | 85 | 예 | [출처](https://nbcsports.com/bayarea/warriors/michael-jordan-devastated-breaking-foot-vs-warriors-last-dance) |
| sports-02-michael-jordan | 1988 (1988) | 25 | First NBA MVP (1987-88) | 긍정 | 3 | -10.8 (40.6) | 무난 | -41.5 | 69.8 | career | 95 | 예 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 1989-09-02 (1989) | 26 | Married Juanita Vanoy | 변화 | 2 | -18 (28.1) | 조심 | -27.7 | 38.5 | marriage·love | 34 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 1991-06 (1991) | 28 | First NBA championship and Finals MVP | 긍정 | 3 | -1.2 (65.6) | 무난 | 4.2 | 15.6 | career | 51 | 예 | [출처](https://www.espn.com/nba/player/bio/_/id/1035/michael-jordan) |
| sports-02-michael-jordan | 1993-10-06 (1993) | 30 | First retirement from NBA | 변화 | 3 | 4.1 (74) | 무난 | -3.6 | 76 | career | — | — | [출처](https://basketball.realgm.com/player/Michael-Jordan/Timeline/1192) |
| sports-02-michael-jordan | 1994-02-07 (1994) | 31 | Signed minor-league baseball deal with White Sox (Birmingham Barons) | 변화 | 2 | 13.2 (80.2) | 무난 | 2.8 | 31.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 1995-03-18 (1995) | 32 | Returned to the Bulls | 변화 | 2 | 44.2 (94.8) | 좋음 | 35.5 | 92.7 | move·job | — | — | [출처](https://basketball.realgm.com/player/Michael-Jordan/Timeline/1192) |
| sports-02-michael-jordan | 1999-01-13 (1998) | 35 | Second retirement after sixth title (1998) | 변화 | 3 | -27.9 (9.4) | 조심 | -36.2 | 7.3 | career | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 2001-09-25 (2001) | 38 | Comeback with Washington Wizards | 변화 | 2 | -24.9 (13.5) | 조심 | -5.6 | 42.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 2003-05-07 (2003) | 40 | Final retirement (April 2003) then fired from Wizards front office | 부정 | 2 | -10.4 (44.8) | 무난 | 3.5 | 3.1 | career | 76 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 2006-12-29 (2006) | 43 | Divorce from Juanita Vanoy, reported $168M settlement | 부정 | 2 | -20.6 (19.8) | 조심 | -3.4 | 59.4 | marriage | 99 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 2013-04-27 (2013) | 50 | Married Yvette Prieto | 변화 | 2 | -14.3 (34.4) | 조심 | -4.5 | 34.4 | marriage·love | 24 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-02-michael-jordan | 2023-08 (2023) | 60 | Sold majority stake in Charlotte Hornets (~$3B valuation) | 긍정 | 2 | 7.3 (78.1) | 무난 | 20.7 | 3.1 | wealth | 64 | 예 | [출처](https://en.wikipedia.org/wiki/Michael_Jordan) |
| sports-03-tiger-woods | 1996-08 (1996) | 21 | Turned professional | 변화 | 2 | -2 (48.6) | 무난 | 6.2 | 11.1 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Tiger_Woods) |
| sports-03-tiger-woods | 1997-04-13 (1997) | 22 | First major: Masters by record 12 shots | 긍정 | 3 | 26.4 (90.3) | 좋음 | 38.5 | 88.9 | career | 93 | 예 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2001-04 (2001) | 26 | Completed 'Tiger Slam' (four straight majors) at 2001 Masters | 긍정 | 3 | 27.7 (93.1) | 좋음 | 15.6 | 40.3 | career | 36 | 아니오 | [출처](https://en.wikipedia.org/wiki/Tiger_Woods) |
| sports-03-tiger-woods | 2004-10 (2004) | 29 | Married Elin Nordegren | 변화 | 2 | -12.6 (31.9) | 조심 | -18.3 | 62.5 | marriage·love | 39 | 아니오 | [출처](https://en.wikipedia.org/wiki/Tiger_Woods) |
| sports-03-tiger-woods | 2008-06 (2008) | 33 | US Open win (14th major) at Torrey Pines in playoff | 긍정 | 3 | 4 (62.5) | 무난 | 5.2 | 11.1 | career | 83 | 예 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2008-06 (2008) | 33 | Season-ending ACL reconstruction on left knee (out 8 months) | 부정 | 3 | 4 (62.5) | 무난 | 5.2 | 11.1 | health·accident | 50 | 아니오 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2009-11-27 (2009) | 34 | SUV crash, infidelity scandal, loss of sponsors | 부정 | 3 | 39 (98.6) | 좋음 | 44.8 | 88.9 | career | 99 | 아니오 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2009-12 (2009) | 34 | Indefinite break from golf until April 2010 Masters | 변화 | 2 | 39 (98.6) | 좋음 | 44.8 | 88.9 | career | — | — | [출처](https://en.wikipedia.org/wiki/Tiger_Woods) |
| sports-03-tiger-woods | 2010-08 (2010) | 35 | Divorce from Elin Nordegren finalized | 부정 | 2 | 2.5 (54.2) | 무난 | -19 | 19.4 | marriage | 71 | 아니오 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2017-04-20 (2017) | 42 | Fourth back surgery (spinal fusion) after 2014-2017 series | 부정 | 3 | 6.5 (68.1) | 무난 | 15.7 | 37.5 | health·accident | 38 | 아니오 | [출처](https://en.wikipedia.org/wiki/Tiger_Woods) |
| sports-03-tiger-woods | 2017-05-30 (2017) | 42 | DUI arrest in Jupiter, Florida; later reckless-driving plea | 부정 | 2 | 6.5 (68.1) | 무난 | 15.7 | 37.5 | career | 14 | 예 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2019-04-14 (2019) | 44 | Masters win, 15th major, first in 11 years | 긍정 | 3 | 0.6 (51.4) | 무난 | -17.1 | 30.6 | career | 79 | 예 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-03-tiger-woods | 2021-02-23 (2021) | 46 | Rollover car crash, open fractures of right leg | 부정 | 3 | 18.3 (84.7) | 좋음 | 24.8 | 93.1 | health·accident | 54 | 예 | [출처](https://www.foxsports.com/articles/golf/tiger-woods-a-timeline-of-significant-moments-on-and-off-the-golf-course) |
| sports-04-steffi-graf | 1987-06 (1987) | 18 | First Grand Slam: French Open | 긍정 | 3 | 20.7 (84.5) | 좋음 | 21.1 | 32.1 | career | 80 | 예 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1987-08-17 (1987) | 18 | Became world No. 1 | 긍정 | 2 | 20.7 (84.5) | 좋음 | 21.1 | 32.1 | career | 80 | 예 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1988 (1988) | 19 | Golden Slam: all four majors plus Seoul Olympic gold | 긍정 | 3 | -20.4 (17.9) | 조심 | -30 | 3.6 | career | 56 | 예 | [출처](https://www.ebsco.com/research-starters/history/graf-wins-golden-grand-slam) |
| sports-04-steffi-graf | 1990 (1990) | 21 | Lost French Open and US Open finals; tabloid scandal about father | 부정 | 2 | -26.6 (10.7) | 조심 | -4.6 | 38.1 | career | 20 | 예 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1992-08 (1992) | 23 | Barcelona Olympic final loss to Capriati (silver) | 부정 | 2 | -9.8 (34.5) | 무난 | 16.8 | 54.8 | career | 4 | 예 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1995-08 (1995) | 26 | Father/manager Peter Graf arrested for tax evasion on her earnings | 부정 | 2 | 33.3 (91.7) | 좋음 | 43.7 | 48.8 | wealth | 96 | 아니오 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1997-01-27 (1996) | 27 | Father sentenced to 45 months; her own case dropped after paying a fine | 부정 | 2 | 4.1 (63.1) | 무난 | -10.2 | 60.7 | career | 61 | 아니오 | [출처](https://www.tennisnet.com/en/news/25-years-ago-peter-graf-is-arrested) |
| sports-04-steffi-graf | 1997-06 (1997) | 28 | Reconstructive left knee surgery, months out | 부정 | 3 | -17.6 (22.6) | 조심 | -36.3 | 20.2 | health·accident | 54 | 예 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1999-06 (1999) | 30 | 22nd and last Grand Slam: French Open | 긍정 | 3 | 5.6 (65.5) | 무난 | 20 | 32.1 | career | 48 | 아니오 | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 1999-08-13 (1999) | 30 | Announced retirement at age 30 | 변화 | 3 | 5.6 (65.5) | 무난 | 20 | 32.1 | career | — | — | [출처](https://en.wikipedia.org/wiki/Steffi_Graf) |
| sports-04-steffi-graf | 2001-10-22 (2001) | 32 | Married Andre Agassi in Las Vegas | 변화 | 2 | -41.6 (1.2) | 조심 | -25.7 | 88.1 | marriage·love | 43 | 아니오 | [출처](https://www.aol.com/andre-agassi-steffi-graf-tennis-220000524.html) |
| sports-04-steffi-graf | 2001-10-26 (2001) | 32 | Son Jaden Gil born | 변화 | 2 | -41.6 (1.2) | 조심 | -25.7 | 88.1 | child | 33 | 아니오 | [출처](https://digitalhit.com/news/main/2001/10/28/son-for-graf-and-agassi) |
| sports-04-steffi-graf | 2003-10-03 (2003) | 34 | Daughter Jaz Elle born | 변화 | 2 | -3.1 (48.8) | 무난 | 19.7 | 14.3 | child | 68 | 예 | [출처](https://www.aol.com/andre-agassi-steffi-graf-tennis-220000524.html) |
| sports-05-diego-maradona | 1976-10-20 (1976) | 16 | Professional debut for Argentinos Juniors | 변화 | 2 | -0.2 (48.9) | 무난 | -9.9 | 83.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1978 (1978) | 18 | Left out of Argentina's 1978 World Cup squad | 부정 | 2 | 18.5 (88) | 좋음 | 11.2 | 47.8 | career | 94 | 아니오 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1982 (1982) | 22 | World-record transfer to Barcelona (£5M) | 변화 | 2 | -8.5 (35.9) | 무난 | 33 | 53.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1983-09-24 (1983) | 23 | Ankle broken by Andoni Goikoetxea tackle | 부정 | 3 | -28.5 (14.1) | 조심 | -0.1 | 17.4 | health·accident | 22 | 아니오 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1984-07-05 (1984) | 24 | Record transfer to Napoli (£6.9M) | 변화 | 2 | -9.1 (31.5) | 무난 | 9.4 | 70.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1986-06-29 (1986) | 26 | Captained Argentina to World Cup title | 긍정 | 3 | 20.6 (90.2) | 좋음 | 28.2 | 25 | career | 94 | 예 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1987-05 (1987) | 27 | Napoli's first Serie A title (1986-87) | 긍정 | 2 | 22.6 (96.7) | 좋음 | 15.3 | 30.4 | career | 98 | 예 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1989-11 (1989) | 29 | Married Claudia Villafañe in Buenos Aires | 변화 | 2 | 0.8 (57.6) | 무난 | -5.3 | 5.4 | marriage·love | 38 | 아니오 | [출처](https://www.republicworld.com/sports/football/who-is-diego-maradonas-ex-wife-claudia-villafane-how-many-kids-did-maradona-have) |
| sports-05-diego-maradona | 1990-07-08 (1990) | 30 | Lost 1990 World Cup final to West Germany | 부정 | 2 | 7 (70.7) | 무난 | 11.8 | 47.8 | career | 28 | 예 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1991 (1991) | 31 | 15-month ban for cocaine; left Napoli | 부정 | 3 | -6.1 (42.4) | 무난 | -9.9 | 66.3 | career | 22 | 예 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1994-06 (1994) | 34 | Sent home from 1994 World Cup for ephedrine | 부정 | 3 | 13.2 (81.5) | 무난 | 45.9 | 33.7 | career | 74 | 아니오 | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 1997-10 (1997) | 37 | Retired at 37 after another failed drug test | 변화 | 3 | 11 (75) | 무난 | 8.1 | 43.5 | career | — | — | [출처](https://www.thestar.com.my/news/world/2020/11/26/timeline-of-argentine-football-legend-maradona039s-life) |
| sports-05-diego-maradona | 2008-10 (2008) | 48 | Appointed Argentina national team coach (to 2010) | 변화 | 2 | -8.7 (33.7) | 무난 | -29.1 | 63 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Diego_Maradona) |
| sports-05-diego-maradona | 2020-11-03 (2020) | 60 | Brain surgery for subdural hematoma; died 2020-11-25 | 부정 | 3 | -29 (9.8) | 조심 | -25.4 | 63 | health·accident | 77 | 예 | [출처](https://www.aljazeera.com/sports/2020/11/3/football-star-maradona-to-undergo-brain-surgery) |
| sports-06-roger-federer | 1998 (1998) | 17 | Turned professional | 변화 | 2 | -26.7 (1.7) | 조심 | -25 | 83.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2003-07 (2003) | 22 | First Grand Slam: Wimbledon | 긍정 | 3 | 9.6 (55) | 무난 | 3.3 | 48.3 | career | 38 | 아니오 | [출처](https://www.khaleejtimes.com/sports/tennis/look-roger-federers-journey-to-the-top-of-the-mens-game) |
| sports-06-roger-federer | 2004-02-02 (2003) | 22 | Became world No. 1 | 긍정 | 2 | 9.6 (55) | 무난 | 3.3 | 48.3 | career | 38 | 아니오 | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2008 (2008) | 27 | Mononucleosis in 2008 season | 부정 | 2 | 22.8 (85) | 좋음 | 26.9 | 90 | health·accident | 54 | 예 | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2008-07 (2008) | 27 | Lost Wimbledon final to Rafael Nadal | 부정 | 2 | 22.8 (85) | 좋음 | 26.9 | 90 | career | 45 | 예 | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2008-08 (2008) | 27 | Beijing Olympic doubles gold (with Wawrinka) | 긍정 | 3 | 22.8 (85) | 좋음 | 26.9 | 90 | career | 45 | 아니오 | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2009-04 (2009) | 28 | Married Mirka Vavrinec in Basel | 변화 | 2 | 6.6 (45) | 무난 | -7.3 | 20 | marriage·love | 35 | 아니오 | [출처](https://supersport.com/tennis/atp/news/7d953e4f-a903-4673-8322-8b959a9765f3/key-dates-from-roger-federer-s-historic-career) |
| sports-06-roger-federer | 2009-06 (2009) | 28 | French Open win completing career Grand Slam | 긍정 | 3 | 6.6 (45) | 무난 | -7.3 | 20 | career | 8 | 아니오 | [출처](https://en.wikipedia.org/wiki/Roger_Federer) |
| sports-06-roger-federer | 2009-07-23 (2009) | 28 | Twin daughters Myla and Charlene born | 변화 | 2 | 6.6 (45) | 무난 | -7.3 | 20 | child | 13 | 아니오 | [출처](https://www.swissinfo.ch/eng/roger-federer-becomes-father-of-twin-girls/7523386) |
| sports-06-roger-federer | 2014-05-06 (2014) | 33 | Twin sons Leo and Lenny born | 변화 | 2 | 3.6 (31.7) | 무난 | -25.2 | 45 | child | 55 | 예 | [출처](https://time.com/90515/roger-federer-twins-again) |
| sports-06-roger-federer | 2016-02 (2016) | 35 | Left knee surgery; season cut short (half-year out) | 부정 | 3 | 1.1 (25) | 무난 | -3.5 | 5 | health·accident | 35 | 아니오 | [출처](https://supersport.com/tennis/atp/news/7d953e4f-a903-4673-8322-8b959a9765f3/key-dates-from-roger-federer-s-historic-career) |
| sports-06-roger-federer | 2017-01 (2016) | 35 | Australian Open comeback title (18th major) at 35 | 긍정 | 3 | 1.1 (25) | 무난 | -3.5 | 5 | career | 77 | 예 | [출처](https://supersport.com/tennis/atp/news/7d953e4f-a903-4673-8322-8b959a9765f3/key-dates-from-roger-federer-s-historic-career) |
| sports-06-roger-federer | 2020 (2020) | 39 | Two knee surgeries in 2020 (third after Wimbledon 2021) | 부정 | 3 | 41.8 (98.3) | 좋음 | 37.3 | 90 | health·accident | 70 | 예 | [출처](https://supersport.com/tennis/atp/news/7d953e4f-a903-4673-8322-8b959a9765f3/key-dates-from-roger-federer-s-historic-career) |
| sports-06-roger-federer | 2022-09-23 (2022) | 41 | Final match at Laver Cup, retired | 변화 | 3 | 13.2 (65) | 무난 | -20 | 98.3 | career | — | — | [출처](https://www.atptour.com/en/news/roger-federer-retirement-legacy-story) |
| sports-07-serena-williams | 1999-09-12 (1999) | 18 | First Grand Slam: US Open | 긍정 | 3 | 18.2 (98.3) | 좋음 | 10.6 | 83.3 | career | 88 | 예 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2000-09 (2000) | 19 | Sydney Olympic doubles gold with Venus | 긍정 | 3 | -15.8 (41.7) | 조심 | -30.9 | 41.7 | career | 80 | 예 | [출처](https://en.wikipedia.org/wiki/Serena_Williams) |
| sports-07-serena-williams | 2003-01 (2002) | 21 | 'Serena Slam' (four straight majors) completed at Australian Open | 긍정 | 3 | 5.2 (85) | 무난 | 20.9 | 58.3 | career | 38 | 아니오 | [출처](https://en.wikipedia.org/wiki/Serena_Williams) |
| sports-07-serena-williams | 2003-08-01 (2003) | 22 | Left knee tendon surgery; months out | 부정 | 2 | -1.1 (71.7) | 무난 | 4.1 | 75 | health·accident | 47 | 아니오 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2009-09-12 (2009) | 28 | US Open semifinal outburst; record fine and probation | 부정 | 2 | -20.2 (28.3) | 조심 | -7.5 | 91.7 | career | 85 | 아니오 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2010-07-07 (2010) | 29 | Foot cut on broken glass; two surgeries | 부정 | 2 | -21.6 (15) | 조심 | -1.3 | 6.7 | health·accident | 58 | 예 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2011-02 (2011) | 30 | Pulmonary embolism, emergency treatment | 부정 | 3 | -16.8 (31.7) | 조심 | 4.1 | 83.3 | health·accident | 60 | 예 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2012-08 (2012) | 31 | London Olympic singles and doubles gold | 긍정 | 3 | -26.6 (8.3) | 조심 | -7.4 | 55 | career | 60 | 예 | [출처](https://en.wikipedia.org/wiki/Serena_Williams) |
| sports-07-serena-williams | 2017-01 (2016) | 35 | Australian Open (23rd major) while pregnant | 긍정 | 3 | -16.2 (35) | 조심 | -20.6 | 16.7 | career | 43 | 아니오 | [출처](https://www.aljazeera.com/sports/2022/9/3/timeline-serena-williams-career) |
| sports-07-serena-williams | 2017-09-01 (2017) | 36 | Daughter Olympia born; emergency C-section and blood clots | 변화 | 2 | -21.1 (18.3) | 조심 | -14.2 | 68.3 | child | 15 | 아니오 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2017-11-16 (2017) | 36 | Married Alexis Ohanian | 변화 | 2 | -21.1 (18.3) | 조심 | -14.2 | 68.3 | marriage·love | 11 | 아니오 | [출처](https://www.wral.com/archive/17271795/) |
| sports-07-serena-williams | 2018-09-08 (2018) | 37 | Lost US Open final to Naomi Osaka amid umpire dispute | 부정 | 2 | -15.9 (38.3) | 조심 | 2.7 | 61.7 | career | 98 | 아니오 | [출처](https://www.aljazeera.com/sports/2022/9/3/timeline-serena-williams-career) |
| sports-07-serena-williams | 2022-09-02 (2022) | 41 | Retirement ('evolving away') after US Open third-round loss | 변화 | 3 | -10.5 (51.7) | 무난 | 25.5 | 48.3 | career | — | — | [출처](https://www.aljazeera.com/sports/2022/9/3/timeline-serena-williams-career) |
| sports-08-michael-phelps | 2000-09 (2000) | 15 | Olympic debut at Sydney, age 15 | 변화 | 2 | 21.1 (82.7) | 좋음 | — | 21.2 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2001-03-30 (2001) | 16 | First world record (200m butterfly), youngest male WR holder | 긍정 | 2 | 25.8 (90.4) | 좋음 | 4.7 | 5.8 | career | 17 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2004-08 (2004) | 19 | Six golds at Athens 2004 | 긍정 | 3 | -11.4 (17.3) | 무난 | -15.4 | 75 | career | 6 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2004-11 (2004) | 19 | First DUI arrest at 19; 18 months probation | 부정 | 2 | -11.4 (17.3) | 무난 | -15.4 | 75 | career | 6 | 예 | [출처](https://www.sportskeeda.com/swimming/michael-phelps-suspended-6-months-usa-swimming) |
| sports-08-michael-phelps | 2008-08-17 (2008) | 23 | Record eight golds at Beijing 2008 | 긍정 | 3 | 10.4 (67.3) | 무난 | 8.3 | 78.8 | career | 83 | 예 | [출처](https://www.npr.org/2008/08/17/93671607/phelps-turns-legend-with-8th-beijing-gold) |
| sports-08-michael-phelps | 2009-02 (2009) | 24 | Marijuana pipe photo; 3-month USA Swimming suspension | 부정 | 2 | 45.2 (98.1) | 좋음 | 45.6 | 28.8 | career | 94 | 아니오 | [출처](https://www.sportskeeda.com/swimming/michael-phelps-suspended-6-months-usa-swimming) |
| sports-08-michael-phelps | 2012-08 (2012) | 27 | Retired after London 2012 (4 golds, most decorated Olympian) | 변화 | 3 | -4.8 (36.5) | 무난 | -9.7 | 17.3 | career | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2014-04 (2014) | 29 | Returned to competition | 변화 | 2 | -11 (25) | 무난 | -9 | 98.1 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2014-09-30 (2014) | 29 | Second DUI; 6-month suspension, removed from 2015 Worlds team; sought treatment | 부정 | 3 | -11 (25) | 무난 | -9 | 98.1 | career | 33 | 예 | [출처](https://www.npr.org/sections/thetwo-way/2014/12/19/371916403/michael-phelps-pleads-guilty-to-dui) |
| sports-08-michael-phelps | 2016-05-05 (2016) | 31 | Son Boomer born | 변화 | 2 | -0.6 (44.2) | 무난 | 13.4 | 44.2 | child | 79 | 예 | [출처](https://www.cbsnews.com/news/michael-phelps-secretly-got-married-in-june) |
| sports-08-michael-phelps | 2016-06-13 (2016) | 31 | Secretly married Nicole Johnson in Paradise Valley, Arizona | 변화 | 2 | -0.6 (44.2) | 무난 | 13.4 | 44.2 | marriage·love | 59 | 예 | [출처](https://www.cbsnews.com/news/michael-phelps-secretly-got-married-in-june) |
| sports-08-michael-phelps | 2016-08 (2016) | 31 | Five golds and one silver at Rio 2016 | 긍정 | 3 | -0.6 (44.2) | 무난 | 13.4 | 44.2 | career | 46 | 아니오 | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-08-michael-phelps | 2016-08-12 (2016) | 31 | Final retirement after Rio | 변화 | 3 | -0.6 (44.2) | 무난 | 13.4 | 44.2 | career | — | — | [출처](https://en.wikipedia.org/wiki/Michael_Phelps) |
| sports-09-kim-yuna | 2006-12 (2006) | 16 | First senior Grand Prix Final title (St. Petersburg) | 긍정 | 2 | 23.3 (88.1) | 좋음 | 31.4 | 78.6 | career | 69 | 예 | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2007-01 (2006) | 16 | Lumbar disc herniation; withdrew from national championships | 부정 | 2 | 23.3 (88.1) | 좋음 | 31.4 | 78.6 | health·accident | 20 | 아니오 | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2009-03 (2009) | 19 | World Champion (Los Angeles), first woman over 200 points | 긍정 | 3 | -3.2 (45.2) | 무난 | 4.9 | 26.2 | career | 17 | 아니오 | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2010-02-25 (2010) | 20 | Vancouver Olympic gold with world-record 228.56 | 긍정 | 3 | 4.8 (59.5) | 무난 | 16.7 | 97.6 | career | 50 | 아니오 | [출처](https://olympics.com/en/news/yuna-kim-and-her-life-changing-vancouver-2010-gold) |
| sports-09-kim-yuna | 2011-10-18 (2011) | 21 | Announced sitting out 2011-12 season | 변화 | 2 | 3.8 (50) | 무난 | 3 | 71.4 | career | — | — | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2012-07 (2012) | 22 | Announced return aiming at Sochi 2014 | 변화 | 2 | -18 (16.7) | 조심 | -22.3 | 21.4 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2013-03 (2013) | 23 | Second World title (London, Ontario) | 긍정 | 3 | -9.7 (21.4) | 무난 | -2.6 | 59.5 | career | 31 | 아니오 | [출처](https://en.wikipedia.org/wiki/Yuna_Kim) |
| sports-09-kim-yuna | 2014-02-20 (2014) | 24 | Sochi Olympic silver behind Sotnikova; Korean protest rejected | 부정 | 3 | 28.3 (92.9) | 좋음 | 42.2 | 31 | career | 91 | 아니오 | [출처](https://www.washingtontimes.com/news/2014/feb/20/olympic-silver-medal-at-end-of-yuna-kims-career/) |
| sports-09-kim-yuna | 2014-02 (2014) | 24 | Retired from competition after Sochi (age 23) | 변화 | 3 | 28.3 (92.9) | 좋음 | 42.2 | 31 | career | — | — | [출처](https://www.nbcsports.com/olympics/news/yuna-kim-announces-retirement-after-sochi-silver) |
| sports-09-kim-yuna | 2022-10-22 (2022) | 32 | Married singer Ko Woo-rim in Seoul | 변화 | 2 | -7.9 (35.7) | 무난 | 29.5 | 92.9 | marriage·love | 36 | 아니오 | [출처](https://www.asiae.co.kr/en/article/2022102208224122539) |
| sports-10-park-ji-sung | 2000-06-24 (2000) | 19 | Pro debut with Kyoto Purple Sanga (J-League) | 변화 | 2 | -6.9 (25) | 무난 | 22.7 | 16.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2002-06-14 (2002) | 21 | Winning goal vs Portugal at 2002 World Cup; Korea reached semifinal | 긍정 | 3 | -6.8 (28.3) | 무난 | -4.2 | 55 | career | 12 | 아니오 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2003-02-07 (2003) | 22 | Moved to PSV Eindhoven | 변화 | 2 | -6 (35) | 무난 | -3.5 | 61.7 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2005-07 (2005) | 24 | Transfer to Manchester United (~£4M) | 변화 | 2 | -1 (45) | 무난 | 5.1 | 88.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2007-04 (2007) | 26 | Right knee cartilage surgery; out about eight-nine months | 부정 | 3 | 3.3 (58.3) | 무난 | 19 | 66.7 | health·accident | 21 | 아니오 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2008-05 (2008) | 27 | Premier League title; United won Champions League but he was left out of final squad | 긍정 | 2 | -7.3 (21.7) | 무난 | 6.2 | 50 | career | 52 | 예 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2009-05-27 (2009) | 28 | Lost Champions League final to Barcelona (first Asian to play in a final) | 부정 | 2 | -11.8 (15) | 무난 | -9.8 | 95 | career | 45 | 예 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2011-01-31 (2010) | 29 | Retired from international football | 변화 | 2 | 12.7 (61.7) | 무난 | 22.2 | 5 | career | — | — | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2011-05 (2011) | 30 | Fourth Premier League title (2010-11) | 긍정 | 2 | 14 (71.7) | 무난 | 13.5 | 30 | career | 98 | 예 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2011-05-28 (2011) | 30 | Lost Champions League final to Barcelona at Wembley | 부정 | 2 | 14 (71.7) | 무난 | 13.5 | 30 | career | 98 | 아니오 | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2012-07-09 (2012) | 31 | Joined Queens Park Rangers | 변화 | 2 | 32.4 (95) | 좋음 | 19.1 | 38.3 | move·job | — | — | [출처](https://en.wikipedia.org/wiki/Park_Ji-sung) |
| sports-10-park-ji-sung | 2014-05-14 (2014) | 33 | Retired from football due to right knee | 변화 | 3 | -10.3 (18.3) | 무난 | -35.7 | 35 | career | — | — | [출처](https://www.washingtontimes.com/news/2014/may/14/park-ji-sung-announces-retirement-at-age-33/) |
| sports-10-park-ji-sung | 2014-07-27 (2014) | 33 | Married former SBS announcer Kim Min-ji | 변화 | 2 | -10.3 (18.3) | 무난 | -35.7 | 35 | marriage·love | 84 | 예 | [출처](https://www.washingtontimes.com/news/2014/may/14/park-ji-sung-announces-retirement-at-age-33/) |

## 10. 방법

- 사전 등록: validation/celebrity/protocol/PREREGISTRATION.md · mapping.json (해시 LOCK.txt)
- 계산: engine.js 를 수정 없이 불러 계산(엔진 해시 2d586294046803fe). 계산 단계는 사건 데이터를 읽지 못하게 막음
- 흐름 점수: 세운 combined(세운 0.6 + 대운 0.4). 백분위는 그 사람의 15세~종료 연도 안에서
- 무작위 기준: 같은 출생 연도 안 다른 월·일(시를 아는 사람은 시도)의 가짜 명식으로 같은 통계를 계산
- H4: 긍정(1)·부정(0) 사건, 특징 = 나이·나이²·첫 공개 사건 이후 연차 (+흐름 백분위), 사람 하나씩 빼는 교차검증 AUC
