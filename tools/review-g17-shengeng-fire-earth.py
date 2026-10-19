import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
g=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G17-N')
w='https://zh.wikisource.org/zh-hant/滴天髓闡微'
comp=[
 dict(id='M01',pillars=['丁巳','戊申','癸丑','乙卯'],locator='女命 L6546–6568',relation='申월·癸 일간·戊官·丁財·巳 공통',reading='임씨 해설은 재생관과 인성 부신을 함께 유지한다.',difference='丑의 습토·辛癸, 乙卯의 식신 경로가 있고 日亥·時丁巳 및 두 巳 충합은 없음.',usable='같은 申월·戊丁에서도 인성 작용을 남기는 비교. G17 효력으로 이식 불가.'),
 dict(id='M02',pillars=['庚辰','壬午','甲午','丙寅'],locator='性情 L9259–9277',relation='庚·화 제약·토를 통한 생금/생수 문제',reading='해설은 辰의 조절을 庚 생수 조건으로 든다.',difference='午월·甲日·庚壬透·辰 존재; G17은 申月·藏庚·亥/巳이며 辰 없음.',usable='토 존재와 유효 생금을 구분할 조건부 비교. 모든 명조에 辰을 필수로 만드는 규칙은 아님.'),
 dict(id='M03',pillars=['丙申','乙未','丁未','庚戌'],locator='疾病 L9908–9926',relation='申·庚·화와 토가 함께 있으나 수 경로를 유지하지 못하는 설명',reading='해설은 燥土의 생금 불능과 申壬 기능 약화를 함께 논한다.',difference='未월·丁日·未戌·丙透, G17과 계절·토·일간·수 배치 다름.',usable='토·申 존재만으로 충분한 수원을 보증하지 않는 반례. G17의 토를 燥土로 단정하는 증거는 아님.'),
 dict(id='M04',pillars=['壬寅','丁未','丙申','甲午'],locator='疾病 L9928–9945',relation='申의 생수와 화 제약·위치 문제',reading='해설은 申의 거리·충 및 화 제약을 생수 장애로 든다.',difference='未월·丙日·壬年·寅申沖. G17은 月申–日癸 인접이며 寅 없음.',usable='위치·근 제약을 검수할 반례. 이 명조의 遠隔을 G17에 전용하지 않음.')]
principles=[dict(id='P1',locator='天干 庚 본경·原注·任氏曰 L518–522',quote='土潤則生，土干則脆',scope='토의 유효 생조를 토 글자 존재와 구분; 원주와 임씨 해설층 별도',limit='춘하/丑辰/未戌 예시를 申월 戊土에 자동 전용할 수 없음'),dict(id='P2',locator='天干 庚 任氏曰 L522',quote='得火而銳者，丁火也',scope='丁을 庚 손실의 고정 계수로 만들지 않음',limit='丁 두 개가 庚 기능을 보증하거나 巳藏丙까지 무해하다는 뜻은 아님'),dict(id='P3',locator='天干 癸 原注·任氏曰, 癸水至弱 단락',quote='',scope='原注의 不論庚辛 및 任氏의 弱水不能泄金氣 설명도 함께 기록',limit='금 존재=癸 생조 완료를 보편 명제로 채택하지 않음. G17의 癸가 이 弱水 조건에 해당한다는 확정 근거는 없음')]
checks=[
 dict(id='S1',question='申庚의 금 기능이 충합 이후 남는가',confirmed='申庚 배속·申월·두 巳와의 관계 구성',missing='巳申 합화/합반과 화 제약 이후 庚金 기능의 잔존',links=['P2','M01','M03'],status='unknown'),
 dict(id='S2',question='戊土가 실제로 생금하는가',confirmed='戊月 및 申/巳의 戊 배속',missing='戊의 건습·생조 실효를 火/水 배치와 함께 설명할 명시 근거',links=['P1','M02','M03'],status='unknown'),
 dict(id='S3',question='금 기능이 남아도 癸로 지원이 이어지는가',confirmed='月申–日癸의 인접 배치; 庚不透',missing='藏庚의 기능과 癸의 수용/기타 경로를 분리해 설명할 근거',links=['P3','M01','M04'],status='unknown'),
 dict(id='S4',question='亥 없이도 가능한 대체 지원인가',confirmed='申庚과 申壬은 亥壬과 다른 성분',missing='지원 논증이 亥의 윤토·제화 기능에 의존하지 않는다는 문헌상 근거',links=['M02','M01'],status='unknown'),
 dict(id='S5',question='亥 자체 근은 보존되는가',confirmed='亥壬 배속과 두 巳의 충 위치',missing='亥壬 자체의 보존·손상 근거. S1–S4 성공만으로 확정 불가',links=['M01','M04'],status='unknown')]
