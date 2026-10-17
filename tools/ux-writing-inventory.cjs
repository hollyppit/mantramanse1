// Run with `node --expose-internals tools/ux-writing-inventory.cjs`.
// AST inspection: comments, regular expressions and object keys are not user copy.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const acorn=require('internal/deps/acorn/acorn/dist/acorn');
const INFORMAL=/(?<!니)[가-힣]+(?<!니)다(?:[.!?。…](?=\s|$|["'”’<])|(?=\s*$|["'”’<]))|(?:해라|해봐|해줄게|짚어줄게|할 수 있어|거야|일까|을까|는가|인가)[.!?。…]?(?=\s|$|["'”’<])/;
const FLAGS=/직설적인 반말|무례하지 않은 반말|소설체\(~다\)|반드시.{0,15}(성공|부자|결혼)|사기꾼입니다|범죄자입니다/;
function files(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()&&!['admin','img','video','node_modules'].includes(e.name)?files(path.join(dir,e.name)):e.isFile()&&/\.(js|html)$/.test(e.name)?[path.join(dir,e.name).replace(/\\/g,'/')]:[]);}
function literals(file){
 const source=fs.readFileSync(file,'utf8'),out=[];
 function parse(code,offset=0){let ast;try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'script',locations:true});}catch{try{ast=acorn.parse(code,{ecmaVersion:'latest',sourceType:'module',locations:true});}catch(e){out.push({parseError:e.message});return;}}
 function walk(n,parent,key){if(!n||typeof n!=='object')return;if(n.type==='Literal'&&typeof n.value==='string'&&/[가-힣]/.test(n.value)&&!(parent?.type==='Property'&&key==='key')){const start=offset+n.start,end=offset+n.end;out.push({start,end,text:n.value,line:source.slice(0,start).split('\n').length,property:parent?.type==='Property'?String(parent.key?.name||parent.key?.value||''):null});}else if(n.type==='TemplateElement'&&/[가-힣]/.test(n.value.cooked||'')){out.push({start:offset+n.start,end:offset+n.end,text:n.value.cooked,line:source.slice(0,offset+n.start).split('\n').length,template:true});}for(const [k,v]of Object.entries(n))if(!['loc','start','end'].includes(k)){if(Array.isArray(v))v.forEach(x=>walk(x,n,k));else if(v&&typeof v==='object')walk(v,n,k);}}
 walk(ast);}
 if(file.endsWith('.js'))parse(source);else {
  for(const match of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))if(match[1].trim())parse(match[1],match.index+match[0].indexOf('>')+1);
  for(const match of source.matchAll(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>|<!--[\s\S]*?-->|<[^>]*>|[^<]+/gi)){
   const s=match[0];if(/^<(?:script|style)\b|^<!--/i.test(s))continue;
   if(s[0]!=='<' && /[가-힣]/.test(s))out.push({start:match.index,end:match.index+s.length,text:s,line:source.slice(0,match.index).split('\n').length,htmlText:true});
   else if(s[0]==='<')for(const a of s.matchAll(/\b(aria-label|title|placeholder|alt)\s*=\s*(["'])(.*?)\2/g))if(/[가-힣]/.test(a[3])){const start=match.index+a.index+a[0].indexOf(a[2])+1;out.push({start,end:start+a[3].length,text:a[3],line:source.slice(0,start).split('\n').length,htmlText:true,property:a[1]});}
  }
 }
 return out;
}
function inventory(){
 const all=files('report'),result=[];
 for(const file of all){const records=literals(file);for(const p of records){if(p.parseError){result.push({file,...p});continue;}const text=p.text,plain=text.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ');result.push({file,...p,id:crypto.createHash('sha256').update(file+'|'+p.start+'|'+text).digest('hex').slice(0,16),informal:INFORMAL.test(plain),flag:FLAGS.test(plain),fragment:plain.length<12,technical:/관성|재성|인성|식상|비겁|신강|신약|용신|통근/.test(plain)});}}
 return {version:1,files:all.length,literals:result.length,parseErrors:result.filter(x=>x.parseError),candidates:result.filter(x=>x.informal||x.flag),records:result};
}
module.exports={inventory,literals,INFORMAL};
if(require.main===module){const d=inventory();fs.mkdirSync('output/ux-writing',{recursive:true});fs.writeFileSync('output/ux-writing/copy-inventory.json',JSON.stringify(d,null,2));console.log(JSON.stringify({files:d.files,literals:d.literals,parseErrors:d.parseErrors,candidates:d.candidates.length,byFile:d.candidates.reduce((a,x)=>(a[x.file]=(a[x.file]||0)+1,a),{})},null,2));}
