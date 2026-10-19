import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
g=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G17-N')
w='https://zh.wikisource.org/zh-hant/滴天髓闡微'
items=[
 dict(id='D1',kind='hai-dependent-analogy',pillars=['辛巳','甲午','癸卯','癸亥'],url='https://www.shicihui.com/zh-tw/book/ditiansuichanwei/16288',locator='中和·辛巳甲午癸卯癸亥 任氏 해설; Wiki L2976–2993',claim='원문은 巳亥 遙沖의 去火存金과 印星得用을 연결한다.',confirmed='亥가 화를 제한하여 금을 남기는 설명은 문헌에서 명시된다.',limits=['辛印이지 申庚이 아님','午월·時亥·巳 하나·戊不透로 G17과 다름','亥의 자체 근이 무손상이라는 설명은 아님','윤토를 명시한 사례가 아니라 제화·보금 경로의 비교'],g17='충 존재를 곧 亥 파괴로 단정할 수 없다는 비교. G17의 같은 결과는 미확정.'),
 dict(id='I1',kind='hai-absent-flow-analogy',pillars=['辛丑','癸巳','戊申','丙辰'],url='https://www.shicihui.com/zh-tw/book/ditiansuichanwei/16289',locator='源流·辛丑癸巳戊申丙辰 任氏 해설; Wiki L3042–3060',claim='해설은 화에서 금수로 유통되는 경로를 논한다.',confirmed='원국에 亥 없이도 금수 유통을 긍정하는 문헌 명조가 있다.',limits=['丑·辰 및 辛癸透 등 다른 배치가 있음','巳월·戊日·巳 하나; G17은 申월·癸日·두 巳','생수의 모든 원인이 개별적으로 식별된 실험이 아님','丑辰이 필요충분조건이라는 명제는 아님'],g17='亥가 보편적 필수조건은 아니라는 비교. G17에서 亥가 손상돼도 충분하다는 증거는 아님.'),
 dict(id='I2',kind='hai-absent-seal-analogy',pillars=['丁巳','戊申','癸丑','乙卯'],url=w,locator='女命 H03 재검토; L6546–6568',claim='재생관과 인성 부신을 함께 논한다.',confirmed='申월·癸日·戊丁 배치에서 亥 없이 인성 작용을 논하는 가까운 사례다.',limits=['丑의 辛癸와 乙卯 경로가 있음','두 巳·巳亥충이 없어 G17의 경합과 다름','인성 작용 언급이 申庚 단독 생수량을 증명하지 않음'],g17='G17에 없는 지원·제어 경로를 식별하는 기준점. 일시 변경 뒤에도 효력이 남는지는 유보.'),
 dict(id='B1',kind='obstruction-boundary',pillars=['丙辰','乙未','壬午','癸卯'],periods=['丙申','丁酉'],url=w,locator='衰旺 L2927–2945',claim='임씨 해설은 운의 화 蓋頭 때문에 申酉가 생수하지 못한다고 논한다.',confirmed='申이 나타난다는 사실만으로 생수를 보증할 수 없다는 장애 사례다.',limits=['운의 丙申/丁酉와 원국 戊申은 같지 않음','未월·壬日·운의 금, G17은 申월·癸日·원국의 금','G17의 戊를 火蓋頭로 치환하지 않음'],g17='월지·투간·덮는 천간·주변 화를 따로 비교해야 함. 생수 불능의 직접 판정은 아님.')]
paths=[dict(id='D-fire',route='亥의 작용 → 火 제한 → 庚 기능 보존 → 水 지원',source=['D1'],status='unknown',needed=['G17의 두 巳와 日亥 배치에서 火가 제한되는 정도를 명시할 근거','그 결과 申庚이 실제 생수하며 亥壬의 보존과 구별된다는 근거'],restriction='이 경로가 성립해도 亥와 독립적인 대체 지원으로 세지 않음'),dict(id='D-moist',route='亥의 작용 → 土의 상태 변화 → 生金 → 水 지원',source=[],status='unknown',needed=['亥가 G17의 戊 및 藏戊에 미치는 윤토 작용의 직접 근거','윤토 뒤 戊가 실제 생금하는지와 水 제어가 함께 남는지'],restriction='직접 대응 명조 미확보. D1은 제화 설명이므로 윤토의 증거로 승격하지 않음'),dict(id='I-alt',route='亥 외 조건에서 金 기능 유지 → 水 지원',source=['I1','I2'],status='unknown',needed=['亥 지원을 전제하지 않고 申庚을 유지하는 G17 내 조건을 명시','I1/I2의 丑辰·透金水·乙卯가 없는 차이를 근거로 설명','B1과 달리 G17의 戊申·두 丁巳에서 생수 경로가 차단되지 않는 이유'],restriction='원국에 亥가 없는 다른 명조는 존재 증거. G17의 亥 제거/손상 후 불변성 증명은 아님')]
x=dict(date='2026-10-17',raw=g['raw'],method='임씨 명조 해설의 경로·차이 대조; 단일변수 인과 실험 아님',comparators=items,paths=paths,conclusions=dict(literatureHaiDependentFirePreservation='documented',literatureHaiAbsentFlow='documented',g17HaiDependentFirePath='unknown',g17HaiDependentMoistPath='unknown',g17IndependentShenSupport='unknown',g17HaiRootPreservation='unknown',finalVerdict='unknown'),engineTruthUsed=False,externalAI=False,published=False,publishable=False)
(p/'g17-dependent-independent-path-review.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# G17 申庚 생수 — 亥 의존 경로와 비의존 후보의 문헌 대조','', '2026-10-17. 명조 4건으로 경로를 재검수했다. 문헌에서 亥 제화·보금 설명과 亥 없는 금수 유통 설명은 확인했다. G17에서 어느 경로가 실제 성립하는지, 亥 근이 보존되는지는 모두 유보다. 기존 엔진 판정·점수·다수결을 정답으로 사용하지 않았다. 게시·운영 변경·외부 AI 호출 없음.','', '## 확정 범위의 구분','', '확정한 것은 문헌 해설의 존재와 명조 배치다. 亥 없는 명조에서 금수 유통을 논한다는 사실은 亥가 모든 생수의 필수조건이라는 주장을 제한한다. 그러나 G17에서 亥를 삭제하거나 손상시켜도 생수 기능이 동일하다는 반사실적 결론은 아니다. 원국의 亥는 그대로 두고 논증이 그 기능에 의존하는지 따로 점검한다.','', '기존의 ‘같은 네 기둥’만을 요구하는 기준으로 연구를 막지 않는다. 유사 명조도 쓰되 월령·일간·위치·대체 성분의 차이를 설명할 근거가 없으면 해당 차이만 유보한다.','', '## 문헌 명조와 활용 범위','']
for c in items:
 lines+=['### '+c['id']+' — '+' / '.join(c['pillars']),'','['+c['locator']+']('+c['url']+').'+(' 대조 운: '+', '.join(c['periods'])+'.' if 'periods' in c else ''),'','**원문 해설 요약:** '+c['claim'],'','**확인한 범위:** '+c['confirmed'],'','**적용 제한:**','']+['- '+v for v in c['limits']]+['','**G17 대조:** '+c['g17'],'']
