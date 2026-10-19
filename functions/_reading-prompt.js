// Lossless JSON interning. Never selects, summarizes or drops evidence/context.
export const PROMPT_VERSION='reading-prompt-2';
export function compactPrompt(input){
 let data;try{data=JSON.parse(input);}catch{return input;}
 const counts=new Map();
 const scan=v=>{if(v===null)return;const s=JSON.stringify(v);if(s.length>=100)counts.set(s,(counts.get(s)||0)+1);if(Array.isArray(v))v.forEach(scan);else if(typeof v==='object')Object.values(v).forEach(scan);};scan(data);
 // Reserved notation in user data is never reinterpreted.
 if(input.includes('"$shared"'))return input;
 const shared={},ids=new Map();
 const encode=(v,root=false)=>{const s=JSON.stringify(v);if(!root&&counts.get(s)>1&&s.length>=100){if(!ids.has(s)){const id='v'+ids.size;ids.set(s,id);shared[id]=encode(v,true);}return {$shared:ids.get(s)};}if(Array.isArray(v))return v.map(x=>encode(x));if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,encode(x)]));return v;};
 const payload=encode(data),packed=JSON.stringify({encoding:PROMPT_VERSION,instruction:'shared는 중복 데이터 사전입니다. payload 안의 {$shared:키} 객체는 shared[키]의 전체 원문으로 읽습니다(중첩 참조도 동일). 요약이나 생략이 아닙니다. 모든 판단·조건·예외·계산·기존 문단을 원문과 동일하게 검토하고 출력은 요청된 스키마를 따릅니다.',shared,payload});
 return packed.length<input.length*0.92?packed:input;
}
