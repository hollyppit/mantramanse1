// 풀이 DB 계층화 비교 테스트(report/v2/CONTENT_DB_DESIGN.md §8):
//   node tests/content-db-sim.js            → 기준선(tests/content-db-baseline.txt)과 비교, 서버 정리 규칙·병합 규칙 검사
//   node tests/content-db-sim.js --update   → 기준선 갱신(문장·조건을 일부러 바꾼 뒤에만)
// 조립 결과(모듈 id·문장·주제 카드)가 사주 120개 × 프로젝트 4종에서 바이트 단위로 같은지 확인한다.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..'), base = path.join(__dirname, 'content-db-baseline.txt');
vm.runInThisContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8'), { filename: 'engine.js' });
globalThis.window = globalThis;
['chapters', 'saju-data', 'rules', 'narrator', 'content', 'content-pro', 'content-pro2', 'topics', 'intro-text', 'story-director', 'story-composer', 'content-v3', 'verdict', 'remedy', 'media', 'scenes', 'compose']
  .forEach(f => vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', f + '.js'), 'utf8'), { filename: f + '.js' }));
const R = globalThis.ReportV2, M = globalThis.Manse, Rules = R.Rules;
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
// 단계 2: content-meta.js 를 올리기 전의 모듈을 스냅샷으로 잡고, 올린 뒤 기존 12개 필드가 그대로인지 확인한다.
const FIELDS12 = ['id', 'category', 'conditions', 'priority', 'headline', 'summary', 'detail', 'keywords', 'imageTags', 'actionTags', 'extra', 'enabled'];
const pick12 = m => Rules.stable(FIELDS12.map(k => m[k]).concat([m.layer, m.choice, !!m.v3]));
const beforeMeta = R.Content.modules.map(m => [m.id, pick12(m)]), beforeKeys = R.Content.modules.map(m => Object.keys(m).sort().join());
vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', 'content-meta.js'), 'utf8'), { filename: 'content-meta.js' });
const NOW = Date.UTC(2026, 9, 6), PROJECTS = R.Chapters.PROJECTS.map(p => p.id);
const NEW_KEYS = /"(evidence|status|narrative|rule)":/; // 신규 계층 필드는 조립 결과에 나오면 안 된다(§8.1)

/* ── 1. 조립 결과 기준선 ───────────────────────────────────────────── */
function charts(n) {
  let seed = 20261006; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296, out = [];
  while (out.length < n) {
    const i = out.length, hour = i % 10 === 9 ? null : Math.floor(rnd() * 24); // 10번째마다 시간 모름
    try { out.push(M.compute({ year: 1940 + Math.floor(rnd() * 70), month: 1 + Math.floor(rnd() * 12), day: 1 + Math.floor(rnd() * 28), hour: hour == null ? '' : hour, minute: 0, gender: i % 2 ? 'F' : 'M', calendar: 'solar', leap: false, city: '서울' })); } catch (e) { /* 없는 날짜 */ }
  }
  return out;
}
function snapshot(lib) {
  const lines = [], set = charts(120), leak = [];
  const proj = PROJECTS.map(id => ({ id, cfg: R.Chapters.forProject(null, id) }));
  set.forEach((ch, i) => {
    const sd = R.SajuData.build(ch, { now: NOW }), parts = [];
    proj.forEach(p => {
      const rep = R.Compose.build(sd, lib, p.cfg, { name: '백진우' });
      const body = rep.chapters.map(c => [c.id, c.headline, c.interpretation, c.meaning, c.modules, (c.details || []).map(d => [d.id, d.headline, d.summary, d.detail]), c.topics]);
      const s = Rules.stable(body); if (NEW_KEYS.test(s)) leak.push(p.id + '#' + i);
      parts.push(p.id + ':' + Rules.hash(body) + ':' + rep.chapters.length);
    });
    lines.push(String(i).padStart(3, '0') + ' ' + sd.dayPillar.ko + ' ' + parts.join(' '));
  });
  return { text: lines.join('\n') + '\n', leak };
}
const lib = R.Compose.library(null);
const cur = snapshot(lib);
ok(cur.leak.length === 0, '조립 결과에 신규 계층 필드 노출: ' + cur.leak.slice(0, 3).join(','));
if (process.argv.includes('--update')) { fs.writeFileSync(base, cur.text); console.log('기준선 갱신: ' + cur.text.split('\n').length + '줄'); process.exit(fails.length ? 1 : 0); }
const old = fs.existsSync(base) ? fs.readFileSync(base, 'utf8').replace(/\r\n/g, '\n') : null;
if (old == null) fails.push('기준선 파일이 없습니다: --update 로 먼저 만드세요');
else if (old !== cur.text) {
  const o = old.split('\n'), c = cur.text.split('\n'); let n = 0;
  c.forEach((l, i) => { if (l !== o[i] && n++ < 5) fails.push('조립 결과 다름\n   기준 ' + o[i] + '\n   현재 ' + l); });
}
console.log('조립 기준선: 사주 120 × 프로젝트 ' + PROJECTS.length + '종' + (old === cur.text ? ' 일치' : ' 불일치'));

/* ── 2. 저장본 병합(Compose.library) — 시드 위 덮어쓰기·추가·비활성 규칙 ───────────── */
{
  const seedMods = R.Content.modules, target = seedMods.find(m => m.category === 'personality' && m.layer), off = seedMods.find(m => m.id !== target.id && m.category === 'career');
  const saved = { modules: [{ id: target.id, headline: '수정된 결론' }, { id: off.id, enabled: false }, { id: 'mod_added_test', category: 'career', conditions: {}, priority: 99, headline: 'A', summary: 'B', detail: 'C', enabled: true }] };
  const L = R.Compose.library(saved), by = {}; L.modules.forEach(m => { by[m.id] = m; });
  ok(by[target.id].headline === '수정된 결론' && by[target.id].summary === target.summary && by[target.id].layer === target.layer, '저장본은 필드 단위로 시드 위에 병합');
  ok(by[off.id].enabled === false, '저장본 enabled:false 반영');
  ok(!!by.mod_added_test && L.modules.length === seedMods.length + 1, '새 id 는 추가');
  ok(R.Compose.library(null).modules.length === seedMods.length, '저장본 없으면 시드 그대로');
}

/* ── 2-b. 계층 메타(content-meta.js) ────────────────────────────────── */
{
  const mods = R.Content.modules, meta = R.Content.meta;
  ok(mods.length === beforeMeta.length && mods.every((m, i) => m.id === beforeMeta[i][0]), '모듈 id 집합·순서 불변');
  ok(mods.every((m, i) => pick12(m) === beforeMeta[i][1]), '기존 필드(문장·조건·우선순위·extra·layer·v3) 불변');
  ok(mods.every(m => m.status === 'legacy'), '전 모듈 status=legacy');
  const ed = mods.filter(m => m.evidence && m.evidence.basis === 'editorial'), lg = mods.filter(m => m.evidence && m.evidence.basis === 'legacy');
  ok(ed.length === R.Content.v3Count && ed.every(m => m.v3), 'v3 모듈만 editorial: ' + ed.length);
  ok(ed.length + lg.length === mods.length, '모든 모듈에 evidence 부여');
  ok(mods.every(m => Array.isArray(m.evidence.refs) && m.evidence.refs.length === 0 && m.evidence.rev === 0 && !m.evidence.checkedBy), '근거 문헌·승인자를 만들어 넣지 않음');
  ok(meta && meta.labeled === mods.length && meta.editorial === ed.length, '메타 집계 값: ' + JSON.stringify(meta));
  const snap = Rules.stable(mods.map(m => [m.status, m.evidence]));
  vm.runInThisContext(fs.readFileSync(path.join(root, 'report', 'v2', 'content-meta.js'), 'utf8'), { filename: 'content-meta.js' });
  ok(Rules.stable(mods.map(m => [m.status, m.evidence])) === snap, 'content-meta 재실행해도 같음(멱등)');
  // 선택 게이트: 정책이 아직 없으므로 status 가 선택에 영향을 주지 않는다(§7 단계 3 이전)
  const f = Rules.flatten(R.SajuData.build(charts(1)[0], { now: NOW }), {}), r1 = Rules.rank(mods, f).map(x => x.mod.id).join();
  const stripped = mods.map(m => { const c = Object.assign({}, m); delete c.status; delete c.evidence; return c; });
  ok(Rules.rank(stripped, f).map(x => x.mod.id).join() === r1, 'status·evidence 유무가 선택 순서에 영향 없음');
}

/* ── 3. 서버 정리 규칙(functions/api/report-content.js cleanModule) ────────────────── */
{
  const src = fs.readFileSync(path.join(root, 'functions/api/report-content.js'), 'utf8').split(/export async function onRequestGet/)[0]
    .replace(/^import .*$/mg, '');
  let clean;
  try { clean = new Function(src + '\nreturn { cleanModule, COND_KEYS };')(); } catch (e) { fails.push('서버 정리 함수를 불러오지 못함: ' + e.message); }
  if (clean) {
    const cm = clean.cleanModule, plain = { id: 'x_1', category: 'career', conditions: { dayMasterEl: ['목'] }, priority: 60, headline: 'h', summary: 's', detail: 'd', keywords: ['k'], imageTags: [], actionTags: [], extra: null, enabled: true };
    // (a) 기존 모듈: 정리 결과에 신규 키가 생기지 않는다(예전과 같은 모양)
    const o = cm(plain);
    ok(JSON.stringify(Object.keys(o)) === JSON.stringify(['id', 'category', 'conditions', 'priority', 'headline', 'summary', 'detail', 'keywords', 'imageTags', 'actionTags', 'extra', 'enabled']), '기존 모듈 정리 결과의 키 목록 불변: ' + Object.keys(o).join(','));
    // (b) 시드 678개 전부: 기존 12개 필드는 정리 후에도 동일, 조건 키가 지워지지 않는다
    const lost = [], condLost = [], layerLost = [];
    R.Content.modules.forEach(m => {
      const c = cm(m); if (!c) { lost.push(m.id); return; }
      if (Rules.stable(m.conditions) !== Rules.stable(c.conditions)) condLost.push(m.id);
      if ((m.layer || '') !== (c.layer || '')) layerLost.push(m.id);
    });
    ok(lost.length === 0, '시드 모듈이 정리에서 탈락: ' + lost.slice(0, 5).join(','));
    ok(condLost.length === 0, '시드 조건이 저장 때 변형: ' + condLost.slice(0, 5).join(','));
    ok(layerLost.length === 0, 'layer 가 저장 때 사라짐: ' + layerLost.slice(0, 5).join(','));
    // (c) 서버 허용 조건 키 ⊇ 규칙 엔진 조건 키(gender·hasRoot 는 저장 허용 목록에 이미 있음)
    const missing = Object.keys(Rules.FIELDS).filter(k => !clean.COND_KEYS.includes(k));
    ok(missing.length === 0, '규칙 엔진 조건 키 중 서버가 버리는 키: ' + missing.join(','));
    // (d) 신규 필드: 허용 값은 보존, 범위 밖 값은 버림
    const n = cm(Object.assign({}, plain, { status: 'approved', layer: 'groupHigh', choice: '선택', rule: { note: '메모', when: { dayMasterEl: ['금'] }, except: { strength: ['신강'] } },
      evidence: { basis: 'tradition', refs: [{ id: 'src_1', kind: 'classic', title: 't', locator: 'l', note: 'n' }, { id: '잘못 된 id!', kind: 'classic' }], checkedBy: '편집자', checkedAt: '2026-10-11', rev: 3 }, narrative: { voice: 'haeyo', hook: '도입', extra: 'x' } }));
    ok(n.status === 'approved' && n.layer === 'groupHigh' && n.choice === '선택', '신규 필드 보존(status·layer·choice)');
    ok(n.rule && n.rule.note === '메모' && !('when' in n.rule) && !('except' in n.rule), 'rule 은 1단계에서 note 만');
    ok(n.evidence && n.evidence.basis === 'tradition' && n.evidence.refs.length === 1 && n.evidence.refs[0].id === 'src_1' && n.evidence.checkedAt === '2026-10-11' && n.evidence.rev === 3, 'evidence 보존·잘못된 ref 제거');
    ok(n.narrative && n.narrative.voice === 'haeyo' && n.narrative.hook === '도입' && !('extra' in n.narrative), 'narrative 허용 필드만');
    const bad = cm(Object.assign({}, plain, { status: 'whatever', layer: '한글!', evidence: { basis: 'magic' }, narrative: { voice: 'x' }, rule: { note: 5 } }));
    ok(!('status' in bad) && !('layer' in bad) && !('evidence' in bad) && !('narrative' in bad) && !('rule' in bad), '범위 밖 값은 버림');
    ok(cm(null) === null && cm({ id: 'bad id', category: 'career' }) === null, '잘못된 모듈은 null');
  }
}

if (fails.length) { console.log('\n실패 ' + fails.length + '건'); fails.slice(0, 20).forEach(f => console.log(' ✗ ' + f)); process.exit(1); }
console.log('모두 통과');
