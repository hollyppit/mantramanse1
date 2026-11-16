// 관리자 화면 밝은 테마(2026-11-17) 점검: 로딩·전환 단추·CSS 범위(html.admin-light 밖으로 새는 규칙이 없어야 어둡게 모드가 원래 그대로다)
const fs = require('fs'), path = require('path'), assert = require('assert');
const R = p => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const html = R('report/admin/index.html');
assert(/admin-light\.css\?v=/.test(html), '밝은 테마 CSS 로딩');
assert(html.includes('localStorage.getItem("adm.theme")') && html.includes('classList.add("admin-light")'), '기본 켜짐 + 기기 기억');
assert(html.includes('id="admTheme"') && html.includes('localStorage.setItem("adm.theme"'), '밝게/어둡게 단추');
let css = R('report/admin/admin-light.css').replace(/\/\*[\s\S]*?\*\//g, '');
const splitTop = s => { const o = []; let d = 0, cur = ''; for (const ch of s) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && d === 0) { o.push(cur); cur = ''; } else cur += ch; } o.push(cur); return o; };
const bad = []; const re = /([^{}]+)\{[^{}]*\}/g; let m;
while ((m = re.exec(css))) { const sel = m[1].trim(); if (!sel) continue; splitTop(sel).forEach(x => { x = x.trim(); if (!x.startsWith('html.admin-light') && x !== '#admTheme') bad.push(x.slice(0, 80)); }); }
assert.deepStrictEqual(bad, [], '테마 밖으로 새는 선택자: ' + bad.join(' | '));
console.log('모든 검증 통과 · 로딩 · 기본 밝게 + 기기 기억 · 밝게/어둡게 단추 · CSS 전부 html.admin-light 범위');
