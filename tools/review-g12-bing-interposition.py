import pathlib,json
p=pathlib.Path('output/independent-reference-2026-10-17')
c=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G12-N')
sources=[
 dict(id='XU5',url='https://www.ncc.com.tw/fate/paleo/bg/bg_032.htm',locator='L95–135; L62–67',layer='沈氏 원문 중 삽입된 徐樂吾 평주 명조·해설. 원저자 본문과 구분',note='같은 평주 계열 평행 전사로 명조 및 설명을 대조. 독립 관법 두 개로 집계하지 않음'),
 dict(id='XU5-P',url='https://sanqing.com.tw/en/子平真詮評証/',locator='L499–524',layer='같은 徐評 계열 평행 전사',note='壬寅/戊申/丙寅/癸巳와 합관유살 설명 및 다른 용어법 소개가 일치. 책 표제는 評証, 본문의 해당 층위는 徐評 계열로 기록'),
 dict(id='ZP15',url='https://www.donglishuzhai.net/chapter/3728.html',locator='L50',layer='沈氏 본문',note='乙일간·월癸·시戊 조건 예시. 완성 명조 아님'),
 dict(id='ZP20',url='https://www.donglishuzhai.net/chapter/3733.html',locator='L59',layer='沈氏 본문',note='甲 개입 및 위치 변경 예시. 丙 개입의 직접 증거가 아님')]
comparisons=[
 dict(id='C7',type='complete-literature-chart',pillars=['壬寅','戊申','丙寅','癸巳'],source='XU5 L130–135; XU5-P L522–524',authorClaim='徐評는 합관유살로 설명하고, 이어 三命通會 계열의 합/극에 따른 去留 명칭 차이도 소개한다.',match='년부터 壬–戊–丙–癸 순서 전체, 戊申월·癸巳시, 월戊와 시癸 사이 丙. 월申–시巳도 일지를 사이에 둠.',difference='G12의 년子→寅, 일戌→寅: 두 지지 변경. 목화 지원·수 지원 및 寅申·寅巳申 검토 조건이 달라짐.',conclusion='丙 개입이면 언제나 합거 불가라는 일반 명제의 직접적인 문헌 내 반례. G12 자체의 합거 성립이나 戊 제살 충분성을 증명하지는 않음.'),
 dict(id='C8',type='complete-literature-chart',pillars=['戊子','癸亥','庚寅','戊寅'],source='XU5 L62–67',authorClaim='徐評는 戊癸 합을 말하면서도 癸의 통근과 큰 설기 작용을 남긴다.',match='戊癸 합 뒤 癸가 실제로 작용하는지라는 검토 축.',difference='庚일간·亥월·인접 년戊-월癸·戊 중복. G12와 간격·일간·월령이 다름.',conclusion='합이라는 말만으로 癸 기능을 0으로 지우지 않을 반례. G12의 癸 잔존량은 도출하지 않음.'),
 dict(id='T6',type='conditional-template',configuration='丁年·癸月(酉)·乙日·戊時',source='ZP15 L50',authorClaim='본문은 시戊가 월癸 인성을 합거하여 丁의 제살을 돕는 조건을 설명한다.',match='월·시 사이 일간 한 글자가 있음에도 합거를 논함.',difference='개입 일간은 乙, 제살 주체는 丁. 丙·戊의 힘을 설명한 사례 아님.',conclusion='일간 한 칸의 존재 자체를 무조건 방벽으로 보는 해석을 제한. 乙도 항상 막거나 항상 통과시킨다는 법칙으로 확장하지 않음.'),
 dict(id='T5-recheck',type='conditional-template',configuration='癸年·甲寅月·丙日·戊時 및 위치 변경',source='ZP20 L59',authorClaim='甲이 개입한 구성과 개입하지 않은 구성의 戊癸 합을 구별한다.',match='개입 글자의 위치·성질을 심사해야 함.',difference='戊–丙–癸가 아닌 癸–甲–丙–戊. 월령도 寅.',conclusion='이 사례를 근거로 G12의 丙 차단을 확정할 수 없음. 같은 저자·평주라도 사례별 전제를 보존해야 함.')]
axes=[
 dict(axis='丙의 차단 여부',status='부분 확정: 일반 차단 명제 기각; G12 개별 결과 유보',confirmed='C7에서 같은 천간 순서의 丙 개입에도 합관유살을 논한다. 따라서 丙 개입만으로 합거 불가를 확정할 수 없다.',unknown='G12의 子·戌을 반영했을 때에도 동일 효과가 성립하는가.'),
 dict(axis='癸 잔존',status='유보',confirmed='배치상 정관 癸가 투출하며 子의 癸 배속은 원자료 사실이다. 합 가능성과 합 후 잔존은 별도다.',unknown='실제 합거·합반·작용 잔존 여부와 정도. C8의 통근 잔존 설명을 子 하나로 자동 전용하지 않음.'),
 dict(axis='戊 제살 능력',status='유보',confirmed='戊와 壬은 월·년 인접이다. C7의 명칭 차이는 같은 배치에서 합과 극을 어떻게 설명하는지도 구별하게 한다.',unknown='戊가 癸와 관계하면서 壬을 실제 얼마나 제어하는지, 丙의 설기 부담과 생금 경로까지 감당하는지. 癸가 남는다고 제살 실패, 합거된다고 제살 성공으로 치지 않음.')]
