// Research ledger only. No engine imports, model output, network, or publishing.
const fs = require('node:fs');
const assert = require('node:assert/strict');
const path = require('node:path');
const dir = 'output/independent-reference-2026-10-17';
const read = f => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, ''));
const baseline = read('remaining22-relative-root-rereview.json');
const cases = read('cases.json');
const sources = [
  ['N31',3744,'三十一 論正官','L50–57','재인 병용과 합의 방해를 다룬 조건·완성 명조.','壬戌/丁未/戊申/乙卯는 丁壬 합으로 보조를 잃는 서술. 모든 丁壬 합을 같은 결과로 처리할 수 없다.'],
  ['N35',3748,'三十五 論印','L50–64','인격에서 설기·살·재를 쓰는 서로 다른 전제 및 완성 명조.','L57 不要根深/祗要根深 이문, L59 丙/癸 이문은 채택하지 않는다. 校는 편집 교감, 按은 현대 의견이다.'],
  ['N36',3749,'三十六 論印取運','L48–64','인격의 성립 방식에 따라 취운 분기를 달리함.','L52–58 일부는 편집자가 中州本으로 보충했다고 표시. 원본 교감 미완료이며 세운 전체 공식이 아니다.'],
  ['N37',3750,'三十七 論食神','L48–61','식신생재의 신강·식왕·재근 조건과 위치 반례.','梁 명조의 癸丑/癸亥 이문은 제외. 식신 성분 존재만으로 식신격을 선언하지 않는다.'],
  ['N41',3754,'四十一 論傷官','L48–64','상관패인의 상관왕·신약·인근 조건 및 겨울 금의 화상위재 사례.','격·기후·강약 전제를 유지. 상관 성분이 있음을 상관격 성립으로 바꾸지 않는다.'],
  ['N42',3755,'四十二 論傷官取運','L48–60','재다/인다 및 신강/신경에 따라 취운 방향이 달라지는 조건.','L56·58 교감 글자를 별도 표시. 원국 분기 미확정이면 취운도 확정하지 않는다.'],
].map(([id,n,title,locator,finding,limit]) => ({id,title:'子平真詮 '+title,url:`https://www.donglishuzhai.net/chapter/${n}.html`,locator,finding,limit,status:'new-to-local-ledger',layer:'沈氏 본문 디지털 전사; 校/東里山人按 분리',accessed:'2026-10-17'}));
const reusedSources = [
 ['R5',3718,'L48–57','본신 합·격지 합·합거의 구별'],
 ['R6',3719,'L50–53','실시와 통근·묘고의 구별'],
 ['R17',3730,'L48–55','묘고 충의 토 작용과 수 재관 손상 구별'],
 ['R25',3738,'L48–70','원국과 운 대조 및 간지·충의 차이'],
 ['R28',3741,'L48–54','투청과 근 후보를 전 지지에서 대조'],
 ['R33',3746,'L50–68','재격·재인·식인 조건'],
].map(([id,n,locator,finding])=>({id,url:`https://www.donglishuzhai.net/chapter/${n}.html`,locator,finding,status:'reused',layer:'沈氏 본문 전사; 편집층 분리'}));
const comparators = [
 {id:'C31',source:'N31',locator:'L50',pillars:['壬戌','丁未','戊申','乙卯'],claim:'재 壬·인 丁의 합으로 관의 보조를 잃는다는 원문 해설.',targets:['G16-N','G16-Y'],match:'丁壬 재인 조합',difference:'戊일·未월·인접 합 대 己일·辰월·己를 사이에 둔 격지 합. 목 관의 배치도 다름.',refutes:'재인 동시 존재는 항상 병용 성공',limit:'G16에서 합 성립·합거·재인 소실을 확정하지 않는다.'},
 {id:'C35A',source:'N35',locator:'L52',pillars:['戊戌','乙卯','丙午','乙亥'],claim:'신강인왕 때 설기를 취하는 원문 사례.',targets:['G23-N','G11-N'],match:'丙일·卯월; G23은 丙午 일주까지 일치',difference:'G23은 戊戌→癸亥, 乙亥→丙申. G11은 일시도 다르고 금 재가 세 천간에 투출.',refutes:'인격의 설기는 항상 해롭다',limit:'비교 명조의 신강인왕 판단을 두 표본에 복사하지 않는다.'},
 {id:'C35B',source:'N35',locator:'L59 후반',pillars:['己未','甲戌','辛未','癸巳'],claim:'合財存食이라고 명시한 원문 사례. 앞 문장의 丙/癸 이문은 사용하지 않음.',targets:['G24-N'],match:'辛未 일주·甲財·己印의 합 조합',difference:'비교는 년己–월甲 인접, G24는 년甲–시己 격지; 戌월/未월·癸巳/己亥 차이.',refutes:'甲己 합쌍만 있으면 언제나 같은 재 소거 결과',limit:'G24 재·인 잔존이나 인중 여부는 증명하지 않는다.'},
 {id:'C37',source:'N37',locator:'L61',pillars:['癸酉','辛酉','己卯','乙亥'],claim:'재가 먼저, 살이 뒤이고 식이 사이에 있으면 재당살을 제한한다는 위치 사례.',targets:['G02-N','G03-N','G05-N','G20-N'],match:'식·재·관살 경로를 위치로 검토하는 질문',difference:'대상들의 일간·월령·투간 순서가 모두 다르며 G05는 식신 비투출.',refutes:'식재살 성분 공존이면 반드시 재가 살을 돕는다',limit:'한 가지 위치 예외만 확인하며 모든 생조·제어량에는 전용하지 않는다.'},
 {id:'C41A',source:'N41',locator:'L52',pillars:['甲子','乙亥','辛未','戊子'],claim:'亥에 근을 둔 甲과 未 회국을 화상위재로 설명한 사례.',targets:['G03-N'],match:'辛일·亥월·辛未 일주·甲 투출',difference:'G03은 癸卯/癸亥/辛未/甲午. 卯가 추가되어 亥卯未 세 지지는 갖추지만 원문의 乙·戊 투출이 없음; 午와 癸 둘도 다름.',refutes:'겨울 금의 수는 언제나 목을 생하지 못하므로 재 경로는 전부 무효',limit:'완성 목국의 화 성립·금의 감당 능력은 세 글자만으로 확정하지 않는다.'},
 {id:'C41B',source:'N41',locator:'L55',pillars:['壬申','丙午','甲午','壬申'],claim:'상관왕·인근심·신약 및 여름 목의 수 조절을 함께 제시한 패인 사례.',targets:['G18-N','G21-N','G10-N','G10-Y'],match:'상관과 인의 제어 경합',difference:'대상은 丁/庚/己일이며 寅/巳/戌월. 午월 甲일의 기후·근 배치를 갖지 않음.',refutes:'상관·인 글자가 하나씩 있으면 패인 성공',limit:'같은 인 개수·장간 수를 강약으로 환산하지 않는다.'},
];
// Per-case delta: question answered, application and mismatch, counterexample, stopping input.
const notes = {
 'G02-N': ['N37','식생재는 재근과 신강·식왕이라는 별도 전제를 둔다는 적용 조건을 보강.','壬·甲·丙 경로가 있으나 午월 재성 쪽이며 식신격 사례와 월령이 다르다.','C37','辰癸의 유효 지원과 두 午 부담을 같은 관법으로 비교한 독립 의견·표본.'],
 'G03-N': ['N41,N37','겨울 辛金에서 식상→재를 일괄 불능으로 보는 분기를 반례로 배제.','C41A와 일간·월지·일주·甲 일치. 癸 둘·午·卯 및 戊 부재가 달라 화목 성립과 재생관 실효는 미정.','C41A,C37','亥卯未·午·未土와 辛의 감당 능력을 함께 평가한 독립 검수.'],
 'G04-N': ['N31,R5,R17','관재 병존이나 본신 甲己 합을 자동 관 삭제로 바꾸지 않는 범위를 재사용.','년甲–일己에는 戊가 사이에 있고 辰酉 관계도 있다. N31 재인 예시는 다른 십성 배치라 직접 판정에서 제외.','C31','격지 甲己·辰酉·丑土를 함께 다루는 관법 선택 및 독립 검수.'],
 'G04-Y': ['N31,R17,R25','운의 辰戌 충을 개고·개선으로 자동 처리하는 분기를 제외.','원국의 격지 합을 유지한 채 甲戌·辛亥를 대조. N31의 재인 합 결과는 전용 불가.','C31','원국 검수와 2031 기간 경계·대운 시작 근거·기간별 운 평가.'],
 'G05-N': ['N37,N31','재·관과 지장간 식의 공존을 곧 재생관 성공으로 승격하지 않는 위치 조건 보강.','乙 둘과 癸의 투출, 寅巳·巳亥 경합. C37의 酉월 己일·식 투간 순서와 불일치.','C37','寅/亥 목과 巳 화의 합충 후 기능 및 戊 감당 능력의 독립 검수.'],
 'G06-N': ['N31,R5','본신 丁壬 합과 별위 재인 丁壬 합의 역할 구분을 보강.','C31에서는 丁印·壬財지만 여기서는 丁일간·壬官. 관 소실 결론을 가져올 수 없다. 기존 H01의 관 명명은 실효 측정이 아님.','C31','寅월 壬의 금 생조 보완과 丁 지원을 함께 다룬 독립 검수.'],
 'G09-N': ['N35,R5','인성 추가의 유익함·재 억인의 유익함은 전제가 달라 단일 방향으로 정할 수 없음.','巳월 庚·己 둘·乙財. N35 인중용재와 인경재중은 반대 분기이며 현재 어느 쪽인지 미정.','C35B','巳酉/寅巳 및 乙庚 합 후 목의 제토 기능에 대한 독립 검수.'],
 'G10-N': ['N41,N31','상관패인은 상관왕·신약·인근심이 필요하고 관 동시 투출만으로 실패 확정 불가.','己일·戌월 庚傷·丙印·甲官은 C41B의 甲午와 다름. 甲己 합과 卯戌 관계도 별도.','C41B','丙 제상·子財 매개·甲己 및 토근을 동시에 비교한 독립 검수.'],
 'G10-Y': ['N41,N42,R25','원국 패인 분기가 확정되기 전 운 재·인을 일률적인 구응/파괴로 해석할 수 없음.','壬辰·己酉가 더해져 辰戌·卯酉 충 존재. C41B의 패인 전제가 아직 미충족/미확정.','C41B','2029 기간·운 시작 근거와 충 후 목관·토근·인재 기능의 독립 검수.'],
 'G11-N': ['N35,N36','卯월 丙의 인격 설기는 전제에 따라 가능하다는 분기 보강.','C35A와 일간·월지는 같으나 辛辛庚·丙申·庚寅 배치. 재의 제인·금생수·寅申 충을 제외할 수 없다.','C35A','목근 보존과 금재의 제인/생수 경쟁을 다룬 독립 검수.'],
 'G12-N': ['R5,R6','새 직접 근거 없음. C7/C8/C11/C12 및 최신 子–癸 조문 검수 결과를 재사용하고 동일 질문 재검수를 종료.','N31 별위 丁壬 사례는 戊癸 합 후 癸의 丙 제어 증거가 아니다. 완성 申子辰으로 처리하지 않음.','G12-C7,C8,C11,C12','년子·申월·월戊/일丙/시癸를 함께 설명하는 새 자료 또는 독립 검수. 癸祿 이문은 영인 교감.'],
 'G13-N': ['N35,N36','인 다수만으로 인중신강을 확정하지 않는 두 반대 분기와 설기/재 사용 조건 보강.','乙丑월에 壬癸癸·巳未. N35의 왕인 설기와 경인 설기 해로움 중 선택 불가. 丑未 충·습토는 미정.','C35A','乙丑 표제/전사의 영인 교감과 丑未 충·乙근·巳 설기의 독립 검수.'],
 'G13-Y': ['N35,N36,R28','印用食傷도 印輕이면 재가 불리할 수 있다는 취운 예외를 보강.','丁未·戊申의 설기/제인과 申의 생수 경합. 원국 인의 필요성이 먼저 미정.','C35A','원국 독립 검수·판본 교감 및 2028 절입/대운 시작·기간 정의.'],
 'G14-N': ['N35,R17','인 투출 개수로 화재 부담을 이겼다고 보는 추론을 배제.','N35는 월령 인격 분기. 壬午월의 庚 둘에 그대로 전용 불가. 기존 陸宗輿 공유 戌 반례는 재사용.','G14-L01','寅午戌/辰戌 경합 뒤 辰癸와 庚 생수의 실효를 비교한 독립 검수.'],
 'G16-N': ['N31,N41','재인 병용에서 합과 간격을 별도 심사해야 한다는 완성 반례 보강.','C31 재인 丁壬은 인접, 이 사례 월壬–일己–시丁. N41 재인 무애 예시도 격지라는 점만 같고 월령/일간 차이.','C31','격지 丁壬 결과와 辰土·亥卯 관살 경합을 통합한 독립 검수.'],
 'G16-Y': ['N31,N41,N42,R25','원국 재인 경합에 丁 하나가 더해진 것만으로 해소/쟁합을 확정할 수 없음.','丁酉·辛亥를 원국과 대조. C31의 인접 합 결과를 이동시키지 않으며 丁은 최초 투청이 아님.','C31','2031 기간·대운 시작 및 丁 중복/辰酉·亥 중복을 함께 다룬 독립 검수.'],
 'G17-N': ['N35,N36,R5','인격의 살 사용과 재의 개입은 신인 배합 전제에 따라 갈린다는 조건 보강.','癸申월 戊官·丁財 둘. N35 用煞 분기를 戊正官에 직접 적용할 수 없다. 기존 H03과 巳亥/巳申 지원 경로 검수는 재사용.','G17-H03','亥壬·申壬·申庚 중 비순환 독립 지원과 戊 제어를 비교한 독립 검수.'],
 'G18-N': ['N41','상관패인에는 印의 수보다 인근·상관왕·신약 전제가 필요하다는 반례 보강.','甲印·戊傷 둘은 있으나 丁寅월. C41B의 午월 甲木·壬申 지원은 없음. 寅申 충도 별도.','C41B','寅申 충 후 甲근·午未 丁 지원 및 두 戊 설기의 독립 비교.'],
 'G20-N': ['N37,R5','戊子월 재격의 식생재를 식신격 조문과 동일시하지 않음.','庚食·癸財·戊比가 있지만 C37의 酉월·식간 개입 순서와 다르다. 子午·子丑 및 본신 합 후 효과는 미정.','C37','子午/子丑 뒤 午印·丑土水 및 癸의 재 기능을 비교한 독립 검수.'],
 'G21-N': ['N41,N42','패인에서 인의 과다도 반대 결과를 낳는 조건을 보강.','庚巳월 癸傷·己印·辛劫. 午월 甲日 C41B와 다르며 己 근·巳금 실효를 별도로 확인해야 함.','C41B','상관왕/신약/인근의 같은 관법 판정 및 巳·子卯 기능의 독립 검수.'],
 'G23-N': ['N35,N36','같은 丙午·卯월 비교 사례로 인격 설기 가능성을 보강.','C35A 대비 년戊戌→癸亥, 시乙亥→丙申. 관·인·재·일간 지원을 동시에 바꾸므로 원문의 신강 판단은 복사 불가.','C35A','변경된 癸官·亥卯木·申金水·丙比의 상대 작용을 다룬 독립 검수.'],
 'G24-N': ['N35,R5,R6','辛未일·甲己 조합의 합재존식 사례를 확보했으나 합쌍 동일성만으로 결과 전용 불가.','C35B는 년己–월甲 인접, 대상 년甲–시己 격지. 두 未 인성의 실효와 음간 장생 관법도 다름.','C35B','격지 甲己·未土 생금/화 제약의 독립 검수, 음간 근 관법의 명시적 선택.'],
};
const records = baseline.records.map(b => {
 const [refs,resolved,application,counter,requiredInput] = notes[b.id];
 return {id:b.id,raw:b.raw,priorConfirmedScope:b.confirmedScope,priorGap:b.rootEffectQuestion,sources:refs.split(','),resolvedScope:resolved,applicationAndDifference:application,counterexamples:counter.split(','),finalVerdict:'unknown',publishable:false,fullRuleResolved:false,newApplicableCondition:!['G04-N','G04-Y','G14-N','G12-N'].includes(b.id),reviewStatus:'closed-until-material-input',remaining:b.heldReason,requiredInput};
});
const data={date:'2026-10-17',scope:'문헌 수집·조건/반례 일괄 검수. 명리의 경험적 타당성 검증 아님.',sources,reusedSources,comparators,records,excluded:baseline.excluded,summary:{reviewed:22,natal:18,annual:4,newChapterSources:6,newComparatorRecords:6,newApplicableConditionCases:18,newCandidateRejectedCases:3,reusedOnlyCases:1,fullRuleResolved:0,held:22},engineTruthUsed:false,published:false,externalAI:false,reopenOnly:['새 원문/조건 명조','새 원자료/기간 근거','영인 판본 교감','독립 검수 의견','독립 라벨·평가 설계']};
assert.equal(new Set(records.map(r=>r.id)).size,22);
assert.deepEqual(new Set(records.map(r=>r.id)),new Set(Object.keys(notes)));
assert.equal(records.filter(r=>r.id.endsWith('-Y')).length,4);
assert.equal(new Set([...records,...data.excluded].map(r=>r.id)).size,32);
for (const r of records) {
 assert.deepEqual(r.raw,cases.find(c=>c.id===r.id).raw);
 assert(r.sources.every(s=>[...sources,...reusedSources].some(x=>x.id===s)));
 assert.equal(r.publishable,false);
 assert(r.requiredInput && r.applicationAndDifference && r.counterexamples.length);
}
for(const c of comparators) {assert.equal(c.pillars.length,4);assert(sources.some(s=>s.id===c.source));assert(c.targets.every(t=>notes[t]));}
const outfile='remaining22-consolidated-evidence.json';
fs.writeFileSync(path.join(dir,outfile),JSON.stringify(data,null,2)+'\n');
const lines=[
 '# 남은 22건 문헌·적용 조건·반례 통합 검수',
 '', '2026-10-17. 원국 18건·연도 4건 전부 처리. 전체 규칙 확정 0건, 유보 22건. 이번 해결은 적용 조건과 잘못된 일반화의 배제이며 강약·과다·관계 위험의 확정이 아니다. 기존 엔진·모델 결과를 읽거나 정답으로 사용하지 않았다. 게시·배포·운영 변경·외부 AI 호출 없음.',
 '', '## 조사 범위와 중복 제거',
 '', '인계문서, cases.json, 22건 원장과 G12/G17/본신 합/32건 기존 기록을 대조했다. 기존 문헌의 평행 전사는 새 근거로 세지 않았다. 새 6개 장은 기존 docs/tools/연구 JSON의 URL·장명·핵심 명조 검색에 없던 구간이다. 6개 완성 비교 명조를 이번 원장에 추가했다. 이들은 하나의 책에 속하며 독립 학파 6개의 합의가 아니다. 새 적용 조건·반례 보강 18건, 새 후보의 격·역할 불일치로 적용을 제외한 3건(G04-N/Y·G14-N), 기존 근거만 동결한 1건(G12)을 구분한다. 후보를 검토한 것만으로 직접 증거 확보라 세지 않았다.',
 '', '먼저 정한 결론 변경 요건: 상대 세력은 지원자 존재를 넘는 작용 비교, 합충은 성분별 보존/제약 설명, 경합은 격·월령·위치 전제, 판본은 영인 교감, 연도는 원국과 운 시작·기간 근거다. 이 요건을 충족하지 않은 부분은 unknown을 유지했다. 새 조건이 나오지 않는 기존 질문은 종료하며 표현만 바꿔 다시 조사하지 않는다.',
 '', '## 새 출처 원장',
 '', '모두 沈氏 본문 디지털 전사다. 현대 東里山人按·교감 校를 저자의 원문과 구분했다. 저자가 붙인 과거 성취·신분·혼인·질병·수명 서술은 예측 정답으로 사용하지 않았다. 아래 내용은 조문을 의역한 것이며 완성 명조와 구별한다.',
 ];
