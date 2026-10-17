// Restore layout metadata only; prose is always the reviewed whole-phrase rewrite.
const fs=require('node:fs');
const path='output/ux-writing/copy-review.json',review=JSON.parse(fs.readFileSync(path));
const tokens=s=>(s.match(/\{[^{}]+\}|<[^>]*>|\d+(?:[,.–-]\d+)*/g)||[]).sort();
const sameTokens=(a,b)=>JSON.stringify(tokens(a))===JSON.stringify(tokens(b));
function layout(before,after){
 const prefix=/^[!~.#]/.test(before)?before[0]:'';
 if(prefix&&after[0]!==prefix)after=prefix+after;
 const count=(before.match(/\n/g)||[]).length;
 if(count!==(after.match(/\n/g)||[]).length){
  const words=after.replace(/\n/g,' ').split(' '),weights=before.split('\n').map(x=>Math.max(1,x.length)),sum=weights.reduce((a,b)=>a+b,0),groups=[];let remaining=words.slice();
  for(let i=0;i<weights.length-1;i++){const available=remaining.join(' '),target=after.length*weights[i]/sum;let n=1;while(n<remaining.length-(weights.length-i-1)&&remaining.slice(0,n+1).join(' ').length<=target)n++;groups.push(remaining.splice(0,n).join(' '));}
  groups.push(remaining.join(' '));after=groups.join('\n');
 }
 return after;
}
const unresolved=[];
for(const f of review.failures){const after=typeof f.proposed==='string'?layout(f.text,f.proposed):null;if(after&&sameTokens(f.text,after)&&(after.match(/\n/g)||[]).length===(f.text.match(/\n/g)||[]).length){review.edits.push({...f,after,reason:'문장 전체 편집 후 원래 장면의 줄바꿈·연출 접두사를 보존했습니다.',layoutRestored:true});}else unresolved.push(f);}
review.failures=unresolved;review.layoutPreservation='Original marker and line-count metadata restored without grammatical substitution.';fs.writeFileSync(path,JSON.stringify(review,null,2));console.log(JSON.stringify({edits:review.edits.length,layoutRestored:review.edits.filter(x=>x.layoutRestored).length,unresolved:unresolved.map(x=>({id:x.id,text:x.text,proposed:x.proposed}))},null,2));
