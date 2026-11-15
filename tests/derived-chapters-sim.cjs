// 엔진 조립 장 공통 목록(report/v2/derived-chapters.js)과 관리자 탭 연동 검증
//   node tests/derived-chapters-sim.cjs
// 목록의 제목·자리가 실제 모듈(전성기·흐름·건강)과 같은지, 타임라인 구성·챕터 계약·감사 성적표·감사 도구가 같은 목록을 쓰는지 본다.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const DC = require(path.join(root, 'report/v2/derived-chapters.js'));
const F = require(path.join(root, 'report/v2/flow-chapters.js')), H = require(path.join(root, 'report/v2/health-chapters.js'));
const fails = [], ok = (c, m) => { if (!c) fails.push(m); };
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

// 1. 제목·모듈·스위치가 실제 모듈과 같다
Object.values(F.IDS).forEach(id => { const d = DC.byId(id); ok(d && d.title === F.TITLES[id] && d.flag === 'flowChapters' && d.module === 'flow-chapters.js', `흐름 장 ${id} 목록 불일치`); });
H.IDS.forEach(id => { const d = DC.byId(id); ok(d && d.title === H.TITLES[id] && d.flag === 'healthChapters' && d.module === 'health-chapters.js', `건강 장 ${id} 목록 불일치`); });
ok(/title:'내 인생의 전성기는 언제\?'/.test(read('report/v2/reading-peak.js')) && DC.byId('timeline_self_peak').title === '내 인생의 전성기는 언제?' && DC.byId('timeline_self_peak').flag === null, '전성기 장 목록 불일치');
ok(DC.LIST.length === Object.keys(F.IDS).length + H.IDS.length + 1 && new Set(DC.LIST.map(d => d.id)).size === DC.LIST.length, '목록 수·중복 오류');

// 2. 자리: 사용자 화면(flow·health·peak add)과 같은 앞 장 뒤
const order = ['timeline_self_03', 'timeline_self_02', 'timeline_self_20', 'timeline_self_35', 'timeline_self_36', 'timeline_wealth_01', 'timeline_wealth_02', 'timeline_career_01', 'timeline_love_01', 'timeline_love_02'];
const ins = DC.insert(order);
const after = (a, b) => ins.indexOf(b) === ins.indexOf(a) + 1;
ok(after('timeline_self_03', 'timeline_self_flow') && after('timeline_self_flow', 'timeline_self_gyeok') && after('timeline_self_20', 'timeline_self_peak'), '종합풀이 엔진 장 자리 오류: ' + ins.join(','));
ok(after('timeline_self_35', 'timeline_self_h1') && after('timeline_self_h5', 'timeline_self_h6') && after('timeline_self_h6', 'timeline_self_36'), '건강 장 자리 오류');
ok(after('timeline_wealth_01', 'timeline_wealth_flow') && after('timeline_career_01', 'timeline_career_flow') && after('timeline_love_01', 'timeline_love_flow'), '주제 흐름 장 자리 오류');
ok(DC.insert(ins).length === ins.length && order.length === 10, '두 번 넣으면 중복되거나 원래 배열이 바뀜');