assert c['raw']['pillars']==dict(year='壬子',month='戊申',day='丙戌',hour='癸巳')
a=list(c['raw']['pillars'].values());b=comparisons[0]['pillars']
assert [x[0] for x in a]==[x[0] for x in b]==list('壬戊丙癸')
assert a[1]==b[1] and a[3]==b[3]
diff=[pos for pos,x,y in zip(['year','month','day','hour'],a,b) if x!=y]
assert diff==['year','day']
data=dict(date='2026-10-17',case=c,sources=sources,comparisons=comparisons,comparisonCheck=dict(C7Differences=diff,matchingStemOrder=True,matchingMonthHour=True),axes=axes,finalVerdict='unknown',engineTruthUsed=False,externalAI=False,published=False,publishable=False)
(p/'g12-bing-interposition-review.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# G12 월戊–일丙–시癸: 丙 차단·癸 잔존·戊 제살 분리 검수','','2026-10-17. G12-N = 壬子 / 戊申 / 丙戌 / 癸巳. 핵심 진전은 같은 천간 순서·같은 월주와 시주를 가진 문헌 명조 C7을 확보한 점이다. 丙이 끼면 언제나 합거를 막는다는 일반 명제는 이 평주 체계에서 지지할 수 없다. G12의 실제 癸 합거/잔존 및 戊의 제살 충분성은 계속 유보한다. 게시·운영 변경·외부 AI 호출 없음. 기존 엔진 판정·점수 미사용.','','## 출처와 층위','']
for s in sources:lines+=['- ['+s['id']+']('+s['url']+') · '+s['locator']+'. '+s['layer']+'. '+s['note']+'.']
lines+=['','출처는 고전·평주의 온라인 전사다. 원본 영상 교감 또는 독립 전문가 판정이 완료된 것으로 표시하지 않는다. 三命通會의 용어 차이는 여기서는 徐評가 소개한 내용으로만 취급하며, 이번에 그 책의 원문까지 직접 확인했다고 쓰지 않는다. 용어상 去官/留官의 차이를 실제 물리적 작용이 입증된 두 독립 결론으로 세지 않는다.','','## 문헌 명조·반례','']
for r in comparisons:
 label=' / '.join(r['pillars']) if 'pillars' in r else r['configuration']
 lines+=['### '+r['id']+' — '+label,'','- **유형·위치:** '+r['type']+'; '+r['source'],'- **저자의 설명:** '+r['authorClaim'],'- **일치:** '+r['match'],'- **차이:** '+r['difference'],'- **판정 범위:** '+r['conclusion'],'']
lines+=['## C7을 G12로 옮길 때 남는 두 변경','','| 위치 | G12 | C7 | 검토해야 할 차이 |','|---|---|---|---|','| 년주 | 壬子 | 壬寅 | 수 지원과 목화 지원이 달라짐. 명조 간 수·화의 상대량을 글자 수로 환산하지 않음 |','| 월주 | 戊申 | 戊申 | 동일 |','| 일주 | 丙戌 | 丙寅 | 戌 화고·토 설기 후보와 寅 목화 지원·申 충 조건이 다름 |','| 시주 | 癸巳 | 癸巳 | 동일 |','','두 지지의 변경이므로 한 글자만 통제한 실험이 아니다. C7에는 寅이 둘이라 寅申 충 및 寅巳申 관계도 생긴다. G12의 巳申 격지는 동일하지만, 중간 지지가 寅에서 戌로 바뀌는 조건까지 무시할 수 없다. 목화 지원이 다르다는 사실에서 어느 쪽이 더 강한지 바로 결정하지 않는다.','','## 판정 축별 현재 결론','']
for r in axes:lines+=['### '+r['axis']+' — '+r['status'],'','- **확인:** '+r['confirmed'],'- **유보:** '+r['unknown'],'']
lines+=['## 다음 확정에 필요한 근거와 금지된 도약','','1. 丙 차단 일반론은 쓰지 않는다. C7의 가까운 반례는 확보했으나 G12에서 합거가 반드시 된다는 반대 일반론도 세우지 않는다.','2. 癸가 子의 배속과 연결된다는 사실, 戊와 합할 수 있다는 논의, 합 뒤 관 작용이 남는다는 판단을 별개로 기록한다. 근의 존재만으로 합거를 불가능하게 만들지 않는다.','3. 戊가 癸를 합했으니 壬 제어에 여력이 없다는 주장과, 癸가 사라졌으니 戊 제살이 성공한다는 주장 모두 독립 근거가 필요하다. 고정된 힘의 배분량을 만들어 넣지 않는다.','4. 다음 직접 비교는 C7의 寅 둘을 G12의 子·戌로 바꾼 경우를 실제로 해설한 문헌 또는 그 차이의 적용 조건을 설명하는 조문이어야 한다. 확보 전에는 癸 잔존과 戊 제살을 각각 unknown으로 유지한다.','','이전 보고서의 ‘정확한 위치를 설명하는 가까운 명조 미확보’ 상태는 이번 C7 확보로 보완한다. 이전 파일을 소급하여 당시 확보한 것처럼 고치지 않는다. 새 명조는 丙 개입의 자동 차단을 반박하는 데 유효하지만 기존 엔진 수치 임계값의 검증 자료가 되는 것은 아니다.','','기록 검증: G12 원자료, C7 천간 순서 4개 일치·월/시주 일치·년/일주 두 변경, 완성 명조와 조건 조문 구분, 세 축의 유보 범위를 확인했다. 문헌 해석의 경험적 타당성 검증은 아니다. 상세 JSON: output/independent-reference-2026-10-17/g12-bing-interposition-review.json. 재생성: tools/review-g12-bing-interposition.py.','']
pathlib.Path('docs/G12_BING_INTERPOSITION_REVIEW_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
print('PASS: C7 same four stems and month/hour; only year/day branches differ; Gui remainder and Wu control unknown; no engine, publication, AI calls')
