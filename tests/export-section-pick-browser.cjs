// 만세력(루트 index.html) PDF 섹션 골라 내보내기 — 브라우저 확인(2026-11-25)
//  · PDF 단추 → 섹션 고르기 창(탭별 묶음·전체 선택/해제·지금 탭만), 고른 뒤 원래 탭으로 되돌아오는지
//  · 여러 탭에서 고른 섹션이 한 PDF로 나오는지(파일 이름·쪽 수), 한 탭만 고르면 파일 이름이 그 탭 이름인지
//  · 이미지(PNG)는 예전처럼 지금 탭 통째로 내보내는지
//  · 모바일(안드로이드 UA)에서 고르기 창 → 저장·공유 시트까지
// 실행: $env:TASK_PLAYWRIGHT='…\node_modules\playwright'; node tests/export-section-pick-browser.cjs
// html2canvas-pro·jsPDF 는 CDN 에서 받으므로 인터넷이 필요하다.
const fs = require('fs'), path = require('path'), http = require('http'), assert = require('assert');
const { chromium } = require(process.env.TASK_PLAYWRIGHT || 'playwright');
const pdfPages = buf => (buf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
(async () => {
  const root = path.resolve('.');
  const TYPES = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
    fs.readFile(file, (err, data) => { if (err) { res.writeHead(404); return res.end(); } res.setHeader('content-type', TYPES[path.extname(file)] || 'application/octet-stream'); res.end(data); });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const URL0 = 'http://127.0.0.1:' + server.address().port + '/';
  fs.mkdirSync('output/export-section-pick', { recursive: true });
  let browser;
  try {
    browser = await chromium.launch({ headless: true, channel: 'msedge' });
    // ── PC ──
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('dialog', d => { errors.push('dialog: ' + d.message()); d.dismiss(); });
    await page.route('**/api/**', r => r.fulfill({ json: {} }));
    await page.goto(URL0);
    await page.waitForSelector('nav.tabs [data-tab="wonguk"]');
    await page.click('nav.tabs [data-tab="wonguk"]');
    await page.click('[data-export="pdf"]');
    await page.waitForSelector('.xpp');
    const groups = await page.$$eval('.xpp-g .xpp-gh b', els => els.map(e => e.textContent));
    for (const g of ['원국', '오행·강약', '용신', '운세 흐름']) assert(groups.includes(g), '묶음 없음: ' + g);
    for (const g of ['관상', '타로', '주역', '용어']) assert(!groups.includes(g), '빼야 할 탭: ' + g);
    assert.equal(await page.$eval('.tab[aria-selected="true"]', e => e.textContent.trim()), '원국', '고르기 창을 연 뒤 원래 탭으로 돌아와야 함');
    assert.equal(await page.$$eval('.wrap.xs', e => e.length), 0, '캡처용 무대가 남으면 안 됨');
    // 처음 선택 = 지금 탭 전체
    const won = await page.$eval('.xpp-g.open .xpp-n', e => e.textContent);
    const [a, b] = won.split('/').map(Number); assert(a === b && a > 0, '처음에는 지금 탭 전체 선택: ' + won);
    // 전체 해제 → 만들기 단추 잠김, 전체 선택 → 모든 섹션
    await page.click('.xpp [data-xpp="none"]');
    assert(await page.$eval('.xpp [data-xpp="go"]', e => e.disabled), '아무것도 안 고르면 만들기 잠김');
    await page.click('.xpp [data-xpp="all"]');
    const total = await page.$$eval('.xpp-n', els => els.reduce((s, e) => s + +e.textContent.split('/')[1], 0));
    assert(new RegExp(`${total}개 섹션`).test(await page.$eval('.xpp-f', e => e.textContent)), '전체 선택 개수');
    await page.click('.xpp [data-xpp="none"]');
    // 모든 묶음 펼치고 두 탭에서 하나씩 고른다
    for (let i = 0; i < 12; i++) { const t = await page.$('.xpp-t[aria-expanded="false"]'); if (!t) break; await t.click(); }
    const keys = await page.$$eval('.xpp [data-xpk]', els => els.map(e => e.dataset.xpk));
    const k1 = keys.find(k => k.startsWith('wonguk|사주 원국|')), k2 = keys.find(k => k.startsWith('yong|'));
    assert(k1 && k2, '원국·용신 섹션 키');
    await page.check(`.xpp [data-xpk="${k1}"]`); await page.check(`.xpp [data-xpk="${k2}"]`);
    assert.equal(await page.$eval('.xpp-g .xpp-gh input[data-xpg="wonguk"]', e => e.indeterminate), true, '일부만 고른 묶음은 중간 상태');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('.xpp [data-xpp="go"]')]);
    const pdfPath = 'output/export-section-pick/pc-multi.pdf'; await dl.saveAs(pdfPath);
    const buf = fs.readFileSync(pdfPath), n = pdfPages(buf);
    assert(/^만세력_섹션모음_/.test(dl.suggestedFilename()), '여러 탭 파일 이름: ' + dl.suggestedFilename());
    assert(n >= 1 && n <= 4, '두 섹션 PDF 쪽 수: ' + n);
    assert.equal(await page.$eval('.tab[aria-selected="true"]', e => e.textContent.trim()), '원국');
    console.log('PC 여러 탭 PDF', dl.suggestedFilename(), n + '쪽');
    // 한 탭만 → 파일 이름 = 탭 이름, 고른 것 기억
    await page.click('[data-export="pdf"]'); await page.waitForSelector('.xpp');
    assert(/2개 섹션/.test(await page.$eval('.xpp-f', e => e.textContent)), '지난 선택을 기억');
    await page.click('.xpp [data-xpp="cur"]');
    const [dl2] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('.xpp [data-xpp="go"]')]);
    assert(/^만세력_원국_/.test(dl2.suggestedFilename()), '한 탭 파일 이름: ' + dl2.suggestedFilename());
    await dl2.saveAs('output/export-section-pick/pc-wonguk.pdf');
    console.log('PC 지금 탭만 PDF', dl2.suggestedFilename(), pdfPages(fs.readFileSync('output/export-section-pick/pc-wonguk.pdf')) + '쪽');
    // 세부 항목(2026-11-25): 섹션 안 소제목·접는 상자·특기·분야를 골라 뺀다
    await page.evaluate(() => { Object.keys(window.MANTRA_FLAGS).forEach(k => { window.MANTRA_FLAGS[k] = true; }); });
    await page.click('nav.tabs [data-tab="ohaeng"]'); await page.click('nav.tabs [data-tab="wonguk"]');
    await page.click('[data-export="pdf"]'); await page.waitForSelector('.xpp');
    assert.equal(await page.$eval('.tab[aria-selected="true"]', e => e.textContent.trim()), '원국');
    await page.click('.xpp [data-xpp="none"]');
    for (let i = 0; i < 12; i++) { const t = await page.$('.xpp-t[aria-expanded="false"]'); if (!t) break; await t.click(); }
    for (let i = 0; i < 120; i++) { const t = await page.$('.xpp-st[aria-expanded="false"]'); if (!t) break; await t.click(); }
    const list = await page.$$eval('.xpp-s', els => els.map(s => ({ key: s.querySelector('[data-xpk]').dataset.xpk, subs: [...s.querySelectorAll('[data-xpsub]')].map(i => ({ id: i.dataset.xpsub, t: i.parentElement.textContent.trim() })) })));
    const find = re => list.find(s => re.test(s.key));
    // 관계·신살(접는 상자 안 카드)도 섹션으로 나온다
    assert(find(/^wonguk\|내 사주 신살 한눈에 보기/), '관계·신살 카드가 목록에 있어야 함');
    // 특기·적성: 숨은 갈래(직업·일)와 숨은 분야 칸까지 목록에
    const det = find(/^apt\|활동·취미 분야별 상세/), jobs = find(/^apt\|직업·일 나에게 맞는 직업과 업종/);
    assert(det && det.subs.length >= 6, '분야별 상세 세부 6분야: ' + JSON.stringify(det && det.subs));
    assert(jobs && jobs.subs.length >= 3, '직업 목록 세부');
    assert(!list.some(s => /^ohaeng\|직업 · 활동 적성/.test(s.key)), '다른 탭으로 옮긴 안내 카드는 빼야 함');
    // 세부 하나만 고르면 그 섹션이 그 항목만으로 선택된다
    await page.check(`.xpp [data-xpsub="${det.subs[1].id}"]`);
    await page.check(`.xpp [data-xpsub="${det.subs[3].id}"]`);
    assert(await page.$eval(`.xpp [data-xpk="${det.key}"]`, e => e.checked), '세부를 고르면 섹션도 선택');
    assert.equal(await page.$$eval(`.xpp [data-xpsub^="${det.key}#"]:checked`, e => e.length), 2, '고른 세부 2개');
    await page.check(`.xpp [data-xpsub="${jobs.subs[0].id}"]`);
    // 세부를 모두 빼면 섹션도 빠진다
    await page.uncheck(`.xpp [data-xpsub="${jobs.subs[0].id}"]`);
    assert(!(await page.$eval(`.xpp [data-xpk="${jobs.key}"]`, e => e.checked)), '세부를 모두 빼면 섹션도 빠짐');
    await page.check(`.xpp [data-xpsub="${jobs.subs[0].id}"]`);
    const [dl3] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('.xpp [data-xpp="go"]')]);
    await dl3.saveAs('output/export-section-pick/pc-apt-subs.pdf');
    const n3 = pdfPages(fs.readFileSync('output/export-section-pick/pc-apt-subs.pdf'));
    assert(/^만세력_특기·적성_/.test(dl3.suggestedFilename()) && n3 >= 1 && n3 <= 5, '특기·적성 세부 PDF: ' + dl3.suggestedFilename() + ' ' + n3);
    console.log('PC 세부 항목 PDF', dl3.suggestedFilename(), n3 + '쪽', `(분야 ${det.subs[1].t}·${det.subs[3].t}, 직업 ${jobs.subs[0].t})`);
    // 닫기(Esc)
    await page.click('[data-export="pdf"]'); await page.waitForSelector('.xpp'); await page.keyboard.press('Escape');
    assert.equal(await page.$$eval('.xpp', e => e.length), 0, 'Esc 로 닫힘');
    // 이미지(PNG)는 예전 동작: 고르기 창 없이 지금 탭
    const [png] = await Promise.all([page.waitForEvent('download', { timeout: 90000 }), page.click('[data-export="png"]')]);
    assert(/^만세력_원국_.*\.png$/.test(png.suggestedFilename()), 'PNG 이름: ' + png.suggestedFilename());
    assert.equal(await page.$$eval('.xpp', e => e.length), 0, 'PNG 는 고르기 창 없음');
    console.log('PC PNG', png.suggestedFilename());
    await page.waitForFunction(() => !document.querySelector('[data-export="png"]').disabled, null, { timeout: 90000 });
    assert.deepEqual(errors, [], '페이지 오류: ' + errors.join(' / '));
    await ctx.close();
    // ── 모바일 ──
    const mctx = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36' });
    const mp = await mctx.newPage(), merr = [];
    mp.on('pageerror', e => merr.push(e.message)); mp.on('dialog', d => { merr.push('dialog: ' + d.message()); d.dismiss(); });
    await mp.route('**/api/**', r => r.fulfill({ json: {} }));
    await mp.goto(URL0); await mp.waitForSelector('[data-export="pdf"]');
    await mp.tap('[data-export="pdf"]'); await mp.waitForSelector('.xpp');
    const box = await mp.$eval('.xpp', e => { const r = e.getBoundingClientRect(); return { w: r.width, h: r.height, vh: innerHeight }; });
    assert(box.w <= 375 && box.h <= box.vh, '모바일 창 크기: ' + JSON.stringify(box));
    await mp.tap('.xpp [data-xpp="none"]');
    for (let i = 0; i < 12; i++) { const t = await mp.$('.xpp-t[aria-expanded="false"]'); if (!t) break; await t.tap(); }
    const mk = await mp.$$eval('.xpp [data-xpk]', els => els.map(e => e.dataset.xpk));
    await mp.tap(`.xpp [data-xpk="${mk.find(k => k.startsWith('wonguk|'))}"]`);
    await mp.tap(`.xpp [data-xpk="${mk.find(k => k.startsWith('luck|'))}"]`);
    await mp.screenshot({ path: 'output/export-section-pick/mobile-picker.png' });
    await mp.tap('.xpp [data-xpp="go"]');
    await mp.waitForSelector('.sheet a[download]', { timeout: 90000 });
    const m = await mp.$eval('.sheet a[download]', async a => { const t = await (await fetch(a.href)).text(); return { name: a.download, pages: (t.match(/\/Type\s*\/Page[^s]/g) || []).length }; });
    assert(/^만세력_섹션모음_.*\.pdf$/.test(m.name) && m.pages >= 1, '모바일 PDF: ' + JSON.stringify(m));
    console.log('모바일 PDF', m.name, m.pages + '쪽');
    assert.deepEqual(merr, [], '모바일 페이지 오류: ' + merr.join(' / '));
    await mctx.close();
    console.log('export-section-pick-browser: 통과');
  } finally { if (browser) await browser.close(); server.close(); }
})().catch(e => { console.error(e); process.exit(1); });
