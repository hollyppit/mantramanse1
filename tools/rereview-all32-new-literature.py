import pathlib,json
p=pathlib.Path('output/independent-reference-2026-10-17')
a=json.loads((p/'cases.json').read_text(encoding='utf-8-sig'))
supp=json.loads((p/'all32-new-literature-supplement.json').read_text(encoding='utf-8'))
table=json.loads((p/'literature-hidden-root-rereview.json').read_text(encoding='utf-8-sig'))['hiddenTable']
# Literal checks are observations relevant to the clauses, never a sufficient-condition test.
plan={
'G01':('丙戊癸','丙 조절 검토와 未乙/子癸 지원은 별개. 未丁을 丙과 같은 것으로 바꿀 수 없고 시주 미상으로 분기 완결 불가.'),
'G02':('庚癸壬','추가 조문의 수원·제화 역할은 구분할 수 있으나 辰癸/壬 지원이 火財·甲泄을 감당하는지는 미정.'),
'G03':('壬丙戊','조문은 壬丙 배치와 과다 예외를 구별한다. 실제 癸 둘·亥藏壬·午未丁을 원문 壬丙透와 동일시하지 않음.'),
'G04':('丙癸甲庚','丙癸甲 동시 취용의 글자 충족은 확인할 수 있지만 辰丑의 지지력·甲己合·癸財의 우열은 남음.'),
'G05':('丙癸','巳寅丙·癸가 있어 따뜻함·윤택 후보는 있다. 巳亥沖 및 寅亥合 이후 기능은 월별 조문만으로 확정 못함.'),
'G06':('甲庚壬','庚을 財 부담만으로 보지 않을 관법을 확인. 丁壬 합화 분기와 일반 격의 분기는 구분하고 임의 선택하지 않음.'),
'G07':('庚辛丁','癸未의 상하반 시기 및 금 기능 분기 미확정. 금의 藏/透와 원국의 三未·辰 지원을 개수로 대신하지 않음.'),
'G08':('甲丙庚丁','亥甲/申庚은 배속 단서. 시주 미상이라 丙 부재 분기·특수구조를 확정하지 않음.'),
'G09':('壬戊丙丁','巳의 戊庚과 壬 조건이 함께 제시됨. 巳 장생만으로 화에 무손상·생조 충분을 확정하지 않으며 酉/寅 경합을 남김.'),
'G10':('癸丙甲','三秋己土와 戌월의 甲 검토를 연결. 甲을 官 제어뿐 아니라 소통 후보로 보되 합 이후 실효는 미정.'),
'G11':('壬戊丁','丙卯 조문에서 壬의 역할과 과다시 戊 조건은 별개. 亥申壬·庚辛과 寅卯 지원의 실제 작용 미정.'),
'G12':('壬戊','申월 丙의 壬戊 조건 관련 글자는 있으나 두 관살·巳申·戌/巳 근 효과가 해결되지 않음.'),
'G13':('丙癸己','乙丑 조문의 丙 투출과 실제 巳藏丙은 다름. 壬癸와 丑未沖이 있어 조후 및 근 우열을 별도로 남김.'),
'G14':('庚癸壬','金水全無라는 특정 분기는 원국 金水 배속과 맞지 않음. 그 분기 배제는 재다신약 전체의 거짓 확정이 아님.'),
'G15':('甲壬癸','丙戌 조문에서 甲壬의 藏/透 차이를 구별. 시주 미상 및 戌 공유 합충 때문에 근 보존·전체 강약 미정.'),
'G16':('丙癸甲庚','丙·癸·甲의 藏/透를 壬·乙과 혼동하지 않음. 辰土 지지력·壬亥財와 火印의 상대 효력은 여전히 미정.'),
'G17':('庚丁甲壬','申庚·丁制金을 병론하는 문헌 확인으로 丁=손상만이라는 가정 제한. 亥藏甲과 甲透 명조는 다르며 두 巳·亥 경합은 설명되지 않음.'),
'G18':('甲庚壬','甲透·申藏庚의 관법상 검토를 보강. 藏庚을 透庚과 동일시하지 않고 寅申沖·午未 및 食印 관계는 남김.'),
'G19':('庚辛丁','QT-C2와 연·월주/일간은 같지만 日支·時柱 변경은 금수·화토 경로를 동시에 바꿈. 癸未의 시기 분기도 미확정.'),
'G20':('丙甲壬癸','冬戊의 丙甲 조건 관련 배속을 검토. 午火·丑申土를 丙甲과 자동 등치하지 않고 子午/子丑의 실효는 미정.'),
'G21':('壬戊丙丁','庚巳 조문과 원국 巳戊丙을 연결하되 癸透를 壬 조건의 충족으로 바꾸지 않음. 巳酉·子卯 이후 금화 기능 미정.'),
'G22':('丁丙庚癸','甲酉의 火/金 분기와 子水·戌丁 배속을 대조. 미상 시주를 채우지 않으며 藏丁과 透丁 차이를 남김.'),
'G23':('壬戊丁','丙卯의 壬 조건을 癸透만으로 충족하지 않음. 木生火와 水 제어가 실제 유통되는지 미정.'),
'G24':('壬庚甲己','辛未 조문은 土가 무조건 생조하는 것이 아님을 보강. 亥壬·己/甲 위치와 甲己合·藏丁 효과를 함께 봐야 함.')}
def observations(raw,stem):
 exposed=[k for k,v in raw['pillars'].items() if v and k!='day' and v[0]==stem]
 hidden=[k for k,v in raw['pillars'].items() if v and stem in table[v[1]]]
 return dict(stem=stem,nonDayExposedPositions=exposed,hiddenPositions=hidden,exposureState='present' if exposed else 'unknown-incomplete-hour' if not raw['hourKnown'] else 'absent',hiddenPresenceState='present' if hidden else 'unknown-incomplete-hour' if not raw['hourKnown'] else 'absent',functionalEffect='unknown')
