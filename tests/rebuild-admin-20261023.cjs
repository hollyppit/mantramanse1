// Local rebuild admin: end-to-end API test against a real server on 127.0.0.1 with a temporary data dir.
const path = require('node:path'), fs = require('node:fs'), os = require('node:os'), http = require('node:http');
const { pathToFileURL } = require('node:url');
const root = path.resolve(__dirname, '..');
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('FAIL', m); } };

(async () => {
  const dir = path.join(root, 'editorial', 'rebuild-20261022', 'admin');
  const { createAdmin, loadBaseEntries } = await import(pathToFileURL(path.join(dir, 'server.mjs')).href);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-admin-'));
  const admin = createAdmin({ root, dataDir: path.join(tmp, 'data'), outputDir: path.join(tmp, 'out'), baseEntries: loadBaseEntries() });
  const port = await admin.listen(0);
  const call = (method, p, body, token = admin.token) => new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const r = http.request({ host: '127.0.0.1', port, path: p, method, headers: { 'x-admin-token': token, ...(data ? { 'content-type': 'application/json', 'content-length': Buffer.byteLength(data) } : {}) } }, res => {
      let s = ''; res.on('data', c => s += c); res.on('end', () => { let j = null; try { j = JSON.parse(s); } catch { } resolve({ status: res.statusCode, json: j, text: s, headers: res.headers }); });
    }); r.on('error', reject); if (data) r.write(data); r.end();
  });
  try {
    ok(admin.server.address().address === '127.0.0.1', 'binds 127.0.0.1');
    ok((await call('GET', '/api/meta', null, 'wrong')).status === 401, 'token required');
    ok((await call('GET', '/api/meta', null, '')).status === 401, 'empty token rejected');
    const idx = await call('GET', '/');
    ok(idx.status === 200 && /content-security-policy/i.test(JSON.stringify(idx.headers)), 'static index with CSP');
    const meta = (await call('GET', '/api/meta')).json;
    ok(meta.chapters === 84 && meta.entries === 925, `meta counts ${meta.chapters}/${meta.entries}`);
    ok(meta.counts.draft === 925, 'all start as draft');

    const chs = (await call('GET', '/api/chapters')).json;
    ok(chs.length === 84, '84 chapters listed');
    const list = (await call('GET', '/api/entries?chapter=timeline_self_01&limit=300')).json;
    ok(list.total > 0 && list.items.every(e => e.chapter === 'timeline_self_01'), 'chapter filter');
    const s = (await call('GET', '/api/entries?q=' + encodeURIComponent('월급') + '&limit=5')).json;
    ok(typeof s.total === 'number', 'text search');
    const cond = (await call('GET', '/api/entries?cond=gender&value=%EC%97%AC&limit=300')).json;
    ok(cond.total > 0 && cond.items.every(e => JSON.stringify(e.when.gender).includes('여')), 'condition search gender=여');
    const fields = (await call('GET', '/api/cond-fields')).json;
    ok(fields.gender && fields.strength, 'cond fields');

    // detail + save/restore
    const id = list.items[0].id;
    const d = (await call('GET', '/api/entry/' + id)).json;
    ok(d.entry.version === 1 && d.checks && d.old && Array.isArray(d.versions), 'entry detail shape');
    const before = d.entry.core;
    const saveBad = await call('POST', `/api/entry/${id}/save`, { fields: { when: { bogusField: 1 } }, by: 't', note: 'x' });
    ok(saveBad.status === 400, 'invalid condition rejected: ' + saveBad.status);
    const saveOk = await call('POST', `/api/entry/${id}/save`, { fields: { core: before + ' 추가 검수 메모를 한 줄 덧붙입니다.' }, by: 'tester', note: '테스트 수정' });
    ok(saveOk.status === 200, 'save ok ' + saveOk.text.slice(0, 200));
    const d2 = (await call('GET', '/api/entry/' + id)).json;
    ok(d2.entry.version === 2 && d2.versions.length === 2, 'version incremented');
    const rest = await call('POST', `/api/entry/${id}/restore`, { version: 1, by: 'tester', note: '복원 테스트' });
    ok(rest.status === 200, 'restore');
    const d3 = (await call('GET', '/api/entry/' + id)).json;
    ok(d3.entry.version === 3 && d3.entry.core === before, 'restored content, new version');

    // approval gates
    const noNote = await call('POST', `/api/entry/${id}/status`, { to: 'approved', by: 't', note: '' });
    ok(noNote.status >= 400, 'approval without note blocked');
    const toReview = await call('POST', `/api/entry/${id}/status`, { to: 'review', by: 't', note: '검수 요청' });
    ok(toReview.status === 200, 'to review ' + toReview.text.slice(0, 150));
    const appr = await call('POST', `/api/entry/${id}/status`, { to: 'approved', by: 'lead', note: '문안 확인 완료' });
    ok(appr.status === 200, 'approve ' + appr.text.slice(0, 150));
    // a time-judgment chapter needs the flag
    const timeCh = chs.find(c => c.needsTimeJudgment);
    ok(!!timeCh, 'a time chapter exists');
    if (timeCh) {
      const tl = (await call('GET', `/api/entries?chapter=${timeCh.id}&limit=5`)).json.items[0];
      await call('POST', `/api/entry/${tl.id}/status`, { to: 'review', by: 't', note: '검수 요청' });
      const noFlag = await call('POST', `/api/entry/${tl.id}/status`, { to: 'approved', by: 'lead', note: '시기 문안 확인' });
      ok(noFlag.status >= 400, 'time chapter approval needs flag');
      const withFlag = await call('POST', `/api/entry/${tl.id}/status`, { to: 'approved', by: 'lead', note: '시기 문안 확인', timeJudgmentApproved: true });
      ok(withFlag.status === 200, 'time chapter approval with flag ' + withFlag.text.slice(0, 120));
    }
    // editing an approved entry resets it
    await call('POST', `/api/entry/${id}/save`, { fields: { advice: d3.entry.advice + ' 오늘 바로 한 가지만 적어 보세요.' }, by: 't', note: '수정' });
    ok((await call('GET', '/api/entry/' + id)).json.status === 'draft', 'edit resets approved to draft');

    // bulk
    const pv = await call('POST', '/api/bulk/replace', { find: '월급', replace: '급여', fields: ['example'], chapters: ['timeline_wealth_01'], preview: true, by: 't', note: '일괄 교체 시험' });
    ok(pv.status === 200 && typeof pv.json.count === 'number', 'bulk preview');
    const c1 = (await call('GET', '/api/entry/' + id)).json.entry.version;
    ok(c1 >= 4, 'preview does not change versions');

    // checks / duplicates / conflicts
    const ck = (await call('GET', '/api/checks?only=fail&limit=50')).json;
    ok(ck.total === 925 && ck.averageScores && ck.codes, 'checks shape');
    const du = (await call('GET', '/api/duplicates?threshold=0.8')).json;
    ok(Array.isArray(du.pairs) && typeof du.count === 'number', 'duplicates shape');
    const cf = (await call('GET', '/api/conflicts')).json;
    ok(Array.isArray(cf.declaredIssues), 'conflicts shape');

    // simulate
    const body = { birth: { year: 1990, month: 5, day: 17, hour: 10, minute: 0, gender: 'M', calendar: 'solar' }, asOf: '2026-10-22', mode: 'preview', label: '시험', by: 't' };
    const sim = await call('POST', '/api/simulate', body);
    ok(sim.status === 200 && sim.json.report.chapters.length === 84, 'simulate 84 chapters ' + sim.text.slice(0, 120));
    ok(sim.json.report.providerCalls === 0, 'no AI calls');
    const matched = sim.json.report.chapters.filter(c => c.picks.length).length;
    ok(matched > 60, 'matched chapters ' + matched);
    ok(!sim.text.includes('"year":1990'), 'raw birth not echoed in trace by default') ;
    const sim2 = await call('POST', '/api/simulate', body);
    ok(JSON.stringify(sim2.json.report.chapters.map(c => c.text)) === JSON.stringify(sim.json.report.chapters.map(c => c.text)), 'deterministic');
    const trs = (await call('GET', '/api/traces')).json;
    ok(trs.length >= 2, 'traces saved');
    const tr = (await call('GET', '/api/trace/' + trs[0].id)).json;
    ok(tr.chapters.length === 84 && !tr.birth, 'trace detail without raw birth');
    const rawTrace = fs.readFileSync(path.join(tmp, 'data', 'traces.jsonl'), 'utf8');
    ok(!/"year":1990/.test(rawTrace), 'trace file has no birth data');
    const badBirth = await call('POST', '/api/simulate', { ...body, birth: { ...body.birth, month: 13 } });
    ok(badBirth.status === 400, 'bad birth rejected');
    // approved-only
    const ap = (await call('POST', '/api/simulate', { ...body, mode: 'approved' })).json;
    ok(ap.report.entryCount === 1, 'approved mode counts only approved entries: ' + ap.report.entryCount);
    const apPicked = ap.report.chapters.filter(c => c.picks.length);
    ok(apPicked.every(c => c.picks.every(p => p.status === 'approved')), 'approved mode shows only approved');
    const ex = await call('POST', '/api/explain', { birth: body.birth, asOf: body.asOf, id });
    ok(ex.status === 200 && ex.json.reason, 'explain');

    // release
    const rel = await call('POST', '/api/release', { by: 'lead', note: '로컬 릴리스 시험' });
    ok(rel.status === 200 && rel.json.count >= 1, 'release created ' + rel.text.slice(0, 150));
    if (rel.status === 200) {
      const f = JSON.parse(fs.readFileSync(rel.json.file, 'utf8'));
      ok(f.localOnly === true && f.publishedToProduction === false, 'release flagged local only');
      await call('POST', `/api/entry/${id}/save`, { fields: { core: 'x'.repeat(5) + before }, by: 't', note: '릴리스 후 변경' });
      const rr = await call('POST', `/api/release/${rel.json.id}/restore`, { by: 'lead' });
      ok(rr.status === 200, 'release restore ' + rr.text.slice(0, 150));
    }
    const pub = await call('POST', '/api/publish', {});
    ok(pub.status === 403 && pub.json.error === 'publish-disabled', 'publish disabled');
    const audit = (await call('GET', '/api/audit')).json;
    ok(audit.length > 5, 'audit log');
    // persisted
    ok(fs.existsSync(path.join(tmp, 'data', 'state.json')), 'state persisted');
    // host header check
    const badHost = await new Promise(r => { const q = http.request({ host: '127.0.0.1', port, path: '/api/meta', headers: { host: 'evil.example', 'x-admin-token': admin.token } }, res => { res.resume(); r(res.statusCode); }); q.end(); });
    ok(badHost >= 400, 'foreign Host rejected ' + badHost);
  } catch (e) { fails++; console.log('EXCEPTION', e.stack); }
  await admin.close();
  console.log(`rebuild admin test: ${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})();
