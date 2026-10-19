'use strict';
// Case-by-case source review. Intentionally no engine import and no comparison.json read.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const dir=path.resolve(__dirname,'../output/independent-reference-2026-10-17');
const cases=JSON.parse(fs.readFileSync(path.join(dir,'cases.json'))),bundle=JSON.parse(fs.readFileSync(path.join(dir,'source-bundle.json')));
// Korean authored interpretation of the same observations; no numeric screen is consulted.
const kor={
G01:'자월 을목에 경금 관성과 무토 재성이 보인다. 자수의 생조와 미지 작용을 함께 봐야 하며 시주가 없어 관성의 상대적 과다를 확정할 수 없다.',
G02:'오월 임수에 병화 재성·연간 임수 비겁이 함께 보인다. 오화의 반복만으로 재다신약을 정할 수 없고 갑목·진지와 생조의 합성 판단이 남는다.',
G03:'해월 신금에 시간 갑목, 시지 오화와 두 계수가 있다. 오화 관성의 존재는 확인되지만 겨울 조후·미지·설기와의 상대 작용이 미정이다.',
G04:'진월 기토에 계수 재성과 갑목 관성, 무토 및 진·축지가 함께 있다. 재성의 존재와 일간의 약함은 별개여서 전체 강약을 확정하지 않는다.',
G05:'유월 무토에 두 을목 관성과 계수 재성이 투간한다. 관성 두 글자만으로 과다라 정하지 않으며 사·인·해의 지지 작용과 계절을 함께 봐야 한다.',
G06:'인월 정화에 경금 재성·임수 관성, 병화 비겁과 두 인목이 있다. 인비 지원과 재성의 상대 작용을 평가할 기준이 부족하다.',
G07:'미월 계수에 세 미지와 진지, 정·정·병화가 있다. 토 관성 집중의 관찰은 가능하지만 통근·조후·특수 편중 검토 없이 관다신약을 확정하지 않는다.',
G08:'해월 무토에 계수 재성과 무토 비겁, 두 신지가 보인다. 수 계절만으로 재성 과도를 판정할 수 없고 시주도 미상이다.',
G09:'사월 경금에 을목 재성, 두 기토와 두 유지가 있다. 사화 관성과 인비 지원을 함께 비교해야 하므로 관성의 상대 과다를 유보한다.',
G10:'술월 기토에 자수 재성·갑목 관성과 병화, 두 술지가 있다. 화토 지원의 존재만으로 신강을 확정하거나 자수만으로 재다신약을 확정하지 않는다.',
G11:'묘월 병화에 두 신금·경금 재성과 해수가 보이고 인·묘목 지원도 있다. 관성인 수의 작용은 목의 생조·조후와 분리해 확정할 수 없다.',
G12:'신월 병화에 임·계수 관성과 신금 재성, 사화와 무·술토가 있다. 비겁 지원·설기·재성 작용의 전체 비교가 남는다.',
G13:'축월 을목에 임·계·계수 인성이 투간하고 천간 금은 없다. 천간에 관성이 없다는 사실을 원국 무관으로 확대하지 않고 축·사·미의 지장간과 조후를 검토해야 한다.',
G14:'오월 임수에 두 경금 인성과 갑목, 진·술지가 있다. 오화 재성의 계절 작용과 경금 지원을 합성할 기준 없이 재다신약을 확정하지 않는다.',
G15:'술월 병화에 을목 인성·병화 비겁과 진·술지가 있다. 천간에 수가 없다는 관찰은 원국 무관 판정이 아니며 시주가 없어 유보한다.',
G16:'진월 기토에 임수·해수 재성과 병·정화 인성이 함께 있다. 재성 존재가 일간의 감당 능력 초과를 의미하지 않으며 진·묘의 작용도 남는다.',
G17:'신월 계수에 무토 관성과 두 정화 재성, 해수·신금 지원 단서가 있다. 무토 투간만으로 관다신약을 정할 수 없다.',
G18:'인월 정화에 갑목 인성·두 무토 식상과 신금 재성, 오·미지가 있다. 생조·설기·재성의 상대 작용에 대한 원문 적용 기준이 부족하다.',
G19:'미월 계수에 기토 관성·신금 인성·임수 비겁과 미·미·술지가 있다. 토의 반복만큼 인비 지원도 검토해야 하므로 상대 과다를 확정하지 않는다.',
G20:'자월 무토에 계수 재성과 무토 비겁, 오화·축토가 있다. 겨울 조후와 수화 작용이 미정이라 자월만으로 재다신약을 확정하지 않는다.',
G21:'사월 경금에 기토 인성·신금 비겁과 계수·자수·묘목이 있다. 관성 사화의 계절 작용과 지원·설기 비교를 거쳐야 한다.',
G22:'유월 갑목에 기토 재성·임수 인성과 자수가 있다. 생조와 제어가 함께 보이고 시주도 없어 기토의 상대 과다를 확정하지 않는다.',
G23:'묘월 병화에 계수·해수 관성과 을목 인성·병화 비겁, 오화가 있다. 관성 수의 존재와 인비 지원을 합성하지 않고 관다신약이라 할 수 없다.',
G24:'미월 신금에 갑목 재성·신금 비겁·기토 인성과 두 미지·해수가 있다. 인비 존재만으로 감당 가능을, 갑목 존재만으로 재성 과도를 확정하지 않는다.'};
function quote(docId,needle){const doc=bundle.documents.find(d=>d.docId===docId),chunk=doc.chunks.find(c=>c.text.includes(needle));if(!chunk)throw Error(needle);const text=chunk.text.split('\n').find(l=>l.includes(needle)).trim();return {docId,chunkId:chunk.id,quote:text};}
const premises=[quote('dmux66n2o7uf','일간(나)의 에너지는 약한데'),quote('dmuzadnbj9xm','**득령(得令)**'),quote('dmuzadnbj9xm','**득지(得地)**'),quote('dmuzadnbj9xm','**득세(得勢)**')];
const review=cases.map(c=>{const annual=c.id.endsWith('-Y'),p=c.raw.pillars;return {id:c.id,caseGroup:c.caseGroup,split:c.split,ruleId:c.ruleId,pillars:p,reviewStatus:'case-by-case-source-review-complete',reviewer:'Codex single-reviewer; not an independent expert panel',referenceLabel:'unknown',publishable:false,confirmedScope:{genderInSourceScope:true,knownPillars:Object.entries(p).filter(([,v])=>v!==null).map(([k,v])=>k+':'+v),hourKnown:c.raw.hourKnown},observations:kor[c.caseGroup],interpretationUncertainties:'원문에서 위치별 생조·설기·제어의 상대 작용을 합성하는 충분한 기준을 확인하지 못했다.',weakDaymaster:'unknown',relativeExcess:'unknown',reasonCodes:[...(c.raw.hourKnown?[]:['unknown-hour']),annual?'annual-composition-unspecified':'source-relative-strength-composition-unspecified'],annualReview:annual?{year:c.raw.targetYear,annualPillar:c.raw.annualPillar,daewoonPillar:c.raw.daewoonPillar,reason:'운 간지는 확인되지만 원국 지원·설기·제어와 운의 합충형·조후를 합성해 해당 연도 재성 총작용과 감당 능력 초과를 판정할 원문 기준이 없다. 운 천간이나 재성의 존재로 손재 위험을 확정하지 않는다.'}:null,evidence:annual?[...premises,quote('dmux7q9nwg6m','일간이 감당하기 어려울 정도')]:premises};});
const summary={date:'2026-10-17',reviewed:review.length,definitiveSupported:0,definitiveContradicted:0,held:32,unknownHour:review.filter(r=>!r.confirmedScope.hourKnown).map(r=>r.id),annualHeld:review.filter(r=>r.annualReview).length,referenceSha256:crypto.createHash('sha256').update(JSON.stringify(review)).digest('hex'),engineComparisonRead:false,expertPanel:false,publication:false,externalAIRequests:0};
fs.writeFileSync(path.join(dir,'actual-source-review.json'),JSON.stringify({summary,cases:review},null,2));console.log(JSON.stringify(summary,null,2));
const table=review.map(r=>`| ${r.id} | ${Object.values(r.pillars).map(x=>x||'시 미상').join(' ')} | ${r.annualReview?r.annualReview.year+' '+r.annualReview.annualPillar+' / '+r.annualReview.daewoonPillar:'원국'} | 유보 | ${r.observations}${r.annualReview?' '+r.annualReview.reason:''} |`).join('\n');
fs.writeFileSync(path.resolve(__dirname,'../docs/INDEPENDENT_32_ACTUAL_REVIEW_2026-10-17.md'),`# 32개 명조 실제 원문 검수\n\n2026-10-17. Codex 단독 원문 검수이며 독립 전문가 합의 판정은 아니다. 검수 과정에서 comparison.json과 기존 엔진의 비중·강약·패턴 출력은 읽지 않았다. 이전 32건 일괄 사전 유보와 달리 각 명조의 천간·월지·주변 지원/설기/제어 단서를 사례별로 검토했다.\n\n규칙 전체 확정 가능: 0건. 유보: 32건(원국 24, 연도 8). 천간 위치와 성별 배속 등의 부분 사실은 확인했지만 이를 신약·상대 과다의 확정 판정과 구분했다. 유보를 정상 음성으로 바꾸지 않았다. 원국별 근거가 다른데도 동일한 수치 임계값으로 채우지 않았다.\n\n부분 관찰의 사실 확인에는 각 명조의 표면 글자와 원문 생극 배속을 사용했다. 지지 장간 전체를 분석·정밀 통근 판정한 것으로 주장하지 않는다. 관련 장간·조후·합충형의 종합 결론은 미확정으로 남겼다. 천간에 특정 십성이 없다는 관찰은 원국 전체 부재를 뜻하지 않는다.\n\n| ID | 연·월·일·시 | 대상 연도 세운 / 대운 | 최종 | 개별 검수 내용 |\n|---|---|---|---|---|\n${table}\n\n## 판정의 근거와 한계\n\n공통 근거는 배우자성 강약(dmux66n2o7uf/c1)의 약한 일간에 비해 지나치게 강한 배우자성이라는 조건과 용신을 찾는 법(dmuzadnbj9xm/c1)의 득령·득지·득세다. 연도 사례는 대운·세운의 십성별 의미(dmux7q9nwg6m/c1)의 해당 연도 감당하기 어려울 만큼 과도한 재성 조건을 추가했다. 비공개 상세 JSON에는 각 사례의 정확한 인용을 첨부했다.\n\n시주 미상 6개 사례는 G01-N/Y, G08-N, G15-N, G22-N/Y다. 동일 출생 원국은 4개이며 6개의 독립 출생 사례가 아니다. 나머지 26개도 원문의 상대 세력 합성·예외 적용 기준이 부족하므로 확정하지 않았다. 연도 8건은 대운·세운 간지가 있다고 해서 총 재성 작용과 실제 지원 변화를 확정할 수 없다.\n\n정성적으로 지원 단서가 많거나 관성·재성이 반복되는 사례도 확인했다. 그러나 지원 글자의 존재를 곧 신강으로, 동일 오행의 반복을 곧 과다로 환원하는 판단 규칙은 원문에서 정당화되지 않았다. 따라서 supported 또는 contradicted 라벨을 채우지 않았다. 비교용 정답이 여전히 0건이므로 동등성 정확도·민감도·특이도는 산출 불가다.\n\n검수 파일은 output/independent-reference-2026-10-17/actual-source-review.json에 저장했다. 기존 사전 reference.json과 A/B 빈 검수 양식은 덮어쓰지 않았다. 원문 인용 일치·전체 32개 처리·게시 차단·비교값 접근 배제 검사를 수행한다. 운영 게시·DB 변경·외부 AI 호출 없음.\n`);