rs=[]
for c in a:
 base=next(r for r in supp['records'] if r['id']==c['id']); stems,review=plan[c['caseGroup']]; raw=c['raw']
 comps=[]
 for v in supp['comparators']:
  pp=v['pillars']; sameDay=pp[2][0]==raw['pillars']['day'][0];sameMonth=pp[1][1]==raw['pillars']['month'][1]
  comps.append(dict(id=v['id'],sameDaymaster=sameDay,sameMonthBranch=sameMonth,comparisonScope='same-daymaster-month-conditional-comparator' if sameDay and sameMonth else 'different-context-not-direct-rule-evidence',fullMatch=pp==list(raw['pillars'].values()),differentPositions=[k for k,q in zip(['year','month','day','hour'],pp) if q!=raw['pillars'][k]],limit=v['limit']))
 annual=c['id'].endswith('-Y')
 sf=dict(relative='검토 완료·유보: 財官과 일간을 상대 비교해야 하며 존재/개수만으로 과다를 정할 수 없음',motion='검토 완료·관법차 유보: 藏/透를 구분하되 SF의 동정 제한·개고를 ZP/任氏와 합의로 사용하지 않음',medicine='검토 완료·유보: 먼저 어떤 성분이 실제 제약인지 입증해야 구제 효과를 말할 수 있음')
 period=None
 if annual:
  period=dict(year=raw['targetYear'],annualPillar=raw['annualPillar'],daewoonPillar=raw['daewoonPillar'],daewoonStem=observations(raw,raw['daewoonPillar'][0]),annualStem=observations(raw,raw['annualPillar'][0]),result='유보: 운 천간과 같은 글자의 원국 배속만 확인. 합충 이후 지원·연도 감당 능력은 미검증',limit='이 관찰은 운의 역법 산출이나 운 작용 계산이 아님')
 rs.append(dict(id=c['id'],ruleId=c['ruleId'],raw=raw,monthlySource=base['monthlySource'],sourceConditionScope='일간·월지 대응 확인; 전체 조문 분기의 필요충분조건 충족은 아님',observations=[observations(raw,s) for s in stems],manualReview=review,comparators=comps,sfReview=sf,periodReview=period,confirmedScope='기둥·배속·투출/장간 및 명조 차이의 사실 범위',fullRuleVerdict='unknown',rootEffectiveness='unknown',publishable=False))
