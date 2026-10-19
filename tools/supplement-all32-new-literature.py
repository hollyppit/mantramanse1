import pathlib,json
p=pathlib.Path('output/independent-reference-2026-10-17')
cases=json.loads((p/'cases.json').read_text(encoding='utf-8-sig'))
qt='https://libokang.com/zh-hant/classics/bazi/%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91/'
alt='https://www.0979013888.com/%E5%AD%90%E5%B9%B3%E5%85%AB%E5%AD%97%E7%AA%AE%E9%80%9A%E5%AF%B6%E9%91%91%E8%AB%96%E4%B9%99%E6%9C%A8.html'
sf='https://zh.wikisource.org/zh-hant/神峰通考'
# Short paraphrases of the classical text, not the modern translations.
data=[('乙子','十一月乙木','L535–548','丙의 조절·水 조건 구별'),('壬午','五月壬水','L1611–1617','癸의 제화·庚의 수원 구별'),('辛亥','十月辛金','L1510–1516','壬·丙과 과다 조건 검토'),('己辰','三月己土','L1111–1121','丙癸甲의 따뜻함·윤택·소통'),('戊酉','八月戊土','L1028–1034','설기·丙癸·재다 분기 구별'),('丁寅','正月丁火','L759–773','庚의 역할과 합화 분기 구별'),('癸未','六月癸水','L1777–1787','월내 시기·庚辛·비겁 조건'),('戊亥','十月戊土','L1051–1060','甲丙과 금수 제약 검토'),('庚巳','四月庚金','L1251–1261','壬戊丙과 금국 분기 구별'),('己戌','三秋己土','L1142–1159','癸丙·戌월 甲 검토'),('丙卯','二月丙火','L591–599','壬과 과다시 戊 조건'),('丙申','七月丙火','L672–682','壬戊의 유무·과다 구별'),('乙丑','十二月乙木','대체 전사 L64–65','丙과 從財 예외 구별'),('丙戌','九月丙火','L704–710','甲壬·건조·火局 분기'),('癸申','七月癸水','L1789–1802','庚生癸와 丁制金 병론'),('戊子','十一二月戊土','L1063–1076','丙甲·水土·재 분기 구별'),('甲酉','八月甲木','L331–337','丁丙庚·木局 예외 구별'),('辛未','六月辛金','L1437–1443','壬庚·土·甲의 위치 조건')]
sources=[dict(id='QT-'+key,key=key,title=title,url=alt if key=='乙丑' else qt,locator=loc,scope=summary,layer='고전 전사 본문; 현대 번역·편집 해석은 판정 근거에서 제외',limit='월별 관법의 조건부 대조. 실제 근 실효·상대 강약 및 수치 임계값의 확정 근거가 아님') for key,title,loc,summary in data]
sources += [dict(id='SF-relative',title='神峰通考·總論子平謬說類',url=sf,locator='L137–149',layer='張楠 전사 본문',scope='財官과 일간의 상대 관계',limit='상대 과다 수치 없음; 전사 L139 오자로 해석을 단정하지 않음'),dict(id='SF-motion',title='神峰通考·動靜說/蓋頭說',url=sf,locator='L153–159',layer='張楠 전사 본문',scope='투간·장간과 운 작용을 구별',limit='간지 작용 제한 및 묘고 개고 관점은 子平真詮/任氏와 상이. 보편 합의로 채택하지 않음'),dict(id='SF-medicine',title='神峰通考·病藥說類',url=sf,locator='L162–163',layer='張楠 전사 본문',scope='조건별 제약·구제와 운 검토',limit='病藥은 명리 비유이며 의학 근거 아님; 문장 탈락·오자로 정밀 조문 채택 제한')]
notes={
'G01':'알려진 세 기둥에 丙 없고 未丁은 丙과 같은 조절로 보지 않음. 시주 미상이며 庚官·戊財/子水 지원의 우열은 남음.',
'G02':'壬透·辰癸는 있으나 庚透 없음. 癸와 庚의 역할을 구별하되 火 반복만으로 재다 분기를 완료하지 않음.',
'G03':'亥壬·午未丁과 癸 두 개는 확인; 丙 투출은 없음. 壬과 癸·丙과 丁을 동등 대체로 세지 않음.',
'G04':'癸·甲透, 辰丑癸와 토 성분 확인; 丙은 알려진 전 원국에 없음. 계절 조문이 신약 판정은 아님.',
'G05':'癸透·巳寅丙 있음. 巳亥沖 후 丙 효과 및 乙 제어·酉 설기의 우열은 미정.',
'G06':'庚·壬透와 寅甲이 있어 단순 財負擔 외 관법도 검토. 丁壬의 합화 분기를 자동 성립시키지 않음.',
'G07':'三未·辰, 丁 둘·丙이 있다. 월내 상하반 시기가 없어 금 작용 분기를 선택 불가. 未乙己 이문도 교감 필요.',
'G08':'亥甲·申庚, 알려진 천간에 丙 없음. 시주 없으므로 해당 부재 및 분기 완결 불가.',
'G09':'두 己·酉와 巳戊丙·寅甲, 壬 부재. 巳 장생·戊가 있다는 이유로 무손상이라 하지 않음.',
'G10':'丙透·子癸·甲透가 함께 있다. 戌월 甲을 제어 성분만으로 기록하지 않고 소통 후보도 검토하나 실효는 미정.',
'G11':'亥申壬藏·庚辛透. 壬의 藏/透 차이와 丙辛 합, 寅申 충합을 남김.',
'G12':'壬·戊透 있으나 癸도 있고 巳申 관계가 있다. 壬戊 조문을 전체 강약·길흉 확정으로 이식 안 함.',
'G13':'巳丙은 있으나 壬癸透, 丑未沖. 丙藏과 丙透 차이·충 후 未乙·냉습을 별도 검수. 대체 전사의 十二月 구분을 유지.',
'G14':'庚 둘·壬과 辰癸가 존재하므로 金水全無 분기는 맞지 않는다. 이를 반대로 재다신약 거짓으로 확정하지 않음. 辰戌/寅午戌 경합은 남음.',
'G15':'甲壬不透·辰癸, 乙과 丙 존재. 시주 미상이며 藏/透·卯戌/辰戌 효과 미정.',
'G16':'丙丁·壬透와 辰癸·卯乙. 癸/壬·甲/乙의 역할 차이를 지우지 않음. 계절 취용은 財印 우열의 답이 아님.',
'G17':'庚藏·丁 둘, 甲은 亥에 藏하고 癸日. 丁을 오직 손상으로 보던 전제를 제한할 근거가 생김. 丁透有甲의 甲透 여부와 두 巳 경합·亥 의존은 미확정.',
'G18':'甲透·申庚이 있어 庚을 재 부담만으로 보지 않음. 藏庚/透庚 차이와 寅申沖·午未 관계는 미정.',
'G19':'辛透·壬透 있으나 未월 시기 분기가 미상. 금수 천간의 존재와 실제 지원 충분성은 구별.',
'G20':'子월·午 및 丑·申, 癸透. 丙甲 부재만으로 약함을 확정하지 않고 子午/子丑 및 대체 土 기능을 남김.',
'G21':'巳戊丙·酉辛·己透·癸透, 壬 없음. 癸를 壬과 동일시하거나 巳를 일괄 제어/지원으로 확정 안 함.',
'G22':'알려진 세 기둥에 丙丁不透, 戌丁·壬子 있음. 시주 미상이고 藏丁의 기능 및 金制 우열 미정.',
'G23':'亥申壬藏·癸透·乙丙透. 壬/癸와 藏/透 차이, 亥卯·申亥 경합을 남김.',
'G24':'亥壬·己透·未丁乙·甲透. 월간 辛은 庚과 다름. 甲己 합·토의 생금/매금과 木泄의 실효 미정.'}
comparators=[dict(id='QT-C1',source='QT-癸未',pillars=['乙酉','癸未','癸未','庚申'],targets=['G07-N','G19-N'],locator='원문 時日月年: 庚癸癸乙 / 申未未酉; 정상 연월일시로 역순 복원',limit='庚透·酉·比肩 등 차이. 동일 월만으로 전체 결론 이식 안 함'),dict(id='QT-C2',source='QT-癸未',pillars=['己未','辛未','癸未','丙辰'],targets=['G07-N','G19-N'],locator='원문 時日月年: 丙癸辛己 / 辰未未未; 역순 복원',limit='G19와 연월·일간은 같으나 日未/巳·時丙辰/壬戌 차이. G07도 화 투출·일시 차이가 있음'),dict(id='QT-C3',source='QT-癸申',pillars=['丁酉','戊申','癸卯','甲寅'],targets=['G17-N'],locator='L1802 時日月年: 甲癸戊丁 / 寅卯申酉; 역순 복원',limit='丁甲透·寅卯와 酉 조건이 G17과 다름'),dict(id='QT-C4',source='QT-癸申',pillars=['戊午','庚申','癸未','乙卯'],targets=['G17-N'],locator='L1802 時日月年: 乙癸庚戊 / 卯未申午; 역순 복원',limit='庚透·午未·乙卯, G17은 戊透·亥/巳. 生水량 정답 아님'),dict(id='QT-C5',source='QT-癸申',pillars=['辛酉','丙申','癸酉','辛酉'],targets=['G17-N'],locator='L1802 時日月年: 辛癸丙辛 / 酉酉申酉; 역순 복원',limit='金 집중·丙透·時辛과 G17의 두 丁/巳·亥는 다름')]
records=[]
for c in cases:
 key=c['raw']['pillars']['day'][0]+c['raw']['pillars']['month'][1]
 rec=dict(id=c['id'],raw=c['raw'],monthlySource='QT-'+key,additionalSources=['SF-relative','SF-motion','SF-medicine'],caseReview=notes[c['caseGroup']],annualLimit='원국 월별 조문은 제공된 연도 세운의 종합 효과를 직접 증명하지 않음' if c['id'].endswith('-Y') else None,finalVerdict='unknown',publishable=False)
 records.append(rec)
