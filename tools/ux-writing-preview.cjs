// Loopback preview with ephemeral configuration. No production service or paid AI calls.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http');
(async()=>{
  const root=fs.realpathSync('.'),S=await import('../functions/api/style.js'),mem=new Map();
  const kv={get:async(k,t)=>mem.has(k)?t==='json'?JSON.parse(mem.get(k)):mem.get(k):null,put:async(k,v)=>mem.set(k,v)};
  const css=fs.readFileSync('report/admin/index.html','utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
  const server=http.createServer(async(q,r)=>{
    try{
      const url=new URL(q.url,'http://localhost');
      if(q.method==='GET' && url.pathname==='/comparison'){
        r.writeHead(200,{'content-type':'text/html;charset=utf-8','cache-control':'no-store'});
        r.end(fs.readFileSync(path.join(root,'output/ux-writing/actual-comparison.html'),'utf8'));return;
      }
      if(url.pathname==='/api/style'){
        let body='';for await(const part of q)body+=part;
        const response=await S.onRequest({env:{ADMIN_PASSWORD:'local-preview',GLOSSARY_KV:kv},request:new Request(url,{method:q.method,headers:{authorization:'Bearer local-preview','content-type':'application/json'},...(q.method==='POST'?{body}:{})})});
        r.writeHead(response.status,{'content-type':'application/json'});r.end(await response.text());return;
      }
      if(url.pathname==='/preview'){
        r.writeHead(200,{'content-type':'text/html;charset=utf-8'});
        r.end('<!doctype html><html lang="ko"><meta name="viewport" content="width=device-width,initial-scale=1"><title>풀이 문체 로컬 검증</title><style>'+css+'</style><div class="wrap"><h1>풀이 문체 로컬 검증</h1><p>설정은 이 프로세스 메모리에만 저장합니다. 운영 연결·유료 AI 호출이 없습니다.</p><div id="t-stylecfg"></div><p role="status" id="notice"></p></div><script>window.ReportV2={};window.V2Content={esc:function(s){return String(s==null?"":s).replace(/[&<>"\u0027]/g,function(c){return "&#"+c.charCodeAt(0)+";"})},toast:function(s){document.getElementById("notice").textContent=s},setPw:function(){},withBusy:function(el,fn){return fn()},api:async function(p,o){var r=await fetch(p,o),d=await r.json();if(!r.ok)throw Error(d.error);return d}};</script><script src="/report/admin/v2-style.js"></script><script>V2Style.open("stylecfg","local-preview");</script></html>');return;
      }
      if(q.method!=='GET' || !url.pathname.startsWith('/report/')){r.writeHead(404);r.end();return;}
      let target=path.join(root,decodeURIComponent(url.pathname));if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');target=fs.realpathSync(target);
      const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(target)];
      if(!target.startsWith(root+path.sep+'report'+path.sep)||!mime){r.writeHead(403);r.end();return;}
      r.writeHead(200,{'content-type':mime,'cache-control':'no-store'});fs.createReadStream(target).pipe(r);
    }catch{r.writeHead(500);r.end('Local preview failed');}
  });
  server.listen(0,'127.0.0.1',()=>console.log('http://127.0.0.1:'+server.address().port+'/preview'));
})();