counts={s:sum(o['exposureState']==s for r in rs for o in r['observations']) for s in ['present','absent','unknown-incomplete-hour']}
x=dict(date='2026-10-17',method='21 source sections + 5 comparator records; manual clause-scope review with independent literal checks',sources=supp['sources'],literatureComparators=supp['comparators'],records=rs,summary=dict(total=32,natal=24,annual=8,partialFactRecords=32,fullRuleConfirmed=0,held=32,comparatorScreens=160,sameDayMonthComparisons=sum(v['sameDaymaster'] and v['sameMonthBranch'] for r in rs for v in r['comparators']),literalExposureChecks=counts),engineTruthUsed=False,externalAI=False,published=False,limitations=['단독 문헌 대조; 전문가 합의·실증 정확도 검증 아님','일간 외 투출·장간의 존재는 강도·기능·충분성의 증명이 아님','시주 미상에서 부재를 단정하지 않음','연도 8건의 원국은 중복이므로 독립 명조 32개로 세지 않음'])
(p/'all32-new-literature-actual-rereview.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# 추가 문헌 21구간·명조 5건 — 32개 사례 실제 재검수','', '2026-10-17. 원국 24건·연도 관찰 8건을 모두 재검수했다. 부분 사실 확인 32건, 규칙 전체 확정 0건, 최종 유보 32건이다. 모든 사례를 다섯 비교 명조와 일간·월지·기둥 차이로 대조했다. 이는 새 문헌을 연결만 한 이전 수집 원장과 달리 조문 적용 범위와 관련 글자의 藏/透 및 개별 미해결 판단을 기록한 결과다. 게시·운영 변경·외부 AI 호출 없음.','', '## 판정의 구분','', '관찰 상태 present/absent는 일간 외 천간에서 해당 글자가 보이는지의 뜻이다. absent가 조문의 불충족 전체나 정상 음성을 의미하지 않는다. hiddenPositions는 장간 소속만 나타낸다. 未知 시주에 해당 글자가 나타날 수 있으면 unknown-incomplete-hour로 남긴다. 기능 효력은 별도로 모두 unknown이며 점수로 환산하지 않았다.','', '궁통보감의 월별 조건과 신봉통고의 상대/동정/병약 관점을 각각 검토했다. 신봉통고의 개고·동정 제한을 자평진전·임씨 관법과 하나로 합치지 않았다. 달별 조문의 실제 격·과다·생조 판단을 선행 확정하지 않고 글자 충족만으로 결과를 올리지 않았다.','', '## 출처 21구간','']
for s in supp['sources']:lines+=['- ['+s['id']+' '+s['title']+']('+s['url']+') · '+s['locator']+'.']
lines+=['', '현대 백화 번역·徐氏 평주를 고전 본문으로 섞지 않았으며, 전사 오자·乙丑 표제 차이·原命例 時日月年 배열 등 제한은 수집 보고서와 상세 원장에 유지했다. 독립 영인본 교감 미완료다. 역사적 건강·수명·신분·도덕·혼인 결과는 실제 정답 라벨로 사용하지 않았다.','', '## 새로 확인한 중요한 적용 제한','', '- G14는 원국 金水 배속이 있어 특정 金水全無 분기의 전제를 적용할 수 없다. 해당 분기만 배제하며 재다신약 전체 음성은 미확정이다.','- G17은 丁을 제금의 취용으로도 보는 문헌이 추가됐다. 두 丁·亥藏甲·두 巳 배치는 해당 원문의 전체 분기와 같지 않아 생수 실효나 강약은 미정이다.','- G07/G19는 癸未 월내 시기 분기를 선택할 정보가 없다. 명조 QT-C2의 巳/未·壬戌/丙辰 차이는 지원과 재관을 동시에 바꾸므로 단일 변수 효과로 읽지 않는다.','- G06/G18의 庚, G10의 甲은 부담·제어 외 다른 역할 후보가 있지만 그 후보의 실제 작동까지 확정한 것은 아니다.','', '## 사례별 결과','']
for r in rs:
 lines+=['### '+r['id']+' — '+' / '.join(v or '시 미상' for v in r['raw']['pillars'].values()),'','월별 근거: '+r['monthlySource']+'. **부분 확정:** 일간·월지 대응과 다음 문자 배치.','', '| 검토 글자 | 일간 외 투출 위치 | 장간 위치 | 투출 관찰 |','|---|---|---|---|']
 for o in r['observations']:lines+=['| '+o['stem']+' | '+(', '.join(o['nonDayExposedPositions']) or '알려진 위치 없음')+' | '+(', '.join(o['hiddenPositions']) or '알려진 위치 없음')+' | '+o['exposureState']+' |']
 lines+=['', '**조문·상대 작용 재검수:** '+r['manualReview'],'']
 close=[v for v in r['comparators'] if v['sameDaymaster'] and v['sameMonthBranch']]
 lines+=['**명조 5건 대조:** '+('; '.join(v['id']+' — 다른 위치 '+', '.join(v['differentPositions'])+'. '+v['limit'] for v in close) if close else '같은 일간·월지의 직접 비교 후보 없음. 다섯 명조는 모두 조건이 달라 해당 결론을 이식하지 않음.'),'']
 lines+=['**신봉통고 적용:** 상대 과다와 구제의 대상 미확정. 藏/透 및'+(' 운의 蓋頭/동정' if r['periodReview'] else ' 원국 관계')+' 차이를 기록하되 다른 관법과 충돌하는 제한을 보편 규칙으로 채택하지 않음.','']
 if r['periodReview']:
  v=r['periodReview'];lines+=['**연도:** '+str(v['year'])+'년 대운 '+v['daewoonPillar']+' / 세운 '+v['annualPillar']+'. '+v['result']+'. 원국 조문이 연도 전체 결과의 근거는 아님.','']
 lines+=['**최종:** 근 실효·전체 규칙 유보. 관찰 사실을 신약·과다·감당 능력의 확정으로 올리지 않음.','']
