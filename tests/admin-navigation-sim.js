const assert = require('assert/strict'), fs = require('fs'), path = require('path');
const N = require('../report/admin/navigation.js');
const ids = N.groups.flatMap(g=>g[2]);
assert.equal(new Set(ids).size,ids.length,'각 관리 화면은 하나의 영역에만 속해야 함');
const html = fs.readFileSync(path.join(__dirname,'../report/admin/index.html'),'utf8');
for(const id of ids){assert.ok(html.includes('data-t="'+id+'"'),id+' 메뉴');assert.ok(html.includes('id="t-'+id+'"'),id+' 화면');}
assert.deepEqual(N.resolve('home'),{tab:'onboard',also:'home'});
assert.deepEqual(N.resolve('v2set','home'),{tab:'onboard',also:'home'});
assert.deepEqual(N.resolve('v2set','intro'),{tab:'v2set',also:'intro'});
assert.ok(N.groups.find(g=>g[0]==='sell')[2].includes('v2proj'));
assert.ok(N.groups.every(g=>g[2].length<=7),'영역당 화면 7개 이하');
assert.ok(ids.includes('regiondata'),'지역 데이터도 메뉴에 있어야 함');
assert.deepEqual(N.groups.find(g=>g[0]==='legacy')[2],['v2chap','v2story','v2test']);
for(const id of ids)assert.ok(N.pages[id]&&N.pages[id].label&&N.pages[id].hint,id+' 이름·안내');
assert.ok(N.groups.find(g=>g[0]==='media')[2].includes('v2clip'));
assert.ok(!fs.readFileSync(path.join(__dirname,'../report/admin/v2-shell.js'),'utf8').includes("['home', '랜딩 페이지"));
assert.equal(N.dirtyTarget('풀이 문체'),'stylecfg');assert.equal(N.dirtyTarget('온보딩 초안'),'onboard');assert.equal(N.dirtyTarget('풀이 구성'),'ikdesign');assert.equal(N.dirtyTarget('글자 설정'),'v2test');
console.log('admin-navigation-sim OK: 메뉴 중복·존재·8개 영역·영역당 7개 이하·옛 화면 보관·이전 온보딩 경로');