lines+=['## 경로별 현재 판정','']
for r in paths:lines+=['### '+r['id']+' — '+r['route'],'','문헌 연결: '+(', '.join(r['source']) or '직접 대응 명조 미확보')+'. **G17 판정: 유보.**','', '**확정에 필요한 조건:**','']+['- '+v for v in r['needed']]+['',r['restriction']+'.','']
lines+=['## 다음 검수의 최소 요구','', '1. 申월 및 戊申의 위치·계절 단서가 巳申 경합 이후 金의 기능을 유지하는 이유를 설명할 근거. 월령이라는 이유만으로 무손상 확정하지 않는다.','2. 두 丁과 巳藏丙의 작용을 구분하고 戊의 생금이 유효한지 확인할 근거. 土 글자만으로 生金을 완료하지 않는다.','3. 생수 설명에서 亥의 제화·윤토가 전제로 사용됐는지 명시. 사용됐다면 의존 경로로 남긴다.','4. 亥 없이 가능한 후보라면 I1/I2의 대체 조건 가운데 무엇이 G17에 있고 없는지 밝혀야 한다. 없는 丑辰/乙卯 등을 가정하지 않는다.','5. 申庚의 기능이 확인되더라도 亥壬 자체 보존, 申壬의 별도 지원, 지원 충분성은 각각 따로 판정한다.','', '이는 증거를 요구하는 연구 체크리스트이며 새로운 전통 필요충분조건이나 실행 규칙이 아니다. 윤토와 제화 두 가설을 같은 것으로 합치지 않는다.','', '## 출처 층위와 검증','', '모든 명조는 《적천수천미》 任氏 명조 해설층으로 취급한다. 본경·原注·현대 번역과 분리했다. D1과 I1의 병행 전사는 동일 저작의 재전사이며 별도 실증 자료가 아니다. 原注 源流의 예시에는 전사 기둥 표기가 불명확한 부분이 있어 채택하지 않았고, 별도로 온전한 네 기둥이 제시된 I1 任氏 사례를 사용했다. 역사적 신분·혼인·수명·도덕 서술을 정답 라벨로 채택하지 않았다. 영인본 교감·독립 전문가 합의는 미완료다.','', '원자료·문헌 명조·출처 참조·의존/비의존 후보 분리·유보 상태를 구조 검증했다. 이 검증은 문헌 해석의 독립 정확도 검증이 아니다. 상세: output/independent-reference-2026-10-17/g17-dependent-independent-path-review.json. 재생성 및 구조 검증: python tools/review-g17-path-dependency.py.','']
pathlib.Path('docs/G17_DEPENDENT_INDEPENDENT_PATH_REVIEW_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
assert x['raw']==g['raw']
assert len(items)==4 and len(paths)==3
by={c['id']:c for c in items}
for k in ['I1','I2']:assert all('亥' not in v for v in by[k]['pillars'])
assert by['D1']['pillars']==['辛巳','甲午','癸卯','癸亥']
assert by['I1']['pillars']==['辛丑','癸巳','戊申','丙辰']
assert by['B1']['periods']==['丙申','丁酉']
assert not paths[1]['source']
assert all(r['status']=='unknown' and all(c in by for c in r['source']) for r in paths)
assert all(v=='unknown' for k,v in x['conclusions'].items() if k.startswith('g17') or k=='finalVerdict')
assert not any(x[k] for k in ['engineTruthUsed','externalAI','published','publishable'])
print('PASS: G17 preserved, 4 comparator records, 亥-absent fixtures verified, moisture evidence gap kept explicit, all G17 judgments held.')