lines+=['## 전체 집계·검증','', '32개 모두 21구간 중 해당 월별 조문과 세 공통 주제를 검토했고, 비교 명조 5건에 대한 160개 조건 대조를 보관했다. 같은 일간·월지 비교도 완전 대응이나 독립 검증 통과가 아니다. 부분 관찰만 확정하고 기존 유보를 음성으로 바꾸지 않았다.','', '시주 누락, 월내 시기, 충합 이후 성분 효력, 관법 차이, 연도 종합 및 원문-수치 기준의 동등성이 남아 있다. 어느 엔진의 기존 판정·점수도 정답으로 읽지 않았다.','', '검증은 원자료·배속·시주 미상 처리·160개 명조 차이 기록·출처·전체 유보 상태를 확인했다. 해석의 독립 전문가 합의·예측 정확도 검증은 아니다. 상세: output/independent-reference-2026-10-17/all32-new-literature-actual-rereview.json. 재생성/검증: python tools/rereview-all32-new-literature.py.','']
pathlib.Path('docs/ALL32_NEW_LITERATURE_ACTUAL_REREVIEW_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
assert len(rs)==32 and len({r['id'] for r in rs})==32
assert len(supp['sources'])==21 and len(supp['comparators'])==5
for r in rs:
 assert r['raw']==next(c['raw'] for c in a if c['id']==r['id'])
 assert len(r['comparators'])==5 and not any(v['fullMatch'] for v in r['comparators'])
 assert r['fullRuleVerdict']==r['rootEffectiveness']=='unknown' and not r['publishable']
 if not r['raw']['hourKnown']:assert not any(o['exposureState']=='absent' for o in r['observations'])
 for o in r['observations']:
  assert all(r['raw']['pillars'][q][0]==o['stem'] and q!='day' for q in o['nonDayExposedPositions'])
  assert all(o['stem'] in table[r['raw']['pillars'][q][1]] for q in o['hiddenPositions'])
assert sum(bool(r['periodReview']) for r in rs)==8
print('PASS:',json.dumps(x['summary'],ensure_ascii=False))
