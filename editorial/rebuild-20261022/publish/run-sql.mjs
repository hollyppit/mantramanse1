// 준비된 SQL 하나를 Supabase Management API로 실행한다(직접 실행용). 어시스턴트는 실행하지 않는다.
//   $env:SUPABASE_ACCESS_TOKEN='...'
//   node run-sql.mjs <준비 폴더 이름(output 아래)> dry|apply|rollback [파일 이름 기본 catalog]
// dry는 끝에 DRYRUN-OK 가 있어야 성공이고, apply·rollback은 "apply"를 입력해야 쓴다.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline/promises';
import {ROOT} from './convert.mjs';
const [dir,mode,name='catalog']=process.argv.slice(2);
if(!dir||!['dry','apply','rollback'].includes(mode)){console.error('usage: node run-sql.mjs <folder> dry|apply|rollback [name]');process.exit(1);}
const token=process.env.SUPABASE_ACCESS_TOKEN;if(!token){console.error('SUPABASE_ACCESS_TOKEN is not set');process.exit(1);}
const file=path.join(ROOT,'output',dir,'sql',mode,name+'.sql'),sql=fs.readFileSync(file,'utf8');
if(mode!=='dry'){const rl=readline.createInterface({input:process.stdin,output:process.stdout});const a=await rl.question(`WRITE to production (${mode} ${name})? type "apply" to continue: `);rl.close();if(a.trim()!=='apply'){console.log('cancelled');process.exit(0);}}
const r=await fetch('https://api.supabase.com/v1/projects/devkslhggrkqtianjamj/database/query',{method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({query:sql})});
const text=await r.text();
if(mode==='dry'){console.log(text.includes('DRYRUN-OK')?'ok   '+(text.match(/DRYRUN-OK[^"]*/)||[''])[0]:'FAIL '+r.status+' '+text.slice(0,300));process.exit(text.includes('DRYRUN-OK')?0:1);}
console.log(r.status<300?'done '+mode:'FAIL '+r.status+' '+text.slice(0,300));
