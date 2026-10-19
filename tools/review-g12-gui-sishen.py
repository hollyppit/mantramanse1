import json,pathlib
p=pathlib.Path('output/independent-reference-2026-10-17')
c=next(c for c in json.loads((p/'cases.json').read_text(encoding='utf-8-sig')) if c['id']=='G12-N')
sources=[
 dict(id='ZP5',url='https://www.donglishuzhai.net/chapter/3718.html',locator='L48–55',layer='沈氏 본문; 校·東里按 분리',use='간격·방해를 검토하고 합의 존재와 실제 합거를 구분'),
 dict(id='ZP7',url='https://www.donglishuzhai.net/chapter/3720.html',locator='L48–59',layer='沈氏 본문; L59 東里按는 해법에 이견',use='巳申 형과 합회 해법은 조건별 검토. 일률적인 합 우선 또는 근 소멸 규칙으로 쓰지 않음'),
 dict(id='ZP10',url='https://www.donglishuzhai.net/chapter/3723.html',locator='L56–57',layer='沈氏 본문',use='丙申월 壬戊 조문의 국소 일치. 癸와 위치·근은 추가 심사'),
 dict(id='DTG',url='https://sajumania.com/ebook/to01-02/to01-02-01-21.htm',locator='L21–23,142–144,174–215',layer='滴天髓 官殺의 任氏 주석 명조. 원경문·原注와 구분',use='명조 5건의 조건 차이 대조. 전사본이며 독립 판본 교감·역사적 성취 검증은 아님')]
comps=[
 dict(id='C1',pillars=['壬子','壬子','丙戌','戊戌'],locator='DTG L142–144',sourceClaim='任氏는 두 戌의 근과 戊 제수를 함께 설명한다.',match='丙戌·壬子·戊 및 수 제어 문제',difference='子월·두 戌·癸 없음·巳申 없음',limit='G12의 戌 하나만으로 같은 제살 능력을 확정할 수 없다.'),
 dict(id='C2',pillars=['癸丑','戊午','丙午','壬辰'],locator='DTG L174–175',sourceClaim='任氏는 丑의 수 지원을 들어 戊癸 합불화를 설명한다.',match='丙일간·戊壬癸 투출',difference='午월·인접 戊癸·丑辰·丙午',limit='G12의 격위 戊癸 및 子申 지원을 같은 조건으로 대체하지 않는다.'),
 dict(id='C3',pillars=['癸巳','戊午','丙午','壬辰'],locator='DTG L189–190',sourceClaim='任氏는 앞 명조의 丑을 巳로 바꾸어 합화와 수 지원의 차이를 설명한다.',match='C2와 천간 동일·G12에도 巳 존재',difference='여전히 午월·丙午·戊癸 인접이며 G12에는 子申',limit='巳 존재만으로 G12도 합화·수 고갈한다고 옮기지 않는다. 합거 고정론의 문헌 내 반례다.'),
 dict(id='C4',pillars=['戊申','癸亥','丙午','壬辰'],locator='DTG L196–197',sourceClaim='任氏는 관살 병투에서 戊癸 합거를 취한다.',match='丙일간·戊壬癸·申 존재',difference='亥월·戊癸 인접·午辰 지원; G12는 申월·丙戌·癸巳',limit='壬癸 동시 출현을 무조건 실패로 보거나 합거를 자동 적용할 수 없다.'),
 dict(id='C5',pillars=['丙申','庚寅','庚申','辛巳'],locator='DTG L21–23',sourceClaim='任氏는 이 배치에서 巳를 화록만으로 쓰지 않고 금의 장생 역할을 강조한다.',match='巳申 병존·丙 존재',difference='庚일간·寅월·금 투출 셋·申 둘·寅 추가',limit='巳가 있으면 丙 근이 항상 온전하다는 명제를 제한한다. G12의 巳 무효나 합화수의 직접 증거는 아니다.')]
findings=[
 dict(axis='추가 癸',confirmed='癸는 丙의 정관, 壬은 칠살이며 子 癸·申 壬의 배속이 있다. 원문 壬戊 단순 조문 외의 추가 검토 대상이다.',held='관살 병투가 실제 혼잡인지·서로 돕는지, 제어 대상이 어떻게 배분되는지는 미확정.'),
 dict(axis='戊癸 관계',confirmed='월 戊와 시 癸 사이에 일간 丙이 있다. 인접 합거 명조와 위치가 다르다.',held='합거·합화·무효 어느 것도 확정하지 않는다. ZP5의 원년-시 거리 예시를 현재 월-시의 고정 감쇠율로 환산하지 않는다.'),
 dict(axis='戊의 제살생재',confirmed='월 戊는 년 壬과 인접하고, 선택 원표상 申·戌·巳에 戊 성분, 申·巳에 庚 성분이 있다.',held='배속이 제어량·생재량을 뜻하지 않는다. 癸 상대 작용·戊癸 관계·丙 설기의 부담을 함께 해결하기 전 제살생재 성공을 확정하지 않는다. 庚은 미투출이며 戊→庚→壬의 재생살 가능성도 자동 실현으로 보지 않는다.'),
 dict(axis='巳申 관계',confirmed='월 申과 시 巳는 일지 戌을 사이에 둔다. 巳申 병존 및 원문 형 논의의 검토 대상이다. 寅은 없다.',held='완전한 寅巳申 삼형을 있다고 쓰지 않는다. 형만으로 손상, 합만으로 해형·합화수, 격지만으로 무작용을 확정하지 않는다.'),
 dict(axis='丙 근 실효',confirmed='시 巳에는 丙, 일지 戌에는 丁이 배속된다. 巳의 동간 근 후보와 戌의 화고 지원 후보를 분리한다. 현재 辰은 없어 辰戌 충 사례와 다르다.',held='巳申 뒤 巳 丙의 잔존·지원량과 戌 丁의 실효를 합산 확정하지 않는다. 戌 지원만으로 巳 손상을 보충했다고도 볼 수 없다. 화고를 근으로 쓰는 관법과 원표 배속을 동일 강도로 환산하지 않는다.')]
