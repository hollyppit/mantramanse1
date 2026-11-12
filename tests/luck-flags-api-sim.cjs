// /api/luck-flags 검증: 기본 꺼짐·관리자만 변경·한 번에 켜기/끄기·일부만 켜기·잘못된 입력 거부·공개 GET 캐시·화면 반영 코드
const path = require('path'), url = require('url'), fs = require('fs');
const root = path.join(__dirname, '..');
(async () => {
  const mod = await import(url.pathToFileURL(path.join(root, 'functions/api/luck-flags.js')).href);
  const fails = []; const ok = (c, m) => { if (!c) fails.push(m); };
  const kv = { m: new Map(), fail: false, async get(k, t) { if (this.fail) throw new Error('kv down'); const v = this.m.get(k); return v == null ? null : (t === 'json' ? JSON.parse(v) : v); }, async put(k, v) { this.m.set(k, v); } };
  const env = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw-test' };
  const rq = (method, body, auth = 'pw-test', hdr = {}) => new Request('https://x/api/luck-flags', { method, headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json', ...hdr }, body: body ? JSON.stringify(body) : undefined });
  const put = async (b, auth, hdr) => { const r = await mod.onRequestPut({ request: rq('PUT', b, auth, hdr), env }); return { s: r.status, j: await r.json() }; };
  const get = async () => { const r = await mod.onRequestGet({ request: rq('GET', null, ''), env }); return { s: r.status, h: r.headers.get('cache-control'), j: await r.json() }; };
  const all = f => f.interpret && f.timeline && f.region, none = f => !f.interpret && !f.timeline && !f.region;

  let g = await get(); ok(g.s === 200 && none(g.j) && g.j.version === 0, '기본값은 모두 꺼짐');
  ok(/public/.test(g.h) && /max-age=60/.test(g.h), '공개 GET은 60초 캐시');
  ok((await put({ on: true }, 'bad')).s === 401 && kv.m.size === 0, '인증 없이는 변경 불가');
  let r = await put({ on: true }); ok(r.s === 200 && all(r.j) && r.j.version === 1, '한 번에 모두 켜기'); ok(all((await get()).j), '켜진 값이 공개 GET에 반영');
  r = await put({ on: false }); ok(r.s === 200 && none(r.j) && r.j.version === 2, '한 번에 모두 끄기');
  r = await put({ flags: { region: true } }); ok(r.j.region === true && r.j.interpret === false && r.j.timeline === false, '일부만 켜기');
  r = await put({ flags: { timeline: true } }); ok(r.j.region === true && r.j.timeline === true && r.j.interpret === false, '이전 값 유지하며 추가');
  for (const [m, b] of [['알 수 없는 스위치', { flags: { evil: true } }], ['문자열 값', { flags: { region: 'yes' } }], ['형식 없음', {}], ['on이 불리언 아님', { on: 'true' }], ['상속 이름', { flags: { constructor: true } }]]) ok((await put(b)).s === 400, m + ' 거부 안 됨');
  // timelineCopy(타임라인 카드 문안): 기본 꺼짐, [모두 켜기/끄기]에 묶이지 않고 flags 로만 켜고 끈다
  ok((await get()).j.timelineCopy === false, 'timelineCopy 기본 꺼짐');
  r = await put({ on: true }); ok(r.j.timelineCopy === false && all(r.j), '모두 켜기는 timelineCopy 를 켜지 않음');
  r = await put({ flags: { timelineCopy: true } }); ok(r.j.timelineCopy === true && all(r.j), 'timelineCopy 따로 켜기');
  r = await put({ on: false }); ok(r.j.timelineCopy === true && none(r.j), '모두 끄기는 timelineCopy 를 건드리지 않음');
  r = await put({ flags: { timelineCopy: false } }); ok(r.j.timelineCopy === false, 'timelineCopy 따로 끄기');
  ok(/timelineCopy: false/.test(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8')), 'feature-flags.js timelineCopy 기본 꺼짐');
  // topicDeep(무빙툰 주제 심화): 같은 규칙 — 기본 꺼짐, 모두 켜기에 묶이지 않음, flags 로만
  ok((await get()).j.topicDeep === false, 'topicDeep 기본 꺼짐');
  r = await put({ on: true }); ok(r.j.topicDeep === false, '모두 켜기는 topicDeep 를 켜지 않음');
  r = await put({ flags: { topicDeep: true } }); ok(r.j.topicDeep === true && r.j.timelineCopy === false, 'topicDeep 따로 켜기');
  r = await put({ on: false }); ok(r.j.topicDeep === true, '모두 끄기는 topicDeep 를 건드리지 않음');
  r = await put({ flags: { topicDeep: false } }); ok(r.j.topicDeep === false, 'topicDeep 따로 끄기');
  ok(/topicDeep: false/.test(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8')), 'feature-flags.js topicDeep 기본 꺼짐');
  // elementFlow(운세 흐름 오행 흐름 상자): 같은 규칙 — 기본 꺼짐, 모두 켜기에 묶이지 않음, flags 로만
  ok((await get()).j.elementFlow === false, 'elementFlow 기본 꺼짐');
  r = await put({ on: true }); ok(r.j.elementFlow === false, '모두 켜기는 elementFlow 를 켜지 않음');
  r = await put({ flags: { elementFlow: true } }); ok(r.j.elementFlow === true && r.j.topicDeep === false, 'elementFlow 따로 켜기');
  r = await put({ on: false }); ok(r.j.elementFlow === true, '모두 끄기는 elementFlow 를 건드리지 않음');
  r = await put({ flags: { elementFlow: false } }); ok(r.j.elementFlow === false, 'elementFlow 따로 끄기');
  ok(/elementFlow: false/.test(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8')), 'feature-flags.js elementFlow 기본 꺼짐');
  ok(/'elementFlow'(, '[a-zA-Z]+')*\].forEach/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), '사용자 화면이 관리자 스위치 elementFlow 를 읽음');
  // luckCycle(운세 흐름 오행 사이클: 대운 30년·세운 2년 묶음): 같은 규칙 — 기본 꺼짐, 모두 켜기에 묶이지 않음, flags 로만
  ok((await get()).j.luckCycle === false, 'luckCycle 기본 꺼짐');
  r = await put({ on: true }); ok(r.j.luckCycle === false, '모두 켜기는 luckCycle 를 켜지 않음');
  r = await put({ flags: { luckCycle: true } }); ok(r.j.luckCycle === true && r.j.elementFlow === false, 'luckCycle 따로 켜기');
  r = await put({ on: false }); ok(r.j.luckCycle === true, '모두 끄기는 luckCycle 를 건드리지 않음');
  r = await put({ flags: { luckCycle: false } }); ok(r.j.luckCycle === false, 'luckCycle 따로 끄기');
  ok(/luckCycle: false/.test(fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8')), 'feature-flags.js luckCycle 기본 꺼짐');
  ok(/'luckCycle'\].forEach/.test(fs.readFileSync(path.join(root, 'index.html'), 'utf8')), '사용자 화면이 관리자 스위치 luckCycle 를 읽음');
  const before = JSON.stringify((await get()).j); await put({ flags: { evil: true } }); ok(JSON.stringify((await get()).j) === before, '거부된 요청은 저장하지 않음');
  r = await put({ on: true }, 'pw-test', { 'x-reviewer': '%E0%A4%A' }); ok(r.s === 200, '잘못된 x-reviewer 헤더');
  // 저장소 오류·오염된 값은 꺼짐으로 취급
  kv.fail = true; g = await get(); ok(g.s === 200 && none(g.j), 'KV 오류 시 꺼짐'); kv.fail = false;
  kv.m.set('luckenv:flags', JSON.stringify({ interpret: 'true', timeline: 1, region: true, version: 'x' })); g = await get(); ok(g.j.interpret === false && g.j.timeline === false && g.j.region === true && g.j.version === 0, '엄격한 true만 켜짐으로 인정');
  kv.m.set('luckenv:flags', '{깨진 json'); g = await get(); ok(none(g.j), '깨진 값은 꺼짐');
  // 화면 반영 코드: 켜진 것만 반영하고 실패는 무시, 스위치 파일 기본값은 그대로 꺼짐
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  ok(/remoteFlags/.test(html) && /api\/luck-flags/.test(html) && /d\[k\] === true && !F\[k\]/.test(html) && /\.catch\(\(\) => \{ \}\)/.test(html.slice(html.indexOf('remoteFlags'), html.indexOf('remoteFlags') + 800)), '화면의 원격 스위치 반영 코드');
  const flagsSrc = fs.readFileSync(path.join(root, 'feature-flags.js'), 'utf8'); ok(/interpret: false, timeline: false, region: false/.test(flagsSrc), '코드 기본값은 꺼짐 유지');
  const adm = fs.readFileSync(path.join(root, 'report/admin/v2-luckenv.js'), 'utf8'); ok(/leFOn/.test(adm) && /leFOff/.test(adm) && /모두 켜기/.test(adm) && /모두 끄기/.test(adm), '관리자 버튼');
  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log('  ' + f)); process.exit(1); }
  console.log('모든 검증 통과 · 기본 꺼짐 · 관리자만 변경 · 모두 켜기/끄기 · 일부 켜기 · 잘못된 입력 거부 · 저장소 오류 시 꺼짐');
})();