x=dict(date='2026-10-17',id='G17-N',raw=g['raw'],source=dict(url=w,layer='任氏 명조 해설; 天干 본경·原注·任氏曰 구분',parallel='https://www.shicihui.com/zh-tw/book/ditiansuichanwei/16277',limitations='디지털 전사; 영인본 교감·전문가 합의 미완료. 질병·수명 및 도덕 결과는 채택하지 않음'),comparators=comp,principles=principles,checks=checks,dependencyAudit=dict(hypothesis='亥의 水가 土를 윤택하게 하거나 火를 제약하여 庚을 유지',status='unproven',consequence='이 가설에 의존하는 申 지원은 亥와 무관한 대체 경로로 확정할 수 없음',warning='亥 보존을 가정해 申 지원을 증명하고 그 결과로 亥 보존을 증명하는 순환 논증 금지'),finalVerdict='unknown',haiRootPreserved='unknown',shenMetalGeneratesWater='unknown',independentReplacement='unknown',engineTruthUsed=False,externalAI=False,published=False,publishable=False)
(p/'g17-shengeng-fire-earth-review.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# G17 申庚 생수 — 두 丁·巳와 戊土 조건의 추가 문헌 검수','', '2026-10-17. 문헌 명조 4건과 천간 조문을 대조했다. 申庚의 실제 생수·독립 대체 지원·亥 근 보존은 모두 유보다. 기존 엔진 판정·점수는 사용하지 않았으며 게시·외부 AI 호출·운영 변경은 없다.','', '## 이번에 좁힌 점','', '토가 존재한다는 사실은 유효 생금의 충분조건이 아니다. 丁을 일률적인 庚 손상으로 환산하지 않으며, 두 巳에 숨은 丙과 丁 천간도 구별한다. 무엇보다 申 지원을 입증할 때 亥의 윤토·제화 작용을 먼저 가정한다면, 그 결과를 亥가 손상돼도 독립적으로 남는 대체 지원이라고 부를 수 없다.','', '## 조문과 해설 층위','', '[《滴天髓闡微》 전사]('+w+')의 天干 단락과 [병행 전사](https://www.shicihui.com/zh-tw/book/ditiansuichanwei/16277)를 확인했다. 원주·임씨 해설을 혼합하지 않는다. 아래 인용은 표제 수준으로 한정한다.','']
for r in principles:lines+=['- '+r['id']+' · '+r['locator']+(' · 「'+r['quote']+'」' if r['quote'] else '')+'. '+r['scope']+'. **한계:** '+r['limit']+'.']
lines+=['', '丁을 긍정적으로 설명하는 조문과 강한 화·건조한 토의 장애 사례는 조건이 다른 논의다. 명조의 조건을 지우고 서로 상쇄하거나 어느 한 문장을 보편 규칙으로 고르지 않는다. 庚에서 壬으로의 유통 설명이 癸 지원을 그대로 증명하는지도 별도 검수한다.','', '## 문헌 명조 대조','', '| ID | 연/월/일/시 | 원문 해설의 범위 | G17과 다른 조건 및 한계 |','|---|---|---|---|']
for r in comp:lines+=['| '+r['id']+' | '+' / '.join(r['pillars'])+' | '+r['reading']+' | '+r['difference']+' '+r['usable']+' |']
lines+=['', '위치: '+'; '.join(r['id']+' '+r['locator'] for r in comp)+'. M01은 기존 H03, M02는 이전 연구에서도 사용한 명조의 재검토다. M03·M04는 이번 쟁점에 추가한 장애 조건 비교다. 명조 수를 독립 표본 수나 경험적 확률로 사용하지 않는다.','', '질병 장은 오직 저자의 생극 경로 설명만 대조했다. 건강·수명 결과를 고객 판정이나 검증 라벨로 사용하지 않는다. 네 사례 모두 G17과 완전 대응하지 않는다. 未월의 건조 및 寅申沖을 G17의 申월·巳申 관계로 바꿔 읽지 않는다.','', '## G17의 확정 사실과 유보 조건','', '확정 가능한 것은 丁巳/戊申/癸亥/丁巳의 배치, 申의 庚壬戊 배속, 庚不透 및 月申–日癸 인접이다. 이 인접을 유효한 생수의 보증으로 쓰지 않는다. 丁天干 둘, 巳藏丙 둘, 戊 및 巳申·巳亥 관계는 서로 다른 논점이며 고정 손익으로 더하지 않는다.','', '| 항목 | 검수 질문 | 확인한 범위 | 확정에 남은 근거 | 결과 |','|---|---|---|---|---|']
for r in checks:lines+=['| '+r['id']+' | '+r['question']+' | '+r['confirmed']+' | '+r['missing']+' | 유보 |']
lines+=['', 'S1은 금의 보존, S2는 토의 생조, S3은 생수 경로, S4는 亥와 독립적인 대체 가능성, S5는 亥 자체 근 보존이다. 이는 증거 요구를 나누는 연구 절차이며 전통 관법의 고정 작동 순서가 아니다. S1–S3이 확인돼도 S4·S5가 자동 확정되지 않는다.','', '## 순환 논증 점검','', '현재 미검증 가설인 「亥水 → 潤土/制火 → 保庚 → 生水」를 채택하려면 각 연결의 근거가 먼저 필요하다. 그 가설에 의존하는 경로를 「亥가 없어도 申이 살린다」로 바꾸면 독립성 주장이 깨진다. 반대로 亥 보존이 확인되지 않았다는 이유로 亥의 모든 작용을 0으로 처리해서도 안 된다. 현재는 양쪽 가능성을 열고 모두 유보한다.','', '다음 증거는 申월·藏庚·戊透·丁 둘·巳 둘·日亥의 경합에서 금 기능을 설명하는 명조/조문이다. 반드시 일치 명조만 허용하는 것은 아니지만 차이를 설명할 근거가 필요하다. 현재 확보 자료만으로 설명되지 않는 차이를 수치 모델로 메우지 않았다.','', '상세: output/independent-reference-2026-10-17/g17-shengeng-fire-earth-review.json. 재생성: python tools/review-g17-shengeng-fire-earth.py. 검증 범위는 원자료·비교 기둥·출처·유보 상태의 일관성이며 명리 해석의 독립 정확도 검증은 아니다.','']
pathlib.Path('docs/G17_SHENGENG_FIRE_EARTH_REVIEW_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
# 원자료 및 비교 명조 고정값·증거 참조·유보 불변 검증
assert x['raw']==g['raw'] and len(comp)==4 and len(checks)==5
assert comp[2]['pillars']==['丙申','乙未','丁未','庚戌']
assert comp[3]['pillars']==['壬寅','丁未','丙申','甲午']
ids={r['id'] for r in principles+comp}
assert all(all(v in ids for v in r['links']) and r['status']=='unknown' for r in checks)
assert all(x[k]=='unknown' for k in ['finalVerdict','haiRootPreserved','shenMetalGeneratesWater','independentReplacement'])
assert not any(x[k] for k in ['engineTruthUsed','externalAI','published','publishable'])
print('PASS: G17 preserved; 4 comparator records, 5 evidence questions, support-dependency distinction and held results saved.')