scenarios=[
 ('癸 잔존·巳 지원 잔존','戊가 壬을 제어하면서 癸 관과 공존할 수 있는지 및 丙 감당 능력 필요'),
 ('癸 잔존·巳 지원 약화','수의 두 경로에 대한 戊 제어와 戌 대체 지원이 각각 충분한지 필요'),
 ('癸 작용 제한·巳 지원 잔존','제한 원인이 실제 戊癸 합인지부터 입증. 戊가 제살 기능을 동시에 유지한다는 근거 필요'),
 ('癸 작용 제한·巳 지원 약화','관 정리만으로 일간 지원이 생기지 않음. 戌 및 다른 독립 지원의 충분성 필요')]
assert c['raw']['pillars']==dict(year='壬子',month='戊申',day='丙戌',hour='癸巳')
assert len(comps)==5 and len(findings)==5 and len(scenarios)==4
assert comps[1]['pillars'][1:]==comps[2]['pillars'][1:]
assert all(len(x['pillars'])==4 and all(len(v)==2 for v in x['pillars']) for x in comps)
data=dict(case=c,sources=sources,comparators=comps,findings=findings,conditionalPaths=[dict(path=a,required=b,status='not-established') for a,b in scenarios],finalVerdict='unknown',publishable=False,engineTruthUsed=False,externalAI=False,published=False)
(p/'g12-gui-sishen-review.json').write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
lines=['# G12 추가 癸·巳申과 戊 제살생재·丙 근 실효 검수','','2026-10-17. 대상 G12-N: 壬子 / 戊申 / 丙戌 / 癸巳. 최종 판정은 유보한다. 부분 확정은 원자료의 배치·배속 및 문헌상 적용 범위다. 게시·운영 변경·외부 AI 호출 없음. 엔진 점수·판정은 읽거나 정답으로 사용하지 않았다.','','## 출처와 층위','']
for s in sources:lines+=['- ['+s['id']+']('+s['url']+') · '+s['locator']+' · '+s['layer']+'. '+s['use']+'.']
lines+=['','새로운 비교 명조는 완전 일치 사례가 아니다. 저자의 성취·불운 서술은 사실 확인된 예측 성능으로 쓰지 않는다. 동일 주석 안의 조건별 주장 차이와 적용 범위만 검토한다. 沈氏 격국 조문과 任氏 주석의 근·합화 논리를 합쳐 합의 판정으로 표시하지 않는다.','','## 문헌 명조·반례 대조','','| 명조(년·월·일·시) | 출처의 주장 | G12와 일치 | 다른 조건·적용 한계 |','|---|---|---|---|']
for r in comps:lines+=['| '+r['id']+' '+' / '.join(r['pillars'])+' | '+r['locator']+' '+r['sourceClaim']+' | '+r['match']+' | '+r['difference']+'. '+r['limit']+' |']
lines+=['','## 확정 범위와 유보','']
for r in findings:lines+=['### '+r['axis'],'','- **부분 확정:** '+r['confirmed'],'- **유보:** '+r['held'],'']
lines+=['## 순환하지 않는 조건 분기','','아래는 사실로 채택한 결과가 아니라 추가 증거가 필요한 가설 분기다. 癸가 사라졌다고 먼저 가정해 戊가 자유롭다고 설명하고, 戊가 자유롭다는 이유로 癸 제거를 증명하지 않는다. 巳 근이 남는다는 가정으로 戊의 힘을 증명한 뒤 戊가 수를 막으므로 巳가 남는다고도 하지 않는다.','','| 가설 경로 | 확정에 필요한 독립 근거 |','|---|---|']
for a,b in scenarios:lines+=['| '+a+' | '+b+' |']
lines+=['','## 이번 결론','','추가 癸는 자동 실패 사유도 자동 합거 대상도 아니다. 戊 제살생재는 구조상 검토할 경로로 남지만 작용 성공은 미확정이다. 巳申 병존만으로 丙의 巳 근 소멸·보존·합화수를 확정할 수 없다. 戌의 화 지원은 별도 후보로 남기며 그 충분성도 유보한다. 따라서 G12의 전체 강약·감당 능력 및 기존 규칙의 수치 동등성은 계속 unknown이다.','','다음 검수에서는 申월·격위 戊癸·巳申 격지·戌 지원이 함께 있는 직접 명조 또는 각 조건을 통제한 문헌 반례가 필요하다. 이번 수집에서는 이 조건을 모두 충족하는 직접 명조를 확보하지 못했다. 단지 비슷한 글자가 있는 사례로 공백을 메우지 않는다.','','기록 검사: G12 원자료 일치, 비교 명조 5건의 네 기둥, C2/C3의 년지만 다른 쌍, 쟁점 5개와 유보 가설 4개를 확인했다. 해석의 전문가 독립 검수 또는 경험적 정확도 검사와는 다르다. 상세: output/independent-reference-2026-10-17/g12-gui-sishen-review.json. 재생성: tools/review-g12-gui-sishen.py.','']
pathlib.Path('docs/G12_GUI_SISHEN_REVIEW_2026-10-17.md').write_text('\n'.join(lines),encoding='utf-8')
print('PASS: G12 raw, 5 comparators, 5 issues, 4 unconfirmed paths; verdict unknown; no publication or external AI')