// 3. 관리자 탭·감사 도구 연동
for (const [file, pat, msg] of [
  ['report/admin/index.html', /<script src="\.\.\/v2\/derived-chapters\.js[^"]*"><\/script>/, '관리자 화면이 엔진 장 목록을 불러오지 않음'],
  ['report/admin/v2-editorial.js', /window\.ReportV2\.DerivedChapters;if\(DC\)/, '챕터 계약 탭에 엔진 장 목록이 없음'],
  ['report/admin/v2-editorial.js', /계약 '\+base\+'장 \+ 엔진 '\+ds\.length\+'장 = 사용자 화면 최대/, '챕터 계약 탭에 주제별 화면 장 수가 없음'],
  ['report/admin/v2-chapter-audit.js', /r\.derived \? ' <small/, '감사 성적표에 엔진 장 표시가 없음'],
  ['report/admin/v2-chapter-audit.js', /계약 ' \+ rows\.filter\(function \(r\) \{ return !r\.derived; \}\)/, '감사 성적표 요약에 계약·엔진 장 수가 없음'],
  ['report/admin/v2-timeline.js', /R\.FlowChapters\.add\(doc,sd,'',M,ch\)[\s\S]*R\.HealthChapters\.add\(doc,sd,'',M,ch\)/, '타임라인 구성에 흐름·건강 장이 없음'],
  ['report/admin/v2-timeline.js', /R\.PeakReading\.add\(doc,sd,''\)/, '타임라인 구성에 전성기 장이 없음'],
  ['tools/timeline-chapter-audit.cjs', /const ORDER = DC\.insert\(/, '감사 도구가 엔진 장을 함께 재지 않음'],
  ['tools/timeline-chapter-audit-report.cjs', /엔진 조립 장 \$\{rows\.filter\(r => r\.derived\)\.length\}장/, '감사 보고서에 엔진 장 수가 없음']]) ok(pat.test(read(file)), msg);
const audit = JSON.parse(read('report/admin/data/timeline-chapter-audit.json'));
ok(audit.rows.filter(r => r.derived).length === DC.LIST.length && audit.rows.length === 64 + DC.LIST.length, `감사 결과에 엔진 장이 다 들어 있지 않음(${audit.rows.filter(r => r.derived).length}/${DC.LIST.length})`);

// 4. AI 풀이 엔진 분야 ↔ 타임라인 장 짝(표시 전용)
globalThis.window = globalThis; require(path.join(root, 'report/v2/reading-catalog.js'));
const IKM = require(path.join(root, 'report/v2/ik-timeline-map.js'));
const cat = MantraEditorial.defaults(), live = cat.chapters.filter(c => c.state !== 'archived' && ['self', 'wealth', 'career', 'love'].includes(c.topicId));
const known = new Set(cat.chapters.map(c => c.id).concat(DC.LIST.map(d => d.id)));
IKM.DOMAINS.forEach(d => { ok(IKM.MAP[d] && IKM.MAP[d].chapters.length && IKM.NAME[d], 'AI 분야 짝 없음: ' + d); IKM.MAP[d].chapters.forEach(id => ok(known.has(id), 'AI 분야 짝에 없는 장: ' + d + ' ' + id)); });
live.concat(DC.LIST).forEach(c => ok(IKM.domainsOf(c.id).length >= 1, '짝 분야가 없는 타임라인 장: ' + c.id + ' ' + c.title));
for (const [file, pat, msg] of [
  ['report/admin/index.html', '<script src="../v2/ik-timeline-map.js', '관리자 화면이 AI 분야 짝 목록을 불러오지 않음'],
  ['report/admin/v2-ik.js', 'tlPair(d) + \'<div class="ik-sec">풀이 항목', '풀이 구성 탭에 타임라인 짝 장 카드가 없음'],
  ['report/admin/v2-ik.js', 'sections.length) { unsaved.design = true; G.design[d] = clone', '풀이 구성이 저장값을 기본값으로 덮음'],
  ['report/admin/v2-editorial.js', 'ikPair(row&&row.id)', '챕터 계약 탭에 AI 분야 짝 표시가 없음'],
  ['report/admin/v2-editorial.js', 'ikPair(d.id,true)', '챕터 계약 탭 엔진 장에 AI 분야 짝 표시가 없음']]) ok(read(file).includes(pat), msg);

if (fails.length) { console.log('실패 ' + fails.length + '건\n - ' + fails.join('\n - ')); process.exit(1); }
console.log(`모두 통과 · 엔진 장 ${DC.LIST.length}개 제목·모듈·스위치·자리 일치 · 타임라인 구성·챕터 계약·감사 성적표·감사 도구 연동 · AI 풀이 분야 8개 ↔ 타임라인 ${live.length + DC.LIST.length}장 짝`);
