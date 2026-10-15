const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),assert=require('assert/strict');
const baseline=JSON.parse(fs.readFileSync('tests/editorial-headline-baseline.json')),ctx={console};ctx.window=ctx;ctx.globalThis=ctx;vm.createContext(ctx);
for(const f of ['chapters','saju-data','rules','narrator','content','content-pro','content-pro2','topics','intro-text','story-director','story-composer','content-v3'])vm.runInContext(fs.readFileSync('report/v2/'+f+'.js','utf8'),ctx);
const modules=JSON.parse(JSON.stringify(ctx.ReportV2.Content.modules)),changed=[];
for(const m of modules)if(m.id in baseline.before){assert.notEqual(m.headline,baseline.before[m.id]);assert(m.headline.length<=46);changed.push(m.id);delete m.headline;}
assert.equal(changed.length,10);assert.equal(crypto.createHash('sha256').update(JSON.stringify(modules)).digest('hex'),baseline.preservedDigest,'all other content, conditions, IDs and assets must remain unchanged');console.log('editorial-headline: ten shorter conclusions; remaining 678-module content/conditions/assets preserved PASS');
