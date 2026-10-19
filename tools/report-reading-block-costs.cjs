const fs=require('fs'),path=require('path'),assert=require('assert/strict');const dir='output/reading-block-release',deployment=JSON.parse(fs.readFileSync(dir+'/deployment.json'));
const experiments=fs.readdirSync(dir).filter(f=>/^measurement-.*\.json$/.test(f)).map(file=>({file,...JSON.parse(fs.readFileSync(dir+'/'+file))}));
const measurementDate=process.env.READING_MEASUREMENT_SINCE||new Date(Date.now()+9*3600000).toISOString().slice(0,10),cutoff=Date.parse(measurementDate+'T00:00:00+09:00');assert(Number.isFinite(cutoff),'Invalid measurement date');
function latest(variant){const rows=experiments.filter(d=>d.completed&&d.measurement?.variant===variant&&Date.parse(d.measuredAt)>=cutoff).sort((a,b)=>a.measuredAt.localeCompare(b.measuredAt));assert(rows.length,'Missing successful final '+variant+' measurement');return rows.at(-1);}
const selected=['baseline','blocks','hybrid'].map(latest),rows=selected.map(d=>{const m=d.measurement,r=m.result;assert(r.ok);assert(r.writingQuality.ok);assert(r.interpretation.validation.ok);return {variant:m.variant,file:d.file,foregroundCostUSD:m.foregroundCostUSD,totalCostUSD:d.costUSD,foregroundCalls:m.providerEvents.filter(e=>e.scope!=='reading-block-validation').length,totalCalls:d.providerCalls,generatedParagraphs:r.generatedParagraphCount,reusedBlocks:r.reusedBlocks?.length||0,paragraphs:r.result.paragraphs.length,characters:r.result.paragraphs.reduce((n,p)=>n+p.text.length,0),engine:r.interpretation.version,chapter:r.chapterContractId||m.sampleId.replace(/^synthetic-1994F-/,''),quality:r.chapterQuality?.ok===true,usage:m.providerEvents.filter(e=>e.scope!=='reading-block-validation').reduce((a,e)=>({input:a.input+(e.usage?.input||0),output:a.output+(e.usage?.output||0),cached:a.cached+(e.usage?.cached||0)}),{input:0,output:0,cached:0})};});
assert(rows.every(r=>r.paragraphs===rows[0].paragraphs));assert(rows.every(r=>r.engine===rows[0].engine));assert.equal(rows[1].foregroundCalls,0);assert.equal(rows[1].foregroundCostUSD,0);assert.equal(rows[2].generatedParagraphs,1);assert.equal(rows[2].reusedBlocks,6);
const A=selected[0].measurement.result,B=selected[1].measurement.result,C=selected[2].measurement.result;
assert.deepEqual(A.interpretation.claims,B.interpretation.claims,'same live evidence snapshot A/B');assert.deepEqual(A.interpretation.claims,C.interpretation.claims,'same live evidence snapshot A/C');
const identicalAB=JSON.stringify(A.result.paragraphs.map(p=>p.text))===JSON.stringify(B.result.paragraphs.map(p=>p.text));assert(identicalAB,'B must preserve the complete baseline prose');
const retained=C.result.paragraphs.filter(p=>p.id!=='5').every(p=>B.result.paragraphs.find(q=>q.id===p.id)?.text===p.text);assert(retained,'C must retain the six approved paragraphs');
const runs=[...experiments,...fs.readdirSync(dir).filter(f=>/^automation-tick-.*\.json$/.test(f)).map(file=>({file,...JSON.parse(fs.readFileSync(dir+'/'+file))}))];
const experimentTotal=runs.reduce((n,r)=>n+(r.costUSD||0),0),unknownRuns=runs.filter(r=>r.taskId&&r.costUSD==null).length;
for(const r of rows)r.foregroundSavingsPercent=(1-r.foregroundCostUSD/rows[0].foregroundCostUSD)*100;
const rollout=JSON.parse(fs.readFileSync(dir+'/rollout-snapshot.json'));
const summary={rollout,at:new Date().toISOString(),deployment,measurementType:'live production API, registered synthetic chart, real provider tokens and configured official list rates',invoiceVerified:false,wholeUserPopulationMeasured:false,rows,identicalBaselineAndBlocks:identicalAB,sixApprovedParagraphsRetained:retained,experimentTotalUSD:experimentTotal,unknownRuns,conservativeBreakEvenIdenticalQualifiedRequests:Math.ceil(experimentTotal/rows[0].foregroundCostUSD),failureCount:runs.filter(r=>r.taskId&&!r.completed).length,notes:['All failed experiments and publication checks are included in experimentTotalUSD.','Provider prompt-cache savings may also affect the partial-generation comparison.','No assertion of overall user-average savings or invoice reconciliation.','Existing AI model and paragraph count are preserved.']};
fs.writeFileSync(dir+'/cost-comparison.json',JSON.stringify(summary,null,2));
const fmt=n=>'$'+n.toFixed(6),labels={baseline:'A. 전체 생성',blocks:'B. 승인 블록',hybrid:'C. 문단 하나 누락'};
const md=`# 풀이 블록 전환 운영 배포·비용 실측 — ${measurementDate}

운영 배포와 실제 API 비교를 완료했습니다. 이 문서는 1차 감사 기록의 후속 결과입니다. 전체 사용자 모집단의 평균 절감률은 아직 계산하지 않았습니다.

## 실제 비교 결과

동일한 가상 명식·챕터·원국 엔진·모델·문체·근거 버전으로 운영 API를 호출했습니다. 토큰과 캐시 토큰은 실제 제공자 응답 값이고, 금액은 확인한 공식 표준 단가를 곱한 USD입니다. 제공자 청구서·세금·환율·Cloudflare/Supabase 요금까지 대조한 금액은 아닙니다.

| 경로 | 새 문단 | 재사용 블록 | 실시간 AI 호출 | 실시간 AI 비용 | 본문 글자 수 | A 대비 실시간 절감 |
|---|---:|---:|---:|---:|---:|---:|
${rows.map(r=>'| '+labels[r.variant]+' | '+r.generatedParagraphs+' | '+r.reusedBlocks+' | '+r.foregroundCalls+' | '+fmt(r.foregroundCostUSD)+' | '+r.characters+' | '+r.foregroundSavingsPercent.toFixed(1)+'% |').join('\n')}

모두 ${rows[0].paragraphs}개 문단입니다. B는 A의 본문과 완전히 같고, C는 승인된 여섯 문단을 글자까지 유지했습니다. C는 누락시킨 실천 문단만 생성했습니다. 계산·출처·문장·챕터 검사와 해당 경로의 의미 검수가 통과했습니다. B는 사전에 검수·승인한 블록을 사용하므로 새 의미 검수 호출을 만들지 않습니다.

### 초기 비용을 포함한 해석

실패한 시험, 사전 제작, 게시 검수와 최종 비교를 포함한 이번 실험 기록의 총 AI 비용은 ${fmt(experimentTotal)}입니다. 금액 미계측 작업은 ${unknownRuns}건입니다. 같은 기간 자동 작업까지 포함한 운영 제작 원장의 누적 비용은 ${fmt(rollout.ledger['2026-10'].spent)}이며, 일일 작업 한도는 ${rollout.config.maxDailyTasks}로 유지했습니다. 현재 승인 블록은 ${rollout.libraries.reduce((n,l)=>n+l.approved,0)}개입니다.\n\nC의 실시간 비용은 이 표본에서 A 대비 ${(100*(rows[2].foregroundCostUSD/rows[0].foregroundCostUSD-1)).toFixed(1)}% 변동했습니다. 원시 호출별 비용으로 재시도 포함 내역을 확인합니다. 일부만 생성하면 항상 더 저렴하다고 주장하지 않습니다.\n\n실시간 비용과 분리해 집계한 각 측정의 총비용(A/B/C)은 ${rows.map(r=>fmt(r.totalCostUSD)).join(' / ')}입니다.

당장의 전체 사업 비용이 위 실시간 절감률만큼 줄었다고 주장하지 않습니다. 이번 전체 실험비까지 같은 조건의 블록 적중 요청에서 회수한다고 가정한 단순 산술 기준은 약 ${summary.conservativeBreakEvenIdenticalQualifiedRequests}회입니다. 실제 회수 속도는 조건별 적중률·새 근거 도입·실패/재시도·사용자가 읽는 챕터 분포에 달려 있습니다. 부분 생성 비교에는 제공자의 프롬프트 캐시 효과도 포함됩니다.

## 구현·운영 상태

- 기존 승인 RAG와 연결된 풀이 블록을 먼저 선택하고, 부족하거나 충돌한 문단만 생성합니다. 전체 문단 배열로 병합한 뒤 기존 검사를 그대로 수행합니다.
- 서로 다른 원국 재사용은 동일한 복합 전통 조건·원문 근거·예외·수정 효과가 맞고 원국 특정 숫자·간지·강약 명칭을 주장하지 않는 블록으로 제한합니다. 개별 계산 사실을 말하는 신규 블록은 원국 전체 서명에도 묶습니다.
- 함께 검수된 블록 묶음을 우선합니다. 기존 승인 문단은 재작성하지 않고, 조합 충돌이 난 문단만 보충합니다. 사례·장단점·최고/최악·선택과 환경의 적합성을 블록별로 검수합니다.
- Agentic RAG의 실제 일일 연구 기능과 연결했습니다. 부족 근거는 승인 지식 ID를 지정한 중복 없는 연구 요청으로 등록하고, 기존 연구 예산·쿨다운·출처 권한을 유지합니다. 변경 지식/엔진 버전에 맞는 등록 가상 명식만 제작하고, 이미 충분한 승인 블록이면 AI를 생략합니다.
- 건강의 고정 교육과 전생의 별도 제작 경로를 보존했습니다. 그 외 활성 풀이 66개 챕터를 공통 가상 명식에 연결해 자동 제작 대상으로 등록했습니다. 이 수치는 생성·승인 완료 수가 아니라 작업 정의 수입니다.
- 블록 자동 제작은 일 $2 / 월 $10 / 작업 $1 예약 상한이며, 한 작업의 호출 수와 일일 작업 수를 제한합니다. 이는 기존 연구 예산과 별개입니다. 돈을 먼저 예약한 후 호출별 보수적 상한을 검사하고, 실제 사용량으로 정산합니다. 비용을 알 수 없는 작업은 예약액을 보수적으로 소비한 것으로 처리합니다.
- 운영 스케줄러는 매시 실행됩니다. 기존 연구는 상태에 저장된 한국시간 오전 3시·일 1회 시작 규칙을 유지하고, 블록 제작은 변경·부족·예산 조건이 맞을 때만 진행합니다. 블록 제작 장애는 연구 호출을 막지 않습니다.
- 분산 작업은 서비스 전용 Postgres CAS와 임대·소유자 fencing을 사용합니다. 동시 동일 작업은 결과를 기다리고, 임대를 잃은 작업자는 결과와 영구 캐시를 덮어쓸 수 없습니다. 공개 요청과 후보 제작·개인화 경계를 유지합니다.
- 실제 고민과 이전 문맥이 있는 요청은 공용 결과 캐시에서 제외합니다. 미승인 후보는 일반 사용자 풀이에 사용되지 않습니다. 실제 사용자 명식이나 본문을 자동 제작 큐에 수집하지 않습니다.
- 관리자 운영 관리에서 한국시간 일/월 비용, 모델별 비용, 캐시·블록 생략 수, 후보/승인/역할/버전/복구, 자동화 예산·부족 영역·작업 상태를 확인합니다. 요청 비용에는 실패·검수·재시도도 포함하고 실제 서비스·사전 제작·가상 비교 트래픽을 구분합니다.
- 기존 무빙툰·PDF의 result.paragraphs 계약을 유지했습니다. 미디어나 PDF를 위해 같은 본문을 다시 AI로 생성하지 않습니다.

## 이번 운영 검수로 수정한 오류

일주 신살 조건에 다른 기둥의 신살을 적용하던 경로를 막았습니다. 통근 계산값의 존재와 관련 전통 해석 근거의 부재를 구분하고, 조후 모델 미적용과 전통 계절 원리를 혼동하지 않도록 최소 계산 사실을 작성 입력에 추가했습니다. 검수 출력은 항목별 객체로 닫아 중복·누락을 막으며, 형식 응답 오류에는 본문을 고정하고 검수만 재시도합니다. 문제가 있는 블록 때문에 정상 블록까지 폐기하지 않습니다.

## 검증 증거

- 14개 회귀 테스트: [실행 결과](../output/reading-block-release/test-results.json).
- PostgreSQL 17 실제 엔진에서 20개 CAS 경쟁 중 1개 선점, 만료 임대 재획득, stale owner 거부, 좁은 키 범위와 service_role 전용 권한 확인.
- 자동 제작/개별 검수·부분 게시/예산/중복 연구 큐/원자 게시·복구/조건 및 예외 무효화/개인정보 미기록 테스트 통과.
- 운영 관리자·자동화·측정 엔드포인트의 비인증 401, 공개 경로와 주요 파일 해시 검증: [운영 검증](../output/reading-block-release/verification.json).
- 기존 스케줄러 비밀 바인딩 보존과 매시 cron 확인: [스케줄러 검증](../output/reading-block-release/scheduler-verification.json).
- 최종 운영 배포: ${deployment.deployment}. 기존 공개 자산을 기준으로 관리자 파일과 Worker만 갱신했으며 Cloudflare 환경 비밀값은 변경하지 않았습니다.
- 원시 비교 자료: [구조화 결과](../output/reading-block-release/cost-comparison.json). 실패 시험도 같은 폴더의 개별 measurement 및 automation-tick 파일에 보존합니다.

## 측정의 한계와 후속 운영

이 결과는 운영 서버와 실제 AI를 사용한 등록 가상 명식 비교입니다. 전체 실제 사용자당 평균·월간 청구 절감률·전통 해석의 경험적 예측 정확도를 뜻하지 않습니다. 라이브러리는 예산과 검수 결과에 따라 순차적으로 축적되고, 맞는 블록이 없으면 해당 부분을 생성합니다. 전용 인증 사용자 캐시는 새로 만들지 않았고 개인화 결과의 공용 캐시를 차단했습니다. 이미지·음성·영상처럼 토큰/계약 단가가 없는 호출은 금액 미계측으로 남기며 0원으로 합산하지 않습니다.

표준 단가 근거: [OpenAI API 가격](https://developers.openai.com/api/docs/pricing), [Claude Sonnet 5.5 가격](https://www.anthropic.com/claude-sonnet-5-5). 입력·캐시 입력·출력 및 캐시 쓰기를 구분하며 기존 모델은 유지했습니다.
`;
fs.writeFileSync('docs/READING_BLOCK_PRODUCTION_2026-10-19.md',md);console.log(JSON.stringify({passed:true,rows,totalExperimentUSD:experimentTotal,identicalAB,sixRetained:retained},null,2));
