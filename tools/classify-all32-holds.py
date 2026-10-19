import pathlib,json,collections
p=pathlib.Path('output/independent-reference-2026-10-17')
cases=json.loads((p/'cases.json').read_text(encoding='utf-8-sig'))
previous=json.loads((p/'all32-new-literature-actual-rereview.json').read_text(encoding='utf-8'))
t=json.loads((p/'literature-hidden-root-rereview.json').read_text(encoding='utf-8-sig'))['hiddenTable']
cat=[('L-relative','문헌/해석','상대 세력·감당 능력','문헌으로 조건을 좁힐 수 있으나 작용 우열의 독립 검수가 필요'),('L-effect','문헌/해석','근 실효·충합·대체 지원','배속/관계 존재에서 보존·손상을 도출하지 않음'),('L-expression','문헌/해석','장간·투출·위치의 효과 차이','새 ZP27/28로 역할 구분을 보강'),('D-hour','입력 자료','시주 미상','시각/지역/시간대/보정 기준 또는 합성 표본의 허용 시주 집합 필요'),('D-submonth','입력 자료','癸未 월내 시기 분기','합성 생성 시점·절입 후 경과와 해당 문헌의 상하반 정의 필요'),('D-period','자료/범위','연도·대운 맥락','제공 간지는 있으나 실제 날짜·절입/운 시작 기준의 독립 확인 및 기간별 평가 범위 필요'),('M-method','관법 선택','상충하는 해석의 적용 범위','학파를 합산하지 않고 같은 배치에서 각 전제·결론을 대조'),('E-edition','판본/전사','구체 오자·표제 문제','乙丑 표제 및 癸未 乙巳/乙己 등 교감 필요'),('V-equivalence','검증 설계','원문 의미와 수치 기준 동등성','문헌 추가만으로 해결 불가. 독립 라벨·별도 표본과 평가 규격 필요')]
new=[dict(id='ZP27+',url='https://www.donglishuzhai.net/chapter/3740.html',title='論喜忌干支有別',locator='L48–52',finding='천간 하나와 지지의 복수 성분을 구별. 특정 합회 배치의 발용 예시를 함께 검토.',limit='장간이 언제나 무효라는 명제 아님. 편집자는 관살 혼잡 논의의 이견을 표시함'),dict(id='ZP28+',url='https://www.donglishuzhai.net/chapter/3741.html',title='論支中喜忌逢運透清',locator='L48–54',finding='운의 투청·회합과 원국의 개별 간지 연결을 구별. 亥를 壬/甲 역할별로 검토.',limit='같은 글자 등장만으로 실제 투청 효과·길흉을 확정하지 않음'),dict(id='ZP16+',url='https://www.donglishuzhai.net/chapter/3729.html',title='論雜氣如何取用',locator='L48–60',finding='묘고의 여러 성분 중 투간·회합을 살피고 겸용과 상호 방해를 구별.',limit='월내 시기 자료를 대신하지 않음. 甲辰월 등의 예시를 다른 일간에 그대로 전용하지 않음')]
rows=[];periods=[]
for c in cases:
 raw=c['raw'];gr=c['caseGroup'];tags=['L-relative','L-effect','L-expression','V-equivalence']
 if not raw['hourKnown']:tags+=['D-hour']
 if gr in ['G07','G19']:tags+=['D-submonth']
 if c['id'].endswith('-Y'):tags+=['D-period']
 if gr in ['G05','G06','G11','G12','G13','G14','G15','G17','G18','G20','G24']:tags+=['M-method']
 if gr in ['G07','G13','G19']:tags+=['E-edition']
 primary='D-hour' if 'D-hour' in tags else 'D-submonth' if 'D-submonth' in tags else 'L-effect'
 # A cross-reference of literal exposure, not a functional rule evaluator.
 links=[]
 for pos,pill in raw['pillars'].items():
  if pill:
   for s in t[pill[1]]:
    exp=[q for q,v in raw['pillars'].items() if v and v[0]==s]
    links.append(dict(branchPosition=pos,branch=pill[1],hiddenStem=s,matchingExposedPositions=exp,status='literal-connection-only'))
 additions=['ZP27+: 藏/透 및 지지의 복수 성분을 따로 기록. 같은 오행·십성군으로 효과를 통일하지 않음.']
 ref=['ZP27+']
 if raw['pillars']['month'][1] in '辰戌丑未':
  ref+=['ZP16+'];additions+=['ZP16+: 잡기 월지의 각 장간과 실제 투간 연결을 대조. 여러 성분 중 본기 하나만 고정 취용하지 않음. 실제 격의 성립·강도는 유보.']
 if gr=='G17':ref+=['ZP28+'];additions+=['ZP28+: 亥의 壬/甲 역할을 원국 전체 천간과 대조. G17에는 壬甲 투출이 없어 藏壬·藏甲의 발용 및 충 후 보존은 여전히 별도 근거 필요. 무효 확정은 아님.']
 pr=next(r for r in previous['records'] if r['id']==c['id'])
 dataNeeds=[]
 if 'D-hour' in tags:dataNeeds+=['실제 인물이 아닌 합성 표본이므로 고객 출생자료를 요청하지 않음. 생성 원자료의 시주를 복원하거나 가능한 시주 집합과 미상 전용 검증 절차를 명시.']
 if 'D-submonth' in tags:dataNeeds+=['생성 시점 또는 월내 경과 자료 확보. 자료가 없으면 상반/하반 분기를 모두 열고 어느 한쪽 선택 금지.']
 if 'D-period' in tags:dataNeeds+=['운 간지는 이미 제공됨. 생성 날짜·운 시작시점/계산 기준의 독립 근거가 없는 상태를 표시하고 원국 조문을 연도 전체 판정으로 확대하지 않음.']
 if c['id'].endswith('-Y'):
  ref+=['ZP28+'];additions+=['ZP28+: 다음 운 천간-원국 장간 대응은 투청 검토 후보이며 실제 발용·지원 증가 판정이 아님.']
  for label,k in [('대운','daewoonPillar'),('세운','annualPillar')]:
   s=raw[k][0];positions=[q for q,v in raw['pillars'].items() if v and s in t[v[1]]];existing=[q for q,v in raw['pillars'].items() if v and v[0]==s]
   periods.append(dict(id=c['id'],period=label,pillar=raw[k],stem=s,natalHiddenPositions=positions,existingExposedPositionsIncludingDay=existing,result='candidate-matching-only' if positions else 'no-known-natal-hidden-match',functionalEffect='unknown',missingHour=not raw['hourKnown']))
 rows.append(dict(id=c['id'],raw=raw,categories=tags,primaryReason=primary,priorCaseReview=pr['manualReview'],newSources=list(dict.fromkeys(ref)),literatureSupplement=additions,dataRequired=dataNeeds,literalHiddenExposureLinks=links,remaining='상대 우열·근 실효·연도 감당 능력은 기존 유보 유지. '+('입력 공백을 문헌으로 채우지 않음.' if dataNeeds else '새 조문의 적용 범위 보강은 최종 규칙 확정이 아님.'),finalVerdict='unknown',publishable=False))
