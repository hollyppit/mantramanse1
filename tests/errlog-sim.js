// 뷰어 오류 수집 검증:  node tests/errlog-sim.js
// 스크러버(개인정보)·허용 목록·집계 상한·API(꺼짐 기본값·같은 출처·한도·관리자)·클라이언트 안전장치(세션 상한·중복·재귀·미리보기)를 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const url = p => 'file:///' + path.join(root, p).replace(/\\/g, '/');

(async () => {
  const E = await import(url('functions/_errlog.js')), API = await import(url('functions/api/errlog.js'));
  globalThis.window = globalThis;
  vm.runInThisContext(fs.readFileSync(path.join(root, 'report/v2/errlog.js'), 'utf8'), { filename: 'errlog.js' });
  const C = globalThis.ReportV2.ErrLog;

  /* 1. 스크러버 */
  const S = E.scrub;
  ok(S('bad date 1992-06-23 end') === 'bad date # end', '날짜(하이픈)');
  ok(S('잘못된 날짜 입력') === '<ko> <ko> <ko>' &&S('값 홍길동 오류') === '<ko> <ko> <ko>', '한글 연속은 <ko>(이름 등 사용자 값 보호)');
  ok(S('at 14:30 and 1:05:09') === 'at # and #', '시각');
  ok(S('1992.6.23 / 1992년 6월 23일') === '# / #', '날짜(점·한글): ' + S('1992.6.23 / 1992년 6월 23일'));
  ok(S('code 19920623 and 0123') === 'code # and #', '4자리 이상 숫자 열');
  ok(S('mail hong.gildong+x@example.co.kr end') === 'mail <email> end', '이메일');
  ok(S('fetch https://example.com/a?name=abc&b=1 failed') === 'fetch <url> failed', 'URL(쿼리 포함)');
  ok(S('value "abcdefghijklmnopqrstuvwxyz" error') === 'value "abcdefghijkl…" error', '따옴표 안 긴 값은 12자까지: ' + S('value "abcdefghijklmnopqrstuvwxyz" error'));
  ok(S('a\u0000b\nc') === 'a b c', '제어 문자');
  ok(S('x'.repeat(500)).length === 160, '160자 절단');
  ok(S(null) === '' && S(undefined) === '', '빈 값');
  // 클라이언트 구현과 같은 결과
  const fx = ['잘못된 날짜 1992-06-23', '1992.6.23 / 1992년 6월 23일', 'code 19920623', 'a@b.co', 'https://x.y/z?q=1', '"가나다라마바사아자차카타파하하하하"', "Cannot read 'name' of undefined", 'x'.repeat(300), 'TypeError: 이름 홍길동 1990-05-15 14:30 서울', ''];
  ok(fx.every(s => C.scrub(s) === S(s)), '클라이언트·서버 스크러버 결과 일치: ' + fx.filter(s => C.scrub(s) !== S(s)).join(' | '));
  // 개인정보 합성 오류: 이름·생년월일·이메일이 정리 후 남지 않는다
  const dirty = 'TypeError: 홍길동(1990-05-15 14:30) hong@x.com https://a.b/c?u=홍길동 입력값 "1990년5월15일생홍길동남자서울"';
  const clean = S(dirty);
  ok(!/1990|hong@|https?:|a\.b|홍길동|남자|서울|14:30/.test(clean), '합성 개인정보가 남지 않음: ' + clean);

  /* 2. cleanReport(허용 목록) */
  const good = { kind: 'error', where: 'window.error', msg: 'boom 1992-06-23', src: 'https://x/report/v2/viewer.js?v=1#h', line: 120.7, ch: 'c06', world: 'w2', flow: 'explore', v: 'c1abc+2026.10.1', env: { mobile: 1, br: 'safari', saveData: 0 }, name: '홍길동', birth: '1992-06-23', extra: { a: 1 } };
  const g = E.cleanReport(good);
  ok(g && g.kind === 'error' && g.where === 'window.error' && g.msg === 'boom #' && g.src === 'viewer.js' && g.line === 121 && g.ch === 'c06' && g.world === 'w2' && g.flow === 'explore' && g.v === 'c1abc+2026.10.1', '정상 보고 정리: ' + JSON.stringify(g));
  ok(g.env.mobile === true && g.env.br === 'safari' && g.env.saveData === false, '환경은 분류만');
  ok(!('name' in g) && !('birth' in g) && !('extra' in g) && JSON.stringify(g).indexOf('홍길동') < 0, '알 수 없는 필드(이름·생년월일)는 버림');
  ok(E.cleanReport(null) === null && E.cleanReport([]) === null && E.cleanReport({ kind: 'x', where: 'a' }) === null && E.cleanReport({ kind: 'error' }) === null && E.cleanReport({ kind: 'error', where: 'bad where!' }) === null, '잘못된 보고는 null');
  const c1 = E.cleanReport({ kind: 'caught', where: 'deep.augment', msg: '홍길동 1990-05-15' }), a1 = E.cleanReport({ kind: 'asset', where: 'asset.video', msg: 'x' });
  ok(c1.msg === '' && a1.msg === '', 'caught·asset 는 메시지를 받지 않음');
  const odd = E.cleanReport({ kind: 'error', where: 'w', ch: '한글 챕터!', world: '../x', flow: 'zzz', v: 'bad version', src: 'a/b/<script>.js', env: { br: 'ie6' }, line: -5 });
  ok(odd.ch === '' && odd.world === '' && odd.flow === '' && odd.v === '' && odd.src === '' && odd.env.br === 'other' && odd.line === 0, '형식이 틀린 값은 빈 값으로');
  ok(E.cleanReport({ kind: 'error', where: 'w', line: 1e9 }).line === 99999, '줄 번호 상한');
  ok(E.cleanReport({ kind: 'error', where: 'w', flow: 'hub', ch: 'today' }).flow === 'hub', '허브 흐름(flow: hub)');

  /* 3. 서명 · 집계 */
  const r1 = E.cleanReport({ kind: 'error', where: 'a', msg: 'x', src: 'v.js', line: 3 }), r2 = E.cleanReport({ kind: 'error', where: 'a', msg: 'x', src: 'v.js', line: 4 });
  ok(E.signature(r1) === E.signature(Object.assign({}, r1)) && E.signature(r1) !== E.signature(r2) && /^[0-9a-f]{8}$/.test(E.signature(r1)), '서명 안정·구분');
  const base = E.emptyDay(); let d = E.merge(base, Object.assign({}, r1, { ch: 'c01', v: 'v1' }), 1000);
  d = E.merge(d, Object.assign({}, r1, { ch: 'c01', env: { mobile: false, br: 'chrome', saveData: false } }), 2000);
  d = E.merge(d, Object.assign({}, r1, { ch: 'c02', v: 'v2' }), 3000);
  const s = d.sigs[E.signature(r1)];
  ok(d.total === 3 && s.n === 3 && s.first === 1000 && s.last === 3000 && s.ch.c01 === 2 && s.ch.c02 === 1 && s.v.v1 === 1 && s.v.v2 === 1, '집계 합산');
  ok(s.env.mobile + s.env.desktop === 3, '모바일/데스크톱 합이 건수와 같음');
  ok(base.total === 0 && Object.keys(base.sigs).length === 0, 'merge 는 입력을 바꾸지 않음');
  let big = E.emptyDay();
  for (let i = 0; i < E.MAX_SIGS + 15; i++) big = E.merge(big, E.cleanReport({ kind: 'error', where: 'w', msg: 'm' + i, src: 'v.js', line: i }), 1);
  ok(Object.keys(big.sigs).length === E.MAX_SIGS && big.dropped === 15 && big.total === E.MAX_SIGS + 15, '서명 상한 초과분은 dropped: ' + Object.keys(big.sigs).length + '/' + big.dropped);
  const big2 = E.merge(big, E.cleanReport({ kind: 'error', where: 'w', msg: 'm3', src: 'v.js', line: 3 }), 2); // 이미 있는 서명은 상한이 차도 집계
  ok(big2.sigs[Object.keys(big.sigs)[0]] && big2.dropped === 15, '기존 서명은 상한이 차도 계속 집계');
  let manyCh = E.emptyDay(); for (let i = 0; i < E.MAX_CH + 10; i++) manyCh = E.merge(manyCh, Object.assign({}, r1, { ch: 'c' + i }), 1);
  ok(Object.keys(manyCh.sigs[E.signature(r1)].ch).length === E.MAX_CH, '챕터 분포 키 상한');
  const sm = E.summarize([d, null, big], 5);
  ok(sm.total === d.total + big.total && sm.dropped === 15 && sm.sigs.length === 5 && sm.sigs[0].n >= sm.sigs[1].n && sm.kinds.error >= 3, '요약');

  /* 4. API */
  const st = new Map(), kv = { get: async (k, t) => { const v = st.get(k); return v == null ? null : t === 'json' ? JSON.parse(v) : v; }, put: async (k, v) => { st.set(k, v); } };
  const mk = (env, body, headers, method = 'POST') => ({ env, request: new Request('https://site.test/api/errlog', { method, headers: { 'content-type': 'application/json', ...(headers || {}) }, body: method === 'POST' ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined }) });
  const same = { origin: 'https://site.test', 'cf-connecting-ip': '1.2.3.4' };
  const rep = { kind: 'error', where: 'window.error', msg: 'boom', src: 'viewer.js', line: 9, ch: 'c01', env: { mobile: true, br: 'chrome' } };
  const envOff = { GLOSSARY_KV: kv, ADMIN_PASSWORD: 'pw' }, envOn = { ...envOff, ERRLOG_ON: '1', ERRLOG_HOURLY_LIMIT: '3' };
  let res = await API.onRequestPost(mk(envOff, rep, same));
  ok(res.status === 204 && res.headers.get('x-errlog') === 'off' && st.size === 0, '기본은 꺼짐: 204 + x-errlog: off, 저장 없음');
  res = await API.onRequestPost(mk(envOn, rep, {}));
  ok(res.status === 204 && st.size === 0, 'Origin 없음 → 저장하지 않음');
  res = await API.onRequestPost(mk(envOn, rep, { origin: 'https://evil.test' }));
  ok(res.status === 204 && st.size === 0, '다른 출처 → 저장하지 않음');
  res = await API.onRequestPost(mk(envOn, rep, { referer: 'https://site.test/report/v2/?x=1', 'cf-connecting-ip': '9.9.9.9' }));
  ok(res.status === 204 && [...st.keys()].some(k => /^err:day:\d{4}-\d{2}-\d{2}$/.test(k)), '같은 출처(Referer)면 저장');
  st.clear();
  res = await API.onRequestPost(mk(envOn, rep, same));
  ok(res.status === 204, '정상 보고 204');
  const dayKeyName = [...st.keys()].find(k => k.startsWith('err:day:')), saved = JSON.parse(st.get(dayKeyName));
  ok(saved.total === 1 && Object.values(saved.sigs)[0].src === 'viewer.js' && !/1\.2\.3\.4/.test(st.get(dayKeyName)), '집계 저장, IP 는 집계에 없음');
  ok([...st.keys()].some(k => k.startsWith('rl:errlog:') && /1\.2\.3\.4/.test(k)), '한도 카운터는 따로 둔다(rl:)');
  res = await API.onRequestPost(mk(envOn, 'x'.repeat(E.MAX_BODY + 1), same));
  ok(res.status === 413, '본문 상한 413');
  res = await API.onRequestPost(mk(envOn, '{bad json', same));
  ok(res.status === 400, '잘못된 JSON 400');
  const before = st.get(dayKeyName);
  res = await API.onRequestPost(mk(envOn, { kind: 'zzz', where: 'a' }, same));
  ok(res.status === 204 && st.get(dayKeyName) === before, '잘못된 보고는 조용히 버림');
  res = await API.onRequestPost(mk(envOn, rep, same)); // 2번째(한도 3)
  res = await API.onRequestPost(mk(envOn, rep, same)); // 3번째
  const r429 = await API.onRequestPost(mk(envOn, rep, same));
  ok(r429.status === 429, 'IP 시간당 한도 초과 429');
  const afterTotal = JSON.parse(st.get(dayKeyName)).total;
  ok(afterTotal === 3, '한도 초과분은 집계되지 않음: ' + afterTotal);
  res = await API.onRequestGet(mk(envOn, undefined, {}, 'GET'));
  ok(res.status === 401, '관리자 인증 없으면 401');
  res = await API.onRequestGet({ env: envOn, request: new Request('https://site.test/api/errlog?days=3', { headers: { authorization: 'Bearer pw' } }) });
  const out = await res.json();
  ok(res.status === 200 && out.on === true && out.days.length === 3 && out.summary.total === 3 && out.summary.sigs[0].src === 'viewer.js' && out.summary.sigs[0].ch.c01 === 3, '관리자 조회: 요약');

  /* 5. 클라이언트 안전장치 */
  const got = []; C._setSender(r => got.push(r)); C._reset();
  C.setContext(() => ({ ch: 'c06', world: 'w2', flow: 'explore', v: 'ver1' }));
  ok(C.report('error', { where: 'window.error', msg: 'TypeError at 1992-06-23', src: 'https://x/v2/viewer.js?v=3', line: 10 }) === true && got.length === 1, '보고 전송');
  const m = got[0];
  ok(m.msg === 'TypeError at #' && m.src === 'viewer.js' && m.ch === 'c06' && m.world === 'w2' && m.flow === 'explore' && m.v === 'ver1' && typeof m.env.mobile === 'boolean', '보고 내용: 스크럽·컨텍스트·환경');
  ok(!/name|birth|year|gender/i.test(Object.keys(m).join()), '입력 관련 필드 없음');
  ok(C.report('error', { where: 'window.error', msg: 'TypeError at 1992-06-23', src: 'viewer.js', line: 10 }) === false && got.length === 1, '같은 서명은 1회');
  C.report('caught', { where: 'deep.augment', msg: '홍길동 1990-05-15' });
  ok(got[1].msg === '', 'caught 는 메시지를 보내지 않음');
  for (let i = 0; i < 10; i++) C.report('error', { where: 'w', msg: 'm' + i, line: i });
  ok(got.length === 5, '세션당 5건 상한: ' + got.length);
  C._reset(); got.length = 0;
  C._setSender(r => { got.push(r); C.report('error', { where: 'inner', msg: 'recursion' }); }); // 보고 중 보고는 무시
  C.report('error', { where: 'outer', msg: 'o' });
  ok(got.length === 1 && got[0].where === 'outer', '재귀 방지');
  C._reset(); got.length = 0; C._setSender(r => got.push(r));
  globalThis.location = { search: '?preview=1' };
  ok(C.report('error', { where: 'p', msg: 'x' }) === false && got.length === 0, '미리보기에서는 보내지 않음');
  globalThis.location = { search: '?errlog=0' };
  ok(C.report('error', { where: 'p', msg: 'x2' }) === false && got.length === 0, '?errlog=0 이면 보내지 않음');
  globalThis.location = { search: '?debug=1' };
  ok(C.report('error', { where: 'dbg', msg: 'x3' }) === true && got.length === 0, '?debug=1 은 콘솔에만(전송 안 함)');
  delete globalThis.location;
  C._setSender(function () { throw new Error('send failed'); }); C._reset();
  let threw = false; try { C.report('error', { where: 'safe', msg: 'x' }); } catch (e) { threw = true; }
  ok(!threw, '전송이 실패해도 예외를 밖으로 내지 않음');

  if (fails.length) { console.log('실패 ' + fails.length + '건'); fails.forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
  console.log('모두 통과');
})();