x=dict(date='2026-10-17',sources=sources,comparators=comparators,records=records,summary=dict(total=32,monthlyKeys=len(data),sourceSections=len(sources),newComparatorRecords=5,held=32,fullRuleConfirmed=0),editionFlags=['Libo 전사는 현대 번역이 교차 배치됨. 고전 문장만 사용. 서지·판본 계통 미교감','Libo의 乙子 뒤 十二月 표제가 합쳐진 부분은 다른 전사의 十二月 구분과 차이로 남김','QT 癸未 乙巳/乙己 오자, 원문 명조 배열은 時日月年. 현대 해설의 십성 오류는 채택하지 않음','SF L139 不難任 표기는 문맥상 의심되어 단독 조문으로 채택 안 함','SF 動靜/墓庫 개고 논리는 ZP6/17 및 任氏와 동일 관법이 아님'],engineTruthUsed=False,externalAI=False,published=False)
(p/'all32-new-literature-supplement.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# 유보 32건 — 추가 문헌 수집·보강 원장','', '2026-10-17. 《궁통보감》 계열의 일간·월지 18개 묶음과 《신봉통고》 3개 주제 구간을 새로 수집해 32개 관찰 모두에 연결했다. 새 계열의 명조 5건도 배열 순서를 확인해 기록했다. 전체 규칙 확정은 0건, 유보는 32건이다. 추가 문헌 확보는 수치 동등성·근 실효·예측 정확도 통과를 의미하지 않는다. 게시·운영 변경·외부 AI 호출 없음.','', '## 무엇이 추가됐는가','', '기존 자평진전·적천수천미의 반복 대조에서 범위를 넓혔다. 계절별 취용과 투간/장간·운 작용의 별도 관점을 보강했다. 특히 G17에서는 丁이 庚을 제약하면서도 취용되는 관점을 확보했으므로 丁을 단순 손상으로만 보는 가정은 제한한다. G06/G18에서는 庚의 역할을 財負擔만으로 정하지 않고, G10의 甲도 관 제어뿐 아니라 소통 후보로 구별한다. 이것은 최종 강약 판정의 변경이 아니다.','', '## 수집 출처·위치','']
for s in sources:lines+=['- '+s['id']+' ['+s['title']+']('+s['url']+') · '+s['locator']+' — '+s['scope']+'.']
lines+=['', '월별 조문의 역사적 신분·혼인·건강·도덕 결론은 채택하지 않는다. 계절 관법의 선호를 일반 억부의 동일 판정식으로 합치지 않는다. 영인본 교감·독립 전문가 검수 미완료다.','', '## 판본·관법 차이와 제외 사항','']+['- '+v for v in x['editionFlags']]+['', 'SF 病藥은 명리상 제약·구제의 비유다. 의학 자료가 아니다. SF의 동정 제한·개고론을 다른 문헌의 통근 판정과 합의로 표시하지 않았다. QT의 월내 상하반·득지·투출 조건이 필요한 사례는 원자료만으로 충족 여부를 확정하지 않는다.','', '## 추가 명조 5건','', '| ID | 연/월/일/시 | 비교 대상 | 조건 차이·한계 |','|---|---|---|---|']
for c in comparators:lines+=['| '+c['id']+' | '+' / '.join(c['pillars'])+' | '+', '.join(c['targets'])+' | '+c['limit']+' |']
lines+=['', '다섯 명조의 기둥은 고전 전사의 時日月年 배열을 연월일시로 역순 복원했다. 현대 번역의 복원 해설을 사실 판정의 정답으로 사용하지 않았다. 궁통보감과 徐樂吾 평주가 섞인 다른 자료의 주석은 이 원장에 원문으로 병합하지 않았다.','', '## 32개 사례에 연결한 추가 검수','', '| 사례 | 새 월별 근거 | 추가 확인과 남은 조건 | 최종 |','|---|---|---|---|']
for r in records:lines+=['| '+r['id']+' | '+r['monthlySource']+' | '+r['caseReview']+(' '+r['annualLimit'] if r['annualLimit'] else '')+' | 유보 |']
lines+=['', '## 다음 확정에 필요한 자료','', '- 시주 미상 6관찰은 시주 보완 또는 가능한 시주별 결론 안정성 검토가 필요하다.','- 癸未의 월내 시기 분기 등은 합성 명조에 해당 절입 후 시점이 없어 선택하지 않았다.','- 月別用神의 존재는 실제 근 보존·생조/설기/제어의 우열을 증명하지 않는다. 충합 이후 기능은 계속 별도 검수한다.','- 연도 8건은 새 원국 조문만으로 연도 재성 총작용·감당 능력을 확정하지 않는다.','- 기존 엔진의 28%·30%·42%를 원전 기준으로 소급하지 않는다. 이번 수집은 엔진 결과를 읽지 않았다.','', '32건 원자료 보존·월별 출처 키·출처 참조·5명조 배열·시주 미상 6/연도 8·전체 유보 상태를 구조 검증했다. 문헌 내용의 독립 전문가 합의나 예측 정확도 검증은 아니다. 상세: output/independent-reference-2026-10-17/all32-new-literature-supplement.json. 재생성 및 구조 검증: python tools/supplement-all32-new-literature.py.','']
pathlib.Path('docs/ALL32_NEW_LITERATURE_SUPPLEMENT_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
ids={s['id'] for s in sources}
assert len(records)==32 and len({r['id'] for r in records})==32 and len(data)==18
assert all(r['monthlySource'] in ids and all(s in ids for s in r['additionalSources']) for r in records)
assert all(r['raw']==next(c['raw'] for c in cases if c['id']==r['id']) for r in records)
assert sum(r['annualLimit'] is not None for r in records)==8
assert sum(not r['raw']['hourKnown'] for r in records)==6
assert all(r['finalVerdict']=='unknown' and not r['publishable'] for r in records)
assert comparators[1]['pillars']==['己未','辛未','癸未','丙辰']
print('PASS: 32 cases linked to 18 monthly sections + 3 topic sections; 5 comparator records; raw data preserved; all final verdicts held.')
