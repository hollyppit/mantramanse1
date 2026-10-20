// Dump seedPassages for every non-creative chapter: node tools/dump-seed-passages.cjs <root> <out.json>
const fs=require('fs'),vm=require('vm'),path=require('path'),{pathToFileURL}=require('url');
const root=path.resolve(process.argv[2]||'.'),out=process.argv[3];global.window=globalThis;
vm.runInThisContext(fs.readFileSync(path.join(root,'report/v2/reading-catalog.js'),'utf8'));
(async()=>{const S=await import(pathToFileURL(path.join(root,'functions/_reading-library-seed.js')).href);const res={seedVersion:S.SEED_VERSION,chapters:{}};
for(const c of MantraEditorial.defaults().chapters.filter(c=>c.topicId!=='creative'))res.chapters[c.id]=S.seedPassages(c);
fs.writeFileSync(out,JSON.stringify(res));console.log(S.SEED_VERSION,Object.keys(res.chapters).length);})();