for(const s of sources) lines.push('',`- **${s.id}** [${s.title}](${s.url}), ${s.locator}. ${s.finding} ${s.limit}`);
lines.push('','## 재사용 출처와 열람 종료','');
for(const s of reusedSources)lines.push(`- [${s.id}](${s.url}), ${s.locator}: ${s.finding}. 기존 근거 재사용.`);
lines.push('','ZP7(3720)은 이번 웹 도구에서 두 차례 시간 초과. 기존 검수 이력만 보존하고 새 확인으로 세지 않았다. ZP6/17/25/28/33·본신 합을 다시 열람한 것은 신규 성과가 아니다. G12 C7/C8/C11/C12 및 三命通會 이문은 인계와 상세 보고서의 기존 결과로만 연결했다. 새 영인본이나 동일조건 해설을 확보하지 못한 쟁점을 재판정하지 않았다.','', '## 완성 비교 명조·반례','');
for(const c of comparators)lines.push(`### ${c.id} — ${c.pillars.join(' / ')}`,'',`근거 ${c.source}, ${c.locator}. ${c.claim}`,`대상: ${c.targets.join(', ')}. 일치: ${c.match}. 차이: ${c.difference}`,`배제하는 일반화: ${c.refutes}. 한계: ${c.limit}`,'');
lines.push('## 22건 개별 적용 기록','', '아래 확정 범위는 문헌의 적용 제한이다. 원국의 실효·강약 확정이 아니다. 반례가 다른 격이면 그 차이까지 명시했고 결과를 전용하지 않았다.');
for(const r of records)lines.push('',`### ${r.id} — ${Object.values(r.raw.pillars).join(' / ')}${r.id.endsWith('-Y')?` · ${r.raw.targetYear} · 대운 ${r.raw.daewoonPillar} · 세운 ${r.raw.annualPillar}`:''}`,'',`- 출처: ${r.sources.join(', ')}. 반례/경계: ${r.counterexamples.join(', ')}.`,`- 해결/좁힌 범위: ${r.resolvedScope}`,`- 적용 조건·차이: ${r.applicationAndDifference}`,`- 남은 공백: ${r.remaining}`,`- 재개 입력: ${r.requiredInput}`, '- 최종: unknown / 게시 불가 / 새 유효 입력 전 조사 종료.');
lines.push('','## 해결한 범위와 문헌만으로 어려운 범위','',
 '| 구분 | 결과 |','|---|---|',
 '| 처리 | 22/22건, 원국 18·연도 4. 제외 10건 유지 |',
 '| 새 근거 | 신규 장 6개·완성 비교 명조 6개. 적용 조건/반례 보강 18건, 후보 적용 제외 3건, 기존 근거 동결 1건(G12) |',
 '| 부분 해결 | 겨울 辛의 재 경로 일괄 불능 배제(G03), 인격 설기 분기(G11/G23), 패인 전제(G10/G18/G21), 재인 합·격지 차이(G16), 甲己 합 결과 전용 제한(G24) 등 |',
 '| 전체 규칙 | 확정 0·유보 22. 부분 해결을 최종 음성/양성으로 환산하지 않음 |','',
 '문헌만으로 남은 문제는 다음과 같다. ① 22건 모두: 실제 배치의 상대 세력·합충 후 기능은 같은 관법의 독립 검수가 필요하다. 완전 일치 사례를 끝없이 검색하는 것으로 대체하지 않는다. ② G13-N/Y와 G12 등 판본 문제: 특정 전사 이문은 영인본 교감이 필요하다. 새 35장 L57·L59 이문도 규칙으로 채택하지 않았다. ③ G24 등의 음간 근·장생 문제: 관법을 명시하고 별도로 비교해야 하며 합산 합의로 만들지 않는다. ④ 연도 4건: 제공 대운/세운은 보존했지만 운 시작 근거·절입·기간별 적용 범위와 원국 검수가 추가로 필요하다. ⑤ 모든 규칙의 수치 임계값 동등성: 독립 라벨·별도 표본·평가 규격이 필요하며 고전 문헌으로 28/30/42 기준을 검증할 수 없다.',
 '', '종료 기준: 이 통합 원장의 항목은 새 원문·원자료·영인 교감·독립 검수 등 결론에 영향을 주는 입력이 생길 때만 재개한다. 기존 엔진의 같은 결과, 평행 전사의 재열람, 질문 표현 변경만으로 재개하지 않는다. 이는 문헌 전체의 부재 또는 명리의 정확도 입증을 뜻하지 않는다.',
 '', '## 정합성 확인과 이력',
 '', '생성 스크립트에서 ID 22개 무중복·제외 10개와 합집합 32·원국 18/연도 4·cases.json 원자료 일치·출처 연결·6명조 네 기둥·게시 불가를 검사했다. 이 검사는 기록 검사이며 독립 전문가 검수나 경험적 정확도 검증이 아니다.',
 '', '상세 원장: output/independent-reference-2026-10-17/remaining22-consolidated-evidence.json (gitignored). 재생성 및 정합성 검사: node tools/consolidate-remaining22-evidence.cjs. 기존 보고서·원장은 보존했다.',
 '', '기존 연결: [인계](HANDOFF_LITERATURE_REVIEW_G12_2026-10-17.md), [22건 이전 원장](REMAINING22_RELATIVE_ROOT_REREVIEW_2026-10-17.md), [제외·유형](ALL32_HOLD_TYPES_AND_REMEDIATION_2026-10-17.md), [G12 최신](G12_SHEN_YEARZI_GUISI_FUNCTION_2026-10-17.md), [본신 합 3건](SELF_COMBINATION_THREE_COMPARATORS_2026-10-17.md).','');
fs.writeFileSync('docs/REMAINING22_CONSOLIDATED_EVIDENCE_2026-10-17.md',lines.join('\n'));
console.log(JSON.stringify({checks:'passed',...data.summary,report:'docs/REMAINING22_CONSOLIDATED_EVIDENCE_2026-10-17.md'}));