count={i:sum(i in r['categories'] for r in rows) for i,_,_,_ in cat};primary=dict(collections.Counter(r['primaryReason'] for r in rows))
x=dict(date='2026-10-17',classification='중복 태그 + 상호배타적 대표 사유. 건수는 관찰 단위이며 독립 출생 인원 수 아님',categories=[dict(id=i,kind=k,title=n,remedy=v,count=count[i]) for i,k,n,v in cat],primaryCounts=primary,sources=new,records=rows,periodCandidates=periods,engineTruthUsed=False,externalAI=False,published=False,summary=dict(total=32,held=32,fullRuleConfirmed=0,inputHour=6,inputSubmonth=4,annualContext=8))
(p/'all32-hold-types-and-remediation.json').write_text(json.dumps(x,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# 32건 유보 사유 유형·입력 공백·문헌 보강','', '2026-10-17. 유형은 중복 태그로 집계하고, 대표 사유만 중복 없이 별도 집계했다. 문헌으로 적용 범위를 좁히는 일과 자료가 없어서 확정할 수 없는 일을 분리했다. 전체 규칙 확정 0건, 유보 32건. 게시·운영 변경·외부 AI 호출 없음. 기존 엔진 판정·점수는 사용하지 않았다.','', '## 유형별 집계','', '| 유형 | 구분 | 해당 관찰 수 | 해결 방법·한계 |','|---|---|---:|---|']
for i,k,n,v in cat:lines+=['| '+i+' '+n+' | '+k+' | '+str(count[i])+' | '+v+' |']
lines+=['', '중복 태그의 합계는 32를 초과한다. 대표 사유는 시주 미상 6건 → 그 외 월내 시기 4건 → 그 외 근 실효 22건 순으로 분류했다. 이 순서는 작업 분류 기준일 뿐 명리의 작동 우선순위가 아니다. 연도 8건은 이미 간지가 있으므로 ‘운 자료 전부 누락’으로 표시하지 않았다.','', '## 추가 문헌으로 먼저 보강한 항목','']
for s in new:lines+=['- ['+s['id']+' '+s['title']+']('+s['url']+') · '+s['locator']+'. '+s['finding']+' **한계:** '+s['limit']+'.']
lines+=['', '심씨 본문과 東里山人按·교감 校를 구분했다. ZP27의 동정 설명을 SF의 모든 간지 작용 제한과 같은 논리로 합치지 않았다. 새 문헌은 장간/투출·회합·잡기 취용의 설명 공백을 좁히지만 시주·월내 시점과 실효 강도를 만들어 주지 않는다.','', '## 별도로 필요한 입력','', '| 필요 자료 | 해당 관찰 | 용도 |','|---|---|---|', '| 시주 | G01-N/Y, G08-N, G15-N, G22-N/Y | 알려진 세 기둥의 부재를 전체 부재로 확대하지 않기 |','| 癸未 월내 시기 | G07-N/Y, G19-N/Y | 월내 분기를 한쪽으로 임의 선택하지 않기 |','| 연도·대운 계산 맥락 확인 | G01-Y, G04-Y, G07-Y, G10-Y, G13-Y, G16-Y, G19-Y, G22-Y | 제공 간지와 별도로 생성 날짜·운 시작/절입 기준의 근거 확인 |','', '이 표본은 합성 명조다. 실제 고객 생년월일을 수집해 대신 채우지 않는다. 원자료를 복원할 수 없다면 가능한 입력 집합을 정의해 안정성을 검토하거나 해당 분기를 계속 유보한다. QT의 ‘상하반월’이 정확히 어떤 경과 기준인지도 판본/관법 검토가 필요하다. 날짜가 생겨도 그 정의 없이 자동 분기하지 않는다.','', '## 운의 투청 후보 16개 대조','', '| 사례 | 구분 | 제공 간지 | 같은 글자의 원국 장간 위치 | 기존 천간 위치(일간 포함) | 결과 |','|---|---|---|---|---|---|']
for r in periods:lines+=['| '+r['id']+' | '+r['period']+' | '+r['pillar']+' | '+(', '.join(r['natalHiddenPositions']) or '알려진 위치 없음')+' | '+(', '.join(r['existingExposedPositionsIncludingDay']) or '알려진 위치 없음')+' | 대응 후보만 확인·실효 유보 |']
lines+=['', '같은 글자가 나타나는 것은 자동 투청·지원 강화·길흉 확정이 아니다. 원래 투출한 글자가 있으면 최초 발현으로 부르지 않으며, 시주 미상에서 대응이 보이지 않아도 완전 부재로 확정하지 않는다. 원문 예시의 격·위치·회합 조건과 맞는지 추가 검토가 필요하다.','', '## 32건별 연결','', '| 사례 | 대표 사유 | 중복 유형 | 새 문헌으로 좁힌 범위 | 입력 요청 |','|---|---|---|---|---|']
for r in rows:lines+=['| '+r['id']+' | '+r['primaryReason']+' | '+', '.join(r['categories'])+' | '+'; '.join(r['literatureSupplement'])+' | '+' '.join(r['dataRequired'] or ['추가 입력보다 실제 작용 근거/관법 검수가 우선'])+' |']
lines+=['', '개별 기존 판단과 실제 藏/透 대응 목록은 상세 JSON에 보관했다. 여러 사건을 하나의 원국에 관찰했으므로 집계 수를 독립 검증 인원으로 쓰지 않는다.','', '## 다음 처리 순서','', '1. 자료가 필요 없는 藏/透·잡기·운 대응은 이번 보강 원장을 사용해 검토한다. 원문이 설명하는 범위까지만 부분 확인한다.','2. 시주·월내 시기·운 계산 맥락은 원자료 복원 또는 허용 입력 집합 정의로 따로 해결한다. 문헌 추가로 대체하지 않는다.','3. 관법 충돌은 별도 해석별 전제와 결론으로 비교한다. 편한 결론을 주는 학파만 선택하지 않는다.','4. 실제 상대 세력·근 실효는 독립 검수 근거가 필요하다. 28/30/42 등의 수치 동등성은 독립 라벨·별도 표본·평가 규격 문제로 남기며 이번 문헌 수집으로 통과 처리하지 않는다.','', '검증은 32개 원자료·유형별 건수·대표 사유 합계·출처·16개 운 대응·전체 유보 상태를 확인했다. 명리 해석의 전문가 합의나 정확도 검증은 아니다. 상세: output/independent-reference-2026-10-17/all32-hold-types-and-remediation.json. 재생성/검증: python tools/classify-all32-holds.py.','']
pathlib.Path('docs/ALL32_HOLD_TYPES_AND_REMEDIATION_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
assert len(rows)==32 and len({r['id'] for r in rows})==32 and sum(primary.values())==32
assert count['D-hour']==6 and count['D-submonth']==4 and count['D-period']==8
assert primary=={'D-hour':6,'L-effect':22,'D-submonth':4}
assert len(periods)==16 and all(r['functionalEffect']=='unknown' for r in periods)
assert all(r['raw']==next(c['raw'] for c in cases if c['id']==r['id']) for r in rows)
assert all(r['finalVerdict']=='unknown' and not r['publishable'] for r in rows)
assert all(s in {v['id'] for v in new} for r in rows for s in r['newSources'])
print('PASS:',json.dumps(dict(overlapCounts=count,primaryCounts=primary,periodChecks=len(periods)),ensure_ascii=False))
