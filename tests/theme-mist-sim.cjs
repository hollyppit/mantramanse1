// 밝은 안개 테마(2026-11-16) 점검: 스위치 이름·관리자 버튼·로딩 연결·CSS 범위(테마가 꺼지면 아무것도 바뀌지 않아야 한다)
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
(async () => {
  const { applyFlags } = await import('../functions/api/luck-flags.js');
  const on = applyFlags(null, { flags: { mistTheme: true } }, 't', 'b');
  assert(on.doc && on.doc.mistTheme === true, 'mistTheme 를 켤 수 있어야 함');
  assert(on.doc.timeline === false && on.doc.flowChapters === false, '다른 스위치는 그대로');
  const all = applyFlags(null, { on: true }, 't', 'b');
  assert(all.doc.mistTheme === false, '모두 켜기에 안개 테마가 딸려 켜지면 안 됨');

  const admin = R('report/admin/v2-luckenv.js');
  assert(/id=\\?"leMT/.test(admin) && /\$\('#leMT'\)\.onclick/.test(admin) && /flags: \{ mistTheme: v \}/.test(admin), '관리자 버튼');

  const story = R('report/story/story.js');
  assert(story.includes("'theme-mist.css'") && story.includes("'theme-mist.js'"), '/report/ 쪽 로딩');
  const hub = R('report/hub/index.html');
  assert(/theme-mist\.css\?v=/.test(hub) && /theme-mist\.js\?v=/.test(hub), '/report/hub/ 쪽 로딩');

  // CSS: 주석을 지우고 모든 규칙의 선택자가 html.theme-mist 로 시작해야 한다(@keyframes·@media 안쪽 포함)
  let css = R('report/hub/theme-mist.css').replace(/\/\*[\s\S]*?\*\//g, '');
  css = css.replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const splitTop = s => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
  const bad = [];
  const re = /([^{}]+)\{[^{}]*\}/g; let m;
  const scan = s => { while ((m = re.exec(s))) { const sel = m[1].trim(); if (!sel || sel.startsWith('@')) continue; splitTop(sel).forEach(x => { if (!x.trim().startsWith('html.theme-mist')) bad.push(x.trim().slice(0, 80)); }); } };
  scan(css.replace(/@media[^{]+\{/g, ''));
  assert.deepStrictEqual(bad, [], '테마 밖으로 새는 선택자: ' + bad.join(' | '));

  const js = R('report/hub/theme-mist.js');
  assert(/mistTheme === true/.test(js) && /#\\\/\(timeline\|today\|tarot\)/.test(js), '스위치·화면 범위');
  new Function(js);
  console.log('모든 검증 통과 · 스위치 mistTheme · 모두 켜기와 분리 · 관리자 버튼 · /report/·/report/hub/ 로딩 · CSS 전부 html.theme-mist 범위');
})().catch(e => { console.error('실패:', e.message); process.exit(1); });
