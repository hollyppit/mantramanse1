// 용어 "같은 기운이 겹칠 때(병존·간여지동)" 보강(glossary-overlap.js) 검증
//   node tests/glossary-overlap-sim.cjs
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const a = html.indexOf('var GLOSSARY = {'), b = html.indexOf('var GLOSSARY_DEFAULT', a);
const ctx = { window: {}, console }; vm.createContext(ctx);
vm.runInContext(html.slice(a, b) + ';this.GL=GLOSSARY;', ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'glossary-overlap.js'), 'utf8'), ctx);
const GL = ctx.GL, O = ctx.window.GLOSSARY_OVERLAP, HEAD = ctx.window.GLOSSARY_OVERLAP_HEAD;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };

// 1순위 용어는 모두 있어야 하고, 간여지동 용어 자신을 뺀 나머지는 병존·간여지동 두 줄을 다 가진다
const MUST = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인', '천간합', '충', '자형', '건록', '제왕', '통근', '신강'];
for (const k of MUST) ok(O[k] && O[k].dup && O[k].gyd, `${k}: 병존·간여지동 항목 누락`);
ok(O['간여지동'] && O['간여지동'].dup, '간여지동: 병존 항목 누락');
ok(GL['병존'] && GL['병존'][0] === '관계', '병존 용어가 사전에 없음');

const FORBID = /반드시|틀림없|죽습니다|사망|암에|질병에 걸|진단|확정|100%|무조건/;
for (const [k, o] of Object.entries(O)) {
  ok(GL[k], `${k}: 용어 사전에 없는 용어`);
  for (const f of ['intro', 'dup', 'gyd']) if (o[f]) {
    ok(o[f].length >= 40 && o[f].length <= 330, `${k}.${f}: 길이 ${o[f].length}`);
    ok(!/\n/.test(o[f]), `${k}.${f}: 줄바꿈 포함`);
    ok(!FORBID.test(o[f]), `${k}.${f}: 단정·의학 표현`);
  }
  ok(o.dup !== o.gyd, `${k}: 두 줄이 같음`);
}

// 자리별 4줄: 모든 용어에 년·월·일·시가 있고, 십성 10개는 용어마다 문장이 다르다
const TEN = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];
for (const [k, o] of Object.entries(O)) {
  ok(Array.isArray(o.pos) && o.pos.length === 4 && o.pos.map(r => r[0]).join('') === '년월일시', `${k}: 자리별 년·월·일·시 4줄이 아님`);
  for (const [l, t] of (o.pos || [])) { ok(t.length >= 25 && t.length <= 300, `${k}.pos.${l}: 길이 ${t.length}`); ok(!/\n/.test(t) && !FORBID.test(t), `${k}.pos.${l}: 줄바꿈·단정 표현`); }
}
for (const k of TEN) ok(O[k].pos !== O['충'].pos, `${k}: 공통 문장을 씀(용어별 문장 필요)`);
ok(new Set(TEN.flatMap(k => O[k].pos.map(r => r[1]))).size === 40, '십성 자리별 문장 40개가 서로 다르지 않음');
ok(ctx.window.GLOSSARY_OVERLAP_POS_INTRO && /월지가 가장 힘이 큽니다/.test(ctx.window.GLOSSARY_OVERLAP_POS_INTRO), '자리별 안내문이 없음');
// 기둥 설명은 자리별 줄에만 둔다(병존·간여지동 줄에 "월주면/시주면" 같은 중복 설명 금지)
for (const k of TEN) for (const f of ['dup', 'gyd']) ok(!/(년주|월주|시주)면/.test(O[k][f]), `${k}.${f}: 기둥 설명이 자리별과 중복`);

// 일주 간여지동 목록이 계산과 맞는지: 일지 본기가 일간과 같은 오행인 12개, 그중 건록·제왕·비견·겁재 구분
const ST = '갑을병정무기경신임계', BR = '자축인묘진사오미신유술해';
const SE = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4], BE = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4];
const BMAIN = [9, 5, 0, 1, 4, 2, 3, 5, 6, 7, 4, 8];   // 지지 본기 천간
const pillars = []; for (let i = 0; i < 60; i++) pillars.push([i % 10, i % 12]);
const gyd = pillars.filter(([s, b]) => SE[s] === BE[b]);
ok(gyd.length === 12, `간여지동 일주가 12개가 아님(${gyd.length})`);
const nm = ([s, b]) => ST[s] + BR[b];
const bigyeon = gyd.filter(([s, b]) => BMAIN[b] === s).map(nm), geopjae = gyd.filter(([s, b]) => BMAIN[b] !== s).map(nm);
for (const p of bigyeon) ok(O['비견'].gyd.includes(p), `비견.gyd에 ${p} 누락`);
for (const p of geopjae) ok(O['겁재'].gyd.includes(p), `겁재.gyd에 ${p} 누락`);
const LL = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3], mod = (x, n) => ((x % n) + n) % n;
const un = (s, b) => s % 2 === 0 ? mod(b - LL[s], 12) : mod(LL[s] - b, 12);
const rok = gyd.filter(([s, b]) => un(s, b) === 3).map(nm), wang = gyd.filter(([s, b]) => un(s, b) === 4).map(nm);
ok(rok.length === 4 && rok.every(p => O['건록'].gyd.includes(p)), `건록 일주 불일치: ${rok}`);
ok(wang.length === 4 && wang.every(p => O['제왕'].gyd.includes(p)), `제왕 일주 불일치: ${wang}`);
for (const p of gyd.map(nm)) ok(O['통근'].gyd.includes(p), `통근.gyd에 ${p} 누락`);

// 화면 연결: index.html의 함수를 그대로 실행해 붙는 모양과 중복 방지를 확인
const s = html.indexOf('const glOverlapText'), e = html.indexOf('const glFull = ', s);
ok(s > 0 && e > s, 'index.html에서 glOverlapText를 찾지 못함');
const run = vm.runInContext('(function(window){' + html.slice(s, e) + ';return glOverlapText;})', ctx)(ctx.window);
const out = run('비견', GL['비견'][1]);
ok(out.startsWith('\n\n' + HEAD) && /-\. \(병존일 때\) /.test(out) && /-\. \(간여지동일 때\) /.test(out), '비견: 보강 모양이 다름');
ok(/-\. \(년주\) /.test(out) && /-\. \(시주\) /.test(out) && out.indexOf('(간여지동일 때)') < out.indexOf('(년주)'), '비견: 자리별 줄이 화면 문구에 붙지 않음');
ok(run('비견', '관리자 문구\n\n' + HEAD + '\n-. x') === '', '이미 같은 제목이 있는데도 다시 붙음');
ok(run('비견', '관리자가 고친 문구') === out, '관리자가 고친 문구 뒤에도 똑같이 붙어야 함');
ok(run('없는용어', 'x') === '', '보강이 없는 용어에 붙음');
ok(/const s = glSectionsText\(k, t\) \+ glOverlapText\(k, t\);/.test(html), '상세 화면(glFull)에 연결되지 않음');
ok(/glOverlapText\(k, t\) \+ glCasesText\(k, t\)\)\.includes\(q\)/.test(html), '용어 검색에 연결되지 않음');
ok(html.indexOf('<script src="glossary-overlap.js"></script>') > 0, 'index.html이 glossary-overlap.js를 읽지 않음');

if (fails.length) { console.error('FAIL ' + fails.length + '\n' + fails.join('\n')); process.exit(1); }
console.log('OK glossary-overlap: ' + Object.keys(O).length + '개 용어, 일주 간여지동 비견 ' + bigyeon.join('·') + ' / 겁재 ' + geopjae.join('·'));
