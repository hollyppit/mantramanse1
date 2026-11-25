// 운명의 타임라인 간단 보기(스위치 tlSimple, 2026-11-26) 정적 검사
//  · 스위치: 기본 꺼짐 · 모두 켜기에 딸려 켜지지 않음 · 관리자 버튼
//  · 화면: 꺼지면 예전 순서 그대로, 켜면 무료 콘텐츠 맨 위 · 시기 카드 접기 · 계산 함수 호출은 그대로
//  · 테마: timeline-occult.css 의 규칙은 모두 #tq.tq-simple 범위 · /report/ 와 /report/hub/ 에서 불러옴
const fs = require('fs'), path = require('path'), assert = require('assert');
const root = path.join(__dirname, '..'), rd = f => fs.readFileSync(path.join(root, f), 'utf8');
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
(async () => {
  const { applyFlags } = await import('file://' + path.join(root, 'functions/api/luck-flags.js').replace(/\\/g, '/'));
  const on = applyFlags(null, { flags: { tlSimple: true } }, 't', 'b');
  ok(on.doc && on.doc.tlSimple === true, 'tlSimple 을 켤 수 있어야 함');
  ok(applyFlags(null, { on: true }, 't', 'b').doc.tlSimple === false, '모두 켜기에 간단 보기가 딸려 켜지면 안 됨');
  ok(/tlSimple: false/.test(rd('feature-flags.js')), 'feature-flags 기본 꺼짐');
  const admin = rd('report/admin/v2-luckenv.js');
  ok(/id="leTS"/.test(admin) && /\$\('#leTS'\)\.onclick/.test(admin) && /flags: \{ tlSimple: v \}/.test(admin), '관리자 버튼');

  const js = rd('report/hub/hub-timeline.js');
  ok(/simple: on\('tlSimple'\)/.test(js) && /var SIMPLE = !!\(GF && GF\.simple\)/.test(js), '스위치 → SIMPLE');
  ok(/var SEC_ORDER = \['glance', 'now', 'free', 'flow', 'themes', 'birth', 'mine'\]/.test(js), '꺼짐: 예전 순서');
  ok(/if \(SIMPLE\) \{ SEC_ORDER = \['free', 'glance', 'now', 'flow', 'themes', 'birth', 'mine'\]/.test(js), '켜짐: 무료 콘텐츠 맨 위');
  ok(/class="tq' \+ \(SIMPLE \? ' tq-simple' : ''\)/.test(js), '루트 class');
  // 접어도 같은 계산을 부른다(지우지 않고 접기만)
  const simpleBlock = js.slice(js.indexOf('if (SIMPLE) {   // 간단 보기'), js.indexOf("return '<article class=\"tq-card u-'"));
  ['themeHtml(it, lvl)', 'ovFig(it, lvl)', 'lvHtml(it, lvl,', 'structHtml(it, lvl)', 'pairHtml(it.year)', 'domHtml(it, lvl)', 'qk', "data-ev=\"' + lvl"].forEach(k => ok(simpleBlock.includes(k) || js.includes("var acts = '<div class=\"tq-card-acts\"><button type=\"button\" class=\"tq-lnk\" data-ev=\"' + lvl"), '간단 카드에도 ' + k));
  ok(/<details class="tq-fold tq-more"><summary>자세히 보기/.test(js), '자세히 보기 접기');

  const css = rd('report/hub/timeline-occult.css');
  const rules = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@keyframes[^{]+\{(?:[^{}]*\{[^}]*\})*\s*\}/g, '').replace(/@media[^{]+\{/g, '').split('}').map(x => x.split('{')[0].trim()).filter(Boolean);
  const top = sel => { const out = []; let d = 0, cur = ''; for (const ch of sel) { if (ch === '(') d++; if (ch === ')') d--; if (ch === ',' && !d) { out.push(cur); cur = ''; } else cur += ch; } out.push(cur); return out; };   // :is(a, b) 안의 쉼표는 나누지 않음
  const bad = rules.filter(sel => top(sel).some(s => !/#tq\.tq-simple/.test(s)));
  ok(!bad.length, 'CSS 전부 #tq.tq-simple 범위: ' + bad.slice(0, 3).join(' | '));
  const story = rd('report/story/story.js'), hubIdx = rd('report/hub/index.html');
  ok(/'theme-mist\.css', 'timeline-occult\.css'\]/.test(story), '/report/ 에서 불러옴');
  ok(/timeline-occult\.css\?v=/.test(hubIdx), '/report/hub/ 에서 불러옴');
  console.log('timeline-simple-sim PASS ' + n + '항목 · 스위치 tlSimple 기본 꺼짐 · 무료 맨 위 · 접기만(계산 그대로) · CSS 범위');
})().catch(e => { console.error(e); process.exit(1); });
