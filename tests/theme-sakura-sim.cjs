// 인연의 광장 벚꽃 테마(2026-11-17) 점검: 스위치·관리자 버튼·로딩·CSS 범위(테마가 꺼지면 바뀌는 것이 없어야 한다)
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
(async () => {
  const { applyFlags } = await import('../functions/api/luck-flags.js');
  assert(applyFlags(null, { flags: { sakuraTheme: true } }, 't', 'b').doc.sakuraTheme === true, 'sakuraTheme 를 켤 수 있어야 함');
  assert(applyFlags(null, { on: true }, 't', 'b').doc.sakuraTheme === false, '모두 켜기에 딸려 켜지면 안 됨');
  const admin = R('report/admin/v2-luckenv.js');
  assert(admin.includes('id="leSK"') && /\$\('#leSK'\)\.onclick/.test(admin) && /flags: \{ sakuraTheme: v \}/.test(admin), '관리자 버튼');
  const page = R('community/index.html');
  assert(/theme-sakura\.css\?v=/.test(page) && /theme-sakura\.js\?v=/.test(page), '광장 페이지 로딩');
  let css = R('community/theme-sakura.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '').replace(/@media[^{]+\{/g, '');
  const splitTop = s => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
  const bad = []; const re = /([^{}]+)\{[^{}]*\}/g; let m;
  while ((m = re.exec(css))) { const sel = m[1].trim(); if (!sel) continue; splitTop(sel).forEach(x => { x = x.trim(); if (!x.startsWith('html.theme-sakura') && !x.startsWith('.sk-petals') && !x.startsWith('html:not(.theme-sakura) .sk-petals')) bad.push(x.slice(0, 80)); }); }
  assert.deepStrictEqual(bad, [], '테마 밖으로 새는 선택자: ' + bad.join(' | '));
  const js = R('community/theme-sakura.js'); assert(/sakuraTheme === true/.test(js)); new Function(js);
  console.log('모든 검증 통과 · 스위치 sakuraTheme · 모두 켜기와 분리 · 관리자 버튼 · 광장 로딩 · CSS 전부 html.theme-sakura 범위(꽃잎 상자 제외, 꺼지면 숨김)');
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
