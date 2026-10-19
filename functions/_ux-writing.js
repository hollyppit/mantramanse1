// Presentation policy only. Never mutates calculations, rules or retrieved knowledge.
export const UX_VERSION = 'ux-writing-1';
export const LEVELS = ['부드럽게', '현실적으로', '팩폭', '강한 팩폭', '매우 강한 팩폭'];
export const UX_DEFAULT = { directness: 3, chapterDirectness: {}, terminology: 'hidden', sentenceChars: 85, paragraphChars: 320, examples: 'balanced', emphasis: 'minimal' };
const level = x => Number.isInteger(x) && x >= 1 && x <= 5;
export function cleanWriting(raw = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) raw = {};
  const c = { ...UX_DEFAULT, chapterDirectness: {} };
  if (level(raw.directness)) c.directness = raw.directness;
  for (const [k,v] of Object.entries(raw.chapterDirectness || {}).slice(0,80)) if (/^[\w.가-힣-]{1,80}$/.test(k) && level(v)) c.chapterDirectness[k] = v;
  if (['hidden','explained'].includes(raw.terminology)) c.terminology = raw.terminology;
  for (const [k,min,max] of [['sentenceChars',40,140],['paragraphChars',120,500]]) if (Number.isInteger(raw[k])) c[k] = Math.max(min,Math.min(max,raw[k]));
  if (['sparse','balanced','rich'].includes(raw.examples)) c.examples = raw.examples;
  return c;
}
export function writingFor(raw, keys = [], consent = false) {
  const c = cleanWriting(raw), chosen = keys.find(k => Object.hasOwn(c.chapterDirectness,k));
  const requested = chosen ? c.chapterDirectness[chosen] : c.directness;
  return { ...c, directness: requested === 5 && !consent ? 4 : requested };
}
export function writingDirective(c) {
  return `[생활밀착형 UX 라이팅 ${UX_VERSION} · 직설성 ${c.directness}/5 ${LEVELS[c.directness-1]}]
- 이 정책은 기존 문체 프롬프트와 안내자 말투보다 우선한다. 사용자 풀이·후킹·생활 사례는 모두 자연스러운 존댓말(~입니다/~합니다/~할 수 있습니다/~하는 편입니다/~해보세요)로 쓴다. 어미만 기계적으로 치환하지 말고 문장 전체를 작성한다.
- 첫 문장은 해당 챕터 질문의 결론이다. 성향 → 조건부 반복 행동 → 구체적인 손해 → 문제의 핵심 → 관찰 가능한 개선 행동으로 연결한다. 근거 없는 단계는 채우지 않는다.
- 직설성은 표현만 조절한다. 1은 부드럽게, 2는 현실적으로, 3은 불편한 행동과 대가를 직접 설명, 4는 자기모순과 선택의 대가를 더 선명하게, 5는 약점을 미화하지 않는 표현이다. 결론·근거·불확실성은 어느 강도에서도 동일하다.
- 실제 경험을 확인하지 않고 행동·과거·미래를 사실처럼 단정하지 않는다. 모욕·도덕성 낙인·정신질환·범죄·불행 예언을 추가하지 않는다. 독설을 위해 부정적인 성향을 만들지 않는다.
- 일간·일주의 이름만 보고 '안정적이고 조화로운 사람', '활발한 사람' 같은 성격을 추가하지 않는다. 계절·오행의 상징을 체온·수분·질병·건강 처방으로 바꾸지 않는다. 새 최종 용신을 선정하지 않는다.
- 승인된 해석 규칙이 부족한 것과 원국 계산값이 없는 것을 구분한다. 근거 부족은 '현재 연결된 해석 자료만으로 판단하기 어렵습니다'라고 설명하고 실제 재성이나 오행이 없다고 바꾸지 않는다.
- 해결책은 기존 판단을 재선언하거나 '조심하세요'로 끝내지 않는다. 관찰·기록·범위 합의처럼 실행 가능한 행동을 제안하되 책임을 더 떠맡으라거나 행동의 효과가 필수적·보장된다고 추가하지 않는다.
- 전문 근거(원국 조건·적용 규칙·십성/오행/궁위·RAG 출처·예외·불확실성)는 role=evidence 또는 kind=basis로 분리한다. ${c.terminology === 'hidden' ? '본문에는 전문 용어를 쓰지 않는다.' : '개념 자체를 소개하는 챕터에서만 전문 용어와 쉬운 설명을 함께 쓴다.'} 용어를 행동으로 일대일 치환하지 않는다.
- 중요한 장면에서만 같은 기질의 최고의 케이스·최악의 케이스·갈림길을 조건부로 대비한다. 모든 챕터에 같은 소제목이나 성격 소개를 반복하지 않는다. 돈은 거래·소비·관리, 일은 수행·조직, 관계는 감정·경계·협력, 운은 시기 조건, 개운은 습관에 집중한다. 재물 그릇과 자동차 비유는 유지한다.
- 한 문장 권장 ${c.sentenceChars}자, 한 문단 최대 ${c.paragraphChars}자. 사례 밀도 ${c.examples}. 한 문단 한 메시지. 본문에 산정 기준이 확인되지 않은 비중·백분율을 쓰지 않는다. 강조는 핵심 결론·약점·비교 제목·실천 핵심만 허용한다. 색상·HTML·마크다운 장식을 넣지 않는다.
- 전문 지식은 판단 근거로만 사용하고 원본을 덮어쓰지 않는다. 장점·약점·사례·해결책의 근거가 없으면 부족함을 밝힌다.`;
}
export const TERMS = /관성|재성|인성|식상|비겁|정관|편관|정재|편재|식신|상관|통근|무근|신강|신약|용신|기신|희신|격국|조후|억부|합충형파해/;
// A writer receives verified conclusions rather than a raw chart to reinterpret.
// Full calculation and original source records remain in the analysis/reviewer layer.
export function writingPlan(analysis, clean) {
  return {
    layer:'ux-writing-only',
    identity:{dayMaster:clean.sd.dayMaster?.stem,dayPillar:clean.sd.dayPillar?.ko,hourKnown:!!clean.sd.pillars?.hour},
    calculationFacts:{
      roots:clean.sd.roots?{hasRoot:clean.sd.roots.hasRoot,level:clean.sd.roots.level,reasons:(clean.sd.roots.reasons||[]).slice(0,3)}:null,
      strengthModel:clean.sd.strength?{band:clean.sd.strength.band}:null,
      usefulElementModels:Object.fromEntries(Object.entries(clean.sd.usefulElementMethods||{}).map(([school,v])=>[school,{applicable:v.applicable,yong:v.yong,hee:v.hee,reasons:(v.reasons||[]).slice(0,3)}]))
    },
    allowedReferences:(analysis.claims || []).map(c=>({claim_id:c.claim_id,knowledge_id:c.knowledge_id})),
    claims:(analysis.claims || []).map(c=>({claim_id:c.claim_id,knowledge_id:c.knowledge_id,domain:c.domain,judgment:c.judgment,strengths:c.strengths,vulnerabilities:c.vulnerabilities,actions:c.actions,examples:c.examples,exceptions:c.exceptions,counter_evidence:c.counter_evidence,uncertainty:c.uncertainty,elements:c.elements,evidenceOnly:{rules:c.traditional_rules,sources:(c.evidence || []).map(e=>({title:e.title,pageStart:e.pageStart,heading:e.heading}))}})),
    chapter:clean.chapter,
    instruction:'계산을 다시 해석하지 않습니다. calculationFacts는 이미 계산된 결과와 학파별 모델 판정입니다. 통근의 계산값이 있으나 이를 해석할 별도 claim이 없는 경우 두 상태를 구분합니다. 조후 모델이 applicable=false이면 전통 계절 규칙과 모델 미적용을 구분하고 조후 용신이 계산상 확정됐다고 쓰지 않습니다. 이 계산 요약만으로 현실의 사건이나 새 명리 판단을 만들지 않습니다. claims의 결론·장점·취약점·행동을 생활 언어로 작성하고 elements와 evidenceOnly의 전문 용어는 마지막 근거 문단에만 둡니다. refs는 allowedReferences의 knowledge_id만, claim_ids는 claim_id만 사용합니다.'
  };
}
export function inspectWriting(paragraphs, config, { concept = false, previous = [] } = {}) {
  const c = cleanWriting(config), issues = [], seen = new Set(previous.map(p => String(p.text || '').replace(/\s/g,'')));
  for (const p of paragraphs) {
    const text = String(p.text || ''), evidence = ['evidence','why'].includes(p.role) || p.kind === 'basis';
    const add = (code, severity, excerpt) => issues.push({id:p.id,code,severity,excerpt:excerpt || text.slice(0,180)});
    if (/(?:이다|한다|된다|있다|없다|했다|해야 한다|할 수 있어|해봐|거야)[.!?。]?(?:\s|$)/.test(text)) add('informal-ending','FAIL');
    if (/사기꾼|정신병자|인간쓰레기|무능한 인간|당신은 실패자/.test(text)) add('insult-or-stigma','FAIL');
    if (!evidence && !concept && TERMS.test(text)) add('technical-term','FAIL',text.match(TERMS)[0]);
    if (!evidence && /\d+(?:\.\d+)?\s*[%％]/.test(text)) add('unverified-display-metric','FAIL');
    if (/\*\*|<\/?(?:b|strong|span)\b/.test(text)) add('excessive-emphasis','FAIL');
    if (text.length > c.paragraphChars) add('long-paragraph','FAIL');
    if (text.split(/(?<=[.!?。])\s+/).some(s => s.length > c.sentenceChars)) add('long-sentence','WARNING');
    const endings=(text.match(/(?:합니다|입니다|있습니다|없습니다|됩니다|해보세요|쉽습니다|편입니다)[.!?。]/g)||[]);
    if (endings.some((x,i)=>i>=2 && x===endings[i-1] && x===endings[i-2])) add('repeated-ending','WARNING');
    const normalized = text.replace(/\s/g,'');
    if (!evidence && normalized.length > 25 && seen.has(normalized)) add('duplicate-paragraph','FAIL');
    if (!evidence) seen.add(normalized);
  }
  return { ok: !issues.some(x=>x.severity === 'FAIL'), issues };
}
